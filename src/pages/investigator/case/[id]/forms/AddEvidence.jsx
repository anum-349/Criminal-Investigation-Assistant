/**
 * src/pages/investigator/case/[id]/forms/AddEvidence.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal wrapping StepEvidence. Handles ADD and UPDATE modes.
 *
 * HCI / business-logic guards added
 * ──────────────────────────────────
 * 1. Double-submit prevention  — `saving` flag + disabled attribute on the
 *    submit button; early-return if a submission is already in progress.
 *
 * 2. Required-field validation — delegates to StepEvidence's imperative
 *    `stepRef.validate()` which triggers inline errors on every card.
 *
 * 3. Unsaved-card guard        — if any EvidenceCard is still open (edit
 *    mode), submission is blocked with a clear contextual message telling
 *    the user to save or discard open cards first.
 *
 * 4. Minimum-item guard        — "Add at least one evidence item" remains.
 *
 * 5. Error auto-clear          — the inline error banner disappears as soon
 *    as the user modifies the form (via formData change), so stale error
 *    messages don't linger.
 */

import { useState, useRef, useEffect } from "react";
import { Camera, Save, X, AlertCircle, Loader2 } from "lucide-react";
import { StepEvidence } from "@/pages/form/case-forms/step-evidence/page";

export default function AddEvidenceDialog({
    isOpen,
    onClose,
    onSubmit,
    caseId      = "",
    initialData = null,
}) {
    const closeButtonRef = useRef(null);
    const stepRef        = useRef(null);  // ref to StepEvidence imperative API

    const [formData,  setFormData]  = useState({ evidences: [] });
    const [submitted, setSubmitted] = useState(false);
    const [saving,    setSaving]    = useState(false);
    const [error,     setError]     = useState(null);
    const [warning,   setWarning]   = useState(null);

    const isUpdate = !!initialData;

    // ── Reset / pre-populate when dialog opens ──────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        setFormData(
            initialData
                ? { evidences: [{ ...initialData, id: initialData.id ?? crypto.randomUUID() }] }
                : { evidences: [] },
        );
        setSubmitted(false);
        setError(null);
        setWarning(null);
        setSaving(false);
    }, [isOpen, initialData]);

    // ── Focus trap — close button on open ───────────────────────────────────
    useEffect(() => {
        if (isOpen) closeButtonRef.current?.focus();
    }, [isOpen]);

    // ── Esc key closes (unless mid-save) ────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => { if (e.key === "Escape" && !saving) handleClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, saving]);

    // ── Auto-clear stale error when the user modifies the form ──────────────
    useEffect(() => {
        if (error) setError(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData]);

    // ── Close helper ────────────────────────────────────────────────────────
    const handleClose = () => {
        if (saving) return;
        setFormData({ evidences: [] });
        setSubmitted(false);
        setError(null);
        setWarning(null);
        onClose?.();
    };

    // ── Submit ───────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e?.preventDefault?.();

        // Guard 1 — double-submit prevention
        if (saving) return;

        // Guard 2 — minimum one item
        const list = formData.evidences || [];
        if (!list.length) {
            setError("Add at least one evidence item before submitting.");
            return;
        }

        // Guard 3 — unsaved (open) cards
        if (stepRef.current?.hasOpenCards?.()) {
            setError(
                "You have unsaved evidence items open. " +
                "Click 'Save' on each card to confirm your edits, then submit.",
            );
            return;
        }

        // Guard 4 — field validation (triggers inline errors on each card)
        const fieldsOk = stepRef.current?.validate?.() ?? true;
        if (!fieldsOk) {
            setError("Some evidence items have errors. Review the highlighted fields above.");
            return;
        }

        // ── All guards passed — proceed ─────────────────────────────────────
        setSaving(true);
        setError(null);
        setWarning(null);

        try {
            const result = await onSubmit?.({
                caseId,
                evidences:  formData.evidences,
                isUpdate,
                initialId:  initialData?.id || null,
            });

            // Normalise success / failure signals
            const ok =
                result === undefined       ? true
                : typeof result === "object" && result !== null ? !!result.ok
                : !!result;

            if (!ok) {
                const detail =
                    (result && typeof result === "object" && result.error) ||
                    "Save failed. Please try again.";
                setError(detail);
                return;
            }

            // Surface non-fatal photo-upload failures
            if (result?.photo_failures?.length) {
                const names = result.photo_failures.map((f) => f.photoName).join(", ");
                setWarning(
                    `Saved, but ${result.photo_failures.length} attachment(s) could not be uploaded: ${names}`,
                );
            }

            setSubmitted(true);
        } catch (err) {
            console.error("AddEvidence submit error:", err);
            setError(err?.message || "Save failed. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-evidence-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div className="absolute inset-0 bg-black/50" aria-hidden />
            <div
                className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Header ───────────────────────────────────────────────── */}
                <div className="sticky top-0 z-10 bg-[#14374E] px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                            <Camera className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <h2 id="add-evidence-title" className="text-base font-semibold text-white">
                                {isUpdate ? "Update Evidence" : "Add Evidence"}
                            </h2>
                            {caseId && (
                                <p className="text-xs text-white/60">
                                    Case: {caseId}
                                    {isUpdate && initialData?.evidenceId
                                        ? ` · ${initialData.evidenceId}`
                                        : ""}
                                </p>
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

                {submitted ? (
                    /* ── Success screen ──────────────────────────────────── */
                    <div className="px-6 py-16 text-center space-y-4">
                        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                            <Camera className="h-7 w-7 text-emerald-600" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800">
                            {isUpdate ? "Evidence Updated" : "Evidence Submitted"}
                        </h3>
                        <p className="text-slate-500 text-sm">
                            {isUpdate
                                ? `Evidence ${initialData?.evidenceId || initialData?.id} has been updated successfully.`
                                : (
                                    <>
                                        {formData.evidences.length} item(s) linked to case{" "}
                                        <span className="font-semibold text-slate-700">{caseId}</span>
                                    </>
                                )}
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
                                        setFormData({ evidences: [] });
                                        setSubmitted(false);
                                        setError(null);
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
                    /* ── Form ─────────────────────────────────────────────── */
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="px-6 py-5 space-y-4">
                            {error && (
                                <div
                                    role="alert"
                                    className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs"
                                >
                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* StepEvidence receives a ref for imperative validation */}
                            <StepEvidence
                                ref={stepRef}
                                data={formData}
                                setData={setFormData}
                            />
                        </div>

                        {/* ── Sticky footer ─────────────────────────────── */}
                        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
                            <p className="text-xs text-slate-400">
                                {isUpdate
                                    ? "Editing 1 evidence row"
                                    : `${formData.evidences.length} item(s) ready to submit`}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    disabled={saving}
                                    className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !formData.evidences?.length}
                                    aria-busy={saving}
                                    className="px-4 py-2 rounded-lg bg-deep-ocean text-white text-sm font-medium
                                               hover:bg-deep-ocean/90 cursor-pointer
                                               disabled:opacity-40 disabled:cursor-not-allowed
                                               flex items-center gap-2"
                                >
                                    {saving
                                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                                        : <><Save className="h-4 w-4" /> {isUpdate ? "Save Changes" : "Submit Evidence"}</>}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}