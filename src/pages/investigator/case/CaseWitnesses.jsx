import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, ChevronDown, Calendar, X, ExternalLink } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Pagination } from '../../../components/ui/Pagination';
import { Badge } from '../../../components/ui/Badge';

const PAGE_SIZE = 5;
const STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
  { value: 'pending', label: 'Pending' },
];

const MOCK_WITNESSES = [
  {
    id: 'W-10046',
    name: 'Farooq Sheikh',
    age: 40,
    gender: 'Male',
    contact: '+93 456 7867654',
    dateAdded: '11 / 23 / 2026',
    description: "Heard a loud argument from the victim's apartment at approximately 10:30 PM; did not visually see the suspect.",
    caseId: 'C-2053',
    status: 'Active',
    address: 'Block 5, Clifton, Karachi',
    statementDate: '23 Nov 2026',
    relationToCase: 'Neighbor',
  },
  {
    id: 'W-10047',
    name: 'Ayesha Noor',
    age: 27,
    gender: 'Female',
    contact: '+92 300 1234567',
    dateAdded: '11 / 24 / 2026',
    description: 'Saw a person leaving the building around 10:45 PM; could not identify facial features.',
    caseId: 'C-2053',
    status: 'Active',
    address: 'Apartment 8, Same building, Clifton',
    statementDate: '24 Nov 2026',
    relationToCase: 'Resident',
  },
  {
    id: 'W-10048',
    name: 'Saima Raza',
    age: 34,
    gender: 'Female',
    contact: '+92 321 9876543',
    dateAdded: '11 / 25 / 2026',
    description: 'Provided timeline of victim\'s movements on the day of incident; cooperative with investigation.',
    caseId: 'C-2053',
    status: 'Closed',
    address: 'DHA Phase 5, Karachi',
    statementDate: '25 Nov 2026',
    relationToCase: 'Colleague',
  },
  {
    id: 'W-10049',
    name: 'Imran Khan',
    age: 45,
    gender: 'Male',
    contact: '+92 333 5551234',
    dateAdded: '11 / 26 / 2026',
    description: 'Security guard; reported unusual activity in the lobby that evening.',
    caseId: 'C-2053',
    status: 'Pending',
    address: 'Security post, Building lobby',
    statementDate: '26 Nov 2026',
    relationToCase: 'Security',
  },
  {
    id: 'W-10050',
    name: 'Zainab Ali',
    age: 29,
    gender: 'Female',
    contact: '+92 304 7778899',
    dateAdded: '11 / 27 / 2026',
    description: 'Friend of victim; last phone call with victim at 9:00 PM.',
    caseId: 'C-2053',
    status: 'Active',
    address: 'Gulshan-e-Iqbal, Karachi',
    statementDate: '27 Nov 2026',
    relationToCase: 'Friend',
  },
];

