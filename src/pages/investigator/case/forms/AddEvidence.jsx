import { useState, useRef, useEffect } from "react";
import { Camera, Save, X } from "lucide-react";
import StepEvidence from "../../../form/case-forms/step-evidence/page";

export default function AddEvidenceDialog({ isOpen, onClose, onSubmit, caseId = "", initialData = null }) {
    const closeButtonRef = useRef(null);
    const [formData, setFormData] = useState({ evidences: [] });
    const [submitted, setSubmitted] = useState(false);

    const isUpdate = !!initialData;

    // Pre-populate when opened for update, reset when opened for add
    useEffect(() => {
        if (isOpen) {
            setFormData(
                initialData
                    ? { evidences: [{ ...initialData, id: initialData.id ?? crypto.randomUUID() }] }
                    : { evidences: [] }
            );
            setSubmitted(false);
        }
    }, [isOpen, initialData]);

    useEffect(() => {
        if (isOpen) closeButtonRef.current?.focus();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => { if (e.key === "Escape") handleClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [isOpen]);

    const handleClose = () => {
        setFormData({ evidences: [] });
        setSubmitted(false);
        onClose();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.evidences?.length) return;
        if (onSubmit) onSubmit({ caseId, evidences: formData.evidences });
        setSubmitted(true);
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
                {/* Header */}
                <div className="sticky top-0 z-10 bg-[#14374E] px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                            <Camera className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <h2 id="add-evidence-title" className="text-base font-semibold text-white">
                                {isUpdate ? "Update Evidence" : "Add Evidence"}
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

                {/* Success state */}
                {submitted ? (
                    <div className="px-6 py-16 text-center space-y-4">
                        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                            <Camera className="h-7 w-7 text-emerald-600" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800">
                            {isUpdate ? "Evidence Updated" : "Evidence Submitted"}
                        </h3>
                        <p className="text-slate-500 text-sm">
                            {isUpdate
                                ? `Evidence ${initialData?.id} has been updated successfully.`
                                : `${formData.evidences.length} item(s) linked to case `}
                            {!isUpdate && <span className="font-semibold text-slate-700">{caseId}</span>}
                        </p>
                        <div className="flex gap-3 justify-center pt-1">
                            {!isUpdate && (
                                <button
                                    onClick={() => { setFormData({ evidences: [] }); setSubmitted(false); }}
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
                        <div className="px-6 py-5">
                            <StepEvidence data={formData} setData={setFormData} />
                        </div>

                        {/* Sticky footer */}
                        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
                            <p className="text-xs text-slate-400">
                                {isUpdate ? `Editing: ${initialData?.id}` : `${formData.evidences?.length || 0} item(s) added`}
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
                                    disabled={!formData.evidences?.length}
                                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-deep-ocean text-white text-sm font-medium hover:bg-deep-ocean/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                >
                                    <Save className="h-4 w-4" />
                                    {isUpdate ? "Save Changes" : "Add Evidence"}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}