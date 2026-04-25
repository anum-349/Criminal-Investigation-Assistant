// ══════════════════════════════════════════════════════════════════════════════
// 2. ADD WITNESS MODAL
// ══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { ModalShell, Overlay, FieldLabel, Input, SaveBtn, SelectField, TextareaFieldField } from "../CaseFormFields/page";

/**
 * Props:
 *   caseId   — current case ID
 *   onClose  — close handler
 *   onSave   — callback(newWitness)
 *   witness  — if provided, opens in edit mode
 *
 * Link in CaseWitnesses.jsx:
 *   Add a button: <button onClick={() => setShowAddWitness(true)}>Add Witness</button>
 *   Render: {showAddWitness && <AddWitnessModal caseId={caseId} onClose={…} onSave={…} />}
 *
 *   Also link in:
 *     - Register Case → Step 6 Crime Details — replace the witness TextareaField
 *       with a button "Add Witness Formally" that opens this modal
 *     - Update Case   → same step 5 Crime Details
 */
export function AddWitnessModal({ caseId = "C-2052", witness = null, onClose, onSave }) {
  const isEdit = !!witness;
  const [form, setForm] = useState(witness || {
    name: "", contact: "", address: "", statement: "",
    credibility: "", relatedCase: caseId,
    anonymous: false, protectionRequired: false, cooperating: true,
    statementDate: new Date().toISOString().split("T")[0],
    statementRecordedBy: "", witnessType: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => ({ ...er, [k]: "" })); };
  const toggle = (k) => setForm(f => ({ ...f, [k]: !f[k] }));

  const validate = () => {
    const e = {};
    if (!form.name.trim() && !form.anonymous)  e.name      = "Name is required (or mark anonymous)";
    if (!form.statement.trim())                e.statement = "Statement is required";
    if (!form.relatedCase.trim())              e.relatedCase = "Case ID is required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    onSave?.({ ...form, id: witness?.id || "WIT-" + Date.now() });
    onClose();
  };

  return (
    <Overlay onClose={onClose}>
      <ModalShell
        title={isEdit ? "Edit Witness" : "Add Witness"}
        subtitle={`Case: ${form.relatedCase}`}
        icon={User}
        accentColor="bg-slate-700"
        onClose={onClose}
        maxW="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Anonymous toggle — prominent placement for HCI */}
          <div className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer
            ${form.anonymous ? "bg-amber-50 border-amber-300" : "bg-slate-50 border-slate-200"}`}
            onClick={() => toggle("anonymous")}
          >
            <div>
              <p className="text-sm font-semibold text-slate-800">Anonymous Witness</p>
              <p className="text-xs text-slate-500 mt-0.5">Name and contact will be hidden in reports</p>
            </div>
            <div className={`w-10 h-5 rounded-full transition-all relative ${form.anonymous ? "bg-amber-400" : "bg-slate-300"}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.anonymous ? "left-5.5 translate-x-1" : "left-0.5"}`} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldLabel label="Witness Name" required={!form.anonymous} error={errors.name}>
              <Input
                value={form.name} onChange={set("name")}
                disabled={form.anonymous} placeholder={form.anonymous ? "Hidden" : "Full name"}
                error={errors.name}
              />
            </FieldLabel>
            <FieldLabel label="Witness Type">
              <SelectField
                options={["Eyewitness", "Earwitness", "Character Witness", "Expert Witness", "Victim-Witness", "Hearsay Witness", "Other"]}
                value={form.witnessType} onChange={set("witnessType")}
              />
            </FieldLabel>
            <FieldLabel label="Contact Number">
              <Input value={form.contact} onChange={set("contact")} placeholder="+92-3XX-XXXXXXX" disabled={form.anonymous} />
            </FieldLabel>
            <FieldLabel label="Credibility Assessment">
              <SelectField
                options={["High — Corroborated", "Medium — Unverified", "Low — Contradicted", "Unknown"]}
                value={form.credibility} onChange={set("credibility")}
              />
            </FieldLabel>
            <FieldLabel label="Statement Date">
              <Input type="date" value={form.statementDate} onChange={set("statementDate")} max={new Date().toISOString().split("T")[0]} />
            </FieldLabel>
            <FieldLabel label="Statement Recorded By">
              <Input value={form.statementRecordedBy} onChange={set("statementRecordedBy")} placeholder="Officer name" />
            </FieldLabel>
            <FieldLabel label="Related Case ID" required error={errors.relatedCase} className="sm:col-span-2">
              <Input value={form.relatedCase} onChange={set("relatedCase")} error={errors.relatedCase} />
            </FieldLabel>
          </div>

          <FieldLabel label="Residential Address">
            <TextareaFieldField value={form.address} onChange={set("address")} rows={2} placeholder="Witness home address" disabled={form.anonymous} />
          </FieldLabel>

          <FieldLabel label="Witness Statement / Testimony" required error={errors.statement}>
            <TextareaField
              value={form.statement} onChange={set("statement")} rows={6}
              placeholder="Full statement as given by the witness. Include exact words where possible. Note any hesitation, inconsistencies, or key details…"
              error={errors.statement}
            />
            {form.statement && (
              <p className="text-right text-xs text-slate-400">{form.statement.length} chars</p>
            )}
          </FieldLabel>

          {/* Flags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              ["protectionRequired", Shield, "Protection Required", "Witness may face threat"],
              ["cooperating",        CheckCircle2, "Cooperating",  "Witness is actively cooperating"],
            ].map(([k, Icon, label, desc]) => (
              <label key={k} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                ${form[k] ? "bg-deep-ocean/5 border-deep-ocean/30" : "bg-slate-50 border-slate-200 hover:border-slate-300"}`}>
                <input type="checkbox" checked={!!form[k]} onChange={() => toggle(k)} className="w-4 h-4 rounded accent-deep-ocean" />
                <div>
                  <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-deep-ocean" />{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-300 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
              Cancel
            </button>
            <SaveBtn saving={saving} label={isEdit ? "Save Changes" : "Add Witness"} icon={User} />
          </div>
        </form>
      </ModalShell>
    </Overlay>
  );
}



