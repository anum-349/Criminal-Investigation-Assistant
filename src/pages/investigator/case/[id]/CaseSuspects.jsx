import { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import {
  Search, ChevronDown, Calendar, X, ExternalLink, Pencil, Users,
  Loader2, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';

import AddSuspectDialog from './forms/AddSuspect';
const PAGE_SIZE = 5;

// ─── Helpers ────────────────────────────────────────────────────────────────

const getAuthHeader = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Pick a Badge variant from a status label. Loose matching so any label
// the lookup table eventually contains still gets a sensible colour.
const getStatusVariant = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('confirmed')) return 'success';
  if (s.includes('detained') || s.includes('arrested')) return 'warning';
  if (s.includes('denies') || s.includes('cleared') || s.includes('released')) return 'default';
  return 'default';
};

// Adapt the row from GET /suspects → the shape StepSuspects expects.
// StepSuspects reads `name, cnic, age, gender, contact, address, occupation,
// status, reason, alibi, relationToCase, criminalRecord, arrested`.
// The list row already uses those field names — main thing we need is to
// give the form a stable React id (it uses `suspect.id` as a key inside
// the form), which already exists.
const rowToFormShape = (row) => {
  if (!row) return null;
  return {
    id:              row.id,                    // React key + suspect_id
    suspectId:       row.id,
    name:            row.name || '',
    cnic:            row.cnic || '',
    age:             row.age || '',
    gender:          row.gender || '',
    contact:         row.contact || '',
    address:         row.address || '',
    occupation:      row.occupation || '',
    status:          row.status || '',
    relationToCase:  row.relationToCase || '',
    reason:          row.reason || '',
    alibi:           row.alibi || '',
    criminalRecord:  !!row.criminalRecord,
    arrested:        !!row.arrested,
  };
};

// Pick only the fields the PATCH endpoint accepts.
const formShapeToPatchBody = (formItem) => ({
  name:            formItem?.name,
  cnic:            formItem?.cnic,
  age:             formItem?.age ? Number(formItem.age) : undefined,
  gender:          formItem?.gender,
  contact:         formItem?.contact,
  address:         formItem?.address,
  occupation:      formItem?.occupation,
  status:          formItem?.status,
  relationToCase:  formItem?.relationToCase,
  reason:          formItem?.reason,
  alibi:           formItem?.alibi,
  arrested:        formItem?.arrested,
  criminalRecord:  formItem?.criminalRecord,
});

// ─────────────────────────────────────────────────────────────────────────────

