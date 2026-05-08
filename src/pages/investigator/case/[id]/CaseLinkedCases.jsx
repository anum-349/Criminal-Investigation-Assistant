import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronDown, Calendar, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';

const PAGE_SIZE = 5;
const RELATIONS = [
  { value: '', label: 'Relation', variant: 'default' },
  { value: 'suspect', label: 'Similar suspect description', variant: 'warning' },
  { value: 'location', label: 'Same building location', variant: 'success' },
  { value: 'victim', label: 'Involves victim\'s colleague', variant: 'default' },
  { value: 'movement', label: 'Possible suspect movement pattern', variant: 'destructive' },
  { value: 'proximity', label: 'Repeated crime scene proximity', variant: 'warning' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Status All', variant: 'default' },
  { value: 'Open', label: 'Open', variant: 'success' },
  { value: 'Closed', label: 'Closed', variant: 'destructive' },
];

const linkedData = [
  {
    id: 'C-10046',
    linkedCaseId: 'C-10046',
    title: 'Armed Robbery - Clifton Market',
    investigator: 'Insp. A. Khan',
    registerDate: '11/23/2026',
    status: 'Closed',
    relation: 'Similar suspect description (dark hoodie)',
  },
  {
    id: 'C-10047',
    linkedCaseId: 'C-10047',
    title: 'Burglary - Block 5 Apartments',
    investigator: 'Insp. R. Malik',
    registerDate: '11/23/2026',
    status: 'Open',
    relation: 'Same building location',
  },
  {
    id: 'C-10048',
    linkedCaseId: 'C-10048',
    title: 'Assault Report - Tech Solutions Office',
    investigator: 'Insp. S. Qureshi',
    registerDate: '11/23/2026',
    status: 'Closed',
    relation: 'Involves victim\'s colleague',
  },
  {
    id: 'C-10049',
    linkedCaseId: 'C-10049',
    title: 'Missing Person - Clifton Area',
    investigator: 'Insp. N. Hashmi',
    registerDate: '11/23/2026',
    status: 'Closed',
    relation: 'Possible suspect movement pattern',
  },
  {
    id: 'C-10050',
    linkedCaseId: 'C-10050',
    title: 'Theft - Apartment Block 5',
    investigator: 'Insp. A. Khan',
    registerDate: '11/23/2026',
    status: 'Closed',
    relation: 'Repeated crime scene proximity',
  },
];

const LinkedCases = () => {
  const [keyword, setKeyword] = useState('');
  const [relationFilter, setRelationFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [appliedFilters, setAppliedFilters] = useState({
    keyword: '',
    relation: '',
    date: '',
    status: 'all',
  });

  const filteredRows = linkedData.filter((row) => {
    const kw = (appliedFilters.keyword || '').toLowerCase();
    if (kw) {
      const match = row.title.toLowerCase().includes(kw) ||
        row.id.toLowerCase().includes(kw) ||
        row.relation.toLowerCase().includes(kw);
      if (!match) return false;
    }
    if (appliedFilters.relation && !row.relation.toLowerCase().includes(appliedFilters.relation.toLowerCase())) return false;
    if (appliedFilters.status !== 'all' && row.status !== appliedFilters.status) return false;
    return true;
  });

  const totalResults = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, totalResults);
  const pageResults = filteredRows.slice(start, end);

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

  const getStatusVariant = (status) => {
    const res = STATUS_OPTIONS.find(s => s.value === status)?.variant || "default";
    console.log(res)
    return res;
  };

  const getRelationVariant = (relation) => {
    return RELATIONS.find(r => r.label === relation)?.variant || "default";
  };

  return (
    <section
      className="bg-white rounded-t-lg border-x border-t border-slate-300 p-6 shadow-sm"
      aria-label="Linked Cases"
    >
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Linked Cases</h2>
        <p className="text-sm text-slate-600 mt-1">Visualize relationship between cases</p>
      </header>

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
            {RELATIONS.map((opt) => (
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
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" aria-hidden />
        </div>

        <Button onClick={handleApply} className="px-6 py-2 shadow-inner shadow-deep-ocean-900" aria-label="Apply filters">
          Apply
        </Button>
        <Button variant="outline" onClick={handleClear} className="px-6 py-2 " aria-label="Clear filters">
          Clear
        </Button>
      </div>

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
              {pageResults.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No linked cases match your search. Try different filters.
                  </td>
                </tr>
              ) : (
                pageResults.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
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
                      <Badge variant={getRelationVariant(row.relation)}>
                        {row.relation}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        to="/investigator/case"
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

      {totalResults > 0 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalResults}
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
