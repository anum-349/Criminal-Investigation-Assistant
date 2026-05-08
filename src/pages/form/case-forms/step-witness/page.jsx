import { useState } from "react";
import {
  Hash, Plus, Trash2, User, Pencil, Check, Shield,
  CheckCircle2, AlertTriangle, EyeOff,
} from "lucide-react";
import {
  defaultWitness, generateWitnessId,
  WITNESS_TYPES, WITNESS_CREDIBILITY, WITNESS_STATUSES,
  WITNESS_RELATIONS,
} from "@/pages/form/case-forms/caseFormConstants/page";
import {
  CheckField, FieldLabel, SectionHeading,
  SelectField, TextareaField, TextField,
} from "@/pages/form/case-forms/CaseFormFields/page";

// ─────────────────────────────────────────────────────────────────────────────
// WitnessFormFields — every editable field, used by both card variants
// ─────────────────────────────────────────────────────────────────────────────
function WitnessFormFields({ witness, idx, onUpdate }) {
  const u = (k) => (e) => onUpdate(idx, k, e.target.value);
  const isAnonymous = !!witness.anonymous;

  return (
    <div className="space-y-5">

      {/* ── Anonymous toggle banner ─────────────────────────────────── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onUpdate(idx, "anonymous", !isAnonymous)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onUpdate(idx, "anonymous", !isAnonymous);
          }
        }}
        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer
          ${isAnonymous ? "bg-amber-50 border-amber-300" : "bg-slate-50 border-slate-200"}`}
      >
        <div className="flex items-center gap-2">
          <EyeOff className={`h-4 w-4 ${isAnonymous ? "text-amber-700" : "text-slate-400"}`} />
          <div>
            <p className="text-sm font-semibold text-slate-800">Anonymous Witness</p>
            <p className="text-xs text-slate-500 mt-0.5">Name and contact will be hidden in reports</p>
          </div>
        </div>
        <div className={`w-10 h-5 rounded-full transition-all relative shrink-0
          ${isAnonymous ? "bg-amber-400" : "bg-slate-300"}`}>
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all
            ${isAnonymous ? "left-5.5" : "left-0.5"}`} />
        </div>
      </div>

      {/* ── 1. Identification ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>
            Witness ID
            <span className="ml-1.5 text-[10px] font-normal text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Auto</span>
          </FieldLabel>
          <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-500 font-mono select-all">
            <Hash className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {witness.witnessId || generateWitnessId()}
          </div>
        </div>
        <SelectField
          label="Witness Status"
          options={WITNESS_STATUSES}
          value={witness.status || ""} onChange={u("status")}
        />
      </div>

      {/* ── 2. Personal Information ─────────────────────────────────── */}
      <div>
        <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100 flex items-center gap-2">
          <User className="h-3.5 w-3.5" /> Personal Information
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            label="Full Name" required={!isAnonymous}
            value={isAnonymous ? "" : (witness.name || "")}
            onChange={u("name")}
            disabled={isAnonymous}
            placeholder={isAnonymous ? "Hidden" : "Full name"}
          />
          <TextField
            label="Age" type="number" min="0" max="120"
            value={witness.age || ""} onChange={u("age")}
          />
          <SelectField
            label="Gender"
            options={["Male", "Female", "Transgender / Other"]}
            value={witness.gender || ""} onChange={u("gender")}
          />
          <TextField
            label="Contact Number"
            value={isAnonymous ? "" : (witness.contact || "")}
            onChange={u("contact")}
            disabled={isAnonymous}
            placeholder={isAnonymous ? "Hidden" : "+92-XXX-XXXXXXX"}
          />
        </div>
        <TextareaField
          className="mt-4"
          label="Residential Address" rows={2}
          value={isAnonymous ? "" : (witness.address || "")}
          onChange={u("address")}
          disabled={isAnonymous}
          placeholder={isAnonymous ? "Hidden" : "Witness home address"}
        />
      </div>

      {/* ── 3. Witness Classification ───────────────────────────────── */}
      <div>
        <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100 flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5" /> Classification
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            label="Witness Type"
            options={WITNESS_TYPES}
            value={witness.witnessType || ""} onChange={u("witnessType")}
          />
          <SelectField
            label="Relation to Case"
            options={WITNESS_RELATIONS}
            value={witness.relationToCase || ""} onChange={u("relationToCase")}
          />
          <SelectField
            label="Credibility Assessment"
            options={WITNESS_CREDIBILITY}
            value={witness.credibility || ""} onChange={u("credibility")}
          />
          <TextField
            label="Related Case ID" required
            value={witness.caseId || ""} onChange={u("caseId")}
            placeholder="e.g. C-2053"
          />
        </div>
      </div>

      {/* ── 4. Statement Details ────────────────────────────────────── */}
      <div>
        <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" /> Statement
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            label="Statement Date" type="date"
            value={witness.statementDate || ""} onChange={u("statementDate")}
            max={new Date().toISOString().split("T")[0]}
          />
          <TextField
            label="Statement Recorded By"
            value={witness.statementRecordedBy || ""} onChange={u("statementRecordedBy")}
            placeholder="Officer name"
          />
        </div>
        <TextareaField
          className="mt-4"
          label="Witness Statement / Description" required rows={5} maxLength={2000}
          value={witness.description || ""} onChange={u("description")}
          placeholder="Full statement as given by the witness. Include exact words where possible. Note any hesitation, inconsistencies, or key details…"
        />
      </div>

      {/* ── 5. Flags ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-5">
        <CheckField
          label="Protection Required"
          checked={!!witness.protectionRequired}
          onChange={v => onUpdate(idx, "protectionRequired", v)}
        />
        <CheckField
          label="Cooperating with Investigation"
          checked={witness.cooperating !== false}
          onChange={v => onUpdate(idx, "cooperating", v)}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Register-mode card — always expanded, no Edit toggle
// ─────────────────────────────────────────────────────────────────────────────
function RegisterWitnessCard({ witness, idx, canRemove, onUpdate, onRemove }) {
  return (
    <div className="border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-bold">
            {idx + 1}
          </div>
          Witness #{idx + 1}
          {witness.anonymous && (
            <span className="text-[10px] font-normal text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              Anonymous
            </span>
          )}
          {witness._extractedByAI && (
            <span className="text-[10px] font-normal text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
              AI Extracted
            </span>
          )}
        </h4>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors cursor-pointer"
            title="Remove witness"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <WitnessFormFields witness={witness} idx={idx} onUpdate={onUpdate} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone-mode card — collapsed summary with Edit/Save toggle
// ─────────────────────────────────────────────────────────────────────────────
function StandaloneWitnessCard({
  witness, idx, canRemove, isEditing, onToggleEdit, onUpdate, onRemove,
}) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">

      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {idx + 1}
          </div>
          <h4 className="text-sm font-bold text-slate-700 shrink-0">Witness #{idx + 1}</h4>
          {!isEditing && (
            <span className="text-xs text-slate-400 truncate font-mono">
              {witness.witnessId || ""}
              {witness.anonymous
                ? " — Anonymous"
                : witness.name ? ` — ${witness.name}` : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleEdit}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer
              ${isEditing
                ? "bg-deep-ocean text-white hover:bg-deep-ocean/90"
                : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-100"}`}
          >
            {isEditing
              ? <><Check className="h-3.5 w-3.5 mr-2" /> Save</>
              : <><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</>}
          </button>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors cursor-pointer"
              title="Remove witness"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Collapsed summary */}
      {!isEditing && (
        <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 text-sm">
          {[
            { label: "Name",        value: witness.anonymous ? "Anonymous" : (witness.name || "—") },
            { label: "Age / Gender",value: `${witness.age || "—"} / ${witness.gender || "—"}` },
            { label: "Contact",     value: witness.anonymous ? "Hidden" : (witness.contact || "—") },
            { label: "Type",        value: witness.witnessType || "—" },
            { label: "Relation",    value: witness.relationToCase || "—" },
            { label: "Status",      value: witness.status || "—" },
          ].map(({ label, value }) => (
            <div key={label}>
              <span className="text-[10px] text-slate-400 block uppercase tracking-wide mb-0.5">{label}</span>
              <span className="text-slate-700 font-medium">{value}</span>
            </div>
          ))}
          {witness.description && (
            <div className="col-span-2 sm:col-span-3">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wide mb-0.5">Statement</span>
              <span className="text-slate-600 text-xs">
                {witness.description.length > 140
                  ? `${witness.description.slice(0, 140)}…`
                  : witness.description}
              </span>
            </div>
          )}
          <div className="col-span-2 sm:col-span-3 flex flex-wrap gap-1.5 mt-1">
            {witness.protectionRequired && (
              <span className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-700">
                <Shield className="h-3 w-3" /> Protection Required
              </span>
            )}
            {witness.cooperating !== false && (
              <span className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> Cooperating
              </span>
            )}
          </div>
        </div>
      )}

      {/* Expanded edit form */}
      {isEditing && (
        <div className="p-5">
          <WitnessFormFields witness={witness} idx={idx} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StepWitnesses — main component
// ─────────────────────────────────────────────────────────────────────────────
export function StepWitnesses({ data = {}, setData, mode = "register" }) {
  const witnesses = data.witnesses || [];
  const [editingIds, setEditingIds] = useState(new Set());

  const setWitnesses = (fn) =>
    setData(d => ({
      ...d,
      witnesses: typeof fn === "function" ? fn(d.witnesses || []) : fn,
    }));

  const update = (idx, k, v) =>
    setWitnesses(ws => ws.map((x, i) => i === idx ? { ...x, [k]: v } : x));

  const addWitness = () => {
    const item = defaultWitness();
    setWitnesses(ws => [...ws, item]);
    if (mode === "standalone") {
      setEditingIds(prev => new Set([...prev, item.id]));
    }
  };

  const removeWitness = (idx) => {
    const id = witnesses[idx]?.id;
    setWitnesses(ws => ws.filter((_, i) => i !== idx));
    setEditingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  const toggleEdit = (id) =>
    setEditingIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={User}
        title="Witness Information"
        subtitle={
          mode === "standalone"
            ? "Add witness details linked to the selected case."
            : "Record statements from people who saw or know about the incident. Multiple witnesses can be added."
        }
      />

      {witnesses.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-xl text-slate-500">
          <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No witnesses added yet</p>
          <p className="text-xs mt-1">Click the button below to record a witness statement</p>
        </div>
      )}

      {witnesses.map((witness, idx) =>
        mode === "register" ? (
          <RegisterWitnessCard
            key={witness.id}
            witness={witness}
            idx={idx}
            canRemove={witnesses.length > 1}
            onUpdate={update}
            onRemove={() => removeWitness(idx)}
          />
        ) : (
          <StandaloneWitnessCard
            key={witness.id}
            witness={witness}
            idx={idx}
            canRemove={witnesses.length > 1 || mode === "standalone"}
            isEditing={editingIds.has(witness.id)}
            onToggleEdit={() => toggleEdit(witness.id)}
            onUpdate={update}
            onRemove={() => removeWitness(idx)}
          />
        )
      )}

      <button
        type="button"
        onClick={addWitness}
        className="w-full border-2 border-dashed border-slate-300 rounded-xl py-3 text-sm text-slate-500
                   hover:border-deep-ocean hover:text-deep-ocean transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <Plus className="h-4 w-4" /> Add Another Witness
      </button>
    </div>
  );
}

export default StepWitnesses;