import { useState, useCallback } from 'react';
import { Search, ChevronDown, Calendar, Info } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Pagination } from '../../../components/ui/Pagination';

const PAGE_SIZE = 5;
const LEAD_TYPES = [
  { value: '', label: 'Lead Type' },
  { value: 'CCTV Analysis', label: 'CCTV Analysis' },
  { value: 'Fingerprint Match', label: 'Fingerprint Match' },
  { value: 'Extract Phone Data', label: 'Extract Phone Data' },
  { value: 'Forensic Analysis', label: 'Forensic Analysis' },
  { value: 'Neighborhood', label: 'Neighborhood' },
];
const SEVERITIES = [
  { value: 'all', label: 'All Severities' },
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
];

const leadsData = [
  { id: 'L-10046', description: 'Enhancing footage to identify unknown male leaving apartment.', type: 'CCTV Analysis', severity: 'High', date: '11/23/2026', status: 'Under Review', action: 'Accept' },
  { id: 'L-10045', description: 'Compare prints from knife and doorknob with known suspects.', type: 'Fingerprint Match', severity: 'Critical', date: '11/23/2026', status: 'In Progress', action: 'Accept' },
  { id: 'L-10044', description: 'Extract call logs and messages from victim\'s phone for timeline.', type: 'Extract Phone Data', severity: 'High', date: '11/23/2026', status: 'New', action: 'Accept' },
  { id: 'L-10043', description: 'Blood spatter analysis suggests altercation in living room.', type: 'Forensic Analysis', severity: 'Medium', date: '11/22/2026', status: 'Pending', action: 'Pending' },
  { id: 'L-10042', description: 'Neighborhood canvass found no additional witnesses.', type: 'Neighborhood', severity: 'Medium', date: '11/22/2026', status: 'Pending', action: 'Reject' },
  { id: 'L-10041', description: 'CCTV from adjacent building may show suspect approach.', type: 'CCTV Analysis', severity: 'Critical', date: '11/21/2026', status: 'Under Review', action: 'Accept' },
  { id: 'L-10040', description: 'DNA sample sent to lab; results pending.', type: 'Forensic Analysis', severity: 'High', date: '11/21/2026', status: 'In Progress', action: 'Accept' },
  { id: 'L-10039', description: 'Witness statement corroborates time of incident.', type: 'Neighborhood', severity: 'Medium', date: '11/20/2026', status: 'New', action: 'Accept' },
];

const CaseInvestigationLeads = () => {
  const [keyword, setKeyword] = useState('');
  const [leadTypeFilter, setLeadTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [appliedFilters, setAppliedFilters] = useState({
    keyword: '',
    leadType: '',
    date: '',
    severity: 'all',
  });
  const [currentPage, setCurrentPage] = useState(1);

  const filteredLeads = leadsData.filter((lead) => {
    const kw = (appliedFilters.keyword || '').toLowerCase();
    if (kw && !lead.description.toLowerCase().includes(kw) && !lead.id.toLowerCase().includes(kw) && !lead.type.toLowerCase().includes(kw)) return false;
    if (appliedFilters.leadType && lead.type !== appliedFilters.leadType) return false;
    if (appliedFilters.severity !== 'all' && lead.severity !== appliedFilters.severity) return false;
    return true;
  });

  const total = filteredLeads.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);
  const pageLeads = filteredLeads.slice(start, end);

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
    setAppliedFilters({ keyword: '', leadType: '', date: '', severity: 'all' });
    setCurrentPage(1);
  }, []);

  const getSeverityClass = (s) => {
    if (s === 'Critical') return 'bg-orange-500 text-white';
    if (s === 'High') return 'bg-rose-800/90 text-white';
    if (s === 'Medium') return 'bg-amber-500 text-white';
    return 'bg-slate-500 text-white';
  };

  const getStatusClass = (s) => {
    const t = (s || '').toLowerCase();
    if (t === 'under review' || t === 'in progress' || t === 'new') return 'bg-emerald-700 text-white';
    if (t === 'pending') return 'bg-slate-200 text-slate-700';
    return 'bg-slate-200 text-slate-700';
  };

  return (
    <section
      className="bg-white rounded-t-lg border-x border-t border-slate-300 shadow-sm overflow-hidden"
      aria-label="Leads"
    >
      <header className="p-6 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800">Leads</h2>
        <p className="text-sm text-slate-600 mt-1">View all leads generated by the system</p>
      </header>

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
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1a3a4a]"
            aria-label="Search leads by keyword"
          />
        </div>

        <label className="sr-only" htmlFor="filter-lead-type">Lead type</label>
        <div className="relative">
          <select
            id="filter-lead-type"
            value={leadTypeFilter}
            onChange={(e) => setLeadTypeFilter(e.target.value)}
            className="appearance-none pl-4 pr-8 py-2 border border-slate-300 rounded-md bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a4a] min-w-35"
            aria-label="Filter by lead type"
          >
            {LEAD_TYPES.map((opt) => (
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
            className="pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1a3a4a]"
            aria-label="Select date"
          />
        </div>

        <label className="sr-only" htmlFor="filter-severity">Severity</label>
        <div className="relative">
          <select
            id="filter-severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="appearance-none pl-4 pr-8 py-2 border border-slate-300 rounded-md bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a4a]"
            aria-label="Filter by severity"
          >
            {SEVERITIES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" aria-hidden />
        </div>

        <Button onClick={handleApply} className="px-6 py-2" aria-label="Apply filters">
          Apply
        </Button>
        <Button variant="outline" onClick={handleClear} className="px-6 py-2" aria-label="Clear filters">
          Clear
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse" role="table" aria-label="Leads list">
          <thead>
            <tr className="bg-slate-100 text-slate-600 uppercase text-[11px] font-bold tracking-wider">
              <th scope="col" className="px-6 py-4">Lead ID</th>
              <th scope="col" className="px-6 py-4 w-1/3">Description</th>
              <th scope="col" className="px-6 py-4">Lead Type</th>
              <th scope="col" className="px-6 py-4 text-center">Severity</th>
              <th scope="col" className="px-6 py-4 text-center">Date Generated</th>
              <th scope="col" className="px-6 py-4 text-center">Status</th>
              <th scope="col" className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {pageLeads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                  No leads match your search. Try different filters or clear filters.
                </td>
              </tr>
            ) : (
              pageLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{lead.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Info size={16} className="text-amber-500 shrink-0 mt-0.5" aria-hidden />
                      <span className="font-medium leading-tight">{lead.description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-700">{lead.type}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-bold text-center ${getSeverityClass(lead.severity)}`} aria-label={`Severity: ${lead.severity}`}>
                      {lead.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-700">{lead.date}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-4 py-1.5 rounded text-[10px] font-bold ${getStatusClass(lead.status)}`} aria-label={`Status: ${lead.status}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {lead.action === 'Reject' ? (
                      <button type="button" className="inline-flex items-center gap-1 border border-red-300 rounded px-3 py-1.5 bg-red-600 text-white text-xs font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">
                        <ChevronDown size={12} aria-hidden /> Reject
                      </button>
                    ) : lead.action === 'Pending' ? (
                      <button type="button" className="inline-flex items-center gap-1 border border-slate-300 rounded px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400">
                        <ChevronDown size={12} aria-hidden /> Pending
                      </button>
                    ) : (
                      <button type="button" className="inline-flex items-center gap-1 border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1a3a4a]">
                        <ChevronDown size={12} aria-hidden /> Accept
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
    </section>
  );
};

export default CaseInvestigationLeads;
