/**
 * src/services/caseApi.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized backend integration for the Case-Registration flow.
 *
 * The register-case wizard collects everything (case meta, location, crime
 * details, victims, suspects, witnesses, evidences) in one big form. To keep
 * things simple and match how the rest of the app already works, we register
 * in two phases:
 *
 *   Phase 1 — createCase(formData)
 *     POST /api/investigator/cases
 *       └ creates the Case row, the Location row, and the crime-type
 *         subtype row (Murder/Theft/SexualAssault) in ONE transaction,
 *         then returns the new `case_id` (e.g. "C-2053").
 *
 *   Phase 2 — addAllChildEntities(caseId, formData)
 *     Reuses the existing per-entity services in the order:
 *       victims  → suspects  → witnesses  → evidences
 *     Every entity API already takes a caseId and handles its own
 *     photo/file uploads. We collect every failure into one report
 *     object so the UI can surface partials without rolling back the case.
 *
 * The orchestrator `registerCaseFull(formData)` runs both phases and
 * returns `{ caseId, childResults, partialFailures }`.
 *
 * No AI extraction yet — the FIR file is uploaded as a regular file
 * for now; the autofill step will be wired in a later iteration as the
 * user requested.
 *
 * Author: backend-integration pass (May 2026)
 */

import axios from "axios";

// Reuse the entity APIs that are already wired up. This is what keeps
// register-case in sync with AddVictimDialog / AddSuspectDialog / etc.
import { addVictimsToCase }   from "@/services/victimApi";
import { addSuspectsToCase }  from "@/services/suspectApi";
import { addWitnessesToCase } from "@/services/witnessApi";
import { addEvidencesToCase, fileToDataUrl } from "@/services/evidenceApi";

// ── Auth header (same pattern as every other *Api.js) ──────────────────────
export const getAuthHeader = () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const apiBase = () => import.meta.env.VITE_API_URL;

// ── Small helpers ──────────────────────────────────────────────────────────

/** "" → undefined, " x " → "x". Backend treats undefined as "leave alone"
 *  and an empty string as "set to empty", so we always strip blanks. */
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

// ───────────────────────────────────────────────────────────────────────────
// Phase 1: build the createCase POST body
// ───────────────────────────────────────────────────────────────────────────

/** Maps frontend formData → /api/investigator/cases POST body.
 *  Keeps the camelCase field names the rest of the app uses; the backend
 *  Pydantic schema (CaseRegisterRequest) re-maps them to snake_case for
 *  the ORM. */
export const buildCreateCasePayload = (f) => ({
    // ── Case meta ──────────────────────────────────────────────────────
    firNumber:        _s(f.firNumber),
    caseTitle:        _s(f.caseTitle),
    caseType:         _s(f.caseType),          // CaseType.label
    priority:         _s(f.priority),          // Severity.label
    caseStatus:       _s(f.caseStatus) || "Open",
    ppcSections:      _s(f.ppcSections),
    description:      _s(f.description),

    incidentDate:     _s(f.incidentDate),      // YYYY-MM-DD
    incidentTime:     _s(f.incidentTime),
    reportingDate:    _s(f.reportingDate),
    reportingTime:    _s(f.reportingTime),

    reportingOfficer: _s(f.reportingOfficer),
    // assignedInvestigator is normally inferred from the logged-in user,
    // but if the form has it explicitly the backend respects it (admins
    // assigning cases). For investigators it's ignored server-side.
    assignedInvestigator: _s(f.assignedInvestigator),

    // ── FIR metadata. The actual file is uploaded separately (below)
    //    to keep the JSON body small. If you don't have a FIR yet
    //    (manual entry mode), these stay undefined. ──
    firLanguage:      _s(f.firLanguage) || "English",
    firType:          _s(f.firType) || "FIR",
    manualEntry:      !!f.manualEntry,

    // ── Location step ──────────────────────────────────────────────────
    location: {
        province:       _s(f.province),
        city:           _s(f.city),
        area:           _s(f.area),
        policeStation:  _s(f.policeStation),
        address:        _s(f.address) || _s(f.displayAddress),
        latitude:       _num(f.latitude),
        longitude:      _num(f.longitude),
        crimeSceneType: _s(f.crimeSceneType),
        sceneAccess:    _s(f.sceneAccess),
        landmarks:      _s(f.landmarks),
    },

    // ── Crime details step ─────────────────────────────────────────────
    crime: {
        weaponUsed:       _s(f.weaponUsed),
        weaponDescription:_s(f.weaponDescription),
        vehicleUsed:      _s(f.vehicleUsed),
        numSuspects:      _num(f.numSuspects),
        motive:           _s(f.motive),
        modus:            _s(f.modus),
        witnessAvailable: !!f.witnessAvailable,
        cctv:             !!f.cctv,
        crimeDescription: _s(f.crimeDescription),

        // Murder extras (only persisted when caseType is murder-ish)
        causeOfDeath:    _s(f.causeOfDeath),
        bodyLocation:    _s(f.bodyLocation),
        timeOfDeath:     _s(f.timeOfDeath),
        postmortemDone:  !!f.postmortemDone,
        forensicDone:    !!f.forensicDone,

        // Sexual-assault extras
        medicalExam:      _s(f.medicalExam),
        victimCounseling: !!f.victimCounseling,
        protectionOrder:  !!f.protectionOrder,

        // Theft extras
        stolenItems:    _s(f.stolenItems),
        stolenValue:    _num(f.stolenValue),
        recoveryStatus: _s(f.recoveryStatus),
        entryPoint:     _s(f.entryPoint),
    },
});

