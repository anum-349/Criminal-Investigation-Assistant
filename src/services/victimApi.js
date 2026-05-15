import axios from "axios";

// ── Auth header ────────────────────────────────────────────────────────────
export const getAuthHeader = () => {
    const token = localStorage.getItem("cia_token") || sessionStorage.getItem("cia_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const apiBase = () => import.meta.env.VITE_API_URL;

// ── File / photo helpers ────────────────────────────────────────────────────
export const fileToDataUrl = (file) =>
    file
        ? new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onloadend = () => resolve(r.result);
            r.onerror = reject;
            r.readAsDataURL(file);
        })
        : Promise.resolve(null);

const isNewPhoto = (p) =>
    !p?.existingPhotoId && typeof p?.dataUrl === "string" && p.dataUrl.startsWith("data:");

const parseAge = (v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? undefined : n;
};

// ── Shape converters ────────────────────────────────────────────────────────

/** Body for one victim in a bulk POST (register-case + AddVictimDialog Add).
 *  Targets case_detail_service.add_victim's SuspectInput-shaped contract. */
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

/** PATCH body for an update. Only present fields are forwarded — every
 *  undefined key is dropped so a partial update doesn't wipe other data. */
export const victimToPatchPayload = (v) => {
    const payload = {};
    const fwd = (k, val) => { if (val !== undefined) payload[k] = val; };

    fwd("name", v?.name);
    fwd("cnic", v?.cnic);
    if (v?.age !== undefined && v?.age !== null && v?.age !== "") {
        payload.age = parseAge(v.age);
    }
    fwd("gender", v?.gender);
    fwd("contact", v?.contact);
    fwd("address", v?.address);
    fwd("occupation", v?.occupation);

    fwd("status", v?.status);
    fwd("primaryLabel", v?.primaryLabel);
    fwd("relation", v?.relation);
    fwd("caseType", v?.caseType);
    fwd("injuryType", v?.injuryType);
    fwd("natureOfInjuries", v?.natureOfInjuries);
    fwd("causeOfDeath", v?.causeOfDeath);
    fwd("declaredDead", v?.declaredDead);
    fwd("postmortemAutopsy", v?.postmortemAutopsy);
    fwd("injurySummary", v?.injurySummary);
    fwd("injuryRecordedBy", v?.injuryRecordedBy);
    fwd("statement", v?.statement);

    if (v?.medicalReport !== undefined) payload.medicalReport = !!v.medicalReport;
    if (v?.postmortem !== undefined) payload.postmortem = !!v.postmortem;
    if (v?.protectionRequired !== undefined) payload.protectionRequired = !!v.protectionRequired;
    if (v?.cooperative !== undefined) payload.cooperative = !!v.cooperative;

    fwd("threatLevel", v?.threatLevel);
    fwd("protectionAssigned", v?.protectionAssigned);
    fwd("notes", v?.notes);                // → protectionNotes (alias)

    fwd("nextFollowUp", v?.nextFollowUp);

    // Child arrays: send only when explicitly provided. Empty array means
    // "delete everything"; undefined means "leave alone".
    if (Array.isArray(v?.forensic)) payload.forensic = v.forensic;
    if (Array.isArray(v?.timeline)) payload.timeline = v.timeline;
    if (Array.isArray(v?.legal)) payload.legal = v.legal;

    return payload;
};

