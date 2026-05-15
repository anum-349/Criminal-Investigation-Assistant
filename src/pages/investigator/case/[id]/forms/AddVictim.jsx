// src/pages/investigator/case/[id]/forms/AddVictim.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Modal wrapping StepVictims. Handles ADD and UPDATE modes.
//
// What this version fixes
// ───────────────────────
// 1. Silent submit failure — a visible error banner now lists every
//    validation issue, scrolled into view automatically. Same banner
//    shape used for server errors.
//
// 2. Update with backend-shaped data — `initialData` from CaseVictims is
//    the nested VictimDetail (personal.name, incident.causeOfDeath, etc).
//    The dialog auto-flattens it via flattenInitialData() so StepVictims
//    receives the flat shape it actually reads.
//
// 3. Update-mode validation is lenient — only enforces FORMAT, never
//    "required." Editing one field and clicking Save now works.
//
// 4. The form lazily fills `gender` / `caseType` from the parent's
//    fallback values so a backend record missing those fields doesn't
//    block the user.
//
// 5. console.warn logs the raw validation errors so you can debug
//    quickly when something does get blocked.

import { useState, useRef, useEffect, useMemo } from "react";
import { User, Save, X, AlertCircle, Loader2 } from "lucide-react";
import StepVictims, { validateVictims } from "@/pages/form/case-forms/step-victim/page";
import { detailToFormShape } from "@/services/victimApi";

// ── Pretty labels for the error banner ─────────────────────────────────────
const ERROR_LABELS = {
    primaryLabel:       "Primary Label",
    name:               "Name",
    cnic:               "CNIC",
    contact:            "Contact",
    age:                "Age",
    gender:             "Gender",
    address:            "Address",
    photoUrl:           "Photo",
    status:             "Status",
    caseType:           "Case Type",
    injuryType:         "Injury Type",
    natureOfInjuries:   "Nature of Injuries",
    causeOfDeath:       "Cause of Death",
    declaredDead:       "Declared Dead By",
    postmortemAutopsy:  "Postmortem / Autopsy",
    threatLevel:        "Threat Level",
    protectionAssigned: "Protection Assigned",
    statement:          "Statement",
    nextFollowUp:       "Follow-Up Date",
    form:               "Form",
};

const prettifyKey = (k) => {
    if (ERROR_LABELS[k]) return ERROR_LABELS[k];
    if (k.startsWith("timeline_")) {
        const [, i, f] = k.split("_");
        return `Timeline ${Number(i) + 1} — ${f}`;
    }
    if (k.startsWith("legal_")) {
        const [, i] = k.split("_");
        return `Legal milestone ${Number(i) + 1}`;
    }
    if (k.startsWith("forensic_")) {
        const [, i] = k.split("_");
        return `Forensic finding ${Number(i) + 1}`;
    }
    return k;
};

// ── Detect whether initialData is the backend's nested shape ───────────
// CaseVictims passes whatever the GET /victims/{id} endpoint returned —
// that has `personal`, `incident`, `protection` keys. The wizard passes
// the flat shape from StepVictims. We accept both.
const looksLikeBackendDetail = (d) =>
    !!d && (
        typeof d.personal === "object" ||
        typeof d.incident === "object" ||
        typeof d.protection === "object"
    );

const flattenInitialData = (d, caseTypeFallback = "") => {
    if (!d) return null;
    if (looksLikeBackendDetail(d)) {
        const flat = detailToFormShape(d) || {};
        if (!flat.caseType && caseTypeFallback) flat.caseType = caseTypeFallback;
        return flat;
    }
    if (!d.caseType && caseTypeFallback) {
        return { ...d, caseType: caseTypeFallback };
    }
    return d;
};

