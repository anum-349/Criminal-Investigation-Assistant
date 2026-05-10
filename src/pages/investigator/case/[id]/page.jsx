import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
    FolderOpen, LayoutDashboard, CheckCircle2, X,
    Loader2, AlertTriangle,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getAuthHeader = () => {
    const token =
        localStorage.getItem('token') || sessionStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onClose }) {
    return (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium bg-deep-ocean text-white max-w-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
            <span className="flex-1">{message}</span>
            <button
                onClick={onClose}
                className="p-0.5 rounded hover:bg-white/10 cursor-pointer"
                aria-label="Dismiss"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

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

// ═════════════════════════════════════════════════════════════════════════════
// CasePage
// ═════════════════════════════════════════════════════════════════════════════

const CasePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const caseId = id; // For easier logging and potential future transformations
    // ── Loaded data ────────────────────────────────────────────────────────
    const [header, setHeader] = useState(null);
    const [stats, setStats] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    // ── Tab state ──────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('timeline');

    // ── Dialog visibility ──────────────────────────────────────────────────
    const [showAddEvidence, setShowAddEvidence] = useState(false);
    const [showAddSuspect, setShowAddSuspect] = useState(false);
    const [showAddVictim, setShowAddVictim] = useState(false);
    const [showAddWitness, setShowAddWitness] = useState(false);
    // ── Toast ──────────────────────────────────────────────────────────────
    const [toast, setToast] = useState(null);
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3500);
        return () => clearTimeout(t);
    }, [toast]);

    // ── Initial load ───────────────────────────────────────────────────────
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

    // Direct add for manual events coming from CaseTimeline's modal (kept
    // local — manual timeline events aren't yet round-tripped through the
    // backend; that endpoint is a separate addition).
    const handleAddTimelineEvent = useCallback(async (ev) => {
        try {
            const url = import.meta.env.VITE_API_URL;
            // Strip frontend-only fields (id, createdAt, eventSource) — backend
            // generates its own canonical row. Send only the form payload.
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
            if (created?.id) {
                setEvents(curr => [created, ...curr]);
            }
            setToast(`Timeline event added to ${caseId}`);
            return created;
        } catch (err) {
            console.error('Add timeline failed:', err);
            const detail = err?.response?.data?.detail || err.message || 'Failed to save event.';
            setToast(`Save failed: ${detail}`);
            // Rethrow so AddTimelineDialog stays open and shows its own error UI
            throw err;
        }
    }, [caseId]);

    // ── Delete a manual timeline event ──────────────────────────────────────────
    // CaseTimeline awaits this and only closes its inline confirm on success.
    // On failure we show a toast and rethrow so CaseTimeline can keep the row
    // visible.
    const handleDeleteTimelineEvent = useCallback(async (id) => {
        try {
            const url = import.meta.env.VITE_API_URL;
            await axios.delete(
                `${url}/api/investigator/cases/${caseId}/timeline/${id}`,
                { headers: getAuthHeader() },
            );
            setEvents(curr => curr.filter(e => e.id !== id));
            setToast(`Timeline event ${id} deleted`);
        } catch (err) {
            console.error('Delete timeline failed:', err);
            const detail = err?.response?.data?.detail || err.message || 'Failed to delete event.';
            setToast(`Delete failed: ${detail}`);
            throw err;
        }
    }, [caseId]);

    // ── Generic POST helper ────────────────────────────────────────────────
    // Returns [createdIds, success]. On success, prepends the server's
    // timeline_events to the local state and pops a toast.
    const submitAdd = useCallback(async (path, body, toastTitleFn) => {
        try {
            const url = import.meta.env.VITE_API_URL;
            const res = await axios.post(
                `${url}/api/investigator/cases/${caseId}/${path}`,
                body,
                { headers: getAuthHeader() },
            );
            const data = res.data || {};
            const newEvents = data.timeline_events || [];
            if (newEvents.length) {
                setEvents(curr => [...newEvents, ...curr]);
            }
            // Stats need a refresh to reflect the new count. Cheap incremental
            // bump; full re-fetch happens next time the user lands on the page.
            setStats(curr => curr && ({
                ...curr,
                ...(path === 'evidences' ? { evidence_collected: curr.evidence_collected + (data.created_ids?.length || 0) } : {}),
                ...(path === 'suspects' ? { suspects: curr.suspects + (data.created_ids?.length || 0) } : {}),
                ...(path === 'victims' ? { victims: curr.victims + (data.created_ids?.length || 0) } : {}),
            }));
            setToast(toastTitleFn(data.created_ids || []));
            return [data.created_ids || [], true];
        } catch (err) {
            console.error('Add failed:', err);
            setToast(`Save failed: ${err?.response?.data?.detail || err.message}`);
            return [[], false];
        }
    }, [caseId]);

    console.log(header)
    // ── Action handlers ────────────────────────────────────────────────────
    const handleAddSuspectSubmit = (data) => {
        const list = data?.suspects || [];
        if (!list.length) return;
        submitAdd(
            'suspects',
            { suspects: list },
            (ids) => `Added ${ids.length} suspect${ids.length === 1 ? '' : 's'} to ${caseId}`,
        );
    };

    const handleAddEvidenceSubmit = async (data) => {
        const list = data?.evidences || [];
        if (!list.length) return { ok: false, error: "No evidence items to submit." };

        try {
            const result = await addEvidencesToCase(caseId, list);

            if (result.timeline_events?.length) {
                setEvents(curr => [...result.timeline_events, ...curr]);
            }
            setStats(curr => curr && ({
                ...curr,
                evidence_collected: curr.evidence_collected + (result.created_ids?.length || 0),
            }));

            const n = result.created_ids?.length || 0;
            setToast(`Added ${n} evidence item${n === 1 ? "" : "s"} to ${caseId}`);

            return {
                ok: true,
                created_ids: result.created_ids,
                photo_failures: result.photo_failures,
            };
        } catch (err) {
            console.error("Add evidence failed:", err);
            const detail = formatApiError(err, "Failed to save evidence.");
            setToast(`Save failed: ${detail}`);
            return { ok: false, error: detail };
        }
    };

    const handleAddVictimSubmit = async (data) => {
        const list = data?.victims || [];
        if (!list.length) return { ok: false, error: "No victim items to submit." };
         try {
            const result = await addVictimsToCase(caseId, list);

            if (result.timeline_events?.length) {
                setEvents(curr => [...result.timeline_events, ...curr]);
            }
            setStats(curr => curr && ({
                ...curr,
                victims: curr.victims + (result.created_ids?.length || 0),
            }));

            const n = result.created_ids?.length || 0;
            setToast(`Added ${n} Victim item${n === 1 ? "" : "s"} to ${caseId}`);

            return {
                ok: true,
                created_ids: result.created_ids,
                photo_failures: result.photo_failures,
            };
        } catch (err) {
            console.error("Add Victim failed:", err);
            const detail = formatApiError(err, "Failed to save victim.");
            setToast(`Save failed: ${detail}`);
            return { ok: false, error: detail };
        }
    };

    const handleAddWitnessSubmit = (data) => {
        const list = data?.witnesses || [];
        if (!list.length) return;
        submitAdd(
            'witnesses',
            { witnesses: list },
            (ids) => `Added ${ids.length} witness${ids.length === 1 ? '' : 'es'} to ${caseId}`,
        );
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
                    <p className="text-sm text-muted-foreground mt-2">
                        This case is assigned to another investigator.
                    </p>
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

    // ─── Normal render ────────────────────────────────────────────────────
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
                        <div className="flex gap-2 mt-3">
                            <span className={`text-white inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusPillClass(header?.status)}`}>
                                {header?.status || '—'}
                            </span>
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

            {/* ── Dialogs ──────────────────────────────────────────────── */}
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

            {toast && <Toast message={toast} onClose={() => setToast(null)} />}
        </div>
    );
};

export default CasePage;