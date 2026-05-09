import { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import {
  Search, ChevronDown, Calendar, ExternalLink,
  Loader2, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';

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

const LinkedCases = () => {
  const { id: caseIdFromUrl } = useParams();
  const caseId = caseIdFromUrl || 'C-2053'; // graceful fallback if mounted outside the dynamic route

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

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <section
      className="bg-white rounded-t-lg border-x border-t border-slate-300 p-6 shadow-sm"
      aria-label="Linked Cases"
    >
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Linked Cases</h2>
        <p className="text-sm text-slate-600 mt-1">Visualize relationship between cases</p>
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
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Loading linked cases…
                    </span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-red-600">
                    <span className="inline-flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" aria-hidden />
                      {error}
                    </span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No linked cases match your search. Try different filters.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={`${row.id}-${row.linkType || ''}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800 text-nowrap">{row.id}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{row.title}</td>
                    <td className="px-6 py-4 text-slate-700">{row.investigator}</td>
                    <td className="px-6 py-4 text-slate-700">{row.registerDate}</td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusVariant(row.status)}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getRelationVariant(row.relation, row.linkType)}>
                        {row.relation}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
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
                ))
              )}
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