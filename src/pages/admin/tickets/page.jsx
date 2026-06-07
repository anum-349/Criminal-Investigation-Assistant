/**
 * src/pages/admin/tickets/page.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin — Support Tickets management.
 * Route: /admin/tickets
 *
 * Backend integration (services/ticketApi.js):
 *   - GET    /api/tickets                          (admin sees ALL tickets)
 *   - GET    /api/tickets/{ticketId}
 *   - PATCH  /api/tickets/{ticketId}               (status / assigned / notes)
 *   - POST   /api/tickets/{ticketId}/replies
 *   - DELETE /api/tickets/{ticketId}
 *
 * Status codes: OPEN / IN_PROGRESS / RESOLVED / CLOSED — backend auto-moves
 * a ticket to IN_PROGRESS on the first admin reply, so we refetch the
 * detail after every reply to stay in sync.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, ChevronRight, ChevronLeft, LayoutDashboard, MessageSquare,
  Send, Trash2, X, CheckCircle2, AlertTriangle, Clock,
  RefreshCw, Inbox, AlertCircle, Shield, Reply, Loader2,
} from "lucide-react";

import Header from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

import {
  listTickets, getTicket, updateTicket,
  replyToTicket, deleteTicket, formatApiError,
} from "@/services/ticketApi";

const PAGE_SIZE = 10;

// Debounce
function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const STATUS_OPTIONS = [
  { code: "OPEN",        label: "Open",        variant: "warning" },
  { code: "IN_PROGRESS", label: "In Progress", variant: "default" },
  { code: "RESOLVED",    label: "Resolved",    variant: "success" },
  { code: "CLOSED",      label: "Closed",      variant: "default" },
];
const statusVariant = (code) => STATUS_OPTIONS.find(s => s.code === code)?.variant || "default";
const statusLabel   = (code) => STATUS_OPTIONS.find(s => s.code === code)?.label   || code;

const PRIORITY_STYLES = {
  critical: "text-red-700 bg-red-50 border border-red-200",
  urgent:   "text-orange-700 bg-orange-50 border border-orange-200",
  normal:   "text-blue-700 bg-blue-50 border border-blue-200",
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

// ═════════════════════════════════════════════════════════════════════════════
// Ticket Detail Modal
// ═════════════════════════════════════════════════════════════════════════════
function TicketDetailModal({ ticket, onClose, onMutated, showToast }) {
  const [current, setCurrent] = useState(ticket);
  const [reply, setReply] = useState("");
  const [newStatus, setNewStatus] = useState(ticket.status_code);
  const [sending, setSending] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Refetch the latest detail (so a stale list row doesn't shadow newer replies).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fresh = await getTicket(ticket.ticket_id);
        if (!cancelled) {
          setCurrent(fresh);
          setNewStatus(fresh.status_code);
        }
      } catch (err) {
        if (!cancelled) setError(formatApiError(err, "Could not load ticket."));
      }
    })();
    return () => { cancelled = true; };
  }, [ticket.ticket_id]);

  const handleSendReply = async () => {
    if (!reply.trim()) return;
    setSending(true); setError(null);
    try {
      const fresh = await replyToTicket(current.ticket_id, reply);
      setCurrent(fresh);
      setNewStatus(fresh.status_code);
      setReply("");
      onMutated();
      showToast("Reply sent.");
    } catch (err) {
      setError(formatApiError(err, "Reply failed"));
    } finally {
      setSending(false);
    }
  };

  const handleSaveStatus = async () => {
    if (newStatus === current.status_code) return;
    setSavingStatus(true); setError(null);
    try {
      const fresh = await updateTicket(current.ticket_id, { status: newStatus });
      setCurrent(fresh);
      onMutated();
      showToast(`Status updated to "${statusLabel(newStatus)}".`);
    } catch (err) {
      setError(formatApiError(err, "Update failed"));
    } finally {
      setSavingStatus(false);
    }
  };

  const handleDelete = async () => {
    setBusyDelete(true); setError(null);
    try {
      await deleteTicket(current.ticket_id);
      onMutated();
      showToast("Ticket deleted.");
      onClose();
    } catch (err) {
      setError(formatApiError(err, "Delete failed"));
      setBusyDelete(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col relative">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs text-slate-500">{current.ticket_id}</span>
              <Badge variant={statusVariant(current.status_code)}>{statusLabel(current.status_code)}</Badge>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${PRIORITY_STYLES[current.priority] || PRIORITY_STYLES.normal}`}>
                {current.priority}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-800 truncate">{current.subject}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              From <strong>{current.sender_name || "—"}</strong> · {fmtDate(current.created_at)}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer shrink-0">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {/* Original message */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                {(current.sender_name || "??").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-700">{current.sender_name}</p>
                <p className="text-[10px] text-slate-500">{fmtDate(current.created_at)}</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-line">{current.message}</p>
          </div>

          {/* Replies */}
          {(current.replies || []).length > 0 && (
            <div className="space-y-3">
              {current.replies.map(r => (
                <div key={r.id}
                  className={`rounded-lg p-4 border ${r.is_admin
                    ? "bg-deep-ocean/5 border-deep-ocean/20"
                    : "bg-slate-50 border-slate-200"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                      ${r.is_admin ? "bg-deep-ocean text-white" : "bg-blue-100 text-blue-700"}`}>
                      {r.is_admin ? <Shield className="h-3.5 w-3.5" /> : (r.author_name || "??").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        {r.author_name || "—"}
                        {r.is_admin && <span className="text-[9px] font-bold uppercase text-deep-ocean">Admin</span>}
                      </p>
                      <p className="text-[10px] text-slate-500">{fmtDate(r.created_at)}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{r.body}</p>
                </div>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Change Status
                </label>
                <div className="flex gap-2">
                  <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean">
                    {STATUS_OPTIONS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                  </select>
                  <button onClick={handleSaveStatus}
                    disabled={newStatus === current.status_code || savingStatus}
                    className={`px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-white
                      ${newStatus === current.status_code || savingStatus
                        ? "bg-slate-300 cursor-not-allowed"
                        : "bg-deep-ocean hover:bg-deep-ocean-900 cursor-pointer"}`}>
                    {savingStatus
                      ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Save
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Reply to {current.sender_name}
              </label>
              <textarea value={reply} onChange={e => setReply(e.target.value)} rows={3}
                placeholder="Type your reply…"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean resize-none" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 cursor-pointer">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
            Close
          </button>
          <button onClick={handleSendReply} disabled={!reply.trim() || sending}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 text-white
              ${!reply.trim() || sending
                ? "bg-deep-ocean/40 cursor-not-allowed"
                : "bg-deep-ocean hover:bg-deep-ocean-900 cursor-pointer"}`}>
            {sending
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
              : <><Send className="h-4 w-4" /> Send Reply</>}
          </button>
        </div>

        {showDeleteConfirm && (
          <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 rounded-2xl">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Delete this ticket?</h3>
              <p className="text-sm text-slate-500">The ticket and all replies will be permanently removed.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} disabled={busyDelete}
                  className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={busyDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
                  {busyDelete
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Trash2 className="h-4 w-4" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function AdminTicketsPage() {
  const navigate = useNavigate();

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounced(searchInput, 350);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [page, setPage] = useState(1);

  // Data
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail
  const [selected, setSelected] = useState(null);

  const [toast, setToast] = useState(null);
  const showToast = (msg, kind = "success") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2500);
  };

  // ── Fetch ─────────────────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await listTickets({
        page, pageSize: PAGE_SIZE,
        statusFilter,
        search: debouncedSearch,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(formatApiError(err, "Could not load tickets."));
      setItems([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, page]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // ── Derived stats ─────────────────────────────────────────────────────
  // Page-level stats — the backend doesn't expose a global breakdown.
  const stats = useMemo(() => {
    return {
      total,
      open:       items.filter(t => t.status_code === "OPEN").length,
      inProgress: items.filter(t => t.status_code === "IN_PROGRESS").length,
      resolved:   items.filter(t => t.status_code === "RESOLVED").length,
      closed:     items.filter(t => t.status_code === "CLOSED").length,
      urgent:     items.filter(t => ["urgent", "critical"].includes(t.priority) && !["CLOSED", "RESOLVED"].includes(t.status_code)).length,
    };
  }, [items, total]);

  const filtered = useMemo(() => {
    if (priorityFilter === "All") return items;
    return items.filter(t => t.priority === priorityFilter.toLowerCase());
  }, [items, priorityFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const resetFilters = () => {
    setSearchInput(""); setStatusFilter("all"); setPriorityFilter("All"); setPage(1);
  };

  return (
    <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-14">
      <Header />

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <button onClick={() => navigate("/admin")}
            className="flex items-center gap-1.5 hover:text-slate-800 transition-colors cursor-pointer">
            <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
          </button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-800 font-medium">Support Tickets</span>
        </nav>

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-deep-ocean" /> Support Tickets
            </h1>
            <p className="text-sm text-slate-500 mt-1">Investigators' support requests, bug reports, and feedback</p>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Could not load tickets</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
            <button onClick={fetchList}
              className="text-xs font-semibold text-red-700 hover:underline cursor-pointer">Retry</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total",       value: stats.total,      icon: Inbox,          color: "text-deep-ocean" },
            { label: "Open",        value: stats.open,       icon: AlertCircle,    color: "text-amber-600" },
            { label: "In Progress", value: stats.inProgress, icon: Clock,          color: "text-blue-600" },
            { label: "Resolved",    value: stats.resolved,   icon: CheckCircle2,   color: "text-emerald-600" },
            { label: "Closed",      value: stats.closed,     icon: Shield,         color: "text-slate-500" },
            { label: "Urgent Open", value: stats.urgent,     icon: AlertTriangle,  color: "text-red-600" },
          ].map(s => (
            <Card key={s.label} className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color} shrink-0`} />
              <div>
                <p className="text-xs font-semibold text-slate-500">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row md:flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text" value={searchInput} onChange={e => { setSearchInput(e.target.value); setPage(1); }}
                placeholder="Search by ID, subject, sender…"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean"
              />
            </div>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean min-w-[150px]">
              <option value="all">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
            <select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean min-w-[150px]">
              <option>All</option><option>Critical</option><option>Urgent</option><option>Normal</option>
            </select>
            <button onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">
              <RefreshCw className="h-3.5 w-3.5" /> Reset
            </button>
          </div>
        </Card>

        {/* Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-deep-ocean text-white">
                <tr>
                  {["Ticket ID", "Subject", "From", "Priority", "Status", "Updated", "Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-14 text-slate-400 text-sm">
                    <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" /> Loading tickets…
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-14 text-slate-400 text-sm">
                    <Inbox className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    No tickets match the current filters.
                  </td></tr>
                ) : filtered.map(t => (
                  <tr key={t.id} onClick={() => setSelected(t)}
                    className="hover:bg-slate-50 cursor-pointer">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">{t.ticket_id}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 truncate max-w-[300px]">{t.subject}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[300px]">{t.message}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-[10px] font-bold">
                          {(t.sender_name || "??").slice(0, 2).toUpperCase()}
                        </div>
                        <p className="text-xs font-medium text-slate-700">{t.sender_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.normal}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={statusVariant(t.status_code)}>{statusLabel(t.status_code)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(t.updated_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button onClick={(e) => { e.stopPropagation(); setSelected(t); }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-deep-ocean text-white hover:bg-deep-ocean-900 cursor-pointer">
                        <Reply className="h-3.5 w-3.5" /> Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && total > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-500">
                Showing <span className="font-semibold">{(page - 1) * PAGE_SIZE + 1}</span>–
                <span className="font-semibold">{Math.min(page * PAGE_SIZE, total)}</span>
                {" "}of <span className="font-semibold">{total}</span>
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                  <ChevronLeft className="h-4 w-4 text-slate-600" />
                </button>
                <span className="text-xs text-slate-500 px-2">
                  Page <span className="font-semibold">{page}</span> / {totalPages}
                </span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-2 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                </button>
              </div>
            </div>
          )}
        </Card>
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium
          ${toast.kind === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"}`}>
          <CheckCircle2 className="h-4 w-4" /> {toast.msg}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <TicketDetailModal
          ticket={selected}
          onClose={() => setSelected(null)}
          onMutated={fetchList}
          showToast={showToast}
        />
      )}
    </div>
  );
}
