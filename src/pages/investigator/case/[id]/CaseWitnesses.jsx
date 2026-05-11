import { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import {
  Search, ChevronDown, Calendar, X, ExternalLink, Pencil,
  CheckCircle2, Shield, EyeOff, AlertTriangle, User,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';

import AddWitnessDialog from './forms/AddWitness';
import { updateWitness, formatApiError } from '@/services/witnessApi';

const PAGE_SIZE = 5;

// ─── Helpers ────────────────────────────────────────────────────────────────

const getAuthHeader = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Adapt a row from GET /witnesses → the shape StepWitnesses expects.
// StepWitnesses uses these flat field names directly, so the mapping is
// mostly identity. The dialog also reads `caseId` to display in its header.
const rowToFormShape = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    witnessId: row.id,
    caseId: row.caseId || '',

    // Person
    name: row.name || '',
    cnic: row.cnic || '',
    age: row.age || '',
    gender: row.gender || '',
    contact: row.contact || '',
    address: row.address || '',

    // Classification
    witnessType: row.witnessType || '',
    relationToCase: row.relationToCase || '',
    credibility: row.credibility || '',

    // Statement
    statementDate: row.statementDate || '',
    statementRecordedBy: row.statementRecordedBy || '',
    description: row.description || '',

    // Status & flags
    status: row.status || 'Active',
    anonymous: !!row.anonymous,
    protectionRequired: !!row.protectionRequired,
    cooperating: row.cooperating !== false,

    // Read-only display fields (StepWitnesses ignores extras)
    dateAdded: row.dateAdded || '',
    photoUrl: row.photoUrl
      ? [{ existingPhotoId: "server", name: "photo", dataUrl: row.photoUrl }]
      : null,
    _hadPhoto: !!row.photoUrl,
  };
};

// Pretty-print YYYY-MM-DD for the table column.
const fmtDate = (s) => {
  if (!s) return '';
  // ISO date passed straight through; the backend already formats it.
  return s;
};

const STATUSES = [
  { value: 'all', label: 'All Witnesses' },
  { value: 'EYEWITNESS', label: 'Eyewitness' },
  { value: 'EARWITNESS', label: 'Earwitness' },
  { value: 'CHARACTER', label: 'Character Witness' },
  { value: 'EXPERT', label: 'Expert Witness' },
  { value: 'VICTIM_WITNESS', label: 'Victim-Witness' },
  { value: 'HEARSAY', label: 'Hearsay Witness' },
  { value: 'OTHER', label: 'Other' },
];

// ─── Component ──────────────────────────────────────────────────────────────

