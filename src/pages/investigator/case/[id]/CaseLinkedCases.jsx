import { useState, useCallback, useEffect, useRef, Fragment } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import {
  Search, ChevronDown, Calendar, ExternalLink,
  Loader2, AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';
import { Sparkles } from 'lucide-react';                          // NEW
import { regenerateLinkedCases } from '@/services/caseApi';
import { useToast } from '@/context/ToastContext';

const PAGE_SIZE = 5;

// Fallback dropdown content used until the first API response arrives.
// The server returns the live lists in `relation_options` / `status_options`.
const DEFAULT_RELATIONS = [
  { value: '', label: 'Relation', variant: 'default' },
];
const DEFAULT_STATUSES = [
  { value: 'all', label: 'Status All', variant: 'default' },
];

const getAuthHeader = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const renderDetailMarkdown = (raw) => {
  if (!raw) return null;
  const lines = raw.split('\n');
  const blocks = [];
  let currentBullets = null;

  const flushBullets = () => {
    if (currentBullets && currentBullets.length) {
      blocks.push({ kind: 'ul', items: currentBullets });
    }
    currentBullets = null;
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) { flushBullets(); continue; }
    if (t.startsWith('### ')) {
      flushBullets();
      blocks.push({ kind: 'h4', text: t.slice(4).trim() });
    } else if (t.startsWith('• ')) {
      if (!currentBullets) currentBullets = [];
      currentBullets.push(t.slice(2).trim());
    } else {
      flushBullets();
      blocks.push({ kind: 'p', text: t });
    }
  }
  flushBullets();

  // Inline **bold** → <strong>. Naive split on **; engine never nests.
  const renderInline = (text, keyBase) =>
    text.split(/(\*\*[^*]+\*\*)/g).map((seg, i) => {
      if (seg.startsWith('**') && seg.endsWith('**')) {
        return <strong key={`${keyBase}-${i}`} className="text-slate-900">{seg.slice(2, -2)}</strong>;
      }
      return <span key={`${keyBase}-${i}`}>{seg}</span>;
    });

  return blocks.map((b, idx) => {
    if (b.kind === 'h4') {
      return (
        <h4
          key={idx}
          className="text-[11px] font-semibold tracking-wider text-deep-ocean-700 uppercase mt-3 first:mt-0"
        >
          {b.text}
        </h4>
      );
    }
    if (b.kind === 'ul') {
      return (
        <ul key={idx} className="mt-1.5 space-y-1 text-sm text-slate-700">
          {b.items.map((it, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-deep-ocean-500 mt-1.5 shrink-0">▸</span>
              <span>{renderInline(it, `${idx}-${i}`)}</span>
            </li>
          ))}
        </ul>
      );
    }
    return (
      <p key={idx} className="text-sm text-slate-700 mt-2 first:mt-0">
        {renderInline(b.text, `${idx}-p`)}
      </p>
    );
  });
};


