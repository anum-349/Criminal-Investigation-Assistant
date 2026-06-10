/**
 * StepFIRUpload.jsx  —  Step 1  (NDJSON streaming version)
 *
 * Progress steps are now driven by real backend events instead of a fake timer.
 * Every other prop / UI element is unchanged.
 */

import { useRef, useState } from "react";
import {
  Upload, FileText, CheckCircle2, AlertTriangle,
  Loader2, ArrowRight, FastForward, Info, ChevronDown, ChevronUp,
} from "lucide-react";
import { SectionHeading } from "@/pages/form/CaseFormFields/page";
import { useToast } from "@/context/ToastContext";
import { defaultSuspect, defaultVictim } from "@/pages/form/caseFormConstants/page";

// ─── API config ────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─── Real pipeline steps — must match on_step keys emitted by orchestrator ─
const PIPELINE_STEPS = [
  { key: "ocr", label: "OCR / text extraction…" },
  { key: "lang", label: "Detecting language (Urdu / English)…" },
  { key: "regex", label: "Running regex pre-pass…" },
  { key: "groq", label: "Extracting with AI (Groq / Llama)…" },
  { key: "validation", label: "Validating FIR document…" },
  { key: "merge", label: "Mapping to form fields…" },
  { key: "entities", label: "Running NER backfill…" },
  { key: "lime", label: "Computing AI confidence (LIME)…" },
];

