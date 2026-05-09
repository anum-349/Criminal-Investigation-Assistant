/**
 * src/services/evidenceApi.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized backend integration for the Evidence flow.
 *
 * Why one file
 * ────────────
 * The Evidence form (step-evidence/page.jsx) is reused in THREE places:
 *
 *   1. Register-case wizard          (POST evidences as part of a brand-new case)
 *   2. AddEvidenceDialog (Add mode)  (POST evidences to an existing case)
 *   3. AddEvidenceDialog (Update)    (PATCH one row + add/remove its photos)
 *
 * Each surface used to roll its own axios calls, with subtle drift —
 * AddEvidenceDialog dropped photos on bulk-add, the wizard submitted
 * nothing at all, etc. Consolidating here so every caller goes through
 * the same code path that:
 *
 *   • strips frontend-only fields the backend rejects
 *   • sends evidences in one POST, then loops photos in follow-up POSTs
 *   • returns a normalized result so the UI can prepend timeline rows
 *     and bump the evidence_collected counter without re-fetching
 *
 * Backend endpoints (all confirmed against existing code):
 *   POST   /api/investigator/cases/{caseId}/evidences
 *   PATCH  /api/investigator/cases/{caseId}/evidences/{evidenceId}
 *   POST   /api/investigator/cases/{caseId}/evidences/{evidenceId}/photos
 *   DELETE /api/investigator/cases/{caseId}/evidences/{evidenceId}/photos/{photoId}
 *   GET    /api/investigator/cases/{caseId}/evidences
 */

import axios from "axios";

// ── Auth header (same pattern as the rest of the app) ──────────────────────
export const getAuthHeader = () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const apiBase = () => import.meta.env.VITE_API_URL;

// ── Shape converters ────────────────────────────────────────────────────────
// The frontend evidence object carries fields the backend doesn't know about
// (id used as a React key, photos with dataUrl/existingPhotoId markers, …).
// Strip them down to what AddEvidenceRequest / UpdateEvidenceRequest actually
// accept (see schemas/case_detail_schema.py and case_evidence_schema.py).

/** Used by both register-case bulk POST and AddEvidenceDialog Add-mode. */
export const evidenceToCreatePayload = (ev) => ({
    evidenceId: ev?.evidenceId || undefined,   // backend will generate if absent
    type: ev?.type || "Other",
    description: ev?.description || undefined,
    dateCollected: ev?.dateCollected || undefined,
    collectedBy: ev?.collectedBy || undefined,
    //   fileName:      ev?.fileName || undefined,
    //   fileMime:      ev?.fileMime || undefined,
});

/** Used by AddEvidenceDialog Update-mode (PATCH body). */
export const evidenceToPatchPayload = (ev) => {
    const payload = {
        type: ev?.type,
        description: ev?.description,
        dateCollected: ev?.dateCollected,
        collectedBy: ev?.collectedBy,
        status: ev?.status,
    };
    if (item.fileDataUrl && !item.existingFileName) {
        payload.fileDataUrl = item.fileDataUrl;
        payload.fileName = item.fileName || null;
        payload.fileMime = item.fileMime || null;
    }

    return payload;
};

/** Photos that are NOT yet on the server have a `dataUrl` starting with
 * "data:" (FileReader output). Photos already saved have `existingPhotoId`
 * and a public URL in `dataUrl`. We only upload the new ones. */
const isNewPhoto = (p) =>
    !p?.existingPhotoId && typeof p?.dataUrl === "string" && p.dataUrl.startsWith("data:");

const fileToDataUrl = (file) =>
    file
        ? new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onloadend = () => resolve(r.result);
            r.onerror = reject;
            r.readAsDataURL(file);
        })
        : Promise.resolve(null);
