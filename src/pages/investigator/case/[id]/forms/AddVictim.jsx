import { useState, useRef, useEffect } from "react";
import { User, Save, X, AlertCircle, Loader2 } from "lucide-react";
import StepVictims, { validateVictims } from "@/pages/form/case-forms/step-victim/page";

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
    const [saving, setSaving] = useState(false);
    const [validationErrors, setValidationErrors] = useState([]);  // ← was never declared
    const [warning, setWarning] = useState(null);

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
                        caseType: initialData.caseType || caseType,
                        id: initialData.id ?? crypto.randomUUID(),
                    }],
                }
                : { caseType, victims: [] }
        );
        setSubmitted(false);
        setValidationErrors([])
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
        setValidationErrors([]);
        setWarning(null);
        onClose?.();
    };

    const handleSubmit = async (e) => {
        e?.preventDefault?.();
        if (saving) return;

        const allErrors = formData.victims.map(validateVictims);
        const hasErrors = allErrors.some(e => Object.keys(e).length > 0);
        if (hasErrors) {
            setValidationErrors(allErrors);   // ← passed down to StepWitnesses
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
                console.error(detail)
                return;
            }

            if (result?.photo_failures?.length) {
                const names = result.photo_failures.map(f => f.photoName).join(", ");
                setWarning(`Saved, but ${result.photo_failures.length} photo(s) failed: ${names}`);
            }

            setSubmitted(true);
        } catch (err) {
            console.error("AddVictim submit error:", err);
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
                    <form onSubmit={handleSubmit}>
                        <div className="px-6 py-5 space-y-4">
                            <StepVictims data={formData} setData={setFormData} caseType={caseType} mode="standalone" validationErrors={validationErrors} />
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