// ─── XAI Evidence panel ────────────────────────────────────────────────────
function XAIPanel({ evidence = [], steps = {} }) {
  const [open, setOpen] = useState(false);
  if (!evidence.length) return null;

  const positive = evidence.filter(e => e.direction === "positive").slice(0, 6);
  const negative = evidence.filter(e => e.direction === "negative").slice(0, 4);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-sm text-slate-700 font-medium"
      >
        <span className="flex items-center gap-2">
          <Info className="h-4 w-4 text-deep-ocean" />
          AI Reasoning Breakdown (XAI)
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="p-4 space-y-4 bg-white text-xs">
          {steps.extraction && (
            <div>
              <p className="font-semibold text-slate-600 mb-2">📄 Extraction</p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-slate-100 px-2 py-1 rounded">Method: {steps.extraction.method}</span>
                <span className="bg-slate-100 px-2 py-1 rounded">Pages: {steps.extraction.pages}</span>
                <span className="bg-slate-100 px-2 py-1 rounded">Chars: {steps.extraction.char_count}</span>
                {steps.extraction.has_urdu && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">Urdu detected</span>
                )}
              </div>
            </div>
          )}

          {steps.language_detection && (
            <div>
              <p className="font-semibold text-slate-600 mb-2">🌐 Language Detection</p>
              <div className="flex gap-2">
                <span className="bg-slate-100 px-2 py-1 rounded capitalize">
                  {steps.language_detection.detected} ({(steps.language_detection.confidence * 100).toFixed(0)}% confidence)
                </span>
              </div>
            </div>
          )}

          {steps.translation && !steps.translation.skipped && (
            <div>
              <p className="font-semibold text-slate-600 mb-2">🔤 Translation (Urdu → English)</p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-slate-100 px-2 py-1 rounded">
                  Coverage: {(steps.translation.coverage * 100).toFixed(0)}%
                </span>
                {steps.translation.unknown_tokens?.length > 0 && (
                  <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded">
                    Unknown tokens: {steps.translation.unknown_tokens.slice(0, 5).join(", ")}
                  </span>
                )}
              </div>
            </div>
          )}

          <div>
            <p className="font-semibold text-slate-600 mb-2">🤖 Classifier Evidence</p>
            {steps.lime?.lime_weights?.length > 0 && (
              <div>
                <p className="font-semibold text-slate-600 mb-1">🧠 LIME — Word Influence on FIR Classification</p>
                <p className="text-slate-500 mb-2 italic">{steps.lime.summary}</p>
                <div className="flex flex-wrap gap-1">
                  {steps.lime.lime_weights.map(([word, weight]) => (
                    <span
                      key={word}
                      className={`px-2 py-0.5 rounded border text-xs font-medium ${weight > 0
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-red-50 border-red-200 text-red-700"
                        }`}
                    >
                      {word}{" "}
                      <span className="opacity-60">
                        {weight > 0 ? "+" : ""}{weight.toFixed(3)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {positive.length > 0 && (
              <div className="mb-2">
                <p className="text-emerald-700 font-medium mb-1">Positive signals (FIR indicators):</p>
                <div className="flex flex-wrap gap-1">
                  {positive.map(e => (
                    <span key={e.term} className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded">
                      {e.term} <span className="opacity-60">+{e.weight.toFixed(2)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {negative.length > 0 && (
              <div>
                <p className="text-red-600 font-medium mb-1">Suppressing signals:</p>
                <div className="flex flex-wrap gap-1">
                  {negative.map(e => (
                    <span key={e.term} className="bg-red-50 border border-red-200 text-red-700 px-2 py-0.5 rounded">
                      {e.term} <span className="opacity-60">{e.weight.toFixed(2)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {steps.entity_extraction && (
            <div>
              <p className="font-semibold text-slate-600 mb-2">🔍 Entity Extraction (Regex NLP)</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(steps.entity_extraction.entities_found).map(([k, v]) => (
                  <span key={k} className={`px-2 py-1 rounded ${v > 0 ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>
                    {k}: {v}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helper: merge API suspect → defaultSuspect() shape ────────────────────
function mergeApiSuspect(apiSuspect = {}) {
  return {
    ...defaultSuspect(),
    name: apiSuspect.name ?? "",
    age: apiSuspect.age ?? "",
    gender: apiSuspect.gender ?? "",
    cnic: apiSuspect.cnic ?? "",
    address: apiSuspect.address ?? "",
    contact: apiSuspect.contact ?? "",
    occupation: apiSuspect.occupation ?? "",
    physicalDescription: apiSuspect.physicalDescription ?? "",
    knownAffiliations: apiSuspect.knownAffiliations ?? "",
    criminalRecord: apiSuspect.criminalRecord ?? false,
    arrested: apiSuspect.arrested ?? false,
    status: apiSuspect.status ?? "At Large",
    vehicleDescription: apiSuspect.vehicleDescription ?? "",
    arrivalMethod: apiSuspect.arrivalMethod ?? "",
    relationToCase: apiSuspect.relationToCase ?? "",
    alibi: apiSuspect.alibi ?? "",
    notes: apiSuspect.notes ?? "",
    reason: apiSuspect.reason ?? "",
  };
}

// ─── Helper: merge API victim → defaultVictim() shape ──────────────────────
function mergeApiVictim(apiVictim = {}) {
  return {
    ...defaultVictim(),
    name: apiVictim.name ?? "",
    age: apiVictim.age ?? "",
    gender: apiVictim.gender ?? "",
    cnic: apiVictim.cnic ?? "",
    contact: apiVictim.contact ?? "",
    address: apiVictim.address ?? "",
    occupation: apiVictim.occupation ?? "",
    status: apiVictim.status ?? "Alive",
    injuryType: apiVictim.injuryType ?? "",
    natureOfInjuries: apiVictim.natureOfInjuries ?? "",
    causeOfDeath: apiVictim.causeOfDeath ?? "",
    declaredDead: apiVictim.declaredDead ?? "",
    postmortemAutopsy: apiVictim.postmortemAutopsy ?? "",
    injurySummary: apiVictim.injurySummary ?? "",
    injuryRecordedBy: apiVictim.injuryRecordedBy ?? "",
    caseType: apiVictim.caseType ?? "",
    primaryLabel: apiVictim.primaryLabel ?? "",
    relation: apiVictim.relation ?? "",
    threatLevel: apiVictim.threatLevel ?? "",
    medicalReport: apiVictim.medicalReport ?? false,
    postmortem: apiVictim.postmortem ?? false,
    protectionRequired: apiVictim.protectionRequired ?? false,
    cooperative: apiVictim.cooperative ?? true,
    statement: apiVictim.statement ?? "",
    forensic: Array.isArray(apiVictim.forensic) ? apiVictim.forensic : [],
    timeline: Array.isArray(apiVictim.timeline) ? apiVictim.timeline : [],
    legal: Array.isArray(apiVictim.legal) ? apiVictim.legal : [],
    nextFollowUp: apiVictim.nextFollowUp ?? "",
    protectionAssigned: apiVictim.protectionAssigned ?? "",
    protectionNotes: apiVictim.protectionNotes ?? "",
  };
}

// ─── Date / time normalizers ───────────────────────────────────────────────
function normalizeDate(val) {
  if (!val) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const dmyMatch = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
  const d = new Date(val);
  if (!isNaN(d)) return d.toISOString().split("T")[0];
  return "";
}

function normalizeTime(val) {
  if (!val) return "";
  if (/^\d{2}:\d{2}$/.test(val)) return val;
  const m = val.match(/^(\d{1,2}):(\d{2})/);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  return val;
}

// ─── Build extracted fields from pipeline payload ──────────────────────────
function buildExtracted(p) {
  const rawSuspects = Array.isArray(p.accusedPersons) && p.accusedPersons.length
    ? p.accusedPersons
    : Array.isArray(p.suspects) && p.suspects.length
      ? p.suspects
      : [];
  const mergedSuspects = rawSuspects.length ? rawSuspects.map(mergeApiSuspect) : undefined;

  const rawVictims = Array.isArray(p.victims) && p.victims.length ? p.victims : [];
  const mergedVictims = rawVictims.length ? rawVictims.map(mergeApiVictim) : undefined;

  return {
    firLanguage: p.firLanguage || "English",
    firType: p.firType || "FIR",
    manualEntry: false,
    completeness: p.completenessScore ?? p.completeness ?? 0,
    confidence: p.confidence ?? 0,
    extractedEntities: p.extractedEntities ?? { persons: [], locations: [], weapons: [], vehicles: [], dates: [] },
    missingFields: Array.isArray(p.missingFields) ? p.missingFields : [],

    priority: p.priority ?? "Medium",
    firNumber: p.firNumber ?? "",
    caseTitle: p.caseTitle ?? "",
    incidentDate: normalizeDate(p.incidentDate ?? p.dateOfIncident),
    incidentTime: normalizeTime(p.incidentTime ?? p.timeOfIncident),
    reportingDate: normalizeDate(p.reportingDate),
    reportingTime: normalizeTime(p.reportingTime ?? ""),
    caseType: p.caseType ?? p.crimeType ?? "",
    caseStatus: p.caseStatus ?? "Open",
    ppcSections: Array.isArray(p.ppcSections) ? p.ppcSections.join(", ") : (p.ppcSections ?? ""),
    description: p.description ?? p.crimeSummary ?? "",
    reportingOfficer: p.reportingOfficer ?? p.investigatingOfficer ?? "",
    assignedInvestigator: p.assignedInvestigator ?? p.investigatingOfficer ?? "",

    province: p.province ?? "",
    city: p.city ?? p.district ?? "",
    area: p.area ?? "",
    policeStation: p.policeStation ?? "",
    address: p.address ?? p.incidentAddress ?? "",
    latitude: p.latitude ?? "",
    longitude: p.longitude ?? "",
    crimeSceneType: p.crimeSceneType ?? "",
    sceneAccess: p.sceneAccess ?? "",
    landmarks: p.landmarks ?? "",

    ...(mergedVictims ? { victims: mergedVictims } : {}),
    ...(mergedSuspects ? { suspects: mergedSuspects } : {}),

    crimeDescription: p.crimeDescription ?? p.description ?? "",
    motive: p.motive ?? "",
    modus: p.modus ?? p.modusOperandi ?? "",
    weaponUsed: p.weaponUsed ?? (Array.isArray(p.weaponsInvolved) ? p.weaponsInvolved[0] : "") ?? "",
    weaponDescription: p.weaponDescription ?? "",
    vehicleUsed: p.vehicleUsed ?? (Array.isArray(p.vehiclesInvolved) ? p.vehiclesInvolved[0] : "") ?? "",
    numSuspects: p.numSuspects ?? rawSuspects.length ?? "",
    witnessAvailable: p.witnessAvailable ?? false,
    cctv: p.cctv ?? false,
    causeOfDeath: p.causeOfDeath ?? "",
    bodyLocation: p.bodyLocation ?? "",
    timeOfDeath: p.timeOfDeath ?? "",
    postmortemDone: p.postmortemDone ?? false,
    forensicDone: p.forensicDone ?? false,
    medicalExam: p.medicalExam ?? "",
    victimCounseling: p.victimCounseling ?? false,
    protectionOrder: p.protectionOrder ?? false,
    stolenItems: p.stolenItems ?? "",
    stolenValue: p.stolenValue ?? "",
    recoveryStatus: p.recoveryStatus ?? "",
    entryPoint: p.entryPoint ?? "",

    ...(Array.isArray(p.evidences) && p.evidences.length ? { evidences: p.evidences } : { evidences: [] }),
    ...(Array.isArray(p.witnesses) && p.witnesses.length ? { witnesses: p.witnesses } : { witnesses: [] }),

    statementEnglish: p.statementEnglish ?? "",
    crimeSummary: p.crimeSummary ?? "",
    _legalSections: Array.isArray(p._legalSections) ? p._legalSections : Array.isArray(p.legalSections) ? p.legalSections : [],
    _ioRank: p._ioRank ?? p.ioRank ?? "",
    investigatingOfficer: p.investigatingOfficer ?? "",
    ioRank: p.ioRank ?? p._ioRank ?? "",
    vehiclePlates: Array.isArray(p.vehiclePlates) ? p.vehiclePlates : [],
    weaponsInvolved: Array.isArray(p.weaponsInvolved) ? p.weaponsInvolved : [],
    vehiclesInvolved: Array.isArray(p.vehiclesInvolved) ? p.vehiclesInvolved : [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════
export default function StepFIRUpload({
  data,
  setData,
  onExtracted,
  onNext,
  onSkipAndSave,
  skipSaving = false,
}) {
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [xaiData, setXaiData] = useState({ evidence: [], steps: {} });

  // ── Real step tracking (driven by backend events) ─────────────────────────
  const [completedSteps, setCompletedSteps] = useState([]);   // array of completed keys
  const [currentStepKey, setCurrentStepKey] = useState(null); // key currently running

  const toast = useToast();

  // ── File handler ───────────────────────────────────────────────────────────
  const handleFile = (file) => {
    if (!file) return;
    const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/bmp"];
    if (!ALLOWED.includes(file.type)) {
      toast.warning("Please upload a PDF or image file (JPG / PNG / BMP).");
      return;
    }
    setDone(false);
    setXaiData({ evidence: [], steps: {} });
    setCompletedSteps([]);
    setCurrentStepKey(null);
    setData(d => ({ ...d, firFile: file, firFileName: file.name }));
    processWithAPI(file);
  };

  // ── NDJSON streaming pipeline call ────────────────────────────────────────
  const processWithAPI = async (file) => {
    setProcessing(true);

    try {
      const formPayload = new FormData();
      formPayload.append("file", file);

      const res = await fetch(`${API_BASE}/api/process-fir`, {
        method: "POST",
        body: formPayload,
      });

      if (!res.ok || !res.body) {
        toast.error("Server error — is the FIR pipeline running?");
        setData(d => ({ ...d, firFile: null, firFileName: "" }));
        setProcessing(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });

        let nl;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;

          let evt;
          try { evt = JSON.parse(line); } catch { continue; }

          // ── Step event: mark previous done, set new current ────────────
          if (evt.event === "step") {
            const key = evt.step;
            setCurrentStepKey(prev => {
              if (prev) setCompletedSteps(cs => [...cs, prev]);
              return key;
            });
          }
          else if (evt.event === "heartbeat") {
            // keep-alive — ignore, just prevents connection drop
          }
          // ── Error event ────────────────────────────────────────────────
          else if (evt.event === "error") {
            toast.error(evt.detail || "Document is not a valid FIR.");
            setData(d => ({ ...d, firFile: null, firFileName: "" }));
            setProcessing(false);
            setDone(false);
            return;
          }

          // ── Done event — pipeline finished ─────────────────────────────
          else if (evt.event === "done") {
            // Mark all steps complete
            setCompletedSteps(PIPELINE_STEPS.map(s => s.key));
            setCurrentStepKey(null);

            if (!evt.success) {
              toast.error(evt.error || "Document is not a valid FIR.");
              setData(d => ({ ...d, firFile: null, firFileName: "" }));
              setProcessing(false);
              return;
            }

            const p = evt.payload;

            const extracted = buildExtracted(p);

            onExtracted(extracted);

            setXaiData({
              evidence: evt.steps?.validation?.evidence || [],
              steps: evt.steps || {},
            });

            setProcessing(false);
            setDone(true);

            toast.success(
              `FIR processed in ${evt.duration_ms}ms — ` +
              `${extracted.completeness}% complete · ${extracted.confidence}% AI confidence.`
            );
          }
        }
      }
    } catch (err) {
      console.error("[FIR Pipeline] Error:", err);
      toast.error("Failed to reach the processing server. Is it running?");
      setData(d => ({ ...d, firFile: null, firFileName: "" }));
      setProcessing(false);
      setDone(false);
    }
  };

  // ── Manual entry ───────────────────────────────────────────────────────────
  const handleManualEntry = () => {
    setData(d => ({ ...d, firFile: null, firFileName: "", manualEntry: true }));
    onExtracted({
      firLanguage: "English", firType: "FIR",
      completeness: 0, confidence: 0,
      extractedEntities: { persons: [], locations: [], weapons: [], vehicles: [], dates: [] },
      missingFields: [],
    });
    toast.info("Skipped FIR upload. You can attach the file later from the case page.");
    onNext?.();
  };

  const extractionDone = done && !processing && data.extractedEntities;

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={Upload}
        title="Upload First Information Report (FIR)"
        subtitle="Upload a scanned or digital FIR in English or Urdu. The AI pipeline will OCR, translate if needed, validate, and auto-fill the registration form."
      />

      {/* ── Drop zone ─────────────────────────────────────────────────────── */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => !processing && fileRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all
          ${processing ? "cursor-not-allowed opacity-70" : "cursor-pointer"}
          ${dragging
            ? "border-deep-ocean bg-deep-ocean/5 scale-[1.01]"
            : data.firFile
              ? "border-emerald-400 bg-emerald-50"
              : "border-slate-300 bg-slate-50 hover:border-deep-ocean hover:bg-deep-ocean/5"}`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.bmp"
          className="hidden"
          onChange={e => handleFile(e.target.files[0])}
        />
        {data.firFile ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <FileText className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{data.firFileName}</p>
              <p className="text-xs text-slate-500 mt-0.5">Click to replace file</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center">
              <Upload className="h-7 w-7 text-slate-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">Drop FIR document here or click to browse</p>
              <p className="text-xs text-slate-500 mt-1">
                Supported: PDF, JPG, PNG · Urdu &amp; English · Max 20 MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Real-time pipeline progress ───────────────────────────────────── */}
      {processing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            <div>
              <p className="font-semibold text-blue-800">AI Pipeline Running…</p>
              <p className="text-xs text-blue-600 mt-0.5">
                OCR → Language detection → AI extraction → Validation → NLP
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {PIPELINE_STEPS.map(({ key, label }) => {
              const isDone = completedSteps.includes(key);
              const isCurrent = currentStepKey === key;
              return (
                <div
                  key={key}
                  className={`flex items-center gap-2 text-sm transition-all
                    ${isDone ? "text-emerald-700"
                      : isCurrent ? "text-blue-700 font-medium"
                        : "text-slate-400"}`}
                >
                  {isDone
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    : isCurrent
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600 shrink-0" />
                      : <div className="h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0" />}
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Post-extraction summary ───────────────────────────────────────── */}
      {extractionDone && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-800">FIR Successfully Processed</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                AI confidence: <strong>{data.confidence}%</strong> ·
                Language: <strong>{data.firLanguage}</strong> ·
                Type: <strong>{data.firType}</strong>
              </p>
            </div>
            <div className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full shrink-0">
              {data.completeness}% Complete
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Completeness Score</span>
              <span>{data.completeness}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${data.completeness >= 80 ? "bg-emerald-500"
                  : data.completeness >= 60 ? "bg-amber-400"
                    : "bg-red-400"}`}
                style={{ width: `${data.completeness}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Persons", key: "persons", color: "bg-blue-100 text-blue-700" },
              { label: "Locations", key: "locations", color: "bg-green-100 text-green-700" },
              { label: "Weapons", key: "weapons", color: "bg-red-100 text-red-700" },
              { label: "Vehicles", key: "vehicles", color: "bg-orange-100 text-orange-700" },
              { label: "Dates", key: "dates", color: "bg-purple-100 text-purple-700" },
            ].map(e => (
              <div key={e.label} className={`rounded-lg p-3 text-center ${e.color}`}>
                <p className="text-2xl font-bold">{(data.extractedEntities?.[e.key] || []).length}</p>
                <p className="text-xs font-semibold">{e.label}</p>
              </div>
            ))}
          </div>

          {data.missingFields?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-semibold text-amber-800">Missing Information Detected</p>
              </div>
              <p className="text-xs text-amber-700 mb-2">
                Could not extract — please fill manually in the next step:
              </p>
              <div className="flex flex-wrap gap-2">
                {data.missingFields.map(f => (
                  <span key={f} className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md font-medium border border-amber-200">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          <XAIPanel evidence={xaiData.evidence} steps={xaiData.steps} />

          <div className="bg-deep-ocean/5 border border-deep-ocean/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-deep-ocean">Ready to register with extracted data?</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Register now using AI-extracted information. Add suspects, victims, and evidence from the case detail page.
              </p>
            </div>
            <button
              onClick={onSkipAndSave}
              disabled={skipSaving}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold
                whitespace-nowrap transition-all cursor-pointer shrink-0
                ${skipSaving
                  ? "bg-deep-ocean/40 text-white cursor-not-allowed"
                  : "bg-deep-ocean text-white hover:bg-deep-ocean-900 active:scale-95"}`}
            >
              {skipSaving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Registering…</>
                : <><FastForward className="h-4 w-4" /> Skip &amp; Register Now</>}
            </button>
          </div>

          <button
            onClick={() => onNext?.()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-deep-ocean/30 text-deep-ocean font-semibold hover:bg-deep-ocean/5 transition-all"
          >
            Review &amp; Complete Form <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Bottom utility row ────────────────────────────────────────────── */}
      <div className="border-t border-slate-200 pt-4">
        <p className="text-xs text-slate-500 text-center">
          No physical FIR available?{" "}
          <button
            className="text-deep-ocean font-semibold hover:underline cursor-pointer"
            onClick={handleManualEntry}
          >
            Enter FIR details manually
          </button>
        </p>
      </div>
    </div>
  );
}