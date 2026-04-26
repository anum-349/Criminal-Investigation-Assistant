import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, ChevronDown, Calendar, Brain, User, Plus, X,
  Eye, CheckCircle2, AlertTriangle, ExternalLink, Trash2,
  Info, Lightbulb,
} from 'lucide-react';

import { Button }     from '../../../components/ui/Button';
import { Pagination } from '../../../components/ui/Pagination';
import { Badge }      from '../../../components/ui/Badge';


import {
  EVENT_SOURCE,
  LEAD_TYPES         as LEAD_TYPE_OPTIONS,
  LEAD_STATUSES,
  LEAD_STATUS_VARIANT,
  confidenceColor,
  createAILead,
  createManualLead,
} from './caseEventConstants';

import AddLeadDialog from './forms/AddLead';

// ─────────────────────────────────────────────────────────────────────────────
// Constants local to this view
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 5;

const LEAD_TYPE_FILTER = [
  { value: '',     label: 'All Lead Types' },
  ...LEAD_TYPE_OPTIONS.map(t => ({ value: t, label: t })),
];

const SEVERITY_FILTER = [
  { value: 'all',      label: 'All Severities' },
  { value: 'Critical', label: 'Critical' },
  { value: 'High',     label: 'High' },
  { value: 'Medium',   label: 'Medium' },
  { value: 'Low',      label: 'Low' },
];

const SOURCE_FILTER = [
  { key: 'all',    label: 'All Leads' },
  { key: 'ai',     label: 'AI-generated' },
  { key: 'manual', label: 'Manual' },
];

// Status pill colour for the table body
const getSeverityClass = (s) => {
  if (s === 'Critical') return 'bg-orange-500 text-white';
  if (s === 'High')     return 'bg-rose-800/90 text-white';
  if (s === 'Medium')   return 'bg-amber-500 text-white';
  return 'bg-slate-500 text-white';
};

// ─────────────────────────────────────────────────────────────────────────────
// Seed leads — built via the Step-1 factories so shapes are guaranteed
// ─────────────────────────────────────────────────────────────────────────────
// The earlier `leadsData` array used a flat shape with no eventSource. Replace
// it with a mix of AI + manual leads constructed by the factories. The IDs are
// re-generated each mount; descriptions are kept similar to the originals so
// the demo still feels familiar.

const buildSeedLeads = (caseId) => [
  createAILead({
    caseId,
    type: 'CCTV Analysis',
    description: 'Enhancing footage to identify unknown male leaving apartment.',
    confidence: 78,
    severity: 'High',
    nextStep: 'Cross-reference enhanced still with suspect database.',
    status: 'Under Review',
  }),
  createAILead({
    caseId,
    type: 'Fingerprint Match',
    description: 'Compare prints from knife and doorknob with known suspects.',
    confidence: 91,
    severity: 'Critical',
    nextStep: 'Submit for AFIS comparison; expedite due to severity.',
    status: 'In Progress',
  }),
  createAILead({
    caseId,
    type: 'Phone / Digital',
    description: "Extract call logs and messages from victim's phone for timeline.",
    confidence: 64,
    severity: 'High',
    nextStep: "Issue warrant for service-provider records.",
    status: 'New',
  }),
  createAILead({
    caseId,
    type: 'Forensic Analysis',
    description: 'Blood spatter analysis suggests altercation in living room.',
    confidence: 72,
    severity: 'Medium',
    nextStep: 'Re-photograph scene; correlate with body position.',
    status: 'New',
  }),
  // ── Manual lead — investigator-entered, no AI confidence ────────────────
  createManualLead({
    type: 'Informant Tip',
    description:
      'CI reports suspect was seen in Block 5 area approximately 48 hours before incident. Same description as CCTV figure.',
    severity: 'High',
    source: 'Field Intelligence',
    officerName: 'Insp. Rana Ali Khan',
    nextStep: 'Task CI for additional details. Cross-check area surveillance for those dates.',
    status: 'New',
  }, caseId),
  createAILead({
    caseId,
    type: 'Location Pattern',
    description: 'CCTV from adjacent building may show suspect approach route.',
    confidence: 56,
    severity: 'Critical',
    nextStep: 'Coordinate with building management for full footage retrieval.',
    status: 'Under Review',
  }),
  createAILead({
    caseId,
    type: 'DNA Match',
    description: 'DNA sample sent to lab; results pending.',
    confidence: 84,
    severity: 'High',
    nextStep: 'Follow up with lab; expected turnaround 5-7 days.',
    status: 'In Progress',
  }),
  createManualLead({
    type: 'Witness Lead',
    description: 'Witness statement corroborates time of incident; new lead on getaway vehicle direction.',
    severity: 'Medium',
    source: 'Officer Entry',
    officerName: 'Insp. Rana Ali Khan',
    nextStep: 'Pull traffic-cam footage along claimed escape route.',
    status: 'New',
  }, caseId),
];

