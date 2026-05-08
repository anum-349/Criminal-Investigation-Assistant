// ─────────────────────────────────────────────────────────────────────────────
/**
 * StepReview.jsx  —  Step 9
 * Place at: src/pages/investigator/case-forms/StepReview.jsx
 */
import { CheckCircle2, FileText, MapPin, User, Users, Gavel, Camera, Shield } from "lucide-react";
import { SectionHeading } from "@/pages/form/case-forms/CaseFormFields/page";

const ReviewRow = ({ label, value }) =>
  value ? (
    <div className="flex gap-3 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs font-semibold text-slate-500 w-40 shrink-0">{label}</span>
      <span className="text-xs text-slate-800 flex-1">{value}</span>
    </div>
  ) : null;

const ReviewSection = ({ color, icon: Icon, title, children }) => (
  <div className="border border-slate-200 rounded-xl overflow-hidden">
    <div className={`${color} px-4 py-2.5 flex items-center gap-2`}>
      <Icon className="h-4 w-4 text-white" />
      <h4 className="text-sm font-bold text-white">{title}</h4>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

export function StepReview({ data, mode = "register" }) {
  const victims  = data.victims  || [];
  const suspects = data.suspects || [];
  const evidences = data.evidences || [];

  return (
    <div className="space-y-5">
      <SectionHeading
        icon={CheckCircle2}
        title={mode === "update" ? "Review & Save Changes" : "Review & Submit"}
        subtitle="Review all entered information before submitting. Go back to any step to make corrections."
      />

      {/* Case */}
      <ReviewSection color="bg-deep-ocean" icon={FileText} title="Case Information">
        <ReviewRow label="Case Title"      value={data.caseTitle} />
        <ReviewRow label="FIR Number"      value={data.firNumber} />
        <ReviewRow label="Case Type"       value={data.caseType} />
        <ReviewRow label="Priority"        value={data.priority} />
        <ReviewRow label="Status"          value={data.caseStatus} />
        <ReviewRow label="Incident Date"   value={data.incidentDate} />
        <ReviewRow label="Reporting Date"  value={data.reportingDate} />
        <ReviewRow label="PPC Sections"    value={data.ppcSections} />
        <ReviewRow label="Assigned To"     value={data.assignedInvestigator} />
        <ReviewRow label="Description"     value={data.description ? data.description.slice(0, 150) + (data.description.length > 150 ? "…" : "") : ""} />
      </ReviewSection>

      {/* Location */}
      <ReviewSection color="bg-slate-700" icon={MapPin} title="Location">
        <ReviewRow label="Address"         value={data.address} />
        <ReviewRow label="Area / City"     value={[data.area, data.city, data.province].filter(Boolean).join(", ")} />
        <ReviewRow label="Police Station"  value={data.policeStation} />
        <ReviewRow label="Scene Type"      value={data.crimeSceneType} />
      </ReviewSection>

      {/* Victims */}
      {victims.length > 0 && (
        <ReviewSection color="bg-blue-700" icon={User} title={`Victims (${victims.length})`}>
          {victims.map((v, i) => (
            <div key={v.id} className={i > 0 ? "border-t border-slate-100 pt-3" : ""}>
              <p className="text-xs font-bold text-slate-600 mb-1">Victim #{i + 1}</p>
              <ReviewRow label="Name"       value={v.name || "Unknown"} />
              <ReviewRow label="Age/Gender" value={`${v.age || "—"} / ${v.gender || "—"}`} />
              <ReviewRow label="Status"     value={v.status} />
              <ReviewRow label="Injury"     value={v.injuryType} />
            </div>
          ))}
        </ReviewSection>
      )}

      {/* Suspects */}
      {suspects.length > 0 && (
        <ReviewSection color="bg-amber-600" icon={Users} title={`Suspects (${suspects.length})`}>
          {suspects.map((s, i) => (
            <div key={s.id} className={i > 0 ? "border-t border-slate-100 pt-3" : ""}>
              <p className="text-xs font-bold text-slate-600 mb-1">Suspect #{i + 1}</p>
              <ReviewRow label="Name"          value={s.name || "Unknown"} />
              <ReviewRow label="Status"        value={s.status} />
              <ReviewRow label="Physical Desc" value={s.physicalDescription} />
            </div>
          ))}
        </ReviewSection>
      )}

      {/* Crime */}
      <ReviewSection color="bg-red-700" icon={Gavel} title="Crime Details">
        <ReviewRow label="Weapon"          value={data.weaponUsed} />
        <ReviewRow label="Vehicle"         value={data.vehicleUsed} />
        <ReviewRow label="No. of Suspects" value={data.numSuspects} />
        <ReviewRow label="Motive"          value={data.motive} />
        <ReviewRow label="Witness"         value={data.witnessAvailable ? "Yes" : "No"} />
        <ReviewRow label="CCTV"            value={data.cctv ? "Yes" : "No"} />
      </ReviewSection>

      {/* Evidence */}
      <div className="border border-slate-200 rounded-xl p-4 flex items-center gap-3">
        <Camera className="h-5 w-5 text-slate-500" />
        <p className="text-sm text-slate-700"><strong>{evidences.length}</strong> evidence item(s) attached</p>
      </div>

      {/* Update extras */}
      {mode === "update" && (data.remarks || data.progressPercent || data.nextHearingDate || data.investigatorNotes) && (
        <ReviewSection color="bg-teal-700" icon={FileText} title="Update Notes">
          <ReviewRow label="Remarks"          value={data.remarks} />
          <ReviewRow label="Progress"         value={data.progressPercent ? `${data.progressPercent}%` : ""} />
          <ReviewRow label="Next Hearing"     value={data.nextHearingDate} />
          <ReviewRow label="Investigator Notes" value={data.investigatorNotes} />
        </ReviewSection>
      )}

      {/* Declaration */}
      <div className="bg-deep-ocean/5 border border-deep-ocean/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-deep-ocean mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-deep-ocean">Declaration</p>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {mode === "update"
                ? "By saving these changes, I confirm that all updated information is accurate and based on verified investigation findings."
                : "By submitting this case, I confirm that all information provided is accurate to the best of my knowledge and based on the FIR and initial investigation."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
export default StepReview;