import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, ChevronDown, Calendar, X, ExternalLink, Pencil, Users } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Pagination } from '../../../components/ui/Pagination';
import { Badge } from '../../../components/ui/Badge';
import AddSuspectDialog from './forms/AddSuspect';

const PAGE_SIZE = 5;
const STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'questioned', label: 'Questioned' },
  { value: 'detained', label: 'Detained' },
  { value: 'released', label: 'Released' },
];

const MOCK_SUSPECTS = [
  {
    id: 'S-10046',
    name: 'Farooq Sheikh',
    age: 40,
    gender: 'Male',
    contact: '+93 456 7867654',
    dateAdded: '11 / 23 / 2026',
    reason: 'Neighbor; heard argument on night of incident',
    alibi: "",
    caseId: 'C-2053',
    status: 'QUESTIONED - DENIES',
    address: 'Block 5, Clifton, Karachi',
    statementDate: '23 Nov 2026',
    relationToCase: 'Neighbor',
  },
  {
    id: 'S-10047',
    name: 'Ayesha Noor',
    age: 27,
    gender: 'Female',
    contact: '+92 300 1234567',
    dateAdded: '11 / 24 / 2026',
    reason: 'Building resident; reported seeing suspicious person',
    alibi: 'Saw a person leaving the building around 10:45 PM; could not identify facial features.',
    caseId: 'C-2053',
    status: 'QUESTIONED - CONFIRMED',
    address: 'Apartment 8, Same building, Clifton',
    statementDate: '24 Nov 2026',
    relationToCase: 'Resident',
  },
  {
    id: 'S-10048',
    name: 'Saima Raza',
    age: 34,
    gender: 'Female',
    contact: '+92 321 9876543',
    dateAdded: '11 / 25 / 2026',
    reason: 'Victim\'s colleague; last to see victim alive',
    alibi: 'Provided timeline of victim\'s movements on the day of incident; cooperative with investigation.',
    caseId: 'C-2053',
    status: 'DETAINED',
    address: 'DHA Phase 5, Karachi',
    statementDate: '25 Nov 2026',
    relationToCase: 'Colleague',
  },
];