const CaseSuspects = () => {
  const { id: caseIdFromUrl } = useParams();
  const caseId = caseIdFromUrl || 'C-2053';   // graceful fallback

  // Filter inputs (live)
  const [searchName, setSearchName]     = useState('');
  const [dateFilter, setDateFilter]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Applied filters
  const [appliedFilters, setAppliedFilters] = useState({
    name: '', date: '', status: 'all',
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Server data
  const [items, setItems]               = useState([]);
  const [total, setTotal]               = useState(0);
  const [statusOptions, setStatusOptions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const requestSeq = useRef(0);

  // Dialog states
  const [dialogSuspect, setDialogSuspect] = useState(null);
  const [updateTarget, setUpdateTarget]   = useState(null);
  const [updating, setUpdating]           = useState(false);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  // ── Fetch ─────────────────────────────────────────────────────────────
  const fetchSuspects = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    const seq = ++requestSeq.current;

    try {
      const url = import.meta.env.VITE_API_URL;
      const res = await axios.get(
        `${url}/api/investigator/cases/${caseId}/suspects`,
        {
          headers: getAuthHeader(),
          params: {
            search: appliedFilters.name,
            status: appliedFilters.status,
            date: appliedFilters.date,
            page: currentPage,
            page_size: PAGE_SIZE,
          },
        },
      );
      if (seq !== requestSeq.current) return;
      setItems(res.data?.items || []);
      setTotal(res.data?.total || 0);
      setStatusOptions(res.data?.status_options || []);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.error('Failed to load suspects:', err);
      setError(err?.response?.data?.detail || 'Could not load suspects.');
      setItems([]);
      setTotal(0);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [caseId, appliedFilters, currentPage]);

  useEffect(() => { fetchSuspects(); }, [fetchSuspects]);

  // ── Filter handlers ───────────────────────────────────────────────────
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

  // ── Pagination derivations ────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);

  // ── Details dialog ────────────────────────────────────────────────────
  const openDialog = (suspect) => setDialogSuspect(suspect);
  const closeDialog = useCallback(() => setDialogSuspect(null), []);

  useEffect(() => {
    if (!dialogSuspect) return;
    closeButtonRef.current?.focus();
  }, [dialogSuspect]);

  useEffect(() => {
    const handleEscape = (e) => { if (e.key === 'Escape') closeDialog(); };
    if (dialogSuspect) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [dialogSuspect, closeDialog]);

  // ── Update dialog submit (PATCH) ──────────────────────────────────────
  const handleUpdateSubmit = async (data) => {
    const sid = updateTarget?.id;
    const first = data?.suspects?.[0];
    if (!sid || !first) {
      setUpdateTarget(null);
      return;
    }

    setUpdating(true);
    try {
      const url = import.meta.env.VITE_API_URL;
      const res = await axios.patch(
        `${url}/api/investigator/cases/${caseId}/suspects/${sid}`,
        formShapeToPatchBody(first),
        { headers: getAuthHeader() },
      );
      // Patch row in place
      setItems(curr => curr.map(it => it.id === sid ? res.data : it));
    } catch (err) {
      console.error('Update failed:', err);
      alert(`Update failed: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setUpdating(false);
      setUpdateTarget(null);
    }
  };

  // Combined status options for the filter dropdown — server values
  // plus the always-on "all" entry.
  const statusFilterOptions = [
    { value: 'all', label: 'All Statuses' },
    ...statusOptions.map(s => ({ value: s, label: s })),
  ];

  return (
    <section
      className="bg-white rounded-t-lg border-x border-t border-slate-300 p-6 shadow-sm"
      aria-label="Suspects"
    >
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Suspects</h2>
        <p className="text-sm text-slate-600 mt-1">View all suspects and their case involvement</p>
      </header>

      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="suspect-search">Search suspect by name</label>
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden />
          <input
            id="suspect-search"
            type="search"
            placeholder="Search by name, CNIC, or suspect ID"
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
            {statusFilterOptions.map((s) => (
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

      {/* Table */}
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
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                    Loading suspects…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No suspects match your search. Try different filters.
                  </td>
                </tr>
              ) : (
                items.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-semibold text-slate-800 text-nowrap">{s.id}</td>
                    <td className="p-4 text-slate-800">{s.name || '—'}</td>
                    <td className="p-4 text-slate-700">{s.reason || '—'}</td>
                    <td className="p-4 text-slate-700">
                      {s.alibi
                        ? (s.alibi.length > 50 ? `${s.alibi.slice(0, 50)}…` : s.alibi)
                        : '—'}
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant={getStatusVariant(s.status)}>{s.status}</Badge>
                    </td>
                    <td className="p-4 text-slate-700">{s.relationToCase || '—'}</td>
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

      {!loading && total > 0 && (
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

      {/* Details dialog */}
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
                      <Badge variant={getStatusVariant(dialogSuspect.status)}>
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

              <section aria-labelledby="reason-heading">
                <h4 id="reason-heading" className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2 pb-1 border-b border-slate-100">
                  Reason for Suspicion
                </h4>
                <p className="text-slate-700 text-sm leading-relaxed bg-amber-50/50 border border-amber-100 rounded-lg p-3">
                  {dialogSuspect.reason || <span className="text-slate-400 italic">No reason documented yet.</span>}
                </p>
              </section>

              <section aria-labelledby="statement-heading">
                <h4 id="statement-heading" className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2 pb-1 border-b border-slate-100">
                  Alibi / Statement
                </h4>
                <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3">
                  {dialogSuspect.alibi || <span className="text-slate-400 italic">No statement recorded yet.</span>}
                </p>
              </section>

              <section aria-labelledby="description-heading">
                <h4 id="description-heading" className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2 pb-1 border-b border-slate-100">
                  Physical Description
                </h4>
                <p className="text-slate-700 text-sm leading-relaxed">
                  {dialogSuspect.physicalDescription || <span className="text-slate-400 italic">No physical description on file.</span>}
                </p>
              </section>

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

              <section aria-labelledby="notes-heading">
                <h4 id="notes-heading" className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2 pb-1 border-b border-slate-100">
                  Additional Notes
                </h4>
                <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3">
                  {dialogSuspect.notes || <span className="text-slate-400 italic">No additional notes.</span>}
                </p>
              </section>
            </div>

            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end">
              <Button onClick={closeDialog} className={'px-4 py-2'}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Update dialog (reuses AddSuspectDialog with adapted initialData) */}
      <AddSuspectDialog
        isOpen={!!updateTarget}
        onClose={() => !updating && setUpdateTarget(null)}
        caseId={caseId}
        initialData={rowToFormShape(updateTarget)}
        onSubmit={handleUpdateSubmit}
      />
    </section>
  );
};

export default CaseSuspects;