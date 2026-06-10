/**
 * src/pages/admin/cases/page.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin — All Cases.
 * Route: /admin/cases
 *
 * Backend integration:
 *   - GET    /api/investigator/cases               (already returns ALL cases
 *                                                   when the caller is an admin,
 *                                                   thanks to _scope_to_user in
 *                                                   all_cases_service.py)
 *   - DELETE /api/admin/cases/{caseId}             (admin authority delete)
 *   - PATCH  /api/admin/cases/{caseId}/assign      (assign / re-assign)
 *   - GET    /api/investigator/lookups/investigators  (dropdown for assign modal)
 *
 * The list query parameters and response shape mirror /investigator/all-cases —
 * search, status_tab, crime_type, severity, sort, page, page_size.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Search, ChevronRight, ChevronLeft, LayoutDashboard,
  Trash2, UserPlus, Eye, X, AlertTriangle,
  Download, FolderOpen, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown,
  CheckCircle2, Users, Shield, Loader2,
} from "lucide-react";

import Header from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

import { deleteCase, assignCase, formatApiError } from "@/services/adminApi";
import { listInvestigators } from "@/services/investigatorApi";
import { getAuthHeader } from "@/services/apiCommon";
import { getStatusVariant, getSeverityStyle } from "@/utils/styling";

const PAGE_SIZE = 10;

const STATUS_TABS = [
  { key: "all",         label: "All Cases" },
  { key: "Active",      label: "Active"    },
  { key: "Pending",     label: "Pending"   },
  { key: "Closed",      label: "Closed"    },
  { key: "Unassigned",  label: "Unassigned" },
];

const SortIcon = ({ field, sortField, sortDir }) => {
  if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
  return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
};

// Tiny debounce hook — same pattern as investigator/all-cases.
function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// ═════════════════════════════════════════════════════════════════════════════
// Delete Confirm Modal
// ═════════════════════════════════════════════════════════════════════════════
function DeleteCaseModal({ caseItem, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState(null);
  const canDelete = confirmText.trim().toUpperCase() === "DELETE";

  const handle = async () => {
    if (!canDelete) return;
    setBusy(true);
    setError(null);
    try {
      await deleteCase(caseItem.id);
      onConfirm(caseItem.id);
    } catch (err) {
      setError(formatApiError(err, "Delete failed"));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Delete Case Permanently?
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 space-y-2">
            <p>
              You are about to delete <strong className="font-mono">{caseItem.id}</strong> —
              "{caseItem.title}".
            </p>
            <p className="text-xs">
              All associated evidence, suspects, witnesses, victims, leads, and timeline events
              will be hidden from the system. This action is logged in the audit trail.
            </p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Type <span className="font-mono text-red-600">DELETE</span> to confirm
            </label>
            <input
              type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
            Cancel
          </button>
          <button onClick={handle} disabled={!canDelete || busy}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 text-white transition-all
              ${!canDelete || busy
                ? "bg-red-300 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700 cursor-pointer"}`}>
            {busy
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting…</>
              : <><Trash2 className="h-4 w-4" /> Delete Permanently</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Assign Investigator Modal — fetches the live investigator list
// ═════════════════════════════════════════════════════════════════════════════
function AssignCaseModal({ caseItem, onClose, onConfirm }) {
  const [investigators, setInvestigators] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedUsername, setSelectedUsername] = useState("");
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listInvestigators({ activeOnly: true });
        if (!cancelled) setInvestigators(list);
      } catch (err) {
        if (!cancelled) setError(formatApiError(err, "Could not load investigators."));
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return investigators;
    const q = search.toLowerCase();
    return investigators.filter(i =>
      (i.username || "").toLowerCase().includes(q) ||
      (i.fullName || "").toLowerCase().includes(q) ||
      (i.department || "").toLowerCase().includes(q),
    );
  }, [investigators, search]);

  const handle = async () => {
    if (!selectedUsername) return;
    setBusy(true);
    setError(null);
    try {
      const res = await assignCase(caseItem.id, selectedUsername, reason.trim() || null);
      onConfirm(caseItem.id, res);   // { case_id, investigator, assigned_at }
    } catch (err) {
      setError(formatApiError(err, "Assignment failed"));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-deep-ocean/10">
              <UserPlus className="h-4 w-4 text-deep-ocean" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {caseItem.investigator && caseItem.investigator !== "—" ? "Re-assign Case" : "Assign Case"}
              </h2>
              <p className="text-xs text-slate-500 font-mono">{caseItem.id} — {caseItem.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {caseItem.investigator && caseItem.investigator !== "—" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              Currently assigned to <strong>{caseItem.investigator}</strong>.
              Re-assigning will move all case access to the new investigator.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search investigators by name or department…"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean"
            />
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {loadingList ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                <Loader2 className="h-5 w-5 mx-auto animate-spin mb-2" />
                Loading investigators…
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 text-sm text-slate-400">No investigators match your search.</p>
            ) : filtered.map(inv => (
              <button key={inv.username || inv.id}
                onClick={() => setSelectedUsername(inv.username)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer
                  ${selectedUsername === inv.username
                    ? "border-deep-ocean bg-deep-ocean/5 ring-2 ring-deep-ocean/20"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
                <div className="w-9 h-9 rounded-full bg-deep-ocean flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {(inv.fullName || inv.username || "??").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{inv.displayLabel || inv.fullName || inv.username}</p>
                  <p className="text-xs text-slate-500 truncate">@{inv.username}{inv.department ? ` · ${inv.department}` : ""}</p>
                </div>
                {selectedUsername === inv.username && <CheckCircle2 className="h-4 w-4 text-deep-ocean shrink-0" />}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Reason (optional)
            </label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
              placeholder="e.g. Original investigator on leave."
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
            Cancel
          </button>
          <button onClick={handle} disabled={!selectedUsername || busy}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 text-white
              ${!selectedUsername || busy
                ? "bg-deep-ocean/40 cursor-not-allowed"
                : "bg-deep-ocean hover:bg-deep-ocean-900 cursor-pointer"}`}>
            {busy
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Assigning…</>
              : <><UserPlus className="h-4 w-4" /> Confirm Assignment</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function AdminAllCasesPage() {
  const navigate = useNavigate();

  // ── Filter state ────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounced(searchInput, 300);
  const [statusTab, setStatusTab] = useState("all");
  const [crimeType, setCrimeType] = useState("All Types");
  const [severity, setSeverity]   = useState("All Severities");
  const [sortField, setSortField] = useState("registered");
  const [sortDir, setSortDir]     = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);

  // ── Data state ──────────────────────────────────────────────────────────
  const [items, setItems]   = useState([]);
  const [total, setTotal]   = useState(0);
  const [tabCounts, setTabCounts] = useState({ all: 0, Active: 0, Pending: 0, Closed: 0 });
  const [crimeTypes, setCrimeTypes] = useState(["All Types"]);
  const [severities, setSeverities] = useState(["All Severities"]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const requestSeq = useRef(0);

  // ── Modal state ─────────────────────────────────────────────────────────
  const [modal, setModal] = useState(null);   // { type: "delete" | "assign", case: {...} }
  const [toast, setToast] = useState(null);
  const showToast = (msg, kind = "success") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2800);
  };

  // ── Fetch list ──────────────────────────────────────────────────────────
  const fetchCases = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);

    try {
      // The "Unassigned" tab isn't a real backend status — we send "all" and
      // filter client-side. The backend's list_cases endpoint already returns
      // every case when the caller is an admin (per _scope_to_user).
      const backendTab = statusTab === "Unassigned" ? "all" : statusTab;
      const url = import.meta.env.VITE_API_URL;
      const res = await axios.get(`${url}/api/investigator/cases`, {
        headers: getAuthHeader(),
        params: {
          search:     debouncedSearch,
          status:     backendTab,
          crime_type: crimeType,
          severity,
          sort_field: sortField,
          sort_dir:   sortDir,
          page:       currentPage,
          page_size:  PAGE_SIZE,
        },
      });

      if (seq !== requestSeq.current) return;   // stale response

      const d = res.data || {};
      let rows = d.items || [];

      // Client-side "Unassigned" filter
      if (statusTab === "Unassigned") {
        rows = rows.filter(c => !c.investigator || c.investigator === "—");
      }

      setItems(rows);
      setTotal(statusTab === "Unassigned" ? rows.length : (d.total || 0));
      setTabCounts(d.tab_counts || { all: 0, Active: 0, Pending: 0, Closed: 0 });

      const opts = d.filter_options || {};
      setCrimeTypes(["All Types",      ...(opts.crime_types || [])]);
      setSeverities(["All Severities", ...(opts.severities || [])]);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.error("Failed to load cases:", err);
      setError(formatApiError(err, "Could not load cases."));
      setItems([]); setTotal(0);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [debouncedSearch, statusTab, crimeType, severity, sortField, sortDir, currentPage]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  // ── Sort ────────────────────────────────────────────────────────────────
  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
    setCurrentPage(1);
  };

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleDelete = (caseId) => {
    showToast(`Case ${caseId} permanently deleted.`);
    setModal(null);
    fetchCases();
  };

  const handleAssign = (caseId, res) => {
    showToast(`Case ${caseId} assigned to ${res.investigator}.`);
    setModal(null);
    fetchCases();
  };

  const resetFilters = () => {
    setSearchInput(""); setCrimeType("All Types"); setSeverity("All Severities");
    setStatusTab("all"); setCurrentPage(1);
  };

  // ── Derived ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const unassignedCount = items.filter(c => !c.investigator || c.investigator === "—").length;

  // For the "Unassigned" tab badge, we don't have a server count — fall back to
  // the current page's count, which is good enough as a hint.
  const computedTabCounts = {
    ...tabCounts,
    Unassigned: statusTab === "Unassigned" ? total : unassignedCount,
  };

  return (
    <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-10">
      <Header />

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <button onClick={() => navigate("/admin")}
            className="flex items-center gap-1.5 hover:text-slate-800 transition-colors cursor-pointer">
            <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
          </button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-800 font-medium">All Cases</span>
        </nav>

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-deep-ocean" /> All Cases
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              System-wide case registry — view, assign, or delete cases. Admin authority required.
            </p>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Could not load cases</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
            <button onClick={fetchCases}
              className="text-xs font-semibold text-red-700 hover:underline cursor-pointer">Retry</button>
          </div>
        )}

        {/* Stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total",      value: tabCounts.all,        color: "text-deep-ocean",  icon: FolderOpen },
            { label: "Active",     value: tabCounts.Active,     color: "text-emerald-600", icon: CheckCircle2 },
            { label: "Pending",    value: tabCounts.Pending,    color: "text-amber-600",   icon: AlertTriangle },
            { label: "Closed",     value: tabCounts.Closed,     color: "text-slate-500",   icon: Shield },
            { label: "Unassigned", value: computedTabCounts.Unassigned, color: "text-red-600", icon: Users },
          ].map(s => (
            <Card key={s.label} className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color} shrink-0`} />
              <div>
                <p className="text-xs font-semibold text-slate-500">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map(t => (
            <button key={t.key}
              onClick={() => { setStatusTab(t.key); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer
                ${statusTab === t.key
                  ? "bg-deep-ocean text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {t.label}
              <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold
                ${statusTab === t.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                {computedTabCounts[t.key] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row md:flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text" value={searchInput}
                onChange={e => { setSearchInput(e.target.value); setCurrentPage(1); }}
                placeholder="Search by case ID, title, investigator, location…"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean"
              />
            </div>
            <select value={crimeType} onChange={e => { setCrimeType(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean min-w-[150px]">
              {crimeTypes.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={severity} onChange={e => { setSeverity(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean min-w-[160px]">
              {severities.map(s => <option key={s}>{s}</option>)}
            </select>
            <button onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">
              <RefreshCw className="h-3.5 w-3.5" /> Reset
            </button>
          </div>
        </Card>

        {/* Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-deep-ocean text-white">
                <tr>
                  {[
                    { f: "id",           label: "Case ID" },
                    { f: "title",        label: "Title" },
                    { f: "crimeType",    label: "Crime Type" },
                    { f: "location",     label: "Location" },
                    { f: "investigator", label: "Investigator" },
                    { f: "status",       label: "Status" },
                    { f: null,           label: "Severity" },
                    { f: "registered",   label: "Registered" },
                    { f: null,           label: "Actions" },
                  ].map(c => (
                    <th key={c.label}
                      onClick={c.f ? () => toggleSort(c.f) : undefined}
                      className={`text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 whitespace-nowrap
                        ${c.f ? "cursor-pointer hover:bg-white/5" : ""}`}>
                      <span className="inline-flex items-center gap-1.5">
                        {c.label}
                        {c.f && <SortIcon field={c.f} sortField={sortField} sortDir={sortDir} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-14 text-slate-400 text-sm">
                    <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
                    Loading cases…
                  </td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-14 text-slate-400 text-sm">
                    <FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    No cases match the current filters.
                  </td></tr>
                ) : items.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">{c.id}</td>
                    <td className="px-4 py-3"><p className="font-medium text-slate-800">{c.title}</p></td>
                    <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.crime_type}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.location}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                      {c.investigator && c.investigator !== "—"
                        ? <span>{c.investigator}</span>
                        : <span className="italic text-red-600 font-medium">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={getStatusVariant(c.status)}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getSeverityStyle(c.severity)}`}>
                        {c.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{c.registered}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/admin/case/${c.id}`)}
                          title="View case detail"
                          className="p-1.5 rounded-lg text-deep-ocean hover:bg-deep-ocean/10 cursor-pointer">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => setModal({ type: "assign", case: { ...c, title: c.title } })}
                          title={c.investigator && c.investigator !== "—" ? "Re-assign" : "Assign"}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer">
                          <UserPlus className="h-4 w-4" />
                        </button>
                        <button onClick={() => setModal({ type: "delete", case: { ...c, title: c.title } })}
                          title="Delete case"
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && total > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-500">
                Showing <span className="font-semibold">{(currentPage - 1) * PAGE_SIZE + 1}</span>–
                <span className="font-semibold">{Math.min(currentPage * PAGE_SIZE, total)}</span>
                {" "}of <span className="font-semibold">{total}</span> cases
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                  <ChevronLeft className="h-4 w-4 text-slate-600" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, i, arr) => (
                    <span key={p}>
                      {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1.5 text-slate-400">…</span>}
                      <button onClick={() => setCurrentPage(p)}
                        className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer
                          ${currentPage === p ? "bg-deep-ocean text-white" : "hover:bg-white text-slate-600"}`}>
                        {p}
                      </button>
                    </span>
                  ))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                </button>
              </div>
            </div>
          )}
        </Card>
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium
          ${toast.kind === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"}`}>
          <CheckCircle2 className="h-4 w-4" /> {toast.msg}
        </div>
      )}

      {/* Modals */}
      {modal?.type === "delete" && (
        <DeleteCaseModal caseItem={modal.case} onClose={() => setModal(null)} onConfirm={handleDelete} />
      )}
      {modal?.type === "assign" && (
        <AssignCaseModal caseItem={modal.case} onClose={() => setModal(null)} onConfirm={handleAssign} />
      )}
    </div>
  );
}
