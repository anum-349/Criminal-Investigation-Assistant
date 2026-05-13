/**
 * src/pages/investigator/case/[id]/forms/AddLeadDialog.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Validation rules (HCI guidelines — matches AddEvidence / AddTimeline pattern)
 *
 * Required fields
 *   type             — must select a lead type
 *   severity         — must select a severity
 *   description      — required, max 2 000 chars
 *   nextStep         — required, max 1 000 chars
 *
 * Optional fields with format rules
 *   suggestedSuspect — if provided: free text OR a SUS-XXXX id (letters/spaces/
 *                      hyphens/apostrophes allowed; a bare SUS-\d+ id is also OK)
 *   suspectBasis     — if provided: no leading/trailing whitespace enforced, max 300
 *   similarCaseId    — if provided: must match C-\d+ or CASE-\d+ (case-insensitive)
 *   weaponPattern    — free text, max 200
 *   locationArea     — free text, max 200
 *   confidence       — numeric 0-100, always valid (slider enforces it)
 *
 * UX patterns applied
 * ───────────────────
 *   • touched state   — errors only surface after the user leaves / changes a field
 *   • showAll         — flipped on a failed submit attempt, reveals every error at once
 *   • Double-submit   — `saving` flag + disabled button + aria-busy
 *   • Live re-validate — error clears as soon as the field becomes valid again
 *   • Auto-clear banner — stale submit-error disappears on any form change
 *   • noValidate      — disables browser native bubbles that fight custom errors
 *   • Character counters on description and nextStep
 */

import { useState, useRef, useEffect } from "react";
import {
    Brain, Save, X, AlertCircle, AlertTriangle, Loader2,
} from "lucide-react";

import { LEAD_TYPES, EVENT_SOURCE } from "../caseEventConstants";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Validators
// ─────────────────────────────────────────────────────────────────────────────

