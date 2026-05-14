import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
    FolderOpen, LayoutDashboard,
    Loader2, AlertTriangle, ChevronDown, CheckCircle2,
} from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import Header from '@/components/Header';

import CaseTimeline from '@/pages/investigator/case/[id]/CaseTimeline';
import CaseVictim from '@/pages/investigator/case/[id]/CaseVictims';
import CaseEvidence from '@/pages/investigator/case/[id]/CaseEvidence';
import CaseWitnesses from '@/pages/investigator/case/[id]/CaseWitnesses';
import CaseSuspects from '@/pages/investigator/case/[id]/CaseSuspects';
import CaseInvestigationLeads from '@/pages/investigator/case/[id]/CaseLeads';
import LinkedCases from '@/pages/investigator/case/[id]/CaseLinkedCases';
import CaseLocation from '@/pages/investigator/case/[id]/CaseLocation';
import AddEvidenceDialog from '@/pages/investigator/case/[id]/forms/AddEvidence';
import AddSuspectDialog from '@/pages/investigator/case/[id]/forms/AddSuspect';
import AddVictimDialog from '@/pages/investigator/case/[id]/forms/AddVictim';
import AddWitnessDialog from '@/pages/investigator/case/[id]/forms/AddWitness';
import { addEvidencesToCase, formatApiError } from "@/services/evidenceApi";
import { addVictimsToCase } from '@/services/victimApi';
import { addWitnessesToCase } from '@/services/witnessApi';
import { addSuspectsToCase } from "@/services/suspectApi";
import { useToast } from '@/context/ToastContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getAuthHeader = () => {
    const token =
        localStorage.getItem('token') || sessionStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── Header status badge styling ─────────────────────────────────────────────

const getSeverityBadgeVariant = (label) => {
    const s = (label || '').toLowerCase();
    if (s === 'critical') return 'destructive';
    if (s === 'high') return 'warning';
    if (s === 'medium') return 'default';
    return 'default';
};

const getStatusPillClass = (label) => {
    const s = (label || '').toLowerCase();
    if (s.includes('closed') || s.includes('solved')) return 'bg-slate-500';
    if (s.includes('pending')) return 'bg-amber-500';
    return 'bg-forest-teal';
};

// ─── Static case status list ──────────────────────────────────────────────────
// Mirrors lkp_case_statuses exactly. No API call needed — codes are stable.
// is_terminal=true means the case is closed and the backend will lock further changes.

const CASE_STATUSES = [
    { code: 'OPEN',               label: 'Open',               is_terminal: false },
    { code: 'UNDER_INVESTIGATION',label: 'Under Investigation', is_terminal: false },
    { code: 'ACTIVE',             label: 'Active',             is_terminal: false },
    { code: 'PENDING',            label: 'Pending',            is_terminal: false },
    { code: 'COLD_CASE',          label: 'Cold Case',          is_terminal: false },
    { code: 'CLOSED',             label: 'Closed',             is_terminal: true  },
    { code: 'ARCHIVED',           label: 'Archived',           is_terminal: true  },
];

const getDotClass = (code) => {
    if (code === 'CLOSED' || code === 'ARCHIVED') return 'bg-slate-400';
    if (code === 'PENDING')                        return 'bg-amber-400';
    return 'bg-forest-teal';
};

// ─── Status Update Dropdown ───────────────────────────────────────────────────

