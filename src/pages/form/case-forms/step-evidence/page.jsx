/**
 * src/pages/form/case-forms/step-evidence/page.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Evidence step — used in three surfaces:
 *
 *   1. RegisterCasePage wizard step 7
 *   2. AddEvidenceDialog (case detail "Add Evidence")
 *   3. AddEvidenceDialog (case detail "Update Evidence", initialData given)
 *
 * This component is purely a CONTROLLED form. It never calls the API itself.
 * Submission flows through services/evidenceApi.js — that keeps register-case
 * (which posts the case first, then the evidences), add-mode (POST to existing
 * case), and update-mode (PATCH + photo POST/DELETE) on the same code path.
 *
 * Photo state shape
 * ─────────────────
 * Each photo is one of:
 *   • New (just added in this session):
 *       { name, dataUrl: "data:image/...;base64,..." }
 *   • Existing (loaded from server in update mode):
 *       { existingPhotoId, name, dataUrl: "https://...uploads/..." }
 *
 * The `existingPhotoId` flag is what evidenceApi uses to decide whether to
 * skip a photo (already saved) or POST it (net-new). Don't drop that flag
 * when round-tripping through this component.
 */

import { Camera, Upload, Plus, Trash2, Pencil, Check, Hash, ImageIcon, X } from "lucide-react";
import { useRef, useState } from "react";
import { SectionHeading, SelectField, TextField, TextareaField, FieldLabel } from "@/pages/form/case-forms/CaseFormFields/page";
import { defaultEvidence, EVIDENCE_TYPES } from "@/pages/form/case-forms/caseFormConstants/page";

// ── Helpers ────────────────────────────────────────────────────────────────
const generateEvidenceId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `EVD-${ts}-${rand}`;
};

export const createDefaultEvidence = () => ({
  ...defaultEvidence(),
  id:            Date.now() + Math.random(),    // React key (numeric, never sent)
  evidenceId:    "auto generate",           // display ID (sent to backend)
  type:          EVIDENCE_TYPES[0] || "Physical Object",
  dateCollected: new Date().toISOString().split("T")[0],
  collectedBy:   "", // could default to logged-in user if auth is implemented
  description:   "",
  fileName:      "",
  photos:        [],
});

