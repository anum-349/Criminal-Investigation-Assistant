import axios from "axios";
import { apiPost, apiGet, getAuthHeader } from "./apiCommon";

const apiBase = () => import.meta.env.VITE_API_URL;

export const buildLeadPayload = (lead) => {
    const out = {};
    const fwd = (k, v) => { if (v !== undefined && v !== null && v !== "") out[k] = v; };

    fwd("type", lead?.type);
    fwd("severity", lead?.severity);
    fwd("description", lead?.description);
    fwd("nextStep", lead?.nextStep);
    fwd("source", lead?.source);
    fwd("suggestedSuspect", lead?.suggestedSuspect?.name || lead?.suggestedSuspect);
    fwd("suspectBasis", lead?.suggestedSuspect?.basis || lead?.suspectBasis);
    fwd("similarCaseId", lead?.similarCase?.id || lead?.similarCaseId);
    fwd("weaponPattern", lead?.weaponPattern);
    fwd("locationArea", lead?.locationArea);
    fwd("confidence", typeof lead?.confidence === "number" ? lead.confidence : undefined);
    fwd("status", lead?.status || "New");
    return out;
};

export const addLeadToCase = async (caseId, lead) => {
    if (!caseId) throw new Error("caseId is required");
    const res = await apiPost(
        `/api/investigator/cases/${caseId}/leads`,
        buildLeadPayload(lead)
    );
    return res.data;
};

export const addLeadsToCase = async (caseId, leads) => {
    if (!caseId) throw new Error("caseId is required");
    const list = Array.isArray(leads) ? leads : [];
    if (!list.length) return { created: [], failures: [] };

    const created = [];
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
        const res = await apiGet(
            `/api/investigator/cases/leads/ai/health`
        );
        return res.data;
    } catch (err) {
        return {
            available: false,
            model: "—",
            model_pulled: false,
            detail: err?.response?.data?.detail || "AI service is unreachable.",
        };
    }
};

export const generateAiLeads = async (caseId) => {
    if (!caseId) throw new Error("caseId is required");

    const res = await axios.post(
        `${apiBase()}/api/investigator/cases/${caseId}/leads/generate`,
        {},
        { headers: getAuthHeader(), timeout: 90_000 }
    );
    return res.data;
};

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
    const url = `${apiBase()}/api/investigator/cases/${caseId}/leads/generate/stream`;

    (async () => {
        let res;
        try {
            res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeader(),
                },
                body: "{}",
                signal: ctrl.signal,
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
            } catch { }
            onError?.({ status: res.status, detail });
            return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

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
                        continue;
                    }

                    switch (evt.event) {
                        case "started":
                            onStarted?.({ case_id: evt.case_id, model: evt.model });
                            break;
                        case "context":
                            onContext?.({
                                depth_score: evt.depth_score,
                                gap_count: evt.gap_count,
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
                                accepted: evt.accepted,
                                rejected: evt.rejected,
                                duration_ms: evt.duration_ms,
                                reason: evt.reason,
                                raw_lead_count: evt.raw_lead_count,
                                gap_count: evt.gap_count,
                            });
                            break;
                        case "error":
                            onError?.({ status: evt.status, detail: evt.detail });
                            break;
                        default:
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

export { formatApiError } from "./apiCommon";
