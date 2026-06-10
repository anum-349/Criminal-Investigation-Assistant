import { useEffect, useRef, useState } from "react";
import {
    ChevronDown, Search, Loader2, User as UserIcon, Check, X,
} from "lucide-react";
import { FieldLabel } from "@/pages/form/CaseFormFields/page";
import { listInvestigators } from "@/services/investigatorApi";


export default function InvestigatorPicker({
    label    = "Assigned Investigator",
    hint     = "Type to search by name, username, or department",
    value,
    onChange,
    error,
    storeAs  = "username",            // "username" | "displayLabel"
    placeholder = "Select an investigator…",
}) {
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

    const selected = items.find(i => {
        if (storeAs === "displayLabel") return i.displayLabel === value;
        return i.username === value;
    }) || null;

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

    const triggerLabel = (() => {
        if (selected) return selected.displayLabel;
        if (value)    return value;             // legacy / free-text fallback
        return placeholder;
    })();

    return (
        <div ref={wrapRef} className="relative">
            <FieldLabel hint={hint}>{label}</FieldLabel>

            {showFallback ? (
                <input
                    type="text"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean
                        ${error ? "border-red-400 bg-red-50" : "border-slate-300 bg-white text-slate-800"}`}
                />
            ) : (
                <>
                    <button
                        type="button"
                        onClick={() => setOpen(o => !o)}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors cursor-pointer
                            ${error ? "border-red-400 bg-red-50" : "border-slate-300 bg-white hover:bg-slate-50"}`}
                    >
                        <span className={`flex items-center gap-2 truncate ${value ? "text-slate-800" : "text-slate-400"}`}>
                            <UserIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            {triggerLabel}
                        </span>
                        <div className="flex items-center gap-1">
                            {value && (
                                <X
                                    className="h-3.5 w-3.5 text-slate-400 hover:text-red-500 cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); onChange(""); }}
                                    aria-label="Clear"
                                />
                            )}
                            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
                        </div>
                    </button>

                    {open && (
                        <div className="absolute z-30 mt-1 left-0 right-0 bg-white border border-slate-300 rounded-lg shadow-lg overflow-hidden">
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

                            <div className="max-h-72 overflow-y-auto">
                                {loading && (
                                    <div className="flex items-center gap-2 px-3 py-3 text-xs text-slate-500">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading investigators…
                                    </div>
                                )}

                                {loadError && !loading && (
                                    <div className="px-3 py-3 text-xs text-red-600">{loadError}</div>
                                )}

                                {!loading && !loadError && filtered.length === 0 && (
                                    <div className="px-3 py-3 text-xs text-slate-400 italic">
                                        No investigators match "{query}".
                                    </div>
                                )}

                                {!loading && !loadError && filtered.map(inv => {
                                    // Compare against whichever field this picker stores.
                                    const isSelected =
                                        storeAs === "displayLabel"
                                            ? inv.displayLabel === value
                                            : inv.username === value;

                                    return (
                                        <button
                                            key={inv.id || inv.username}
                                            type="button"
                                            onClick={() => {
                                                // Write back username OR displayLabel based on storeAs.
                                                onChange(storeAs === "displayLabel" ? inv.displayLabel : inv.username);
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