/** Letters, spaces, hyphens, apostrophes — no digits. */
const NAME_RE      = /^[a-zA-Z\s\-'.]+$/;
const DIGIT_RE     = /\d/;

/**
 * Valid suspect values:
 *   • A formal ID:  SUS-<digits>  (e.g. SUS-0041)
 *   • A free-text name: letters / spaces / hyphens / apostrophes (no digits)
 * We allow either — the hint text already tells the user both forms are OK.
 */
const SUSPECT_ID_RE = /^SUS-\d+$/i;

/**
 * Case ID format: C-<digits> or CASE-<digits> (e.g. C-2040, CASE-1023).
 * Dash is mandatory; partial entries like "C2040" are rejected to keep
 * references consistent across the system.
 */
const CASE_ID_RE = /^(C|CASE)-\d+$/i;

const validators = {
    type(v) {
        if (!v) return "Lead type is required.";
        return null;
    },

    severity(v) {
        if (!v) return "Severity is required.";
        return null;
    },

    description(v) {
        if (!v || !v.trim())        return "Description is required.";
        if (v.trim().length > 2000) return "Description must be 2 000 characters or fewer.";
        return null;
    },

    nextStep(v) {
        if (!v || !v.trim())        return "Next recommended step is required.";
        if (v.trim().length > 1000) return "Next step must be 1 000 characters or fewer.";
        return null;
    },

    /**
     * Optional — only validate when the user has typed something.
     * Accepts a SUS-XXXX id OR a plain name (no digits).
     */
    suggestedSuspect(v) {
        if (!v || !v.trim()) return null;               // optional field
        const t = v.trim();
        if (SUSPECT_ID_RE.test(t)) return null;         // valid ID format
        if (DIGIT_RE.test(t))
            return "Suspect name must not contain numbers. Use a SUS-XXXX ID for formal references.";
        if (!NAME_RE.test(t))
            return "Suspect name may only contain letters, spaces, hyphens, and apostrophes.";
        return null;
    },

    /**
     * Optional — only validates length.
     */
    suspectBasis(v) {
        if (!v) return null;
        if (v.trim().length > 300) return "Suspect basis must be 300 characters or fewer.";
        return null;
    },

    /**
     * Optional — must match C-<digits> or CASE-<digits> when provided.
     */
    similarCaseId(v) {
        if (!v || !v.trim()) return null;               // optional field
        if (!CASE_ID_RE.test(v.trim()))
            return "Case ID format must be C-XXXX or CASE-XXXX (e.g. C-2040).";
        return null;
    },

    weaponPattern(v) {
        if (!v) return null;
        if (v.trim().length > 200) return "Weapon/pattern note must be 200 characters or fewer.";
        return null;
    },

    locationArea(v) {
        if (!v) return null;
        if (v.trim().length > 200) return "Location/area must be 200 characters or fewer.";
        return null;
    },
};

/** Run every validator and return an error map. Empty map = all valid. */
const runValidation = (form) => {
    const e = {};
    const push = (k, msg) => { if (msg) e[k] = msg; };
    push("type",             validators.type(form.type));
    push("severity",         validators.severity(form.severity));
    push("description",      validators.description(form.description));
    push("nextStep",         validators.nextStep(form.nextStep));
    push("suggestedSuspect", validators.suggestedSuspect(form.suggestedSuspect));
    push("suspectBasis",     validators.suspectBasis(form.suspectBasis));
    push("similarCaseId",    validators.similarCaseId(form.similarCaseId));
    push("weaponPattern",    validators.weaponPattern(form.weaponPattern));
    push("locationArea",     validators.locationArea(form.locationArea));
    return e;
};

// ─────────────────────────────────────────────────────────────────────────────
// Default form shape
// ─────────────────────────────────────────────────────────────────────────────

const emptyForm = () => ({
    type:             "",
    severity:         "",
    description:      "",
    suggestedSuspect: "",
    suspectBasis:     "",
    similarCaseId:    "",
    weaponPattern:    "",
    locationArea:     "",
    nextStep:         "",
    source:           "Manual Entry",
    confidence:       "50",
});

// ─────────────────────────────────────────────────────────────────────────────
// Lead builder (unchanged shape — parent translates to POST body)
// ─────────────────────────────────────────────────────────────────────────────

const buildLead = (form, caseId) => ({
    id:               "Auto Generated",
    caseId,
    eventSource:      EVENT_SOURCE.MANUAL,
    type:             form.type,
    severity:         form.severity,
    description:      form.description,
    suggestedSuspect: form.suggestedSuspect || null,
    suspectBasis:     form.suspectBasis     || "",
    similarCaseId:    form.similarCaseId    || "",
    weaponPattern:    form.weaponPattern    || "",
    locationArea:     form.locationArea     || "",
    nextStep:         form.nextStep,
    source:           form.source           || "Manual Entry",
    confidence:       Number(form.confidence) || null,
    status:           "New",
    editable:         true,
    dismissable:      true,
    generatedAt:      new Date().toISOString(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Primitive field components (unchanged)
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
// AddLeadDialog
// ─────────────────────────────────────────────────────────────────────────────

export default function AddLeadDialog({
    isOpen,
    onClose,
    onSubmit,
    caseId      = "",
    initialData = null,
}) {
    const closeButtonRef = useRef(null);

    const [form,        setForm]        = useState(emptyForm);
    const [errors,      setErrors]      = useState({});
    const [touched,     setTouched]     = useState({});    // fields the user has interacted with
    const [showAll,     setShowAll]     = useState(false); // reveal all errors on failed submit
    const [saving,      setSaving]      = useState(false);
    const [submitted,   setSubmitted]   = useState(false);
    const [submitError, setSubmitError] = useState(null);

    const isUpdate = !!initialData;

    // ── Reset / pre-populate ────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        if (initialData) {
            setForm({
                type:             initialData.type             || "",
                severity:         initialData.severity         || "",
                description:      initialData.description      || "",
                suggestedSuspect:
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
        setTouched({});
        setShowAll(false);
        setSaving(false);
        setSubmitted(false);
        setSubmitError(null);
    }, [isOpen, initialData]);

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

    // ── Auto-clear stale submit error on any form change ────────────────────
    useEffect(() => {
        if (submitError) setSubmitError(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form]);

    // ─────────────────────────────────────────────────────────────────────────
    // Field helpers
    // ─────────────────────────────────────────────────────────────────────────

    /** Generic onChange — marks touched, re-validates that field live. */
    const setField = (k) => (e) => {
        const val = e.target.value;
        setForm((f) => ({ ...f, [k]: val }));
        setTouched((t) => ({ ...t, [k]: true }));
        const msg = validators[k]?.(val) ?? null;
        setErrors((er) => ({ ...er, [k]: msg }));
    };

    /** onBlur — marks touched without changing the value. */
    const touchField = (k) => () =>
        setTouched((t) => ({ ...t, [k]: true }));

    /** Returns visible error for a field: only after touch or a failed submit. */
    const errorFor = (k) => (touched[k] || showAll) ? errors[k] || null : null;

    // ─────────────────────────────────────────────────────────────────────────
    // Close
    // ─────────────────────────────────────────────────────────────────────────

    const handleClose = () => {
        if (saving) return;
        setForm(emptyForm());
        setErrors({});
        setTouched({});
        setShowAll(false);
        setSubmitted(false);
        setSubmitError(null);
        onClose?.();
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Submit
    // ─────────────────────────────────────────────────────────────────────────

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Guard 1 — double-submit
        if (saving) return;

        // Guard 2 — full validation; reveal all errors at once
        const errs = runValidation(form);
        setErrors(errs);

        if (Object.keys(errs).length) {
            setShowAll(true);
            setSubmitError("Please fix the highlighted fields before saving.");
            return;
        }

        // Guard 3 — proceed
        setSaving(true);
        setSubmitError(null);
        setShowAll(false);

        try {
            const lead   = buildLead(form, caseId);
            if (isUpdate && initialData?.id) lead.id = initialData.id;

            const result = await onSubmit?.({ caseId, leads: [lead] });

            if (result === false) {
                setSubmitError("Save failed. Please try again or check the notification for details.");
                return;
            }
            setSubmitted(true);
        } catch (err) {
            console.error("AddLead submit error:", err);
            setSubmitError(err?.message || "Save failed. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Derived display values
    // ─────────────────────────────────────────────────────────────────────────

    const confidenceNum   = Number(form.confidence);
    const confidenceColor =
        confidenceNum >= 80 ? "bg-emerald-500"
        : confidenceNum >= 50 ? "bg-amber-400"
        : "bg-red-400";

    if (!isOpen) return null;

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

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
                {/* ── Header ────────────────────────────────────────────── */}
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
                        className="p-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 cursor-pointer
                                   focus:outline-none focus:ring-2 focus:ring-white transition-colors
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Close dialog"
                    >
                        <X className="h-5 w-5" aria-hidden />
                    </button>
                </div>

                {/* ── Success screen ────────────────────────────────────── */}
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
                                        setErrors({});
                                        setTouched({});
                                        setShowAll(false);
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
                    /* ── Form ─────────────────────────────────────────────── */
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

                            {/* Submit-level error banner */}
                            {submitError && (
                                <div
                                    role="alert"
                                    className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2"
                                >
                                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                                    <p className="text-xs text-red-700 leading-relaxed flex-1">
                                        {submitError}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setSubmitError(null)}
                                        className="text-red-500 hover:text-red-700 cursor-pointer"
                                        aria-label="Dismiss error"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* ── Type + Severity ───────────────────────── */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FieldLabel label="Lead Type" required error={errorFor("type")}>
                                    <Select
                                        options={LEAD_TYPES}
                                        value={form.type}
                                        onChange={setField("type")}
                                        error={errorFor("type")}
                                        placeholder="Select lead type…"
                                    />
                                </FieldLabel>
                                <FieldLabel label="Severity" required error={errorFor("severity")}>
                                    <Select
                                        options={SEVERITIES}
                                        value={form.severity}
                                        onChange={setField("severity")}
                                        error={errorFor("severity")}
                                        placeholder="Select severity…"
                                    />
                                </FieldLabel>
                            </div>

                            {/* ── Description ───────────────────────────── */}
                            <FieldLabel label="Description" required error={errorFor("description")}>
                                <Textarea
                                    rows={4}
                                    value={form.description}
                                    onChange={setField("description")}
                                    onBlur={touchField("description")}
                                    placeholder="Describe what was observed, learned, or hypothesized…"
                                    error={errorFor("description")}
                                    maxLength={2000}
                                />
                                {form.description.length > 0 && (
                                    <span className={`mt-1 block text-right text-[10px]
                                        ${form.description.length > 1800 ? "text-amber-600" : "text-slate-400"}`}>
                                        {form.description.length} / 2000
                                    </span>
                                )}
                            </FieldLabel>

                            {/* ── Optional context ──────────────────────── */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                {/* Suggested Suspect — name or SUS-XXXX */}
                                <FieldLabel
                                    label="Suggested Suspect"
                                    hint="Name or SUS-XXXX ID"
                                    error={errorFor("suggestedSuspect")}
                                >
                                    <Input
                                        value={form.suggestedSuspect}
                                        onChange={setField("suggestedSuspect")}
                                        onBlur={touchField("suggestedSuspect")}
                                        placeholder="e.g. Zafar Iqbal or SUS-0041"
                                        error={errorFor("suggestedSuspect")}
                                    />
                                </FieldLabel>

                                {/* Suspect Basis */}
                                <FieldLabel
                                    label="Suspect Basis"
                                    hint="Why this person?"
                                    error={errorFor("suspectBasis")}
                                >
                                    <Input
                                        value={form.suspectBasis}
                                        onChange={setField("suspectBasis")}
                                        onBlur={touchField("suspectBasis")}
                                        placeholder="e.g. Same MO, same area"
                                        error={errorFor("suspectBasis")}
                                        maxLength={300}
                                    />
                                </FieldLabel>

                                {/* Similar Case ID */}
                                <FieldLabel
                                    label="Similar Case"
                                    hint="Format: C-XXXX"
                                    error={errorFor("similarCaseId")}
                                >
                                    <Input
                                        value={form.similarCaseId}
                                        onChange={setField("similarCaseId")}
                                        onBlur={touchField("similarCaseId")}
                                        placeholder="e.g. C-2040"
                                        error={errorFor("similarCaseId")}
                                    />
                                </FieldLabel>

                                {/* Source */}
                                <FieldLabel label="Source" hint="Where did this lead come from?">
                                    <Select
                                        options={SOURCES}
                                        value={form.source}
                                        onChange={setField("source")}
                                    />
                                </FieldLabel>

                                {/* Weapon / Pattern */}
                                <FieldLabel
                                    label="Weapon / Pattern"
                                    hint="Optional"
                                    error={errorFor("weaponPattern")}
                                >
                                    <Input
                                        value={form.weaponPattern}
                                        onChange={setField("weaponPattern")}
                                        onBlur={touchField("weaponPattern")}
                                        placeholder="e.g. Pistol, similar MO"
                                        error={errorFor("weaponPattern")}
                                        maxLength={200}
                                    />
                                </FieldLabel>

                                {/* Location / Area */}
                                <FieldLabel
                                    label="Location / Area"
                                    hint="Optional"
                                    error={errorFor("locationArea")}
                                >
                                    <Input
                                        value={form.locationArea}
                                        onChange={setField("locationArea")}
                                        onBlur={touchField("locationArea")}
                                        placeholder="e.g. Gulshan-e-Iqbal"
                                        error={errorFor("locationArea")}
                                        maxLength={200}
                                    />
                                </FieldLabel>
                            </div>

                            {/* ── Next Step ─────────────────────────────── */}
                            <FieldLabel
                                label="Next Recommended Step"
                                required
                                error={errorFor("nextStep")}
                            >
                                <Textarea
                                    rows={3}
                                    value={form.nextStep}
                                    onChange={setField("nextStep")}
                                    onBlur={touchField("nextStep")}
                                    placeholder="What should be done next on this lead?"
                                    error={errorFor("nextStep")}
                                    maxLength={1000}
                                />
                                {form.nextStep.length > 0 && (
                                    <span className={`mt-1 block text-right text-[10px]
                                        ${form.nextStep.length > 900 ? "text-amber-600" : "text-slate-400"}`}>
                                        {form.nextStep.length} / 1000
                                    </span>
                                )}
                            </FieldLabel>

                            {/* ── Confidence slider ─────────────────────── */}
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

                        {/* ── Sticky footer ─────────────────────────────── */}
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
                                aria-busy={saving}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-deep-ocean text-white text-sm
                                           hover:bg-deep-ocean/90 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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