// ── EvidenceCard ───────────────────────────────────────────────────────────
function EvidenceCard({ ev, idx, isEditing, onToggleEdit, onRemove, onUpdate, onPhotoAdd, onPhotoRemove }) {
  const fileRef = useRef(null);
  const photoRef = useRef(null);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">

      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2 min-w-0">
          <h4 className="text-sm font-bold text-slate-700 shrink-0">Evidence #{idx + 1}</h4>
          {!isEditing && (
            <span className="text-xs text-slate-400 truncate font-mono">{ev.evidenceId} — {ev.type}</span>
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
          <button type="button" onClick={onRemove}
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors cursor-pointer">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Collapsed summary */}
      {!isEditing && (
        <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 text-sm">
          {[
            { label: "Evidence ID", value: <span className="font-mono text-xs">{ev.evidenceId}</span> },
            { label: "Type",        value: ev.type || "—" },
            { label: "Date",        value: ev.dateCollected || "—" },
            { label: "Collected By",value: ev.collectedBy || "—" },
            { label: "File",        value: <span className="truncate block max-w-40">{ev.fileName || "None"}</span> },
            { label: "Photos",      value: `${ev.photos?.length || 0} photo(s)` },
          ].map(({ label, value }) => (
            <div key={label}>
              <span className="text-[10px] text-slate-400 block uppercase tracking-wide mb-0.5">{label}</span>
              <span className="text-slate-700 font-medium">{value}</span>
            </div>
          ))}
          {ev.description && (
            <div className="col-span-2 sm:col-span-3">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wide mb-0.5">Description</span>
              <span className="text-slate-600 text-xs">{ev.description}</span>
            </div>
          )}
          {ev.photos?.length > 0 && (
            <div className="col-span-2 sm:col-span-3 flex flex-wrap gap-2 mt-1">
              {ev.photos.map((ph, pi) => (
                <img key={pi} src={ph.dataUrl} alt={ph.name}
                  className="w-12 h-12 object-cover rounded-md border border-slate-200" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit form */}
      {isEditing && (
        <div className="p-4 space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            {/* Evidence ID – auto, read-only */}
            <div>
              <FieldLabel>
                Evidence ID
                <span className="ml-1.5 text-[10px] font-normal text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Auto</span>
              </FieldLabel>
              <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-500 font-mono select-all">
                <Hash className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                {ev.evidenceId}
              </div>
            </div>

            {/* Type — uses string-array EVIDENCE_TYPES from constants. SelectField
                 accepts either string[] or {value,label}[], so we pass strings. */}
            <SelectField label="Type" options={EVIDENCE_TYPES} value={ev.type}
              onChange={e => onUpdate("type", e.target.value)} />

            {/* Date – auto-filled (today), editable */}
            <TextField label="Date Collected" type="date" value={ev.dateCollected}
              onChange={e => onUpdate("dateCollected", e.target.value)}
              max={new Date().toISOString().split("T")[0]} />

            {/* Collected By – pre-filled, editable */}
            <TextField label="Collected By" value={ev.collectedBy}
              onChange={e => onUpdate("collectedBy", e.target.value)}
              placeholder="Officer / Forensic team name" />
          </div>

          {/* Description */}
          <TextareaField label="Description" rows={2} value={ev.description}
            onChange={e => onUpdate("description", e.target.value)}
            placeholder="Brief description of this evidence item…" />

          {/* File + Photos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Attach File</FieldLabel>
              <input ref={fileRef} type="file" className="hidden"
                accept="image/*,.pdf,.mp4,.avi,.mov"
                onChange={e => {
                  const f = e.target.files[0];
                  if (f) {
                    onUpdate("fileName", f.name);
                    onUpdate("fileMime", f.type || "");
                  }
                }} />
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                <Upload className="h-4 w-4 shrink-0" />
                <span className="truncate">{ev.fileName || "Upload file…"}</span>
              </button>
            </div>

            <div>
              <FieldLabel>Photos</FieldLabel>
              <input ref={photoRef} type="file" className="hidden" accept="image/*" multiple
                onChange={e => {
                  Array.from(e.target.files).forEach(f => {
                    const reader = new FileReader();
                    reader.onload = e2 => onPhotoAdd({ name: f.name, dataUrl: e2.target.result });
                    reader.readAsDataURL(f);
                  });
                  e.target.value = "";
                }} />
              <button type="button" onClick={() => photoRef.current?.click()}
                className="flex items-center gap-2 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                <ImageIcon className="h-4 w-4 shrink-0" />
                {ev.photos?.length > 0 ? `${ev.photos.length} photo(s) added` : "Add photos…"}
              </button>
            </div>
          </div>

          {/* Photo thumbnails. The X button only flags the photo as removed
              from local state — for already-saved photos in update-mode the
              caller must call deleteEvidencePhoto() separately to actually
              delete them on the server. AddEvidenceDialog handles that. */}
          {ev.photos?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {ev.photos.map((ph, pi) => (
                <div key={pi} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                  <img src={ph.dataUrl} alt={ph.name} className="w-full h-full object-cover" />
                  {ph.existingPhotoId && (
                    <span className="absolute top-0 left-0 text-[8px] bg-emerald-600/80 text-white px-1 py-0.5 rounded-br-md">
                      saved
                    </span>
                  )}
                  <button type="button" onClick={() => onPhotoRemove(pi)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
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
}

// ── StepEvidence (used in register-case wizard + AddEvidenceDialog) ────────
export function StepEvidence({ data = {}, setData }) {
  const evidences = data.evidences || [];
  const [editingIds, setEditingIds] = useState(new Set());

  const setEvidences = fn =>
    setData(d => ({ ...d, evidences: typeof fn === "function" ? fn(d.evidences || []) : fn }));

  const update = (idx, k, v) =>
    setEvidences(es => es.map((e, i) => i === idx ? { ...e, [k]: v } : e));

  const addPhoto = (idx, photo) =>
    setEvidences(es => es.map((e, i) => i === idx ? { ...e, photos: [...(e.photos || []), photo] } : e));

  const removePhoto = (idx, pi) =>
    setEvidences(es => es.map((e, i) => i === idx ? { ...e, photos: e.photos.filter((_, j) => j !== pi) } : e));

  const addEvidence = () => {
    const item = createDefaultEvidence();
    setEvidences(es => [...es, item]);
    setEditingIds(prev => new Set([...prev, item.id]));
  };

  const removeEvidence = idx => {
    const id = evidences[idx]?.id;
    setEvidences(es => es.filter((_, i) => i !== idx));
    setEditingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  const toggleEdit = id =>
    setEditingIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

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
          key={ev.id}
          ev={ev} idx={idx}
          isEditing={editingIds.has(ev.id)}
          onToggleEdit={() => toggleEdit(ev.id)}
          onRemove={() => removeEvidence(idx)}
          onUpdate={(k, v) => update(idx, k, v)}
          onPhotoAdd={photo => addPhoto(idx, photo)}
          onPhotoRemove={pi => removePhoto(idx, pi)}
        />
      ))}

      <button type="button" onClick={addEvidence}
        className="w-full border-2 border-dashed border-slate-300 rounded-xl py-3 text-sm text-slate-500
                   hover:border-deep-ocean hover:text-deep-ocean transition-all flex items-center justify-center gap-2 cursor-pointer">
        <Plus className="h-4 w-4" /> Add Evidence Item
      </button>
    </div>
  );
}

export default StepEvidence;