const LinkedCases = () => {
  const { id: caseIdFromUrl } = useParams();
  const caseId = caseIdFromUrl || 'C-2053'; // graceful fallback if mounted outside the dynamic route
  const [expandedRow, setExpandedRow] = useState(null);

  // ── Filter inputs (live state) ─────────────────────────────────────────
  const [keyword, setKeyword] = useState('');
  const [relationFilter, setRelationFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Applied filters — what the server is actually using right now.
  const [appliedFilters, setAppliedFilters] = useState({
    keyword: '',
    relation: '',
    date: '',
    status: 'all',
  });
  const [currentPage, setCurrentPage] = useState(1);

  // ── Server data ────────────────────────────────────────────────────────
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [relationOptions, setRelationOptions] = useState(DEFAULT_RELATIONS);
  const [statusOptions, setStatusOptions] = useState(DEFAULT_STATUSES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestSeq = useRef(0);
  const [regenerating, setRegenerating] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);

  const toast = useToast();

  const toggleRow = (rowId) => {
    setExpandedRow(prev => (prev === rowId ? null : rowId));
  };

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchLinkedCases = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    const seq = ++requestSeq.current;

    try {
      const url = import.meta.env.VITE_API_URL;
      const res = await axios.get(
        `${url}/api/investigator/cases/${caseId}/linked-cases`,
        {
          headers: getAuthHeader(),
          params: {
            search: appliedFilters.keyword,
            relation: appliedFilters.relation,
            date: appliedFilters.date || undefined,
            status: appliedFilters.status,
            page: currentPage,
            page_size: PAGE_SIZE,
          },
        },
      );
      if (seq !== requestSeq.current) return;

      setItems(res.data?.items || []);
      setTotal(res.data?.total || 0);

      // Server is the source of truth for dropdown contents — but we keep
      // the existing selection if it's still valid; otherwise reset.
      const newRelations = res.data?.relation_options || DEFAULT_RELATIONS;
      const newStatuses = res.data?.status_options || DEFAULT_STATUSES;
      setRelationOptions(newRelations);
      setStatusOptions(newStatuses);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.error('Failed to load linked cases:', err);
      setError(err?.response?.data?.detail || 'Could not load linked cases.');
      setItems([]);
      setTotal(0);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [caseId, appliedFilters, currentPage]);

  useEffect(() => { fetchLinkedCases(); }, [fetchLinkedCases]);

  // ── Pagination math (server already paginated; we just compute display) ─
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + items.length, total);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleApply = useCallback(() => {
    setAppliedFilters({
      keyword: keyword.trim(),
      relation: relationFilter,
      date: dateFilter,
      status: statusFilter,
    });
    setCurrentPage(1);
  }, [keyword, relationFilter, dateFilter, statusFilter]);

  const handleClear = useCallback(() => {
    setKeyword('');
    setRelationFilter('');
    setDateFilter('');
    setStatusFilter('all');
    setAppliedFilters({ keyword: '', relation: '', date: '', status: 'all' });
    setCurrentPage(1);
  }, []);

  // Look up the variant for a status label / relation label from the
  // server-provided option lists (no more hard-coded label tables).
  const getStatusVariant = (statusLabel) =>
    statusOptions.find(s => s.value === statusLabel)?.variant || 'default';

  const getRelationVariant = (relationText, linkType) => {
    // Try matching by code first (precise), then by label (loose).
    if (linkType) {
      const byCode = relationOptions.find(r => r.value === linkType);
      if (byCode) return byCode.variant;
    }
    return relationOptions.find(r => r.label === relationText)?.variant || 'default';
  };

  const handleRegenerate = useCallback(async () => {
    if (regenerating || Date.now() < cooldownUntil) return;

    setRegenerating(true);
    try {
      const res = await regenerateLinkedCases(caseId);

      // Build a friendly toast message based on what the backend reports.
      const { linksFound, newLinks, updatedLinks, semanticAvailable } = res;
      let msg;
      if (linksFound === 0) {
        msg = 'No related cases found for this case.';
      } else if (newLinks > 0 && updatedLinks > 0) {
        msg = `Found ${linksFound} linked case${linksFound === 1 ? '' : 's'} `
          + `(${newLinks} new, ${updatedLinks} updated).`;
      } else if (newLinks > 0) {
        msg = `Found ${newLinks} new linked case${newLinks === 1 ? '' : 's'}.`;
      } else {
        msg = `Refreshed ${updatedLinks} existing link${updatedLinks === 1 ? '' : 's'}.`;
      }

      toast.success(msg);

      // Soft warning if the semantic dimension didn't fire — investigators
      // should know their results aren't using narrative matching.
      if (!semanticAvailable) {
        toast.warning(
          'Semantic narrative matching was unavailable on this run. '
          + 'Results are based on structured data only.',
          { duration: 6000 },
        );
      }

      // Refetch the table. `refetchItems` is whatever function in this
      // component loads /linked — rename to whatever you call it
      // (refreshItems, loadLinkedCases, etc.).
      await fetchLinkedCases();

      // Hold the button disabled for 3 seconds to prevent spam.
      setCooldownUntil(Date.now() + 3000);
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error';
      toast.error(`Could not regenerate linked cases: ${detail}`);
    } finally {
      setRegenerating(false);
    }
  }, [caseId, regenerating, cooldownUntil, fetchLinkedCases]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <section
      className="bg-white rounded-t-lg border-x border-t border-slate-300 p-6 shadow-sm"
      aria-label="Linked Cases"
    >
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Linked Cases</h2>
            <p className="text-sm text-slate-600 mt-1">Visualize relationship between cases</p>
          </div>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating || Date.now() < cooldownUntil}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium
              shadow-sm transition-colors focus:outline-none focus:ring-2
              focus:ring-deep-ocean-500 focus:ring-offset-2
              ${regenerating || Date.now() < cooldownUntil
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-deep-ocean-500 text-white hover:bg-deep-ocean-900'
              }`}
            aria-busy={regenerating}
            aria-label="Run case linking analysis"
            title={
              regenerating
                ? 'Linking analysis in progress…'
                : 'Re-run the linker to find or refresh related cases'
            }
          >
            {regenerating ? (
              <>
                {/* Spinner */}
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <span>Analysing…</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" aria-hidden />
                <span>Generate Linked Cases</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Filter bar — unchanged layout, options now driven by server */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="linked-search">Search linked cases</label>
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden />
          <input
            id="linked-search"
            type="search"
            placeholder="Search linked cases by keyword or case id"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean focus:border-transparent"
            aria-label="Search linked cases by keyword or case id"
          />
        </div>

        <label className="sr-only" htmlFor="filter-relation">Filter by relation</label>
        <div className="relative">
          <select
            id="filter-relation"
            value={relationFilter}
            onChange={(e) => setRelationFilter(e.target.value)}
            className="appearance-none pl-4 pr-8 py-2 border border-slate-300 rounded-md bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean min-w-45"
            aria-label="Filter by relation type"
          >
            {relationOptions.map((opt) => (
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
            className="pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean-500"
            aria-label="Select date"
          />
        </div>

        <label className="sr-only" htmlFor="filter-status">Filter by status</label>
        <div className="relative">
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-4 pr-8 py-2 border border-slate-300 rounded-md bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean-500"
            aria-label="Filter by status"
          >
            {statusOptions.map((opt) => (
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

      {/* Table */}
      <div className="border border-slate-200 rounded-b-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse" role="table" aria-label="Linked cases list">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-nowrap *:uppercase *:font-semibold *:text-[11px] tracking-wider">
                <th scope="col" className="px-3 py-4 w-8" aria-hidden></th>
                <th scope="col" className="px-6 py-4">Case ID</th>
                <th scope="col" className="px-6 py-4">Title</th>
                <th scope="col" className="px-6 py-4">Investigator</th>
                <th scope="col" className="px-6 py-4">Register Date</th>
                <th scope="col" className="px-6 py-4">Status</th>
                <th scope="col" className="px-6 py-4">Relation</th>
                <th scope="col" className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Loading linked cases…
                    </span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-red-600">
                    <span className="inline-flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" aria-hidden />
                      {error}
                    </span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    No linked cases match your search. Try different filters.
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const isOpen = expandedRow === row.id;
                  const hasDetail = Boolean(row.relationDetail);
                  return (
                    <Fragment key={`${row.id}-${row.linkType || ''}`}>
                      <tr
                        className={`cursor-pointer transition-colors ${isOpen ? 'bg-slate-50' : 'hover:bg-slate-50'
                          }`}
                        onClick={() => hasDetail && toggleRow(row.id)}
                        aria-expanded={isOpen}
                      >
                        <td className="px-3 py-4 align-top text-slate-400">
                          {hasDetail ? (
                            <ChevronRight
                              className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                              aria-hidden
                            />
                          ) : null}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800 text-nowrap align-top">{row.id}</td>
                        <td className="px-6 py-4 font-medium text-slate-800 align-top">{row.title}</td>
                        <td className="px-6 py-4 text-slate-700 align-top">{row.investigator}</td>
                        <td className="px-6 py-4 text-slate-700 align-top">{row.registerDate}</td>
                        <td className="px-6 py-4 align-top">
                          <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
                        </td>
                        <td className="px-6 py-4 align-top max-w-md">
                          {/* Headline narrative — no longer wrapped in a pill, since these
              are full sentences now, not short labels. The link-type pill
              moves below as a smaller secondary indicator. */}
                          <div className="text-sm text-slate-800 leading-snug">{row.relation}</div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <Badge variant={getRelationVariant(row.relation, row.linkType)} className="text-[10px]">
                              {(row.linkType || '').replace(/_/g, ' ').toLowerCase() || 'related'}
                            </Badge>
                            {row.similarityScore != null && (
                              <span className="text-[11px] text-slate-500 font-medium">
                                {row.similarityScore}% confidence
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          className="px-6 py-4 text-center align-top"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            to={`/investigator/case/${encodeURIComponent(row.linkedCaseId)}`}
                            state={{ caseId: row.linkedCaseId, title: row.title }}
                            className="inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium px-3 py-2 bg-deep-ocean-500 hover:bg-deep-ocean-900 shadow-inner shadow-black text-white transition-colors focus:outline-none focus:ring-2 focus:ring-deep-ocean-500 focus:ring-offset-2"
                            aria-label={`Open linked case ${row.id} - ${row.title}`}
                          >
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                            Open Linked Case
                          </Link>
                        </td>
                      </tr>
                      {isOpen && hasDetail && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={8} className="px-6 py-5 border-t border-slate-200">
                            <div className="max-w-3xl">
                              <div className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase mb-2">
                                Linkage Analysis
                              </div>
                              {renderDetailMarkdown(row.relationDetail)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )
              }

            </tbody>
          </table>
        </div>
      </div>

      {!loading && !error && total > 0 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={total}
            start={start}
            end={end}
            itemLabel="results"
          />
        </div>
      )}
    </section>
  );
};

export default LinkedCases;