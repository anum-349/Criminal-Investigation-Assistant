import {
    apiPost, apiPatch, apiDelete, apiGet,
    isNewPhoto, parseAge, uploadPhotos, formatApiError
} from "./apiCommon";

const victimPatchSchema = {
    name: v => v,
    cnic: v => v,
    age: { type: "age" },
    gender: v => v,
    contact: v => v,
    address: v => v,
    occupation: v => v,
    status: v => v,
    primaryLabel: v => v,
    relation: v => v,
    caseType: v => v,
    injuryType: v => v,
    natureOfInjuries: v => v,
    causeOfDeath: v => v,
    declaredDead: v => v,
    postmortemAutopsy: v => v,
    injurySummary: v => v,
    injuryRecordedBy: v => v,
    statement: v => v,
    threatLevel: v => v,
    protectionAssigned: v => v,
    notes: v => v,
    nextFollowUp: v => v,
    medicalReport: { type: "boolean" },
    postmortem: { type: "boolean" },
    protectionRequired: { type: "boolean" },
    cooperative: { type: "boolean" },
};

export const victimToCreatePayload = (v) => ({
    victimId: v?.victimId || undefined,
    name: v?.name || undefined,
    cnic: v?.cnic || undefined,
    age: parseAge(v?.age),
    gender: v?.gender || undefined,
    contact: v?.contact || undefined,
    address: v?.address || undefined,
    occupation: v?.occupation || undefined,
    status: v?.status || undefined,
    primaryLabel: v?.primaryLabel || undefined,
    injuryType: v?.injuryType || undefined,
    natureOfInjuries: v?.natureOfInjuries || undefined,
    causeOfDeath: v?.causeOfDeath || undefined,
    declaredDead: v?.declaredDead || undefined,
    postmortemAutopsy: v?.postmortemAutopsy || undefined,
    statement: v?.statement || undefined,
    nextFollowUp: v?.nextFollowUp || undefined,
    threatLevel: v?.threatLevel || undefined,
    protectionAssigned: v?.protectionAssigned || undefined,
    notes: v?.notes || undefined,
    injurySummary: v?.injurySummary || undefined,
    injuryRecordedBy: v?.injuryRecordedBy || undefined,
    relation: v?.relation || undefined,
    caseType: v?.caseType || undefined,
    medicalReport: v?.medicalReport !== undefined ? !!v.medicalReport : undefined,
    postmortem: v?.postmortem !== undefined ? !!v.postmortem : undefined,
    protectionRequired: v?.protectionRequired !== undefined ? !!v.protectionRequired : undefined,
    cooperative: v?.cooperative !== undefined ? !!v.cooperative : undefined,
});

export const victimToPatchPayload = (v) => {
    const payload = {};
    const fwd = (k, val) => { if (val !== undefined) payload[k] = val; };

    Object.entries(victimPatchSchema).forEach(([key, config]) => {
        if (config.type === "boolean") {
            if (v?.[key] !== undefined) payload[key] = !!v[key];
        } else if (config.type === "age") {
            if (v?.age !== undefined && v?.age !== null && v?.age !== "") {
                payload.age = parseAge(v.age);
            }
        } else {
            fwd(key, v?.[key]);
        }
    });

    if (Array.isArray(v?.forensic)) payload.forensic = v.forensic;
    if (Array.isArray(v?.timeline)) payload.timeline = v.timeline;
    if (Array.isArray(v?.legal)) payload.legal = v.legal;

    return payload;
};

export const addVictimsToCase = async (caseId, victims) => {
    if (!caseId) throw new Error("caseId is required");
    const list = Array.isArray(victims) ? victims : [];
    if (!list.length) {
        return { created_ids: [], timeline_events: [], photo_failures: [] };
    }

    const res = await apiPost(
        `/api/investigator/cases/${caseId}/victims`,
        { victims: list.map(victimToCreatePayload) }
    );
    const data = res.data || {};
    const createdIds = data.created_ids || [];
    const timelineEvents = data.timeline_events || [];

    const photoFailures = await uploadPhotos(caseId, "victim", createdIds, list);

    return {
        created_ids: createdIds,
        timeline_events: timelineEvents,
        photo_failures: photoFailures,
    };
};

