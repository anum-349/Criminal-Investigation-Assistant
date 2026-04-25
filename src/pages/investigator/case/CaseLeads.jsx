// ════════════════════════════════════════════════════════════════════════════
// CaseInvestigationLeads.jsx  (updated — replaces existing)
// Wires in AddLeadModal. AI leads are shown with Brain icon; manual with User.
// ════════════════════════════════════════════════════════════════════════════
/**
 * Place at: src/pages/investigator/case/CaseLeads.jsx
 */
// export function CaseInvestigationLeads({ caseId = "C-2052" }) {
//   const [leads, setLeads] = useState([
//     { id: "LEAD-081", caseId, type: "Suspect Match",    severity: "Critical", status: "New",          confidence: 89, description: "Suspect Zafar Iqbal (alias Kala) — same MO, same weapon type (pistol), active in same area.", suggestedSuspect: "Zafar Iqbal (SUP-0041)", nextStep: "Cross-reference CCTV on routes between suspect's address and crime scene. Check known associates.", generatedAt: "2026-04-12 09:15", eventSource: "ai"     },
//     { id: "LEAD-082", caseId, type: "Location Pattern", severity: "High",     status: "Under Review", confidence: 76, description: "5 similar armed robberies within 2km radius in last 30 days.", nextStep: "Deploy surveillance on Block 5 exit routes. Coordinate with Saddar PS for shared intelligence.", generatedAt: "2026-04-12 09:17", eventSource: "ai"     },
//     { id: "LEAD-083", caseId, type: "Informant Tip",    severity: "High",     status: "New",          confidence: 65, description: "Confidential informant reports suspect was seen in area 48 hours before robbery.", suggestedSuspect: "Unknown — physical description provided", nextStep: "Task CI to obtain more details. Check area surveillance for 8–10 April.", generatedAt: "2026-04-13 16:30", eventSource: "manual", source: "Field Intelligence" },
//   ]);
//   const [showAdd,  setShowAdd]  = useState(false);
//   const [toDelete, setToDelete] = useState(null);

//   const setStatus = (id, status) => setLeads(ls => ls.map(l => l.id === id ? { ...l, status } : l));
//   const handleSave  = (l) => { setLeads(ls => [l, ...ls]); setShowAdd(false); };
//   const handleDelete = (id) => { setLeads(ls => ls.filter(l => l.id !== id)); setToDelete(null); };

//   const SEV = { Critical: "bg-red-100 text-red-700 border-red-200", High: "bg-orange-100 text-orange-700 border-orange-200", Medium: "bg-amber-100 text-amber-700 border-amber-200", Low: "bg-green-100 text-green-700 border-green-200" };
//   const ST_COLOR = { New: "bg-blue-100 text-blue-700", "Under Review": "bg-amber-100 text-amber-700", Actioned: "bg-green-100 text-green-700", Dismissed: "bg-slate-100 text-slate-500" };
//   const confColor = (v) => v >= 80 ? "bg-emerald-500" : v >= 60 ? "bg-amber-400" : "bg-red-400";

//   return (
//     <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <h2 className="text-xl font-bold text-slate-800">Investigative Leads</h2>
//           <p className="text-xs text-slate-500 mt-0.5">{leads.filter(l => l.status !== "Dismissed").length} active · {leads.filter(l => l.eventSource === "ai").length} AI-generated · {leads.filter(l => l.eventSource === "manual").length} manual</p>
//         </div>
//         <button
//           onClick={() => setShowAdd(true)}
//           className="flex items-center gap-2 px-4 py-2 bg-deep-ocean text-white rounded-lg text-sm font-semibold hover:bg-deep-ocean-900 transition-colors cursor-pointer shadow-sm"
//         >
//           <Plus className="h-4 w-4" /> Add Lead Manually
//         </button>
//       </div>

