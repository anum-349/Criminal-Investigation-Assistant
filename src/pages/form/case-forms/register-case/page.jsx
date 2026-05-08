import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload, FileText, MapPin, User, Users, Gavel,
  Camera, Brain, CheckCircle2, ChevronRight, ChevronLeft,
  LayoutDashboard, FolderOpen, AlertTriangle, Loader2, Plus, Check, File,
} from "lucide-react";
import { CASE_STEPS, emptyFormData } from "@/pages/form/case-forms/caseFormConstants/page";

// ── Step components ───────────────────────────────────────────────────────────
import StepFIRUpload     from "@/pages/form/case-forms/fir-upload";
import StepCaseDetails   from "@/pages/form/case-forms/case-details";
import StepCrimeDetails  from "@/pages/form/case-forms/crime-details";
import { StepEvidence }  from "@/pages/form/case-forms/step-evidence";
import StepAIAnalysis    from "@/pages/form/case-forms/ai-analysis";
import { StepReview }    from "@/pages/form/case-forms/review";
import Header from "@/pages/form/case-forms/components/Header";
import StepSuspects from "@/pages/form/case-forms/step-suspects";
import StepVictims from "@/pages/form/case-forms/step-victim";
import StepWitnesses from "@/pages/form/case-forms/step-witness";
import StepLocation from "@/pages/form/case-forms/step-location";

// ── Icon map (step icons from constants are strings) ─────────────────────────
const ICON_MAP = { Upload, FileText, MapPin, User, Users, Gavel, Camera, Brain, CheckCircle2, File };

