/**
 * src/pages/investigator/case/[id]/forms/AddTimelineDialog.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Validation rules (HCI guidelines — matches AddEvidence pattern)
 *
 *   eventType        — required
 *   title            — required, no digits, max 150 chars
 *   description      — required, max 2 000 chars
 *   date             — required, cannot be in the future
 *   officerName      — required, letters / spaces / hyphens / apostrophes only
 *   followUpDate     — required when followUpRequired, must be today or later
 *   location         — optional (free text)
 *   outcome          — optional
 *   severity         — always has a default, no rule needed
 *   attachmentNote   — optional
 *
 * UX patterns applied
 * ───────────────────
 *   • touched state  — errors only surface after the user leaves / changes a field
 *   • showAllErrors  — flipped on failed submit attempt, reveals every error at once
 *   • Double-submit  — `saving` flag + disabled button
 *   • Error auto-clear — stale banner disappears as soon as the user edits the form
 *   • noValidate     — disables browser native bubbles that fight custom errors
 *   • aria-busy      — assistive tech hears "busy" during the save
 */

import { useEffect, useRef, useState } from "react";
import { Clock, Save, X, AlertCircle, AlertTriangle } from "lucide-react";

import {
    MANUAL_EVENT_TYPES,
    MANUAL_EVENT_COLORS,
    SEVERITIES,
    createManualEvent,
} from "../caseEventConstants";

// ─────────────────────────────────────────────────────────────────────────────
// Primitive field components
// ─────────────────────────────────────────────────────────────────────────────

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
                <AlertCircle className="h-3 w-3 shrink-0" />
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
// Validators
// ─────────────────────────────────────────────────────────────────────────────

const TODAY = () => new Date().toISOString().split("T")[0];