//       {leads.length === 0 ? (
//         <div className="text-center py-10 text-slate-400">
//           <Brain className="h-10 w-10 mx-auto mb-3 opacity-30" />
//           <p className="text-sm">No leads yet. AI will generate leads after case analysis.</p>
//         </div>
//       ) : (
//         <div className="space-y-4">
//           {leads.map((lead) => (
//             <div key={lead.id} className={`border rounded-xl overflow-hidden ${lead.status === "Dismissed" ? "opacity-50" : ""}`}>
//               {/* Severity bar */}
//               <div className={`h-1 ${lead.severity === "Critical" ? "bg-red-500" : lead.severity === "High" ? "bg-orange-400" : "bg-amber-400"}`} />
//               <div className="p-4">
//                 <div className="flex items-start justify-between gap-3">
//                   <div className="flex-1">
//                     <div className="flex flex-wrap items-center gap-2 mb-2">
//                       <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SEV[lead.severity] || ""}`}>{lead.severity}</span>
//                       <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ST_COLOR[lead.status] || ""}`}>{lead.status}</span>
//                       <span className="text-xs text-slate-500">{lead.type}</span>
//                       {lead.eventSource === "ai"
//                         ? <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Brain className="h-2.5 w-2.5" />AI</span>
//                         : <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1"><User className="h-2.5 w-2.5" />Manual</span>}
//                     </div>
//                     <p className="text-sm text-slate-700 leading-relaxed mb-2">{lead.description}</p>
//                     {lead.suggestedSuspect && (
//                       <p className="text-xs text-slate-500 mb-2"><span className="font-semibold">Suggested Suspect:</span> {lead.suggestedSuspect}</p>
//                     )}
//                     {/* Confidence bar */}
//                     <div className="flex items-center gap-2 mb-3">
//                       <span className="text-xs text-slate-400">Confidence</span>
//                       <div className="flex-1 bg-slate-200 rounded-full h-1.5">
//                         <div className={`h-1.5 rounded-full ${confColor(lead.confidence)}`} style={{ width: `${lead.confidence}%` }} />
//                       </div>
//                       <span className="text-xs font-bold text-slate-600">{lead.confidence}%</span>
//                     </div>
//                     <div className="bg-deep-ocean/5 border border-deep-ocean/15 rounded-lg p-2.5 mb-3">
//                       <p className="text-xs font-semibold text-deep-ocean mb-1">Next Recommended Step</p>
//                       <p className="text-xs text-slate-600 leading-relaxed">{lead.nextStep}</p>
//                     </div>
//                     <p className="text-[10px] text-slate-400">{lead.eventSource === "ai" ? "Generated" : "Added"}: {lead.generatedAt}{lead.source ? ` · Source: ${lead.source}` : ""}</p>
//                   </div>
//                   {/* Actions */}
//                   <div className="flex flex-col gap-1 shrink-0">
//                     {lead.status !== "Dismissed" && (
//                       <>
//                         <button onClick={() => setStatus(lead.id, "Actioned")} title="Mark Actioned"
//                           className="p-1.5 rounded-lg hover:bg-green-50 text-slate-400 hover:text-green-600 transition-colors cursor-pointer">
//                           <CheckCircle2 className="h-4 w-4" />
//                         </button>
//                         <button onClick={() => setToDelete(lead.id)} title="Dismiss lead"
//                           className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors cursor-pointer">
//                           <Trash2 className="h-4 w-4" />
//                         </button>
//                       </>
//                     )}
//                   </div>
//                 </div>

//                 {/* Status buttons */}
//                 {lead.status !== "Dismissed" && (
//                   <div className="flex gap-2 mt-1">
//                     {["New", "Under Review", "Actioned"].map(s => (
//                       <button key={s} onClick={() => setStatus(lead.id, s)}
//                         className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border
//                           ${lead.status === s ? "bg-deep-ocean text-white border-deep-ocean" : "bg-white text-slate-600 border-slate-300 hover:border-deep-ocean/50"}`}>
//                         {s}
//                       </button>
//                     ))}
//                   </div>
//                 )}

//                 {toDelete === lead.id && (
//                   <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5">
//                     <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
//                     <p className="text-xs text-red-700 flex-1">Dismiss this lead permanently?</p>
//                     <button onClick={() => handleDelete(lead.id)} className="text-xs font-semibold text-red-600 cursor-pointer px-2">Dismiss</button>
//                     <button onClick={() => setToDelete(null)} className="text-xs text-slate-500 cursor-pointer px-2">Cancel</button>
//                   </div>
//                 )}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       {showAdd && (
//         <AddLeadModal
//           caseId={caseId}
//           onClose={() => setShowAdd(false)}
//           onSave={handleSave}
//         />
//       )}
//     </div>
//   );
// }

// export default CaseInvestigationLeads; 

import { useState, useCallback } from 'react';
import { Search, ChevronDown, Calendar, Info } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Pagination } from '../../../components/ui/Pagination';
import { Badge } from '../../../components/ui/Badge';

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
            {SEVERITIES.map((opt) => (
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

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse" role="table" aria-label="Leads list">
          <thead>
            <tr className="bg-slate-100 text-slate-600 *:uppercase *:font-semibold *:text-[11px] text-nowrap tracking-wider">
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
                  <td className="px-6 py-4 font-semibold text-slate-800 text-nowrap">{lead.id}</td>
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
                    <Badge variant={lead.status === 'Under Review' || lead.status === 'In Progress' || lead.status === 'New' ? 'success' : lead.status === 'Pending' ? 'warning' : 'default'}>
                      {lead.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="relative">
                      <select
                        value={lead.action}
                        onChange={() => {}}
                        className="appearance-none pl-4 pr-8 py-2 border border-slate-300 rounded-md bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean min-w-25"
                        aria-label="Select action for lead"
                      >
                        <option value="Accept">Accept</option>
                        <option value="Pending">Pending</option>
                        <option value="Reject">Reject</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" aria-hidden />
                    </div>
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
