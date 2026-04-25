/**
 * CaseDetailModals.jsx
 * Three modal forms used inside the Case Detail page tabs:
 *   1. AddLeadModal       — manually add an investigative lead (Leads tab)
 *   2. AddWitnessModal    — add a witness to the case (Witnesses tab)
 *   3. AddTimelineModal   — add a manual timeline event (Timeline tab)
 *
 * Place at: src/pages/investigator/case/CaseDetailModals.jsx
 *
 * ─── WHERE TO LINK ────────────────────────────────────────────────────────────
 *  Timeline  → CaseTimeline.jsx        — "Add Event" button → <AddTimelineModal>
 *  Witnesses → CaseWitnesses.jsx       — "Add Witness" button → <AddWitnessModal>
 *  Leads     → CaseInvestigationLeads — "Add Lead Manually" button → <AddLeadModal>
 *
 *  Register Case → StepUpdateNotes.jsx (Update mode step 8) — also has
 *    inline witness textarea; the modal replaces it for richer input.
 *
 * ─── TIMELINE ANSWER ──────────────────────────────────────────────────────────
 *  Your current CaseTimeline.jsx is HARDCODED mock data.
 *  The timeline is BOTH automatic (system auto-logs events like FIR filed,
 *  evidence added, status changed) AND manual (investigator adds field notes,
 *  interview events, court dates, etc.)
 *  This modal handles the MANUAL additions.
 *  Auto-events should be appended by your backend whenever a case action occurs.
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * HCI: modal trap focus, escape to close, validation feedback, optimistic UI
 */
import { useState, useEffect, useRef } from "react";
import {
  X, Brain, User, Clock, AlertCircle, CheckCircle2,
  Calendar, Tag, FileText, MapPin, Mic, Shield,
  AlertTriangle, Plus, Loader2, ChevronDown,
} from "lucide-react";
import { FieldLabel, Input, ModalShell, Overlay, SaveBtn, SelectField, TextareaField } from "../CaseFormFields/page";

// ══════════════════════════════════════════════════════════════════════════════
// 1. ADD LEAD MANUALLY MODAL
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Props:
 *   caseId   — current case ID (pre-fills the field)
 *   onClose  — close handler
 *   onSave   — callback(newLead) — add to local state in CaseLeads
 *
 * Link in CaseInvestigationLeads.jsx:
 *   Add a button: <button onClick={() => setShowAddLead(true)}>Add Lead Manually</button>
 *   Render: {showAddLead && <AddLeadModal caseId={caseId} onClose={…} onSave={…} />}
 */
export function AddLeadModal({ caseId = "C-2052", onClose, onSave }) {
  const [form, setForm] = useState({
    caseId,
    type: "",
    severity: "",
    description: "",
    suggestedSuspect: "",
    suspectBasis: "",
    similarCaseId: "",
    weaponPattern: "",
    locationArea: "",
    nextStep: "",
    source: "Manual Entry",
    confidence: "50",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => ({ ...er, [k]: "" })); };

  const validate = () => {
    const e = {};
    if (!form.type)                e.type        = "Lead type is required";
    if (!form.severity)            e.severity    = "Severity is required";
    if (!form.description.trim())  e.description = "Description is required";
    if (!form.nextStep.trim())     e.nextStep    = "Next recommended step is required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    onSave?.({
      ...form,
      id: "LEAD-" + Date.now(),
      status: "New",
      confidence: Number(form.confidence),
      generatedAt: new Date().toLocaleString("en-PK"),
    });
    onClose();
  };

  return (
    <Overlay onClose={onClose}>
      <ModalShell
        title="Add Lead Manually"
        subtitle={`Case: ${caseId}`}
        icon={Brain}
        accentColor="bg-deep-ocean"
        onClose={onClose}
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <Brain className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              AI leads are generated automatically. Use this form to add leads from field intelligence, informants, or manual analysis that the AI could not detect.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldLabel label="Case ID" required>
              <div className="px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500 font-mono">{caseId}</div>
            </FieldLabel>
            <FieldLabel label="Lead Source">
              <SelectField
                options={["Manual Entry", "Field Intelligence", "Informant Tip", "CCTV Analysis", "Forensic Finding", "Witness Intel", "Inter-agency Sharing", "Other"]}
                value={form.source} onChange={set("source")}
              />
            </FieldLabel>
            <FieldLabel label="Lead Type" required error={errors.type}>
              <SelectField
                options={["Suspect Match", "Location Pattern", "Weapon Pattern", "Vehicle Match", "Case Linkage", "MO Pattern", "Digital Evidence", "Financial Trail", "Witness Tip", "Other"]}
                value={form.type} onChange={set("type")} error={errors.type}
              />
            </FieldLabel>
            <FieldLabel label="Severity" required error={errors.severity}>
              <SelectField
                options={["Critical", "High", "Medium", "Low"]}
                value={form.severity} onChange={set("severity")} error={errors.severity}
              />
            </FieldLabel>
          </div>

          <FieldLabel label="Lead Description" required error={errors.description}>
            <TextareaField
              value={form.description} onChange={set("description")} rows={3}
              placeholder="Describe the lead in detail — what was found, how it was discovered, why it is relevant…"
              error={errors.description}
            />
          </FieldLabel>

          {/* Conditional suspect section */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Suspect Information (optional)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldLabel label="Suggested Suspect Name / ID">
                <Input value={form.suggestedSuspect} onChange={set("suggestedSuspect")} placeholder="Name or SUP-XXXX" />
              </FieldLabel>
              <FieldLabel label="Similar Past Case ID">
                <Input value={form.similarCaseId} onChange={set("similarCaseId")} placeholder="e.g. C-2040" />
              </FieldLabel>
            </div>
            <FieldLabel label="Basis / Evidence for Suspect">
              <Input value={form.suspectBasis} onChange={set("suspectBasis")} placeholder="Why this suspect is linked…" />
            </FieldLabel>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldLabel label="Weapon / MO Pattern">
              <Input value={form.weaponPattern} onChange={set("weaponPattern")} placeholder="e.g. Pistol, same calibre" />
            </FieldLabel>
            <FieldLabel label="Location Area">
              <Input value={form.locationArea} onChange={set("locationArea")} placeholder="e.g. Gulshan-e-Iqbal, 2km radius" />
            </FieldLabel>
          </div>

          {/* Confidence slider */}
          <FieldLabel label="Confidence Level" hint={`Your confidence in this lead: ${form.confidence}%`}>
            <div className="space-y-2">
              <input
                type="range" min="10" max="100" step="5"
                value={form.confidence} onChange={set("confidence")}
                className="w-full accent-deep-ocean"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Low (10%)</span>
                <span className="font-bold text-deep-ocean">{form.confidence}%</span>
                <span>High (100%)</span>
              </div>
              {/* Confidence bar preview */}
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${Number(form.confidence) >= 80 ? "bg-emerald-500" : Number(form.confidence) >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                  style={{ width: `${form.confidence}%` }}
                />
              </div>
            </div>
          </FieldLabel>

          <FieldLabel label="Next Recommended Step" required error={errors.nextStep}>
            <TextareaField
              value={form.nextStep} onChange={set("nextStep")} rows={3}
              placeholder="What action should the investigator take based on this lead? e.g. Cross-reference suspect CNIC with known associates, deploy surveillance on…"
              error={errors.nextStep}
            />
          </FieldLabel>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-300 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
              Cancel
            </button>
            <SaveBtn saving={saving} label="Add Lead" icon={Brain} />
          </div>
        </form>
      </ModalShell>
    </Overlay>
  );
}