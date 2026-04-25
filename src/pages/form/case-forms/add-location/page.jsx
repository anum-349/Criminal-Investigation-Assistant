import { MapPin } from "lucide-react";
import { PROVINCES } from "../CaseFormConstants/page";
import { SectionHeading, TextField, SelectField, TextareaField } from "../CaseFormFields/page";

export default function StepLocation({ data, setData, errors }) {
  const set = (k) => (e) => setData(d => ({ ...d, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={MapPin}
        title="Crime Scene Location"
        subtitle="Detailed geographic information about where the incident occurred."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField
          label="Province" required options={PROVINCES}
          value={data.province || ""} onChange={set("province")} error={errors.province}
        />
        <TextField
          label="City / District" required
          value={data.city || ""} onChange={set("city")}
          placeholder="e.g. Karachi" error={errors.city}
        />
        <TextField
          label="Area / Locality"
          value={data.area || ""} onChange={set("area")}
          placeholder="e.g. Gulshan-e-Iqbal"
        />
        <TextField
          label="Police Station / Thana"
          value={data.policeStation || ""} onChange={set("policeStation")}
          placeholder="e.g. Gulshan Police Station"
        />
      </div>

      <TextareaField
        label="Full Crime Scene Address" required rows={2}
        value={data.address || ""} onChange={set("address")}
        placeholder="House/Plot number, Street, Block, Area, City"
        error={errors.address}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          label="Latitude (GPS)" type="number" step="any"
          value={data.latitude || ""} onChange={set("latitude")}
          placeholder="e.g. 24.8607" hint="Optional — for map visualisation"
        />
        <TextField
          label="Longitude (GPS)" type="number" step="any"
          value={data.longitude || ""} onChange={set("longitude")}
          placeholder="e.g. 67.0011" hint="Optional — for map visualisation"
        />
        <SelectField
          label="Crime Scene Type"
          options={["Residential – Indoor","Residential – Outdoor","Commercial – Indoor","Commercial – Outdoor","Public Space","Road / Highway","Industrial Area","Educational Institution","Religious Site","Hospital / Medical","Government Building","Other"]}
          value={data.crimeSceneType || ""} onChange={set("crimeSceneType")}
        />
        <SelectField
          label="Scene Access Status"
          options={["Open (Unsecured)","Secured by Police","Forensic Team Present","Released","Restricted Access"]}
          value={data.sceneAccess || "Secured by Police"} onChange={set("sceneAccess")}
        />
      </div>

      <TextareaField
        label="Nearby Landmarks" rows={2}
        value={data.landmarks || ""} onChange={set("landmarks")}
        placeholder="e.g. opposite Habib Bank, near Al-Asif Square"
      />
    </div>
  );
}


