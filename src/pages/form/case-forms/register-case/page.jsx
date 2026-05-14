import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Upload, FileText, MapPin, User, Users, Gavel,
  Camera, Brain, CheckCircle2, ChevronRight, ChevronLeft,
  LayoutDashboard, FolderOpen, AlertTriangle, Loader2, Plus, Check, File,
  Save,
} from "lucide-react";
import { CASE_STEPS, emptyFormData } from "@/pages/form/case-forms/caseFormConstants/page";

// ── Steps ─────────────────────────────────────────────────────────────────────
import StepFIRUpload      from "../fir-upload/page";
import StepCaseDetails    from "../case-details/page";
import StepLocation       from "../step-location/page";
import StepVictims        from "../step-victim/page";
import StepSuspects       from "../step-suspects/page";
import StepCrimeDetails   from "../crime-details/page";
import StepEvidence       from "../step-evidence/page";
import StepWitnesses      from "../step-witness/page";
import StepAIAnalysis     from "../ai-analysis/page";
import StepReview         from "../review/page";
import Header             from "@/components/Header";

// ── Services ──────────────────────────────────────────────────────────────────
import { registerCaseFull, formatApiError } from "@/services/caseApi";
import { saveDraft, getDraft }              from "@/services/draftApi";
import axios from "axios";

// ── Icon map ──────────────────────────────────────────────────────────────────
const ICON_MAP = { Upload, FileText, MapPin, User, Users, Gavel, Camera, Brain, CheckCircle2, File };

