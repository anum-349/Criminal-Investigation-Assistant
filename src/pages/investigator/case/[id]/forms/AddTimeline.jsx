import { useEffect, useRef, useState } from "react";
import {
  Clock, Save, X, AlertCircle,
} from "lucide-react";

import {MANUAL_EVENT_TYPES, MANUAL_EVENT_COLORS, SEVERITIES} from '../caseEventConstants';

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

// ─────────────────────────────────────────────────────────────────────────────
// Empty form factory
// ─────────────────────────────────────────────────────────────────────────────

const emptyForm = (caseId) => ({
  caseId,
  eventType: "",
  title: "",
  description: "",
  date: new Date().toISOString().split("T")[0],
  time: new Date().toTimeString().slice(0, 5),
  location: "",
  officerName: "",
  outcome: "",
  followUpRequired: false,
  followUpDate: "",
  attachmentNote: "",
  severity: "Normal",
});

// ─────────────────────────────────────────────────────────────────────────────
// AddTimelineDialog
// ─────────────────────────────────────────────────────────────────────────────

export default function AddTimelineDialog({
  isOpen,
  onClose,
  onSubmit,
  caseId = "",
  initialData = null,
}) {
  const closeButtonRef = useRef(null);

  const [form, setForm]           = useState(() => emptyForm(caseId));
  const [errors, setErrors]       = useState({});
  const [saving, setSaving]       = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isUpdate = !!initialData;

  // Pre-populate for update; reset for add
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setForm({
        caseId:           initialData.caseId           || caseId,
        eventType:        initialData.eventType        || "",
        title:            initialData.title            || "",
        description:      initialData.description      || "",
        date:             initialData.date             || new Date().toISOString().split("T")[0],
        time:             initialData.time             || new Date().toTimeString().slice(0, 5),
        location:         initialData.location         || "",
        officerName:      initialData.officerName      || "",
        outcome:          initialData.outcome          || "",
        followUpRequired: !!initialData.followUpRequired,
        followUpDate:     initialData.followUpDate     || "",
        attachmentNote:   initialData.attachmentNote   || "",
        severity:         initialData.severity         || "Normal",
      });
    } else {
      setForm(emptyForm(caseId));
    }
    setErrors({});
    setSaving(false);
    setSubmitted(false);
  }, [isOpen, initialData, caseId]);

  // Focus the close button on open
  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus();
  }, [isOpen]);

  // Esc closes — but never during a save
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

  const toggleFollowUp = () => {
    setForm(f => ({ ...f, followUpRequired: !f.followUpRequired }));
  };

  const validate = () => {
    const e = {};
    if (!form.eventType)            e.eventType   = "Event type is required";
    if (!form.title.trim())         e.title       = "Title is required";
    if (!form.description.trim())   e.description = "Description is required";
    if (!form.date)                 e.date        = "Date is required";
    if (!form.officerName.trim())   e.officerName = "Officer name is required";
    if (form.followUpRequired && !form.followUpDate) {
      e.followUpDate = "Follow-up date is required";
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleClose = () => {
    if (saving) return;            // never close mid-save
    setForm(emptyForm(caseId));
    setErrors({});
    setSubmitted(false);
    onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);

    // Build via Step-1 factory so shape is guaranteed identical to other
    // manual events in the timeline.
    const event = createManualEvent(form, caseId);
    if (isUpdate && initialData?.id) event.id = initialData.id;

    onSubmit?.({ caseId, events: [event] });
    setSubmitted(true);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-timeline-title"
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
              <Clock className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h2 id="add-timeline-title" className="text-base font-semibold text-white truncate">
                {isUpdate ? "Update Timeline Event" : "Add Timeline Event"}
              </h2>
              {caseId && <p className="text-xs text-white/60">Case: {caseId} · Manual entry</p>}
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
              <Clock className="h-7 w-7 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {isUpdate ? "Event Updated" : "Event Added to Timeline"}
            </h3>
            <p className="text-slate-500 text-sm">
              {isUpdate
                ? `Event ${initialData?.id} has been updated successfully.`
                : <>Linked to case <span className="font-semibold text-slate-700">{caseId}</span>.</>}
            </p>
            <div className="flex gap-3 justify-center pt-1">
              {!isUpdate && (
                <button
                  type="button"
                  onClick={() => { setForm(emptyForm(caseId)); setSubmitted(false); }}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Add Another
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
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
                <Clock className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-700 leading-relaxed">
                  <strong>Manual entries</strong> (field visits, interviews, court dates) are added here.
                  System events (FIR filed, evidence added, status changes) are auto-logged.
                </p>
              </div>

              {/* ── Section 1: Classification ─────────────────────────── */}
              <section>
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100">
                  Classification
                </h3>

                <FieldLabel label="Event Type" required error={errors.eventType}>
                  <Select
                    options={MANUAL_EVENT_TYPES}
                    value={form.eventType}
                    onChange={setField("eventType")}
                    error={errors.eventType}
                  />
                  {form.eventType && (
                    <span className={`mt-2 inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${MANUAL_EVENT_COLORS[form.eventType] || "bg-slate-100 text-slate-600"}`}>
                      {form.eventType}
                    </span>
                  )}
                </FieldLabel>

                <div className="mt-4">
                  <FieldLabel label="Event Title" required error={errors.title}>
                    <Input
                      value={form.title}
                      onChange={setField("title")}
                      placeholder="Brief title — e.g. Witness Aamir interviewed at Gulshan PS"
                      error={errors.title}
                      maxLength={150}
                    />
                  </FieldLabel>
                </div>
              </section>

              {/* ── Section 2: When & Where ───────────────────────────── */}
              <section>
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100">
                  When &amp; Where
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldLabel label="Date" required error={errors.date}>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={setField("date")}
                      max={new Date().toISOString().split("T")[0]}
                      error={errors.date}
                    />
                  </FieldLabel>
                  <FieldLabel label="Time">
                    <Input type="time" value={form.time} onChange={setField("time")} />
                  </FieldLabel>
                  <FieldLabel label="Location of Event">
                    <Input
                      value={form.location}
                      onChange={setField("location")}
                      placeholder="Where this event took place"
                    />
                  </FieldLabel>
                  <FieldLabel label="Officer in Charge" required error={errors.officerName}>
                    <Input
                      value={form.officerName}
                      onChange={setField("officerName")}
                      placeholder="Name of responsible officer"
                      error={errors.officerName}
                    />
                  </FieldLabel>
                </div>
              </section>

              {/* ── Section 3: Detail ─────────────────────────────────── */}
              <section>
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100">
                  Detail
                </h3>
                <div className="space-y-4">
                  <FieldLabel label="Description / Detailed Notes" required error={errors.description}>
                    <Textarea
                      value={form.description}
                      onChange={setField("description")}
                      rows={5}
                      maxLength={2000}
                      placeholder="Full description of what happened, who was present, what was discovered, what was said…"
                      error={errors.description}
                    />
                  </FieldLabel>

                  <FieldLabel label="Outcome / Result">
                    <Input
                      value={form.outcome}
                      onChange={setField("outcome")}
                      placeholder="What was the result? e.g. Witness provided new lead, suspect denied involvement…"
                    />
                  </FieldLabel>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldLabel label="Severity / Significance">
                      <Select
                        options={SEVERITIES}
                        value={form.severity}
                        onChange={setField("severity")}
                        placeholder="Normal"
                      />
                    </FieldLabel>
                    <FieldLabel label="Attachment Note">
                      <Input
                        value={form.attachmentNote}
                        onChange={setField("attachmentNote")}
                        placeholder="Photo / document / audio reference"
                      />
                    </FieldLabel>
                  </div>
                </div>
              </section>

              {/* ── Section 4: Follow-up ──────────────────────────────── */}
              <section>
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100">
                  Follow-up
                </h3>
                <div className={`border rounded-xl p-4 space-y-3 transition-colors
                  ${form.followUpRequired
                    ? "border-amber-200 bg-amber-50/60"
                    : "border-slate-200 bg-slate-50"}`}>
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.followUpRequired}
                      onChange={toggleFollowUp}
                      className="w-4 h-4 rounded accent-deep-ocean"
                    />
                    <span className="font-medium text-slate-800">Follow-up Required</span>
                  </label>
                  {form.followUpRequired && (
                    <FieldLabel label="Follow-up Date" required error={errors.followUpDate}>
                      <Input
                        type="date"
                        value={form.followUpDate}
                        onChange={setField("followUpDate")}
                        min={new Date().toISOString().split("T")[0]}
                        error={errors.followUpDate}
                      />
                    </FieldLabel>
                  )}
                </div>
              </section>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                {isUpdate
                  ? `Editing: ${initialData?.id || ""}`
                  : "New events appear at the top of the timeline."}
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
                      {isUpdate ? "Save Changes" : "Add Event"}
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