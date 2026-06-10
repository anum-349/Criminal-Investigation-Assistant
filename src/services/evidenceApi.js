import {
    apiPost, apiPatch, apiDelete, apiGet, apiGetWithParams,
    isNewPhoto, hasNewFile, ensureFileDataUrl, formatApiError
} from "./apiCommon";

export const evidenceToCreatePayload = (ev) => ({
    evidenceId: ev?.evidenceId || undefined,
    type: ev?.type || "Other",
    description: ev?.description || undefined,
    dateCollected: ev?.dateCollected || undefined,
    collectedBy: ev?.collectedBy || undefined,
    fileName: ev?.fileName || undefined,
    fileMime: ev?.fileMime || undefined,
});

export const evidenceToPatchPayload = (ev) => {
    const payload = {};
    if (ev?.type !== undefined) payload.type = ev.type;
    if (ev?.description !== undefined) payload.description = ev.description;
    if (ev?.dateCollected !== undefined) payload.dateCollected = ev.dateCollected;
    if (ev?.collectedBy !== undefined) payload.collectedBy = ev.collectedBy;
    if (ev?.status !== undefined) payload.status = ev.status;

    if (hasNewFile(ev)) {
        payload.fileDataUrl = ev.fileDataUrl;
        payload.fileName = ev.fileName || null;
        payload.fileMime = ev.fileMime || null;
    }
    return payload;
};

const uploadEvidenceFile = async (caseId, evidenceId, item) => {
    if (!hasNewFile(item)) return { success: true };
    
    try {
        await apiPatch(
            `/api/investigator/cases/${caseId}/evidences/${evidenceId}`,
            {
                fileDataUrl: item.fileDataUrl,
                fileName: item.fileName || null,
                fileMime: item.fileMime || null,
            }
        );
        return { success: true };
    } catch (err) {
        return {
            success: false,
            evidenceId,
            photoName: item.fileName || "(file)",
            error: err?.response?.data?.detail || err.message || "File upload failed",
        };
    }
};

const uploadEvidencePhotos = async (caseId, evidenceId, photos) => {
    const photoFailures = [];
    const newPhotos = (photos || []).filter(isNewPhoto);
    
    for (const ph of newPhotos) {
        try {
            await apiPost(
                `/api/investigator/cases/${caseId}/evidences/${evidenceId}/photos`,
                { dataUrl: ph.dataUrl, fileName: ph.name || ph.fileName, caption: ph.caption }
            );
        } catch (err) {
            photoFailures.push({
                evidenceId,
                photoName: ph.name || ph.fileName || "(unnamed)",
                error: err?.response?.data?.detail || err.message || "Upload failed",
            });
        }
    }
    return photoFailures;
};

export const addEvidencesToCase = async (caseId, evidences) => {
    if (!caseId) throw new Error("caseId is required");
    const list = Array.isArray(evidences) ? evidences : [];
    if (!list.length) {
        return { created_ids: [], timeline_events: [], photo_failures: [] };
    }

    const res = await apiPost(
        `/api/investigator/cases/${caseId}/evidences`,
        { evidences: list.map(evidenceToCreatePayload) }
    );

    const data = res.data || {};
    const createdIds = data.created_ids || [];
    const timelineEvents = data.timeline_events || [];
    const photoFailures = [];

    for (let i = 0; i < list.length; i++) {
        const evidenceId = createdIds[i];
        let item = list[i];
        if (!evidenceId) continue;

        item = await ensureFileDataUrl(item);

        const fileResult = await uploadEvidenceFile(caseId, evidenceId, item);
        if (!fileResult.success) {
            photoFailures.push(fileResult);
        }

        const photoErrors = await uploadEvidencePhotos(caseId, evidenceId, item.photos);
        photoFailures.push(...photoErrors);
    }

    return {
        created_ids: createdIds,
        timeline_events: timelineEvents,
        photo_failures: photoFailures,
    };
};

export const updateEvidence = async (caseId, evidenceId, formItem) => {
    if (!caseId || !evidenceId) throw new Error("caseId and evidenceId are required");

    const item = await ensureFileDataUrl(formItem);

    const patchRes = await apiPatch(
        `/api/investigator/cases/${caseId}/evidences/${evidenceId}`,
        evidenceToPatchPayload(item)
    );
    let latest = patchRes.data;

    const photoFailures = await uploadEvidencePhotos(caseId, evidenceId, item?.photos);

    return { row: latest, photo_failures: photoFailures };
};

export const uploadEvidencePhoto = async (caseId, evidenceId, { dataUrl, fileName, caption }) => {
    if (!caseId || !evidenceId) throw new Error("caseId and evidenceId are required");
    const res = await apiPost(
        `/api/investigator/cases/${caseId}/evidences/${evidenceId}/photos`,
        { dataUrl, fileName, caption }
    );
    return res.data;
};

export const deleteEvidencePhoto = async (caseId, evidenceId, photoId) => {
    if (!caseId || !evidenceId || !photoId) {
        throw new Error("caseId, evidenceId and photoId are required");
    }
    const res = await apiDelete(
        `/api/investigator/cases/${caseId}/evidences/${evidenceId}/photos/${photoId}`
    );
    return res.data;
};

export const listEvidences = async (caseId, { search, date, status, page = 1, page_size = 5 } = {}) => {
    const res = await apiGetWithParams(
        `/api/investigator/cases/${caseId}/evidences`,
        { search, date, status, page, page_size }
    );
    return res.data;
};

export const rowToFormShape = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        evidenceId: row.id,
        type: row.type || "",
        dateCollected: row.date || "",
        collectedBy: row.collectedBy || "",
        description: row.description || "",
        status: row.status,
        existingFileName: row.fileName || null,
        fileName: row.fileName ? row.fileName.split("/").pop() : "",
        fileMime: row.fileMime || null,
        fileDataUrl: null,
        file: null,
        photos: (row.photos || []).map((p) => ({
            existingPhotoId: p.id,
            name: p.file_name || `photo-${p.id}`,
            dataUrl: p.url,
        })),
    };
};

export { formatApiError };