// ─────────────────────────────────────────────────────────────────────────────
// Source badge — small AI/Manual pill for the table
// ─────────────────────────────────────────────────────────────────────────────

const SourceBadge = ({ lead }) => {
  if (lead.eventSource === EVENT_SOURCE.AI) {
    return (
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
          <Brain className="h-2.5 w-2.5" /> AI
        </span>
        {typeof lead.confidence === 'number' && (
          <div className="flex items-center gap-1.5 min-w-24">
            <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-1 rounded-full ${confidenceColor(lead.confidence)}`}
                style={{ width: `${lead.confidence}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-slate-600">{lead.confidence}%</span>
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
// Status action menu — replaces the dummy Accept/Pending/Reject <select>
// ─────────────────────────────────────────────────────────────────────────────

const StatusMenu = ({ lead, onChange, onAskDelete }) => {
  // AI leads: status changes only (preserve audit trail).
  // Manual leads: status changes + delete option.
  return (
    <div className="relative">
      <select
        value={lead.status}
        onChange={(e) => onChange(lead.id, e.target.value)}
        className="appearance-none pl-3 pr-7 py-1.5 border border-slate-300 rounded-md bg-white text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-deep-ocean cursor-pointer min-w-28"
        aria-label={`Update status for lead ${lead.id}`}
      >
        {LEAD_STATUSES.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" aria-hidden />

      {lead.editable && (
        <button
          onClick={() => onAskDelete(lead.id)}
          className="ml-1.5 p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer align-middle"
          title="Delete manual lead"
          aria-label={`Delete lead ${lead.id}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const CaseInvestigationLeads = ({ caseId = 'C-2053' }) => {
  // ── State ───────────────────────────────────────────────────────────────
  const [leads, setLeads] = useState(() => buildSeedLeads(caseId));

  // Filter inputs
  const [keyword, setKeyword]               = useState('');
  const [leadTypeFilter, setLeadTypeFilter] = useState('');
  const [dateFilter, setDateFilter]         = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [sourceFilter, setSourceFilter]     = useState('all');

  const [appliedFilters, setAppliedFilters] = useState({
    keyword: '', leadType: '', date: '', severity: 'all',
  });

  const [currentPage, setCurrentPage] = useState(1);

  // Add modal
  const [showAdd, setShowAdd] = useState(false);

  // Detail dialog
  const [dialogLead, setDialogLead] = useState(null);
  const closeDialogBtnRef = useRef(null);

  // Inline delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ── Filtering ───────────────────────────────────────────────────────────
  const filteredLeads = useMemo(() => leads.filter((lead) => {
    const kw = (appliedFilters.keyword || '').toLowerCase();
    if (kw) {
      const inKw = [lead.id, lead.description, lead.type, lead.source]
        .filter(Boolean)
        .some(s => s.toLowerCase().includes(kw));
      if (!inKw) return false;
    }
    if (appliedFilters.leadType && lead.type !== appliedFilters.leadType) return false;
    if (appliedFilters.severity !== 'all' && lead.severity !== appliedFilters.severity) return false;

    if (sourceFilter === 'ai'     && lead.eventSource !== EVENT_SOURCE.AI)     return false;
    if (sourceFilter === 'manual' && lead.eventSource !== EVENT_SOURCE.MANUAL) return false;

    return true;
  }), [leads, appliedFilters, sourceFilter]);

  // ── Source counts (for the pill badges) ─────────────────────────────────
  const sourceCounts = useMemo(() => ({
    all:    leads.length,
    ai:     leads.filter(l => l.eventSource === EVENT_SOURCE.AI).length,
    manual: leads.filter(l => l.eventSource === EVENT_SOURCE.MANUAL).length,
  }), [leads]);

  // ── Pagination math ─────────────────────────────────────────────────────
  const total      = filteredLeads.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start      = (currentPage - 1) * PAGE_SIZE;
  const end        = Math.min(start + PAGE_SIZE, total);
  const pageLeads  = filteredLeads.slice(start, end);

  // ── Handlers ────────────────────────────────────────────────────────────
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

  // AddLeadModal returns a fully-formed object today. Run through factory if
  // it ever switches to handing back raw form state, just like CaseTimeline.
  const handleAddLeadSave = (incoming) => {
    const isAlreadyLead = !!incoming?.id && !!incoming?.eventSource;
    const lead = isAlreadyLead ? incoming : createManualLead(incoming, caseId);
    setLeads(curr => [lead, ...curr]);
    setShowAdd(false);
    setCurrentPage(1);
  };

  const handleStatusChange = (id, status) => {
    setLeads(curr => curr.map(l => l.id === id ? { ...l, status } : l));
  };

  const handleDelete = (id) => {
    setLeads(curr => curr.filter(l => l.id !== id));
    setConfirmDelete(null);
  };

  // Esc closes detail dialog; focus management
  useEffect(() => {
    if (!dialogLead) return;
    closeDialogBtnRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') setDialogLead(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dialogLead]);

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────
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
            AI-generated leads and manual entries — {sourceCounts.ai} AI · {sourceCounts.manual} manual
          </p>
        </div>

        {/* Add Manual Lead — secondary style; AI is the headline */}
        <Button
        variant='default'
        className={'px-4 py-1.5'}
        onClick={() => setShowAdd(true)}
        >
          <Plus className="h-4 w-4" /> Add Manual Lead
        </Button>
      </header>

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
                {sourceCounts[opt.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Existing keyword/type/date/severity filter row */}
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
            {LEAD_TYPE_FILTER.map((opt) => (
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
      {confirmDelete && (
        <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700 flex-1">
            Delete manual lead <span className="font-mono font-semibold">{confirmDelete}</span> permanently?
            (AI leads are dismissed instead — change status to "Dismissed".)
          </p>
          <button
            onClick={() => handleDelete(confirmDelete)}
            className="text-xs font-semibold text-red-600 hover:text-red-800 cursor-pointer px-3 py-1 rounded-md hover:bg-red-100"
          >
            Yes, delete
          </button>
          <button
            onClick={() => setConfirmDelete(null)}
            className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer px-3 py-1 rounded-md hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      )}

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
            {pageLeads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                  No leads match your filters. Try adjusting them or use the Clear button.
                </td>
              </tr>
            ) : (
              pageLeads.map((lead) => (
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
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setDialogLead(lead)}
                        className="inline-flex items-center gap-1 cursor-pointer px-2.5 py-1.5 rounded-md text-[11px] font-medium border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                        aria-label={`View details for lead ${lead.id}`}
                      >
                        <Eye className="h-3 w-3" /> View
                      </button>
                      <StatusMenu
                        lead={lead}
                        onChange={handleStatusChange}
                        onAskDelete={(id) => setConfirmDelete(id)}
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
      {total > 0 && (
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
      )}

      {/* ── Add Manual Lead modal ─────────────────────────────────────── */}
      {showAdd && (
        <AddLeadDialog
          isOpen={showAdd}
          onClose={() => setShowAdd(false)}
          onSubmit={(data) => {
            const ev = data?.events?.[0];
            if (ev) handleAddLeadSave(ev);
          }}
          caseId={caseId}
        />
      )}

      {/* ── Lead detail dialog ────────────────────────────────────────── */}
      {dialogLead && (
        <LeadDetailDialog
          lead={dialogLead}
          onClose={() => setDialogLead(null)}
          closeBtnRef={closeDialogBtnRef}
        />
      )}
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Lead detail dialog — shows everything about a single lead
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
        {/* Header */}
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
            className="p-2 rounded-md cursor-pointer text-slate-500 hover:bg-slate-blue hover:text-cool-silver focus:outline-none focus:ring-2"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Top chip strip */}
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

        {/* Body */}
        <div className="p-6 space-y-6">

          {/* Description */}
          <section>
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2 pb-1 border-b border-slate-100">
              Description
            </h4>
            <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3 whitespace-pre-wrap">
              {lead.description || <span className="text-slate-400 italic">No description.</span>}
            </p>
          </section>

          {/* Confidence (AI only) */}
          {isAI && typeof lead.confidence === 'number' && (
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
                <span className="text-sm font-bold text-slate-700 min-w-12">{lead.confidence}%</span>
              </div>
              {lead.confidence < 70 && (
                <p className="text-xs text-amber-700 mt-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  Low confidence — manual verification recommended.
                </p>
              )}
            </section>
          )}

          {/* Suggested suspect */}
          {lead.suggestedSuspect && (
            <section>
              <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2 pb-1 border-b border-slate-100">
                Suggested Suspect
              </h4>
              {typeof lead.suggestedSuspect === 'string' ? (
                <p className="text-sm text-slate-700">{lead.suggestedSuspect}</p>
              ) : (
                <div className="text-sm text-slate-700 space-y-1">
                  <p className="font-semibold">{lead.suggestedSuspect.name}</p>
                  {lead.suggestedSuspect.suspectId && (
                    <p className="text-xs font-mono text-deep-ocean">{lead.suggestedSuspect.suspectId}</p>
                  )}
                  {lead.suggestedSuspect.basis && (
                    <p className="text-xs text-slate-500">{lead.suggestedSuspect.basis}</p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Next step */}
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

          {/* Provenance */}
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
                  {new Date(lead.generatedAt).toLocaleString()}
                </span>
              </p>
              <p>
                <span className="font-semibold text-slate-700">Case ID:</span>
                <span className="text-slate-500 font-mono text-xs">{lead.caseId}</span>
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
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