export default function AddVictimDialog({
    isOpen,
    onClose,
    onSubmit,
    caseId = "",
    caseType = "",
    initialData = null,
}) {
    const closeButtonRef = useRef(null);
    const errorBannerRef = useRef(null);

    const [formData, setFormData]                 = useState({ victims: [] });
    const [submitted, setSubmitted]               = useState(false);
    const [saving, setSaving]                     = useState(false);
    const [validationErrors, setValidationErrors] = useState([]);
    const [warning, setWarning]                   = useState(null);
    const [serverError, setServerError]           = useState(null);

    const isUpdate = !!initialData;

    const flatErrors = useMemo(() => {
        const flat = [];
        validationErrors.forEach((errs, i) => {
            if (!errs) return;
            Object.entries(errs).forEach(([k, msg]) => {
                flat.push({ victimIdx: i, label: prettifyKey(k), message: msg });
            });
        });
        return flat;
    }, [validationErrors]);

    useEffect(() => {
        if (!isOpen) return;
        const flat = flattenInitialData(initialData, caseType);
        setFormData(
            flat
                ? {
                    caseType,
                    victims: [{
                        ...flat,
                        caseType: flat.caseType || caseType,
                        id: flat.id ?? crypto.randomUUID(),
                    }],
                }
                : { caseType, victims: [] }
        );
        setSubmitted(false);
        setValidationErrors([]);
        setWarning(null);
        setServerError(null);
        setSaving(false);
    }, [isOpen, initialData, caseType]);

    useEffect(() => {
        if (isOpen) closeButtonRef.current?.focus();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => { if (e.key === "Escape" && !saving) handleClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, saving]);

    useEffect(() => {
        if (flatErrors.length > 0) {
            errorBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [flatErrors]);

    const handleClose = () => {
        if (saving) return;
        setFormData({ caseType, victims: [] });
        setSubmitted(false);
        setValidationErrors([]);
        setWarning(null);
        setServerError(null);
        onClose?.();
    };

    const handleSubmit = async (e) => {
        e?.preventDefault?.();
        if (saving) return;

        setServerError(null);

        if (!formData.victims?.length) {
            setValidationErrors([{ form: "Add at least one victim before saving." }]);
            return;
        }

        // ── KEY CHANGE ─────────────────────────────────────────────────────
        // Run validation in the appropriate mode. Update mode skips all
        // "required" rules so users can edit one field at a time.
        const mode = isUpdate ? "update" : "create";
        const allErrors = formData.victims.map(v => validateVictims(v, { mode }));
        const hasErrors = allErrors.some(e => Object.keys(e).length > 0);

        if (hasErrors) {
            console.warn(`Victim validation failed (mode=${mode}):`, allErrors);
            setValidationErrors(allErrors);
            return;
        }
        setValidationErrors([]);

        setSaving(true);
        setWarning(null);

        try {
            const result = await onSubmit?.({
                caseId,
                victims: formData.victims,
                isUpdate,
                initialId: initialData?.id || null,
            });

            const ok = result === undefined ? true
                : typeof result === "object" && result !== null ? !!result.ok
                    : !!result;

            if (!ok) {
                const detail = (result && typeof result === "object" && result.error) || "Save failed.";
                console.error("AddVictim save failed:", detail);
                setServerError(detail);
                return;
            }

            if (result?.photo_failures?.length) {
                const names = result.photo_failures.map(f => f.photoName).join(", ");
                setWarning(`Saved, but ${result.photo_failures.length} photo(s) failed: ${names}`);
            }

            setSubmitted(true);
        } catch (err) {
            console.error("AddVictim submit error:", err);
            setServerError(err?.response?.data?.detail || err?.message || "Unexpected error.");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-victim-title"
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
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <h2 id="add-victim-title" className="text-base font-semibold text-white">
                                {isUpdate ? "Update Victim" : "Add Victim"}
                            </h2>
                            {caseId && (
                                <p className="text-xs text-white/60">
                                    Case: {caseId}
                                    {caseType ? ` · ${caseType}` : ""}
                                    {isUpdate && initialData?.id ? ` · ${initialData.id}` : ""}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={handleClose}
                        disabled={saving}
                        className="p-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Close dialog"
                    >
                        <X className="h-5 w-5" aria-hidden />
                    </button>
                </div>

                {submitted ? (
                    <div className="px-6 py-16 text-center space-y-4">
                        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                            <User className="h-7 w-7 text-emerald-600" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800">
                            {isUpdate ? "Victim Updated" : "Victim Added"}
                        </h3>
                        <p className="text-slate-500 text-sm">
                            {isUpdate
                                ? `Victim ${initialData?.id} updated.`
                                : `${formData.victims.length} victim(s) linked to case ${caseId}`}
                        </p>
                        {warning && (
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 inline-block">
                                Note: {warning}
                            </p>
                        )}
                        <div className="flex gap-3 justify-center pt-1">
                            {!isUpdate && (
                                <button
                                    onClick={() => {
                                        setFormData({ caseType, victims: [] });
                                        setSubmitted(false);
                                        setWarning(null);
                                    }}
                                    className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
                                >
                                    Add More
                                </button>
                            )}
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 rounded-lg bg-deep-ocean text-white text-sm hover:bg-deep-ocean/90 cursor-pointer"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="px-6 py-5 space-y-4">

                            {flatErrors.length > 0 && (
                                <div
                                    ref={errorBannerRef}
                                    role="alert"
                                    className="rounded-md border border-red-200 bg-red-50 p-3 flex gap-3"
                                >
                                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                                    <div className="flex-1 text-xs">
                                        <p className="font-semibold text-red-800 mb-1">
                                            Please fix {flatErrors.length} issue{flatErrors.length === 1 ? "" : "s"} before saving:
                                        </p>
                                        <ul className="list-disc list-inside text-red-700 space-y-0.5">
                                            {flatErrors.slice(0, 8).map((e, i) => (
                                                <li key={i}>
                                                    {validationErrors.length > 1 && (
                                                        <span className="font-medium">
                                                            Victim {e.victimIdx + 1}:{" "}
                                                        </span>
                                                    )}
                                                    <span className="font-medium">{e.label}</span>
                                                    {" — "}
                                                    {e.message}
                                                </li>
                                            ))}
                                            {flatErrors.length > 8 && (
                                                <li className="italic text-red-600">
                                                    …and {flatErrors.length - 8} more.
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {serverError && (
                                <div
                                    role="alert"
                                    className="rounded-md border border-red-200 bg-red-50 p-3 flex gap-3"
                                >
                                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                                    <div className="flex-1 text-xs text-red-800">
                                        <p className="font-semibold mb-0.5">Save failed.</p>
                                        <p className="text-red-700">{serverError}</p>
                                    </div>
                                </div>
                            )}

                            <StepVictims
                                data={formData}
                                setData={setFormData}
                                caseType={caseType}
                                mode="standalone"
                                validationErrors={validationErrors}
                            />
                        </div>

                        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
                            <p className="text-xs text-slate-400">
                                {isUpdate
                                    ? "Editing 1 victim"
                                    : `${formData.victims.length} victim(s) ready to submit`}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button" onClick={handleClose} disabled={saving}
                                    className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !formData.victims?.length}
                                    className="px-4 py-2 rounded-lg bg-deep-ocean text-white text-sm font-medium hover:bg-deep-ocean/90 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {saving
                                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                                        : <><Save className="h-4 w-4" /> {isUpdate ? "Save Changes" : "Submit Victim"}</>}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}