/**
 * src/services/evidenceApi.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized backend integration for the Evidence flow.
 *
 * Used by THREE call-sites:
 *   1. Register-case wizard          (POST evidences as part of a brand-new case)
 *   2. AddEvidenceDialog (Add mode)  (POST evidences to an existing case)
 *   3. AddEvidenceDialog (Update)    (PATCH one row + add/remove its photos + replace file)
 *
 * Backend endpoints (verified against schemas/case_evidence_schema.py +
 * services/case_evidence_service.py):
 *   POST   /api/investigator/cases/{caseId}/evidences
 *   PATCH  /api/investigator/cases/{caseId}/evidences/{evidenceId}
 *   POST   /api/investigator/cases/{caseId}/evidences/{evidenceId}/photos
 *   DELETE /api/investigator/cases/{caseId}/evidences/{evidenceId}/photos/{photoId}
 *   GET    /api/investigator/cases/{caseId}/evidences
 *
 * The backend's UpdateEvidenceRequest accepts:
 *   type, description, dateCollected, collectedBy, status,
 *   fileDataUrl, fileName, fileMime
 *
 * Status values: "Analyzed" | "Pending Analysis"
 */

import axios from "axios";

// ── Auth header (same pattern as the rest of the app) ──────────────────────
export const getAuthHeader = () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const apiBase = () => import.meta.env.VITE_API_URL;

// ── File utilities ──────────────────────────────────────────────────────────

/** Convert a File object to a base64 data URL. Used everywhere we need to
 *  ship a file as part of a JSON body. */
export const fileToDataUrl = (file) =>
    file
        ? new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onloadend = () => resolve(r.result);
            r.onerror = reject;
            r.readAsDataURL(file);
        })
        : Promise.resolve(null);

/** A new file (just picked from disk) has either a `file` File object OR a
 *  data URL string starting with "data:". An "existing" file is stored as
 *  a public URL ("/uploads/..." or "https://...") and is NOT re-uploaded. */
const hasNewFile = (ev) =>
    (ev?.file instanceof File) ||
    (typeof ev?.fileDataUrl === "string" && ev.fileDataUrl.startsWith("data:"));

/** Photos that are NOT yet on the server have a `dataUrl` starting with
 *  "data:" (FileReader output). Photos already saved have `existingPhotoId`
 *  and a public URL in `dataUrl`. We only upload the new ones. */
const isNewPhoto = (p) =>
    !p?.existingPhotoId && typeof p?.dataUrl === "string" && p.dataUrl.startsWith("data:");

/** Normalize an evidence form item so it always has `fileDataUrl` populated
 *  if a new file was attached. Idempotent — safe to call repeatedly. */
const ensureFileDataUrl = async (ev) => {
    if (!ev) return ev;
    if (ev.fileDataUrl && ev.fileDataUrl.startsWith("data:")) return ev;
    if (ev.file instanceof File) {
        const dataUrl = await fileToDataUrl(ev.file);
        return {
            ...ev,
            fileDataUrl: dataUrl,
            fileName: ev.fileName || ev.file.name,
            fileMime: ev.fileMime || ev.file.type,
        };
    }
    return ev;
};

// ── Shape converters ────────────────────────────────────────────────────────

/** POST body for ONE evidence row. Used by both register-case bulk POST and
 *  AddEvidenceDialog Add-mode. Files are NOT inlined here — the caller
 *  uploads them via PATCH after the bulk-create returns the new IDs. */
export const evidenceToCreatePayload = (ev) => ({
    evidenceId:    ev?.evidenceId || undefined,
    type:          ev?.type || "Other",
    description:   ev?.description || undefined,
    dateCollected: ev?.dateCollected || undefined,
    collectedBy:   ev?.collectedBy || undefined,
    fileName:      ev?.fileName || undefined,
    fileMime:      ev?.fileMime || undefined,
});

/** PATCH body for one evidence row. Used by AddEvidenceDialog Update-mode
 *  AND by the in-dialog Status switcher (which only sends `{status}`).
 *
 *  Important: only fields that are actually provided are forwarded. The
 *  backend treats `null` differently from "missing", so we send `undefined`
 *  for absent keys (axios drops them).
 *
 *  If a brand-new file was attached, we include fileDataUrl/Name/Mime.
 *  An "existing" file (public URL still in `existingFileName`) is NOT
 *  re-sent — that would round-trip the entire file body for no reason. */
export const evidenceToPatchPayload = (ev) => {
    const payload = {};
    if (ev?.type           !== undefined) payload.type          = ev.type;
    if (ev?.description    !== undefined) payload.description   = ev.description;
    if (ev?.dateCollected  !== undefined) payload.dateCollected = ev.dateCollected;
    if (ev?.collectedBy    !== undefined) payload.collectedBy   = ev.collectedBy;
    if (ev?.status         !== undefined) payload.status        = ev.status;

    // Attach a NEW file only — never the existing one.
    if (hasNewFile(ev)) {
        payload.fileDataUrl = ev.fileDataUrl;        // already a data URL by ensureFileDataUrl
        payload.fileName    = ev.fileName || null;
        payload.fileMime    = ev.fileMime || null;
    }
    return payload;
};

