import { useState, useRef } from "react";
import {
  Hash, Plus, Trash2, User, Pencil, Check, Shield, ImageIcon, X,
  Clock, FileSearch, Gavel, AlertTriangle, MessageSquare,
  Calendar,
} from "lucide-react";
import {
  defaultVictim,
  INJURY_TYPES, VICTIM_STATUSES, RELATION_TO_VICTIM,
  THREAT_LEVELS, DECLARED_DEAD_OPTIONS, POSTMORTEM_OPTIONS,
} from "@/pages/form/case-forms/caseFormConstants/page";
import {
  CheckField, FieldLabel, SectionHeading,
  SelectField, TextareaField, TextField,
} from "@/pages/form/case-forms/CaseFormFields/page";
import { Input } from "@/components/ui/Input";

// ─────────────────────────────────────────────────────────────────────────────
// Case-type → section visibility map (mirrors CaseVictims.jsx CASE_TYPE_CONFIG)
// Keep in sync: any new case type added here should also be added there.
// ─────────────────────────────────────────────────────────────────────────────
const CASE_TYPE_CONFIG = {
  murder: { showDeceased: true, showInjury: true, showForensic: true, showProtection: false, showLegal: true, showTimeline: true, showStatement: false },
  homicide: { showDeceased: true, showInjury: true, showForensic: true, showProtection: false, showLegal: true, showTimeline: true, showStatement: false },
  assault: { showDeceased: false, showInjury: true, showForensic: true, showProtection: true, showLegal: true, showTimeline: true, showStatement: true },
  kidnapping: { showDeceased: false, showInjury: false, showForensic: true, showProtection: true, showLegal: true, showTimeline: true, showStatement: true },
  abduction: { showDeceased: false, showInjury: false, showForensic: true, showProtection: true, showLegal: true, showTimeline: true, showStatement: true },
  theft: { showDeceased: false, showInjury: false, showForensic: true, showProtection: false, showLegal: true, showTimeline: true, showStatement: true },
  robbery: { showDeceased: false, showInjury: true, showForensic: true, showProtection: false, showLegal: true, showTimeline: true, showStatement: true },
  "sexual assault":
    { showDeceased: false, showInjury: true, showForensic: true, showProtection: true, showLegal: true, showTimeline: true, showStatement: true },
};
const DEFAULT_CFG = {
  showDeceased: false, showInjury: true, showForensic: true,
  showProtection: true, showLegal: true, showTimeline: true, showStatement: true,
};
const getCfg = (caseType) => {
  if (!caseType) return DEFAULT_CFG;
  return CASE_TYPE_CONFIG[String(caseType).toLowerCase().trim()] ?? DEFAULT_CFG;
};
export const validateVictims = (v) => {
  const errors = {};

  const CNIC_RE = /^\d{5}-\d{7}-\d$/;
  const PHONE_RE = /^(\+92|0)[-\s]?\d{3}[-\s]?\d{7}$/;

  if (!v) {
    return { form: "Add at least one victim." };
  }

  /* ─────────────────────────────────────────────
     1. Identification
  ───────────────────────────────────────────── */

  if (!v.primaryLabel?.trim()) {
    errors.primaryLabel = "Primary Label is required";
  }

  /* ─────────────────────────────────────────────
     2. Personal Information
  ───────────────────────────────────────────── */

  if (!v.name?.trim()) {
    errors.name = "Victim name is required";
  } else if (v.name.trim().length < 3 || /\d/.test(v.name)) {
    errors.name =
      "Enter a valid name (minimum 3 characters, no numbers)";
  }

  if (v.cnic && !CNIC_RE.test(v.cnic.trim())) {
    errors.cnic = "Format: XXXXX-XXXXXXX-X";
  }

  if (v.contact && !PHONE_RE.test(v.contact.trim())) {
    errors.contact =
      "Format: 0300-1234567 or +92-300-1234567";
  }

  if (v.age !== undefined && v.age !== "") {
    const age = Number(v.age);

    if (isNaN(age)) {
      errors.age = "Age must be a number";
    } else if (age < 0) {
      errors.age = "Age cannot be negative";
    } else if (age > 120) {
      errors.age = "Age must be 120 or less";
    }
  }

  if (!v.gender?.trim()) {
    errors.gender = "Gender is required";
  }

  if (v.address && v.address.trim().length < 5) {
    errors.address = "Enter a more complete address";
  }

  /* ─────────────────────────────────────────────
     3. Photograph
  ───────────────────────────────────────────── */

  if (v.photoUrl) {
    const photo =
      typeof v.photoUrl === "string"
        ? null
        : v.photoUrl?.[0];

    if (photo?.dataUrl && !photo.dataUrl.startsWith("data:image/")) {
      errors.photoUrl = "Only image files are allowed";
    }
  }

  /* ─────────────────────────────────────────────
     4. Incident Details
  ───────────────────────────────────────────── */

  if (!v.status?.trim()) {
    errors.status = "Victim status is required";
  }

  if (!v.caseType?.trim()) {
    errors.caseType = "Case type is required";
  }

  if (v.injuryType && v.injuryType.trim().length < 2) {
    errors.injuryType = "Enter a valid injury type";
  }

  if (
    v.natureOfInjuries &&
    v.natureOfInjuries.trim().length < 5
  ) {
    errors.natureOfInjuries =
      "Provide more detailed injury information";
  }

  /* ─────────────────────────────────────────────
     5. Deceased Validation
  ───────────────────────────────────────────── */

  if (v.status === "Deceased") {
    if (!v.causeOfDeath?.trim()) {
      errors.causeOfDeath = "Cause of death is required";
    }

    if (!v.declaredDead?.trim()) {
      errors.declaredDead =
        "Please specify who declared the victim dead";
    }

    if (!v.postmortemAutopsy?.trim()) {
      errors.postmortemAutopsy =
        "Postmortem / autopsy status is required";
    }
  }

  /* ─────────────────────────────────────────────
     6. Protection Validation
  ───────────────────────────────────────────── */

  if (v.protectionRequired) {
    if (!v.threatLevel?.trim()) {
      errors.threatLevel =
        "Threat level is required if protection is needed";
    }

    if (!v.protectionAssigned?.trim()) {
      errors.protectionAssigned =
        "Specify protection assignment status";
    }
  }

  /* ─────────────────────────────────────────────
     7. Statement Validation
  ───────────────────────────────────────────── */

  if (
    v.statement &&
    v.statement.trim().length > 1000
  ) {
    errors.statement =
      "Statement cannot exceed 1000 characters";
  }

  /* ─────────────────────────────────────────────
     8. Timeline Validation
  ───────────────────────────────────────────── */

  if (Array.isArray(v.timeline)) {
    v.timeline.forEach((item, i) => {
      if (!item.date?.trim()) {
        errors[`timeline_${i}_date`] =
          "Timeline date is required";
      }

      if (!item.text?.trim()) {
        errors[`timeline_${i}_text`] =
          "Timeline description is required";
      }
    });
  }

  /* ─────────────────────────────────────────────
     9. Legal Milestones Validation
  ───────────────────────────────────────────── */

  if (Array.isArray(v.legal)) {
    v.legal.forEach((item, i) => {
      if (!item.label?.trim()) {
        errors[`legal_${i}_label`] =
          "Legal milestone cannot be empty";
      }
    });
  }

  /* ─────────────────────────────────────────────
     10. Follow-Up Date Validation
  ───────────────────────────────────────────── */

  if (v.nextFollowUp) {
    const today = new Date().toISOString().split("T")[0];

    if (v.nextFollowUp < today) {
      errors.nextFollowUp =
        "Follow-up date cannot be in the past";
    }
  }

  /* ─────────────────────────────────────────────
     11. Forensic Findings Validation
  ───────────────────────────────────────────── */

  if (Array.isArray(v.forensic)) {
    v.forensic.forEach((finding, i) => {
      if (!finding?.trim()) {
        errors[`forensic_${i}`] =
          "Forensic finding cannot be empty";
      }
    });
  }

  return errors;
};

