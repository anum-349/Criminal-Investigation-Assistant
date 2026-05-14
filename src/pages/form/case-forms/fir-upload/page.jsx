/**
 * StepFIRUpload.jsx  —  Step 1
 * Drag-and-drop FIR upload with AI extraction simulation.
 *
 * Props:
 *   data          — formData slice
 *   setData       — full formData setter
 *   onExtracted   — callback(extractedFields) to merge into parent formData
 *   onNext        — advances wizard to Step 2 (manual entry flow)
 *   onSkipAndSave — async fn: saves draft then submits case from extracted data
 *   skipSaving    — bool: shows spinner on the skip link while in-flight
 */
import { useRef, useState } from "react";
import {
  Upload, FileText, CheckCircle2, AlertTriangle,
  Loader2, ArrowRight, FastForward,
} from "lucide-react";
import { SectionHeading } from "@/pages/form/case-forms/CaseFormFields/page";

export default function StepFIRUpload({
  data,
  setData,
  onExtracted,
  onNext,
  onSkipAndSave,
  skipSaving = false,
}) {
  const fileRef  = useRef(null);
  const [dragging,    setDragging]    = useState(false);
  const [processing,  setProcessing]  = useState(false);
  const [done,        setDone]        = useState(false);

  // ── File handler ────────────────────────────────────────────────────────
  const handleFile = (file) => {
    if (!file) return;
    const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!ALLOWED.includes(file.type)) {
      alert("Please upload a PDF or image file (JPG/PNG).");
      return;
    }
    setDone(false);
    setData(d => ({ ...d, firFile: file, firFileName: file.name, firLanguage: "English", firType: "FIR" }));
    simulateExtraction();
  };

  // ── Simulate AI extraction (replace with real API call) ─────────────────
  const simulateExtraction = () => {
    setProcessing(true);
    setDone(false);
    setTimeout(() => {
      onExtracted({
        firNumber:      "FIR-2026-" + Math.floor(Math.random() * 9000 + 1000),
        caseTitle:      "Armed Robbery at Main Street Market",
        incidentDate:   "2026-04-10",
        reportingDate:  "2026-04-10",
        caseType:       "Robbery / Armed Robbery",
        description:    "On the night of 10 April 2026 at approximately 22:30 hours, three unidentified armed individuals entered the Main Street Market, Gulshan-e-Iqbal, Karachi. They brandished firearms and demanded cash from the cashier. The suspects fled the scene in a white Toyota Corolla.",
        province:       "Sindh",
        city:           "Karachi",
        area:           "Gulshan-e-Iqbal",
        policeStation:  "Gulshan Police Station",
        address:        "Main Street Market, Block 5, Gulshan-e-Iqbal",
        weaponUsed:     "Firearm (Pistol)",
        vehicleUsed:    "Toyota Corolla (White)",
        numSuspects:    "3",
        crimeDescription: "Armed robbery; suspects were masked; victim suffered minor injuries.",
        extractedEntities: {
          persons:   ["Muhammad Saleem", "Unknown Male 1", "Unknown Male 2", "Unknown Male 3"],
          locations: ["Main Street Market", "Gulshan-e-Iqbal", "Karachi", "Block 5"],
          weapons:   ["Pistol"],
          vehicles:  ["Toyota Corolla (White)"],
          dates:     ["10 April 2026", "22:30 hours"],
        },
        completeness:  78,
        missingFields: ["Suspect CNIC", "Victim CNIC", "Witness information", "Postmortem / Medical Report"],
        confidence:    84,
      });
      setProcessing(false);
      setDone(true);
    }, 3000);
  };

  // ── "Enter manually" — go to Step 2 with a blank slate ─────────────────
  const handleManualEntry = () => {
    setData(d => ({
      ...d,
      firFile:    null,
      firFileName: "",
      manualEntry: true,
    }));
    onExtracted({
      firLanguage: "English",
      firType: "FIR",
      completeness: 0,
      confidence: 0,
      extractedEntities: { persons: [], locations: [], weapons: [], vehicles: [], dates: [] },
      missingFields: [],
    });
    // Navigate to Step 2 so the user fills details themselves
    onNext?.();
  };

  const extractionDone = done && !processing && data.extractedEntities;

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={Upload}
        title="Upload First Information Report (FIR)"
        subtitle="Upload a scanned FIR document. Our AI will automatically extract all relevant information and pre-fill the form."
      />

      {/* ── Drop zone ────────────────────────────────────────────────────── */}
      <div
        onDragOver={e  => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e      => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => fileRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
          ${dragging
            ? "border-deep-ocean bg-deep-ocean/5 scale-[1.01]"
            : data.firFile
            ? "border-emerald-400 bg-emerald-50"
            : "border-slate-300 bg-slate-50 hover:border-deep-ocean hover:bg-deep-ocean/5"}`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
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
              <p className="text-xs text-slate-500 mt-1">Supported formats: PDF, JPG, PNG · Max 20 MB</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Processing indicator ─────────────────────────────────────────── */}
      {processing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            <div>
              <p className="font-semibold text-blue-800">AI Processing in Progress…</p>
              <p className="text-xs text-blue-600 mt-0.5">Extracting entities, running OCR, checking completeness</p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              "Running OCR on document…",
              "Extracting named entities (NLP)…",
              "Detecting language (Urdu / English)…",
              "Checking completeness…",
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-blue-700">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Post-extraction summary ──────────────────────────────────────── */}
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
                className={`h-2 rounded-full transition-all
                  ${data.completeness >= 80 ? "bg-emerald-500"
                    : data.completeness >= 60 ? "bg-amber-400"
                    : "bg-red-400"}`}
                style={{ width: `${data.completeness}%` }}
              />
            </div>
          </div>

          {/* Entity tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Persons",   key: "persons",   color: "bg-blue-100 text-blue-700"    },
              { label: "Locations", key: "locations", color: "bg-green-100 text-green-700"  },
              { label: "Weapons",   key: "weapons",   color: "bg-red-100 text-red-700"      },
              { label: "Vehicles",  key: "vehicles",  color: "bg-orange-100 text-orange-700"},
              { label: "Dates",     key: "dates",     color: "bg-purple-100 text-purple-700"},
            ].map(e => (
              <div key={e.label} className={`rounded-lg p-3 text-center ${e.color}`}>
                <p className="text-2xl font-bold">{(data.extractedEntities[e.key] || []).length}</p>
                <p className="text-xs font-semibold">{e.label}</p>
              </div>
            ))}
          </div>

          {/* Missing fields */}
          {data.missingFields?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-semibold text-amber-800">Missing Information Detected</p>
              </div>
              <p className="text-xs text-amber-700 mb-2">
                The following fields could not be extracted and require manual input:
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

          {/* ── Skip & Register now ─────────────────────────────────────────
              Shown only after successful extraction. Registers the case
              immediately using the AI-extracted data, then navigates to
              the case detail page. Draft is saved first so work isn't lost. */}
          <div className="bg-deep-ocean/5 border border-deep-ocean/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-deep-ocean">Ready to register with extracted data?</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Register the case now using the AI-extracted information.
                You can add suspects, victims, and evidence from the case detail page later.
              </p>
            </div>
            <button
              onClick={onSkipAndSave}
              disabled={skipSaving}
              className={`
                inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold
                whitespace-nowrap transition-all cursor-pointer shrink-0
                ${skipSaving
                  ? "bg-deep-ocean/40 text-white cursor-not-allowed"
                  : "bg-deep-ocean text-white hover:bg-deep-ocean-900 active:scale-95"}
              `}
            >
              {skipSaving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Registering…</>
                : <><FastForward className="h-4 w-4" /> Skip & Register Now</>
              }
            </button>
          </div>

          {/* Continue filling in details link */}
          <p className="text-xs text-slate-500 text-center">
            Want to review and complete the details first?{" "}
            <button
              className="text-deep-ocean font-semibold hover:underline cursor-pointer inline-flex items-center gap-1"
              onClick={() => onNext?.()}
            >
              Continue filling in details <ArrowRight className="h-3 w-3" />
            </button>
          </p>
        </div>
      )}

      {/* ── Bottom utility row ───────────────────────────────────────────────
          Always visible. Two actions:
          • Enter FIR details manually → goes to Step 2, saves draft
          • (if file uploaded but not yet processed, nothing extra shown)   */}
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