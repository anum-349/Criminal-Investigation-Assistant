/**
 * StepFIRUpload.jsx  —  Step 1  (API-integrated version)
 *
 * Real pipeline integration:
 *   POST /api/process-fir  (multipart, field: "file")
 *   ← { success, error, payload, steps, duration_ms }
 *
 * Props unchanged from the original stub:
 *   data, setData, onExtracted, onNext, onSkipAndSave, skipSaving
 */

import { useRef, useState } from "react";
import {
  Upload, FileText, CheckCircle2, AlertTriangle,
  Loader2, ArrowRight, FastForward, Info, ChevronDown, ChevronUp,
} from "lucide-react";
import { SectionHeading } from "@/pages/form/case-forms/CaseFormFields/page";
import { useToast } from "@/context/ToastContext";

// ─── API config ────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_FIR_API_URL || "http://localhost:5000";

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
          {/* Pipeline steps */}
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

          {/* Classifier evidence */}
          <div>
            <p className="font-semibold text-slate-600 mb-2">🤖 Classifier Evidence</p>
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

          {/* Entity extraction patterns */}
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

// ─── Main component ────────────────────────────────────────────────────────
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
  const [processingStep, setProcessingStep] = useState(0);
  const [done, setDone] = useState(false);
  const [xaiData, setXaiData] = useState({ evidence: [], steps: {} });
  const toast = useToast();

  const PROCESSING_STEPS = [
    "Running OCR / extracting text…",
    "Detecting language (Urdu / English)…",
    "Translating to English if needed…",
    "Validating FIR document…",
    "Extracting entities (NLP rules)…",
    "Building registration payload…",
  ];

  // ── File handler ─────────────────────────────────────────────────────────
  const handleFile = (file) => {
    if (!file) return;
    const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/bmp"];
    if (!ALLOWED.includes(file.type)) {
      toast.warning("Please upload a PDF or image file (JPG / PNG / BMP).");
      return;
    }
    setDone(false);
    setXaiData({ evidence: [], steps: {} });
    setData(d => ({ ...d, firFile: file, firFileName: file.name }));
    processWithAPI(file);
  };

  // ── Real API call ─────────────────────────────────────────────────────────
  const processWithAPI = async (file) => {
    setProcessing(true);
    setProcessingStep(0);

    // Animate steps while waiting
    const stepTimer = setInterval(() => {
      setProcessingStep(prev => Math.min(prev + 1, PROCESSING_STEPS.length - 1));
    }, 900);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/api/process-fir`, {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      clearInterval(stepTimer);

      if (!result.success) {
        // Pipeline rejected → show toast error
        toast.error(result.error || "Document is not a valid FIR.");
        setData(d => ({ ...d, firFile: null, firFileName: "" }));
        setProcessing(false);
        setDone(false);
        return;
      }

      // Map API payload → formData fields
      const p = result.payload;
      onExtracted({
        firNumber:          p.firNumber,
        caseTitle:          p.caseTitle,
        caseNumber:         p.caseNumber,
        dateOfIncident:     p.dateOfIncident,
        timeOfIncident:     p.timeOfIncident,
        policeStation:      p.policeStation,
        district:           p.district,
        province:           p.province,
        incidentAddress:    p.incidentAddress,
        complainantName:    p.complainantName,
        complainantFather:  p.complainantFather,
        complainantCNIC:    p.complainantCNIC,
        complainantAge:     p.complainantAge,
        complainantPhone:   p.complainantPhone,
        accusedPersons:     p.accusedPersons,
        victims:            p.victims,
        witnesses:          p.witnesses,
        offenceType:        p.offenceType,
        allOffences:        p.allOffences,
        legalSections:      p.legalSections,
        applicableAct:      p.applicableAct,
        weaponsInvolved:    p.weaponsInvolved,
        vehiclesInvolved:   p.vehiclesInvolved,
        vehiclePlates:      p.vehiclePlates,
        completeness:       p.completenessScore,
        confidence:         p.confidence,
        extractedEntities:  p.extractedEntities,
        missingFields:      p.missingFields,
        firLanguage:        p.firLanguage || "English",
        firType:            p.firType || "FIR",
        manualEntry:        false,
      });

      setXaiData({
        evidence: result.steps?.validation?.evidence || [],
        steps: result.steps || {},
      });

      setProcessing(false);
      setDone(true);

      toast.success(
        `FIR processed in ${result.duration_ms}ms — ` +
        `${p.completenessScore}% complete · ${p.confidence}% AI confidence.`
      );

    } catch (err) {
      clearInterval(stepTimer);
      console.error(err);
      toast.error("Failed to reach the processing server. Is it running on port 5000?");
      setData(d => ({ ...d, firFile: null, firFileName: "" }));
      setProcessing(false);
      setDone(false);
    }
  };

  // ── Manual entry ──────────────────────────────────────────────────────────
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

      {/* ── Drop zone ────────────────────────────────────────────────────── */}
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

      {/* ── Processing indicator ──────────────────────────────────────────── */}
      {processing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            <div>
              <p className="font-semibold text-blue-800">AI Pipeline Running…</p>
              <p className="text-xs text-blue-600 mt-0.5">
                OCR → Language detection → Translation → Validation → NLP extraction
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {PROCESSING_STEPS.map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-sm transition-all ${
                  i < processingStep
                    ? "text-emerald-700"
                    : i === processingStep
                    ? "text-blue-700 font-medium"
                    : "text-slate-400"
                }`}
              >
                {i < processingStep ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : i === processingStep ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                ) : (
                  <div className="h-3.5 w-3.5 rounded-full border border-slate-300" />
                )}
                {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Post-extraction summary ────────────────────────────────────────── */}
      {extractionDone && (
        <div className="space-y-4">
          {/* Success banner */}
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

          {/* Completeness bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Completeness Score</span>
              <span>{data.completeness}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  data.completeness >= 80 ? "bg-emerald-500"
                    : data.completeness >= 60 ? "bg-amber-400"
                    : "bg-red-400"}`}
                style={{ width: `${data.completeness}%` }}
              />
            </div>
          </div>

          {/* Entity tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Persons",   key: "persons",   color: "bg-blue-100 text-blue-700" },
              { label: "Locations", key: "locations", color: "bg-green-100 text-green-700" },
              { label: "Weapons",   key: "weapons",   color: "bg-red-100 text-red-700" },
              { label: "Vehicles",  key: "vehicles",  color: "bg-orange-100 text-orange-700" },
              { label: "Dates",     key: "dates",     color: "bg-purple-100 text-purple-700" },
            ].map(e => (
              <div key={e.label} className={`rounded-lg p-3 text-center ${e.color}`}>
                <p className="text-2xl font-bold">{(data.extractedEntities?.[e.key] || []).length}</p>
                <p className="text-xs font-semibold">{e.label}</p>
              </div>
            ))}
          </div>

          {/* Missing fields warning */}
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

          {/* XAI panel */}
          <XAIPanel evidence={xaiData.evidence} steps={xaiData.steps} />

          {/* Skip & Register now */}
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

          {/* Continue to manual review */}
          <button
            onClick={() => onNext?.()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-deep-ocean/30 text-deep-ocean font-semibold hover:bg-deep-ocean/5 transition-all"
          >
            Review &amp; Complete Form <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Bottom utility row ─────────────────────────────────────────────── */}
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