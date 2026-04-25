import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FileText, MapPin, User, Users, Gavel,
  Camera, Brain, CheckCircle2, ChevronRight, ChevronLeft,
  LayoutDashboard, FolderOpen, AlertTriangle, Loader2, Check, Save,
} from "lucide-react";
import Header from "../../../../components/Header";
import { emptyFormData } from "../CaseFormConstants/page";

// ── Step components ───────────────────────────────────────────────────────────
import { StepUpdateNotes } from "../notes/page";
import StepFIRUpload     from "../fir-upload/page";
import StepCaseDetails   from "../case-details/page";
import StepLocation      from "../add-location/page";
import { StepVictims }   from "../add-victim/page";
import StepCrimeDetails  from "../crime-details/page";
import { StepEvidence }  from "../step-evidence/page";
import StepAIAnalysis    from "../ai-analysis/page";
import { StepReview }    from "../review/page";
import StepSuspects from "../step-suspects/page";

// ── Update-mode steps (no FIR upload, adds Update Notes) ─────────────────────
const UPDATE_STEPS = [
  { id: 1, label: "Case Details",    short: "Case",     Icon: FileText      },
  { id: 2, label: "Location",        short: "Location", Icon: MapPin        },
  { id: 3, label: "Victim(s)",       short: "Victim",   Icon: User          },
  { id: 4, label: "Suspect(s)",      short: "Suspect",  Icon: Users         },
  { id: 5, label: "Crime Details",   short: "Crime",    Icon: Gavel         },
  { id: 6, label: "Evidence",        short: "Evidence", Icon: Camera        },
  { id: 7, label: "AI Analysis",     short: "AI",       Icon: Brain         },
  { id: 8, label: "Update Notes",    short: "Notes",    Icon: FileText      },
  { id: 9, label: "Review & Save",   short: "Save",     Icon: CheckCircle2  },
];

// ── Mock: load existing case data (replace with API call) ─────────────────────
const loadMockCase = (caseId) => ({
  ...emptyFormData(),
  caseId,
  firNumber: "FIR-2026-1042",
  caseTitle: "Armed Robbery at Main Street Market",
  incidentDate: "2026-04-10",
  incidentTime: "22:30",
  reportingDate: "2026-04-10",
  caseType: "Robbery / Armed Robbery",
  priority: "High",
  caseStatus: "Under Investigation",
  ppcSections: "PPC 392, 34",
  description: "On the night of 10 April 2026 at approximately 22:30 hours, three unidentified armed individuals entered the Main Street Market, Gulshan-e-Iqbal, Karachi.",
  reportingOfficer: "DSP Asif Malik",
  assignedInvestigator: "Insp. Rashid Ali Khan",
  province: "Sindh",
  city: "Karachi",
  area: "Gulshan-e-Iqbal",
  policeStation: "Gulshan Police Station",
  address: "Main Street Market, Block 5, Gulshan-e-Iqbal",
  latitude: "24.9167",
  longitude: "67.0833",
  crimeSceneType: "Commercial – Indoor",
  sceneAccess: "Released",
  weaponUsed: "Firearm (Pistol)",
  vehicleUsed: "Toyota Corolla (White)",
  numSuspects: "3",
  motive: "Financial Gain",
  modus: "Planned / Premeditated",
  witnessAvailable: true,
  crimeDescription: "Armed robbery; suspects were masked; victim suffered minor injuries during the incident.",
  firFile: null,
  manualEntry: true,   // flag so AI analysis step has data to show
  completeness: 78,
  confidence: 84,
  extractedEntities: {
    persons:   ["Muhammad Saleem", "Unknown Male 1", "Unknown Male 2", "Unknown Male 3"],
    locations: ["Main Street Market", "Gulshan-e-Iqbal", "Karachi", "Block 5"],
    weapons:   ["Pistol"],
    vehicles:  ["Toyota Corolla (White)"],
    dates:     ["10 April 2026", "22:30 hours"],
  },
  missingFields: ["Suspect CNIC", "Victim CNIC"],
  progressPercent: "45",
  remarks: "",
  nextHearingDate: "",
  investigatorNotes: "",
});

