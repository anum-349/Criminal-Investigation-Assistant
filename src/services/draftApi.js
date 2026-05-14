

import axios from "axios";

export const getAuthHeader = () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const apiBase = () => import.meta.env.VITE_API_URL;

// ── Helpers ────────────────────────────────────────────────────────────────

/** Strip transient/non-JSON-serializable fields from formData before sending.
 *  Specifically:
 *    - File objects (firFile, evidence file, photo File objects). We keep
 *      the *name* and any already-resolved data URLs so the user sees the
 *      photo when they re-open the draft, but a File is gone after a page
 *      reload anyway, so storing it serverside is pointless.
 *    - React-only metadata like `_addressTouched`, `_fromPicker`. These
 *      are UI-side flags that don't belong in the saved snapshot. */
const _sanitizeForDraft = (formData) => {
    const clone = JSON.parse(JSON.stringify({
        ...formData,
        // The FIR File object can't survive JSON. Keep the name only; the
        // user will be prompted to re-attach if they want the file too.
        firFile: null,
    }));

    // Strip UI-only flags from step-location.
    delete clone._addressTouched;
    delete clone._fromPicker;

    // For each evidence row, drop the live File object but keep fileName /
    // fileMime / fileDataUrl (the data URL is already JSON-safe).
    if (Array.isArray(clone.evidences)) {
        clone.evidences = clone.evidences.map(ev => {
            const { file, ...rest } = ev || {};
            return rest;
        });
    }

    // Same for victims / suspects / witnesses — photos may have File objects.
    const _stripPhotos = (arr) => {
        if (!Array.isArray(arr)) return arr;
        return arr.map(p => {
            // photoUrl can be: null | "url string" | [{name, dataUrl, ...}]
            if (Array.isArray(p?.photoUrl)) {
                p = {
                    ...p,
                    photoUrl: p.photoUrl.map(ph => {
                        const { file, ...rest } = ph || {};
                        return rest;
                    }),
                };
            }
            return p;
        });
    };
    clone.victims   = _stripPhotos(clone.victims);
    clone.suspects  = _stripPhotos(clone.suspects);
    clone.witnesses = _stripPhotos(clone.witnesses);

    return clone;
};


// ── 1. Save / replace a draft ──────────────────────────────────────────────

/** Save the wizard's current state. If `draftId` is set in formData, the
 *  server updates that row in place; otherwise it creates a fresh draft and
 *  returns its id (which the caller should stash so subsequent autosaves
 *  hit the same row instead of creating duplicates).
 *
 *  Returns: { draftId, title, updatedAt }
 */
export const saveDraft = async (formData) => {
    const url     = apiBase();
    const headers = getAuthHeader();
    const safe    = _sanitizeForDraft(formData);

    const res = await axios.post(
        `${url}/api/investigator/cases/case-drafts`,
        {
            draftId:   formData.draftId || undefined,
            // Best-effort human-readable title for the Drafts list.
            // Falls back to "Untitled draft" on the server if both are blank.
            title:     formData.caseTitle || formData.firNumber || undefined,
            formData:  safe,
        },
        { headers },
    );

    return res.data;       // { draftId, title, updatedAt }
};


// ── 2. List drafts ─────────────────────────────────────────────────────────

/** Return the current user's drafts, newest first.
 *  Server response shape:
 *    { items: [{ draftId, title, caseType, firNumber, updatedAt, progressPercent }, …] }
 */
export const listDrafts = async () => {
    const res = await axios.get(
        `${apiBase()}/api/investigator/cases/case-drafts`,
        { headers: getAuthHeader() },
    );
    return res.data?.items || [];
};


// ── 3. Load one draft (full formData) ──────────────────────────────────────

/** Fetch the full saved formData for a given draft. Used by the wizard
 *  when resuming a draft from the Drafts page (?draftId=… in the URL).
 *
 *  Server returns the formData as it was sanitized at save time, plus the
 *  draftId so the wizard can keep it around for the next autosave.
 */
export const getDraft = async (draftId) => {
    if (!draftId) throw new Error("draftId is required");
    const res = await axios.get(
        `${apiBase()}/api/investigator/cases/case-drafts/${encodeURIComponent(draftId)}`,
        { headers: getAuthHeader() },
    );
    // { draftId, title, formData, updatedAt }
    return res.data;
};


// ── 4. Delete a draft ──────────────────────────────────────────────────────

/** Remove a draft permanently. Called from:
 *   - The Drafts page trash button.
 *   - register-case/page.jsx after a successful registration that started
 *     life as a draft (so the draft doesn't linger).
 */
export const deleteDraft = async (draftId) => {
    if (!draftId) return { deleted: false };
    const res = await axios.delete(
        `${apiBase()}/api/investigator/cases/case-drafts/${encodeURIComponent(draftId)}`,
        { headers: getAuthHeader() },
    );
    return res.data;     // { deleted: true, draftId }
};