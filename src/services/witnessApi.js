import {
    apiPost, apiPatch, apiDelete, apiGet, apiGetWithParams,
    isNewPhoto, parseAge, uploadPhotos, formatApiError
} from "./apiCommon";

const witnessPatchSchema = {
    name: v => v,
    cnic: v => v,
    age: { type: "age" },
    gender: v => v,
    contact: v => v,
    address: v => v,
    witnessType: v => v,
    relationToCase: v => v,
    credibility: v => v,
    status: v => v,
    statementDate: v => v,
    statementRecordedBy: v => v,
    description: v => v,
    anonymous: { type: "boolean" },
    protectionRequired: { type: "boolean" },
    cooperating: { type: "boolean" },
};

export const witnessToPatchPayload = (w) => {
    const payload = {};
    const fwd = (k, val) => { if (val !== undefined) payload[k] = val; };

    Object.entries(witnessPatchSchema).forEach(([key, config]) => {
        if (config.type === "boolean") {
            if (w?.[key] !== undefined) payload[key] = !!w[key];
        } else if (config.type === "age") {
            if (w?.age !== undefined && w?.age !== null && w?.age !== "") {
                payload.age = parseAge(w.age);
            }
        } else {
            fwd(key, w?.[key]);
        }
    });

    return payload;
};

export const witnessDetailToFormShape = (w) => {
    if (!w) return null;
    return {
        id: w.id,
        witnessId: w.witnessId || w.id,
        caseId: w.caseId || "",
        name: w.name || "",
        cnic: w.cnic || "",
        age: w.age || "",
        gender: w.gender || "",
        contact: w.contact || "",
        address: w.address || "",
        witnessType: w.witnessType || "",
        relationToCase: w.relationToCase || "",
        credibility: w.credibility || "",
        status: w.status || "Active",
        statementDate: w.statementDate || "",
        statementRecordedBy: w.statementRecordedBy || "",
        description: w.description || "",
        anonymous: !!w.anonymous,
        protectionRequired: !!w.protectionRequired,
        cooperating: w.cooperating !== false,
        photoUrl: w.photoUrl
            ? [{ existingPhotoId: "server", name: "photo", dataUrl: w.photoUrl }]
            : null,
        _hadPhoto: !!w.photoUrl,
    };
};

export const listWitnesses = async (caseId, params = {}) => {
    const res = await apiGetWithParams(
        `/api/investigator/cases/${caseId}/witnesses`,
        params
    );
    return res.data;
};

export const getWitness = async (caseId, witnessId) => {
    const res = await apiGet(`/api/investigator/cases/${caseId}/witnesses/${witnessId}`);
    return res.data;
};

export const addWitnessesToCase = async (caseId, witnesses) => {
    if (!caseId) throw new Error("caseId is required");

    const list = Array.isArray(witnesses) ? witnesses : [];
    if (!list.length) return { created_ids: [], photo_failures: [] };

    const res = await apiPost(
        `/api/investigator/cases/${caseId}/witnesses`,
        {
            witnesses: list.map(w => ({
                witnessId: w.witnessId || undefined,
                name: w.name || undefined,
                cnic: w.cnic || undefined,
                age: parseAge(w.age),
                gender: w.gender || undefined,
                contact: w.contact || undefined,
                address: w.address || undefined,
                witnessType: w.witnessType || undefined,
                relationToCase: w.relationToCase || undefined,
                credibility: w.credibility || undefined,
                status: w.status || undefined,
                statementDate: w.statementDate || undefined,
                recorded_by: w.statementRecordedBy || undefined,
                description: w.description || undefined,
                anonymous: !!w.anonymous,
                protectionRequired: !!w.protectionRequired,
                cooperating: w.cooperating !== false,
            })),
        }
    );

    const data = res.data || {};
    const createdIds = data.created_ids || [];

    const photoFailures = await uploadPhotos(caseId, "witness", createdIds, list);

    return { created_ids: createdIds, photo_failures: photoFailures };
};

export const updateWitness = async (caseId, witnessId, formItem) => {
    if (!caseId || !witnessId) throw new Error("caseId and witnessId are required");

    const patchRes = await apiPatch(
        `/api/investigator/cases/${caseId}/witnesses/${witnessId}`,
        witnessToPatchPayload(formItem)
    );
    let latest = patchRes.data;

    const photoFailures = [];
    const photoArr = Array.isArray(formItem?.photoUrl) ? formItem.photoUrl : [];
    const newPhoto = photoArr.find(isNewPhoto);

    if (newPhoto) {
        try {
            const photoRes = await apiPost(
                `/api/investigator/cases/${caseId}/witnesses/${witnessId}/photos`,
                { dataUrl: newPhoto.dataUrl, fileName: newPhoto.name }
            );
            latest = { ...latest, photoUrl: photoRes.data?.photoUrl || latest.photoUrl };
        } catch (err) {
            photoFailures.push({
                witnessId,
                photoName: newPhoto.name || "(unnamed)",
                error: err?.response?.data?.detail || err.message || "Upload failed",
            });
        }
    }

    const hadPhoto = !!formItem?._hadPhoto;
    const hasPhoto = photoArr.length > 0;
    if (hadPhoto && !hasPhoto) {
        try {
            await apiDelete(`/api/investigator/cases/${caseId}/witnesses/${witnessId}/photo`);
            latest = { ...latest, photoUrl: null };
        } catch (err) {
            // Non-fatal
        }
    }

    return { detail: latest, photo_failures: photoFailures };
};

export const uploadWitnessPhoto = async (caseId, witnessId, { dataUrl, fileName }) => {
    const res = await apiPost(
        `/api/investigator/cases/${caseId}/witnesses/${witnessId}/photos`,
        { dataUrl, fileName }
    );
    return res.data;
};

export const deleteWitnessPhoto = async (caseId, witnessId) => {
    const res = await apiDelete(
        `/api/investigator/cases/${caseId}/witnesses/${witnessId}/photo`
    );
    return res.data;
};

export { formatApiError };
