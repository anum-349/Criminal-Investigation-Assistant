import { useRef, useState } from "react";
import { Hash, Plus, Trash2, Users, Pencil, Check, ImageIcon, X } from "lucide-react";
import { defaultSuspect, SUSPECT_STATUSES } from "@/pages/form/caseFormConstants/page";
import { CheckField, FieldLabel, SectionHeading, SelectField, TextareaField, TextField } from "@/pages/form/CaseFormFields/page";

const RELATION_OPTIONS = [
    "Neighbor", "Colleague", "Family Member", "Acquaintance",
    "Resident", "Witness", "Business Associate", "Unknown",
];

// export from StepSuspects.jsx
export const validateSuspect = (s) => {
    const errors = {};
    const CNIC_RE = /^\d{5}-\d{7}-\d$/;
    const PHONE_RE = /^(\+92|0)[-\s]?\d{3}[-\s]?\d{7}$/;

    if (s.name && (s.name.length < 3 || /\d/.test(s.name)))
        errors.name = "Enter a valid name (no numbers, at least 3 characters)";

    if (s.cnic && !CNIC_RE.test(s.cnic.trim()))
        errors.cnic = "Format: 00000-0000000-0";

    if (s.contact && !PHONE_RE.test(s.contact.trim()))
        errors.contact = "Format: 0300-1234567 or +92-300-1234567";

    if (s.age !== undefined && s.age !== "" && Number(s.age) < 7)
        errors.age = "Suspect must be at least 7 years old";

    if (s.age !== undefined && s.age !== "" && Number(s.age) > 120)
        errors.age = "Age must be 120 or less";

    if (!s.reason?.trim())
        errors.reason = "Reason for suspicion is required";

    return errors;
};

