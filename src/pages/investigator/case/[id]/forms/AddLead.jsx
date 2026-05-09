/**
 * AddLeadDialog — modal for creating (or, when initialData is given,
 * updating) a manual lead.
 *
 * Important contract change in this version
 * ─────────────────────────────────────────
 * `onSubmit({ caseId, leads: [lead] })` is now AWAITED and the dialog
 * checks the resolved value:
 *   • truthy  → dialog flips to its "Manual Lead Added" success screen.
 *   • falsy   → dialog stays on the form and shows an inline error so the
 *              investigator can fix and retry without losing their input.
 *
 * The previous version called `onSubmit?.(...)` synchronously and
 * unconditionally rendered the success screen, which meant a failed
 * POST still looked successful to the user.
 *
 * Place at: src/pages/investigator/case/[id]/forms/AddLead.jsx
 */

import { useState, useRef, useEffect } from "react";
import {
  Brain, Save, X, AlertCircle, AlertTriangle, Loader2,
} from "lucide-react";

import {
  LEAD_TYPES,
  EVENT_SOURCE,
  generateId,    // <-- proper import; was implicit before
} from '../caseEventConstants';

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

// Build a manual-lead object on submit. Same shape as before — the parent
// translates this into the POST body for /leads.
const buildLead = (form, caseId, initialId) => ({
  id: initialId || generateId("LEAD",caseId, "10"),
  caseId,
  eventSource: EVENT_SOURCE.MANUAL,
  type: form.type,
  severity: form.severity,
  description: form.description,
  suggestedSuspect: form.suggestedSuspect || null,
  suspectBasis:     form.suspectBasis || "",
  similarCaseId:    form.similarCaseId || "",
  weaponPattern:    form.weaponPattern || "",
  locationArea:     form.locationArea || "",
  nextStep:         form.nextStep,
  source:           form.source || "Manual Entry",
  confidence:       Number(form.confidence) || null,
  status:           "New",
  editable:         true,
  dismissable:      true,
  generatedAt:      new Date().toISOString(),
});

// ─── Field primitives ──────────────────────────────────────────────────────

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

