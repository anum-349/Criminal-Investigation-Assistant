import { useState, useRef, useEffect } from "react";
import {
  Brain, Save, X, AlertCircle, AlertTriangle,
} from "lucide-react";

import {
  LEAD_TYPES,
  EVENT_SOURCE,
  generateLeadId,
} from "../caseEventConstants";

const SOURCES = [
  "Manual Entry",
  "Field Intelligence",
  "Informant Tip",
  "Forensic Finding",
  "Witness Intel",
  "Inter-agency Sharing",
  "Other",
];

const SEVERITIES = ["Critical", "High", "Medium", "Low"];

const emptyForm = () => ({
  type: "",
  severity: "",
  description: "",
  suggestedSuspect: "",
  suspectBasis: "",
  similarCaseId: "",
  weaponPattern: "",
  locationArea: "",
  nextStep: "",
  source: "Manual Entry",
  confidence: "50",
});

// ─────────────────────────────────────────────────────────────────────────────
// Build a manual-lead object on submit
// ─────────────────────────────────────────────────────────────────────────────
// Kept local because this modal is the only producer. If you'd rather centralise
// it in caseEventConstants, you can replace the body with:
//   return createManualLead({ ...form, ... }, caseId);

const buildLead = (form, caseId, initialId) => ({
  id: initialId || generateLeadId(),
  caseId,
  eventSource: EVENT_SOURCE.MANUAL,
  type: form.type,
  severity: form.severity,
  description: form.description,
  suggestedSuspect: form.suggestedSuspect || null,
  suspectBasis: form.suspectBasis || "",
  similarCaseId: form.similarCaseId || "",
  weaponPattern: form.weaponPattern || "",
  locationArea: form.locationArea || "",
  nextStep: form.nextStep,
  source: form.source || "Manual Entry",
  confidence: Number(form.confidence) || null,
  status: "New",
  editable: true,
  dismissable: true,
  generatedAt: new Date().toISOString(),
});


const FieldLabel = ({ label, required, error, hint, className = "", children }) => (
  <label className={`block ${className}`}>
    <span className="flex items-baseline gap-1.5 mb-1.5">
      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {hint && <span className="text-[10px] text-slate-400 italic">{hint}</span>}
    </span>
    {children}
    {error && (
      <span className="mt-1 flex items-center gap-1 text-xs text-red-600">
        <AlertCircle className="h-3 w-3" />
        {error}
      </span>
    )}
  </label>
);

const Input = ({ error, className = "", ...props }) => (
  <input
    className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:border-transparent
      ${error
        ? "border-red-400 bg-red-50 focus:ring-red-300"
        : "border-slate-300 bg-white text-slate-800 focus:ring-deep-ocean/30"}
      ${className}`}
    {...props}
  />
);

const Select = ({ error, options = [], placeholder = "Select…", className = "", ...props }) => (
  <select
    className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:border-transparent appearance-none bg-white
      ${error
        ? "border-red-400 bg-red-50 focus:ring-red-300"
        : "border-slate-300 text-slate-800 focus:ring-deep-ocean/30"}
      ${className}`}
    {...props}
  >
    <option value="">{placeholder}</option>
    {options.map((o) => (
      <option key={o} value={o}>{o}</option>
    ))}
  </select>
);