const NAME_RE  = /^[a-zA-Z\s\-'.]+$/;   // letters, spaces, hyphens, apostrophes
const DIGIT_RE = /\d/;

const validators = {
    eventType(v) {
        if (!v) return "Event type is required.";
        return null;
    },

    title(v) {
        if (!v || !v.trim())   return "Title is required.";
        if (DIGIT_RE.test(v))  return "Title must not contain numbers.";
        if (v.trim().length > 150) return "Title must be 150 characters or fewer.";
        return null;
    },

    description(v) {
        if (!v || !v.trim())   return "Description is required.";
        if (v.trim().length > 2000) return "Description must be 2 000 characters or fewer.";
        return null;
    },

    date(v) {
        if (!v)        return "Date is required.";
        if (v > TODAY()) return "Date cannot be in the future.";
        return null;
    },

    officerName(v) {
        if (!v || !v.trim())    return "Officer name is required.";
        if (DIGIT_RE.test(v))   return "Name must not contain numbers.";
        if (!NAME_RE.test(v))   return "Name may only contain letters, spaces, hyphens, and apostrophes.";
        return null;
    },

    followUpDate(v, followUpRequired) {
        if (!followUpRequired) return null;
        if (!v)                return "Follow-up date is required when follow-up is enabled.";
        if (v < TODAY())       return "Follow-up date must be today or in the future.";
        return null;
    },
};

/** Run all validators and return an error map. Empty map = all valid. */
const runValidation = (form) => {
    const e = {};
    const push = (k, msg) => { if (msg) e[k] = msg; };
    push("eventType",   validators.eventType(form.eventType));
    push("title",       validators.title(form.title));
    push("description", validators.description(form.description));
    push("date",        validators.date(form.date));
    push("officerName", validators.officerName(form.officerName));
    push("followUpDate",validators.followUpDate(form.followUpDate, form.followUpRequired));
    return e;
};

// ─────────────────────────────────────────────────────────────────────────────
// Default form shape
// ─────────────────────────────────────────────────────────────────────────────

const emptyForm = (caseId) => ({
    caseId,
    eventType:        "",
    title:            "",
    description:      "",
    date:             TODAY(),
    time:             new Date().toTimeString().slice(0, 5),
    location:         "",
    officerName:      "",
    outcome:          "",
    followUpRequired: false,
    followUpDate:     "",
    attachmentNote:   "",
    severity:         "Normal",
});

// ─────────────────────────────────────────────────────────────────────────────
// AddTimelineDialog
// ─────────────────────────────────────────────────────────────────────────────

export default function AddTimelineDialog({
    isOpen,
    onClose,
    onSubmit,
    caseId      = "",
    initialData = null,
}) {
    const closeButtonRef = useRef(null);

    const [form,        setForm]        = useState(() => emptyForm(caseId));
    const [errors,      setErrors]      = useState({});
    const [touched,     setTouched]     = useState({});   // which fields user has interacted with
    const [showAll,     setShowAll]     = useState(false); // reveal all errors on failed submit
    const [saving,      setSaving]      = useState(false);
    const [submitted,   setSubmitted]   = useState(false);
    const [submitError, setSubmitError] = useState("");

    const isUpdate = !!initialData;

    // ── Reset / pre-populate ────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        if (initialData) {
            setForm({
                caseId:           initialData.caseId           || caseId,
                eventType:        initialData.eventType        || "",
                title:            initialData.title            || "",
                description:      initialData.description      || "",
                date:             initialData.date             || TODAY(),
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
        setTouched({});
        setShowAll(false);
        setSaving(false);
        setSubmitted(false);
        setSubmitError("");
    }, [isOpen, initialData, caseId]);

    // ── Focus trap ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (isOpen) closeButtonRef.current?.focus();
    }, [isOpen]);

    // ── Esc key ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => { if (e.key === "Escape" && !saving) handleClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, saving]);

    // ── Auto-clear stale submit error when user edits anything ──────────────
    useEffect(() => {
        if (submitError) setSubmitError("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form]);

    // ─────────────────────────────────────────────────────────────────────────
    // Field change / touch helpers
    // ─────────────────────────────────────────────────────────────────────────

    /** Generic onChange — marks field touched, re-validates that field live. */
    const setField = (k) => (e) => {
        const val = e.target.value;
        setForm((f) => ({ ...f, [k]: val }));
        setTouched((t) => ({ ...t, [k]: true }));
        // Re-run just this field's validator so the error clears as soon as
        // the user fixes it, without waiting for a full submit attempt.
        const msg = k === "followUpDate"
            ? validators.followUpDate(val, form.followUpRequired)
            : validators[k]?.(val) ?? null;
        setErrors((er) => ({ ...er, [k]: msg }));
    };

    /** onBlur — marks touched without changing value (for e.g. date fields). */
    const touchField = (k) => () =>
        setTouched((t) => ({ ...t, [k]: true }));

    const toggleFollowUp = () => {
        setForm((f) => ({ ...f, followUpRequired: !f.followUpRequired, followUpDate: "" }));
        setErrors((er) => ({ ...er, followUpDate: null }));
        setTouched((t) => ({ ...t, followUpDate: false }));
    };

    /** Returns the error string for a field only when it should be visible. */
    const errorFor = (k) => (touched[k] || showAll) ? errors[k] || null : null;

    // ─────────────────────────────────────────────────────────────────────────
    // Close
    // ─────────────────────────────────────────────────────────────────────────

    const handleClose = () => {
        if (saving) return;
        setForm(emptyForm(caseId));
        setErrors({});
        setTouched({});
        setShowAll(false);
        setSubmitError("");
        setSubmitted(false);
        onClose?.();
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Submit
    // ─────────────────────────────────────────────────────────────────────────

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Guard 1 — double-submit
        if (saving) return;

        // Guard 2 — run full validation, reveal all errors
        const errs = runValidation(form);
        setErrors(errs);

        if (Object.keys(errs).length) {
            setShowAll(true);   // surface errors on every field
            setSubmitError("Please fix the highlighted fields before submitting.");
            return;
        }

        // Guard 3 — all good, proceed
        setSaving(true);
        setSubmitError("");
        setShowAll(false);

        try {
            const event = createManualEvent(form, caseId);
            if (isUpdate && initialData?.id) event.id = initialData.id;

            await onSubmit?.({ caseId, events: [event] });
            setSubmitted(true);
        } catch (err) {
            const detail =
                err?.response?.data?.detail ||
                err?.message ||
                "Failed to save event. Please try again.";
            setSubmitError(String(detail));
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

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
                {/* ── Header ────────────────────────────────────────────── */}
                <div className="sticky top-0 z-10 bg-[#14374E] px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                            <Clock className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h2 id="add-timeline-title" className="text-base font-semibold text-white truncate">
                                {isUpdate ? "Update Timeline Event" : "Add Timeline Event"}
                            </h2>
                            {caseId && (
                                <p className="text-xs text-white/60">Case: {caseId} · Manual entry</p>
                            )}
                        </div>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={handleClose}
                        disabled={saving}
                        className="p-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 cursor-pointer
                                   focus:outline-none focus:ring-2 focus:ring-white transition-colors
                                   disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Close dialog"
                    >
                        <X className="h-5 w-5" aria-hidden />
                    </button>
                </div>

                {/* ── Success screen ────────────────────────────────────── */}
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
                                    onClick={() => {
                                        setForm(emptyForm(caseId));
                                        setErrors({});
                                        setTouched({});
                                        setShowAll(false);
                                        setSubmitted(false);
                                    }}
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
                    /* ── Form ─────────────────────────────────────────────── */
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

                            {/* Submit-level error banner */}
                            {submitError && (
                                <div
                                    role="alert"
                                    className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2"
                                >
                                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                                    <p className="text-xs text-red-700 leading-relaxed flex-1">
                                        <strong>Save failed:</strong> {submitError}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setSubmitError("")}
                                        className="text-red-500 hover:text-red-700 cursor-pointer"
                                        aria-label="Dismiss error"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* ── Section 1: Classification ─────────────── */}
                            <section>
                                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100">
                                    Classification
                                </h3>

                                <FieldLabel label="Event Type" required error={errorFor("eventType")}>
                                    <Select
                                        options={MANUAL_EVENT_TYPES}
                                        value={form.eventType}
                                        onChange={(e) => {
                                            setField("eventType")(e);
                                        }}
                                        error={errorFor("eventType")}
                                    />
                                    {form.eventType && (
                                        <span className={`mt-2 inline-block text-xs font-semibold px-2.5 py-1 rounded-full
                                            ${MANUAL_EVENT_COLORS[form.eventType] || "bg-slate-100 text-slate-600"}`}>
                                            {form.eventType}
                                        </span>
                                    )}
                                </FieldLabel>

                                <div className="mt-4">
                                    <FieldLabel
                                        label="Event Title"
                                        required
                                        error={errorFor("title")}
                                        hint="No numbers allowed"
                                    >
                                        <Input
                                            value={form.title}
                                            onChange={setField("title")}
                                            onBlur={touchField("title")}
                                            placeholder="Brief title — e.g. Witness Aamir interviewed at Gulshan PS"
                                            error={errorFor("title")}
                                            maxLength={150}
                                        />
                                        {/* Character counter — appears once user starts typing */}
                                        {form.title.length > 0 && (
                                            <span className={`mt-1 block text-right text-[10px]
                                                ${form.title.length > 130 ? "text-amber-600" : "text-slate-400"}`}>
                                                {form.title.length} / 150
                                            </span>
                                        )}
                                    </FieldLabel>
                                </div>
                            </section>

                            {/* ── Section 2: When & Where ───────────────── */}
                            <section>
                                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100">
                                    When &amp; Where
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                    <FieldLabel label="Date" required error={errorFor("date")}>
                                        <Input
                                            type="date"
                                            value={form.date}
                                            onChange={setField("date")}
                                            onBlur={touchField("date")}
                                            max={TODAY()}
                                            error={errorFor("date")}
                                        />
                                    </FieldLabel>

                                    <FieldLabel label="Time">
                                        <Input
                                            type="time"
                                            value={form.time}
                                            onChange={setField("time")}
                                        />
                                    </FieldLabel>

                                    <FieldLabel label="Location of Event">
                                        <Input
                                            value={form.location}
                                            onChange={setField("location")}
                                            placeholder="Where this event took place"
                                        />
                                    </FieldLabel>

                                    <FieldLabel
                                        label="Officer in Charge"
                                        required
                                        error={errorFor("officerName")}
                                        hint="No numbers allowed"
                                    >
                                        <Input
                                            value={form.officerName}
                                            onChange={setField("officerName")}
                                            onBlur={touchField("officerName")}
                                            placeholder="Name of responsible officer"
                                            error={errorFor("officerName")}
                                        />
                                    </FieldLabel>
                                </div>
                            </section>

                            {/* ── Section 3: Detail ─────────────────────── */}
                            <section>
                                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100">
                                    Detail
                                </h3>
                                <div className="space-y-4">
                                    <FieldLabel
                                        label="Description / Detailed Notes"
                                        required
                                        error={errorFor("description")}
                                    >
                                        <Textarea
                                            value={form.description}
                                            onChange={setField("description")}
                                            onBlur={touchField("description")}
                                            rows={5}
                                            maxLength={2000}
                                            placeholder="Full description of what happened, who was present, what was discovered, what was said…"
                                            error={errorFor("description")}
                                        />
                                        {/* Character counter */}
                                        {form.description.length > 0 && (
                                            <span className={`mt-1 block text-right text-[10px]
                                                ${form.description.length > 1800 ? "text-amber-600" : "text-slate-400"}`}>
                                                {form.description.length} / 2000
                                            </span>
                                        )}
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

                            {/* ── Section 4: Follow-up ──────────────────── */}
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
                                        <FieldLabel
                                            label="Follow-up Date"
                                            required
                                            error={errorFor("followUpDate")}
                                        >
                                            <Input
                                                type="date"
                                                value={form.followUpDate}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setForm((f) => ({ ...f, followUpDate: val }));
                                                    setTouched((t) => ({ ...t, followUpDate: true }));
                                                    setErrors((er) => ({
                                                        ...er,
                                                        followUpDate: validators.followUpDate(val, true),
                                                    }));
                                                }}
                                                onBlur={touchField("followUpDate")}
                                                min={TODAY()}
                                                error={errorFor("followUpDate")}
                                            />
                                        </FieldLabel>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* ── Sticky footer ─────────────────────────────── */}
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
                                    disabled={saving}
                                    className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors disabled:opacity-40"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    aria-busy={saving}
                                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-deep-ocean text-white text-sm font-medium
                                               hover:bg-deep-ocean/90 disabled:opacity-60 disabled:cursor-not-allowed
                                               cursor-pointer transition-colors"
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