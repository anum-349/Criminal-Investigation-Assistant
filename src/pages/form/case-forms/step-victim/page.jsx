/**
 * StepVictims — Step 4
 * Place at: src/pages/form/case-forms/add-victim/page.jsx
 *
 * Mirrors the structure of step-suspects/page.jsx:
 *   - register mode  → always-expanded card, no Edit toggle
 *   - standalone mode → collapsed summary card with Edit/Save toggle
 *
 * Captures every field used by the CaseVictims display (victim1Details shape):
 *   personal.{name, age, contact, gender, occupation, cnic}
 *   incident.{residentialAddress, natureOfInjuries, causeOfDeath, declaredDead, postmortemAutopsy}
 *   injurySummary, injuryRecordedBy
 *   forensic[]                — list of forensic findings
 *   timeline[{date, text}]    — events
 *   protection.{threatLevel, protectionAssigned, notes}
 *   legal[{label, done}]      — legal milestones
 *   nextFollowUp, caseType, primaryLabel, cooperative
 */
import { useState } from "react";
import {
  Hash, Plus, Trash2, User, Pencil, Check, Shield,
  Clock, FileSearch, Gavel, AlertTriangle,
} from "lucide-react";
import {
  defaultVictim, generateVictimId,
  INJURY_TYPES, VICTIM_STATUSES, RELATION_TO_VICTIM,
  THREAT_LEVELS, DECLARED_DEAD_OPTIONS, POSTMORTEM_OPTIONS,
} from "../CaseFormConstants/page";
import {
  CheckField, FieldLabel, SectionHeading,
  SelectField, TextareaField, TextField,
} from "../CaseFormFields/page";

