import StepWitnesses, { validateWitness } from "@/pages/form/case-forms/step-witness/page";
import { Loader2, Save, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function AddWitnessDialog({ isOpen, onClose, onSubmit, caseId = "", initialData = null }) {
  const closeButtonRef = useRef(null);
  const [formData, setFormData] = useState({ witnesses: [] });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);   
  const [warning, setWarning] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);  

  const isUpdate = !!initialData;

  useEffect(() => {
    if (isOpen) {
      setFormData(
        initialData
          ? { witnesses: [{ ...initialData, id: initialData.id ?? crypto.randomUUID(), caseId: initialData.caseId || caseId }] }
          : { witnesses: [] }
      );
      setSubmitted(false);
      setSubmitting(false);
      setSubmitError(null);       // ← reset errors on (re)open
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
  }, [isOpen]);  // eslint-disable-line

  const handleClose = () => {
    if (submitting) return;           // ← don't close mid-submit
    setFormData({ witnesses: [] });
    setSubmitted(false);
    setSubmitError(null);             // ← was calling setError (undefined)
    setWarning(null);
    setValidationErrors([]);
    onClose?.();                      // ← was called twice before
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (submitting) return;
    if (!formData.witnesses?.length) return;

    const allErrors = formData.witnesses.map(validateWitness);
    const hasErrors = allErrors.some(e => Object.keys(e).length > 0);
    if (hasErrors) {
      setValidationErrors(allErrors);   // ← passed down to StepWitnesses
      return;
    }
    setValidationErrors([]);

    setSubmitting(true);
    setSubmitError(null);
    setWarning(null);

    try {
      const result = await onSubmit?.({
        caseId,
        witnesses: formData.witnesses,
        isUpdate,
        initialId: initialData?.id || null,
      });

      const ok = result === undefined ? true
        : typeof result === "object" ? !!result.ok
        : !!result;

      if (!ok) {
        setSubmitError(result?.error || "Save failed.");
        return;
      }

      if (result?.photo_failures?.length) {
        setWarning(`Saved, but photo(s) failed: ${result.photo_failures.map(f => f.photoName).join(", ")}`);
      }

      setSubmitted(true);    // ← show success screen; onClose called by Done button
    } catch (err) {
      setSubmitError(err?.message || "Save failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="add-witness-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden />
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#14374E] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 id="add-witness-title" className="text-base font-semibold text-white">
                {isUpdate ? "Update Witness" : "Add Witness"}
              </h2>
              {caseId && <p className="text-xs text-white/60">Case: {caseId}</p>}
            </div>
          </div>
          <button ref={closeButtonRef} type="button" onClick={handleClose}
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
              <User className="h-7 w-7 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {isUpdate ? "Witness Updated" : "Witness Added"}
            </h3>
            <p className="text-slate-500 text-sm">
              {isUpdate
                ? `Witness ${initialData?.id} has been updated successfully.`
                : <>{formData.witnesses.length} witness(es) linked to case <span className="font-semibold text-slate-700">{caseId}</span></>}
            </p>
            <div className="flex gap-3 justify-center pt-1">
              {!isUpdate && (
                <button onClick={() => { setFormData({ witnesses: [] }); setSubmitted(false); }}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
                >Add More</button>
              )}
              <button onClick={handleClose}
                className="px-4 py-2 rounded-lg bg-deep-ocean text-white text-sm hover:bg-deep-ocean/90 cursor-pointer"
              >Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="px-6 py-5">
              {/* ← pass errors down so each field can show its own message */}
              <StepWitnesses
                data={formData}
                setData={setFormData}
                mode="standalone"
                caseId={caseId}
                validationErrors={validationErrors}
              />
            </div>

            {/* Error / warning banners */}
            {submitError && (
              <div className="mx-6 mb-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {submitError}
              </div>
            )}
            {warning && (
              <div className="mx-6 mb-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
                {warning}
              </div>
            )}

            {/* Sticky footer */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                {isUpdate ? `Editing: ${initialData?.id}` : `${formData.witnesses?.length || 0} witness(es) added`}
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={handleClose} disabled={submitting}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer transition-colors"
                >Cancel</button>
                <button type="submit"
                  disabled={submitting || !formData.witnesses?.length}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-deep-ocean text-white text-sm font-medium hover:bg-deep-ocean/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  {submitting
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                    : <><Save className="h-4 w-4" /> {isUpdate ? "Save Changes" : "Add Witness"}</>
                  }
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}