const CaseSuspects = () => {
  const [searchName, setSearchName] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [appliedFilters, setAppliedFilters] = useState({
    name: '',
    date: '',
    status: 'all',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogSuspect, setDialogSuspect] = useState(null);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [updateTarget, setUpdateTarget] = useState(null); // evidence item being updated


  const filteredSuspects = MOCK_SUSPECTS.filter((w) => {
    const nameMatch = !appliedFilters.name || w.name.toLowerCase().includes(appliedFilters.name.toLowerCase()) || w.id.toLowerCase().includes(appliedFilters.name.toLowerCase());
    const statusMatch = appliedFilters.status === 'all' || w.status.toLowerCase() === appliedFilters.status;
    return nameMatch && statusMatch;
  });

  const total = filteredSuspects.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);
  const pageSuspects = filteredSuspects.slice(start, end);

  const handleApply = useCallback(() => {
    setAppliedFilters({
      name: searchName.trim(),
      date: dateFilter,
      status: statusFilter,
    });
    setCurrentPage(1);
  }, [searchName, dateFilter, statusFilter]);

  const handleClear = useCallback(() => {
    setSearchName('');
    setDateFilter('');
    setStatusFilter('all');
    setAppliedFilters({ name: '', date: '', status: 'all' });
    setCurrentPage(1);
  }, []);

  const openDialog = (suspect) => {
    setDialogSuspect(suspect);
  };

  const closeDialog = useCallback(() => {
    setDialogSuspect(null);
  }, []);

  useEffect(() => {
    if (!dialogSuspect) return;
    closeButtonRef.current?.focus();
  }, [dialogSuspect]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') closeDialog();
    };
    if (dialogSuspect) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [dialogSuspect, closeDialog]);

  return (
    <section
      className="bg-white rounded-t-lg border-x border-t border-slate-300 p-6 shadow-sm"
      aria-label="Suspects"
    >
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Suspects</h2>
        <p className="text-sm text-slate-600 mt-1">View all suspects and their case involvement</p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="suspect-search">Search suspect by name</label>
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden />
          <input
            id="suspect-search"
            type="search"
            placeholder="Search suspect by name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:border-transparent"
            aria-label="Search suspect by name"
          />
        </div>
        <label className="sr-only" htmlFor="filter-date">Select date</label>
        <div className="relative flex items-center">
          <Calendar className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" aria-hidden />
          <input
            id="filter-date"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm"
            aria-label="Select date"
          />
        </div>
        <label className="sr-only" htmlFor="filter-status">Filter by status</label>
        <div className="relative">
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-4 pr-8 py-2 border border-slate-300 rounded-md bg-white text-slate-800 text-sm"
            aria-label="Filter by status"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
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

      {/* Table – HCI: Consistency, scannability */}
      <div className="border border-slate-200 rounded-b-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" role="table" aria-label="Suspect list">
            <thead className="bg-slate-100 text-slate-600 text-nowrap">
              <tr>
                <th scope="col" className="p-4 font-semibold uppercase text-[11px] tracking-wide">Suspect ID</th>
                <th scope="col" className="p-4 font-semibold uppercase text-[11px] tracking-wide">Name</th>
                <th scope="col" className="p-4 font-semibold uppercase text-[11px] tracking-wide">Reason</th>
                <th scope="col" className="p-4 font-semibold uppercase text-[11px] tracking-wide">Suspect Alibi</th>
                <th scope="col" className="p-4 font-semibold uppercase text-[11px] tracking-wide">Status</th>
                <th scope="col" className="p-4 font-semibold uppercase text-[11px] tracking-wide">Relation</th>
                <th scope="col" className="p-4 font-semibold uppercase text-[11px] tracking-wide text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {pageSuspects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No suspects match your search. Try different filters.
                  </td>
                </tr>
              ) : (
                pageSuspects.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-semibold text-slate-800 text-nowrap">{s.id}</td>
                    <td className="p-4 text-slate-800">{s.name}</td>
                    <td className="p-4 text-slate-700">{s.reason}</td>
                    <td className="p-4 text-slate-700">{s.alibi ? (
                      <>
                        <div>
                          {s.alibi.length > 50
                            ? `${s.alibi.slice(0, 50)}...`
                            : s.alibi}
                        </div>
                      </>)
                      : null
                    }</td>
                    <td className="px-6 py-4 text-center">
                      <Badge
                        variant={s.status === 'QUESTIONED - CONFIRMED' ? 'success'
                          : s.status === 'DETAINED' ? 'warning'
                            : s.status === 'QUESTIONED - DENIES' ? 'default'
                              : 'default'}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-slate-700">{s.relationToCase}</td>
                    <td className="p-4 text-center grid grid-rows-2 *:text-xs *:text-nowrap">
                      <Button
                        variant='default'
                        className={'px-4 py-1 mb-2'}
                        onClick={() => openDialog(s)}
                        aria-label={`View full details for ${s.name}`}
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-2" aria-hidden />
                        View details
                      </Button>
                      <Button
                        variant='outline'
                        className={'px-4 py-1 '}
                        onClick={() => setUpdateTarget(s)}
                        aria-label={`Update suspect ${s.name} information`}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-2" aria-hidden />
                        Update
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {total > 0 && (
        <div className="mt-4 px-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={total}
            start={start}
            end={end}
            itemLabel="suspects"
          />
        </div>
      )}

      {/* Full suspect details dialog – HCI: Focus management, Escape to close */}
{dialogSuspect && (
    <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="suspect-dialog-title"
        aria-describedby="suspect-dialog-desc"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && closeDialog()}
    >
        <div className="absolute inset-0 bg-black/50" aria-hidden />
        <div
            className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                        <Users className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 id="suspect-dialog-title" className="text-lg font-bold text-slate-800">
                            Suspect Details
                        </h3>
                        <p className="text-xs text-slate-500 font-mono">{dialogSuspect.id}</p>
                    </div>
                </div>
                <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={closeDialog}
                    className="p-2 rounded-md cursor-pointer text-slate-500 hover:bg-slate-blue hover:text-cool-silver focus:outline-none focus:ring-2"
                    aria-label="Close dialog"
                >
                    <X className="h-5 w-5" aria-hidden />
                </button>
            </div>

            <div id="suspect-dialog-desc" className="p-6 space-y-6">

                {/* Personal Information */}
                <section aria-labelledby="personal-heading">
                    <h4 id="personal-heading" className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3 pb-1 border-b border-slate-100">
                        Personal Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm *:grid *:grid-cols-[1fr_2fr] *:gap-x-4">
                        <p>
                            <span className="font-semibold text-slate-700">Suspect ID:</span>
                            <span className="text-slate-500 font-mono text-xs">{dialogSuspect.id}</span>
                        </p>
                        <p>
                            <span className="font-semibold text-slate-700">Name:</span>
                            <span className="text-slate-500">{dialogSuspect.name || '—'}</span>
                        </p>
                        <p>
                            <span className="font-semibold text-slate-700">CNIC:</span>
                            <span className="text-slate-500 font-mono text-xs">{dialogSuspect.cnic || '—'}</span>
                        </p>
                        <p>
                            <span className="font-semibold text-slate-700">Age:</span>
                            <span className="text-slate-500">{dialogSuspect.age || '—'}</span>
                        </p>
                        <p>
                            <span className="font-semibold text-slate-700">Gender:</span>
                            <span className="text-slate-500">{dialogSuspect.gender || '—'}</span>
                        </p>
                        <p>
                            <span className="font-semibold text-slate-700">Occupation:</span>
                            <span className="text-slate-500">{dialogSuspect.occupation || '—'}</span>
                        </p>
                        <p>
                            <span className="font-semibold text-slate-700">Contact:</span>
                            {dialogSuspect.contact ? (
                                <a
                                    href={`tel:${dialogSuspect.contact.replace(/\s/g, '')}`}
                                    className="text-slate-500 hover:underline"
                                >
                                    {dialogSuspect.contact}
                                </a>
                            ) : (
                                <span className="text-slate-500">—</span>
                            )}
                        </p>
                        <p>
                            <span className="font-semibold text-slate-700">Address:</span>
                            <span className="text-slate-500">{dialogSuspect.address || '—'}</span>
                        </p>
                    </div>
                </section>

                {/* Case & Status */}
                <section aria-labelledby="case-heading">
                    <h4 id="case-heading" className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3 pb-1 border-b border-slate-100">
                        Case & Status
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm *:grid *:grid-cols-[1fr_2fr] *:gap-x-4">
                        <p>
                            <span className="font-semibold text-slate-700">Case ID:</span>
                            <span className="text-slate-500 font-medium">{dialogSuspect.caseId || '—'}</span>
                        </p>
                        <p>
                            <span className="font-semibold text-slate-700">Status:</span>
                            <span>
                                <Badge
                                    variant={
                                        dialogSuspect.status === 'QUESTIONED - CONFIRMED' ? 'success'
                                            : dialogSuspect.status === 'DETAINED' ? 'warning'
                                                : dialogSuspect.status === 'QUESTIONED - DENIES' ? 'default'
                                                    : 'default'
                                    }
                                >
                                    {dialogSuspect.status || 'Unknown'}
                                </Badge>
                            </span>
                        </p>
                        <p>
                            <span className="font-semibold text-slate-700">Relation to Case:</span>
                            <span className="text-slate-500">{dialogSuspect.relationToCase || '—'}</span>
                        </p>
                        <p>
                            <span className="font-semibold text-slate-700">Date Added:</span>
                            <span className="text-slate-500">{dialogSuspect.dateAdded || '—'}</span>
                        </p>
                        <p>
                            <span className="font-semibold text-slate-700">Statement Date:</span>
                            <span className="text-slate-500">{dialogSuspect.statementDate || '—'}</span>
                        </p>
                        <p>
                            <span className="font-semibold text-slate-700">Currently Arrested:</span>
                            <span>
                                <Badge variant={dialogSuspect.arrested ? 'warning' : 'default'}>
                                    {dialogSuspect.arrested ? 'Yes' : 'No'}
                                </Badge>
                            </span>
                        </p>
                        <p className="sm:col-span-2">
                            <span className="font-semibold text-slate-700">Prior Criminal Record:</span>
                            <span>
                                <Badge variant={dialogSuspect.criminalRecord ? 'destructive' : 'success'}>
                                    {dialogSuspect.criminalRecord ? 'Yes — Has Record' : 'No Known Record'}
                                </Badge>
                            </span>
                        </p>
                    </div>
                </section>

                {/* Reason for Suspicion */}
                <section aria-labelledby="reason-heading">
                    <h4 id="reason-heading" className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2 pb-1 border-b border-slate-100">
                        Reason for Suspicion
                    </h4>
                    <p className="text-slate-700 text-sm leading-relaxed bg-amber-50/50 border border-amber-100 rounded-lg p-3">
                        {dialogSuspect.reason || <span className="text-slate-400 italic">No reason documented yet.</span>}
                    </p>
                </section>

                {/* Alibi / Statement */}
                <section aria-labelledby="statement-heading">
                    <h4 id="statement-heading" className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2 pb-1 border-b border-slate-100">
                        Alibi / Statement
                    </h4>
                    <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3">
                        {dialogSuspect.alibi || <span className="text-slate-400 italic">No statement recorded yet.</span>}
                    </p>
                </section>

                {/* Physical Description */}
                <section aria-labelledby="description-heading">
                    <h4 id="description-heading" className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2 pb-1 border-b border-slate-100">
                        Physical Description
                    </h4>
                    <p className="text-slate-700 text-sm leading-relaxed">
                        {dialogSuspect.physicalDescription || <span className="text-slate-400 italic">No physical description on file.</span>}
                    </p>
                </section>

                {/* Affiliations & Escape Details */}
                <section aria-labelledby="affiliations-heading">
                    <h4 id="affiliations-heading" className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3 pb-1 border-b border-slate-100">
                        Affiliations & Escape Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm *:grid *:grid-cols-[1fr_2fr] *:gap-x-4">
                        <p className="sm:col-span-2">
                            <span className="font-semibold text-slate-700">Known Affiliations / Gang:</span>
                            <span className="text-slate-500">{dialogSuspect.knownAffiliations || '—'}</span>
                        </p>
                        <p>
                            <span className="font-semibold text-slate-700">Arrival / Escape Method:</span>
                            <span className="text-slate-500">{dialogSuspect.arrivalMethod || '—'}</span>
                        </p>
                        <p>
                            <span className="font-semibold text-slate-700">Vehicle Description:</span>
                            <span className="text-slate-500">{dialogSuspect.vehicleDescription || '—'}</span>
                        </p>
                    </div>
                </section>

                {/* Additional Notes */}
                <section aria-labelledby="notes-heading">
                    <h4 id="notes-heading" className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2 pb-1 border-b border-slate-100">
                        Additional Notes
                    </h4>
                    <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3">
                        {dialogSuspect.notes || <span className="text-slate-400 italic">No additional notes.</span>}
                    </p>
                </section>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end">
                <Button onClick={closeDialog} className={'px-4 py-2'}>
                    Close
                </Button>
            </div>
        </div>
    </div>
)}

      <AddSuspectDialog
        isOpen={!!updateTarget}
        onClose={() => setUpdateTarget(null)}
        caseId="C-2053"
        initialData={updateTarget}
        onSubmit={(updated) => {
          console.log("Updated suspect:", updated);
          setUpdateTarget(null);
        }}
      />
    </section>
  );
};

export default CaseSuspects;