// ── SuspectFormFields — all editable fields extracted into one reusable block ──
function SuspectFormFields({ suspect, idx, onUpdate, errors }) {
    const u = (k) => (e) => onUpdate(idx, k, e.target.value);
    const photoRef = useRef(null)

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <FieldLabel>
                        Suspect ID
                        <span className="ml-1.5 text-[10px] font-normal text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Auto</span>
                    </FieldLabel>
                    <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-500 font-mono select-all">
                        <Hash className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        Auto generate
                    </div>
                </div>

                <TextField label="Full Name (if known)" value={suspect?.name} onChange={u("name")} placeholder="Leave blank if unknown" error={errors.name} />
                <SelectField
                    label="Relation to Case"
                    options={RELATION_OPTIONS}
                    value={suspect?.relationToCase}
                    onChange={u("relationToCase")}
                />
                <TextField label="CNIC Number" value={suspect?.cnic} onChange={u("cnic")} placeholder="XXXXX-XXXXXXX-X" error={errors.cnic} />
                <TextField label="Age (Approximate)" type="number" min="0" max="120" value={suspect?.age} onChange={u("age")} error={errors.age} />
                <SelectField label="Gender" options={["Male", "Female", "Transgender / Other", "Unknown"]} value={suspect?.gender} onChange={u("gender")} required />
                <SelectField label="Suspect Status" options={SUSPECT_STATUSES} value={suspect?.status} onChange={u("status")} required />
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
                        reader.onload = e2 => onUpdate(idx, "photoUrl", [{ name: f.name, dataUrl: e2.target.result }]);
                        reader.readAsDataURL(f);
                        e.target.value = "";
                    }}
                />
                {!suspect?.photoUrl ? (
                    <button type="button" onClick={() => photoRef.current?.click()}
                        className="flex items-center gap-2 w-full border border-slate-300 rounded-lg px-3 py-2
                        text-sm text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                        <ImageIcon className="h-4 w-4 shrink-0" /> Add photo…
                    </button>
                ) : (
                    <div className="relative group w-24 h-24 rounded-lg overflow-hidden border border-slate-200">
                        <img
                            src={typeof suspect?.photoUrl === 'string' ? suspect?.photoUrl : suspect?.photoUrl?.[0]?.dataUrl}
                            alt={suspect?.name}
                            className="w-full h-full object-cover"
                        />
                        {suspect?._hadPhoto && (
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
                )}
            </div>

            <TextareaField
                label="Reason for Suspicion"
                rows={2}
                value={suspect?.reason}
                onChange={u("reason")}
                error={errors.reason}
                placeholder="Why is this person a suspect? Observed behaviour, witness testimony, forensic link…"
            />

            <TextareaField
                label="Alibi / Statement"
                rows={2}
                value={suspect?.alibi}
                onChange={u("alibi")}
                placeholder="What did the suspect say? Deny involvement, provide alibi, refused to comment…"
            />

            <TextareaField
                label="Physical Description" rows={2} maxLength={500}
                value={suspect?.physicalDescription} onChange={u("physicalDescription")}
                placeholder="Height, build, skin tone, hair, distinguishing marks, clothing at time of incident…"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Last Known Address" value={suspect?.address} onChange={u("address")} placeholder="Last known residential address" />
                <TextField label="Contact Number" value={suspect?.contact} onChange={u("contact")} placeholder="+92-XXX-XXXXXXX" error={errors.contact} />
                <TextField label="Occupation" value={suspect?.occupation} onChange={u("occupation")} placeholder="If known" />
                <TextField label="Known Affiliations / Gang" value={suspect?.knownAffiliations} onChange={u("knownAffiliations")} placeholder="Criminal gang, organisation etc." />
                <TextField label="Escape Vehicle Description" value={suspect?.vehicleDescription} onChange={u("vehicleDescription")} placeholder="Color, make, model, registration" />
                <SelectField label="Method of Arrival / Escape" options={["On Foot", "Motorcycle", "Car", "Rickshaw", "Public Transport", "Unknown"]} value={suspect?.arrivalMethod} onChange={u("arrivalMethod")} />
            </div>

            <div className="flex flex-wrap gap-5">
                <CheckField label="Has Prior Criminal Record" checked={suspect?.criminalRecord} onChange={v => onUpdate(idx, "criminalRecord", v)} />
                <CheckField label="Currently Arrested" checked={suspect?.arrested} onChange={v => onUpdate(idx, "arrested", v)} />
            </div>

            <TextareaField
                label="Additional Notes" rows={2} maxLength={500}
                value={suspect?.notes} onChange={u("notes")}
                placeholder="Any other relevant information about this suspect…"
            />
        </div>
    );
}