const CaseWitnesses = () => {
  const [searchName, setSearchName] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [appliedFilters, setAppliedFilters] = useState({
    name: '',
    date: '',
    status: 'all',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogWitness, setDialogWitness] = useState(null);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  const filteredWitnesses = MOCK_WITNESSES.filter((w) => {
    const nameMatch = !appliedFilters.name || w.name.toLowerCase().includes(appliedFilters.name.toLowerCase()) || w.id.toLowerCase().includes(appliedFilters.name.toLowerCase());
    const statusMatch = appliedFilters.status === 'all' || w.status.toLowerCase() === appliedFilters.status;
    return nameMatch && statusMatch;
  });

  const total = filteredWitnesses.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);
  const pageWitnesses = filteredWitnesses.slice(start, end);

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

  const openDialog = (witness) => {
    setDialogWitness(witness);
  };

  const closeDialog = useCallback(() => {
    setDialogWitness(null);
  }, []);

  useEffect(() => {
    if (!dialogWitness) return;
    closeButtonRef.current?.focus();
  }, [dialogWitness]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') closeDialog();
    };
    if (dialogWitness) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [dialogWitness, closeDialog]);

  return (
    <section
      className="bg-white rounded-t-lg border-x border-t border-slate-300 p-6 shadow-sm"
      aria-label="Witnesses"
    >
      {/* Header – HCI: Clear hierarchy and context */}
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Witnesses</h2>
        <p className="text-sm text-slate-600 mt-1">View all witnesses and their case involvement</p>
      </header>

      {/* Search and filters – HCI: User control, explicit Apply */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="witness-search">Search witness by name</label>
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden />
          <input
            id="witness-search"
            type="search"
            placeholder="Search witness by name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-transparent"
            aria-label="Search witness by name"
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
            className="pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-transparent"
            aria-label="Select date"
          />
        </div>
        <label className="sr-only" htmlFor="filter-status">Filter by status</label>
        <div className="relative">
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-4 pr-8 py-2 border border-slate-300 rounded-md bg-white text-slate-800 text-sm focus:outline-none focus:border-transparent"
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
          <table className="w-full text-left text-sm" role="table" aria-label="Witness list">
            <thead className="bg-slate-100 text-slate-600 text-nowrap">
              <tr>
                <th scope="col" className="p-4 font-semibold uppercase text-[11px] tracking-wide">Witness ID</th>
                <th scope="col" className="p-4 font-semibold uppercase text-[11px] tracking-wide">Name</th>
                <th scope="col" className="p-4 font-semibold uppercase text-[11px] tracking-wide">Age / Gender</th>
                <th scope="col" className="p-4 font-semibold uppercase text-[11px] tracking-wide">Contact Info</th>
                <th scope="col" className="p-4 font-semibold uppercase text-[11px] tracking-wide">Date Added</th>
                <th scope="col" className="p-4 font-semibold uppercase text-[11px] tracking-wide">Witness Description</th>
                <th scope="col" className="p-4 font-semibold uppercase text-[11px] tracking-wide text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {pageWitnesses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No witnesses match your search. Try different filters.
                  </td>
                </tr>
              ) : (
                pageWitnesses.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-semibold text-slate-800 text-nowrap">{w.id}</td>
                    <td className="p-4 text-slate-800">{w.name}</td>
                    <td className="p-4 text-slate-700">{w.age} / {w.gender}</td>
                    <td className="p-4">
                      <a
                        href={`tel:${w.contact.replace(/\s/g, '')}`}
                        className="text-deep-ocean-500 hover:underline rounded"
                      >
                        {w.contact}
                      </a>
                    </td>
                    <td className="p-4 text-slate-700">{w.dateAdded}</td>
                    <td className="p-4 text-slate-700 max-w-xs">{w.description ? (<>
                      <div>
                        {w.description.length > 50
                          ? `${w.description.slice(0, 50)}...`
                          : w.description}
                      </div>

                      <Button
                        variant="default"
                        size="sm"
                        className="text-xs px-4 py-2 mt-3"
                      >
                        Update Statement
                      </Button>
                    </>) : (
                      <Button
                        variant="default"
                        size="sm"
                        className="text-xs px-4 py-2">
                        Add Statement</Button>
                    )}</td>
                    <td className="p-4 text-center">
                      <Button
                        className="inline-flex cursor-pointer items-center justify-center shadow-inner shadow-deep-ocean-900 gap-1.5 rounded-md text-xs font-medium px-3 py-2 bg-deep-ocean-500 hover:bg-deep-ocean-900 text-white transition-colors focus:outline-none"
                        onClick={() => openDialog(w)}
                        aria-label={`View full details for ${w.name}`}
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        View full witness details
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
            itemLabel="witnesses"
          />
        </div>
      )}

      {/* Full witness details dialog – HCI: Focus management, Escape to close */}
      {dialogWitness && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="witness-dialog-title"
          aria-describedby="witness-dialog-desc"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && closeDialog()}
        >
          <div className="absolute inset-0 bg-black/50" aria-hidden />
          <div
            className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h3 id="witness-dialog-title" className="text-lg font-bold text-slate-800">
                Witness Details – {dialogWitness.name}
              </h3>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeDialog}
                className="p-2 rounded-md  cursor-pointer text-slate-500 hover:bg-slate-blue hover:text-cool-silver focus:outline-none focus:ring-2"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div id="witness-dialog-desc" className="p-6 space-y-6">
              <section aria-labelledby="personal-heading">
                <h4 id="personal-heading" className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2">Personal Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm *:grid *:grid-cols-[1fr_2fr] *:gap-x-4">
                  <p><span className="font-semibold text-slate-700">Witness ID:</span> <span className="text-slate-500 font-medium">{dialogWitness.id}</span></p>
                  <p><span className="font-semibold text-slate-700">Name:</span> <span className="text-slate-500">{dialogWitness.name}</span></p>
                  <p><span className="font-semibold text-slate-700">Age:</span> <span className="text-slate-500">{dialogWitness.age}</span></p>
                  <p><span className="font-semibold text-slate-700">Gender:</span> <span className="text-slate-500">{dialogWitness.gender}</span></p>
                  <p><span className="font-semibold text-slate-700">Contact:</span>{' '}
                    <a href={`tel:${dialogWitness.contact.replace(/\s/g, '')}`} className="text-slate-500 hover:underline">{dialogWitness.contact}</a>
                  </p>
                  <p><span className="font-semibold text-slate-700">Address:</span> <span className="text-slate-500">{dialogWitness.address}</span></p>
                  <p className="sm:col-span-2"><span className="font-semibold text-slate-700">Relation to case:</span> <span className="text-slate-500">{dialogWitness.relationToCase}</span></p>
                </div>
              </section>
              <section aria-labelledby="case-heading">
                <h4 id="case-heading" className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2">Case & Status</h4>
                <div className="flex flex-wrap gap-2 text-sm">
                  <p><span className="font-semibold text-slate-700">Case ID:</span> <span className="text-slate-500 font-medium">{dialogWitness.caseId}</span></p>
                  <p><span className="font-semibold text-slate-700">Status:</span>{' '}
                    <Badge variant={dialogWitness.status === 'Active' ? 'success' : dialogWitness.status === 'Pending' ? 'warning' : 'default'} >
                      {dialogWitness.status}
                    </Badge>
                  </p>
                  <p><span className="font-semibold text-slate-700">Date added:</span> <span className="text-slate-500">{dialogWitness.dateAdded}</span></p>
                  <p><span className="font-semibold text-slate-700">Statement date:</span> <span className="text-slate-500">{dialogWitness.statementDate}</span></p>
                </div>
              </section>
              <section aria-labelledby="statement-heading">
                <h4 id="statement-heading" className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2">Witness Statement / Description</h4>
                <p className="text-slate-700 text-sm leading-relaxed">{dialogWitness.description}</p>
              </section>
            </div>
            <div className="sticky bottom-0 bg-slate-50  cursor-pointer border-t border-slate-200 px-6 py-4 flex justify-end">
              <Button onClick={closeDialog} className={'px-4 py-2'}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default CaseWitnesses;
