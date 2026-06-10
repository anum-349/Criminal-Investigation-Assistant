import { useState, useRef, useEffect } from "react";
import { Users, Save, X, Loader2 } from "lucide-react";
import StepSuspects, { validateSuspect } from "@/pages/form/step-suspects/page";

export default function AddSuspectDialog({ isOpen, onClose, onSubmit, caseId = "", initialData = null }) {
    const closeButtonRef = useRef(null);
    const [formData, setFormData]           = useState({ suspects: [] });
    const [submitted, setSubmitted]         = useState(false);
    const [submitting, setSubmitting]       = useState(false);
    const [submitError, setSubmitError]     = useState(null);
    const [warning, setWarning]             = useState(null);
    const [validationErrors, setValidationErrors] = useState([]);

    const isUpdate = !!initialData;

    const rowToFormShape = (row) => row ? ({
        ...row,
        id: row.id ?? crypto.randomUUID(),
        caseId: row.caseId || caseId,
        photoUrl: row.photoUrl
            ? [{ existingPhotoId: "server", name: "photo", dataUrl: row.photoUrl }]
            : null,
        _hadPhoto: !!row.photoUrl,
    }) : null;

    useEffect(() => {
        if (isOpen) {
            setFormData(initialData
                ? { suspects: [rowToFormShape(initialData)] }
                : { suspects: [] }
            );
            setSubmitted(false);
            setSubmitting(false);
            setSubmitError(null);
            setWarning(null);
            setValidationErrors([]);
        }
    }, [isOpen, initialData, caseId]);

    useEffect(() => { if (isOpen) closeButtonRef.current?.focus(); }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => { if (e.key === "Escape") handleClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [isOpen]); // eslint-disable-line

    const handleClose = () => {
        if (submitting) return;
        setFormData({ suspects: [] });
        setSubmitted(false);
        setSubmitError(null);
        setWarning(null);
        setValidationErrors([]);
        onClose?.();
    };

    const handleSubmit = async (e) => {
        e?.preventDefault?.();
        if (submitting) return;
        if (!formData.suspects?.length) return;

        const allErrors = formData.suspects.map(validateSuspect);
        const hasErrors = allErrors.some(e => Object.keys(e).length > 0);
        if (hasErrors) { setValidationErrors(allErrors); return; }
        setValidationErrors([]);

        setSubmitting(true);
        setSubmitError(null);
        setWarning(null);

        try {
            const result = await onSubmit?.({
                caseId,
                suspects: formData.suspects,
                isUpdate,
                initialId: initialData?.id || null,
            });

            const ok = result === undefined ? true
                : typeof result === "object" ? !!result.ok : !!result;

            if (!ok) { setSubmitError(result?.error || "Save failed."); return; }

            if (result?.photo_failures?.length) {
                setWarning(`Saved, but photo(s) failed: ${result.photo_failures.map(f => f.photoName).join(", ")}`);
            }
            setSubmitted(true);
        } catch (err) {
            setSubmitError(err?.message || "Save failed.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div role="dialog" aria-modal="true" aria-labelledby="add-suspect-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div className="absolute inset-0 bg-black/50" aria-hidden />
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 z-10 bg-[#14374E] px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <h2 id="add-suspect-title" className="text-base font-semibold text-white">
                                {isUpdate ? "Update Suspect" : "Add Suspect"}
                            </h2>
                            {caseId && <p className="text-xs text-white/60">Case: {caseId}</p>}
                        </div>
                    </div>
                    <button ref={closeButtonRef} type="button" onClick={handleClose}
                        className="p-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white transition-colors"
                        aria-label="Close dialog">
                        <X className="h-5 w-5" aria-hidden />
                    </button>
                </div>

                {submitted ? (
                    <div className="px-6 py-16 text-center space-y-4">
                        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                            <Users className="h-7 w-7 text-emerald-600" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800">
                            {isUpdate ? "Suspect Updated" : "Suspect Added"}
                        </h3>
                        <p className="text-slate-500 text-sm">
                            {isUpdate
                                ? `Suspect ${initialData?.id} has been updated successfully.`
                                : <>{formData.suspects.length} suspect(s) linked to case <span className="font-semibold text-slate-700">{caseId}</span></>}
                        </p>
                        {warning && (
                            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                                {warning}
                            </p>
                        )}
                        <div className="flex gap-3 justify-center pt-1">
                            {!isUpdate && (
                                <button onClick={() => { setFormData({ suspects: [] }); setSubmitted(false); }}
                                    className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">
                                    Add More
                                </button>
                            )}
                            <button onClick={handleClose}
                                className="px-4 py-2 rounded-lg bg-deep-ocean text-white text-sm hover:bg-deep-ocean/90 cursor-pointer">
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="px-6 py-5">
                            <StepSuspects
                                data={formData}
                                setData={setFormData}
                                mode="standalone"
                                caseId={caseId}
                                validationErrors={validationErrors}
                            />
                        </div>

                        {submitError && (
                            <div className="mx-6 mb-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                                {submitError}
                            </div>
                        )}

                        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
                            <p className="text-xs text-slate-400">
                                {isUpdate ? `Editing: ${initialData?.id}` : `${formData.suspects?.length || 0} suspect(s) added`}
                            </p>
                            <div className="flex gap-3">
                                <button type="button" onClick={handleClose} disabled={submitting}
                                    className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer transition-colors">
                                    Cancel
                                </button>
                                <button type="submit"
                                    disabled={submitting || !formData.suspects?.length}
                                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-deep-ocean text-white text-sm font-medium hover:bg-deep-ocean/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                                    {submitting
                                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                                        : <><Save className="h-4 w-4" /> {isUpdate ? "Save Changes" : "Add Suspect"}</>}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}