function VictimFormFields({ victim, idx, onUpdate, caseType, errors }) {
  const photoRef = useRef(null);
  const u = (k) => (e) => onUpdate(idx, k, e.target.value);

  // Resolve config: explicit `caseType` prop (from the wizard's top-level
  // formData) wins; otherwise per-victim caseType; otherwise full visibility.
  const cfg = getCfg(caseType || victim.caseType);

  // Helpers for array fields
  const setArr = (k, fn) => onUpdate(idx, k, fn(victim[k] || []));
  const addForensic = () => setArr("forensic", arr => [...arr, ""]);
  const updateForensic = (i, val) => setArr("forensic", arr => arr.map((x, j) => j === i ? val : x));
  const removeForensic = (i) => setArr("forensic", arr => arr.filter((_, j) => j !== i));
  const addTimeline = () => setArr("timeline", arr => [...arr, { date: "", text: "" }]);
  const updateTimeline = (i, k, v) => setArr("timeline", arr => arr.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const removeTimeline = (i) => setArr("timeline", arr => arr.filter((_, j) => j !== i));
  const addLegal = () => setArr("legal", arr => [...arr, { label: "", done: false }]);
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
            Auto Generate
          </div>
        </div>
        <TextField
          label="Primary Label" hint="e.g. Primary Victim - Murder"
          value={victim.primaryLabel || ""} onChange={u("primaryLabel")}
          placeholder="Primary Victim - Murder"
          error={errors.primaryLabel}
        />
      </div>

      {/* ── 2. Personal Information ───────────────────────────────────── */}
      <div>
        <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100 flex items-center gap-2">
          <User className="h-3.5 w-3.5" /> Personal Information
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="Full Name" error={errors.name} required value={victim.name || ""} onChange={u("name")} placeholder="As on CNIC" />
          <TextField label="CNIC Number" error={errors.cnic} value={victim.cnic || ""} onChange={u("cnic")} placeholder="XXXXX-XXXXXXX-X" />
          <TextField label="Age" error={errors.age} type="number" min="0" max="120" value={victim.age || ""} onChange={u("age")} />
          <SelectField label="Gender" error={errors.gender} options={["Male", "Female", "Transgender / Other"]} value={victim.gender || ""} onChange={u("gender")} />
          <TextField label="Contact Number" error={errors.contact} value={victim.contact || ""} onChange={u("contact")} placeholder="+92-XXX-XXXXXXX" />
          <TextField label="Occupation" value={victim.occupation || ""} onChange={u("occupation")} placeholder="e.g. IT Professional, Teacher" />
        </div>
        <TextareaField
          className="mt-4"
          label="Residential Address" rows={2}
          value={victim.address || ""} onChange={u("address")}
          placeholder="Full home address of victim"
          error={errors.address}
        />
      </div>

      <div>
        <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100 flex items-center gap-2">
          <ImageIcon className="h-3.5 w-3.5" /> Photograph
        </h5>
        <input ref={photoRef} type="file" className="hidden" accept="image/*"
          onChange={e => {
            const f = e.target.files?.[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = e2 => {
              onUpdate(idx, "photoUrl", [{ name: f.name, dataUrl: e2.target.result }]);
            };
            reader.readAsDataURL(f);
            e.target.value = "";
          }}
        />

        {victim.photoUrl ? (
          // HAS photo — show thumbnail with replace/remove
          <div className="relative group w-24 h-24 rounded-lg overflow-hidden border border-slate-200">
            <img
              src={typeof victim.photoUrl === 'string' ? victim.photoUrl : victim.photoUrl?.[0]?.dataUrl}
              alt={victim.name}
              className="w-full h-full object-cover"
            />
            {victim._hadPhoto && (
              <span className="absolute top-0 left-0 text-[8px] bg-emerald-600/80 text-white px-1 py-0.5 rounded-br-md">
                saved
              </span>
            )}
            <label className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center
                      py-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              Replace
              <input type="file" accept="image/*" hidden
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = e2 => onUpdate(idx, "photoUrl", [{ name: f.name, dataUrl: e2.target.result }]);
                  reader.readAsDataURL(f);
                  e.target.value = "";
                }} />
            </label>
            <button type="button" onClick={() => onUpdate(idx, "photoUrl", null)}
              className="absolute top-1 right-1 bg-black/60 text-white rounded p-0.5
                 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          // NO photo — show upload button
          <button type="button" onClick={() => photoRef.current?.click()}
            className="flex items-center gap-2 w-full border border-slate-300 rounded-lg px-3 py-2
               text-sm text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
            <ImageIcon className="h-4 w-4 shrink-0" /> Add photo…
          </button>
        )}
      </div>

      {/* ── 4. Incident & Injury Details ──────────────────────────────── */}
      <div>
        <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" /> Incident Details
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label="Victim Status" error={errors.status} options={VICTIM_STATUSES} value={victim.status || ""} onChange={u("status")} />
          <SelectField label="Relation to Suspect (if known)" options={RELATION_TO_VICTIM} value={victim.relation || ""} onChange={u("relation")} />
          <TextField
            label="Case Type"
            value={victim.caseType || caseType || ""} onChange={u("caseType")}
            placeholder="e.g. Murder / Homicide"
            error={errors.caseType}
            hint={caseType ? "Inherited from case header — override only if needed" : null}
          />
          {/* Injury type only matters when injury card is shown */}
          {cfg.showInjury && (
            <SelectField label="Nature of Injury / Harm" error={errors.injuryType} options={INJURY_TYPES} value={victim.injuryType || ""} onChange={u("injuryType")} />
          )}
        </div>

        {cfg.showInjury && (
          <TextareaField
            className="mt-4"
            label="Nature of Injuries (detail)" rows={2}
            error={errors.natureOfInjuries}
            value={victim.natureOfInjuries || ""} onChange={u("natureOfInjuries")}
            placeholder="e.g. Multiple stab wounds to chest and abdomen"
          />
        )}

        {/* Deceased-specific fields — only when:
            (a) the case-type config says so (murder/homicide), OR
            (b) the user manually marks status=Deceased on a non-fatal case
            (handles edge cases like robbery → death in robbery) */}
        {(cfg.showDeceased || victim.status === "Deceased") && (
          <div className="mt-4 border border-red-100 bg-red-50/40 rounded-xl p-4 space-y-4">
            <p className="text-xs font-bold text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5" /> Deceased — Additional Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                label="Cause of Death"
                error={errors.causeOfDeath}
                value={victim.causeOfDeath || ""} onChange={u("causeOfDeath")}
                placeholder="As per postmortem report"
              />
              <SelectField
                label="Declared Dead"
                error={errors.declaredDead}
                options={DECLARED_DEAD_OPTIONS}
                value={victim.declaredDead || ""} onChange={u("declaredDead")}
              />
              <SelectField
                label="Postmortem / Autopsy Status"
                options={POSTMORTEM_OPTIONS}
                error={errors.postmortemAutopsy}
                value={victim.postmortemAutopsy || ""} onChange={u("postmortemAutopsy")}
                className="sm:col-span-2"
              />
            </div>
          </div>
        )}

        {/* Injury summary + recorder — only with injury card */}
        {cfg.showInjury && (
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
        )}

        {/* Boolean flags */}
        <div className="flex flex-wrap gap-5 mt-4">
          {cfg.showInjury && (
            <CheckField label="Medical Report Filed" checked={!!victim.medicalReport} onChange={v => onUpdate(idx, "medicalReport", v)} />
          )}
          {(cfg.showDeceased || victim.status === "Deceased") && (
            <CheckField label="Postmortem / Autopsy Conducted" checked={!!victim.postmortem} onChange={v => onUpdate(idx, "postmortem", v)} />
          )}
          {cfg.showProtection && (
            <CheckField label="Protection Required" checked={!!victim.protectionRequired} onChange={v => onUpdate(idx, "protectionRequired", v)} />
          )}
          <CheckField label="Cooperative" checked={victim.cooperative !== false} onChange={v => onUpdate(idx, "cooperative", v)} />
        </div>
      </div>

      {/* ── 5. Forensic Findings ──────────────────────────────────────── */}
      {cfg.showForensic && (
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
                  type="button" onClick={() => removeForensic(i)}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                  title="Remove finding"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <span className={errors[`forensic_${i}`] ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-slate-300 bg-white focus:ring-deep-ocean/30 focus:border-deep-ocean"}>{errors[`forensic_${i}`]} </span>
              </div>
            ))}
            {(victim.forensic || []).length === 0 && (
              <p className="text-xs text-slate-400 italic">No forensic findings added yet.</p>
            )}
            <button
              type="button" onClick={addForensic}
              className="text-xs flex items-center gap-1.5 text-deep-ocean hover:text-deep-ocean-900 font-medium cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add forensic finding
            </button>
          </div>
        </div>
      )}

      {/* ── 6. Timeline of Events ─────────────────────────────────────── */}
      {cfg.showTimeline && (
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
                  type="button" onClick={() => removeTimeline(i)}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                  title="Remove timeline entry"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <span className={errors[`timeline_${i}_date`] ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-slate-300 bg-white focus:ring-deep-ocean/30 focus:border-deep-ocean"}>{errors[`timeline_${i}_date`]} </span>
                <span className={errors[`timeline_${i}_text`] ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-slate-300 bg-white focus:ring-deep-ocean/30 focus:border-deep-ocean"}>{errors[`timeline_${i}_text`]} </span>
              </div>
            ))}
            {(victim.timeline || []).length === 0 && (
              <p className="text-xs text-slate-400 italic">No timeline entries added yet.</p>
            )}
            <button
              type="button" onClick={addTimeline}
              className="text-xs flex items-center gap-1.5 text-deep-ocean hover:text-deep-ocean-900 font-medium cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add timeline event
            </button>
          </div>
        </div>
      )}

      {/* ── 7. Protection Status ──────────────────────────────────────── */}
      {cfg.showProtection && (
        <div>
          <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100 flex items-center gap-2">
            <Shield className="h-3.5 w-3.5" /> Protection Status
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField
              label="Threat Level" options={THREAT_LEVELS}
              error={errors.threatLevel}
              value={victim.threatLevel || ""} onChange={u("threatLevel")}
            />
            <SelectField
              label="Protection Assigned" options={["Yes", "No", "Pending Review"]}
              error={errors.protectionAssigned}
              value={victim.protectionAssigned || ""} onChange={u("protectionAssigned")}
            />
          </div>
          <TextareaField
            className="mt-4"
            label="Protection Notes" rows={2}
            value={victim.notes || ""} onChange={u("notes")}
            placeholder="e.g. Victim had recent disagreements with colleague."
          />
        </div>
      )}

      {/* ── 8. Legal Status ───────────────────────────────────────────── */}
      {cfg.showLegal && (
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
                  type="button" onClick={() => removeLegal(i)}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                  title="Remove legal item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <span className={errors[`legal_${i}_label`] ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-slate-300 bg-white focus:ring-deep-ocean/30 focus:border-deep-ocean"}>{errors[`legal_${i}_label`]} </span>
              </div>
            ))}
            {(victim.legal || []).length === 0 && (
              <p className="text-xs text-slate-400 italic">No legal milestones added yet.</p>
            )}
            <button
              type="button" onClick={addLegal}
              className="text-xs flex items-center gap-1.5 text-deep-ocean hover:text-deep-ocean-900 font-medium cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add legal milestone
            </button>
          </div>
          <div className="mt-4">
            <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" /> Next Follow-Up Date
            </h5>
            <Input
              type="date"
              label="Next Follow-Up Date"
              value={victim.nextFollowUp || ""} onChange={u("nextFollowUp")}
              placeholder="e.g. 20 Dec 2025"
              error={errors.nextFollowUp}
            />
          </div>
        </div>
      )}

      {/* ── 9. Statement (only for living victims) ─────────────────────── */}
      {cfg.showStatement && (
        <div>
          <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100 flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5" /> Victim Statement
          </h5>
          <TextareaField
            label="Victim Statement / Complaint" rows={3} maxLength={1000}
            error={errors.statement}
            value={victim.statement || ""} onChange={u("statement")}
            placeholder="Statement given by victim or complainant…"
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Register-mode card — always expanded, no Edit toggle
// ─────────────────────────────────────────────────────────────────────────────
function RegisterVictimCard({ victim, idx, canRemove, onUpdate, onRemove, caseType, errors = {} }) {
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
            type="button" onClick={onRemove}
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors cursor-pointer"
            title="Remove victim"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <VictimFormFields victim={victim} idx={idx} onUpdate={onUpdate} caseType={caseType} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone-mode card — collapsed summary with Edit/Save toggle
// ─────────────────────────────────────────────────────────────────────────────
function StandaloneVictimCard({ victim, idx, canRemove, isEditing, onToggleEdit, onUpdate, onRemove, caseType, errors }) {
  const photoCount = (victim.photoUrl || []).length;

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
            type="button" onClick={onToggleEdit}
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
              type="button" onClick={onRemove}
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
            { label: "Name", value: victim.name || "—" },
            { label: "Age", value: victim.age || "—" },
            { label: "Gender", value: victim.gender || "—" },
            { label: "Contact", value: victim.contact || "—" },
            { label: "Status", value: victim.status || "—" },
            { label: "Photo", value: victim.photoUrl ? "1 attached" : "—" },].map(({ label, value }) => (
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
          {photoCount > 0 && (
            <div className="col-span-2 sm:col-span-3 mt-1">
              <img src={victim.photoUrl} alt="victim photo"
                className="w-12 h-12 object-cover rounded-md border border-slate-200" />
            </div>
          )}
        </div>
      )}

      {/* Expanded edit form */}
      {isEditing && (
        <div className="p-5">
          <VictimFormFields victim={victim} idx={idx} onUpdate={onUpdate} caseType={caseType} errors={errors} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StepVictims — main component
// ─────────────────────────────────────────────────────────────────────────────
export function StepVictims({ data = {}, setData, mode = "register", validationErrors = [] }) {
  const victims = data.victims || [];
  // case-type from the wizard's top-level form (set on step 1) drives section
  // visibility for ALL victims by default. Each victim can still override
  // via its own `victim.caseType` field.
  const caseType = data.caseType;

  const [editingIds, setEditingIds] = useState(new Set());

  const setVictims = (fn) =>
    setData(d => ({ ...d, victims: typeof fn === "function" ? fn(d.victims || []) : fn }));

  const update = (idx, k, v) =>
    setVictims(vs => vs.map((x, i) => i === idx ? { ...x, [k]: v } : x));

  const addVictim = () => {
    const item = defaultVictim();
    // Inherit case type so the form respects it from the start.
    if (caseType) item.caseType = caseType;
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
            : "Enter details for all victims. Sections adjust based on the case type."
        }
      />

      {/* Case-type indicator pill — helps users understand why some sections
          are hidden. */}
      {caseType && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Case type:</span>
          <span className="px-2 py-0.5 rounded-full bg-deep-ocean/10 text-deep-ocean font-medium">
            {caseType}
          </span>
          <span className="text-slate-400">— form sections adjusted accordingly</span>
        </div>
      )}

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
            victim={victim} idx={idx}
            canRemove={victims.length > 1}
            onUpdate={update}
            onRemove={() => removeVictim(idx)}
            caseType={caseType}
            errors={validationErrors[idx] || {}}
          />
        ) : (
          <StandaloneVictimCard
            key={victim.id}
            victim={victim} idx={idx}
            canRemove={victims.length > 1 || mode === "standalone"}
            isEditing={editingIds.has(victim.id)}
            onToggleEdit={() => toggleEdit(victim.id)}
            onUpdate={update}
            onRemove={() => removeVictim(idx)}
            caseType={caseType}
            errors={validationErrors[idx] || {}}
          />
        )
      )}

      <button
        type="button" onClick={addVictim}
        className="w-full border-2 border-dashed border-slate-300 rounded-xl py-3 text-sm text-slate-500
                   hover:border-deep-ocean hover:text-deep-ocean transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <Plus className="h-4 w-4" /> Add Another Victim
      </button>
    </div>
  );
}

export default StepVictims;