// ───────────────────────────────────────────────────────────────────────────
// Phase 1: createCase
// ───────────────────────────────────────────────────────────────────────────

/** POST /api/investigator/cases.
 *
 *  Returns: { caseId, firNumber, timeline_events }
 *  Throws on backend validation errors (422), conflicts (409 — duplicate
 *  FIR number), or auth errors (401/403). Callers should catch and use
 *  `formatApiError` to surface a readable message.
 *
 *  After the JSON POST succeeds, if a FIR file was attached in the form
 *  we follow up with one multipart upload that fills the case's
 *  fir_file_path / fir_file_name columns. Keeping that separate means
 *  the JSON body stays small and the upload retries cleanly if it fails.
 */
export const createCase = async (formData) => {
    const url     = apiBase();
    const headers = getAuthHeader();

    const body = buildCreateCasePayload(formData);

    const res = await axios.post(
        `${url}/api/investigator/cases`,
        body,
        { headers },
    );

    const data   = res.data || {};
    const caseId = data.case_id || data.caseId;
    if (!caseId) {
        throw new Error("Server did not return a case_id");
    }

    // ── Optional FIR file upload (one extra round-trip) ────────────────
    // The FIR file lives on the formData as either:
    //   - formData.firFile  (a File object), or
    //   - formData.firFileDataUrl (already a data URL)
    // For now we just push it as a data URL — same convention as the
    // evidence file upload, so the backend reuses _decode_data_url.
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
                        fileName:    formData.firFileName ||
                                     formData.firFile?.name ||
                                     null,
                        fileMime:    formData.firFile?.type || null,
                    },
                    { headers },
                );
            }
        } catch (err) {
            // Non-fatal — case is registered, FIR file just didn't upload.
            // Caller can surface this as a partial failure.
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

// ───────────────────────────────────────────────────────────────────────────
// Phase 2: orchestrate adding all child entities
// ───────────────────────────────────────────────────────────────────────────

/** A "blank" victim/suspect/witness slot is one with no name AND no cnic
 *  AND no contact — the form starts with one empty row by default, and
 *  we don't want to POST that to the server. */
const _isBlankPerson = (p) =>
    !p?.name?.trim() && !p?.cnic?.trim() && !p?.contact?.trim();

const _isBlankEvidence = (e) =>
    !e?.type && !e?.description && !e?.fileName && !(e?.file instanceof File);

/** Adds victims, suspects, witnesses, evidences to a freshly-created case.
 *  Every per-entity service throws on its own bad request, but we don't
 *  want one bad row to kill the whole flow — so each phase is wrapped
 *  and its failure recorded in `partialFailures`. The case is already
 *  saved by this point, so the user keeps their work.
 *
 *  Returns: {
 *    childResults: {
 *      victims:    { created_ids, photo_failures, timeline_events },
 *      suspects:   { created_ids, photo_failures },
 *      witnesses:  { created_ids, photo_failures },
 *      evidences:  { created_ids, photo_failures, timeline_events },
 *    },
 *    partialFailures: [{ phase, error }, …]
 *  }
 */
export const addAllChildEntities = async (caseId, formData) => {
    if (!caseId) throw new Error("caseId is required");

    const victims   = (formData.victims   || []).filter(v => !_isBlankPerson(v));
    const suspects  = (formData.suspects  || []).filter(s => !_isBlankPerson(s));
    const witnesses = (formData.witnesses || []).filter(w => !_isBlankPerson(w));
    const evidences = (formData.evidences || []).filter(e => !_isBlankEvidence(e));

    const childResults = {
        victims:   { created_ids: [], photo_failures: [], timeline_events: [] },
        suspects:  { created_ids: [], photo_failures: [] },
        witnesses: { created_ids: [], photo_failures: [] },
        evidences: { created_ids: [], photo_failures: [], timeline_events: [] },
    };
    const partialFailures = [];

    // 1. Victims
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

    // 2. Suspects
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

    // 3. Witnesses
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

    // 4. Evidences (last, so any earlier failure is visible before file uploads)
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

// ───────────────────────────────────────────────────────────────────────────
// One-call orchestrator
// ───────────────────────────────────────────────────────────────────────────

/** End-to-end "register a case from the wizard" call.
 *
 *  Throws ONLY when phase 1 (case creation) fails — that's the deal-breaker.
 *  Phase 2 failures (victims/suspects/etc.) come back inside
 *  `partialFailures` and the case is still considered created.
 *
 *  Usage in the register-case page:
 *    const { caseId, partialFailures } = await registerCaseFull(formData);
 *    if (partialFailures.length) showToast(...);
 *    navigate(`/investigator/case/${caseId}`);
 */
export const registerCaseFull = async (formData) => {
    // Phase 1 — case + location + crime details (atomic on backend)
    const caseResult = await createCase(formData);
    const { caseId } = caseResult;

    // Phase 2 — child entities (best-effort, partial-failure-tolerant)
    const { childResults, partialFailures } =
        await addAllChildEntities(caseId, formData);

    if (caseResult.fir_file_failed) {
        partialFailures.unshift({
            phase: "fir_file",
            error: caseResult.fir_file_error || "FIR file upload failed",
        });
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
// Error utility — mirrors the one in evidenceApi.js so callers don't have
// to import from a specific module.
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