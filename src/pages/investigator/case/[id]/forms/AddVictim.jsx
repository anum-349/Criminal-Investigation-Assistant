/**
 * src/pages/investigator/case/[id]/forms/AddVictim.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal that wraps StepVictims. Two modes:
 *
 *   • Add mode    — `initialData` null. Add multiple victims at once;
 *                   submitted in a single bulk-POST, photos uploaded as
 *                   follow-ups.
 *
 *   • Update mode — `initialData` is a victim form-shape (from
 *                   detailToFormShape() in victimApi). The dialog shows
 *                   that one victim pre-populated; on submit we PATCH +
 *                   upload net-new photos.
 *
 * Contract with parent (CaseVictims.jsx):
 *   onSubmit({ caseId, victims, isUpdate, initialId })
 *     → must return Promise<{ ok, error?, photo_failures? }>.
 *   Anything not-`{ ok: false, error }` is treated as success.
 */

import { useState, useRef, useEffect } from "react";
import { User, Save, X, AlertCircle, Loader2 } from "lucide-react";
import StepVictims from "@/pages/form/case-forms/step-victim/page";

export default function AddVictimDialog({
    isOpen,
    onClose,
    onSubmit,
    caseId = "",
    caseType = "",            // ← passed in from CaseVictims so the form
    initialData = null,
}) {
    const closeButtonRef = useRef(null);
    const [formData, setFormData] = useState({ victims: [] });
    const [submitted, setSubmitted] = useState(false);
    const [saving, setSaving]     = useState(false);
    const [error, setError]       = useState(null);
    const [warning, setWarning]   = useState(null);

    const isUpdate = !!initialData;

    // Pre-populate when opened for update; reset for add.
    useEffect(() => {
        if (!isOpen) return;
        setFormData(
            initialData
                ? {
                    // caseType from parent flows into form-level state so
                    // StepVictims can read it via `data.caseType`.
                    caseType,
                    victims: [{
                        ...initialData,
                        // Inherit incoming caseType too — the row's own value wins
                        // if it already had one (e.g. populated from the API).
                        caseType: initialData.caseType || caseType,
                        id: initialData.id ?? crypto.randomUUID(),
                    }],
                }
                : { caseType, victims: [] }
        );
        setSubmitted(false);
        setError(null);
        setWarning(null);
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

    const handleClose = () => {
        if (saving) return;
        setFormData({ caseType, victims: [] });
        setSubmitted(false);
        setError(null);
        setWarning(null);
        onClose?.();
    };

    const validate = () => {
        const list = formData.victims || [];
        if (!list.length) return "Add at least one victim.";
        for (let i = 0; i < list.length; i++) {
            const v = list[i];
            if (!v.name?.trim()) return `Victim #${i + 1}: name is required.`;
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e?.preventDefault?.();
        if (saving) return;

        const v = validate();
        if (v) { setError(v); return; }

        setSaving(true);
        setError(null);
        setWarning(null);

        try {
            const result = await onSubmit?.({
                caseId,
                victims:   formData.victims,
                isUpdate,
                initialId: initialData?.id || null,
            });

            const ok = result === undefined ? true
                : typeof result === "object" && result !== null ? !!result.ok
                : !!result;

            if (!ok) {
                const detail = (result && typeof result === "object" && result.error) || "Save failed.";
                setError(detail);
                return;
            }

            if (result?.photo_failures?.length) {
                const names = result.photo_failures.map(f => f.photoName).join(", ");
                setWarning(`Saved, but ${result.photo_failures.length} photo(s) failed: ${names}`);
            }

            setSubmitted(true);
        } catch (err) {
            console.error("AddVictim submit error:", err);
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
                                    {isUpdate && initialData?.victimId ? ` · ${initialData.victimId}` : ""}
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
                                ? `Victim ${initialData?.victimId || initialData?.id} updated.`
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
                                        setError(null); setWarning(null);
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
                    <form onSubmit={handleSubmit}>
                        <div className="px-6 py-5 space-y-4">
                            {error && (
                                <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">
                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}
                            <StepVictims data={formData} setData={setFormData} caseType={caseType} mode="standalone" />
                        </div>

                        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
                            <p className="text-xs text-slate-400">
                                {isUpdate ? "Editing 1 victim" : `${formData.victims.length} victim(s) ready to submit`}
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