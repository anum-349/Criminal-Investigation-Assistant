/**
 * StepCrimeDetails.jsx  —  Step 6
 * Conditionally renders Murder / Rape / Theft sub-sections.
 *
 * Place at: src/pages/investigator/case-forms/StepCrimeDetails.jsx
 */
import { Gavel, AlertTriangle, Shield } from "lucide-react";
import { SectionHeading, TextField, SelectField, TextareaField, FieldLabel, CheckField } from "@/pages/form/CaseFormFields/page";
import { WEAPONS } from "@/pages/form/caseFormConstants/page";

export function StepCrimeDetails({ data, setData, errors }) {
  const set = (k) => (e) => setData(d => ({ ...d, [k]: e.target.value }));
  const toggle = (k) => (v) => setData(d => ({ ...d, [k]: v }));

  const ct = (data.caseType || "").toLowerCase();
  const isMurder = ct.includes("murder") || ct.includes("homicide");
  const isRape   = ct.includes("rape")   || ct.includes("sexual");
  const isTheft  = ct.includes("theft")  || ct.includes("robbery") || ct.includes("burglary");

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={Gavel}
        title="Crime-Specific Details"
        subtitle={`Detailed information about the ${data.caseType || "crime"} including weapons, vehicles, and incident specifics.`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label="Primary Weapon Used" required options={WEAPONS} value={data.weaponUsed || ""} onChange={set("weaponUsed")} error={errors.weaponUsed} />
        <TextField label="Weapon Description" value={data.weaponDescription || ""} onChange={set("weaponDescription")} placeholder="Color, make, serial number if known" />
        <TextField label="Vehicle Used" value={data.vehicleUsed || ""} onChange={set("vehicleUsed")} placeholder="Make, model, color, registration" />
        <TextField label="Number of Suspects" type="number" min="0" value={data.numSuspects || ""} onChange={set("numSuspects")} />
      </div>

      {/* ── Murder extras ── */}
      {isMurder && (
        <div className="border border-red-100 bg-red-50 rounded-xl p-5 space-y-4">
          <p className="text-sm font-bold text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Murder / Homicide Additional Details
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField label="Cause of Death" options={["Gunshot Wound","Stab Wound","Blunt Force Trauma","Strangulation","Poisoning","Drowning","Burning","Asphyxiation","Other / Unknown"]} value={data.causeOfDeath || ""} onChange={set("causeOfDeath")} />
            <SelectField label="Body Found Location" options={["At Scene of Crime","Dumped Elsewhere","In Vehicle","In Water","Buried","Unknown"]} value={data.bodyLocation || ""} onChange={set("bodyLocation")} />
            <TextField label="Estimated Time of Death" value={data.timeOfDeath || ""} onChange={set("timeOfDeath")} placeholder="e.g. 10:30 PM – 11:00 PM" />
            <div className="flex flex-col gap-3 mt-1">
              <CheckField label="Postmortem Conducted"     checked={data.postmortemDone} onChange={toggle("postmortemDone")} />
              <CheckField label="Forensic Team Deployed"   checked={data.forensicDone}   onChange={toggle("forensicDone")} />
            </div>
          </div>
        </div>
      )}

      {/* ── Rape extras ── */}
      {isRape && (
        <div className="border border-purple-100 bg-purple-50 rounded-xl p-5 space-y-4">
          <p className="text-sm font-bold text-purple-700 flex items-center gap-2">
            <Shield className="h-4 w-4" /> Sexual Assault Additional Details (Confidential)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField label="Medical Examination" options={["Conducted – Report Available","Conducted – Pending Report","Not Conducted","Refused by Victim"]} value={data.medicalExam || ""} onChange={set("medicalExam")} />
            <div className="flex flex-col gap-3 mt-1">
              <CheckField label="Counselling Provided"         checked={data.victimCounseling}  onChange={toggle("victimCounseling")} />
              <CheckField label="Protection Order Requested"   checked={data.protectionOrder}   onChange={toggle("protectionOrder")} />
            </div>
          </div>
        </div>
      )}

      {/* ── Theft / Robbery extras ── */}
      {isTheft && (
        <div className="border border-amber-100 bg-amber-50 rounded-xl p-5 space-y-4">
          <p className="text-sm font-bold text-amber-700">Theft / Robbery Additional Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label="Stolen Items / Property" value={data.stolenItems || ""} onChange={set("stolenItems")} placeholder="Description of items taken" />
            <TextField label="Estimated Value (PKR)" type="number" value={data.stolenValue || ""} onChange={set("stolenValue")} placeholder="Approximate value" />
            <SelectField label="Recovery Status" options={["Not Recovered","Partially Recovered","Fully Recovered","Under Investigation"]} value={data.recoveryStatus || ""} onChange={set("recoveryStatus")} />
            <SelectField label="Point of Entry" options={["Main Door","Window","Back Door","Roof","Forced Entry","Key Duplication","Unknown","N/A"]} value={data.entryPoint || ""} onChange={set("entryPoint")} />
          </div>
        </div>
      )}

      {/* ── General ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label="Motive (if determined)" options={["Financial Gain","Personal Grudge","Gang Related","Domestic Dispute","Terrorism","Drug Related","Sexual","Political","Unknown","Other"]} value={data.motive || ""} onChange={set("motive")} />
        <SelectField label="Mode of Operation" options={["Planned / Premeditated","Opportunistic","Domestic Dispute","Unknown"]} value={data.modus || ""} onChange={set("modus")} />
        <div className="flex flex-col gap-3 mt-1">
          <CheckField label="Witness(es) Available"   checked={data.witnessAvailable} onChange={toggle("witnessAvailable")} />
          <CheckField label="CCTV Footage Available"  checked={data.cctv}             onChange={toggle("cctv")} />
        </div>
      </div>

      <TextareaField
        label="Detailed Crime Description" required rows={5} maxLength={3000}
        value={data.crimeDescription || ""} onChange={set("crimeDescription")}
        placeholder="Full chronological account of the crime as understood from the FIR and initial investigation…"
        error={errors.crimeDescription}
      />

      <div>
        <FieldLabel hint="Witnesses who were present or saw the incident">Witness Information</FieldLabel>
        <TextareaField
          rows={3} value={data.witnesses || ""} onChange={set("witnesses")}
          placeholder="Name, contact, and brief statement for each witness (one per line)"
        />
      </div>
    </div>
  );
}
export default StepCrimeDetails;
