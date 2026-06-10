import {
    Camera, Upload, Plus, Trash2, Pencil, Check,
    Hash, ImageIcon, X, FileText, AlertCircle,
} from "lucide-react";
import { useRef, useState, forwardRef, useImperativeHandle } from "react";
import {
    SectionHeading, SelectField, TextField,
    TextareaField, FieldLabel,
} from "@/pages/form/CaseFormFields/page";
import { defaultEvidence, EVIDENCE_TYPES } from "@/pages/form/caseFormConstants/page";
import InvestigatorPicker from "@/components/InvestigatorPicker";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB


export const createDefaultEvidence = () => ({
    ...defaultEvidence(),
    id: Date.now() + Math.random(),
    evidenceId: 'Auto genrated',
    type: EVIDENCE_TYPES[0] || "Physical Object",
    dateCollected: new Date().toISOString().split("T")[0],
    collectedBy: "",
    description: "",
    file: null,
    fileName: "",
    fileMime: "",
    fileDataUrl: null,
    existingFileName: null,
    photos: [],
});

// ── Per-field validators ──────────────────────────────────────────────────────
const validators = {
    type: (v) => (!v ? "Evidence type is required." : null),

    dateCollected: (v) => {
        if (!v) return "Date collected is required.";
        const today = new Date().toISOString().split("T")[0];
        if (v > today) return "Date collected cannot be in the future.";
        return null;
    },

    collectedBy: (v) => {
        if (!v || !v.trim()) return "Collected by is required.";
        if (/\d/.test(v)) return "Name must not contain numbers.";
        if (!/^[a-zA-Z\s\-'.]+$/.test(v))
            return "Name may only contain letters, spaces, hyphens, and apostrophes.";
        return null;
    },
};

/** Returns an object of { fieldName: errorString | null } for the whole card. */
const validateEvidence = (ev) => ({
    type: validators.type(ev?.type),
    dateCollected: validators.dateCollected(ev?.dateCollected),
    collectedBy: validators.collectedBy(ev?.collectedBy),
});

/** True only when every rule passes. */
export const isEvidenceValid = (ev) =>
    Object.values(validateEvidence(ev)).every((e) => e === null);

// ── Inline error helper ──────────────────────────────────────────────────────
function FieldError({ message }) {
    if (!message) return null;
    return (
        <p className="flex items-center gap-1 mt-1 text-[11px] text-red-600">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {message}
        </p>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// EvidenceCard
// ─────────────────────────────────────────────────────────────────────────────
/**
 * `ref` is forwarded so the parent (StepEvidence) can call
 * cardRef.validate() and cardRef.isValid() without prop-drilling.
 */
const EvidenceCard = forwardRef(function EvidenceCard(
    { ev, idx, isEditing, onToggleEdit, onRemove, onUpdate, onPhotoAdd, onPhotoRemove },
    ref,
) {
    const fileRef = useRef(null);
    const photoRef = useRef(null);

    // touched tracks which fields the user has interacted with so we don't
    // show errors on untouched fields immediately (HCI best practice).
    const [touched, setTouched] = useState({});
    // showAllErrors is flipped to true when the user tries to "Save" the card
    // with invalid data — reveals all errors at once.
    const [showAllErrors, setShowAllErrors] = useState(false);

    const fieldErrors = validateEvidence(ev);
    const cardIsValid = Object.values(fieldErrors).every((e) => e === null);

    // Expose helpers to the parent via ref
    useImperativeHandle(ref, () => ({
        validate: () => { setShowAllErrors(true); return cardIsValid; },
        isValid: () => cardIsValid,
    }));

    const touch = (field) => setTouched((t) => ({ ...t, [field]: true }));

    /** Show error for a field only after the user has touched it, or after a
     *  failed "Save" attempt.  */
    const errorFor = (field) =>
        (touched[field] || showAllErrors) ? fieldErrors[field] : null;

    const hasNew = !!ev?.file || ev?.fileDataUrl?.startsWith?.("data:");
    const hasExisting = !!ev?.existingFileName;

    // ── Save (collapse) button handler ────────────────────────────────────────
    const handleSave = () => {
        if (!cardIsValid) {
            // Reveal ALL errors so the user can see what needs fixing.
            setShowAllErrors(true);
            return;
        }
        setShowAllErrors(false);
        onToggleEdit();
    };

    // ── Open (edit) button handler ─────────────────────────────────────────────
    const handleEdit = () => {
        setTouched({});
        setShowAllErrors(false);
        onToggleEdit();
    };

    return (
        <div className={`border rounded-xl overflow-hidden shadow-sm transition-colors
            ${showAllErrors && !cardIsValid
                ? "border-red-300"
                : "border-slate-200"}`}>

            {/* ── Card header ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2 min-w-0">
                    <h4 className="text-sm font-bold text-slate-700 shrink-0">
                        Evidence #{idx + 1}
                    </h4>
                    {!isEditing && (
                        <span className="text-xs text-slate-400 truncate font-mono">
                            {ev?.evidenceId} — {ev?.type}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={isEditing ? handleSave : handleEdit}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer
                            ${isEditing
                                ? "bg-deep-ocean text-white hover:bg-deep-ocean/90"
                                : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-100"}`}
                    >
                        {isEditing
                            ? <><Check className="h-3.5 w-3.5" /> Save</>
                            : <><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</>}
                    </button>
                    <button
                        type="button"
                        onClick={onRemove}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                        aria-label={`Remove evidence item ${idx + 1}`}
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* ── Validation summary banner (shown only after a failed Save) ── */}
            {isEditing && showAllErrors && !cardIsValid && (
                <div className="mx-4 mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Please fix the errors below before saving this item.</span>
                </div>
            )}

            {/* ── Collapsed summary ─────────────────────────────────────────── */}
            {!isEditing && (
                <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 text-sm">
                    {[
                        { label: "Evidence ID", value: <span className="font-mono text-xs">{ev?.evidenceId}</span> },
                        { label: "Type", value: ev?.type || "—" },
                        { label: "Date", value: ev?.dateCollected || "—" },
                        { label: "Collected By", value: ev?.collectedBy || "—" },
                        { label: "File", value: <span className="truncate block max-w-40">{ev?.fileName || "None"}</span> },
                        { label: "Photos", value: `${ev?.photos?.length || 0} photo(s)` },
                    ].map(({ label, value }) => (
                        <div key={label}>
                            <span className="text-[10px] text-slate-400 block uppercase tracking-wide mb-0.5">
                                {label}
                            </span>
                            <span className="text-slate-700 font-medium">{value}</span>
                        </div>
                    ))}
                    {ev?.description && (
                        <div className="col-span-2 sm:col-span-3">
                            <span className="text-[10px] text-slate-400 block uppercase tracking-wide mb-0.5">
                                Description
                            </span>
                            <span className="text-slate-600 text-xs">{ev?.description}</span>
                        </div>
                    )}
                    {ev?.photos?.length > 0 && (
                        <div className="col-span-2 sm:col-span-3 flex flex-wrap gap-2 mt-1">
                            {ev?.photos.map((ph, pi) => (
                                <img key={pi} src={ph.dataUrl} alt={ph.name}
                                    className="w-12 h-12 object-cover rounded-md border border-slate-200" />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Edit form ─────────────────────────────────────────────────── */}
            {isEditing && (
                <div className="p-4 space-y-4">
                    {/* Row 1 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                        {/* Evidence ID — auto, read-only */}
                        <div>
                            <FieldLabel>
                                Evidence ID
                                <span className="ml-1.5 text-[10px] font-normal text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    Auto
                                </span>
                            </FieldLabel>
                            <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-500 font-mono select-all">
                                <Hash className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                {ev?.evidenceId}
                            </div>
                        </div>

                        {/* Type — required */}
                        <div>
                            <SelectField
                                label={<>Type <span className="text-red-500 ml-0.5">*</span></>}
                                options={EVIDENCE_TYPES}
                                value={ev?.type}
                                onChange={(e) => {
                                    onUpdate("type", e.target.value);
                                    touch("type");
                                }}
                                className={errorFor("type") ? "border-red-400 focus:ring-red-200" : ""}
                            />
                            <FieldError message={errorFor("type")} />
                        </div>

                        {/* Date — required, not future */}
                        <div>
                            <TextField
                                label={<>Date Collected <span className="text-red-500 ml-0.5">*</span></>}
                                type="date"
                                value={ev?.dateCollected}
                                max={new Date().toISOString().split("T")[0]}
                                onChange={(e) => {
                                    onUpdate("dateCollected", e.target.value);
                                    touch("dateCollected");
                                }}
                                className={errorFor("dateCollected") ? "border-red-400 focus:ring-red-200" : ""}
                            />
                            <FieldError message={errorFor("dateCollected")} />
                        </div>

                        {/* Collected By — required, no numbers */}
                        <div>
                            <InvestigatorPicker
                                label={<>Collected By <span className="text-red-500 ml-0.5">*</span></>}
                                storeAs="displayLabel"
                                hint="Officer or forensic team that collected this item"
                                value={ev?.collectedBy || ""}
                                onChange={(v) => {
                                    onUpdate("collectedBy", v);
                                    touch("collectedBy");
                                }}
                                error={errorFor("collectedBy")}
                            />
                        </div>
                    </div>

                    {/* Description — optional */}
                    <TextareaField
                        label="Description"
                        rows={2}
                        value={ev?.description}
                        onChange={(e) => onUpdate("description", e.target.value)}
                        placeholder="Brief description of this evidence item…"
                    />

                    {/* File + Photos */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* ── Attach File ─────────────────────────────────── */}
                        <div>
                            <FieldLabel>
                                Attach File
                                {hasNew && (
                                    <span className="ml-1.5 text-[10px] font-normal text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                        new
                                    </span>
                                )}
                                {!hasNew && hasExisting && (
                                    <span className="ml-1.5 text-[10px] font-normal text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                        on server
                                    </span>
                                )}
                            </FieldLabel>
                            <input
                                ref={fileRef}
                                type="file"
                                className="hidden"
                                accept="image/*,.pdf,.doc,.docx,.txt,.rtf,.mp4,.webm,.mov,.avi,.mkv,.zip,.rar,.7z,.tar,.gz"
                                onChange={(e) => {
                                    const f = e.target.files[0];
                                    if (!f) return;

                                    // ── File size guard ──────────────────
                                    if (f.size > MAX_FILE_BYTES) {
                                        onUpdate("fileError", `File is too large. Maximum allowed size is 50 MB (this file is ${(f.size / 1024 / 1024).toFixed(1)} MB).`);
                                        e.target.value = "";
                                        return;
                                    }

                                    onUpdate("fileError", null);
                                    onUpdate("file", f);
                                    onUpdate("fileName", f.name);
                                    onUpdate("fileMime", f.type || "");
                                    onUpdate("existingFileName", null);
                                    onUpdate("fileDataUrl", null);
                                    e.target.value = "";
                                }}
                            />
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    className="flex items-center gap-2 flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer min-w-0"
                                >
                                    <Upload className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{ev?.fileName || "Upload file…"}</span>
                                </button>
                                {(hasNew || hasExisting) && (
                                    <button
                                        type="button"
                                        title="Remove file"
                                        onClick={() => {
                                            onUpdate("file", null);
                                            onUpdate("fileName", "");
                                            onUpdate("fileMime", "");
                                            onUpdate("existingFileName", null);
                                            onUpdate("fileDataUrl", null);
                                            onUpdate("fileError", null);
                                        }}
                                        className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            {ev?.fileError && (
                                <p className="flex items-center gap-1 mt-1.5 text-[11px] text-red-600">
                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                    {ev?.fileError}
                                </p>
                            )}
                            {hasExisting && !hasNew && !ev?.fileError && (
                                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    Pick a new file to replace the saved one.
                                </p>
                            )}
                        </div>

                        {/* ── Photos ──────────────────────────────────────── */}
                        <div>
                            <FieldLabel>Photos</FieldLabel>
                            <input
                                ref={photoRef}
                                type="file"
                                className="hidden"
                                accept="image/*"
                                multiple
                                onChange={(e) => {
                                    Array.from(e.target.files).forEach((f) => {
                                        const reader = new FileReader();
                                        reader.onload = (e2) =>
                                            onPhotoAdd({ name: f.name, dataUrl: e2.target.result });
                                        reader.readAsDataURL(f);
                                    });
                                    e.target.value = "";
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => photoRef.current?.click()}
                                className="flex items-center gap-2 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                <ImageIcon className="h-4 w-4 shrink-0" />
                                {ev?.photos?.length > 0
                                    ? `${ev?.photos.length} photo(s) added`
                                    : "Add photos…"}
                            </button>
                        </div>
                    </div>

                    {/* Photo thumbnails */}
                    {ev?.photos?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {ev?.photos.map((ph, pi) => (
                                <div
                                    key={pi}
                                    className="relative group w-16 h-16 rounded-lg overflow-hidden border border-slate-200"
                                >
                                    <img src={ph.dataUrl} alt={ph.name} className="w-full h-full object-cover" />
                                    {ph.existingPhotoId && (
                                        <span className="absolute top-0 left-0 text-[8px] bg-emerald-600/80 text-white px-1 py-0.5 rounded-br-md">
                                            saved
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => onPhotoRemove(pi)}
                                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                        aria-label={`Remove photo ${pi + 1}`}
                                    >
                                        <X className="h-4 w-4 text-white" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// StepEvidence
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Exposes `validate()` and `isValid()` via a forwarded ref so the parent
 * dialog can gate submission.
 *
 *   validate() — triggers "show all errors" on every open card and returns
 *                true only if every item passes.
 *   isValid()  — silent check, no side-effects.
 *   hasOpenCards() — returns true if any card is still in edit mode.
 */
export const StepEvidence = forwardRef(function StepEvidence({ data = {}, setData }, ref) {
    const evidences = data.evidences || [];
    const [editingIds, setEditingIds] = useState(new Set());

    // One ref per card, keyed by evidence.id
    const cardRefs = useRef({});

    const setEvidences = (fn) =>
        setData((d) => ({ ...d, evidences: typeof fn === "function" ? fn(d.evidences || []) : fn }));

    const update = (idx, k, v) =>
        setEvidences((es) => es.map((e, i) => (i === idx ? { ...e, [k]: v } : e)));

    const addPhoto = (idx, photo) =>
        setEvidences((es) =>
            es.map((e, i) => (i === idx ? { ...e, photos: [...(e.photos || []), photo] } : e)));

    const removePhoto = (idx, pi) =>
        setEvidences((es) =>
            es.map((e, i) => (i === idx ? { ...e, photos: e.photos.filter((_, j) => j !== pi) } : e)));

    const addEvidence = () => {
        const item = createDefaultEvidence();
        setEvidences((es) => [...es, item]);
        setEditingIds((prev) => new Set([...prev, item.id]));
    };

    const removeEvidence = (idx) => {
        const id = evidences[idx]?.id;
        delete cardRefs.current[id];
        setEvidences((es) => es.filter((_, i) => i !== idx));
        setEditingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    };

    const toggleEdit = (id) =>
        setEditingIds((prev) => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
        });

    // ── Imperative API for the parent Dialog ────────────────────────────────
    useImperativeHandle(ref, () => ({
        /** Triggers validation display on every card and returns overall validity. */
        validate() {
            let allValid = true;
            for (const id of Object.keys(cardRefs.current)) {
                const ok = cardRefs.current[id]?.validate?.();
                if (!ok) allValid = false;
            }
            return allValid && evidences.length > 0;
        },
        /** Silent check — no UI side-effects. */
        isValid() {
            if (!evidences.length) return false;
            return evidences.every((ev) => isEvidenceValid(ev));
        },
        /** True if any card is still open (unsaved edits). */
        hasOpenCards() {
            return editingIds.size > 0;
        },
    }));

    return (
        <div className="space-y-6">
            <SectionHeading
                icon={Camera}
                title="Evidence & Attachments"
                subtitle="Upload physical evidence photos, FIR scan, forensic documents, CCTV footage, and other case files."
            />

            {evidences.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-xl text-slate-500">
                    <Camera className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No evidence added yet</p>
                    <p className="text-xs mt-1">Click the button below to attach evidence items</p>
                </div>
            )}

            {evidences.map((ev, idx) => (
                <EvidenceCard
                    key={ev?.id}
                    ref={(el) => { if (el) cardRefs.current[ev?.id] = el; else delete cardRefs.current[ev?.id]; }}
                    ev={ev}
                    idx={idx}
                    isEditing={editingIds.has(ev?.id)}
                    onToggleEdit={() => toggleEdit(ev?.id)}
                    onRemove={() => removeEvidence(idx)}
                    onUpdate={(k, v) => update(idx, k, v)}
                    onPhotoAdd={(photo) => addPhoto(idx, photo)}
                    onPhotoRemove={(pi) => removePhoto(idx, pi)}
                />
            ))}

            <button
                type="button"
                onClick={addEvidence}
                className="w-full border-2 border-dashed border-slate-300 rounded-xl py-3 text-sm text-slate-500
                           hover:border-deep-ocean hover:text-deep-ocean transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
                <Plus className="h-4 w-4" /> Add Evidence Item
            </button>
        </div>
    );
});

export default StepEvidence;