// ── 1. Bulk add evidences to a case ─────────────────────────────────────────
// Three-step process:
//   1a. POST the rows (no files in this body — backend doesn't accept them
//       inline on create).
//   1b. For each created row, PATCH the file if one was attached.
//   1c. For each created row, POST every new photo.
//
// Returns: {
//   created_ids:     [string],
//   timeline_events: [TimelineEventOut],
//   photo_failures:  [{evidenceId, photoName, error}],
// }
//
// File and photo upload errors are collected, NOT thrown — the rows
// themselves are already saved at that point.
export const addEvidencesToCase = async (caseId, evidences) => {
    if (!caseId) throw new Error("caseId is required");
    const list = Array.isArray(evidences) ? evidences : [];
    if (!list.length) {
        return { created_ids: [], timeline_events: [], photo_failures: [] };
    }

    const url     = apiBase();
    const headers = getAuthHeader();

    // 1a. Bulk POST the rows (metadata only).
    const res = await axios.post(
        `${url}/api/investigator/cases/${caseId}/evidences`,
        { evidences: list.map(evidenceToCreatePayload) },
        { headers },
    );

    const data           = res.data || {};
    const createdIds     = data.created_ids     || [];
    const timelineEvents = data.timeline_events || [];

    const photoFailures = [];

    // 1b + 1c. For each evidence: upload its file (if any), then its photos.
    for (let i = 0; i < list.length; i++) {
        const evid = createdIds[i];
        let   item = list[i];
        if (!evid) continue;

        // Resolve file → dataUrl if needed.
        item = await ensureFileDataUrl(item);

        // 1b. File upload via PATCH (backend stores it in evidence.file_name).
        if (hasNewFile(item)) {
            try {
                await axios.patch(
                    `${url}/api/investigator/cases/${caseId}/evidences/${evid}`,
                    {
                        fileDataUrl: item.fileDataUrl,
                        fileName:    item.fileName || null,
                        fileMime:    item.fileMime || null,
                    },
                    { headers },
                );
            } catch (err) {
                photoFailures.push({
                    evidenceId: evid,
                    photoName:  item.fileName || "(file)",
                    error:      err?.response?.data?.detail || err.message || "File upload failed",
                });
            }
        }

        // 1c. Photo uploads.
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
                    photoName:  ph.name || ph.fileName || "(unnamed)",
                    error:      err?.response?.data?.detail || err.message || "Upload failed",
                });
            }
        }
    }

    listEvidences(caseId)    
    return {
        created_ids:     createdIds,
        timeline_events: timelineEvents,
        photo_failures:  photoFailures,
    };
};

// ── 2. Update an existing evidence row ──────────────────────────────────────
// Two stages:
//   2a. PATCH editable fields. If a new file is attached, it goes in this
//       same PATCH (the backend stores it on receipt).
//   2b. Upload any net-new photos.
//
// Photo deletes are NOT done here — that's an explicit separate action via
// deleteEvidencePhoto() (the dialog renders an X per thumbnail, and
// CaseEvidence.handleUpdateSubmit diffs which existing IDs disappeared
// from the form).
//
// Returns: { row, photo_failures }
export const updateEvidence = async (caseId, evidenceId, formItem) => {
    if (!caseId || !evidenceId) throw new Error("caseId and evidenceId are required");

    const url     = apiBase();
    const headers = getAuthHeader();

    // Resolve any File object to a dataUrl up front.
    const item = await ensureFileDataUrl(formItem);

    // 2a. PATCH editable fields (+ file if new).
    const patchRes = await axios.patch(
        `${url}/api/investigator/cases/${caseId}/evidences/${evidenceId}`,
        evidenceToPatchPayload(item),
        { headers },
    );
    let latest = patchRes.data;

    // 2b. Upload any net-new photos.
    const newPhotos = (item?.photos || []).filter(isNewPhoto);
    const photoFailures = [];
    for (const ph of newPhotos) {
        try {
            const photoRes = await axios.post(
                `${url}/api/investigator/cases/${caseId}/evidences/${evidenceId}/photos`,
                { dataUrl: ph.dataUrl, fileName: ph.name || ph.fileName, caption: ph.caption },
                { headers },
            );
            latest = { ...latest, photos: photoRes.data?.photos || latest.photos };
        } catch (err) {
            photoFailures.push({
                evidenceId,
                photoName: ph.name || ph.fileName || "(unnamed)",
                error:     err?.response?.data?.detail || err.message || "Upload failed",
            });
        }
    }

    listEvidences(caseId)
    return { row: latest, photo_failures: photoFailures };
};

// ── 3. Photo upload to one existing evidence row ────────────────────────────
// Used by the inline "Upload Photo" control inside CaseEvidence.jsx's
// view dialog. Returns the server's PhotoUploadResult { photo, photos }.
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
export const listEvidences = async (caseId, { search, date, status, page = 1, page_size = 5 } = {}) => {
    const res = await axios.get(
        `${apiBase()}/api/investigator/cases/${caseId}/evidences`,
        {
            headers: getAuthHeader(),
            params:  { search, date, status, page, page_size },
        },
    );
    return res.data;
};

// ── 6. Adapter helpers ──────────────────────────────────────────────────────
// Convert a server row (CaseEvidenceRow shape) into the form shape
// StepEvidence expects, preserving photo IDs so we know which ones already
// exist on the server.
export const rowToFormShape = (row) => {
    if (!row) return null;
    return {
        // React key + ID forwarded back to backend
        id:               row.id,
        evidenceId:       row.id,

        // Editable fields
        type:             row.type || "",
        dateCollected:    row.date || "",
        collectedBy:      row.collectedBy || "",
        description:      row.description || "",
        status:           row.status,

        // File: row.fileName from backend is a public URL like "/uploads/..."
        // We split off just the basename for display, and stash the full URL
        // in `existingFileName` so we know NOT to re-upload it on save.
        existingFileName: row.fileName || null,
        fileName:         row.fileName ? row.fileName.split("/").pop() : "",
        fileMime:         row.fileMime || null,
        // No `fileDataUrl` and no `file` — those are only set when the user
        // picks a new file from disk.
        fileDataUrl:      null,
        file:             null,

        // Photos
        photos: (row.photos || []).map((p) => ({
            existingPhotoId: p.id,
            name:            p.file_name || `photo-${p.id}`,
            dataUrl:         p.url,
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