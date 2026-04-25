import { FileText as NoteIcon, TrendingUp, Calendar } from "lucide-react";
import { FieldLabel, SectionHeading, TextareaField, TextField } from "../CaseFormFields/page";

export function StepUpdateNotes({ data, setData }) {
  const set = (k) => (e) => setData(d => ({ ...d, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={NoteIcon}
        title="Update Notes & Progress"
        subtitle="Record remarks, investigation progress, and next hearing details for this case update."
      />

      <TextareaField
        label="Remarks" rows={3} maxLength={1000}
        value={data.remarks || ""} onChange={set("remarks")}
        placeholder="General remarks about this update — new evidence found, witness contacted, suspect located…"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel hint="Estimated overall case investigation completion">
            <span className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Progress (%)</span>
          </FieldLabel>
          <div className="space-y-2">
            <input
              type="range" min="0" max="100" step="5"
              value={data.progressPercent || "0"}
              onChange={set("progressPercent")}
              className="w-full accent-deep-ocean"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>0%</span>
              <span className="font-bold text-deep-ocean">{data.progressPercent || 0}%</span>
              <span>100%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-deep-ocean transition-all"
                style={{ width: `${data.progressPercent || 0}%` }}
              />
            </div>
          </div>
        </div>
        <TextField
          label="Next Hearing / Review Date" type="date"
          value={data.nextHearingDate || ""} onChange={set("nextHearingDate")}
          min={new Date().toISOString().split("T")[0]}
          hint="Scheduled next court date or review meeting"
        />
      </div>

      <TextareaField
        label="Investigator Notes" rows={5} maxLength={3000}
        value={data.investigatorNotes || ""} onChange={set("investigatorNotes")}
        placeholder="Confidential investigator field notes — observations, informant tips, planned next steps…"
      />
    </div>
  );
}
export default StepUpdateNotes;