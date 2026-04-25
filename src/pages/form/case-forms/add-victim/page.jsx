import { User, Plus, Trash2 } from "lucide-react";
import { SectionHeading, TextField, SelectField, TextareaField, CheckField } from "../CaseFormFields/page";
import { defaultVictim, INJURY_TYPES, VICTIM_STATUSES, RELATION_TO_VICTIM } from "../CaseFormConstants/page";

export function StepVictims({ data, setData, mode = "register" }) {
  const victims = data.victims || [defaultVictim()];
  const setVictims = (fn) => setData(d => ({ ...d, victims: typeof fn === "function" ? fn(d.victims || []) : fn }));
  const update = (idx, k, v) => setVictims(vs => vs.map((x, i) => i === idx ? { ...x, [k]: v } : x));

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

      {victims.map((victim, idx) => (
        <VictimCard
          key={victim.id}
          victim={victim}
          idx={idx}
          canRemove={victims.length > 1 || mode === "standalone"}
          onUpdate={update}
          onRemove={() => setVictims(vs => vs.filter((_, i) => i !== idx))}
        />
      ))}

      <button
        onClick={() => setVictims(vs => [...vs, defaultVictim()])}
        className="w-full border-2 border-dashed border-slate-300 rounded-xl py-3 text-sm text-slate-500
                   hover:border-deep-ocean hover:text-deep-ocean transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <Plus className="h-4 w-4" /> Add Another Victim
      </button>
    </div>
  );
}

function VictimCard({ victim, idx, canRemove, onUpdate, onRemove }) {
  const u = (k) => (e) => onUpdate(idx, k, e.target.value);

  return (
    <div className="border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-deep-ocean text-white flex items-center justify-center text-xs font-bold">{idx + 1}</div>
          Victim #{idx + 1}
        </h4>
        {canRemove && (
          <button onClick={onRemove}
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors cursor-pointer" title="Remove">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField label="Full Name" required value={victim.name} onChange={u("name")} placeholder="As on CNIC" />
        <TextField label="CNIC Number" value={victim.cnic} onChange={u("cnic")} placeholder="XXXXX-XXXXXXX-X" />
        <TextField label="Age" type="number" min="0" max="120" value={victim.age} onChange={u("age")} />
        <SelectField label="Gender" options={["Male","Female","Transgender / Other"]} value={victim.gender} onChange={u("gender")} />
        <TextField label="Contact Number" value={victim.contact} onChange={u("contact")} placeholder="+92-XXX-XXXXXXX" />
        <TextField label="Occupation" value={victim.occupation} onChange={u("occupation")} placeholder="e.g. Teacher, Businessman" />
      </div>

      <TextareaField
        label="Residential Address" rows={2}
        value={victim.address} onChange={u("address")}
        placeholder="Full home address of victim"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label="Victim Status" options={VICTIM_STATUSES} value={victim.status} onChange={u("status")} />
        <SelectField label="Nature of Injury / Harm" options={INJURY_TYPES} value={victim.injuryType} onChange={u("injuryType")} />
        {victim.status === "Deceased" && (
          <TextField label="Cause of Death" value={victim.causeOfDeath} onChange={u("causeOfDeath")} placeholder="As per postmortem report" />
        )}
        <SelectField label="Relation to Suspect (if known)" options={RELATION_TO_VICTIM} value={victim.relation} onChange={u("relation")} />
      </div>

      <div className="flex flex-wrap gap-5">
        <CheckField label="Medical Report Filed"           checked={victim.medicalReport}      onChange={v => onUpdate(idx, "medicalReport", v)} />
        <CheckField label="Postmortem / Autopsy Conducted" checked={victim.postmortem}          onChange={v => onUpdate(idx, "postmortem", v)} />
        <CheckField label="Protection Required"            checked={victim.protectionRequired}  onChange={v => onUpdate(idx, "protectionRequired", v)} />
      </div>

      <TextareaField
        label="Victim Statement / Complaint" rows={3} maxLength={1000}
        value={victim.statement} onChange={u("statement")}
        placeholder="Statement given by victim or complainant…"
      />
    </div>
  );
}

export default StepVictims;


