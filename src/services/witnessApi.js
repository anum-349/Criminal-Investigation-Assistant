/**
 * src/services/witnessApi.js
 * Centralized backend integration for the Witness flow.
 * Mirrors victimApi.js conventions.
 *
 * Backend endpoints:
 *   GET    /api/investigator/cases/{caseId}/witnesses
 *   GET    /api/investigator/cases/{caseId}/witnesses/{witnessId}
 *   PATCH  /api/investigator/cases/{caseId}/witnesses/{witnessId}
 *   POST   /api/investigator/cases/{caseId}/witnesses/{witnessId}/photos
 *   DELETE /api/investigator/cases/{caseId}/witnesses/{witnessId}/photo
 *
 * Photo state shape:
 *   • New:      { name, dataUrl: "data:image/...;base64,..." }
 *   • Existing: { existingPhotoId, name, dataUrl: "https://..." }
 *   • null / [] = no photo
 */

import axios from "axios";

// ── Auth ───────────────────────────────────────────────────────────────────
export const getAuthHeader = () => {
    const token = localStorage.getItem("cia_token") || sessionStorage.getItem("cia_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const apiBase = () => import.meta.env.VITE_API_URL;

// ── Helpers ────────────────────────────────────────────────────────────────
const isNewPhoto = (p) =>
    !p?.existingPhotoId && typeof p?.dataUrl === "string" && p.dataUrl.startsWith("data:");

const parseAge = (v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? undefined : n;
};

// ── Shape converters ───────────────────────────────────────────────────────

/** Flat form → PATCH body. Only defined fields are forwarded. */
export const witnessToPatchPayload = (w) => {
    const payload = {};
    const fwd = (k, val) => { if (val !== undefined) payload[k] = val; };

    fwd("name", w?.name);
    fwd("cnic", w?.cnic);
    if (w?.age !== undefined && w?.age !== null && w?.age !== "") {
        payload.age = parseAge(w.age);
    }
    fwd("gender", w?.gender);
    fwd("contact", w?.contact);
    fwd("address", w?.address);

    fwd("witnessType", w?.witnessType);
    fwd("relationToCase", w?.relationToCase);
    fwd("credibility", w?.credibility);
    fwd("status", w?.status);

    fwd("statementDate", w?.statementDate);
    fwd("statementRecordedBy", w?.statementRecordedBy);
    fwd("description", w?.description);

    if (w?.anonymous !== undefined) payload.anonymous = !!w.anonymous;
    if (w?.protectionRequired !== undefined) payload.protectionRequired = !!w.protectionRequired;
    if (w?.cooperating !== undefined) payload.cooperating = !!w.cooperating;

    return payload;
};

/** WitnessRow backend shape → flat form shape for StepWitnesses. */
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

        // Single photo
        photoUrl: w.photoUrl
            ? [{ existingPhotoId: "server", name: "photo", dataUrl: w.photoUrl }]
            : null,
        _hadPhoto: !!w.photoUrl,
    };
};

// ── 1. List witnesses ──────────────────────────────────────────────────────
export const listWitnesses = async (caseId, params = {}) => {
    const res = await axios.get(
        `${apiBase()}/api/investigator/cases/${caseId}/witnesses`,
        { headers: getAuthHeader(), params },
    );
    return res.data;
};

// ── 2. Get one witness ─────────────────────────────────────────────────────
export const getWitness = async (caseId, witnessId) => {
    const res = await axios.get(
        `${apiBase()}/api/investigator/cases/${caseId}/witnesses/${witnessId}`,
        { headers: getAuthHeader() },
    );
    return res.data;
};

