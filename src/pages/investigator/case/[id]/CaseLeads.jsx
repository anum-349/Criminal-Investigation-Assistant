import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  Search, ChevronDown, Calendar, Brain, User, Plus, X,
  Eye, AlertTriangle, Trash2, Info, Lightbulb,
  Loader2, CheckCircle2, Sparkles
} from 'lucide-react';

import { useToast } from '@/context/ToastContext';

import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';
import { checkAiHealth, streamAiLeads } from "@/services/leadApi";

import {
  LEAD_STATUSES,
  LEAD_TYPES as LEAD_TYPE_OPTIONS,
  EVENT_SOURCE,
  LEAD_STATUS_VARIANT,
  confidenceColor,
} from './caseEventConstants';
import AddLeadDialog from './forms/AddLead';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 5;

const SEVERITY_FILTER = [
  { value: 'all', label: 'All Severities' },
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

const SOURCE_FILTER = [
  { key: 'all', label: 'All Leads' },
  { key: 'ai', label: 'AI-generated' },
  { key: 'manual', label: 'Manual' },
];

const getSeverityClass = (s) => {
  if (s === 'Critical') return 'bg-orange-500 text-white';
  if (s === 'High') return 'bg-rose-800/90 text-white';
  if (s === 'Medium') return 'bg-amber-500 text-white';
  return 'bg-slate-500 text-white';
};

const getAuthHeader = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─────────────────────────────────────────────────────────────────────────────
// SourceBadge
// ─────────────────────────────────────────────────────────────────────────────

const SourceBadge = ({ lead }) => {
  if (lead.eventSource === EVENT_SOURCE.AI) {
    return (
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
          <Brain className="h-2.5 w-2.5" /> AI
        </span>
        {typeof lead.confidence === 'number' && lead.confidence > 0 && (
          <div className="flex items-center gap-1.5 min-w-24">
            <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-1 rounded-full ${confidenceColor(lead.confidence)}`}
                style={{ width: `${lead.confidence}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-slate-600">{Math.round(lead.confidence)}%</span>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
        <User className="h-2.5 w-2.5" /> Manual
      </span>
      {lead.source && (
        <p className="text-[10px] text-slate-500 italic">{lead.source}</p>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// StatusMenu — inline status dropdown + delete (delete only for editable rows)
// ─────────────────────────────────────────────────────────────────────────────

const StatusMenu = ({ lead, onChange, onAskDelete, busy }) => {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={lead.status}
        disabled={busy}
        onChange={(e) => onChange(lead.id, e.target.value)}
        className="appearance-auto pl-3 pr-7 py-1.5 border border-slate-300 rounded-md bg-white text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-deep-ocean cursor-pointer min-w-28 disabled:opacity-50"
        aria-label={`Update status for lead ${lead.id}`}
      >
        {LEAD_STATUSES.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {lead.editable && (
        <button
          onClick={() => onAskDelete(lead)}
          disabled={busy}
          className="ml-1.5 p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-50"
          title="Delete manual lead"
          aria-label={`Delete lead ${lead.id}`}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-red-700" />}
        </button>
      )}
    </div>
  );
};

const CaseInvestigationLeads = ({ caseId: caseIdProp }) => {
  // ── Filter inputs (live) ────────────────────────────────────────────────
  const caseId = caseIdProp || useParams().id || 'C-2053'; // graceful fallback if mounted outside the dynamic route
  const [keyword, setKeyword] = useState('');
  const [leadTypeFilter, setLeadTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  // Applied filters
  const [appliedFilters, setAppliedFilters] = useState({
    keyword: '', leadType: '', date: '', severity: 'all',
  });

  // const [health, setHealth] = useState({
  //   available: false,
  //   model: "",
  //   model_pulled: false,
  //   detail: "Checking AI service…",
  //   loading: true,
  // });

  const [health, setHealth] = useState({
    available: false,
    model: "",
    detail: "Checking AI service…",
    loading: true,
  });

  const refreshHealth = useCallback(async () => {
    const h = await checkAiHealth();
    setHealth({ ...h, loading: false });
  }, []);

  useEffect(() => {
    refreshHealth();
  }, [refreshHealth]);

  const [currentPage, setCurrentPage] = useState(1);

  // Server data
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, ai: 0, manual: 0 });
  const [typeOptions, setTypeOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestSeq = useRef(0);

  // UI state
  const [showAdd, setShowAdd] = useState(false);
  const [dialogLead, setDialogLead] = useState(null);
  const closeDialogBtnRef = useRef(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, type } | null
  const [busyLeadId, setBusyLeadId] = useState(null);

  const toast = useToast()

  // ── Streaming state ────────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ leads: 0, model: "" });
  const [phase, setPhase] = useState("idle");     // building | context | streaming
  const [stats, setStats] = useState({ depth: null, gaps: null, leads: 0 });
  const cancelRef = useRef(null);

  const resetState = () => {
    setGenerating(false);
    setPhase("idle");
    setStats({ depth: null, gaps: null, leads: 0 });
    cancelRef.current = null;
  };

  const handleGenerate = useCallback(() => {
    if (!caseId || generating) return;

    setGenerating(true);
    setPhase("building");
    setStats({ depth: null, gaps: null, leads: 0 });
    setProgress({ leads: 0, model: health.model });

    let leadsCount = 0;
    let rejectedHint = null;

    const cancel = streamAiLeads(caseId, {
      onStarted: ({ model }) => {
        setPhase("building");
        setProgress(p => ({ ...p, model }));
      },

      onContext: ({ depth_score, gap_count }) => {
        setPhase("context");
        setStats(s => ({ ...s, depth: depth_score, gaps: gap_count }));
        // Quick beat to let the user actually see this, then we
        // transition to "streaming" as soon as the first lead
        // arrives (or "done" if none come).
      },

      onLead: (lead) => {
        leadsCount += 1;
        setPhase("streaming");
        setStats(s => ({ ...s, leads: leadsCount }));
        setLeads(curr => {
          if (curr.some(l => l.id === lead.id)) return curr;
          return [lead, ...curr];
        });
        setTotal(t => t + 1);
        setCounts(c => ({ ...c, all: c.all + 1, ai: c.ai + 1 }));
      },

      onRejected: ({ count }) => {
        rejectedHint = count;
      },

      onDone: ({ accepted, rejected, duration_ms, reason, raw_lead_count, gap_count }) => {
        setGenerating(false);
        cancelRef.current = null;

        // Build a useful toast that summarises the result without
        // drowning the user in details.
        if (accepted > 0) {
          const parts = [`Generated ${accepted} lead${accepted === 1 ? "" : "s"}`];
          if (rejected > 0) {
            parts.push(`${rejected} rejected by validation`);
          }
          if (gap_count) {
            parts.push(`${gap_count} gap${gap_count === 1 ? "" : "s"} spotted`);
          }
          if (duration_ms) {
            parts.push(`${(duration_ms / 1000).toFixed(1)}s`);
          }
          toast.success(parts.join(" · "));
        } else if (reason) {
          toast.info(reason);
        } else {
          toast.info("No new leads found. All investigative angles may already be covered.");
        }

        // Trigger a fresh fetch on the parent so counts/filters
        // stay in sync with what the server has now.
        // CORRECT
        fetchLeads();

        // Re-probe health in case it lapsed mid-stream.
        refreshHealth();
      },

      onError: ({ status, detail }) => {
        resetState();
        setGenerating(false);
        cancelRef.current = null;

        if (status === 503) {
          toast.error("AI service unavailable. Check your GROQ_API_KEY in .env.");
        } else if (status === 504) {
          toast.error("AI took too long to respond. Try again.");
        } else if (status === 403 || status === 404) {
          toast.error("You can't generate leads for this case.");
        } else {
          toast.error(detail || `Lead generation failed (HTTP ${status || "?"})`);
        }

        // Health probe so the button re-greys-out if Ollama died.
        refreshHealth();
      },
    });

    cancelRef.current = cancel;
  }, [caseId, generating, health.model, refreshHealth, toast]);

  const handleCancel = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
      setGenerating(false);
      resetState();
      toast.info("Lead generation cancelled.");
    }
  }, [toast]);

  // Cleanup on unmount — abort any in-flight stream.
  useEffect(() => {
    return () => {
      if (cancelRef.current) {
        try { cancelRef.current(); } catch { /* ignore */ }
      }
    };
  }, []);

  // ── Fetch ───────────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    const seq = ++requestSeq.current;

    try {
      const url = import.meta.env.VITE_API_URL;
      const res = await axios.get(`${url}/api/investigator/cases/${caseId}/leads`, {
        headers: getAuthHeader(),
        params: {
          keyword: appliedFilters.keyword,
          lead_type: appliedFilters.leadType,
          severity: appliedFilters.severity,
          source: sourceFilter,
          date_from: appliedFilters.date,
          page: currentPage,
          page_size: PAGE_SIZE,
        },
      });
      if (seq !== requestSeq.current) return;
      setLeads(res.data?.items || []);
      setTotal(res.data?.total || 0);
      setCounts(res.data?.counts || { all: 0, ai: 0, manual: 0 });
      setTypeOptions(res.data?.type_options || []);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.error('Failed to load leads:', err);
      setError(err?.response?.data?.detail || 'Could not load leads.');
      setLeads([]);
      setTotal(0);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [caseId, appliedFilters, sourceFilter, currentPage]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // ── Filter handlers ─────────────────────────────────────────────────────
  const handleApply = useCallback(() => {
    setAppliedFilters({
      keyword: keyword.trim(),
      leadType: leadTypeFilter,
      date: dateFilter,
      severity: severityFilter,
    });
    setCurrentPage(1);
  }, [keyword, leadTypeFilter, dateFilter, severityFilter]);

  const handleClear = useCallback(() => {
    setKeyword('');
    setLeadTypeFilter('');
    setDateFilter('');
    setSeverityFilter('all');
    setSourceFilter('all');
    setAppliedFilters({ keyword: '', leadType: '', date: '', severity: 'all' });
    setCurrentPage(1);
  }, []);

  // ── Add manual lead ─────────────────────────────────────────────────────
  // AddLeadDialog calls onSubmit({ caseId, leads: [lead] }) and now AWAITS
  // the return value. If we return false the dialog stays on the form so
  // the user can correct and retry.
  const handleAddLeadSave = useCallback(async (data) => {
    const lead = data?.leads?.[0];
    if (!lead) return false;

    try {
      const url = import.meta.env.VITE_API_URL;
      const res = await axios.post(
        `${url}/api/investigator/cases/${caseId}/leads`,
        {
          type: lead.type,
          severity: lead.severity,
          description: lead.description,
          nextStep: lead.nextStep,
          source: lead.source,
          suggestedSuspect: lead.suggestedSuspect,
          suspectBasis: lead.suspectBasis,
          similarCaseId: lead.similarCaseId,
          weaponPattern: lead.weaponPattern,
          locationArea: lead.locationArea,
          confidence: lead.confidence,
          status: lead.status || 'New',
        },
        { headers: getAuthHeader() },
      );

      // Optimistically prepend the new row so it shows up without a roundtrip.
      // The server response is the canonical row shape (LeadRow).
      const newRow = res.data;
      if (newRow) {
        setLeads(curr => [newRow, ...curr]);
        setTotal(t => t + 1);
        setCounts(c => ({ ...c, all: c.all + 1, manual: c.manual + 1 }));
      } else {
        // Defensive — if the server didn't return a row, just refetch.
        fetchLeads();
      }

      toast.success(`Lead added to ${caseId}`);
      return true;   // dialog will show its success screen
    } catch (err) {
      console.error('Add lead failed:', err);
      const msg = err?.response?.data?.detail || err.message || 'Save failed';
      toast.error(`Save failed: ${msg}`);
      return false;  // dialog stays on the form
    }
  }, [caseId, fetchLeads]);

  // ── Status change (PATCH) ───────────────────────────────────────────────
  const handleStatusChange = useCallback(async (leadId, newStatus) => {
    setBusyLeadId(leadId);

    // Snapshot the previous status — we use it to update counts when a
    // lead flips to/from "Dismissed" (which influences which source-pill
    // count it lives under).
    const prev = leads.find(l => l.id === leadId);
    const prevStatus = prev?.status;

    try {
      const url = import.meta.env.VITE_API_URL;
      const res = await axios.patch(
        `${url}/api/investigator/cases/${caseId}/leads/${leadId}`,
        { status: newStatus },
        { headers: getAuthHeader() },
      );

      // Update the row in place with the server's canonical version
      setLeads(curr => curr.map(l => l.id === leadId ? res.data : l));
      toast.success(`Lead ${leadId} → ${newStatus}`);

      // Counts only need refetching if the change is meaningful enough to
      // affect them — today the counts don't split by status, so a status
      // change doesn't move a row between pills. We skip the refetch.
      // (Kept the prevStatus snapshot for future use.)
      void prevStatus;
      setLeads(curr => curr.map(l => {
        if (l.id === leadId) {
          return { ...l, status: newStatus };
        }
        return l;
      }));
    } catch (err) {
      console.error('Status update failed:', err);
      const msg = err?.response?.data?.detail || err.message || 'Update failed';
      toast.error(`Status update failed: ${msg}`);
    } finally {
      setBusyLeadId(null);
    }
  }, [caseId, leads]);

  // ── Delete (manual leads only) ──────────────────────────────────────────
  const handleDelete = useCallback(async (leadId) => {
    setBusyLeadId(leadId);
    try {
      const url = import.meta.env.VITE_API_URL;
      await axios.delete(
        `${url}/api/investigator/cases/${caseId}/leads/${leadId}`,
        { headers: getAuthHeader() },
      );

      // Optimistic local removal + counts decrement
      setLeads(curr => curr.filter(l => l.id !== leadId));
      setCounts(c => ({
        ...c,
        all: Math.max(0, c.all - 1),
        manual: Math.max(0, c.manual - 1),
      }));
      setTotal(t => Math.max(0, t - 1));
      setConfirmDelete(null);
      toast.success(`Lead ${leadId} deleted`);
    } catch (err) {
      console.error('Delete failed:', err);
      const msg = err?.response?.data?.detail || err.message || 'Delete failed';
      toast.error(`Delete failed: ${msg}`);
    } finally {
      setBusyLeadId(null);
    }
  }, [caseId]);

  // ── Pagination derivations ──────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + leads.length, total);

  // ── Esc closes detail dialog ────────────────────────────────────────────
  useEffect(() => {
    if (!dialogLead) return;
    closeDialogBtnRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') setDialogLead(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dialogLead]);

  // Build the lead-type dropdown options. Use server-provided list when
  // available, fall back to JS constants.
  const leadTypeFilterOptions = useMemo(() => ([
    { value: '', label: 'All Lead Types' },
    ...((typeOptions.length ? typeOptions : LEAD_TYPE_OPTIONS).map(t => ({ value: t, label: t }))),
  ]), [typeOptions]);

  return (
    <section
      className="bg-white rounded-t-lg border-x border-t border-slate-300 shadow-sm overflow-hidden"
      aria-label="Investigation leads"
    >
      {/* Header */}
      <header className="p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-deep-ocean" /> Investigation Leads
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            AI-generated leads and manual entries — {counts.ai} AI · {counts.manual} manual
          </p>
        </div>

        <div className="flex items-center gap-2">
          {generating ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-deep-ocean/10 border border-deep-ocean/30 text-deep-ocean">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              <span className="text-sm font-medium">
                Generating… {progress.leads > 0 && `(${progress.leads})`}
              </span>
              <button
                type="button"
                onClick={handleCancel}
                className="ml-1 p-0.5 rounded hover:bg-deep-ocean/20 cursor-pointer"
                aria-label="Cancel generation"
                title="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            // <Button
            //   variant={health.loading || !health.available || !health.model_pulled ? "outline" : "secondary"}
            //   onClick={handleGenerate}
            //   title={
            //     health.loading
            //       ? "Checking AI service availability…"
            //       : health.available && health.model_pulled
            //         ? `Generate AI-powered leads using ${health.model}`
            //         : health.detail
            //   }
            //   className={`px-3 py-1.5 cursor-pointer`}
            // >
            //   <Sparkles className="h-4 w-4" aria-hidden />
            //   Generate with AI
            // </Button>
            <Button
              variant={health.loading || !health.available ? "outline" : "secondary"}
              onClick={handleGenerate}
              title={
                health.loading
                  ? "Checking AI service availability…"
                  : health.available
                    ? `Generate AI-powered leads using ${health.model}`
                    : health.detail
              }
              className={`px-3 py-1.5 cursor-pointer`}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Generate with AI
            </Button>
          )}

          <Button onClick={() => setShowAdd(true)} className="px-3 py-1.5 cursor-pointer">
            <Plus className="h-4 w-4" /> Add Manual Lead
          </Button>
        </div>
      </header>

      {
        error && (
          <div className="mx-6 mt-3 flex items-center gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )
      }

      {/* Source filter pills */}
      <div className="px-6 pt-4 pb-3 flex flex-wrap items-center gap-2 border-b border-slate-100">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-1">
          Source:
        </span>
        {SOURCE_FILTER.map(opt => {
          const active = sourceFilter === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => { setSourceFilter(opt.key); setCurrentPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer
                ${active
                  ? 'bg-deep-ocean text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {opt.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-white'}`}>
                {counts[opt.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Keyword/type/date/severity filter row */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="leads-search">Search leads</label>
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden />
          <input
            id="leads-search"
            type="search"
            placeholder="Search leads by keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean focus:border-transparent"
            aria-label="Search leads by keyword"
          />
        </div>

        <label className="sr-only" htmlFor="filter-lead-type">Lead type</label>
        <div className="relative">
          <select
            id="filter-lead-type"
            value={leadTypeFilter}
            onChange={(e) => setLeadTypeFilter(e.target.value)}
            className="appearance-none pl-4 pr-8 py-2 border border-slate-300 rounded-md bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean min-w-35"
            aria-label="Filter by lead type"
          >
            {leadTypeFilterOptions.map((opt) => (
              <option key={opt.value || 'any'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" aria-hidden />
        </div>

        <label className="sr-only" htmlFor="filter-date">Select date</label>
        <div className="relative flex items-center">
          <Calendar className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" aria-hidden />
          <input
            id="filter-date"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean focus:border-transparent"
            aria-label="Select date"
          />
        </div>

        <label className="sr-only" htmlFor="filter-severity">Severity</label>
        <div className="relative">
          <select
            id="filter-severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="appearance-none pl-4 pr-8 py-2 border border-slate-300 rounded-md bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean"
            aria-label="Filter by severity"
          >
            {SEVERITY_FILTER.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" aria-hidden />
        </div>

        <Button onClick={handleApply} className="px-6 py-2 shadow-inner shadow-deep-ocean-900" aria-label="Apply filters">
          Apply
        </Button>
        <Button variant="outline" onClick={handleClear} className="px-6 py-2" aria-label="Clear filters">
          Clear
        </Button>
      </div>

      {/* Inline delete confirm row */}
      {
        confirmDelete && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <p className="text-xs text-red-700 flex-1">
              Delete manual lead <span className="font-mono font-semibold">{confirmDelete.id}</span> permanently?
              <span className="text-slate-600"> (AI leads can't be deleted — change their status to "Dismissed".)</span>
            </p>
            <button
              onClick={() => handleDelete(confirmDelete.id)}
              disabled={busyLeadId === confirmDelete.id}
              className="text-xs font-semibold text-red-600 hover:text-red-800 cursor-pointer px-3 py-1 rounded-md hover:bg-red-100 disabled:opacity-50"
            >
              {busyLeadId === confirmDelete.id ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(null)}
              disabled={busyLeadId === confirmDelete.id}
              className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer px-3 py-1 rounded-md hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        )
      }

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse" role="table" aria-label="Leads list">
          <thead>
            <tr className="bg-slate-100 text-slate-600 *:uppercase *:font-semibold *:text-[11px] text-nowrap tracking-wider">
              <th scope="col" className="px-6 py-4">Lead ID</th>
              <th scope="col" className="px-6 py-4">Source</th>
              <th scope="col" className="px-6 py-4 w-1/3">Description</th>
              <th scope="col" className="px-6 py-4">Type</th>
              <th scope="col" className="px-6 py-4 text-center">Severity</th>
              <th scope="col" className="px-6 py-4 text-center">Status</th>
              <th scope="col" className="px-6 py-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                  Loading leads…
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                  No leads match your filters. Try adjusting them or use the Clear button.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-semibold text-slate-800 text-nowrap text-xs">
                    {lead.id}
                  </td>
                  <td className="px-6 py-4">
                    <SourceBadge lead={lead} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Info size={16} className="text-amber-500 shrink-0 mt-0.5" aria-hidden />
                      <span className="font-medium leading-tight">
                        {lead.description}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-700">{lead.type}</td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${getSeverityClass(lead.severity)}`}
                      aria-label={`Severity: ${lead.severity}`}
                    >
                      {lead.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant={LEAD_STATUS_VARIANT[lead.status] || 'default'}>
                      {lead.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <Button
                        variant="outline"
                        onClick={() => setDialogLead(lead)}
                        className="px-4 py-1 text-xs"
                        aria-label={`View details for lead ${lead.id}`}
                      >
                        <Eye className="h-3 w-3 mr-3" /> View
                      </Button>
                      <StatusMenu
                        lead={lead}
                        onChange={handleStatusChange}
                        onAskDelete={(l) => setConfirmDelete({ id: l.id, type: l.type })}
                        busy={busyLeadId === lead.id}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {
        !loading && total > 0 && (
          <div className="px-6 py-4 border-t border-slate-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={total}
              start={start}
              end={end}
              itemLabel="leads"
            />
          </div>
        )
      }

      {/* Add Manual Lead modal */}
      {
        showAdd && (
          <AddLeadDialog
            isOpen={showAdd}
            onClose={() => setShowAdd(false)}
            onSubmit={handleAddLeadSave}
            caseId={caseId}
          />
        )
      }

      {/* Lead detail dialog */}
      {
        dialogLead && (
          <LeadDetailDialog
            lead={dialogLead}
            onClose={() => setDialogLead(null)}
            closeBtnRef={closeDialogBtnRef}
          />
        )
      }
    </section >
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Lead detail dialog
// ─────────────────────────────────────────────────────────────────────────────

function LeadDetailDialog({ lead, onClose, closeBtnRef }) {
  const isAI = lead.eventSource === EVENT_SOURCE.AI;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden />
      <div
        className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-full ${isAI ? 'bg-purple-600' : 'bg-emerald-600'} text-white flex items-center justify-center text-sm font-bold shrink-0`}>
              {isAI ? <Brain className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <h3 id="lead-dialog-title" className="text-lg font-bold text-slate-800 truncate">
                Lead Details — {lead.type}
              </h3>
              <p className="text-xs text-slate-500 font-mono">{lead.id}</p>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="p-2 rounded-md cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="px-6 pt-4 flex flex-wrap gap-2">
          <Badge variant={LEAD_STATUS_VARIANT[lead.status] || 'default'}>
            {lead.status}
          </Badge>
          <span className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-bold ${getSeverityClass(lead.severity)}`}>
            {lead.severity}
          </span>
          {isAI ? (
            <span className="text-[11px] inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-purple-200 bg-purple-50 text-purple-700 font-medium">
              <Brain className="h-3 w-3" /> AI-generated
            </span>
          ) : (
            <span className="text-[11px] inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 font-medium">
              <User className="h-3 w-3" /> Manual entry
            </span>
          )}
        </div>

        <div className="p-6 space-y-6">

          <section>
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2 pb-1 border-b border-slate-100">
              Description
            </h4>
            <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3 whitespace-pre-wrap">
              {lead.description || <span className="text-slate-400 italic">No description.</span>}
            </p>
          </section>

          {isAI && typeof lead.confidence === 'number' && lead.confidence > 0 && (
            <section>
              <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2 pb-1 border-b border-slate-100">
                AI Confidence
              </h4>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${confidenceColor(lead.confidence)} transition-all`}
                    style={{ width: `${lead.confidence}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-700 min-w-12">{Math.round(lead.confidence)}%</span>
              </div>
              {lead.confidence < 70 && (
                <p className="text-xs text-amber-700 mt-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  Low confidence — manual verification recommended.
                </p>
              )}
            </section>
          )}

          {lead.suggestedSuspect && (
            <section>
              <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2 pb-1 border-b border-slate-100">
                Suggested Suspect
              </h4>
              <div className="text-sm text-slate-700 space-y-1">
                {lead.suggestedSuspect.name && (
                  <p className="font-semibold">{lead.suggestedSuspect.name}</p>
                )}
                {lead.suggestedSuspect.suspectId && (
                  <p className="text-xs font-mono text-deep-ocean">{lead.suggestedSuspect.suspectId}</p>
                )}
                {lead.suggestedSuspect.basis && (
                  <p className="text-xs text-slate-500">{lead.suggestedSuspect.basis}</p>
                )}
              </div>
            </section>
          )}

          {lead.nextStep && (
            <section>
              <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2 pb-1 border-b border-slate-100">
                Next Recommended Step
              </h4>
              <div className="bg-deep-ocean/5 border border-deep-ocean/15 rounded-lg p-3">
                <p className="text-sm text-slate-700 leading-relaxed">{lead.nextStep}</p>
              </div>
            </section>
          )}

          <section>
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2 pb-1 border-b border-slate-100">
              Provenance
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm *:grid *:grid-cols-[1fr_2fr] *:gap-x-4">
              <p>
                <span className="font-semibold text-slate-700">Source:</span>
                <span className="text-slate-500">{lead.source || (isAI ? 'AI Analysis' : 'Manual')}</span>
              </p>
              <p>
                <span className="font-semibold text-slate-700">Type:</span>
                <span className="text-slate-500">{lead.type}</span>
              </p>
              {lead.officerName && (
                <p>
                  <span className="font-semibold text-slate-700">Officer:</span>
                  <span className="text-slate-500">{lead.officerName}</span>
                </p>
              )}
              <p>
                <span className="font-semibold text-slate-700">Generated:</span>
                <span className="text-slate-500 text-xs">
                  {lead.generatedAt ? new Date(lead.generatedAt).toLocaleString() : '—'}
                </span>
              </p>
              <p>
                <span className="font-semibold text-slate-700">Case ID:</span>
                <span className="text-slate-500 font-mono text-xs">{lead.caseId}</span>
              </p>
              {lead.similarCaseId && (
                <p>
                  <span className="font-semibold text-slate-700">Similar Case:</span>
                  <span className="text-slate-500 font-mono text-xs">{lead.similarCaseId}</span>
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end">
          <Button onClick={onClose} className="px-4 py-2">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CaseInvestigationLeads;