const StatusUpdateDropdown = ({ caseId, currentStatus, onStatusUpdated }) => {
    const [open,     setOpen]     = useState(false);
    const [updating, setUpdating] = useState(false);
    const ref   = useRef(null);
    const toast = useToast();

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = async (s) => {
        // Ignore clicks on the already-active status
        if (s.label === currentStatus) { setOpen(false); return; }
        setUpdating(true);
        setOpen(false);
        try {
            const url = import.meta.env.VITE_API_URL;
            await axios.patch(
                `${url}/api/investigator/cases/${caseId}/status`,
                { status_code: s.code },   // send code — backend resolves to id
                { headers: getAuthHeader() },
            );
            toast.success(`Status updated to "${s.label}"`);
            onStatusUpdated(s.label);
        } catch (err) {
            console.error('Status update failed:', err);
            const detail = err?.response?.data?.detail || 'Failed to update status.';
            toast.error(`Update failed: ${detail}`);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="relative" ref={ref}>
            {/* Trigger pill */}
            <button
                onClick={() => !updating && setOpen(o => !o)}
                disabled={updating}
                title="Update case status"
                className={`
                    inline-flex items-center gap-1.5 pl-3 pr-2 py-0.5 rounded-full text-xs font-medium
                    text-white transition-all select-none
                    ${updating ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:brightness-110 active:scale-95'}
                    ${getStatusPillClass(currentStatus)}
                `}
            >
                {updating
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <>
                        {currentStatus || '—'}
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
                      </>
                }
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute left-0 top-full mt-1.5 z-50 w-52 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
                    <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                        Update Status
                    </p>
                    <ul className="py-1">
                        {CASE_STATUSES.map((s) => {
                            const isCurrent = s.label === currentStatus;
                            return (
                                <li key={s.code}>
                                    <button
                                        onClick={() => handleSelect(s)}
                                        disabled={isCurrent}
                                        className={`
                                            w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors
                                            ${isCurrent
                                                ? 'bg-slate-50 text-slate-400 cursor-default'
                                                : 'text-slate-700 hover:bg-deep-ocean-50 hover:text-deep-ocean-700 cursor-pointer'}
                                        `}
                                    >
                                        <span className="flex items-center gap-2">
                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getDotClass(s.code)}`} />
                                            {s.label}
                                            {s.is_terminal && (
                                                <span className="text-[10px] text-slate-400 font-medium">(terminal)</span>
                                            )}
                                        </span>
                                        {isCurrent && <CheckCircle2 className="h-3.5 w-3.5 text-forest-teal shrink-0" />}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};

// ═════════════════════════════════════════════════════════════════════════════
// CasePage
// ═════════════════════════════════════════════════════════════════════════════

const CasePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const caseId = id;

    const [header, setHeader] = useState(null);
    const [stats, setStats] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const toast = useToast();

    const [activeTab, setActiveTab] = useState('timeline');

    const [showAddEvidence, setShowAddEvidence] = useState(false);
    const [showAddSuspect, setShowAddSuspect] = useState(false);
    const [showAddVictim, setShowAddVictim] = useState(false);
    const [showAddWitness, setShowAddWitness] = useState(false);

    useEffect(() => {
        if (!caseId) return;

        const fetchCase = async () => {
            setLoading(true);
            setLoadError(null);
            try {
                const url = import.meta.env.VITE_API_URL;
                const res = await axios.get(
                    `${url}/api/investigator/cases/${caseId}`,
                    { headers: getAuthHeader() }
                );
                setHeader(res.data.header);
                setStats(res.data.stats);
                setEvents(res.data.timeline || []);
            } catch (err) {
                console.error('Failed to load case:', err);
                if (err?.response?.status === 404) {
                    setLoadError('not_found');
                } else if (err?.response?.status === 403) {
                    setLoadError('forbidden');
                } else {
                    setLoadError(err?.response?.data?.detail || 'Could not load case.');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchCase();
    }, [caseId]);

    // ── Called by StatusUpdateDropdown after a successful PATCH ────────────
    const handleStatusUpdated = useCallback((newStatusLabel) => {
        setHeader(prev => prev ? { ...prev, status: newStatusLabel } : prev);
    }, []);

    const handleAddTimelineEvent = useCallback(async (ev) => {
        try {
            const url = import.meta.env.VITE_API_URL;
            const body = {
                eventType: ev.eventType,
                title: ev.title,
                description: ev.description,
                date: ev.date,
                time: ev.time,
                location: ev.location || null,
                officerName: ev.officerName || null,
                outcome: ev.outcome || null,
                severity: ev.severity || "Normal",
                attachmentNote: ev.attachmentNote || null,
                followUpRequired: !!ev.followUpRequired,
                followUpDate: ev.followUpDate || null,
            };
            const res = await axios.post(
                `${url}/api/investigator/cases/${caseId}/timeline`,
                body,
                { headers: getAuthHeader() },
            );
            const created = res.data;
            if (created?.id) setEvents(curr => [created, ...curr]);
            toast.success(`Timeline event added to ${caseId}`);
            return created;
        } catch (err) {
            console.error('Add timeline failed:', err);
            const detail = err?.response?.data?.detail || err.message || 'Failed to save event.';
            toast.error(`Save failed: ${detail}`);
            throw err;
        }
    }, [caseId]);

    const handleDeleteTimelineEvent = useCallback(async (id) => {
        try {
            const url = import.meta.env.VITE_API_URL;
            await axios.delete(
                `${url}/api/investigator/cases/${caseId}/timeline/${id}`,
                { headers: getAuthHeader() },
            );
            setEvents(curr => curr.filter(e => e.id !== id));
            toast.success(`Timeline event ${id} deleted`);
        } catch (err) {
            console.error('Delete timeline failed:', err);
            const detail = err?.response?.data?.detail || err.message || 'Failed to delete event.';
            toast.error(`Delete failed: ${detail}`);
            throw err;
        }
    }, [caseId]);

    const handleAddSuspectSubmit = async (data) => {
        const list = data?.suspects || [];
        if (!list.length) return { ok: false, error: "No suspect items to submit." };
        try {
            const result = await addSuspectsToCase(caseId, list);
            const count = result.created_ids?.length || 0;
            if (result.timeline_events?.length) setEvents(curr => [...result.timeline_events, ...curr]);
            toast.success(`Added ${count} suspect${count === 1 ? "" : "s"} to ${caseId}`);
            setStats(curr => curr && ({ ...curr, suspects: curr.suspects + (result.created_ids?.length || 0) }));
            if (result.photo_failures?.length) console.warn("Photo(s) failed:", result.photo_failures);
            setShowAddSuspect(false);
            return { ok: true, ...result };
        } catch (err) {
            console.error("Add suspects failed:", err);
            return { ok: false, error: formatApiError(err, "Failed to add suspects.") };
        }
    };

    const handleAddEvidenceSubmit = async (data) => {
        const list = data?.evidences || [];
        if (!list.length) return { ok: false, error: "No evidence items to submit." };
        try {
            const result = await addEvidencesToCase(caseId, list);
            if (result.timeline_events?.length) setEvents(curr => [...result.timeline_events, ...curr]);
            setStats(curr => curr && ({ ...curr, evidence_collected: curr.evidence_collected + (result.created_ids?.length || 0) }));
            const n = result.created_ids?.length || 0;
            toast.success(`Added ${n} evidence item${n === 1 ? "" : "s"} to ${caseId}`);
            setShowAddEvidence(false);
            return { ok: true, created_ids: result.created_ids, photo_failures: result.photo_failures };
        } catch (err) {
            console.error("Add evidence failed:", err);
            const detail = formatApiError(err, "Failed to save evidence.");
            toast.error(`Save failed: ${detail}`);
            return { ok: false, error: detail };
        }
    };

    const handleAddVictimSubmit = async (data) => {
        const list = data?.victims || [];
        if (!list.length) return { ok: false, error: "No victim items to submit." };
        try {
            const result = await addVictimsToCase(caseId, list);
            if (result.timeline_events?.length) setEvents(curr => [...result.timeline_events, ...curr]);
            setStats(curr => curr && ({ ...curr, victims: curr.victims + (result.created_ids?.length || 0) }));
            const n = result.created_ids?.length || 0;
            toast.success(`Added ${n} victim${n === 1 ? "" : "s"} to ${caseId}`);
            setShowAddVictim(false);
            return { ok: true, created_ids: result.created_ids, photo_failures: result.photo_failures };
        } catch (err) {
            console.error("Add Victim failed:", err);
            const detail = formatApiError(err, "Failed to save victim.");
            toast.error(`Save failed: ${detail}`);
            return { ok: false, error: detail };
        }
    };

    const handleAddWitnessSubmit = async (data) => {
        const list = data?.witnesses || [];
        if (!list.length) return { ok: false, error: "No witness items to submit." };
        try {
            const result = await addWitnessesToCase(caseId, list);
            const count = result.created_ids?.length || 0;
            if (result.timeline_events?.length) setEvents(curr => [...result.timeline_events, ...curr]);
            toast.success(`Added ${count} witness${count === 1 ? "" : "es"} to ${caseId}`);
            if (result.photo_failures?.length) console.warn(`Photo(s) failed:`, result.photo_failures);
            setShowAddWitness(false);
            return { ok: true, ...result };
        } catch (err) {
            console.error('Add witnesses failed:', err);
            const detail = formatApiError(err, "Failed to save witness.");
            toast.error(`Save failed: ${detail}`);
            return { ok: false, error: formatApiError(err, 'Failed to add witnesses.') };
        }
    };

    // ─── Loading / error states ───────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-14">
                <Header />
                <div className="flex items-center justify-center py-32 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-3" />
                    Loading case {caseId}…
                </div>
            </div>
        );
    }

    if (loadError === 'not_found') {
        return (
            <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-14">
                <Header />
                <div className="max-w-xl mx-auto py-32 text-center">
                    <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-amber-500" />
                    <h1 className="text-xl font-bold">Case not found</h1>
                    <p className="text-sm text-muted-foreground mt-2">
                        We couldn't find a case with ID <span className="font-mono font-semibold">{caseId}</span>.
                    </p>
                    <button
                        onClick={() => navigate('/investigator/cases')}
                        className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-deep-ocean-500 text-white text-sm cursor-pointer"
                    >
                        Back to All Cases
                    </button>
                </div>
            </div>
        );
    }

    if (loadError === 'forbidden') {
        return (
            <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-14">
                <Header />
                <div className="max-w-xl mx-auto py-32 text-center">
                    <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-red-500" />
                    <h1 className="text-xl font-bold">Access denied</h1>
                    <p className="text-sm text-muted-foreground mt-2">This case is assigned to another investigator.</p>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-14">
                <Header />
                <div className="max-w-xl mx-auto py-32 text-center">
                    <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-red-500" />
                    <p className="text-sm text-red-700">{loadError}</p>
                </div>
            </div>
        );
    }

    const STATS_TILES = stats ? [
        `Evidence Collected: ${stats.evidence_collected}`,
        `Suspects: ${stats.suspects}`,
        `Investigation Leads: ${stats.investigation_leads}`,
        `Victims: ${stats.victims}`,
        `Days Open: ${stats.days_open}`,
    ] : [];

    return (
        <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-14">
            <Header />

            {/* Case Header */}
            <header className="bg-cool-silver p-6 border-b border-slate-300">
                <div className="flex justify-between items-start">
                    <div>
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 mb-1">
                            <button
                                onClick={() => navigate('/investigator')}
                                className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <LayoutDashboard className="h-3.5 w-3.5" />
                                Dashboard
                            </button>
                            <span className="text-muted-foreground text-xs">/</span>
                            <button
                                onClick={() => navigate('/investigator/cases')}
                                className="flex items-center gap-1.5 text-xs cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <FolderOpen className="h-3.5 w-3.5" />
                                All Cases
                            </button>
                            <span className="text-muted-foreground text-xs">/</span>
                            <span className="text-xs font-medium text-foreground">{caseId}</span>
                        </div>

                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Case ID: {header?.id || caseId}
                        </p>
                        <h1 className="text-2xl font-bold mt-1">{header?.title || '—'}</h1>
                        <p className="text-sm text-slate-600 mt-1">
                            Assigned: {header?.investigator || '—'}
                        </p>

                        {/* Status badges row — status pill is now interactive */}
                        <div className="flex items-center gap-2 mt-3">
                            {/* ↓ Replaced plain status pill with the dropdown */}
                            <StatusUpdateDropdown
                                caseId={caseId}
                                currentStatus={header?.status}
                                onStatusUpdated={handleStatusUpdated}
                            />
                            <Badge variant={getSeverityBadgeVariant(header?.severity)}>
                                {header?.severity || '—'}
                            </Badge>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col items-end gap-3">
                        <div className="grid grid-cols-2 lg:grid-cols-4 *:cursor-pointer gap-2 *:bg-deep-ocean-500 *:text-white *:px-4 *:py-1.5 *:rounded *:text-xs *:font-medium *:hover:bg-slate-700 *:transition *:shadow-inner *:shadow-deep-ocean-900">
                            <button onClick={() => setShowAddEvidence(true)}>Add Evidence</button>
                            <button onClick={() => setShowAddSuspect(true)}>Add Suspect</button>
                            <button onClick={() => setShowAddVictim(true)}>Add Victim</button>
                            <button onClick={() => setShowAddWitness(true)}>Add Witness</button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="px-6 py-6">
                {/* Stats / overview */}
                <section className="bg-white rounded-lg shadow-sm p-6 border border-slate-200 mb-6 space-y-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-2">Case Overview</h2>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                            {header?.description || '—'}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {STATS_TILES.map((stat, i) => (
                            <div
                                key={i}
                                className="bg-deep-ocean-500 shadow-inner shadow-deep-ocean-900/60 text-white p-3 rounded text-center text-sm font-medium"
                            >
                                {stat}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mt-8 mb-6">
                    {['Timeline', 'Victims', 'Evidences', 'Witnesses', 'Suspects', 'Leads', 'Linked Cases', 'Location'].map((tab) => {
                        const tabKey = tab.toLowerCase();
                        const isActive = activeTab === tabKey;
                        const showNewDot = tabKey === 'timeline' && toast && activeTab !== 'timeline';
                        return (
                            <button
                                key={tab}
                                className={`relative cursor-pointer px-6 py-1.5 rounded-full shadow-inner text-xs font-semibold transition-all
                                    ${isActive
                                        ? 'bg-deep-ocean-500 shadow-deep-ocean-900/60 text-white scale-105'
                                        : 'bg-slate-blue shadow-deep-ocean text-white opacity-80 hover:opacity-100'}`}
                                onClick={() => setActiveTab(tabKey)}
                            >
                                {tab}
                                {showNewDot && (
                                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white animate-pulse" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Active tab content */}
                {activeTab === 'timeline' ? (
                    <CaseTimeline
                        caseId={caseId}
                        events={events}
                        onAddEvent={handleAddTimelineEvent}
                        onDeleteEvent={handleDeleteTimelineEvent}
                    />
                ) : activeTab === 'victims' ? <CaseVictim />
                    : activeTab === 'evidences' ? <CaseEvidence />
                        : activeTab === 'witnesses' ? <CaseWitnesses />
                            : activeTab === 'suspects' ? <CaseSuspects />
                                : activeTab === 'leads' ? <CaseInvestigationLeads caseId={caseId} />
                                    : activeTab === 'linked cases' ? <LinkedCases />
                                        : activeTab === 'location' ? <CaseLocation />
                                            : null}
            </main>

            {/* ── Dialogs ───────────────────────────────────────────────── */}
            <AddEvidenceDialog
                isOpen={showAddEvidence}
                onClose={() => setShowAddEvidence(false)}
                onSubmit={handleAddEvidenceSubmit}
                caseId={caseId}
            />
            <AddSuspectDialog
                isOpen={showAddSuspect}
                onClose={() => setShowAddSuspect(false)}
                onSubmit={handleAddSuspectSubmit}
                caseId={caseId}
            />
            <AddVictimDialog
                isOpen={showAddVictim}
                onClose={() => setShowAddVictim(false)}
                onSubmit={handleAddVictimSubmit}
                caseId={caseId}
                caseType={header?.crime_type}
            />
            <AddWitnessDialog
                isOpen={showAddWitness}
                onClose={() => setShowAddWitness(false)}
                onSubmit={handleAddWitnessSubmit}
                caseId={caseId}
            />
        </div>
    );
};

export default CasePage;