// ── Validation (update mode skips step 1; indices shifted by 1) ───────────────
const validateUpdateStep = (step, formData) => {
  const e = {};
  if (step === 1) {
    if (!formData.firNumber?.trim())    e.firNumber    = "FIR number is required";
    if (!formData.caseTitle?.trim())    e.caseTitle    = "Case title is required";
    if (!formData.incidentDate)         e.incidentDate = "Date of incident is required";
    if (!formData.reportingDate)        e.reportingDate = "Reporting date is required";
    if (!formData.caseType)             e.caseType     = "Case type is required";
    if (!formData.priority)             e.priority     = "Priority is required";
    if (!formData.description?.trim())  e.description  = "Description is required";
  }
  if (step === 2) {
    if (!formData.province)             e.province = "Province is required";
    if (!formData.city?.trim())         e.city     = "City is required";
    if (!formData.address?.trim())      e.address  = "Crime scene address is required";
  }
  if (step === 5) {
    if (!formData.crimeDescription?.trim()) e.crimeDescription = "Crime description is required";
  }
  return e;
};

// ── Step Progress Bar ─────────────────────────────────────────────────────────
const UpdateProgressBar = ({ currentStep, completedSteps, onStepClick }) => (
  <div className="sticky top-14 z-30 bg-white border-b border-slate-200 shadow-sm">
    <div className="max-w-6xl mx-auto px-4 py-3">
      {/* Mobile */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-600">Step {currentStep} of {UPDATE_STEPS.length}</span>
          <span className="text-xs text-slate-500">{UPDATE_STEPS[currentStep - 1]?.label}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5">
          <div className="h-1.5 rounded-full bg-deep-ocean transition-all duration-500"
            style={{ width: `${((currentStep - 1) / (UPDATE_STEPS.length - 1)) * 100}%` }} />
        </div>
      </div>
      {/* Desktop */}
      <div className="hidden sm:flex items-center">
        {UPDATE_STEPS.map((step, idx) => {
          const { Icon } = step;
          const isCompleted  = completedSteps.includes(step.id);
          const isCurrent    = currentStep === step.id;
          const isAccessible = step.id === 1 || isCompleted || isCurrent || completedSteps.includes(step.id - 1);
          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => isAccessible && onStepClick(step.id)}
                disabled={!isAccessible}
                className={`flex flex-col items-center gap-1 transition-all ${isAccessible ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}
                title={step.label}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all
                  ${isCompleted ? "bg-emerald-600 border-emerald-600 text-white"
                    : isCurrent ? "bg-deep-ocean border-deep-ocean text-white shadow-lg shadow-deep-ocean/30"
                    : "bg-white border-slate-300 text-slate-400"}`}>
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <span className={`text-[9px] font-semibold uppercase tracking-wide transition-colors
                  ${isCurrent ? "text-deep-ocean" : isCompleted ? "text-emerald-600" : "text-slate-400"}`}>
                  {step.short}
                </span>
              </button>
              {idx < UPDATE_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 transition-all ${completedSteps.includes(step.id) ? "bg-emerald-500" : "bg-slate-200"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UpdateCasePage() {
  const navigate    = useNavigate();
  const { caseId }  = useParams();            // e.g. "C-2052"
  const topRef      = useRef(null);

  const [loading,        setLoading]        = useState(true);
  const [formData,       setFormData]       = useState(null);
  const [currentStep,    setCurrentStep]    = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [errors,         setErrors]         = useState({});
  const [saving,         setSaving]         = useState(false);
  const [saved,          setSaved]          = useState(false);

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: "smooth" });

  // Load existing case data on mount
  useEffect(() => {
    setTimeout(() => {
      setFormData(loadMockCase(caseId || "C-2052"));
      setLoading(false);
    }, 600);
  }, [caseId]);

  const goNext = () => {
    const e = validateUpdateStep(currentStep, formData);
    if (Object.keys(e).length) { setErrors(e); scrollTop(); return; }
    setErrors({});
    setCompletedSteps(cs => cs.includes(currentStep) ? cs : [...cs, currentStep]);
    setCurrentStep(s => Math.min(s + 1, UPDATE_STEPS.length));
    scrollTop();
  };

  const goBack = () => { setCurrentStep(s => Math.max(s - 1, 1)); scrollTop(); };

  const handleSave = async () => {
    const e = validateUpdateStep(currentStep, formData);
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 1500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-soft-mist font-sans mt-14">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-3">
          <Loader2 className="h-10 w-10 text-deep-ocean animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Loading case data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft-mist font-sans mt-14" ref={topRef}>
      <Header />
      <UpdateProgressBar currentStep={currentStep} completedSteps={completedSteps} onStepClick={setCurrentStep} />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <button onClick={() => navigate("/investigator")} className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition-colors"><LayoutDashboard className="h-3.5 w-3.5" />Dashboard</button>
          <ChevronRight className="h-3 w-3" />
          <button onClick={() => navigate("/investigator/cases")} className="hover:text-slate-800 cursor-pointer transition-colors flex items-center gap-1.5"><FolderOpen className="h-3.5 w-3.5" />Cases</button>
          <ChevronRight className="h-3 w-3" />
          <button onClick={() => navigate(`/investigator/case`)} className="hover:text-slate-800 cursor-pointer transition-colors">{formData.caseId}</button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-800 font-medium">Update Case</span>
        </nav>

        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-slate-800">Update Case</h1>
              <span className="text-xs font-mono bg-deep-ocean/10 text-deep-ocean px-2 py-1 rounded">{formData.caseId}</span>
            </div>
            <p className="text-sm text-slate-500">Step {currentStep} of {UPDATE_STEPS.length} — {UPDATE_STEPS[currentStep - 1]?.label}</p>
          </div>
          {/* Saved indicator */}
          {saved && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full self-start sm:self-auto">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Changes saved
            </div>
          )}
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
          {currentStep === 1 && <StepCaseDetails   data={formData} setData={setFormData} errors={errors} mode="update" />}
          {currentStep === 2 && <StepLocation      data={formData} setData={setFormData} errors={errors} />}
          {currentStep === 3 && <StepVictims       data={formData} setData={setFormData} mode="update" />}
          {currentStep === 4 && <StepSuspects      data={formData} setData={setFormData} mode="update" />}
          {currentStep === 5 && <StepCrimeDetails  data={formData} setData={setFormData} errors={errors} />}
          {currentStep === 6 && <StepEvidence      data={formData} setData={setFormData} />}
          {currentStep === 7 && <StepAIAnalysis    data={formData} />}
          {currentStep === 8 && <StepUpdateNotes   data={formData} setData={setFormData} />}
          {currentStep === 9 && <StepReview        data={formData} mode="update" />}
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-10">
          <button onClick={goBack} disabled={currentStep === 1}
            className="flex items-center gap-2 px-5 py-2.5 border border-slate-300 bg-white rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors w-full sm:w-auto justify-center cursor-pointer">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button onClick={() => navigate(-1)}
              className="px-5 py-2.5 border border-slate-300 bg-white rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors flex-1 sm:flex-none cursor-pointer">
              Cancel
            </button>
            {currentStep < UPDATE_STEPS.length ? (
              <button onClick={goNext}
                className="flex items-center gap-2 px-6 py-2.5 bg-deep-ocean text-white rounded-lg text-sm font-semibold hover:bg-deep-ocean-900 transition-colors flex-1 sm:flex-none justify-center cursor-pointer">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={handleSave} disabled={saving}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors flex-1 sm:flex-none justify-center cursor-pointer
                  ${saving ? "bg-emerald-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"} text-white`}>
                {saving
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                  : <><Save className="h-4 w-4" />Save Changes</>}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}