// ── Step Progress Bar ─────────────────────────────────────────────────────────
const StepProgressBar = ({ currentStep, completedSteps, onStepClick }) => (
  <div className="sticky top-14 z-30 bg-white border-b border-slate-200 shadow-sm">
    <div className="max-w-6xl mx-auto px-4 py-3">
      {/* Mobile */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-600">Step {currentStep} of {CASE_STEPS.length}</span>
          <span className="text-xs text-slate-500">{CASE_STEPS[currentStep - 1]?.label}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full bg-deep-ocean transition-all duration-500"
            style={{ width: `${((currentStep - 1) / (CASE_STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>
      {/* Desktop */}
      <div className="hidden sm:flex items-center">
        {CASE_STEPS.map((step, idx) => {
          const Icon = ICON_MAP[step.icon] || FileText;
          const isCompleted  = completedSteps.includes(step.id);
          const isCurrent    = currentStep === step.id;
          const isAccessible = step.id === 1 || isCompleted || isCurrent || completedSteps.includes(step.id - 1);
          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => isAccessible && onStepClick(step.id)}
                disabled={!isAccessible}
                className={`flex flex-col items-center gap-1 transition-all
                  ${isAccessible ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}
                title={step.label}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all
                  ${isCompleted
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : isCurrent
                    ? "bg-deep-ocean border-deep-ocean text-white shadow-lg shadow-deep-ocean/30"
                    : "bg-white border-slate-300 text-slate-400 group-hover:border-deep-ocean/50"}`}>
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RegisterCasePage() {
  const navigate = useNavigate();
  const topRef = useRef(null);

  const [currentStep,    setCurrentStep]    = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [errors,         setErrors]         = useState({});
  const [submitting,     setSubmitting]     = useState(false);
  const [submitted,      setSubmitted]      = useState(false);
  const [formData,       setFormData]       = useState(emptyFormData());

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: "smooth" });

  const handleExtracted = (fields) => setFormData(d => ({ ...d, ...fields }));

  const goNext = () => {
    const e = validateStep(currentStep, formData);
    if (Object.keys(e).length) { setErrors(e); scrollTop(); return; }
    setErrors({});
    setCompletedSteps(cs => cs.includes(currentStep) ? cs : [...cs, currentStep]);
    setCurrentStep(s => Math.min(s + 1, CASE_STEPS.length));
    scrollTop();
  };

  const goBack = () => { setCurrentStep(s => Math.max(s - 1, 1)); scrollTop(); };

  const handleSubmit = async () => {
    const e = validateStep(currentStep, formData);
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 2000));
    setSubmitting(false);
    setSubmitted(true);
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-soft-mist font-sans mt-14">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
          <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Case Registered Successfully</h1>
          <p className="text-slate-500">
            Case ID: <span className="font-bold text-deep-ocean">{formData.caseId}</span>
          </p>
          <p className="text-sm text-slate-400">
            FIR Number: <strong>{formData.firNumber}</strong> · AI analysis queued.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <button onClick={() => navigate("/investigator/case")}
              className="flex items-center gap-2 px-6 py-2.5 bg-deep-ocean text-white rounded-lg text-sm font-medium hover:bg-deep-ocean-900 cursor-pointer transition-colors">
              <FolderOpen className="h-4 w-4" /> View Case
            </button>
            <button onClick={() => navigate("/investigator/cases")}
              className="px-6 py-2.5 border border-slate-300 bg-white text-slate-600 rounded-lg text-sm hover:bg-slate-50 cursor-pointer transition-colors">
              All Cases
            </button>
            <button
              onClick={() => { setSubmitted(false); setCurrentStep(1); setCompletedSteps([]); setFormData(emptyFormData()); }}
              className="flex items-center gap-2 px-6 py-2.5 border border-slate-300 bg-white text-slate-600 rounded-lg text-sm hover:bg-slate-50 cursor-pointer transition-colors">
              <Plus className="h-4 w-4" /> Register Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft-mist font-sans mt-14" ref={topRef}>
      <Header />
      <StepProgressBar currentStep={currentStep} completedSteps={completedSteps} onStepClick={setCurrentStep} />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <button onClick={() => navigate("/investigator")} className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition-colors"><LayoutDashboard className="h-3.5 w-3.5" />Dashboard</button>
          <ChevronRight className="h-3 w-3" />
          <button onClick={() => navigate("/investigator/cases")} className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition-colors"><FolderOpen className="h-3.5 w-3.5" />All Cases</button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-800 font-medium">Register New Case</span>
        </nav>

        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Register New Case</h1>
            <p className="text-sm text-slate-500 mt-1">Step {currentStep} of {CASE_STEPS.length} — {CASE_STEPS[currentStep - 1]?.label}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full self-start sm:self-auto">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Draft auto-saved
          </div>
        </div>

        {/* Error banner */}
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
          {currentStep === 1 && <StepFIRUpload    data={formData} setData={setFormData} onExtracted={handleExtracted} />}
          {currentStep === 2 && <StepCaseDetails  data={formData} setData={setFormData} errors={errors} mode="register" />}
          {currentStep === 3 && <StepLocation     data={formData} setData={setFormData} errors={errors} />}
          {currentStep === 4 && <StepVictims      data={formData} setData={setFormData} mode="register" />}
          {currentStep === 5 && <StepSuspects    data={formData} setData={setFormData} mode="register" />}
          {currentStep === 6 && <StepCrimeDetails data={formData} setData={setFormData} errors={errors} />}
          {currentStep === 7 && <StepEvidence     data={formData} setData={setFormData} mode="register"/>}
          {currentStep === 8 && <StepWitnesses     data={formData} setData={setFormData} mode="register"/>}
          {currentStep === 9 && <StepAIAnalysis   data={formData} />}
          {currentStep === 10 && <StepReview       data={formData} mode="register" />}
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-10">
          <button onClick={goBack} disabled={currentStep === 1}
            className="flex items-center gap-2 px-5 py-2.5 border border-slate-300 bg-white rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors w-full sm:w-auto justify-center cursor-pointer">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button onClick={() => navigate("/investigator/cases")}
              className="flex items-center gap-2 px-5 py-2.5 border border-slate-300 bg-white rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors flex-1 sm:flex-none justify-center cursor-pointer">
              Save Draft
            </button>
            {currentStep < CASE_STEPS.length ? (
              <button onClick={goNext}
                className="flex items-center gap-2 px-6 py-2.5 bg-deep-ocean text-white rounded-lg text-sm font-semibold hover:bg-deep-ocean-900 transition-colors flex-1 sm:flex-none justify-center cursor-pointer">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors flex-1 sm:flex-none justify-center cursor-pointer
                  ${submitting ? "bg-emerald-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"} text-white`}>
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