// ─────────────────────────────────────────────────────────────────────────────
// VictimFormFields — every editable field, used by both card variants
// ─────────────────────────────────────────────────────────────────────────────
function VictimFormFields({ victim, idx, onUpdate }) {
  const u = (k) => (e) => onUpdate(idx, k, e.target.value);

  // Helpers for array fields (forensic findings, timeline, legal milestones)
  const setArr = (k, fn) => onUpdate(idx, k, fn(victim[k] || []));

  // Forensic findings: list of strings
  const addForensic    = () => setArr("forensic", arr => [...arr, ""]);
  const updateForensic = (i, val) => setArr("forensic", arr => arr.map((x, j) => j === i ? val : x));
  const removeForensic = (i) => setArr("forensic", arr => arr.filter((_, j) => j !== i));

  // Timeline: list of { date, text }
  const addTimeline    = () => setArr("timeline", arr => [...arr, { date: "", text: "" }]);
  const updateTimeline = (i, k, v) => setArr("timeline", arr => arr.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const removeTimeline = (i) => setArr("timeline", arr => arr.filter((_, j) => j !== i));

  // Legal milestones: list of { label, done }
  const addLegal    = () => setArr("legal", arr => [...arr, { label: "", done: false }]);
  const updateLegal = (i, k, v) => setArr("legal", arr => arr.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const removeLegal = (i) => setArr("legal", arr => arr.filter((_, j) => j !== i));

  return (
    <div className="space-y-5">

      {/* ── 1. Identification ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>
            Victim ID
            <span className="ml-1.5 text-[10px] font-normal text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Auto</span>
          </FieldLabel>
          <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-500 font-mono select-all">
            <Hash className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {victim.victimId || generateVictimId()}
          </div>
        </div>
        <TextField
          label="Primary Label" hint="e.g. Primary Victim - Murder"
          value={victim.primaryLabel || ""} onChange={u("primaryLabel")}
          placeholder="Primary Victim - Murder"
        />
      </div>

      {/* ── 2. Personal Information ───────────────────────────────────── */}
      <div>
        <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100 flex items-center gap-2">
          <User className="h-3.5 w-3.5" /> Personal Information
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="Full Name" required value={victim.name || ""} onChange={u("name")} placeholder="As on CNIC" />
          <TextField label="CNIC Number" value={victim.cnic || ""} onChange={u("cnic")} placeholder="XXXXX-XXXXXXX-X" />
          <TextField label="Age" type="number" min="0" max="120" value={victim.age || ""} onChange={u("age")} />
          <SelectField label="Gender" options={["Male", "Female", "Transgender / Other"]} value={victim.gender || ""} onChange={u("gender")} />
          <TextField label="Contact Number" value={victim.contact || ""} onChange={u("contact")} placeholder="+92-XXX-XXXXXXX" />
          <TextField label="Occupation" value={victim.occupation || ""} onChange={u("occupation")} placeholder="e.g. IT Professional, Teacher" />
        </div>
        <TextareaField
          className="mt-4"
          label="Residential Address" rows={2}
          value={victim.address || ""} onChange={u("address")}
          placeholder="Full home address of victim"
        />
      </div>

      {/* ── 3. Incident & Injury Details ──────────────────────────────── */}
      <div>
        <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" /> Incident & Injury Details
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label="Victim Status" options={VICTIM_STATUSES} value={victim.status || ""} onChange={u("status")} />
          <SelectField label="Nature of Injury / Harm" options={INJURY_TYPES} value={victim.injuryType || ""} onChange={u("injuryType")} />
          <TextField
            label="Case Type"
            value={victim.caseType || ""} onChange={u("caseType")}
            placeholder="e.g. Murder / Homicide"
          />
          <SelectField label="Relation to Suspect (if known)" options={RELATION_TO_VICTIM} value={victim.relation || ""} onChange={u("relation")} />
        </div>

        <TextareaField
          className="mt-4"
          label="Nature of Injuries (detail)" rows={2}
          value={victim.natureOfInjuries || ""} onChange={u("natureOfInjuries")}
          placeholder="e.g. Multiple stab wounds to chest and abdomen"
        />

        {/* Deceased-specific fields — appear only when status === Deceased */}
        {victim.status === "Deceased" && (
          <div className="mt-4 border border-red-100 bg-red-50/40 rounded-xl p-4 space-y-4">
            <p className="text-xs font-bold text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5" /> Deceased — Additional Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                label="Cause of Death"
                value={victim.causeOfDeath || ""} onChange={u("causeOfDeath")}
                placeholder="As per postmortem report"
              />
              <SelectField
                label="Declared Dead"
                options={DECLARED_DEAD_OPTIONS}
                value={victim.declaredDead || ""} onChange={u("declaredDead")}
              />
              <SelectField
                label="Postmortem / Autopsy Status"
                options={POSTMORTEM_OPTIONS}
                value={victim.postmortemAutopsy || ""} onChange={u("postmortemAutopsy")}
                className="sm:col-span-2"
              />
            </div>
          </div>
        )}

        {/* Injury summary + recorder */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <TextareaField
            label="Injury Summary" rows={2}
            value={victim.injurySummary || ""} onChange={u("injurySummary")}
            placeholder="Short summary of injuries"
          />
          <TextField
            label="Injury Recorded By"
            value={victim.injuryRecordedBy || ""} onChange={u("injuryRecordedBy")}
            placeholder="e.g. Inspector Ali"
          />
        </div>

        {/* Boolean flags */}
        <div className="flex flex-wrap gap-5 mt-4">
          <CheckField label="Medical Report Filed"           checked={!!victim.medicalReport}      onChange={v => onUpdate(idx, "medicalReport", v)} />
          <CheckField label="Postmortem / Autopsy Conducted" checked={!!victim.postmortem}         onChange={v => onUpdate(idx, "postmortem", v)} />
          <CheckField label="Protection Required"            checked={!!victim.protectionRequired} onChange={v => onUpdate(idx, "protectionRequired", v)} />
          <CheckField label="Cooperative"                    checked={victim.cooperative !== false} onChange={v => onUpdate(idx, "cooperative", v)} />
        </div>
      </div>

      {/* ── 4. Forensic Findings ──────────────────────────────────────── */}
      <div>
        <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100 flex items-center gap-2">
          <FileSearch className="h-3.5 w-3.5" /> Forensic Findings
        </h5>
        <div className="space-y-2">
          {(victim.forensic || []).map((f, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={f}
                onChange={e => updateForensic(i, e.target.value)}
                placeholder={`Finding #${i + 1} — e.g. Blood samples collected from crime scene`}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => removeForensic(i)}
                className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                title="Remove finding"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {(victim.forensic || []).length === 0 && (
            <p className="text-xs text-slate-400 italic">No forensic findings added yet.</p>
          )}
          <button
            type="button"
            onClick={addForensic}
            className="text-xs flex items-center gap-1.5 text-deep-ocean hover:text-deep-ocean-900 font-medium cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add forensic finding
          </button>
        </div>
      </div>

      {/* ── 5. Timeline of Events ─────────────────────────────────────── */}
      <div>
        <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" /> Timeline of Events
        </h5>
        <div className="space-y-2">
          {(victim.timeline || []).map((entry, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={entry.date || ""}
                onChange={e => updateTimeline(i, "date", e.target.value)}
                placeholder="20 Aug, 2025 5:00 PM"
                className="w-44 shrink-0 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean focus:border-transparent"
              />
              <input
                type="text"
                value={entry.text || ""}
                onChange={e => updateTimeline(i, "text", e.target.value)}
                placeholder="What happened…"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => removeTimeline(i)}
                className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                title="Remove timeline entry"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {(victim.timeline || []).length === 0 && (
            <p className="text-xs text-slate-400 italic">No timeline entries added yet.</p>
          )}
          <button
            type="button"
            onClick={addTimeline}
            className="text-xs flex items-center gap-1.5 text-deep-ocean hover:text-deep-ocean-900 font-medium cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add timeline event
          </button>
        </div>
      </div>

      {/* ── 6. Protection Status ──────────────────────────────────────── */}
      <div>
        <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100 flex items-center gap-2">
          <Shield className="h-3.5 w-3.5" /> Protection Status
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            label="Threat Level" options={THREAT_LEVELS}
            value={victim.threatLevel || ""} onChange={u("threatLevel")}
          />
          <SelectField
            label="Protection Assigned" options={["Yes", "No", "Pending Review"]}
            value={victim.protectionAssigned || ""} onChange={u("protectionAssigned")}
          />
        </div>
        <TextareaField
          className="mt-4"
          label="Protection Notes" rows={2}
          value={victim.protectionNotes || ""} onChange={u("protectionNotes")}
          placeholder="e.g. Victim had recent disagreements with colleague."
        />
      </div>

      {/* ── 7. Legal Status ───────────────────────────────────────────── */}
      <div>
        <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100 flex items-center gap-2">
          <Gavel className="h-3.5 w-3.5" /> Legal Status
        </h5>
        <div className="space-y-2">
          {(victim.legal || []).map((item, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="checkbox"
                checked={!!item.done}
                onChange={e => updateLegal(i, "done", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-deep-ocean focus:ring-deep-ocean cursor-pointer shrink-0"
              />
              <input
                type="text"
                value={item.label || ""}
                onChange={e => updateLegal(i, "label", e.target.value)}
                placeholder="e.g. FIR Filed"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => removeLegal(i)}
                className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                title="Remove legal item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {(victim.legal || []).length === 0 && (
            <p className="text-xs text-slate-400 italic">No legal milestones added yet.</p>
          )}
          <button
            type="button"
            onClick={addLegal}
            className="text-xs flex items-center gap-1.5 text-deep-ocean hover:text-deep-ocean-900 font-medium cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add legal milestone
          </button>
        </div>

        <div className="mt-4">
          <TextField
            label="Next Follow-Up Date"
            value={victim.nextFollowUp || ""} onChange={u("nextFollowUp")}
            placeholder="e.g. 20 Dec 2025"
          />
        </div>
      </div>

      {/* ── 8. Statement ──────────────────────────────────────────────── */}
      <TextareaField
        label="Victim Statement / Complaint" rows={3} maxLength={1000}
        value={victim.statement || ""} onChange={u("statement")}
        placeholder="Statement given by victim or complainant…"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Register-mode card — always expanded, no Edit toggle
// ─────────────────────────────────────────────────────────────────────────────
function RegisterVictimCard({ victim, idx, canRemove, onUpdate, onRemove }) {
  return (
    <div className="border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-deep-ocean text-white flex items-center justify-center text-xs font-bold">
            {idx + 1}
          </div>
          Victim #{idx + 1}
          {victim._extractedByAI && (
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
            title="Remove victim"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <VictimFormFields victim={victim} idx={idx} onUpdate={onUpdate} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone-mode card — collapsed summary with Edit/Save toggle
// ─────────────────────────────────────────────────────────────────────────────
function StandaloneVictimCard({ victim, idx, canRemove, isEditing, onToggleEdit, onUpdate, onRemove }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">

      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-deep-ocean text-white flex items-center justify-center text-xs font-bold shrink-0">
            {idx + 1}
          </div>
          <h4 className="text-sm font-bold text-slate-700 shrink-0">Victim #{idx + 1}</h4>
          {!isEditing && (
            <span className="text-xs text-slate-400 truncate font-mono">
              {victim.victimId || ""}{victim.name ? ` — ${victim.name}` : ""}
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
              title="Remove victim"
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
            { label: "Name",      value: victim.name || "—" },
            { label: "Age",       value: victim.age || "—" },
            { label: "Gender",    value: victim.gender || "—" },
            { label: "Contact",   value: victim.contact || "—" },
            { label: "Status",    value: victim.status || "—" },
            { label: "Injury",    value: victim.injuryType || "—" },
          ].map(({ label, value }) => (
            <div key={label}>
              <span className="text-[10px] text-slate-400 block uppercase tracking-wide mb-0.5">{label}</span>
              <span className="text-slate-700 font-medium">{value}</span>
            </div>
          ))}
          {victim.injurySummary && (
            <div className="col-span-2 sm:col-span-3">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wide mb-0.5">Injury Summary</span>
              <span className="text-slate-600 text-xs">{victim.injurySummary}</span>
            </div>
          )}
          {victim.statement && (
            <div className="col-span-2 sm:col-span-3">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wide mb-0.5">Statement</span>
              <span className="text-slate-600 text-xs">{victim.statement}</span>
            </div>
          )}
        </div>
      )}

      {/* Expanded edit form */}
      {isEditing && (
        <div className="p-5">
          <VictimFormFields victim={victim} idx={idx} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StepVictims — main component
// ─────────────────────────────────────────────────────────────────────────────
export function StepVictims({ data = {}, setData, mode = "register" }) {
  const victims = data.victims || [];
  const [editingIds, setEditingIds] = useState(new Set());

  const setVictims = (fn) =>
    setData(d => ({ ...d, victims: typeof fn === "function" ? fn(d.victims || []) : fn }));

  const update = (idx, k, v) =>
    setVictims(vs => vs.map((x, i) => i === idx ? { ...x, [k]: v } : x));

  const addVictim = () => {
    const item = defaultVictim();
    setVictims(vs => [...vs, item]);
    if (mode === "standalone") {
      setEditingIds(prev => new Set([...prev, item.id]));
    }
  };

  const removeVictim = (idx) => {
    const id = victims[idx]?.id;
    setVictims(vs => vs.filter((_, i) => i !== idx));
    setEditingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  const toggleEdit = (id) =>
    setEditingIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={User}
        title="Victim Information"
        subtitle={
          mode === "standalone"
            ? "Add victim details linked to the selected case."
            : "Enter details for all victims. Multiple victims can be added."
        }
      />

      {victims.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-xl text-slate-500">
          <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No victims added yet</p>
          <p className="text-xs mt-1">Click the button below to add victim details</p>
        </div>
      )}

      {victims.map((victim, idx) =>
        mode === "register" ? (
          <RegisterVictimCard
            key={victim.id}
            victim={victim}
            idx={idx}
            canRemove={victims.length > 1}
            onUpdate={update}
            onRemove={() => removeVictim(idx)}
          />
        ) : (
          <StandaloneVictimCard
            key={victim.id}
            victim={victim}
            idx={idx}
            canRemove={victims.length > 1 || mode === "standalone"}
            isEditing={editingIds.has(victim.id)}
            onToggleEdit={() => toggleEdit(victim.id)}
            onUpdate={update}
            onRemove={() => removeVictim(idx)}
          />
        )
      )}

      <button
        type="button"
        onClick={addVictim}
        className="w-full border-2 border-dashed border-slate-300 rounded-xl py-3 text-sm text-slate-500
                   hover:border-deep-ocean hover:text-deep-ocean transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <Plus className="h-4 w-4" /> Add Another Victim
      </button>
    </div>
  );
}

export default StepVictims;