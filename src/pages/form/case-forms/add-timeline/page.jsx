// ══════════════════════════════════════════════════════════════════════════════
// 3. ADD TIMELINE EVENT MODAL
// ══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { FieldLabel, Input, ModalShell, Overlay, SaveBtn, SelectField, TextareaField } from "../CaseFormFields/page";
import { Clock } from "lucide-react";

/**
 * ── ANSWER TO YOUR QUESTION ABOUT THE TIMELINE ────────────────────────────────
 * Your current CaseTimeline.jsx has HARDCODED mock data (6 static events).
 * The timeline should be BOTH:
 *   AUTO  — system auto-logs: FIR filed, evidence added, status changed, lead
 *           generated, suspect arrested, case updated, report generated.
 *           These are created by your backend with event_type="system".
 *   MANUAL — investigator manually logs: field visit, witness interview, court
 *           date, informant contact, surveillance ops, etc.
 *           These are created by this modal with event_type="manual".
 *
 * ── WHERE TO ADD THE "Add Event" BUTTON ────────────────────────────────────────
 *  In CaseTimeline.jsx — add a button in the section header:
 *    <button onClick={() => setShowAdd(true)}>+ Add Event</button>
 *    {showAdd && <AddTimelineModal caseId={caseId} onClose={…} onSave={…} />}
 *
 *  Also expose from:
 *    - Update Case step 8 (UpdateNotes) — "Log Timeline Event" shortcut button
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Props:
 *   caseId  — current case ID
 *   onClose — close handler
 *   onSave  — callback(newEvent) — prepend to timeline in CaseTimeline
 */
export function AddTimelineModal({ caseId = "C-2052", onClose, onSave }) {
  const [form, setForm] = useState({
    caseId,
    eventType: "",
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
    location: "",
    officerName: "",
    outcome: "",
    followUpRequired: false,
    followUpDate: "",
    attachmentNote: "",
    severity: "Normal",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => ({ ...er, [k]: "" })); };

  const validate = () => {
    const e = {};
    if (!form.eventType)          e.eventType  = "Event type is required";
    if (!form.title.trim())       e.title      = "Title is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (!form.date)               e.date        = "Date is required";
    if (!form.officerName.trim()) e.officerName = "Officer name is required";
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
      id: "TL-" + Date.now(),
      eventSource: "manual",
      createdAt: new Date().toISOString(),
    });
    onClose();
  };

  // Event type → icon colour mapping
  const EVENT_COLORS = {
    "Field Visit":         "bg-blue-100 text-blue-700",
    "Witness Interview":   "bg-purple-100 text-purple-700",
    "Suspect Interview":   "bg-amber-100 text-amber-700",
    "Arrest":              "bg-red-100 text-red-700",
    "Evidence Collection": "bg-teal-100 text-teal-700",
    "Court Hearing":       "bg-indigo-100 text-indigo-700",
    "Surveillance":        "bg-slate-100 text-slate-700",
    "Informant Contact":   "bg-orange-100 text-orange-700",
    "Forensic Visit":      "bg-cyan-100 text-cyan-700",
    "Status Update":       "bg-green-100 text-green-700",
    "Note / Observation":  "bg-yellow-100 text-yellow-700",
    "Other":               "bg-slate-100 text-slate-600",
  };

  return (
    <Overlay onClose={onClose}>
      <ModalShell
        title="Add Timeline Event"
        subtitle={`Manual entry for Case ${caseId}`}
        icon={Clock}
        accentColor="bg-emerald-700"
        onClose={onClose}
        maxW="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Info */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
            <Clock className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-700 leading-relaxed">
              <strong>Manual events</strong> (field visits, interviews, court dates) are added here.
              System events (FIR filed, evidence added, status changes) are auto-logged by the system.
            </div>
          </div>

          {/* Event type with colour preview */}
          <FieldLabel label="Event Type" required error={errors.eventType}>
            <div className="space-y-2">
              <SelectField
                options={Object.keys(EVENT_COLORS)}
                value={form.eventType} onChange={set("eventType")} error={errors.eventType}
              />
              {form.eventType && (
                <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${EVENT_COLORS[form.eventType]}`}>
                  {form.eventType}
                </span>
              )}
            </div>
          </FieldLabel>

          <FieldLabel label="Event Title" required error={errors.title}>
            <Input value={form.title} onChange={set("title")} placeholder="Brief title e.g. Witness Aamir interviewed at Gulshan PS" error={errors.title} />
          </FieldLabel>

          <div className="grid grid-cols-2 gap-3">
            <FieldLabel label="Date" required error={errors.date}>
              <Input type="date" value={form.date} onChange={set("date")} max={new Date().toISOString().split("T")[0]} error={errors.date} />
            </FieldLabel>
            <FieldLabel label="Time">
              <Input type="time" value={form.time} onChange={set("time")} />
            </FieldLabel>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldLabel label="Location of Event">
              <Input value={form.location} onChange={set("location")} placeholder="Where this event took place" />
            </FieldLabel>
            <FieldLabel label="Officer / Officer in Charge" required error={errors.officerName}>
              <Input value={form.officerName} onChange={set("officerName")} placeholder="Name of responsible officer" error={errors.officerName} />
            </FieldLabel>
          </div>

          <FieldLabel label="Description / Detailed Notes" required error={errors.description}>
            <TextareaField
              value={form.description} onChange={set("description")} rows={5}
              placeholder="Full description of what happened, who was present, what was discovered, what was said…"
              error={errors.description}
            />
          </FieldLabel>

          <FieldLabel label="Outcome / Result">
            <Input value={form.outcome} onChange={set("outcome")} placeholder="What was the result of this event? e.g. Witness provided new lead, suspect denied…" />
          </FieldLabel>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldLabel label="Severity / Significance">
              <SelectField options={["Critical", "High", "Normal", "Low", "Administrative"]} value={form.severity} onChange={set("severity")} />
            </FieldLabel>
            <FieldLabel label="Attachment Note">
              <Input value={form.attachmentNote} onChange={set("attachmentNote")} placeholder="Photo, document, audio ref…" />
            </FieldLabel>
          </div>

          {/* Follow-up */}
          <div className={`border rounded-xl p-4 space-y-3 transition-all ${form.followUpRequired ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-slate-50"}`}>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox" checked={form.followUpRequired}
                onChange={() => setForm(f => ({ ...f, followUpRequired: !f.followUpRequired }))}
                className="w-4 h-4 rounded accent-deep-ocean"
              />
              <span className="font-medium text-slate-800">Follow-up Required</span>
            </label>
            {form.followUpRequired && (
              <FieldLabel label="Follow-up Date">
                <Input type="date" value={form.followUpDate} onChange={set("followUpDate")} min={new Date().toISOString().split("T")[0]} />
              </FieldLabel>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-300 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
              Cancel
            </button>
            <SaveBtn saving={saving} label="Add to Timeline" icon={Clock} />
          </div>
        </form>
      </ModalShell>
    </Overlay>
  );
}