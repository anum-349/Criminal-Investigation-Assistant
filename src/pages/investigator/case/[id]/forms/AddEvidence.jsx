/**
 * src/pages/investigator/case/[id]/forms/AddEvidence.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal that wraps StepEvidence. Handles BOTH:
 *
 *   • Add mode    — `initialData` is null. The user can stack multiple
 *                   evidence items in one go; on submit they're all POSTed
 *                   to /api/investigator/cases/{caseId}/evidences with
 *                   their photos uploaded one-by-one afterwards.
 *
 *   • Update mode — `initialData` is a row from CaseEvidenceRow. The form
 *                   shows that single row pre-populated; on submit we
 *                   PATCH the editable fields and POST any net-new photos.
 *
 * Contract with the parent (case detail page / CaseEvidence.jsx):
 *   onSubmit({ caseId, evidences, isUpdate, initialId })
 *     → must return a Promise resolving to:
 *         { ok: true,  ... }  → flips dialog to success screen
 *         { ok: false, error } → keeps dialog open, shows inline error
 *     (For backwards compat we also accept truthy/falsy/undefined the
 *     same way the AddLead dialog does.)
 *
 * Why we don't call the API directly here:
 *   The case-detail page tracks stats and the timeline event list. After a
 *   successful POST, it needs the response's `timeline_events` and
 *   `created_ids` to incrementally update those without a re-fetch. Routing
 *   the call through the parent keeps that wiring obvious.
 */

import { useState, useRef, useEffect } from "react";
import { Camera, Save, X, AlertCircle, Loader2 } from "lucide-react";
import StepEvidence from "@/pages/form/case-forms/step-evidence/page";

export default function AddEvidenceDialog({
  isOpen,
  onClose,
  onSubmit,
  caseId = "",
  initialData = null,
}) {
  const closeButtonRef = useRef(null);
  const [formData, setFormData] = useState({ evidences: [] });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);

  const isUpdate = !!initialData;

  // Pre-populate when opened for update; reset when opened for add.
  useEffect(() => {
    if (!isOpen) return;
    setFormData(
      initialData
        ? { evidences: [{ ...initialData, id: initialData.id ?? crypto.randomUUID() }] }
        : { evidences: [] }
    );
    setSubmitted(false);
    setError(null);
    setSaving(false);
  }, [isOpen, initialData]);

  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus();
  }, [isOpen]);

  // Esc closes — but never mid-save.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape" && !saving) handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, saving]);

  const handleClose = () => {
    if (saving) return;
    setFormData({ evidences: [] });
    setSubmitted(false);
    setError(null);
    onClose?.();
  };

  // Minimal client-side validation. The backend re-checks everything;
  // this is just to avoid a round-trip when the form is empty.
  const validate = () => {
    const list = formData.evidences || [];
    if (!list.length) return "Add at least one evidence item.";
    for (let i = 0; i < list.length; i++) {
      const ev = list[i];
      if (!ev.type) return `Evidence #${i + 1}: type is required.`;
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

    try {
      const result = await onSubmit?.({
        caseId,
        evidences: formData.evidences,
        isUpdate,
        initialId: initialData?.id || null,
      });

      // Accept several success signals so callers can stay flexible:
      //   { ok: true }    → success
      //   { ok: false }   → failure (must include `error`)
      //   true / undefined → success (legacy)
      //   false           → failure
      const ok = result === undefined ? true
               : typeof result === "object" && result !== null ? !!result.ok
               : !!result;

      if (!ok) {
        const detail = (result && typeof result === "object" && result.error) || "Save failed.";
        setError(detail);
        return;
      }

      // Surface any non-fatal photo upload failures the parent collected.
      if (result?.photo_failures?.length) {
        const names = result.photo_failures.map(f => f.photoName).join(", ");
        setError(`Saved, but ${result.photo_failures.length} photo(s) failed to upload: ${names}`);
        // Still flip to success — the rows themselves are saved.
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
              {caseId && (
                <p className="text-xs text-white/60">
                  Case: {caseId}{isUpdate && initialData?.evidenceId ? ` · ${initialData.evidenceId}` : ""}
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
          // ── Success screen ──────────────────────────────────────────────
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
                : `${formData.evidences.length} item(s) linked to case `}
              {!isUpdate && <span className="font-semibold text-slate-700">{caseId}</span>}
            </p>
            {error && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 inline-block">
                Note: {error}
              </p>
            )}
            <div className="flex gap-3 justify-center pt-1">
              {!isUpdate && (
                <button
                  onClick={() => { setFormData({ evidences: [] }); setSubmitted(false); setError(null); }}
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
          // ── Form ────────────────────────────────────────────────────────
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <StepEvidence data={formData} setData={setFormData} />
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                {isUpdate ? "Editing 1 evidence row" : `${formData.evidences.length} item(s) ready to submit`}
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
                  className="px-4 py-2 rounded-lg bg-deep-ocean text-white text-sm font-medium hover:bg-deep-ocean/90 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
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