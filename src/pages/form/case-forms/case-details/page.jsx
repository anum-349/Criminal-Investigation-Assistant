import { Lock } from "lucide-react";
import { SectionHeading, TextField, SelectField, TextareaField, FieldLabel } from "@/pages/form/case-forms/CaseFormFields/page";
import { CASE_TYPES } from "@/pages/form/case-forms/caseFormConstants/page";
import { FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { listInvestigators } from "@/services/investigatorApi";

function InvestigatorPicker({ value, onChange, error }) {
    const [open, setOpen]         = useState(false);
    const [query, setQuery]       = useState("");
    const [items, setItems]       = useState([]);
    const [loading, setLoading]   = useState(false);
    const [loadError, setLoadError] = useState(null);
    const wrapRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setLoadError(null);
        listInvestigators({ activeOnly: true })
            .then(rows => {
                if (cancelled) return;
                setItems(Array.isArray(rows) ? rows : []);
            })
            .catch(err => {
                if (cancelled) return;
                console.error("Investigator lookup failed:", err);
                setLoadError(err?.response?.data?.detail || err.message || "Could not load investigators");
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!open) return;
        const close = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [open]);

    const selected = items.find(i => i.username === value) || null;

    const filtered = (() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter(i =>
            (i.displayLabel || "").toLowerCase().includes(q) ||
            (i.username     || "").toLowerCase().includes(q) ||
            (i.department   || "").toLowerCase().includes(q) ||
            (i.fullName     || "").toLowerCase().includes(q)
        );
    })().slice(0, 50);

    const showFallback = !loading && !loadError && items.length === 0;

    return (
        <div ref={wrapRef} className="relative">
            <FieldLabel hint="Type to search by name, username, or department">
                Assigned Investigator
            </FieldLabel>

            {showFallback ? (
                // Plain input fallback — keeps the form working with no roster yet.
                <input
                    type="text"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Enter investigator username or name"
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean
                        ${error ? "border-red-400 bg-red-50" : "border-slate-300 bg-white text-slate-800"}`}
                />
            ) : (
                <>
                    {/* Trigger button — looks like a select, behaves like a combobox */}
                    <button
                        type="button"
                        onClick={() => setOpen(o => !o)}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors cursor-pointer
                            ${error ? "border-red-400 bg-red-50" : "border-slate-300 bg-white hover:bg-slate-50"}`}
                    >
                        <span className={`flex items-center gap-2 truncate ${selected ? "text-slate-800" : "text-slate-400"}`}>
                            <UserIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            {selected ? selected.displayLabel : (value || "Select an investigator…")}
                        </span>
                        <div className="flex items-center gap-1">
                            {value && (
                                <X
                                    className="h-3.5 w-3.5 text-slate-400 hover:text-red-500 cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); onChange(""); }}
                                    aria-label="Clear assignment"
                                />
                            )}
                            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
                        </div>
                    </button>

                    {/* Dropdown panel — max-h with overflow-auto = scrollable list. */}
                    {open && (
                        <div className="absolute z-30 mt-1 left-0 right-0 bg-white border border-slate-300 rounded-lg shadow-lg overflow-hidden">
                            {/* Search row sticks to the top of the panel */}
                            <div className="p-2 border-b border-slate-200 bg-white">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <input
                                        autoFocus
                                        type="search"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Search investigators…"
                                        className="w-full pl-8 pr-3 py-1.5 rounded-md border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-deep-ocean/30"
                                    />
                                </div>
                            </div>

                            {/* Scrollable rows. max-h ≈ 8 rows tall — keeps the
                                page layout calm even on screens with 100+ investigators. */}
                            <div className="max-h-72 overflow-y-auto">
                                {loading && (
                                    <div className="flex items-center gap-2 px-3 py-3 text-xs text-slate-500">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Loading investigators…
                                    </div>
                                )}

                                {loadError && !loading && (
                                    <div className="px-3 py-3 text-xs text-red-600">
                                        {loadError}
                                    </div>
                                )}

                                {!loading && !loadError && filtered.length === 0 && (
                                    <div className="px-3 py-3 text-xs text-slate-400 italic">
                                        No investigators match "{query}".
                                    </div>
                                )}

                                {!loading && !loadError && filtered.map(inv => {
                                    const isSelected = inv.username === value;
                                    return (
                                        <button
                                            key={inv.id || inv.username}
                                            type="button"
                                            onClick={() => {
                                                onChange(inv.username);
                                                setOpen(false);
                                                setQuery("");
                                            }}
                                            className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors flex items-center justify-between gap-2 cursor-pointer border-b border-slate-100 last:border-0
                                                ${isSelected ? "bg-deep-ocean/5" : ""}`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-800 truncate">
                                                    {inv.displayLabel || inv.fullName || inv.username}
                                                </p>
                                                {inv.department && (
                                                    <p className="text-[10px] text-slate-500">
                                                        @{inv.username} · {inv.department}
                                                    </p>
                                                )}
                                            </div>
                                            {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Footer hint — only when we have data */}
                            {!loading && !loadError && items.length > 0 && (
                                <div className="px-3 py-2 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-500">
                                    Showing {filtered.length} of {items.length} investigators
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {error && (
                <p className="mt-1 text-xs text-red-600">{error}</p>
            )}
        </div>
    );
}


// ──────────────────────────────────────────────────────────────────────────
// StepCaseDetails
// ──────────────────────────────────────────────────────────────────────────

export default function StepCaseDetails({ data, setData, errors, mode = "register" }) {
  const set = (k) => (e) => setData(d => ({ ...d, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={FileText}
        title="Case Details"
        subtitle={
          mode === "update"
            ? "Update core case information. Fields marked auto-generated cannot be changed."
            : "Core case information as registered in the FIR. Auto-filled fields can be corrected if needed."
        }
      />

      {/* ID row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel hint="Auto-generated by system">Case ID</FieldLabel>
          <div className="relative">
            <input
              readOnly
              value={data.caseId || "Will be assigned on submit"}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500 pr-9"
            />
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
        <TextField
          label="FIR Number" required
          hint="As printed on the official FIR document"
          value={data.firNumber || ""}
          onChange={set("firNumber")}
          placeholder="e.g. FIR-2026-1042"
          error={errors?.firNumber}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          label="Date of Incident" required type="date"
          value={data.incidentDate || ""} onChange={set("incidentDate")}
          max={new Date().toISOString().split("T")[0]}
          error={errors?.incidentDate}
        />
        <TextField
          label="Time of Incident" type="time"
          value={data.incidentTime || ""} onChange={set("incidentTime")}
        />
        <TextField
          label="Reporting Date" required type="date"
          value={data.reportingDate || ""} onChange={set("reportingDate")}
          max={new Date().toISOString().split("T")[0]}
          error={errors?.reportingDate}
        />
        <TextField
          label="Reporting Time" type="time"
          value={data.reportingTime || ""} onChange={set("reportingTime")}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField
          label="Case Type" required
          options={CASE_TYPES}
          value={data.caseType || ""} onChange={set("caseType")}
          error={errors?.caseType}
        />
        <SelectField
          label="Priority Level" required
          options={["Low", "Medium", "High", "Critical"]}
          value={data.priority || ""} onChange={set("priority")}
          error={errors?.priority}
        />
        <TextField
          label="PPC Sections"
          hint="Comma-separated, e.g. PPC 302, 392"
          value={data.ppcSections || ""}
          onChange={set("ppcSections")}
          placeholder="e.g. PPC 392, 34"
        />
        <SelectField
          label="Case Status"
          options={["Open", "Under Investigation", "Pending", "Closed", "Cold Case"]}
          value={data.caseStatus || "Open"}
          onChange={set("caseStatus")}
        />
      </div>

      <TextField
        label="Case Title / FIR Title" required
        value={data.caseTitle || ""}
        onChange={set("caseTitle")}
        placeholder="Brief descriptive title e.g. Armed Robbery at Main Street Market"
        error={errors?.caseTitle}
      />

      <TextareaField
        label="Brief Description / FIR Narrative" required
        rows={5} maxLength={2000}
        value={data.description || ""}
        onChange={set("description")}
        placeholder="Enter the full FIR narrative as written or translated…"
        hint="Copy the FIR text here for NLP analysis. Both Urdu and English accepted."
        error={errors?.description}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          label="Reporting Officer / SHO"
          value={data.reportingOfficer || ""}
          onChange={set("reportingOfficer")}
          placeholder="Name of the officer who recorded FIR"
        />
        <InvestigatorPicker
          value={data.assignedInvestigator || ""}
          onChange={(v) => setData(d => ({ ...d, assignedInvestigator: v }))}
          error={errors?.assignedInvestigator}
        />
      </div>
    </div>
  );
}