const Textarea = ({ error, rows = 3, className = "", ...props }) => (
  <textarea
    rows={rows}
    className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:border-transparent resize-y
      ${error
        ? "border-red-400 bg-red-50 focus:ring-red-300"
        : "border-slate-300 bg-white text-slate-800 focus:ring-deep-ocean/30"}
      ${className}`}
    {...props}
  />
);

export default function AddLeadDialog({
  isOpen,
  onClose,
  onSubmit,
  caseId = "",
  initialData = null,
}) {
  const closeButtonRef = useRef(null);

  const [form, setForm]         = useState(emptyForm);
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isUpdate = !!initialData;

  // Pre-populate for update; reset for add
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setForm({
        type:             initialData.type             || "",
        severity:         initialData.severity         || "",
        description:      initialData.description      || "",
        suggestedSuspect: initialData.suggestedSuspect || "",
        suspectBasis:     initialData.suspectBasis     || "",
        similarCaseId:    initialData.similarCaseId    || "",
        weaponPattern:    initialData.weaponPattern    || "",
        locationArea:     initialData.locationArea     || "",
        nextStep:         initialData.nextStep         || "",
        source:           initialData.source           || "Manual Entry",
        confidence:       String(initialData.confidence ?? 50),
      });
    } else {
      setForm(emptyForm());
    }
    setErrors({});
    setSaving(false);
    setSubmitted(false);
  }, [isOpen, initialData]);

  // Focus the close button on open
  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus();
  }, [isOpen]);

  // Esc closes — but only when not in the middle of saving
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, saving]);

  const setField = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setErrors(er => ({ ...er, [k]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.type)                e.type        = "Lead type is required";
    if (!form.severity)            e.severity    = "Severity is required";
    if (!form.description.trim())  e.description = "Description is required";
    if (!form.nextStep.trim())     e.nextStep    = "Next recommended step is required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleClose = () => {
    if (saving) return;          // never close mid-save
    setForm(emptyForm());
    setErrors({});
    setSubmitted(false);
    onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    // Tiny delay so the spinner is visible — kept consistent with other dialogs
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);

    const lead = buildLead(form, caseId, initialData?.id);
    onSubmit?.({ caseId, leads: [lead] });
    setSubmitted(true);
  };

  const confidenceNum = Number(form.confidence);
  const confidenceColor =
    confidenceNum >= 80 ? "bg-emerald-500"
    : confidenceNum >= 50 ? "bg-amber-400"
    : "bg-red-400";

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-lead-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden />

      <div
        className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#14374E] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h2 id="add-lead-title" className="text-base font-semibold text-white truncate">
                {isUpdate ? "Update Manual Lead" : "Add Manual Lead"}
              </h2>
              {caseId && <p className="text-xs text-white/60">Case: {caseId}</p>}
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            className="p-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Submitted success state */}
        {submitted ? (
          <div className="px-6 py-16 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <Brain className="h-7 w-7 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {isUpdate ? "Lead Updated" : "Manual Lead Added"}
            </h3>
            <p className="text-slate-500 text-sm">
              {isUpdate
                ? `Lead ${initialData?.id} has been updated successfully.`
                : <>Linked to case <span className="font-semibold text-slate-700">{caseId}</span>.</>}
            </p>
            <div className="flex gap-3 justify-center pt-1">
              {!isUpdate && (
                <button
                  type="button"
                  onClick={() => { setForm(emptyForm()); setSubmitted(false); }}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Add More
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg bg-deep-ocean text-white text-sm hover:bg-deep-ocean/90 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="px-6 py-5 space-y-5">

              {/* Info banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                <Brain className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  AI leads are generated automatically. Use this form to add leads
                  from field intelligence, informants, or manual analysis that the
                  AI could not detect.
                </p>
              </div>

              {/* ── Section 1: Classification ─────────────────────────── */}
              <section>
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100">
                  Classification
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldLabel label="Case ID" required>
                    <div className="px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500 font-mono SelectField-all">
                      {caseId || "—"}
                    </div>
                  </FieldLabel>
                  <FieldLabel label="Lead Source">
                    <Select
                      options={SOURCES}
                      value={form.source}
                      onChange={setField("source")}
                    />
                  </FieldLabel>
                  <FieldLabel label="Lead Type" required error={errors.type}>
                    <Select
                      options={LEAD_TYPES}
                      value={form.type}
                      onChange={setField("type")}
                      error={errors.type}
                    />
                  </FieldLabel>
                  <FieldLabel label="Severity" required error={errors.severity}>
                    <Select
                      options={SEVERITIES}
                      value={form.severity}
                      onChange={setField("severity")}
                      error={errors.severity}
                    />
                  </FieldLabel>
                </div>
              </section>

              {/* ── Section 2: Lead detail ────────────────────────────── */}
              <section>
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100">
                  Lead Detail
                </h3>
                <div className="space-y-4">
                  <FieldLabel label="Description" required error={errors.description}>
                    <Textarea
                      value={form.description}
                      onChange={setField("description")}
                      rows={3}
                      maxLength={1000}
                      placeholder="Describe the lead in detail — what was found, how it was discovered, why it is relevant…"
                      error={errors.description}
                    />
                  </FieldLabel>

                  <FieldLabel label="Next Recommended Step" required error={errors.nextStep}>
                    <Textarea
                      value={form.nextStep}
                      onChange={setField("nextStep")}
                      rows={3}
                      maxLength={500}
                      placeholder="What action should the investigator take based on this lead?"
                      error={errors.nextStep}
                    />
                  </FieldLabel>
                </div>
              </section>

              {/* ── Section 3: Suspect & Pattern (optional) ────────────── */}
              <section>
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100">
                  Suspect & Pattern <span className="font-normal italic text-slate-400 normal-case">(optional)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldLabel label="Suggested Suspect">
                    <Input
                      value={form.suggestedSuspect}
                      onChange={setField("suggestedSuspect")}
                      placeholder="Name or SUS-XXXXX"
                    />
                  </FieldLabel>
                  <FieldLabel label="Similar Past Case ID">
                    <Input
                      value={form.similarCaseId}
                      onChange={setField("similarCaseId")}
                      placeholder="e.g. C-2040"
                    />
                  </FieldLabel>
                  <FieldLabel label="Basis / Evidence for Suspect" className="sm:col-span-2">
                    <Input
                      value={form.suspectBasis}
                      onChange={setField("suspectBasis")}
                      placeholder="Why this suspect is linked to the lead…"
                    />
                  </FieldLabel>
                  <FieldLabel label="Weapon / MO Pattern">
                    <Input
                      value={form.weaponPattern}
                      onChange={setField("weaponPattern")}
                      placeholder="e.g. Pistol, same calibre"
                    />
                  </FieldLabel>
                  <FieldLabel label="Location Area">
                    <Input
                      value={form.locationArea}
                      onChange={setField("locationArea")}
                      placeholder="e.g. Gulshan-e-Iqbal, 2 km radius"
                    />
                  </FieldLabel>
                </div>
              </section>

              {/* ── Section 4: Confidence ─────────────────────────────── */}
              <section>
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100">
                  Investigator Confidence
                </h3>
                <div className="space-y-2.5">
                  <input
                    type="range" min="10" max="100" step="5"
                    value={form.confidence}
                    onChange={setField("confidence")}
                    className="w-full accent-deep-ocean cursor-pointer"
                    aria-label="Confidence level"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Low (10%)</span>
                    <span className="font-bold text-deep-ocean text-sm">{form.confidence}%</span>
                    <span>High (100%)</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${confidenceColor}`}
                      style={{ width: `${form.confidence}%` }}
                    />
                  </div>
                  {confidenceNum < 50 && (
                    <p className="text-xs text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Low confidence — make sure the description explains why the lead is still worth pursuing.
                    </p>
                  )}
                </div>
              </section>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                {isUpdate
                  ? `Editing: ${initialData?.id || ""}`
                  : "Saved leads appear at the top of the leads table."}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-deep-ocean text-white text-sm font-medium hover:bg-deep-ocean/90 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {isUpdate ? "Save Changes" : "Add Lead"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}