const AUTH_HEADER = () => {
  const t = localStorage.getItem("token") || sessionStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const AUTOSAVE_INTERVAL_MS = 30_000;

// ── Step Progress Bar ─────────────────────────────────────────────────────────
const StepProgressBar = ({ currentStep, completedSteps, onStepClick }) => (
  <div className="sticky top-14 z-30 bg-white border-b border-slate-200 shadow-sm">
    <div className="max-w-6xl mx-auto px-4 py-3">
      {/* Mobile: linear progress bar */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-600">Step {currentStep} of {CASE_STEPS.length}</span>
          <span className="text-xs text-slate-500">{CASE_STEPS[currentStep - 1]?.label}</span>
        </div>
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-deep-ocean transition-all duration-300"
            style={{ width: `${(currentStep / CASE_STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop: icon steps */}
      <div className="hidden sm:flex items-center justify-between">
        {CASE_STEPS.map((step, idx) => {
          const Icon        = ICON_MAP[step.icon] || FileText;
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent   = currentStep === step.id;
          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => (isCompleted || isCurrent) && onStepClick(step.id)}
                disabled={!isCompleted && !isCurrent}
                className={`flex flex-col items-center gap-1 transition-all ${
                  (isCompleted || isCurrent) ? "cursor-pointer" : "cursor-not-allowed opacity-40"
                }`}
                title={step.label}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all
                  ${isCompleted
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : isCurrent
                    ? "bg-deep-ocean border-deep-ocean text-white shadow-lg shadow-deep-ocean/30"
                    : "bg-white border-slate-300 text-slate-400"}`}>
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <span className={`text-[9px] font-semibold uppercase tracking-wide transition-colors
                  ${isCurrent ? "text-deep-ocean" : isCompleted ? "text-emerald-600" : "text-slate-400"}`}>
                  {step.short}
                </span>
              </button>
              {idx < CASE_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 transition-all
                  ${completedSteps.includes(step.id) ? "bg-emerald-500" : "bg-slate-200"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// ── Validation ────────────────────────────────────────────────────────────────
const validateStep = (step, formData) => {
  const e = {};
  if (step === 2) {
    if (!formData.firNumber?.trim())    e.firNumber    = "FIR number is required";
    if (!formData.caseTitle?.trim())    e.caseTitle    = "Case title is required";
    if (!formData.incidentDate)         e.incidentDate = "Date of incident is required";
    if (!formData.reportingDate)        e.reportingDate = "Reporting date is required";
    if (!formData.caseType)             e.caseType     = "Case type is required";
    if (!formData.priority)             e.priority     = "Priority is required";
    if (!formData.description?.trim())  e.description  = "Description is required";
  }
  if (step === 3) {
    if (!formData.province)             e.province = "Province is required";
    if (!formData.city?.trim())         e.city     = "City is required";
    if (!formData.address?.trim())      e.address  = "Crime scene address is required";
  }
  if (step === 6) {
    if (!formData.crimeDescription?.trim()) e.crimeDescription = "Crime description is required";
  }
  return e;
};

const validateAll = (formData) => ({
  ...validateStep(2, formData),
  ...validateStep(3, formData),
  ...validateStep(6, formData),
});

// ─────────────────────────────────────────────────────────────────────────────
export default function RegisterCasePage() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const topRef         = useRef(null);

  const [currentStep,    setCurrentStep]    = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [errors,         setErrors]         = useState({});
  const [submitting,     setSubmitting]     = useState(false);
  const [submitted,      setSubmitted]      = useState(false);
  const [formData,       setFormData]       = useState(emptyFormData());

  const [submitError,   setSubmitError]   = useState(null);
  const [submitResult,  setSubmitResult]  = useState(null);

  // Draft state
  const [draftSaving,     setDraftSaving]     = useState(false);
  const [draftError,      setDraftError]      = useState(null);
  const [draftSavedAt,    setDraftSavedAt]    = useState(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [loadingDraft,    setLoadingDraft]    = useState(false);

  // Skip & Register state — separate spinner so the normal Submit button
  // stays idle when the user uses the skip shortcut.
  const [skipSaving, setSkipSaving] = useState(false);

  const lastSavedRef = useRef("");

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: "smooth" });

  const handleExtracted = (fields) => setFormData(d => ({ ...d, ...fields }));

  const goNext = useCallback(() => {
    const e = validateStep(currentStep, formData);
    if (Object.keys(e).length) { setErrors(e); scrollTop(); return; }
    setErrors({});
    setCompletedSteps(cs => cs.includes(currentStep) ? cs : [...cs, currentStep]);
    setCurrentStep(s => Math.min(s + 1, CASE_STEPS.length));
    scrollTop();
  }, [currentStep, formData]);

  const goBack = useCallback(() => {
    setCurrentStep(s => Math.max(s - 1, 1));
    scrollTop();
  }, []);

  // ── Load existing draft ───────────────────────────────────────────────────
  useEffect(() => {
    const did = searchParams.get("draftId");
    if (!did) return;

    let cancelled = false;
    setLoadingDraft(true);
    getDraft(did)
      .then(res => {
        if (cancelled) return;
        setFormData({ ...emptyFormData(), ...(res?.formData || {}), draftId: did });
        const completed = [];
        if (res?.formData?.firFileName || res?.formData?.manualEntry) completed.push(1);
        if (!Object.keys(validateStep(2, res?.formData || {})).length) completed.push(2);
        if (!Object.keys(validateStep(3, res?.formData || {})).length) completed.push(3);
        if (!Object.keys(validateStep(6, res?.formData || {})).length) completed.push(6);
        setCompletedSteps(completed);
        const firstIncomplete = [1,2,3,4,5,6,7,8,9,10].find(s => !completed.includes(s)) || 1;
        setCurrentStep(firstIncomplete);
      })
      .catch(err => {
        console.error("Failed to load draft:", err);
        setSubmitError("Couldn't load that draft. It may have been deleted.");
      })
      .finally(() => { if (!cancelled) setLoadingDraft(false); });

    return () => { cancelled = true; };
  }, [searchParams]);

  // ── Load auto-save preference ─────────────────────────────────────────────
  useEffect(() => {
    const url = import.meta.env.VITE_API_URL;
    axios.get(`${url}/api/auth/preferences`, { headers: AUTH_HEADER() })
      .then(res => setAutoSaveEnabled(!!res?.data?.preferences?.auto_save_drafts))
      .catch(() => {/* silent */});
  }, []);

  // ── Save Draft ────────────────────────────────────────────────────────────
  const handleSaveDraft = useCallback(async ({ silent = false } = {}) => {
    if (draftSaving) return false;
    setDraftError(null);
    if (!silent) setDraftSaving(true);

    try {
      const snapshot = JSON.stringify(formData);
      if (silent && snapshot === lastSavedRef.current) return true;

      const res = await saveDraft(formData);
      const draftId = res?.draftId;
      if (draftId && draftId !== formData.draftId) {
        setFormData(d => ({ ...d, draftId }));
      }
      lastSavedRef.current = snapshot;
      setDraftSavedAt(new Date());
      return true;
    } catch (err) {
      console.error("Save draft failed:", err);
      setDraftError(formatApiError(err, "Could not save draft."));
      return false;
    } finally {
      if (!silent) setDraftSaving(false);
    }
  }, [draftSaving, formData]);

  const handleSaveDraftAndExit = useCallback(async () => {
    const ok = await handleSaveDraft({ silent: false });
    if (ok) navigate("/investigator/drafts");
  }, [handleSaveDraft, navigate]);

  // ── Manual Entry shortcut ─────────────────────────────────────────────────
  // Called when user clicks "Enter FIR details manually" in StepFIRUpload.
  // We mark Step 1 complete (they're choosing to skip the upload), save a
  // draft silently so their intent is persisted, then advance to Step 2.
  const handleGoToManualEntry = useCallback(async () => {
    // Mark step 1 done so the progress bar shows it complete
    setCompletedSteps(cs => cs.includes(1) ? cs : [...cs, 1]);
    setCurrentStep(2);
    scrollTop();

    // Best-effort silent draft save — don't block the navigation
    try {
      await handleSaveDraft({ silent: true });
    } catch {
      // silent — the user is now on Step 2, no need to surface this
    }
  }, [handleSaveDraft]);

  // ── Skip & Register Now ───────────────────────────────────────────────────
  // Registers the case immediately from AI-extracted data, skipping all other
  // steps. A draft is saved first so the full formData (including the uploaded
  // FIR file reference) is preserved in case the API call fails.
  const handleSkipAndSave = useCallback(async () => {
    if (skipSaving || submitting) return;
    setSkipSaving(true);
    setSubmitError(null);

    try {
      // 1. Persist a draft first — if the submit fails, the user can come back
      await handleSaveDraft({ silent: true });

      // 2. Submit — the backend only requires the fields that came from the
      //    FIR extraction, so we pass the full formData and let the API
      //    ignore optional missing fields.
      const result = await registerCaseFull(formData);

      setFormData(d => ({
        ...d,
        caseId:    result.caseId,
        firNumber: result.firNumber || d.firNumber,
      }));
      setSubmitResult(result);
      setSubmitted(true);
    } catch (err) {
      console.error("Skip & Register failed:", err);
      setSubmitError(formatApiError(err, "Could not register the case. Please retry."));
      scrollTop();
    } finally {
      setSkipSaving(false);
    }
  }, [skipSaving, submitting, formData, handleSaveDraft]);

  // ── Autosave loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoSaveEnabled) return;
    if (submitted) return;

    const hasContent = formData.firNumber || formData.caseTitle ||
                       formData.description || formData.firFileName;
    if (!hasContent) return;

    const id = setInterval(() => {
      handleSaveDraft({ silent: true });
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(id);
  }, [autoSaveEnabled, submitted, formData, handleSaveDraft]);

  // ── Full Submit (Step 10) ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (submitting) return;

    const allErrors = validateAll(formData);
    if (Object.keys(allErrors).length) {
      setErrors(allErrors);
      const firstFailingStep =
        Object.keys(allErrors).some(k => ["firNumber","caseTitle","incidentDate","reportingDate","caseType","priority","description"].includes(k)) ? 2
        : Object.keys(allErrors).some(k => ["province","city","address"].includes(k)) ? 3
        : 6;
      setCurrentStep(firstFailingStep);
      scrollTop();
      return;
    }

    setErrors({});
    setSubmitError(null);
    setSubmitting(true);

    try {
      const result = await registerCaseFull(formData);
      setFormData(d => ({
        ...d,
        caseId:    result.caseId,
        firNumber: result.firNumber || d.firNumber,
      }));
      setSubmitResult(result);
      setSubmitted(true);
    } catch (err) {
      console.error("Case registration failed:", err);
      setSubmitError(formatApiError(err, "Could not register the case. Please retry."));
      scrollTop();
    } finally {
      setSubmitting(false);
    }
  };

  // Draft label (re-computed on every render, no interval needed)
  const draftSavedLabel = (() => {
    if (!draftSavedAt) return null;
    const secs = Math.max(1, Math.round((Date.now() - draftSavedAt.getTime()) / 1000));
    if (secs < 60)   return `Draft saved ${secs}s ago`;
    if (secs < 3600) return `Draft saved ${Math.round(secs / 60)}m ago`;
    return `Draft saved ${Math.round(secs / 3600)}h ago`;
  })();

  // ── Loading draft splash ──────────────────────────────────────────────────
  if (loadingDraft) {
    return (
      <div className="min-h-screen bg-soft-mist font-sans mt-14">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-3">
          <Loader2 className="h-10 w-10 text-deep-ocean animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Loading your draft…</p>
        </div>
      </div>
    );
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (submitted) {
    const partialFailures = submitResult?.partialFailures || [];
    return (
      <div className="min-h-screen bg-soft-mist font-sans mt-14">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
          <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Case Registered Successfully</h1>
          <p className="text-slate-500">
            Case ID: <span className="font-bold text-deep-ocean">{submitResult?.caseId || formData.caseId}</span>
          </p>
          <p className="text-sm text-slate-400">
            FIR Number: <strong>{submitResult?.firNumber || formData.firNumber}</strong> · AI analysis queued.
          </p>

          {partialFailures.length > 0 && (
            <div className="mt-6 text-left bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    Case was saved, but the following items need attention:
                  </p>
                  <ul className="mt-2 text-xs text-amber-800 list-disc ml-4 space-y-1">
                    {partialFailures.map((f, i) => (
                      <li key={i}>
                        <span className="capitalize font-medium">{f.phase}</span>{": "}{f.error}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-amber-700">
                    You can fix these from the case detail page.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <button
              onClick={() => navigate(`/investigator/case/${submitResult?.caseId || formData.caseId}`)}
              className="flex items-center gap-2 px-6 py-2.5 bg-deep-ocean text-white rounded-lg text-sm font-medium hover:bg-deep-ocean-900 cursor-pointer transition-colors">
              <FolderOpen className="h-4 w-4" /> View Case
            </button>
            <button
              onClick={() => navigate("/investigator/cases")}
              className="px-6 py-2.5 border border-slate-300 bg-white text-slate-600 rounded-lg text-sm hover:bg-slate-50 cursor-pointer transition-colors">
              All Cases
            </button>
            <button
              onClick={() => {
                setSubmitted(false);
                setSubmitResult(null);
                setSubmitError(null);
                setCurrentStep(1);
                setCompletedSteps([]);
                setFormData(emptyFormData());
                lastSavedRef.current = "";
              }}
              className="flex items-center gap-2 px-6 py-2.5 border border-slate-300 bg-white text-slate-600 rounded-lg text-sm hover:bg-slate-50 cursor-pointer transition-colors">
              <Plus className="h-4 w-4" /> Register Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main wizard ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-soft-mist font-sans mt-14" ref={topRef}>
      <Header />
      <StepProgressBar
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={setCurrentStep}
      />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <button
            onClick={() => navigate("/investigator")}
            className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition-colors"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />Dashboard
          </button>
          <ChevronRight className="h-3 w-3" />
          <button
            onClick={() => navigate("/investigator/cases")}
            className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition-colors"
          >
            <FolderOpen className="h-3.5 w-3.5" />All Cases
          </button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-800 font-medium">Register New Case</span>
        </nav>

        {/* Title + draft badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Register New Case</h1>
            <p className="text-sm text-slate-500 mt-1">
              Step {currentStep} of {CASE_STEPS.length} — {CASE_STEPS[currentStep - 1]?.label}
            </p>
          </div>
          <div className="self-start sm:self-auto">
            {draftSaving ? (
              <span className="flex items-center gap-2 text-xs text-deep-ocean bg-deep-ocean/10 border border-deep-ocean/20 px-3 py-1.5 rounded-full">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving draft…
              </span>
            ) : draftSavedLabel ? (
              <span className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {draftSavedLabel}
              </span>
            ) : autoSaveEnabled ? (
              <span className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Autosave on
              </span>
            ) : null}
          </div>
        </div>

        {/* Submit-error banner */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">Could not register case</p>
              <p className="text-xs text-red-700 mt-1">{submitError}</p>
            </div>
            <button
              onClick={() => setSubmitError(null)}
              className="text-xs text-red-700 hover:text-red-900 underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Draft-save error banner */}
        {draftError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 flex-1">{draftError}</p>
            <button
              onClick={() => setDraftError(null)}
              className="text-xs text-amber-800 hover:text-amber-900 underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Validation banner */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Please fix the following errors:</p>
              <ul className="mt-1 text-xs text-red-700 list-disc ml-4 space-y-0.5">
                {Object.values(errors).map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          </div>
        )}

        {/* Step card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8">
          {currentStep === 1 && (
            <StepFIRUpload
              data={formData}
              setData={setFormData}
              onExtracted={handleExtracted}
              onNext={handleGoToManualEntry}   // "Enter manually" → Step 2 + draft save
              onSkipAndSave={handleSkipAndSave} // "Skip & Register Now" → submit immediately
              skipSaving={skipSaving}
            />
          )}
          {currentStep === 2  && <StepCaseDetails  data={formData} setData={setFormData} errors={errors} mode="register" />}
          {currentStep === 3  && <StepLocation     data={formData} setData={setFormData} errors={errors} />}
          {currentStep === 4  && <StepVictims      data={formData} setData={setFormData} mode="register" />}
          {currentStep === 5  && <StepSuspects     data={formData} setData={setFormData} mode="register" />}
          {currentStep === 6  && <StepCrimeDetails data={formData} setData={setFormData} errors={errors} />}
          {currentStep === 7  && <StepEvidence     data={formData} setData={setFormData} mode="register" />}
          {currentStep === 8  && <StepWitnesses    data={formData} setData={setFormData} mode="register" />}
          {currentStep === 9  && <StepAIAnalysis   data={formData} setData={setFormData} />}
          {currentStep === 10 && <StepReview       data={formData} mode="register" />}
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-10">
          <button
            onClick={goBack}
            disabled={currentStep === 1 || submitting || skipSaving}
            className="flex items-center gap-2 px-5 py-2.5 border border-slate-300 bg-white rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors w-full sm:w-auto justify-center cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleSaveDraftAndExit}
              disabled={submitting || draftSaving || skipSaving}
              className="flex items-center gap-2 px-5 py-2.5 border border-slate-300 bg-white rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-1 sm:flex-none justify-center cursor-pointer"
            >
              {draftSaving
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Save className="h-4 w-4" />}
              Save Draft
            </button>

            {currentStep < CASE_STEPS.length ? (
              <button
                onClick={goNext}
                disabled={submitting || skipSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-deep-ocean text-white rounded-lg text-sm font-semibold hover:bg-deep-ocean-900 transition-colors flex-1 sm:flex-none justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || skipSaving}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors flex-1 sm:flex-none justify-center cursor-pointer
                  ${submitting ? "bg-emerald-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"} text-white`}
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</>
                  : <><CheckCircle2 className="h-4 w-4" />Submit Case</>}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}