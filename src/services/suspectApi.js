import {
    apiPost, apiPatch, apiDelete, apiGetWithParams,
    isNewPhoto, parseAge, uploadPhotos, formatApiError
} from "./apiCommon";

const apiBase = () => import.meta.env.VITE_API_URL;

const suspectSchema = {
    suspectId: () => undefined,
    name: v => v || undefined,
    cnic: v => v || undefined,
    age: parseAge,
    gender: v => v || undefined,
    contact: v => v || undefined,
    address: v => v || undefined,
    occupation: v => v || undefined,
    status: v => v || undefined,
    relationToCase: v => v || undefined,
    reason: v => v || undefined,
    alibi: v => v || undefined,
    physicalDescription: v => v || undefined,
    knownAffiliations: v => v || undefined,
    arrivalMethod: v => v || undefined,
    vehicleDescription: v => v || undefined,
    notes: v => v || undefined,
};

const suspectPatchSchema = {
    name: v => v,
    cnic: v => v,
    age: { type: "age" },
    gender: v => v,
    contact: v => v,
    address: v => v,
    occupation: v => v,
    status: v => v,
    relationToCase: v => v,
    reason: v => v,
    alibi: v => v,
    physicalDescription: v => v,
    knownAffiliations: v => v,
    arrivalMethod: v => v,
    vehicleDescription: v => v,
    notes: v => v,
    arrested: { type: "boolean" },
    criminalRecord: { type: "boolean" },
};

export const listSuspects = async (caseId, params = {}) => {
    const res = await apiGetWithParams(
        `/api/investigator/cases/${caseId}/suspects`,
        params
    );
    return res.data;
};

export const suspectToCreatePayload = (s) => {
    const payload = {};
    Object.entries(suspectSchema).forEach(([key, processor]) => {
        const value = processor(s?.[key]);
        if (value !== undefined) payload[key] = value;
    });
    payload.criminalRecord = !!s?.criminalRecord;
    payload.arrested = !!s?.arrested;
    return payload;
};

export const suspectToPatchPayload = (s) => {
    const payload = {};
    const fwd = (k, v) => { if (v !== undefined) payload[k] = v; };
    
    Object.entries(suspectPatchSchema).forEach(([key, config]) => {
        if (config.type === "boolean") {
            if (s?.[key] !== undefined) payload[key] = !!s[key];
        } else if (config.type === "age") {
            if (s?.age !== undefined && s?.age !== "") payload.age = parseAge(s.age);
        } else {
            fwd(key, s?.[key]);
        }
    });
    
    return payload;
};

export const addSuspectsToCase = async (caseId, suspects) => {
    if (!caseId) throw new Error("caseId is required");
    const list = Array.isArray(suspects) ? suspects : [];
    if (!list.length) return { created_ids: [], photo_failures: [] };

    const res = await apiPost(
        `/api/investigator/cases/${caseId}/suspects`,
        { suspects: list.map(suspectToCreatePayload) }
    );

    const data = res.data || {};
    const createdIds = data.created_ids || [];
    
    const photoFailures = await uploadPhotos(caseId, "suspect", createdIds, list);

    return { created_ids: createdIds, photo_failures: photoFailures };
};

export const updateSuspect = async (caseId, suspectId, formItem) => {
    if (!caseId || !suspectId) throw new Error("caseId and suspectId are required");

    const patchRes = await apiPatch(
        `/api/investigator/cases/${caseId}/suspects/${suspectId}`,
        suspectToPatchPayload(formItem)
    );
    let latest = patchRes.data;
    const photoFailures = [];

    const photoArr = Array.isArray(formItem?.photoUrl) ? formItem.photoUrl : [];
    const newPhoto = photoArr.find(isNewPhoto);

    if (newPhoto) {
        try {
            const photoRes = await apiPost(
                `/api/investigator/cases/${caseId}/suspect/${suspectId}/photos`,
                { dataUrl: newPhoto.dataUrl, fileName: newPhoto.name }
            );
            latest = { ...latest, photoUrl: photoRes.data?.photoUrl || latest.photoUrl };
        } catch (err) {
            photoFailures.push({
                suspectId,
                photoName: newPhoto.name || "(unnamed)",
                error: err?.response?.data?.detail || err.message,
            });
        }
    }

    const hadPhoto = !!formItem?._hadPhoto;
    const hasPhoto = photoArr.length > 0;
    if (hadPhoto && !hasPhoto) {
        try {
            await apiDelete(`/api/investigator/cases/${caseId}/suspect/${suspectId}/photo`);
            latest = { ...latest, photoUrl: null };
        } catch (err) {
            // Non-fatal
        }
    }
    return { detail: latest, photo_failures: photoFailures };
};

export { formatApiError };