const CaseWitnesses = () => {
  const { id: caseIdFromUrl } = useParams();
  const caseId = caseIdFromUrl || 'C-2053';

  // Filter inputs (live)
  const [searchName, setSearchName] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Applied filters (what the server is using right now)
  const [appliedFilters, setAppliedFilters] = useState({
    name: '', date: '', status: 'all',
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Server data
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestSeq = useRef(0);

  // Dialog state
  const [dialogWitness, setDialogWitness] = useState(null); // View Details dialog
  const [updateTarget, setUpdateTarget] = useState(null); // pre-filled form data
  const [updating, setUpdating] = useState(false);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  // ── Fetch ─────────────────────────────────────────────────────────────
  const fetchWitnesses = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    const seq = ++requestSeq.current;

    try {
      const url = import.meta.env.VITE_API_URL;
      const res = await axios.get(
        `${url}/api/investigator/cases/${caseId}/witnesses`,
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
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.error('Failed to load witnesses:', err);
      setError(err?.response?.data?.detail || 'Could not load witnesses.');
      setItems([]);
      setTotal(0);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [caseId, appliedFilters, currentPage]);

  useEffect(() => { fetchWitnesses(); }, [fetchWitnesses]);

  console.log("witness: ", items[0])
  // ── Filter handlers ──────────────────────────────────────────────────
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

  // ── Pagination derivations ───────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);

  // ── View Details dialog ──────────────────────────────────────────────
  const openDialog = (w) => setDialogWitness(w);
  const closeDialog = useCallback(() => setDialogWitness(null), []);

  useEffect(() => {
    if (!dialogWitness) return;
    closeButtonRef.current?.focus();
  }, [dialogWitness]);

  useEffect(() => {
    const handleEscape = (e) => { if (e.key === 'Escape') closeDialog(); };
    if (dialogWitness) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [dialogWitness, closeDialog]);

  const handleUpdateSubmit = async (data) => {
    const wid = updateTarget?.id;
    const first = data?.witnesses?.[0];
    if (!wid || !first) { setUpdateTarget(null); return; }

    setUpdating(true);
    try {
      const { detail, photo_failures } = await updateWitness(caseId, wid, first);

      // Patch the row in place
      setItems(curr => curr.map(it => it.id === wid ? detail : it));

      if (photo_failures?.length) {
        console.warn('Photo upload failed:', photo_failures);
      }
    } catch (err) {
      console.error('Update failed:', err);
      alert(`Update failed: ${formatApiError(err)}`);
    } finally {
      setUpdating(false);
      setUpdateTarget(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <section
      className="bg-white rounded-t-lg border-x border-t border-slate-300 p-6 shadow-sm"
      aria-label="Witnesses"
    >
      {/* Header */}
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Witnesses</h2>
        <p className="text-sm text-slate-600 mt-1">View all witnesses and their case involvement</p>
      </header>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="witness-search">Search witness by name</label>
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden />
          <input
            id="witness-search"
            type="search"
            placeholder="Search witness by name, ID, or statement"
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

      {/* Error banner */}
      {error && !loading && (
        <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Could not load witnesses</p>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
          <button
            onClick={fetchWitnesses}
            className="text-xs font-semibold text-red-600 hover:text-red-800 cursor-pointer px-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
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
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center">
                    <Loader2 className="h-5 w-5 animate-spin inline-block mr-2 text-slate-400" />
                    <span className="text-sm text-slate-500">Loading witnesses…</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    {appliedFilters.name || appliedFilters.date || appliedFilters.status !== 'all'
                      ? 'No witnesses match your search. Try different filters.'
                      : 'No witnesses linked to this case yet.'}
                  </td>
                </tr>
              ) : (
                items.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-semibold text-slate-800 text-nowrap">{w.id}</td>
                    <td className="p-4 text-slate-800">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        {w.photoUrl ? (
                          <img
                            src={w.photoUrl.startsWith('/uploads')
                              ? `${import.meta.env.VITE_API_URL}${w.photoUrl}`
                              : w.photoUrl}
                            alt={w.anonymous ? "Witness" : w.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-slate-400" />
                          </div>
                        )}
                        {/* Name */}
                        {w.anonymous
                          ? <span className="italic text-slate-400">Anonymous</span>
                          : (w.name || '—')}
                      </div>
                    </td>
                    <td className="p-4 text-slate-700">
                      {(w.age || '—')} / {w.gender || '—'}
                    </td>
                    <td className="p-4">
                      {w.anonymous || !w.contact ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <a
                          href={`tel:${w.contact.replace(/\s/g, '')}`}
                          className="text-deep-ocean-500 hover:underline rounded"
                        >
                          {w.contact}
                        </a>
                      )}
                    </td>
                    <td className="p-4 text-slate-700">{fmtDate(w.dateAdded)}</td>
                    <td className="p-4 text-slate-700 max-w-xs">
                      {w.description ? (
                        <div>
                          {w.description.length > 50
                            ? `${w.description.slice(0, 50)}...`
                            : w.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="p-4 text-center grid grid-rows-2">
                      <Button
                        variant="default"
                        className="px-4 py-2 mb-2"
                        onClick={() => openDialog(w)}
                        aria-label={`View full details for ${w.id}`}
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-2" aria-hidden />
                        View details
                      </Button>
                      <Button
                        variant="outline"
                        className="px-4 py-2"
                        onClick={() => setUpdateTarget(rowToFormShape(w))}
                        disabled={updating}
                        aria-label={`Update witness ${w.id}`}
                      >
                        {updating ? (
                          <Loader2 className="h-3.5 w-3.5 mr-3 animate-spin" />
                        ) : (
                          <Pencil className="h-3.5 w-3.5 mr-3" aria-hidden />
                        )}
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
            itemLabel="witnesses"
          />
        </div>
      )}    

      {/* View Details dialog */}
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
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="rounded-full bg-slate-700 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {dialogWitness.photoUrl ? (
                    <img
                      src={dialogWitness.photoUrl.startsWith('/uploads')
                        ? `${import.meta.env.VITE_API_URL}${dialogWitness.photoUrl}`
                        : dialogWitness.photoUrl}
                      alt={dialogWitness.anonymous ? "Witness" : dialogWitness.name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-sm font-bold shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 id="witness-dialog-title" className="text-lg font-bold text-slate-800 truncate">
                    {dialogWitness.anonymous
                      ? "Witness Details — Anonymous"
                      : `Witness Details — ${dialogWitness.name || "Unnamed"}`}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {dialogWitness.id || "—"}
                  </p>
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

            {/* Status / Flag chips strip */}
            <div className="px-6 pt-4 flex flex-wrap gap-2">
              <Badge
                variant={
                  dialogWitness.status === 'Active' ? 'success'
                    : dialogWitness.status === 'Pending' ? 'warning'
                      : 'default'
                }
              >
                {dialogWitness.status || '—'}
              </Badge>
              {dialogWitness.anonymous && (
                <span className="text-[11px] inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 font-medium">
                  <EyeOff className="h-3 w-3" /> Anonymous
                </span>
              )}
              {dialogWitness.protectionRequired && (
                <span className="text-[11px] inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-700 font-medium">
                  <Shield className="h-3 w-3" /> Protection Required
                </span>
              )}
              {dialogWitness.cooperating !== false && (
                <span className="text-[11px] inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Cooperating
                </span>
              )}
              {dialogWitness.cooperating === false && (
                <span className="text-[11px] inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-slate-200 bg-slate-100 text-slate-600 font-medium">
                  <AlertTriangle className="h-3 w-3" /> Not Cooperating
                </span>
              )}
            </div>

            <div id="witness-dialog-desc" className="p-6 space-y-6">

              {/* Personal Information */}
              <section aria-labelledby="witness-personal-heading">
                <h4 id="witness-personal-heading" className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3 pb-1 border-b border-slate-100">
                  Personal Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm *:grid *:grid-cols-[1fr_2fr] *:gap-x-4">
                  <p>
                    <span className="font-semibold text-slate-700">Witness ID:</span>
                    <span className="text-slate-500 font-mono text-xs">{dialogWitness.id || '—'}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Name:</span>
                    <span className="text-slate-500">
                      {dialogWitness.anonymous
                        ? <span className="italic text-slate-400">Hidden</span>
                        : (dialogWitness.name || '—')}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Age:</span>
                    <span className="text-slate-500">{dialogWitness.age || '—'}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Gender:</span>
                    <span className="text-slate-500">{dialogWitness.gender || '—'}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Contact:</span>
                    {dialogWitness.anonymous ? (
                      <span className="italic text-slate-400">Hidden</span>
                    ) : dialogWitness.contact ? (
                      <a
                        href={`tel:${dialogWitness.contact.replace(/\s/g, '')}`}
                        className="text-slate-500 hover:underline"
                      >
                        {dialogWitness.contact}
                      </a>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Address:</span>
                    <span className="text-slate-500">
                      {dialogWitness.anonymous
                        ? <span className="italic text-slate-400">Hidden</span>
                        : (dialogWitness.address || '—')}
                    </span>
                  </p>
                </div>
              </section>

              {/* Classification */}
              <section aria-labelledby="witness-classification-heading">
                <h4 id="witness-classification-heading" className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3 pb-1 border-b border-slate-100">
                  Classification
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm *:grid *:grid-cols-[1fr_2fr] *:gap-x-4">
                  <p>
                    <span className="font-semibold text-slate-700">Witness Type:</span>
                    <span className="text-slate-500">{dialogWitness.witnessType || '—'}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Relation to Case:</span>
                    <span className="text-slate-500">{dialogWitness.relationToCase || '—'}</span>
                  </p>
                  <p className="sm:col-span-2">
                    <span className="font-semibold text-slate-700">Credibility Assessment:</span>
                    <span className="text-slate-500">{dialogWitness.credibility || '—'}</span>
                  </p>
                </div>
              </section>

              {/* Case & Statement Details */}
              <section aria-labelledby="witness-case-heading">
                <h4 id="witness-case-heading" className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3 pb-1 border-b border-slate-100">
                  Case & Statement Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm *:grid *:grid-cols-[1fr_2fr] *:gap-x-4">
                  <p>
                    <span className="font-semibold text-slate-700">Case ID:</span>
                    <span className="text-slate-500 font-mono text-xs">{dialogWitness.caseId || '—'}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Status:</span>
                    <span>
                      <Badge
                        variant={
                          dialogWitness.status === 'Active' ? 'success'
                            : dialogWitness.status === 'Pending' ? 'warning'
                              : 'default'
                        }
                        size="sm"
                      >
                        {dialogWitness.status || '—'}
                      </Badge>
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Date Added:</span>
                    <span className="text-slate-500">{dialogWitness.dateAdded || '—'}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Statement Date:</span>
                    <span className="text-slate-500">{dialogWitness.statementDate || '—'}</span>
                  </p>
                  <p className="sm:col-span-2">
                    <span className="font-semibold text-slate-700">Statement Recorded By:</span>
                    <span className="text-slate-500">{dialogWitness.statementRecordedBy || '—'}</span>
                  </p>
                </div>
              </section>

              {/* Witness Statement */}
              <section aria-labelledby="witness-statement-heading">
                <h4 id="witness-statement-heading" className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2 pb-1 border-b border-slate-100">
                  Witness Statement / Description
                </h4>
                <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3 whitespace-pre-wrap">
                  {dialogWitness.description || (
                    <span className="text-slate-400 italic">No statement on file.</span>
                  )}
                </p>
              </section>

              {/* Privacy & Safety Flags */}
              <section aria-labelledby="witness-flags-heading">
                <h4 id="witness-flags-heading" className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3 pb-1 border-b border-slate-100">
                  Privacy & Safety
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className={`p-3 rounded-lg border ${dialogWitness.anonymous
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-slate-50 border-slate-200'}`}>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                      <EyeOff className="h-3 w-3" /> Anonymous
                    </p>
                    <p className={`text-sm font-semibold mt-1 ${dialogWitness.anonymous ? 'text-amber-700' : 'text-slate-600'}`}>
                      {dialogWitness.anonymous ? 'Yes — identity hidden' : 'No'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg border ${dialogWitness.protectionRequired
                    ? 'bg-red-50 border-red-200'
                    : 'bg-slate-50 border-slate-200'}`}>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                      <Shield className="h-3 w-3" /> Protection
                    </p>
                    <p className={`text-sm font-semibold mt-1 ${dialogWitness.protectionRequired ? 'text-red-700' : 'text-slate-600'}`}>
                      {dialogWitness.protectionRequired ? 'Required' : 'Not required'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg border ${dialogWitness.cooperating !== false
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-slate-50 border-slate-200'}`}>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3" /> Cooperation
                    </p>
                    <p className={`text-sm font-semibold mt-1 ${dialogWitness.cooperating !== false ? 'text-emerald-700' : 'text-slate-600'}`}>
                      {dialogWitness.cooperating !== false ? 'Cooperating' : 'Not cooperating'}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end">
              <Button onClick={closeDialog} className="px-4 py-2">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}


      {/* Update dialog */}
      <AddWitnessDialog
        isOpen={!!updateTarget}
        onClose={() => setUpdateTarget(null)}
        caseId={caseId}
        initialData={updateTarget}
        onSubmit={handleUpdateSubmit}
      />
    </section>
  );
};

export default CaseWitnesses;