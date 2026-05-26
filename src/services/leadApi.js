import axios from "axios";

// ── Auth header (same convention as the rest of the app) ───────────────────
const getAuthHeader = () => {
    const token =
        localStorage.getItem("cia_token") || sessionStorage.getItem("cia_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const apiBase = () => import.meta.env.VITE_API_URL;


// ─────────────────────────────────────────────────────────────────────────────
// 1. Health check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Probe the AI service. Returns the parsed health object.
 * NEVER throws — a failure to reach the backend returns
 * { available: false, detail: "..." }. The button uses this to grey out.
 */

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

export const checkAiHealth = async () => {
    try {
        const res = await axios.get(
            `${apiBase()}/api/investigator/cases/leads/ai/health`,
            { headers: getAuthHeader(), timeout: 5000 },
        );
        return res.data;
    } catch (err) {
        return {
            available: false,
            model: "—",
            model_pulled: false,
            detail:
                err?.response?.data?.detail ||
                "AI service is unreachable.",
        };
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Blocking generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trigger AI lead generation for a case and await all generated leads.
 * Resolves with the full GenerationResult-shaped payload. Throws on
 * non-2xx with a useful message.
 *
 * Long timeout — design § 8 budgets ~13s on CPU; we give it 90s of
 * headroom in case the first request after a cold start triggers
 * Ollama to load the model from disk.
 */

export const generateAiLeads = async (caseId) => {
    if (!caseId) throw new Error("caseId is required");

    const res = await axios.post(
        `${apiBase()}/api/investigator/cases/${caseId}/leads/generate`,
        {},
        { headers: getAuthHeader(), timeout: 90_000 },
    );
    return res.data;
    // Shape: {
    //   case_id, accepted_leads, rejected_count, rejected_issues, reason,
    //   duration_ms, model, context_depth_score, gap_count, raw_lead_count
    // }
};


// ─────────────────────────────────────────────────────────────────────────────
// 3. Streaming generation (NDJSON)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Streaming variant. Calls callbacks as the server emits NDJSON events.
 *
 * Callbacks (all optional):
 *   onStarted({ case_id, model })   when the server confirms it has started
 *   onLead(leadRow)                 each accepted lead, in priority order
 *   onRejected({ count, issues })   if any were rejected
 *   onDone({ accepted, rejected, duration_ms, reason })
 *   onError({ status, detail })     any error mid-stream — terminal
 *
 * Returns: () => void  — call to abort the stream early.
 */

export const streamAiLeads = (caseId, {
    onStarted,
    onContext,
    onLead,
    onRejected,
    onDone,
    onError,
} = {}) => {
    if (!caseId) {
        onError?.({ status: 0, detail: "caseId is required" });
        return () => { };
    }

    const ctrl = new AbortController();
    const url  = `${apiBase()}/api/investigator/cases/${caseId}/leads/generate/stream`;

    (async () => {
        let res;
        try {
            res = await fetch(url, {
                method:  "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeader(),
                },
                body:    "{}",
                signal:  ctrl.signal,
            });
        } catch (err) {
            if (err.name !== "AbortError") {
                onError?.({ status: 0, detail: err.message || "Network error" });
            }
            return;
        }

        if (!res.ok) {
            let detail = `HTTP ${res.status}`;
            try {
                const body = await res.json();
                detail = body?.detail || detail;
            } catch { /* response wasn't JSON */ }
            onError?.({ status: res.status, detail });
            return;
        }

        const reader  = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer    = "";

        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                let nl;
                while ((nl = buffer.indexOf("\n")) !== -1) {
                    const line = buffer.slice(0, nl).trim();
                    buffer = buffer.slice(nl + 1);
                    if (!line) continue;

                    let evt;
                    try {
                        evt = JSON.parse(line);
                    } catch {
                        // Skip malformed line — shouldn't happen, but
                        // we won't blow up the whole stream over one
                        // bad chunk.
                        continue;
                    }

                    switch (evt.event) {
                        case "started":
                            onStarted?.({ case_id: evt.case_id, model: evt.model });
                            break;
                        case "context":
                            onContext?.({
                                depth_score: evt.depth_score,
                                gap_count:   evt.gap_count,
                            });
                            break;
                        case "lead":
                            onLead?.(evt.lead);
                            break;
                        case "rejected":
                            onRejected?.({ count: evt.count, issues: evt.issues });
                            break;
                        case "done":
                            onDone?.({
                                accepted:       evt.accepted,
                                rejected:       evt.rejected,
                                duration_ms:    evt.duration_ms,
                                reason:         evt.reason,
                                raw_lead_count: evt.raw_lead_count,
                                gap_count:      evt.gap_count,
                            });
                            break;
                        case "error":
                            onError?.({ status: evt.status, detail: evt.detail });
                            break;
                        default:
                            // Unknown event — ignore (forward-compatible).
                            break;
                    }
                }
            }
        } catch (err) {
            if (err.name !== "AbortError") {
                onError?.({ status: 0, detail: err.message });
            }
        }
    })();

    return () => ctrl.abort();
};
