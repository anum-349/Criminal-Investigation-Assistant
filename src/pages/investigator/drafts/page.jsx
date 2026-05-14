/**
 * src/pages/investigator/drafts/page.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * "My Drafts" — list every case the investigator started but didn't finish.
 *
 * Routes:
 *   /investigator/drafts           — this page
 *   /register-case?draftId=…       — resume a draft (handled by register-case page)
 *
 * Where this page lives in the UI:
 *   Header → File → Drafts.
 *
 * What a draft is:
 *   A snapshot of the register-case wizard's formData saved to the server
 *   while still being filled in. Drafts are NOT cases — they live in their
 *   own case_drafts table so they don't appear in All Cases / search /
 *   reports / hotspots. They become real cases only when the investigator
 *   submits them (at which point the draft is deleted server-side).
 *
 * Actions per row:
 *   - Resume → opens /register-case?draftId=… which hydrates the wizard.
 *   - Delete → confirm + DELETE the draft.
 */

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    FilePlus, FileText, Trash2, Loader2, AlertTriangle, ChevronRight,
    LayoutDashboard, FolderOpen, Clock, Play,
} from "lucide-react";

import Header from "@/components/Header";
import { listDrafts, deleteDraft } from "@/services/draftApi";
import { formatApiError } from "@/services/caseApi";
import { useToast } from "@/context/ToastContext";


// ── Helpers ────────────────────────────────────────────────────────────────

const _formatRelative = (iso) => {
    if (!iso) return "—";
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return "—";
    const secs = Math.max(1, Math.round((Date.now() - t) / 1000));
    if (secs < 60) return `${secs}s ago`;
    if (secs < 3600) return `${Math.round(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.round(secs / 3600)}h ago`;
    return `${Math.round(secs / 86400)}d ago`;
};


