/**
 * src/pages/admin/case/[id]/page.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin — Case Detail.
 * Route: /admin/case/:id
 *
 * Backend integration:
 *   - GET  /api/investigator/cases/{caseId}              (case header/stats/timeline)
 *   - GET  /api/investigator/cases/{caseId}/evidences    (and listSuspects, listVictims, listWitnesses, listLeads)
 *   - DELETE child entities via existing investigator endpoints
 *     (admin bypass is already baked into _resolve_case → admin
 *      automatically passes the auth check in every case_*_service function)
 *   - PATCH  /api/admin/cases/{caseId}/assign            (re-assign)
 *   - DELETE /api/admin/cases/{caseId}                    (soft-delete whole case)
 *
 * The investigator's CaseEvidence / CaseSuspects / CaseWitnesses / CaseVictims
 * components already handle their own delete confirmations and table state.
 * To keep this page light, we render a simpler EntityTable here and rely
 * on the existing per-entity service modules to call the backend.
 */

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import {
  LayoutDashboard, ChevronRight, FolderOpen, ArrowLeft,
  FileText, Users, ShieldAlert, Brain, MapPin, Clock,
  Trash2, UserPlus, AlertTriangle, Loader2, CheckCircle2,
  Calendar, User as UserIcon, Shield, Eye, X,
} from "lucide-react";

import Header from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

import { deleteCase, assignCase, formatApiError } from "@/services/adminApi";
import { listInvestigators } from "@/services/investigatorApi";
import { listEvidences } from "@/services/evidenceApi";
import { listSuspects } from "@/services/suspectApi";
import { listWitnesses } from "@/services/witnessApi";
import { listVictims } from "@/services/victimApi";