export const updateVictim = async (caseId, victimId, formItem) => {
    if (!caseId || !victimId) throw new Error("caseId and victimId are required");

    const patchRes = await apiPatch(
        `/api/investigator/cases/${caseId}/victims/${victimId}`,
        victimToPatchPayload(formItem)
    );
    let latest = patchRes.data;

    const photoFailures = [];
    const photoArr = Array.isArray(formItem?.photoUrl) ? formItem.photoUrl : [];
    const newPhoto = photoArr.find(isNewPhoto);
    const hasPhoto = photoArr.length > 0;
    
    if (newPhoto) {
        try {
            const photoRes = await apiPost(
                `/api/investigator/cases/${caseId}/victims/${victimId}/photos`,
                { dataUrl: newPhoto.dataUrl, fileName: newPhoto.name || newPhoto.fileName }
            );
            latest = {
                ...latest,
                photoUrl: photoRes.data?.photoUrl || latest.photoUrl,
            };
        } catch (err) {
            photoFailures.push({
                victimId,
                photoName: newPhoto.name || newPhoto.fileName || "(unnamed)",
                error: err?.response?.data?.detail || err.message || "Upload failed",
            });
        }
    }

    const hadPhoto = !!formItem?._hadPhoto;
    if (hadPhoto && !hasPhoto) {
        try {
            await apiDelete(`/api/investigator/cases/${caseId}/victims/${victimId}/photo`);
            latest = { ...latest, photoUrl: null };
        } catch (err) {
            // Non-fatal
        }
    }

    return { detail: latest, photo_failures: photoFailures };
};

export const uploadVictimPhoto = async (caseId, victimId, { dataUrl, fileName, caption }) => {
    if (!caseId || !victimId) throw new Error("caseId and victimId are required");
    const res = await apiPost(
        `/api/investigator/cases/${caseId}/victims/${victimId}/photos`,
        { dataUrl, fileName, caption }
    );
    return res.data;
};

export const deleteVictimPhoto = async (caseId, victimId) => {
    if (!caseId || !victimId) {
        throw new Error("caseId and victimId are required");
    }
    const res = await apiDelete(
        `/api/investigator/cases/${caseId}/victims/${victimId}/photo`
    );
    return res.data;
};

export const listVictims = async (caseId) => {
    const res = await apiGet(`/api/investigator/cases/${caseId}/victims`);
    return res.data;
};

export const getVictim = async (caseId, victimId) => {
    const res = await apiGet(`/api/investigator/cases/${caseId}/victims/${victimId}`);
    return res.data;
};

export const detailToFormShape = (d) => {
    if (!d) return null;
    return {
        id: d.id,
        victimId: d.id,
        name: d.personal?.name || "",
        cnic: d.personal?.cnic || "",
        age: d.personal?.age || "",
        gender: d.personal?.gender || "",
        contact: d.personal?.contact || "",
        occupation: d.personal?.occupation || "",
        address: d.incident?.residentialAddress || "",
        status: d.status || "",
        primaryLabel: d.primaryLabel || "",
        relation: d.relation || "",
        caseType: d.caseType || "",
        injuryType: d.injuryType || "",
        natureOfInjuries: d.incident?.natureOfInjuries || "",
        causeOfDeath: d.incident?.causeOfDeath || "",
        declaredDead: d.incident?.declaredDead || "",
        postmortemAutopsy: d.incident?.postmortemAutopsy || "",
        injurySummary: d.injurySummary || "",
        injuryRecordedBy: d.injuryRecordedBy || "",
        medicalReport: !!d.medicalReport,
        postmortem: !!d.postmortem,
        protectionRequired: !!d.protectionRequired,
        cooperative: d.cooperative !== false,
        threatLevel: d.protection?.threatLevel || "",
        protectionAssigned: d.protection?.protectionAssigned || "",
        notes: d.protection?.notes || "",
        nextFollowUp: d.nextFollowUp || "",
        statement: d.statement || "",
        forensic: d.forensic || [],
        timeline: d.timeline || [],
        legal: d.legal || [],
        photoUrl: d.photoUrl
            ? [{ existingPhotoId: d.photos?.[0]?.id, name: "photo", dataUrl: d.photoUrl }]
            : null,
        _hadPhoto: !!d.photoUrl,
    };
};

export const summaryToFormShape = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        victimId: row.id,
        name: "",
        status: row.status || "",
    };
};

export { formatApiError };