// ── 3. Add witnesses to a case (bulk POST) — full replacement
export const addWitnessesToCase = async (caseId, witnesses) => {
    if (!caseId) throw new Error("caseId is required");

    const list = Array.isArray(witnesses) ? witnesses : [];
    if (!list.length) return { created_ids: [], photo_failures: [] };

    const url     = apiBase();
    const headers = getAuthHeader();           // ← defined once here

    const res = await axios.post(
        `${url}/api/investigator/cases/${caseId}/witnesses`,
        {
            witnesses: list.map(w => ({
                witnessId:        w.witnessId        || undefined,
                name:             w.name             || undefined,
                cnic:             w.cnic             || undefined,
                age:              parseAge(w.age),
                gender:           w.gender           || undefined,
                contact:          w.contact          || undefined,
                address:          w.address          || undefined,
                witnessType:      w.witnessType      || undefined,
                relationToCase:   w.relationToCase   || undefined,
                credibility:      w.credibility      || undefined,
                status:           w.status           || undefined,
                statementDate:    w.statementDate    || undefined,
                recorded_by:      w.statementRecordedBy || undefined,
                description:      w.description      || undefined,
                anonymous:        !!w.anonymous,
                protectionRequired: !!w.protectionRequired,
                cooperating:      w.cooperating !== false,
            })),
        },
        { headers },
    );

    const data       = res.data || {};
    const createdIds = data.created_ids || [];
    const photoFailures = [];

    // Upload photo per-witness (index-aligned with createdIds)
    for (let i = 0; i < list.length; i++) {
        const w          = list[i];
        const witnessId  = createdIds[i];          // ← correct per-witness ID
        if (!witnessId) continue;

        const photoArr = Array.isArray(w.photoUrl) ? w.photoUrl : [];
        const newPhoto = photoArr.find(isNewPhoto);
        if (!newPhoto) continue;

        try {
            await axios.post(
                `${url}/api/investigator/cases/${caseId}/witnesses/${witnessId}/photos`,
                { dataUrl: newPhoto.dataUrl, fileName: newPhoto.name },
                { headers },
            );
        } catch (err) {
            photoFailures.push({
                witnessId,
                photoName: newPhoto.name || "(unnamed)",
                error: err?.response?.data?.detail || err.message || "Upload failed",
            });
        }
    }

    return { created_ids: createdIds, photo_failures: photoFailures };
};

// ── 4. Update one witness ──────────────────────────────────────────────────
export const updateWitness = async (caseId, witnessId, formItem) => {
    if (!caseId || !witnessId) throw new Error("caseId and witnessId are required");

    const url = apiBase();
    const headers = getAuthHeader();

    // 4a. PATCH fields
    const patchRes = await axios.patch(
        `${url}/api/investigator/cases/${caseId}/witnesses/${witnessId}`,
        witnessToPatchPayload(formItem),
        { headers },
    );
    let latest = patchRes.data;

    const photoFailures = [];
    const photoArr = Array.isArray(formItem?.photoUrl) ? formItem.photoUrl : [];
    const newPhoto = photoArr.find(isNewPhoto);

    // 4b. Upload new photo if present
    if (newPhoto) {
        try {
            const photoRes = await axios.post(
                `${url}/api/investigator/cases/${caseId}/witnesses/${witnessId}/photos`,
                { dataUrl: newPhoto.dataUrl, fileName: newPhoto.name },
                { headers },
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

    // 4c. Delete photo if removed
    const hadPhoto = !!formItem?._hadPhoto;
    const hasPhoto = photoArr.length > 0;
    if (hadPhoto && !hasPhoto) {
        try {
            await axios.delete(
                `${url}/api/investigator/cases/${caseId}/witnesses/${witnessId}/photo`,
                { headers },
            );
            latest = { ...latest, photoUrl: null };
        } catch (err) {
            console.warn("Photo delete during witness update failed:", err);
        }
    }

    return { detail: latest, photo_failures: photoFailures };
};

// ── 5. Upload photo (standalone) ───────────────────────────────────────────
export const uploadWitnessPhoto = async (caseId, witnessId, { dataUrl, fileName }) => {
    const res = await axios.post(
        `${apiBase()}/api/investigator/cases/${caseId}/witnesses/${witnessId}/photos`,
        { dataUrl, fileName },
        { headers: getAuthHeader() },
    );
    return res.data;
};

// ── 6. Delete photo ────────────────────────────────────────────────────────
export const deleteWitnessPhoto = async (caseId, witnessId) => {
    const res = await axios.delete(
        `${apiBase()}/api/investigator/cases/${caseId}/witnesses/${witnessId}/photo`,
        { headers: getAuthHeader() },
    );
    return res.data;
};

// ── Error helper ───────────────────────────────────────────────────────────
export const formatApiError = (err, fallback = "Request failed") => {
    if (!err) return fallback;
    const detail = err?.response?.data?.detail;
    if (Array.isArray(detail)) return detail.map(d => d?.msg || JSON.stringify(d)).join("; ");
    if (typeof detail === "string") return detail;
    return err.message || fallback;
};