/**
 * StepLocation — Crime Scene Location step (register-case wizard)
 * ─────────────────────────────────────────────────────────────────────────────
 * UPDATE: address fields now ALWAYS sync with the map picker.
 *
 * Previous behaviour:
 *   Picker → fill city/area/province ONLY IF empty.
 *   Problem: picking a new pin wouldn't update those fields if the user had
 *   previously selected a pin somewhere else. The form ended up showing
 *   stale city/area/province for the current pin.
 *
 * New behaviour:
 *   Picker → ALWAYS overwrite city, area, province, and the auto-filled
 *   address. The investigator can still edit any field manually after
 *   picking — but a fresh pin click resets to the new location's data.
 *
 *   To make the sync visible, City/Area/Province show a small
 *   "Auto-filled" badge when the value matches what the picker last gave us.
 *   The badge disappears as soon as the user types in the field — that's
 *   their cue that the value won't be overwritten by tweaking the pin
 *   slightly. (It will still be overwritten by picking a brand-new
 *   location, by design.)
 *
 *   The "Full Crime Scene Address" textarea is treated specially: we DON'T
 *   stomp on it once the user starts editing it. That field is the most
 *   detailed and most often hand-tuned ("Apt 12, 3rd floor, behind the
 *   reception"), so it's worth protecting separately.
 *
 * Place at: src/pages/form/case-forms/step-location/page.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { MapPin, Sparkles } from "lucide-react";
import { PROVINCES } from "../CaseFormConstants/page";
import { SectionHeading, TextField, SelectField, TextareaField } from "../CaseFormFields/page";
import LocationPicker from "../locationPicker";

// Try to map Nominatim's "state" string to one of our PROVINCES options.
// Nominatim returns things like "Sindh", "Punjab", "Khyber Pakhtunkhwa" —
// usually exactly matching, but we do a case-insensitive find just in case.
const matchProvince = (provinceFromMap) => {
  if (!provinceFromMap) return "";
  const lower = provinceFromMap.toLowerCase();
  return PROVINCES.find((p) => p.toLowerCase() === lower) || "";
};

export default function StepLocation({ data = {}, setData, errors = {} }) {
  const set = (k) => (e) => setData(d => ({ ...d, [k]: e.target.value }));

  // Receives the picker payload and merges it into form state.
  // Strategy: "picker is authoritative" — every pick overwrites city/area/
  // province AND the address (unless the user has manually edited the
  // address since the last pick — see _userEditedAddress flag below).
  const handlePickerChange = (loc) => {
    setData((d) => {
      const next = {
        ...d,
        latitude:       loc.latitude  ?? null,
        longitude:      loc.longitude ?? null,
        displayAddress: loc.displayAddress || "",

        // Always overwrite from the picker — investigator's "pick a new
        // location" intent dominates over previous picker output.
        city:           loc.city  || "",
        area:           loc.area  || "",
      };

      // Province: only overwrite when the picker gave us a recognisable
      // value (Nominatim sometimes returns nothing for `state`). Otherwise
      // keep what's there.
      const matched = matchProvince(loc.province);
      if (matched) next.province = matched;

      // Address textarea: overwrite UNLESS the user has been editing it
      // manually. We track that via an internal `_addressTouched` flag.
      if (!d._addressTouched) {
        next.address = loc.displayAddress || "";
      }

      // Stash a snapshot of what the picker provided so we can decide later
      // whether each field is still "auto-filled" (for the badge).
      next._fromPicker = {
        city:     loc.city  || "",
        area:     loc.area  || "",
        province: matched   || "",
        address:  loc.displayAddress || "",
      };

      return next;
    });
  };

  // Flag the address field as user-edited the moment they type into it.
  // After that, picking a NEW location won't overwrite it. (It WILL still
  // overwrite if they Clear the picker first, then pick again.)
  const handleAddressChange = (e) => {
    const v = e.target.value;
    setData(d => ({ ...d, address: v, _addressTouched: true }));
  };

  // The "Auto-filled" badge shows only while the field's current value
  // still matches what the picker last gave us. Editing the field clears
  // the badge.
  const isAutoFilled = (key) => {
    const fromPicker = data._fromPicker?.[key];
    if (!fromPicker) return false;
    return data[key] === fromPicker;
  };

  // Build the picker's value from current form state
  const pickerValue = {
    latitude:       data.latitude,
    longitude:      data.longitude,
    displayAddress: data.displayAddress || data.address || "",
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={MapPin}
        title="Crime Scene Location"
        subtitle="Pin the location on the map. City, area, province, and address auto-fill from the pin — you can still edit them."
      />

      {/* ── Map picker ─────────────────────────────────────────────────── */}
      <LocationPicker
        value={pickerValue}
        onChange={handlePickerChange}
        height={340}
        countryCode="pk"
      />

      {/* ── Province / City / Area / PS ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldWithBadge label="Province" autoFilled={isAutoFilled("province")} required>
          <SelectField
            label="" options={PROVINCES}
            value={data.province || ""} onChange={set("province")}
            error={errors.province}
          />
        </FieldWithBadge>

        <FieldWithBadge label="City / District" autoFilled={isAutoFilled("city")} required>
          <TextField
            label=""
            value={data.city || ""} onChange={set("city")}
            placeholder="e.g. Karachi" error={errors.city}
          />
        </FieldWithBadge>

        <FieldWithBadge label="Area / Locality" autoFilled={isAutoFilled("area")}>
          <TextField
            label=""
            value={data.area || ""} onChange={set("area")}
            placeholder="e.g. Gulshan-e-Iqbal"
          />
        </FieldWithBadge>

        <TextField
          label="Police Station / Thana"
          value={data.policeStation || ""} onChange={set("policeStation")}
          placeholder="e.g. Gulshan Police Station"
        />
      </div>

      {/* ── Full address (separate handler so we can track manual edits) */}
      <FieldWithBadge
        label="Full Crime Scene Address"
        autoFilled={!data._addressTouched && isAutoFilled("address")}
        required
      >
        <TextareaField
          label="" rows={2}
          value={data.address || ""} onChange={handleAddressChange}
          placeholder="House/Plot number, Street, Block, Area, City"
          error={errors.address}
        />
      </FieldWithBadge>

      {/* ── Crime-scene metadata ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* ── Read-only coordinates ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <span className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            Latitude
            <span className="ml-1.5 text-[10px] font-normal text-slate-400 lowercase italic">
              set by map picker
            </span>
          </span>
          <div className="px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 font-mono select-all min-h-10.5 flex items-center">
            {Number.isFinite(Number(data.latitude))
              ? Number(data.latitude).toFixed(6)
              : <span className="italic text-slate-400 font-sans">— not set —</span>}
          </div>
        </div>
        <div>
          <span className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            Longitude
            <span className="ml-1.5 text-[10px] font-normal text-slate-400 lowercase italic">
              set by map picker
            </span>
          </span>
          <div className="px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 font-mono select-all min-h-10.5 flex items-center">
            {Number.isFinite(Number(data.longitude))
              ? Number(data.longitude).toFixed(6)
              : <span className="italic text-slate-400 font-sans">— not set —</span>}
          </div>
        </div>
      </div>

      <TextareaField
        label="Nearby Landmarks" rows={2}
        value={data.landmarks || ""} onChange={set("landmarks")}
        placeholder="e.g. opposite Habib Bank, near Al-Asif Square"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Wrapper that adds an "Auto-filled" badge above a field when the badge is
// active. Renders the children (an existing SelectField / TextField /
// TextareaField with an empty label) so we keep the existing field styles
// without rewriting them.
// ─────────────────────────────────────────────────────────────────────────────

function FieldWithBadge({ label, autoFilled, required, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        {autoFilled && (
          <span
            title="Filled by the map picker. Edit to override; picking a new location will reset this."
            className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
          >
            <Sparkles className="h-2.5 w-2.5" /> Auto-filled
          </span>
        )}
      </div>
      {children}
    </div>
  );
}