// ── 1. Bulk add victims to a case ───────────────────────────────────────────
// Routes through the existing legacy endpoint /api/investigator/cases/{cid}/victims
// (case_detail_service.add_victim). After bulk-create, follows up with photo
// uploads for each created row, like evidence does.
//
// Returns: { created_ids, timeline_events, photo_failures }
export const addVictimsToCase = async (caseId, victims) => {
    if (!caseId) throw new Error("caseId is required");
    const list = Array.isArray(victims) ? victims : [];
    if (!list.length) {
        return { created_ids: [], timeline_events: [], photo_failures: [] };
    }

    const url = apiBase();
    const headers = getAuthHeader();

    // 1a. Bulk POST the rows. Note the wrapper key { victims: [...] }.
    const res = await axios.post(
        `${url}/api/investigator/cases/${caseId}/victims`,
        { victims: list.map(victimToCreatePayload) },
        { headers },
    );
    const data = res.data || {};
    const createdIds = data.created_ids || [];
    const timelineEvents = data.timeline_events || [];

    // 1b. For each created victim, upload any net-new photos.
    const photoFailures = [];
    for (let i = 0; i < list.length; i++) {
        const vid = createdIds[i];
        const item = list[i];
        if (!vid) continue;

        const photoArr = Array.isArray(item?.photoUrl) ? item.photoUrl : [];
        const newPhoto = photoArr.find(isNewPhoto)
        if (newPhoto) {
            try {
                await axios.post(
                    `${url}/api/investigator/cases/${caseId}/victims/${vid}/photos`,
                    { dataUrl: newPhoto.dataUrl, fileName: newPhoto.name || newPhoto.fileName },
                    { headers },
                );
            } catch (err) {
                photoFailures.push({
                    victimId: vid,
                    photoName: newPhoto.name || newPhoto.fileName || "(unnamed)",
                    error: err?.response?.data?.detail || err.message || "Upload failed",
                });
            }
        }
    }

    return {
        created_ids: createdIds,
        timeline_events: timelineEvents,
        photo_failures: photoFailures,
    };
};

