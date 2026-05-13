import axios from "axios";

export const getAuthHeader = () => {
    const token = localStorage.getItem("cia_token") || sessionStorage.getItem("cia_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const apiBase = () => import.meta.env.VITE_API_URL;

const isNewPhoto = (p) =>
    !p?.existingPhotoId && typeof p?.dataUrl === "string" && p.dataUrl.startsWith("data:");

const parseAge = (v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? undefined : n;
};

export const listSuspects = async (caseId, params = {}) => {
    const res = await axios.get(
        `${apiBase()}/api/investigator/cases/${caseId}/suspects`,
        { headers: getAuthHeader(), params },
    );
    return res.data;
};

export const addSuspectsToCase = async (caseId, suspects) => {
    if (!caseId) throw new Error("caseId is required");
    const list = Array.isArray(suspects) ? suspects : [];
    if (!list.length) return { created_ids: [], photo_failures: [] };

    const url     = apiBase();
    const headers = getAuthHeader();

    const res = await axios.post(
        `${url}/api/investigator/cases/${caseId}/suspects`,
        {
            suspects: list.map(s => ({
                suspectId:           s.suspectId           || undefined,
                name:                s.name                || undefined,
                cnic:                s.cnic                || undefined,
                age:                 parseAge(s.age),
                gender:              s.gender              || undefined,
                contact:             s.contact             || undefined,
                address:             s.address             || undefined,
                occupation:          s.occupation          || undefined,
                status:              s.status              || undefined,
                relationToCase:      s.relationToCase      || undefined,
                reason:              s.reason              || undefined,
                alibi:               s.alibi               || undefined,
                physicalDescription: s.physicalDescription || undefined,
                knownAffiliations:   s.knownAffiliations   || undefined,
                arrivalMethod:       s.arrivalMethod       || undefined,
                vehicleDescription:  s.vehicleDescription  || undefined,
                notes:               s.notes               || undefined,
                criminalRecord:      !!s.criminalRecord,
                arrested:            !!s.arrested,
            })),
        },
        { headers },
    );

    const data       = res.data || {};
    const createdIds = data.created_ids || [];
    const photoFailures = [];

    // Upload photo per-suspect (index-aligned with createdIds)
    for (let i = 0; i < list.length; i++) {
        const s         = list[i];
        const suspectId = createdIds[i];
        if (!suspectId) continue;

        const photoArr = Array.isArray(s.photoUrl) ? s.photoUrl : [];
        const newPhoto = photoArr.find(isNewPhoto);
        if (!newPhoto) continue;

        try {
            await axios.post(
                `${url}/api/investigator/cases/${caseId}/suspect/${suspectId}/photo`,
                { dataUrl: newPhoto.dataUrl, fileName: newPhoto.name },
                { headers },
            );
        } catch (err) {
            photoFailures.push({
                suspectId,
                photoName: newPhoto.name || "(unnamed)",
                error: err?.response?.data?.detail || err.message || "Upload failed",
            });
        }
    }

    return { created_ids: createdIds, photo_failures: photoFailures };
};

export const updateSuspect = async (caseId, suspectId, formItem) => {
    if (!caseId || !suspectId) throw new Error("caseId and suspectId are required");
    const url     = apiBase();
    const headers = getAuthHeader();

    const patchRes = await axios.patch(
        `${url}/api/investigator/cases/${caseId}/suspects/${suspectId}`,
        suspectToPatchPayload(formItem),
        { headers },
    );
    let latest = patchRes.data;
    const photoFailures = [];
    const photoArr = Array.isArray(formItem?.photoUrl) ? formItem.photoUrl : [];
    const newPhoto = photoArr.find(isNewPhoto);

    if (newPhoto) {
        try {
            const photoRes = await axios.post(
                `${url}/api/investigator/cases/${caseId}/suspect/${suspectId}/photo`,
                { dataUrl: newPhoto.dataUrl, fileName: newPhoto.name },
                { headers },
            );
            latest = { ...latest, photoUrl: photoRes.data?.photoUrl || latest.photoUrl };
        } catch (err) {
            photoFailures.push({ suspectId, photoName: newPhoto.name || "(unnamed)",
                error: err?.response?.data?.detail || err.message });
        }
    }

    const hadPhoto = !!formItem?._hadPhoto;
    const hasPhoto = photoArr.length > 0;
    if (hadPhoto && !hasPhoto) {
        try {
            await axios.delete(
                `${url}/api/investigator/cases/${caseId}/suspect/${suspectId}/photo`,
                { headers },
            );
            latest = { ...latest, photoUrl: null };
        } catch (err) {
            console.warn("Photo delete failed:", err);
        }
    }
    return { detail: latest, photo_failures: photoFailures };
};

export const suspectToPatchPayload = (s) => {
    const p = {};
    const fwd = (k, v) => { if (v !== undefined) p[k] = v; };
    fwd("name",                s?.name);
    fwd("cnic",                s?.cnic);
    if (s?.age !== undefined && s?.age !== "") p.age = parseAge(s.age);
    fwd("gender",              s?.gender);
    fwd("contact",             s?.contact);
    fwd("address",             s?.address);
    fwd("occupation",          s?.occupation);
    fwd("status",              s?.status);
    fwd("relationToCase",      s?.relationToCase);
    fwd("reason",              s?.reason);
    fwd("alibi",               s?.alibi);
    fwd("physicalDescription", s?.physicalDescription);
    fwd("knownAffiliations",   s?.knownAffiliations);
    fwd("arrivalMethod",       s?.arrivalMethod);
    fwd("vehicleDescription",  s?.vehicleDescription);
    fwd("notes",               s?.notes);
    if (s?.arrested      !== undefined) p.arrested      = !!s.arrested;
    if (s?.criminalRecord !== undefined) p.criminalRecord = !!s.criminalRecord;
    return p;
};

export const formatApiError = (err, fallback = "Request failed") => {
    if (!err) return fallback;
    const detail = err?.response?.data?.detail;
    if (Array.isArray(detail)) return detail.map(d => d?.msg || JSON.stringify(d)).join("; ");
    if (typeof detail === "string") return detail;
    return err.message || fallback;
};