// ─── Component ─────────────────────────────────────────────────────────────

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
  const [submitError, setSubmitError] = useState(null);

  const isUpdate = !!initialData;

  // Pre-populate for update; reset for add
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setForm({
        type:             initialData.type             || "",
        severity:         initialData.severity         || "",
        description:      initialData.description      || "",
        suggestedSuspect:
          // initialData.suggestedSuspect can be either a string (legacy) or
          // a {name, suspectId, basis} object (server response). Normalize
          // to a string for the form input.
          (typeof initialData.suggestedSuspect === "object" && initialData.suggestedSuspect)
            ? (initialData.suggestedSuspect.suspectId || initialData.suggestedSuspect.name || "")
            : (initialData.suggestedSuspect || ""),
        suspectBasis:
          (typeof initialData.suggestedSuspect === "object" && initialData.suggestedSuspect?.basis)
            ? initialData.suggestedSuspect.basis
            : (initialData.suspectBasis || ""),
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
    setSubmitError(null);
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
    if (submitError) setSubmitError(null);
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
    setSubmitError(null);
    onClose?.();
  };

  // Now AWAITS the parent and inspects the return value.
  // - true  → flip to success screen.
  // - false → stay on the form and show submitError.
  // - undefined (legacy parent) → assume success to keep backward compat.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setSubmitError(null);

    try {
      const lead = buildLead(form, caseId, initialData?.id);
      const result = await onSubmit?.({ caseId, leads: [lead] });

      // If the parent returns false explicitly, we treat it as a failure.
      // Anything else (true, undefined, the response object) → success.
      if (result === false) {
        setSubmitError("Save failed. Please try again or check the toast for details.");
        return;
      }
      setSubmitted(true);
    } catch (err) {
      // Defensive — parent shouldn't throw, but if it does, surface it.
      console.error("AddLead submit error:", err);
      setSubmitError(err?.message || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
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
            disabled={saving}
            className="p-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white transition-colors disabled:opacity-50"
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
                ? <>Lead {initialData?.id} has been updated successfully.</>
                : <>Linked to case <span className="font-semibold text-slate-700">{caseId}</span>.</>}
            </p>
            <div className="flex gap-3 justify-center pt-1">
              {!isUpdate && (
                <button
                  type="button"
                  onClick={() => {
                    setForm(emptyForm());
                    setSubmitted(false);
                    setSubmitError(null);
                  }}
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

              {/* Submit error banner */}
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 leading-relaxed flex-1">
                    {submitError}
                  </p>
                </div>
              )}

              {/* Type + Severity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldLabel label="Lead Type" required error={errors.type}>
                  <Select
                    options={LEAD_TYPES}
                    value={form.type}
                    onChange={setField("type")}
                    error={errors.type}
                    placeholder="Select lead type…"
                  />
                </FieldLabel>
                <FieldLabel label="Severity" required error={errors.severity}>
                  <Select
                    options={SEVERITIES}
                    value={form.severity}
                    onChange={setField("severity")}
                    error={errors.severity}
                    placeholder="Select severity…"
                  />
                </FieldLabel>
              </div>

              {/* Description */}
              <FieldLabel label="Description" required error={errors.description}>
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={setField("description")}
                  placeholder="Describe what was observed, learned, or hypothesized…"
                  error={errors.description}
                />
              </FieldLabel>

              {/* Optional context */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldLabel label="Suggested Suspect" hint="Free-text or SUS-XXXX id">
                  <Input
                    value={form.suggestedSuspect}
                    onChange={setField("suggestedSuspect")}
                    placeholder="e.g. Zafar Iqbal or SUS-0041"
                  />
                </FieldLabel>
                <FieldLabel label="Suspect basis" hint="Why this person?">
                  <Input
                    value={form.suspectBasis}
                    onChange={setField("suspectBasis")}
                    placeholder="e.g. Same MO, same area"
                  />
                </FieldLabel>

                <FieldLabel label="Similar Case" hint="Related case ID">
                  <Input
                    value={form.similarCaseId}
                    onChange={setField("similarCaseId")}
                    placeholder="e.g. C-2040"
                  />
                </FieldLabel>
                <FieldLabel label="Source" hint="Where did this lead come from?">
                  <Select
                    options={SOURCES}
                    value={form.source}
                    onChange={setField("source")}
                  />
                </FieldLabel>

                <FieldLabel label="Weapon / Pattern" hint="Optional">
                  <Input
                    value={form.weaponPattern}
                    onChange={setField("weaponPattern")}
                    placeholder="e.g. Pistol, similar MO"
                  />
                </FieldLabel>
                <FieldLabel label="Location / Area" hint="Optional">
                  <Input
                    value={form.locationArea}
                    onChange={setField("locationArea")}
                    placeholder="e.g. Gulshan-e-Iqbal"
                  />
                </FieldLabel>
              </div>

              {/* Next step */}
              <FieldLabel label="Next Recommended Step" required error={errors.nextStep}>
                <Textarea
                  rows={3}
                  value={form.nextStep}
                  onChange={setField("nextStep")}
                  placeholder="What should be done next on this lead?"
                  error={errors.nextStep}
                />
              </FieldLabel>

              {/* Confidence */}
              <FieldLabel label="Confidence" hint="Investigator-rated (0–100)">
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={form.confidence}
                    onChange={setField("confidence")}
                    className="w-full"
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all ${confidenceColor}`}
                        style={{ width: `${confidenceNum}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-600 w-9 text-right">
                      {confidenceNum}%
                    </span>
                  </div>
                </div>
              </FieldLabel>
            </div>

            {/* Footer actions */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-white cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-deep-ocean text-white text-sm hover:bg-deep-ocean/90 cursor-pointer disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isUpdate ? "Update Lead" : "Save Lead"}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}