// ── 2. Update an existing victim row ────────────────────────────────────────
// Two stages:
//   2a. PATCH editable fields (returns the fresh VictimDetail).
//   2b. Upload any net-new photos (filtered by isNewPhoto).
//
// Photo deletes are NOT done here — the caller diffs the form's existing IDs
// against the row's photos and calls deleteVictimPhoto() per missing one.
export const updateVictim = async (caseId, victimId, formItem) => {
    if (!caseId || !victimId) throw new Error("caseId and victimId are required");

    const url = apiBase();
    const headers = getAuthHeader();

    // 2a. PATCH editable fields.
    const patchRes = await axios.patch(
        `${url}/api/investigator/cases/${caseId}/victims/${victimId}`,
        victimToPatchPayload(formItem),
        { headers },
    );
    let latest = patchRes.data;

    const photoFailures = [];
    const photoArr = Array.isArray(formItem?.photoUrl) ? formItem.photoUrl : [];
    const newPhoto = photoArr.find(isNewPhoto)
    const hasPhoto = photoArr.length > 0;
    if (newPhoto) {
        try {
            const photoRes = await axios.post(
                `${url}/api/investigator/cases/${caseId}/victims/${victimId}/photos`,
                { dataUrl: newPhoto.dataUrl, fileName: newPhoto.name || newPhoto.fileName },
                { headers },
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

    // Also handle delete if photo was removed (no photo in form but had one before)
    const hadPhoto = !!formItem?._hadPhoto;         // flag set by detailToFormShape
    if (hadPhoto && !hasPhoto) {
        try {
            await deleteVictimPhoto(caseId, victimId);
            latest = { ...latest, photoUrl: null };
        } catch (err) {
            // non-fatal — photo may already be gone
            console.warn("Photo delete during update failed:", err);
        }
    }

    return { detail: latest, photo_failures: photoFailures };
};

// ── 3. Photo upload to one existing victim ──────────────────────────────────
// Used by the inline "Upload Photo" control inside the CaseVictims hero.
export const uploadVictimPhoto = async (caseId, victimId, { dataUrl, fileName, caption }) => {
    if (!caseId || !victimId) throw new Error("caseId and victimId are required");
    const res = await axios.post(
        `${apiBase()}/api/investigator/cases/${caseId}/victims/${victimId}/photos`,
        { dataUrl, fileName, caption },
        { headers: getAuthHeader() },
    );
    return res.data;
};

// ── 4. Delete one photo ─────────────────────────────────────────────────────
export const deleteVictimPhoto = async (caseId, victimId) => {
    if (!caseId || !victimId) {
        throw new Error("caseId and victimId are required");
    }
    const res = await axios.delete(
        `${apiBase()}/api/investigator/cases/${caseId}/victims/${victimId}/photo`,
        { headers: getAuthHeader() },
    );
    return res.data;
};

// ── 5. List victims for a case ──────────────────────────────────────────────
export const listVictims = async (caseId) => {
    const res = await axios.get(
        `${apiBase()}/api/investigator/cases/${caseId}/victims`,
        { headers: getAuthHeader() },
    );
    return res.data;
};

// ── 6. Get one full victim detail ───────────────────────────────────────────
export const getVictim = async (caseId, victimId) => {
    const res = await axios.get(
        `${apiBase()}/api/investigator/cases/${caseId}/victims/${victimId}`,
        { headers: getAuthHeader() },
    );
    return res.data;
};

// ── 7. Adapter helpers ──────────────────────────────────────────────────────

/** Convert the nested VictimDetail backend shape into the flat form shape
 *  StepVictims expects, preserving photo IDs so the dialog knows what's
 *  already saved on the server. */
export const detailToFormShape = (d) => {
    if (!d) return null;
    return {
        id: d.id,
        victimId: d.id,

        // Person identity (flattened from `personal`)
        name: d.personal?.name || "",
        cnic: d.personal?.cnic || "",
        age: d.personal?.age || "",
        gender: d.personal?.gender || "",
        contact: d.personal?.contact || "",
        occupation: d.personal?.occupation || "",
        // Address actually lives on `incident.residentialAddress` per existing API
        address: d.incident?.residentialAddress || "",

        // Status / labels
        status: d.status || "",
        primaryLabel: d.primaryLabel || "",
        relation: d.relation || "",
        caseType: d.caseType || "",

        // Injury / incident
        injuryType: d.injuryType || "",
        natureOfInjuries: d.incident?.natureOfInjuries || "",
        causeOfDeath: d.incident?.causeOfDeath || "",
        declaredDead: d.incident?.declaredDead || "",
        postmortemAutopsy: d.incident?.postmortemAutopsy || "",
        injurySummary: d.injurySummary || "",
        injuryRecordedBy: d.injuryRecordedBy || "",

        // Booleans
        medicalReport: !!d.medicalReport,
        postmortem: !!d.postmortem,
        protectionRequired: !!d.protectionRequired,
        cooperative: d.cooperative !== false,

        // Protection (flattened from `protection`)
        threatLevel: d.protection?.threatLevel || "",
        protectionAssigned: d.protection?.protectionAssigned || "",
        notes: d.protection?.notes || "",

        // Other
        nextFollowUp: d.nextFollowUp || "",
        statement: d.statement || "",

        // Child arrays
        forensic: d.forensic || [],
        timeline: d.timeline || [],
        legal: d.legal || [],

        // Photos — preserve existingPhotoId so the API can skip them on PATCH
        photoUrl: d.photoUrl
            ? [{ existingPhotoId: d.photos?.[0]?.id, name: "photo", dataUrl: d.photoUrl }]
            : null,
        _hadPhoto: !!d.photoUrl,
    };
};

/** When opening the Update dialog from a summary row (no full detail yet),
 *  build a minimal form shape from what's on the row. The dialog will then
 *  fetch full detail in its useEffect if needed. */
export const summaryToFormShape = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        victimId: row.id,
        name: "",     // filled in once detail arrives
        status: row.status || "",
    };
};

// ── Error utility ───────────────────────────────────────────────────────────
export const formatApiError = (err, fallback = "Request failed") => {
    if (!err) return fallback;
    const detail = err?.response?.data?.detail;
    if (Array.isArray(detail)) {
        return detail.map((d) => d?.msg || JSON.stringify(d)).join("; ");
    }
    if (typeof detail === "string") return detail;
    return err.message || fallback;
};