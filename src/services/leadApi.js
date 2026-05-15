/**
 * src/services/leadApi.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Lead creation helpers.
 *
 * Two callers today:
 *   1. CaseLeads.jsx → AddLeadDialog manual-lead flow (already wired
 *      inline; kept for backward compatibility — the inline axios.post
 *      will keep working).
 *   2. caseApi.js → registerCaseFull, which now POSTs the AI-generated
 *      leads from Step 9 of the wizard to the new case AFTER the case
 *      itself is created.
 *
 * Backend endpoint (verified against services/case_lead_service.add_manual_lead):
 *   POST /api/investigator/cases/{caseId}/leads
 *     body: AddManualLeadRequest (camelCase)
 *
 * Note on lead source:
 *   The backend `add_manual_lead` service writes event_source = "MANUAL"
 *   unconditionally — there's currently no public POST endpoint for
 *   true AI leads (those are inserted by the AI pipeline directly to
 *   the DB once it exists). For now we ship the register-case "AI"
 *   leads through this same endpoint but tag them with source="AI Analysis"
 *   so the LeadDetailDialog can still display the provenance correctly.
 *   When the real AI pipeline lands, swap the call in caseApi.js to hit
 *   the AI-leads endpoint and this file doesn't need to change.
 */

import axios from "axios";

export const getAuthHeader = () => {
    const token = localStorage.getItem("cia_token") || sessionStorage.getItem("cia_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const apiBase = () => import.meta.env.VITE_API_URL;

// ── Shape converter ────────────────────────────────────────────────────────

/** Frontend lead shape → backend AddManualLeadRequest body.
 *  Drops blanks because the backend treats null and missing differently. */
export const buildLeadPayload = (lead) => {
    const out = {};
    const fwd = (k, v) => { if (v !== undefined && v !== null && v !== "") out[k] = v; };

    fwd("type",             lead?.type);
    fwd("severity",         lead?.severity);
    fwd("description",      lead?.description);
    fwd("nextStep",         lead?.nextStep);
    fwd("source",           lead?.source);          // "AI Analysis" preserves provenance
    fwd("suggestedSuspect", lead?.suggestedSuspect?.name || lead?.suggestedSuspect);
    fwd("suspectBasis",     lead?.suggestedSuspect?.basis || lead?.suspectBasis);
    fwd("similarCaseId",    lead?.similarCase?.id || lead?.similarCaseId);
    fwd("weaponPattern",    lead?.weaponPattern);
    fwd("locationArea",     lead?.locationArea);
    fwd("confidence",       typeof lead?.confidence === "number" ? lead.confidence : undefined);
    fwd("status",           lead?.status || "New");
    return out;
};

// ── 1. Add a single lead to a case ────────────────────────────────────────
export const addLeadToCase = async (caseId, lead) => {
    if (!caseId) throw new Error("caseId is required");

    const res = await axios.post(
        `${apiBase()}/api/investigator/cases/${caseId}/leads`,
        buildLeadPayload(lead),
        { headers: getAuthHeader() },
    );
    return res.data;     // LeadRow shape from schemas/case_lead_schema.py
};

// ── 2. Bulk-add a batch (one POST per lead — backend has no bulk endpoint
//      and 3-5 leads/case is well under any rate limit). Returns
//      { created: LeadRow[], failures: [{ lead, error }] }. NEVER throws
//      on a partial failure — registration shouldn't be undone just
//      because one lead didn't save. */
export const addLeadsToCase = async (caseId, leads) => {
    if (!caseId) throw new Error("caseId is required");
    const list = Array.isArray(leads) ? leads : [];
    if (!list.length) return { created: [], failures: [] };

    const created  = [];
    const failures = [];

    for (const lead of list) {
        try {
            const row = await addLeadToCase(caseId, lead);
            created.push(row);
        } catch (err) {
            failures.push({
                lead,
                error: err?.response?.data?.detail || err.message || "Lead save failed",
            });
        }
    }

    return { created, failures };
};