export default function DraftsPage() {
    const navigate = useNavigate();

    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [confirmDelete, setConfirmDelete] = useState(null); // draftId | null
    const [busyId, setBusyId] = useState(null);
    const toast = useToast()

    // ── Fetch list on mount and after deletes ───────────────────────────
    const fetchList = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const rows = await listDrafts();
            setDrafts(Array.isArray(rows) ? rows : []);
        } catch (err) {
            const msg = formatApiError(err, "Could not load your drafts.");
            setError(msg);          // inline banner stays
            toast.error(msg);
            setDrafts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchList(); }, [fetchList]);

    // ── Resume → navigate to wizard with ?draftId= ──────────────────────
    const handleResume = (draftId) => {
        navigate(`/register-case?draftId=${encodeURIComponent(draftId)}`);
    };

    // ── Delete with confirm ─────────────────────────────────────────────
    const handleDelete = async (draftId) => {
        setBusyId(draftId);
        try {
            await deleteDraft(draftId);
            setDrafts(curr => curr.filter(d => d.draftId !== draftId));
            setConfirmDelete(null);
            toast.success("Draft deleted.");
        } catch (err) {
            const msg = formatApiError(err, "Could not delete draft.");
            setError(msg);
            toast.error(msg);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="min-h-screen bg-soft-mist font-sans mt-14">
            <Header />

            <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-1.5 text-xs text-slate-500">
                    <button onClick={() => navigate("/investigator")}
                        className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition-colors">
                        <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                    </button>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-slate-800 font-medium">My Drafts</span>
                </nav>

                {/* Page header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="h-6 w-6 text-deep-ocean" /> My Drafts
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Case registrations you've saved but not yet submitted. Drafts are private to you.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate("/register-case")}
                        className="flex items-center gap-2 px-5 py-2.5 bg-deep-ocean text-white rounded-lg text-sm font-semibold hover:bg-deep-ocean-900 cursor-pointer transition-colors self-start sm:self-auto">
                        <FilePlus className="h-4 w-4" /> Start New Case
                    </button>
                </div>

                {/* Error banner */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-red-800">Something went wrong</p>
                            <p className="text-xs text-red-700 mt-1">{error}</p>
                        </div>
                        <button onClick={fetchList}
                            className="text-xs font-semibold text-red-700 hover:text-red-900 underline cursor-pointer">
                            Retry
                        </button>
                    </div>
                )}

                {/* Loading state */}
                {loading && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                        <Loader2 className="h-8 w-8 text-deep-ocean animate-spin mx-auto mb-2" />
                        <p className="text-sm text-slate-500">Loading drafts…</p>
                    </div>
                )}

                {/* Empty state */}
                {!loading && !error && drafts.length === 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                            <FileText className="h-7 w-7 text-slate-400" />
                        </div>
                        <h2 className="text-base font-semibold text-slate-800">No drafts yet</h2>
                        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                            When you click "Save Draft" inside the case registration wizard, your work will appear here so you can pick it up later.
                        </p>
                        <button onClick={() => navigate("/register-case")}
                            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-deep-ocean text-white rounded-lg text-sm font-semibold hover:bg-deep-ocean-900 cursor-pointer transition-colors">
                            <FilePlus className="h-4 w-4" /> Start a new case
                        </button>
                    </div>
                )}

                {/* List */}
                {!loading && !error && drafts.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        <ul className="divide-y divide-slate-100">
                            {drafts.map(d => {
                                const busy = busyId === d.draftId;
                                const confirming = confirmDelete === d.draftId;

                                return (
                                    <li key={d.draftId}
                                        className="px-4 py-4 sm:px-6 hover:bg-slate-50 transition-colors">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                            {/* Title + meta */}
                                            <button
                                                onClick={() => handleResume(d.draftId)}
                                                className="flex-1 text-left cursor-pointer min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-semibold text-slate-800 truncate">
                                                        {d.title || "Untitled draft"}
                                                    </p>
                                                    {/* Progress pill — server-computed %. Falls back to 0 if missing. */}
                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                                                        ${(d.progressPercent || 0) >= 80 ? "bg-emerald-100 text-emerald-700"
                                                            : (d.progressPercent || 0) >= 40 ? "bg-amber-100 text-amber-700"
                                                                : "bg-slate-100 text-slate-600"}`}>
                                                        {d.progressPercent || 0}% complete
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                                    {d.firNumber && (
                                                        <span>FIR <span className="font-mono">{d.firNumber}</span></span>
                                                    )}
                                                    {d.caseType && <span>{d.caseType}</span>}
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {_formatRelative(d.updatedAt)}
                                                    </span>
                                                </div>
                                            </button>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 sm:shrink-0">
                                                {confirming ? (
                                                    <>
                                                        <span className="text-xs text-red-700">Delete this draft?</span>
                                                        <button
                                                            onClick={() => handleDelete(d.draftId)}
                                                            disabled={busy}
                                                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-md hover:bg-red-700 disabled:opacity-50 cursor-pointer">
                                                            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes, delete"}
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDelete(null)}
                                                            disabled={busy}
                                                            className="px-3 py-1.5 border border-slate-300 text-slate-600 text-xs rounded-md hover:bg-slate-50 cursor-pointer">
                                                            Cancel
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleResume(d.draftId)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-deep-ocean text-white text-xs font-semibold rounded-md hover:bg-deep-ocean-900 cursor-pointer transition-colors">
                                                            <Play className="h-3 w-3" /> Resume
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDelete(d.draftId)}
                                                            disabled={busy}
                                                            title="Delete draft"
                                                            className="p-1.5 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                {/* Helper text */}
                {!loading && drafts.length > 0 && (
                    <p className="text-xs text-slate-400 text-center">
                        Drafts auto-save while you work if you've enabled "Auto Save Drafts" in
                        <button onClick={() => navigate("/investigator/profile?tab=preferences")}
                            className="ml-1 text-deep-ocean hover:underline cursor-pointer">
                            Profile → Preferences
                        </button>.
                    </p>
                )}
            </main>
        </div>
    );
}