// ── Auth ────────────────────────────────────────────────────────────────────
const getAuthHeader = () => {
  const t = localStorage.getItem("cia_token") || sessionStorage.getItem("cia_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

// ── Tabs ────────────────────────────────────────────────────────────────────
const TABS = [
  { key: "overview",  label: "Overview",  icon: FileText },
  { key: "evidence",  label: "Evidence",  icon: ShieldAlert },
  { key: "suspects",  label: "Suspects",  icon: Users },
  { key: "victims",   label: "Victims",   icon: Users },
  { key: "witnesses", label: "Witnesses", icon: UserIcon },
  { key: "leads",     label: "Leads",     icon: Brain },
  { key: "timeline",  label: "Timeline",  icon: Clock },
];

// ═════════════════════════════════════════════════════════════════════════════
// Delete confirm modal — generic, used for the whole case AND for sub-entities
// ═════════════════════════════════════════════════════════════════════════════
function ConfirmDeleteModal({ title, body, busy, error, onClose, onConfirm, requireTextConfirm }) {
  const [text, setText] = useState("");
  const canConfirm = !requireTextConfirm || text.trim().toUpperCase() === "DELETE";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> {title}
          </h2>
          <button onClick={onClose} disabled={busy} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-700">{body}</p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {requireTextConfirm && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Type <span className="font-mono text-red-600">DELETE</span> to confirm
              </label>
              <input value={text} onChange={e => setText(e.target.value)} placeholder="DELETE"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400" />
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} disabled={busy}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={!canConfirm || busy}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 text-white
              ${(!canConfirm || busy) ? "bg-red-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 cursor-pointer"}`}>
            {busy
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting…</>
              : <><Trash2 className="h-4 w-4" /> Delete</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Generic EntityTable for child entities (evidence, suspects, etc.)
// ═════════════════════════════════════════════════════════════════════════════
function EntityTable({ items, loading, error, columns, emptyLabel, onDelete, getRowKey, onRefresh }) {
  if (loading) return (
    <div className="text-center py-14 text-slate-400 text-sm">
      <Loader2 className="h-5 w-5 mx-auto animate-spin mb-2" /> Loading…
    </div>
  );
  if (error) return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold">Could not load</p>
        <p className="text-xs mt-0.5">{error}</p>
      </div>
      {onRefresh && (
        <button onClick={onRefresh}
          className="text-xs font-semibold text-red-700 hover:underline cursor-pointer">Retry</button>
      )}
    </div>
  );
  if (!items.length) return (
    <div className="text-center py-14 text-slate-400 text-sm">{emptyLabel}</div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {columns.map(c => (
              <th key={c.key} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                {c.label}
              </th>
            ))}
            <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((it, i) => (
            <tr key={getRowKey(it, i)} className="hover:bg-slate-50">
              {columns.map(c => (
                <td key={c.key} className="px-4 py-3 text-slate-700 text-sm">
                  {c.render ? c.render(it) : (it[c.key] ?? "—")}
                </td>
              ))}
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <button onClick={() => onDelete(it)} title="Delete"
                  className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer">
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Assign Modal (re-used from /admin/cases page)
// ═════════════════════════════════════════════════════════════════════════════
function AssignCaseModal({ caseId, currentInvestigator, onClose, onConfirm }) {
  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUsername, setSelected] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listInvestigators({ activeOnly: true });
        if (!cancelled) setList(data);
      } catch (err) {
        if (!cancelled) setError(formatApiError(err, "Could not load investigators."));
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = list.filter(i => {
    const q = search.toLowerCase();
    return !q ||
      (i.username || "").toLowerCase().includes(q) ||
      (i.fullName || "").toLowerCase().includes(q) ||
      (i.department || "").toLowerCase().includes(q);
  });

  const handle = async () => {
    if (!selectedUsername) return;
    setBusy(true); setError(null);
    try {
      const res = await assignCase(caseId, selectedUsername, reason.trim() || null);
      onConfirm(res);
    } catch (err) {
      setError(formatApiError(err, "Assignment failed"));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-deep-ocean" />
            {currentInvestigator && currentInvestigator !== "—" ? "Re-assign Investigator" : "Assign Investigator"}
          </h2>
          <button onClick={onClose} disabled={busy} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {currentInvestigator && currentInvestigator !== "—" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              Currently assigned to <strong>{currentInvestigator}</strong>.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search investigators…"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean" />

          <div className="max-h-64 overflow-y-auto space-y-2">
            {loadingList ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                <Loader2 className="h-5 w-5 mx-auto animate-spin mb-2" /> Loading…
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 text-sm text-slate-400">No investigators match your search.</p>
            ) : filtered.map(inv => (
              <button key={inv.username || inv.id}
                onClick={() => setSelected(inv.username)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left cursor-pointer
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

          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
            placeholder="Reason (optional)"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean resize-none" />
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} disabled={busy}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
            Cancel
          </button>
          <button onClick={handle} disabled={!selectedUsername || busy}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 text-white
              ${!selectedUsername || busy
                ? "bg-deep-ocean/40 cursor-not-allowed"
                : "bg-deep-ocean hover:bg-deep-ocean-900 cursor-pointer"}`}>
            {busy
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
              : <><UserPlus className="h-4 w-4" /> Confirm</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function AdminCaseDetailPage() {
  const { id: caseId } = useParams();
  const navigate = useNavigate();

  // ── Case core data ──────────────────────────────────────────────────────
  const [header, setHeader]   = useState(null);
  const [stats, setStats]     = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // ── Child entities (loaded on tab switch) ───────────────────────────────
  const [evidences, setEvidences] = useState({ items: [], loading: false, error: null });
  const [suspects,  setSuspects]  = useState({ items: [], loading: false, error: null });
  const [witnesses, setWitnesses] = useState({ items: [], loading: false, error: null });
  const [victims,   setVictims]   = useState({ items: [], loading: false, error: null });
  const [leads,     setLeads]     = useState({ items: [], loading: false, error: null });

  // ── UI state ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("overview");
  const [modal, setModal] = useState(null);     // { type, ... }
  const [toast, setToast] = useState(null);
  const showToast = (msg, kind = "success") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2800);
  };

  // ── Fetch case header ───────────────────────────────────────────────────
  const fetchCase = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = import.meta.env.VITE_API_URL;
      const res = await axios.get(`${url}/api/investigator/cases/${caseId}`, {
        headers: getAuthHeader(),
      });
      const d = res.data || {};
      setHeader(d.header || null);
      setStats(d.stats || null);
      setTimeline(d.timeline || []);
    } catch (err) {
      setError(formatApiError(err, "Could not load case."));
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  // ── Fetch evidences ─────────────────────────────────────────────────────
  const fetchEvidences = useCallback(async () => {
    setEvidences(s => ({ ...s, loading: true, error: null }));
    try {
      const data = await listEvidences(caseId, { page: 1, page_size: 50, status_filter: "all" });
      setEvidences({ items: data?.items || [], loading: false, error: null });
    } catch (err) {
      setEvidences({ items: [], loading: false, error: formatApiError(err, "Could not load evidence.") });
    }
  }, [caseId]);

  const fetchSuspects = useCallback(async () => {
    setSuspects(s => ({ ...s, loading: true, error: null }));
    try {
      const data = await listSuspects(caseId, { page: 1, page_size: 50 });
      setSuspects({ items: data?.items || [], loading: false, error: null });
    } catch (err) {
      setSuspects({ items: [], loading: false, error: formatApiError(err, "Could not load suspects.") });
    }
  }, [caseId]);

  const fetchWitnesses = useCallback(async () => {
    setWitnesses(s => ({ ...s, loading: true, error: null }));
    try {
      const data = await listWitnesses(caseId, { page: 1, page_size: 50 });
      setWitnesses({ items: data?.items || [], loading: false, error: null });
    } catch (err) {
      setWitnesses({ items: [], loading: false, error: formatApiError(err, "Could not load witnesses.") });
    }
  }, [caseId]);

  const fetchVictims = useCallback(async () => {
    setVictims(s => ({ ...s, loading: true, error: null }));
    try {
      const data = await listVictims(caseId, { page: 1, page_size: 50 });
      setVictims({ items: data?.items || [], loading: false, error: null });
    } catch (err) {
      setVictims({ items: [], loading: false, error: formatApiError(err, "Could not load victims.") });
    }
  }, [caseId]);

  const fetchLeads = useCallback(async () => {
    setLeads(s => ({ ...s, loading: true, error: null }));
    try {
      const url = import.meta.env.VITE_API_URL;
      const res = await axios.get(`${url}/api/investigator/cases/${caseId}/leads`, {
        headers: getAuthHeader(),
        params: { page: 1, page_size: 50 },
      });
      setLeads({ items: res.data?.items || [], loading: false, error: null });
    } catch (err) {
      setLeads({ items: [], loading: false, error: formatApiError(err, "Could not load leads.") });
    }
  }, [caseId]);

  // Lazy-fetch on tab switch
  useEffect(() => {
    if (activeTab === "evidence"  && !evidences.items.length && !evidences.loading) fetchEvidences();
    if (activeTab === "suspects"  && !suspects.items.length  && !suspects.loading)  fetchSuspects();
    if (activeTab === "witnesses" && !witnesses.items.length && !witnesses.loading) fetchWitnesses();
    if (activeTab === "victims"   && !victims.items.length   && !victims.loading)   fetchVictims();
    if (activeTab === "leads"     && !leads.items.length     && !leads.loading)     fetchLeads();
  }, [activeTab, evidences, suspects, witnesses, victims, leads,
      fetchEvidences, fetchSuspects, fetchWitnesses, fetchVictims, fetchLeads]);

  // ── Delete handlers ─────────────────────────────────────────────────────
  const url = import.meta.env.VITE_API_URL;

  const deleteEvidence = async (item) => {
    await axios.delete(`${url}/api/investigator/cases/${caseId}/evidences/${item.id}`, {
      headers: getAuthHeader(),
    });
    fetchEvidences();
  };

  const deleteSuspect = async (item) => {
    await axios.delete(`${url}/api/investigator/cases/${caseId}/suspects/${item.id || item.suspectId}`, {
      headers: getAuthHeader(),
    });
    fetchSuspects();
  };

  const deleteWitness = async (item) => {
    await axios.delete(`${url}/api/investigator/cases/${caseId}/witnesses/${item.id || item.witnessId}`, {
      headers: getAuthHeader(),
    });
    fetchWitnesses();
  };

  const deleteVictim = async (item) => {
    await axios.delete(`${url}/api/investigator/cases/${caseId}/victims/${item.id || item.victimId}`, {
      headers: getAuthHeader(),
    });
    fetchVictims();
  };

  const deleteLead = async (item) => {
    await axios.delete(`${url}/api/investigator/cases/${caseId}/leads/${item.id}`, {
      headers: getAuthHeader(),
    });
    fetchLeads();
  };

  // Wraps a delete callback with a confirmation modal
  const confirmDelete = (entity, fn, label) => {
    setModal({
      type: "delete_entity",
      title: `Delete ${label}?`,
      body: `This will permanently remove ${entity.id || entity.suspectId || entity.witnessId || entity.victimId || entity.name || "this item"} from the case. The action will be recorded in the audit log.`,
      run: async () => {
        try {
          setModal(m => ({ ...m, busy: true, error: null }));
          await fn(entity);
          showToast(`${label} deleted.`);
          setModal(null);
        } catch (err) {
          setModal(m => ({ ...m, busy: false, error: formatApiError(err, "Delete failed") }));
        }
      },
    });
  };

  // ── Delete whole case ───────────────────────────────────────────────────
  const doDeleteCase = async () => {
    try {
      setModal(m => ({ ...m, busy: true, error: null }));
      await deleteCase(caseId);
      showToast(`Case ${caseId} permanently deleted.`);
      setTimeout(() => navigate("/admin/cases"), 800);
    } catch (err) {
      setModal(m => ({ ...m, busy: false, error: formatApiError(err, "Delete failed") }));
    }
  };

  const onAssigned = (res) => {
    setHeader(h => h ? { ...h, investigator: res.investigator } : h);
    setModal(null);
    showToast(`Case assigned to ${res.investigator}.`);
  };

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-soft-mist mt-14">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
          <Loader2 className="h-8 w-8 mx-auto animate-spin mb-3 text-deep-ocean" />
          Loading case…
        </main>
      </div>
    );
  }

  if (error || !header) {
    return (
      <div className="min-h-screen bg-soft-mist mt-14">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-16">
          <Card className="p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-slate-800">Could not load case</h2>
            <p className="text-sm text-slate-500 mt-1">{error || "Case not found."}</p>
            <button onClick={() => navigate("/admin/cases")}
              className="mt-4 px-4 py-2 rounded-lg bg-deep-ocean text-white text-sm font-medium hover:bg-deep-ocean-900 cursor-pointer">
              Back to All Cases
            </button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-14">
      <Header />

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <button onClick={() => navigate("/admin")}
            className="flex items-center gap-1.5 hover:text-slate-800 transition-colors cursor-pointer">
            <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
          </button>
          <ChevronRight className="h-3 w-3" />
          <button onClick={() => navigate("/admin/cases")}
            className="hover:text-slate-800 cursor-pointer">All Cases</button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-800 font-medium font-mono">{caseId}</span>
        </nav>

        {/* Case header */}
        <Card className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="font-mono text-xs font-semibold text-slate-500">{header.id}</span>
                <Badge variant="success">{header.status}</Badge>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-orange-700 bg-orange-50 border border-orange-200">
                  {header.severity}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {header.crime_type}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-800">{header.title}</h1>
              {header.description && (
                <p className="text-sm text-slate-500 mt-2 line-clamp-2">{header.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <UserIcon className="h-3.5 w-3.5" />
                  {header.investigator && header.investigator !== "—"
                    ? <>Assigned to <strong className="text-slate-700">{header.investigator}</strong></>
                    : <strong className="text-red-600">Unassigned</strong>}
                </span>
              </div>
            </div>
            <div className="flex gap-2 self-start">
              <button onClick={() => setModal({ type: "assign" })}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
                <UserPlus className="h-4 w-4" />
                {header.investigator && header.investigator !== "—" ? "Re-assign" : "Assign"}
              </button>
              <button onClick={() => setModal({ type: "delete_case" })}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 cursor-pointer">
                <Trash2 className="h-4 w-4" /> Delete Case
              </button>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-5 border-t border-slate-100">
              {[
                { label: "Evidence",  value: stats.evidence_collected,   icon: ShieldAlert },
                { label: "Suspects",  value: stats.suspects,             icon: Users },
                { label: "Victims",   value: stats.victims,              icon: Users },
                { label: "Leads",     value: stats.investigation_leads,  icon: Brain },
                { label: "Days Open", value: stats.days_open,            icon: Clock },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <s.icon className="h-4 w-4 text-deep-ocean shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p>
                    <p className="text-sm font-bold text-slate-800">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-0">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all cursor-pointer border-b-2 whitespace-nowrap
                ${activeTab === t.key
                  ? "border-deep-ocean text-deep-ocean"
                  : "border-transparent text-slate-600 hover:text-slate-800"}`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <Card className="p-0 overflow-hidden">
          {activeTab === "overview" && (
            <div className="p-6 space-y-3 text-sm text-slate-600">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</p>
              <p>{header.description || "No description recorded."}</p>
            </div>
          )}

          {activeTab === "evidence" && (
            <EntityTable
              items={evidences.items} loading={evidences.loading} error={evidences.error}
              emptyLabel="No evidence linked to this case."
              getRowKey={(it, i) => it.id || i}
              onRefresh={fetchEvidences}
              columns={[
                { key: "id",          label: "ID" },
                { key: "type",        label: "Type" },
                { key: "description", label: "Description",
                  render: it => <span className="line-clamp-1 max-w-xs block">{it.description || "—"}</span> },
                { key: "status",      label: "Status",
                  render: it => <Badge variant={it.status === "Analyzed" ? "success" : "warning"}>{it.status}</Badge> },
              ]}
              onDelete={it => confirmDelete(it, deleteEvidence, "Evidence")}
            />
          )}

          {activeTab === "suspects" && (
            <EntityTable
              items={suspects.items} loading={suspects.loading} error={suspects.error}
              emptyLabel="No suspects linked to this case."
              getRowKey={(it, i) => it.id || it.suspectId || i}
              onRefresh={fetchSuspects}
              columns={[
                { key: "suspectId",   label: "ID", render: it => it.suspectId || it.id },
                { key: "name",        label: "Name" },
                { key: "cnic",        label: "CNIC" },
                { key: "status",      label: "Status",
                  render: it => <Badge variant="default">{it.status || "—"}</Badge> },
              ]}
              onDelete={it => confirmDelete(it, deleteSuspect, "Suspect")}
            />
          )}

          {activeTab === "witnesses" && (
            <EntityTable
              items={witnesses.items} loading={witnesses.loading} error={witnesses.error}
              emptyLabel="No witnesses linked to this case."
              getRowKey={(it, i) => it.id || it.witnessId || i}
              onRefresh={fetchWitnesses}
              columns={[
                { key: "witnessId",   label: "ID", render: it => it.witnessId || it.id },
                { key: "name",        label: "Name",
                  render: it => it.anonymous ? <span className="italic text-slate-400">Anonymous</span> : (it.name || "—") },
                { key: "credibility", label: "Credibility" },
                { key: "status",      label: "Status",
                  render: it => <Badge variant="default">{it.status || "—"}</Badge> },
              ]}
              onDelete={it => confirmDelete(it, deleteWitness, "Witness")}
            />
          )}

          {activeTab === "victims" && (
            <EntityTable
              items={victims.items} loading={victims.loading} error={victims.error}
              emptyLabel="No victims linked to this case."
              getRowKey={(it, i) => it.id || it.victimId || i}
              onRefresh={fetchVictims}
              columns={[
                { key: "victimId",   label: "ID", render: it => it.victimId || it.id },
                { key: "name",       label: "Name" },
                { key: "age",        label: "Age" },
                { key: "gender",     label: "Gender" },
                { key: "status",     label: "Status",
                  render: it => <Badge variant="default">{it.status || "—"}</Badge> },
              ]}
              onDelete={it => confirmDelete(it, deleteVictim, "Victim")}
            />
          )}

          {activeTab === "leads" && (
            <EntityTable
              items={leads.items} loading={leads.loading} error={leads.error}
              emptyLabel="No leads generated for this case."
              getRowKey={(it, i) => it.id || i}
              onRefresh={fetchLeads}
              columns={[
                { key: "id",          label: "ID" },
                { key: "type",        label: "Type" },
                { key: "description", label: "Description",
                  render: it => <span className="line-clamp-1 max-w-md block">{it.description || "—"}</span> },
                { key: "confidence",  label: "Confidence",
                  render: it => it.confidence != null ? `${Math.round(it.confidence * 100)}%` : "—" },
                { key: "status",      label: "Status",
                  render: it => <Badge variant="default">{it.status || "—"}</Badge> },
              ]}
              onDelete={it => confirmDelete(it, deleteLead, "Lead")}
            />
          )}

          {activeTab === "timeline" && (
            <div className="p-6">
              {timeline.length === 0 ? (
                <p className="text-center py-10 text-sm text-slate-400">No timeline events recorded.</p>
              ) : (
                <ol className="space-y-3 relative border-l-2 border-slate-100 ml-3">
                  {timeline.map(ev => (
                    <li key={ev.id} className="ml-4 pb-2 relative">
                      <div className="absolute -left-[1.4rem] top-2 w-3 h-3 rounded-full bg-deep-ocean ring-4 ring-white" />
                      <div className="text-xs text-slate-500">
                        {ev.event_date} {ev.event_time} · {ev.officer_name || "—"}
                      </div>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">{ev.title}</p>
                      {ev.description && <p className="text-xs text-slate-500 mt-0.5">{ev.description}</p>}
                    </li>
                  ))}
                </ol>
              )}
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
      {modal?.type === "delete_case" && (
        <ConfirmDeleteModal
          title="Delete this case permanently?"
          body={`This will soft-delete ${caseId} and hide all associated data from the system. The deletion is recorded in the audit log.`}
          requireTextConfirm
          busy={modal.busy} error={modal.error}
          onClose={() => setModal(null)} onConfirm={doDeleteCase}
        />
      )}
      {modal?.type === "delete_entity" && (
        <ConfirmDeleteModal
          title={modal.title} body={modal.body}
          busy={modal.busy} error={modal.error}
          onClose={() => setModal(null)} onConfirm={modal.run}
        />
      )}
      {modal?.type === "assign" && (
        <AssignCaseModal
          caseId={caseId}
          currentInvestigator={header?.investigator}
          onClose={() => setModal(null)}
          onConfirm={onAssigned}
        />
      )}
    </div>
  );
}