// ── 1. Bulk add evidences to a case ─────────────────────────────────────────
// Used by:
//   • register-case wizard (after the case itself is created)
//   • AddEvidenceDialog in Add mode (existing case, multiple new items)
//
// Returns: {
//   created_ids:     [string],       // backend-assigned external IDs in input order
//   timeline_events: [TimelineEventOut],  // ready to prepend to the timeline
//   photo_failures:  [{evidenceId, photoName, error}],
// }
//
// Photo upload errors are collected, NOT thrown — the evidence rows
// themselves are already saved at that point, so failing one photo
// shouldn't unwind the rest. Caller decides whether to surface them.
export const addEvidencesToCase = async (caseId, evidences) => {
    if (!caseId) throw new Error("caseId is required");
    const list = Array.isArray(evidences) ? evidences : [];
    if (!list.length) {
        return { created_ids: [], timeline_events: [], photo_failures: [] };
    }

    const url = apiBase();
    const headers = getAuthHeader();

    // 1a. Bulk POST the rows (no photos in this body).
    const res = await axios.post(
        `${url}/api/investigator/cases/${caseId}/evidences`,
        { evidences: list.map(evidenceToCreatePayload) },
        { headers },
    );

    const data = res.data || {};
    const createdIds = data.created_ids || [];
    const timelineEvents = data.timeline_events || [];

    // 1b. Upload photos. created_ids comes back in the SAME order as the
    //     evidences array we sent, so we can pair them by index. Any item
    //     without photos is a no-op.
    const photoFailures = [];
    for (let i = 0; i < list.length; i++) {
        const evid = createdIds[i];
        const item = list[i];
        if (!evid) continue;

        const fileDataUrl =
            item.fileDataUrl ||
            (item.file instanceof File ? await fileToDataUrl(item.file) : null);

        if (fileDataUrl) {
            try {
                await axios.patch(
                    `${url}/api/investigator/cases/${caseId}/evidences/${evid}`,
                    {
                        fileDataUrl,
                        fileName: item.fileName || item.file?.name || null,
                        fileMime: item.fileMime || item.file?.type || null,
                    },
                    { headers },
                );
            } catch (err) {
                photoFailures.push({
                    evidenceId: evid,
                    photoName: item.fileName || "(file)",
                    error: err?.response?.data?.detail || err.message || "File upload failed",
                });
            }
        }

        const newPhotos = (item.photos || []).filter(isNewPhoto);
        for (const ph of newPhotos) {
            try {
                await axios.post(
                    `${url}/api/investigator/cases/${caseId}/evidences/${evid}/photos`,
                    { dataUrl: ph.dataUrl, fileName: ph.name || ph.fileName, caption: ph.caption },
                    { headers },
                );
            } catch (err) {
                photoFailures.push({
                    evidenceId: evid,
                    photoName: ph.name || ph.fileName || "(unnamed)",
                    error: err?.response?.data?.detail || err.message || "Upload failed",
                });
            }
        }
    }
    listEvidences(caseId); // fire-and-forget re-fetch to update photos list in the UI    

    return {
        created_ids: createdIds,
        timeline_events: timelineEvents,
        photo_failures: photoFailures,
    };
};

// ── 2. Update an existing evidence row ──────────────────────────────────────
// Used by AddEvidenceDialog in Update-mode. Two-stage:
//   2a. PATCH the editable fields
//   2b. Upload any newly-added photos (no `existingPhotoId`)
//
// We do NOT delete photos here — that's a separate explicit action via
// deletePhoto() below, since the dialog renders an X button per thumbnail.
//
// Returns: { row, photo_failures }
//   row             — the latest CaseEvidenceRow (with updated photos list)
//   photo_failures  — same shape as bulk-add
export const updateEvidence = async (caseId, evidenceId, formItem) => {
    if (!caseId || !evidenceId) throw new Error("caseId and evidenceId are required");

    const url = apiBase();
    const headers = getAuthHeader();

    if (formItem?.file instanceof File && !formItem.fileDataUrl) {
        formItem = {
            ...formItem,
            fileDataUrl: await fileToDataUrl(formItem.file),
            fileName: formItem.fileName || formItem.file.name,
            fileMime: formItem.fileMime || formItem.file.type,
        };
    }

    // 2a. PATCH editable fields.
    const patchRes = await axios.patch(
        `${url}/api/investigator/cases/${caseId}/evidences/${evidenceId}`,
        evidenceToPatchPayload(formItem),
        { headers },
    );
    let latest = patchRes.data;

    // 2b. Upload any net-new photos.
    const newPhotos = (formItem?.photos || []).filter(isNewPhoto);
    const photoFailures = [];
    for (const ph of newPhotos) {
        try {
            const photoRes = await axios.post(
                `${url}/api/investigator/cases/${caseId}/evidences/${evidenceId}/photos`,
                { dataUrl: ph.dataUrl, fileName: ph.name || ph.fileName, caption: ph.caption },
                { headers },
            );
            // Each photo POST returns the full updated photos list — keep the
            // latest one so the caller can patch the row in place without a re-fetch.
            latest = { ...latest, photos: photoRes.data?.photos || latest.photos };
        } catch (err) {
            photoFailures.push({
                evidenceId,
                photoName: ph.name || ph.fileName || "(unnamed)",
                error: err?.response?.data?.detail || err.message || "Upload failed",
            });
        }
    }

    return { row: latest, photo_failures: photoFailures };
};