// ── Register mode card — always expanded, no Edit button ──────────────────
function RegisterSuspectCard({ suspect, idx, canRemove, onUpdate, onRemove, errors = {} }) {
    return (
        <div className="border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                    </div>
                    Suspect #{idx + 1}
                    {suspect?._extractedByAI && (
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
                        title="Remove"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>

            <SuspectFormFields suspect={suspect} idx={idx} onUpdate={onUpdate} errors={errors} />
        </div>
    );
}

// ── Standalone mode card — collapsed summary with Edit button ─────────────
function StandaloneSuspectCard({ suspect, idx, canRemove, isEditing, onToggleEdit, onUpdate, onRemove, errors }) {
    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">

            {/* Card header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {idx + 1}
                    </div>
                    <h4 className="text-sm font-bold text-slate-700 shrink-0">Suspect #{idx + 1}</h4>
                    {!isEditing && (
                        <span className="text-xs text-slate-400 truncate font-mono">
                            {suspect?.id}{suspect?.name ? ` — ${suspect?.name}` : ""}
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
                        {isEditing ? <><Check className="h-3.5 w-3.5" /> Save</> : <><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</>}
                    </button>
                    {canRemove && (
                        <button
                            type="button"
                            onClick={onRemove}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Remove"
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
                        { label: "Suspect ID", value: <span className="font-mono text-xs">{suspect?.id}</span> },
                        { label: "Name", value: suspect?.name || "—" },
                        { label: "Relation", value: suspect?.relationToCase || "—" },
                        { label: "Status", value: suspect?.status || "—" },
                        { label: "Age", value: suspect?.age || "—" },
                        { label: "Gender", value: suspect?.gender || "—" },
                    ].map(({ label, value }) => (
                        <div key={label}>
                            <span className="text-[10px] text-slate-400 block uppercase tracking-wide mb-0.5">{label}</span>
                            <span className="text-slate-700 font-medium">{value}</span>
                        </div>
                    ))}
                    {suspect?.reason && (
                        <div className="col-span-2 sm:col-span-3">
                            <span className="text-[10px] text-slate-400 block uppercase tracking-wide mb-0.5">Reason for Suspicion</span>
                            <span className="text-slate-600 text-xs">{suspect?.reason}</span>
                        </div>
                    )}
                    {suspect?.alibi && (
                        <div className="col-span-2 sm:col-span-3">
                            <span className="text-[10px] text-slate-400 block uppercase tracking-wide mb-0.5">Alibi / Statement</span>
                            <span className="text-slate-600 text-xs">{suspect?.alibi}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Expanded edit form */}
            {isEditing && (
                <div className="p-5">
                    <SuspectFormFields suspect={suspect} idx={idx} onUpdate={onUpdate} errors={errors} />
                </div>
            )}
        </div>
    );
}

// ── StepSuspects ───────────────────────────────────────────────────────────
export function StepSuspects({ data = {}, setData, mode = "register", validationErrors = [] }) {
    const suspects = data.suspects || [];
    const [editingIds, setEditingIds] = useState(new Set());

    const setSuspects = (fn) =>
        setData(d => ({ ...d, suspects: typeof fn === "function" ? fn(d.suspects || []) : fn }));

    const update = (idx, k, v) =>
        setSuspects(ss => ss.map((x, i) => i === idx ? { ...x, [k]: v } : x));

    const addSuspect = () => {
        const item = { ...defaultSuspect, id: crypto.randomUUID() };
        setSuspects(ss => [...ss, item]);
        if (mode === "standalone") {
            setEditingIds(prev => new Set([...prev, item.id]));
        }
    };

    const removeSuspect = (idx) => {
        const id = suspects[idx]?.id;
        setSuspects(ss => ss.filter((_, i) => i !== idx));
        setEditingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    };

    const toggleEdit = (id) =>
        setEditingIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

    return (
        <div className="space-y-6">
            <SectionHeading
                icon={Users}
                title="Suspect Information"
                subtitle={
                    mode === "standalone"
                        ? "Add suspect details linked to the selected case."
                        : "Review and complete suspect details extracted from the FIR. You can add more suspects below."
                }
            />

            {suspects.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-xl text-slate-500">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No suspects added yet</p>
                    <p className="text-xs mt-1">Click the button below to add suspect details</p>
                </div>
            )}

            {suspects.map((suspect, idx) =>
                mode === "register" ? (
                    <RegisterSuspectCard
                        key={suspect?.id}
                        suspect={suspect}
                        idx={idx}
                        canRemove={suspects.length > 1}
                        onUpdate={update}
                        onRemove={() => removeSuspect(idx)}
                        errors={validationErrors[idx] || {}}
                    />
                ) : (
                    <StandaloneSuspectCard
                        key={suspect?.id}
                        suspect={suspect}
                        idx={idx}
                        canRemove={suspects.length > 1 || mode === "standalone"}
                        isEditing={editingIds.has(suspect?.id)}
                        onToggleEdit={() => toggleEdit(suspect?.id)}
                        onUpdate={update}
                        onRemove={() => removeSuspect(idx)}
                        errors={validationErrors[idx] || {}}
                    />
                )
            )}

            <button
                type="button"
                onClick={addSuspect}
                className="w-full border-2 border-dashed border-slate-300 rounded-xl py-3 text-sm text-slate-500
                           hover:border-deep-ocean hover:text-deep-ocean transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
                <Plus className="h-4 w-4" /> Add Another Suspect
            </button>
        </div>
    );
}

export default StepSuspects;