import axios from "axios";

import { addVictimsToCase } from "@/services/victimApi";
import { addSuspectsToCase } from "@/services/suspectApi";
import { addWitnessesToCase } from "@/services/witnessApi";
import { addEvidencesToCase, fileToDataUrl } from "@/services/evidenceApi";
import { deleteDraft } from "@/services/draftApi";

export const getAuthHeader = () => {
    const token = localStorage.getItem("cia_token") || sessionStorage.getItem("cia_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const apiBase = () => import.meta.env.VITE_API_URL;


const _s = (v) => {
    if (v === undefined || v === null) return undefined;
    if (typeof v !== "string") return v;
    const t = v.trim();
    return t === "" ? undefined : t;
};

const _num = (v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
};

export const buildCreateCasePayload = (f) => ({
    firNumber: _s(f.firNumber),
    caseTitle: _s(f.caseTitle),
    caseType: _s(f.caseType),
    priority: _s(f.priority),
    caseStatus: _s(f.caseStatus) || "Open",
    ppcSections: _s(f.ppcSections),
    description: _s(f.description),

    incidentDate: _s(f.incidentDate),
    incidentTime: _s(f.incidentTime),
    reportingDate: _s(f.reportingDate),
    reportingTime: _s(f.reportingTime),

    reportingOfficer: _s(f.reportingOfficer),
    assignedInvestigator: _s(f.assignedInvestigator),

    firLanguage: _s(f.firLanguage) || "English",
    firType: _s(f.firType) || "FIR",
    manualEntry: !!f.manualEntry,

    location: {
        province: _s(f.province),
        city: _s(f.city),
        area: _s(f.area),
        policeStation: _s(f.policeStation),
        address: _s(f.address) || _s(f.displayAddress),
        latitude: _num(f.latitude),
        longitude: _num(f.longitude),
        crimeSceneType: _s(f.crimeSceneType),
        sceneAccess: _s(f.sceneAccess),
        landmarks: _s(f.landmarks),
    },

    crime: {
        weaponUsed: _s(f.weaponUsed),
        weaponDescription: _s(f.weaponDescription),
        vehicleUsed: _s(f.vehicleUsed),
        numSuspects: _num(f.numSuspects),
        motive: _s(f.motive),
        modus: _s(f.modus),
        witnessAvailable: !!f.witnessAvailable,
        cctv: !!f.cctv,
        crimeDescription: _s(f.crimeDescription),

        causeOfDeath: _s(f.causeOfDeath),
        bodyLocation: _s(f.bodyLocation),
        timeOfDeath: _s(f.timeOfDeath),
        postmortemDone: !!f.postmortemDone,
        forensicDone: !!f.forensicDone,

        medicalExam: _s(f.medicalExam),
        victimCounseling: !!f.victimCounseling,
        protectionOrder: !!f.protectionOrder,

        stolenItems: _s(f.stolenItems),
        stolenValue: _num(f.stolenValue),
        recoveryStatus: _s(f.recoveryStatus),
        entryPoint: _s(f.entryPoint),
    },
});

export const fetchLinkedCases = async (caseId) => {
    const { data } = await axios.get(
        `${apiBase()}/api/investigator/cases/${encodeURIComponent(caseId)}/linked-cases`,
        { headers: getAuthHeader() },
    );
    return data; // array or { items: [...] }
};

export const createCase = async (formData) => {
    const url = apiBase();
    const headers = getAuthHeader();

    const body = buildCreateCasePayload(formData);

    const res = await axios.post(
        `${url}/api/investigator/cases/register`,
        body,
        { headers },
    );

    const data = res.data || {};
    const caseId = data.case_id || data.caseId;
    if (!caseId) {
        throw new Error("Server did not return a case_id");
    }

    // ── Optional FIR file upload ──────────────────────────────────────
    if (formData.firFile instanceof File || formData.firFileDataUrl) {
        try {
            const dataUrl =
                formData.firFileDataUrl ||
                (await fileToDataUrl(formData.firFile));
            if (dataUrl) {
                await axios.patch(
                    `${url}/api/investigator/cases/${caseId}/fir-file`,
                    {
                        fileDataUrl: dataUrl,
                        fileName: formData.firFileName ||
                            formData.firFile?.name ||
                            null,
                        fileMime: formData.firFile?.type || null,
                    },
                    { headers },
                );
            }
        } catch (err) {
            console.warn("FIR file upload failed:", err);
            return {
                caseId,
                firNumber: data.fir_number || data.firNumber,
                timeline_events: data.timeline_events || [],
                fir_file_failed: true,
                fir_file_error:
                    err?.response?.data?.detail ||
                    err.message ||
                    "FIR file upload failed",
            };
        }
    }

    return {
        caseId,
        firNumber: data.fir_number || data.firNumber,
        timeline_events: data.timeline_events || [],
        fir_file_failed: false,
    };
};
const _isBlankPerson = (p) => {
    // Drop ONLY when literally everything is empty. A suspect with just
    // a reason, physical description, or status counts as real and must
    // be sent to the server.
    return (
        !p?.name?.trim() &&
        !p?.cnic?.trim() &&
        !p?.contact?.trim() &&
        !p?.address?.trim() &&
        !p?.reason?.trim() &&                // suspects often have only this
        !p?.physicalDescription?.trim() &&   // and this
        !p?.relationToCase?.trim() &&
        !p?.alibi?.trim() &&
        !p?.notes?.trim()
    );
};

const _isBlankEvidence = (e) =>
    !e?.type && !e?.description && !e?.fileName && !(e?.file instanceof File);

const _isBlankLead = (l) =>
    !l?.type && !l?.description;

export const addAllChildEntities = async (caseId, formData) => {
    if (!caseId) throw new Error("caseId is required");

    const victims = (formData.victims || []).filter(v => !_isBlankPerson(v));
    const suspects = (formData.suspects || []).filter(s => !_isBlankPerson(s));
    const witnesses = (formData.witnesses || []).filter(w => !_isBlankPerson(w));
    const evidences = (formData.evidences || []).filter(e => !_isBlankEvidence(e));

    const childResults = {
        victims: { created_ids: [], photo_failures: [], timeline_events: [] },
        suspects: { created_ids: [], photo_failures: [] },
        witnesses: { created_ids: [], photo_failures: [] },
        evidences: { created_ids: [], photo_failures: [], timeline_events: [] },
        leads: { created: [], failures: [] },
    };
    const partialFailures = [];

    if (victims.length) {
        try {
            childResults.victims = await addVictimsToCase(caseId, victims);
        } catch (err) {
            partialFailures.push({
                phase: "victims",
                error: err?.response?.data?.detail || err.message || "Failed to add victims",
            });
        }
    }

    if (suspects.length) {
        try {
            childResults.suspects = await addSuspectsToCase(caseId, suspects);
        } catch (err) {
            partialFailures.push({
                phase: "suspects",
                error: err?.response?.data?.detail || err.message || "Failed to add suspects",
            });
        }
    }

    if (witnesses.length) {
        try {
            childResults.witnesses = await addWitnessesToCase(caseId, witnesses);
        } catch (err) {
            partialFailures.push({
                phase: "witnesses",
                error: err?.response?.data?.detail || err.message || "Failed to add witnesses",
            });
        }
    }

    if (evidences.length) {
        try {
            childResults.evidences = await addEvidencesToCase(caseId, evidences);
        } catch (err) {
            partialFailures.push({
                phase: "evidences",
                error: err?.response?.data?.detail || err.message || "Failed to add evidences",
            });
        }
    }

    return { childResults, partialFailures };
};

export const registerCaseFull = async (formData) => {
    // Phase 1
    const caseResult = await createCase(formData);
    const { caseId } = caseResult;

    // Phase 2
    const { childResults, partialFailures } =
        await addAllChildEntities(caseId, formData);

    if (caseResult.fir_file_failed) {
        partialFailures.unshift({
            phase: "fir_file",
            error: caseResult.fir_file_error || "FIR file upload failed",
        });
    }

    // Phase 0 cleanup: if this submission came from a draft, throw the
    // draft away now that we have a real case. Best-effort — a failure
    // here doesn't matter to the user (worst case: a stale draft they
    // can delete manually).
    if (formData.draftId) {
        try {
            await deleteDraft(formData.draftId);
        } catch (err) {
            console.warn("Draft cleanup failed (non-fatal):", err);
        }
    }

    return {
        caseId,
        firNumber: caseResult.firNumber,
        timeline_events: caseResult.timeline_events,
        childResults,
        partialFailures,
    };
};

// ───────────────────────────────────────────────────────────────────────────
// Error utility
// ───────────────────────────────────────────────────────────────────────────
export const formatApiError = (err, fallback = "Request failed") => {
    if (!err) return fallback;
    const detail = err?.response?.data?.detail;
    if (Array.isArray(detail)) {
        return detail.map((d) => d?.msg || JSON.stringify(d)).join("; ");
    }
    if (typeof detail === "string") return detail;
    return err.message || fallback;
};

export const regenerateLinkedCases = async (caseId) => {
    const { data } = await axios.post(
        `${apiBase()}/api/investigator/cases/${encodeURIComponent(caseId)}/links/regenerate`,
    );
    return data;
};