// ── 3. Photo upload to one existing evidence row ────────────────────────────
// Used by the inline photo-add control inside CaseEvidence.jsx's view
// dialog. Returns the server's PhotoUploadResult { photo, photos }.
export const uploadEvidencePhoto = async (caseId, evidenceId, { dataUrl, fileName, caption }) => {
    if (!caseId || !evidenceId) throw new Error("caseId and evidenceId are required");
    const res = await axios.post(
        `${apiBase()}/api/investigator/cases/${caseId}/evidences/${evidenceId}/photos`,
        { dataUrl, fileName, caption },
        { headers: getAuthHeader() },
    );
    return res.data;
};

// ── 4. Delete one photo ─────────────────────────────────────────────────────
export const deleteEvidencePhoto = async (caseId, evidenceId, photoId) => {
    if (!caseId || !evidenceId || !photoId) {
        throw new Error("caseId, evidenceId and photoId are required");
    }
    const res = await axios.delete(
        `${apiBase()}/api/investigator/cases/${caseId}/evidences/${evidenceId}/photos/${photoId}`,
        { headers: getAuthHeader() },
    );
    return res.data;
};

// ── 5. List evidences for a case ────────────────────────────────────────────
// Used by CaseEvidence.jsx for the table.
export const listEvidences = async (caseId, { search, date, status, page = 1, page_size = 5 } = {}) => {
    const res = await axios.get(
        `${apiBase()}/api/investigator/cases/${caseId}/evidences`,
        {
            headers: getAuthHeader(),
            params: { search, date, status, page, page_size },
        },
    );
    return res.data;
};

// ── 6. Adapter helpers ──────────────────────────────────────────────────────
// Used by CaseEvidence.jsx when opening the Update dialog. Converts a
// server row (CaseEvidenceRow shape) into the form shape StepEvidence
// expects, preserving photo IDs so we know which ones already exist.
export const rowToFormShape = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        evidenceId: row.id,
        type: row.type || "",
        dateCollected: row.date || "",
        collectedBy: row.collectedBy || "",
        description: row.description || "",
        existingFileName: row.fileName || null,
        fileName: row.fileName ? row.fileName.split("/").pop() : null,
        fileMime: row.fileMime || null,
        // No fileDataUrl — a new file hasn't been chosen yet.
        fileDataUrl: null,
        status: row.status,
        photos: (row.photos || []).map((p) => ({
            existingPhotoId: p.id,
            name: p.file_name || `photo-${p.id}`,
            dataUrl: p.url, // public URL — <img> resolves it
        })),
    };
};

// ── Error utility ───────────────────────────────────────────────────────────
// Drop-in replacement for the err.response.data.detail dance every caller
// was repeating. Always returns a plain string suitable for a toast.
export const formatApiError = (err, fallback = "Request failed") => {
    if (!err) return fallback;
    const detail = err?.response?.data?.detail;
    if (Array.isArray(detail)) {
        // Pydantic 422 — { loc, msg, type }
        return detail.map((d) => d?.msg || JSON.stringify(d)).join("; ");
    }
    if (typeof detail === "string") return detail;
    return err.message || fallback;
};