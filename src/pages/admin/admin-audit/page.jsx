// ══════════════════════════════════════════════════════════════════════════════
// FORM 20 — Audit Logs  (backend-paginated)
// ══════════════════════════════════════════════════════════════════════════════
import Header from "@/components/Header";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { fetchAuditLogs, formatApiError } from "@/services/adminApi";
import { Activity, AlertCircle, ChevronDown, ChevronLeft, ChevronRight, Download, LayoutDashboard, Loader2, RefreshCw, Search, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const MODULES = ["All","Authentication","Case Management","User Management","Evidence","Database","Reports","Settings"];
const ACTIONS = ["All","LOGIN","LOGOUT","CREATE","UPDATE","DELETE","VIEW","EXPORT","BACKUP","RESTORE"];

const ACTION_COLORS = {
  LOGIN:   "bg-blue-100 text-blue-700",   LOGOUT:  "bg-slate-100 text-slate-600",
  CREATE:  "bg-emerald-100 text-emerald-700", UPDATE: "bg-amber-100 text-amber-700",
  DELETE:  "bg-red-100 text-red-700",     VIEW:    "bg-cyan-100 text-cyan-700",
  EXPORT:  "bg-purple-100 text-purple-700", BACKUP: "bg-teal-100 text-teal-700",
  RESTORE: "bg-orange-100 text-orange-700",
};

const PAGE_SIZE = 10;

// Skeleton row for loading state
const LogSkeleton = () => (
  <tr>
    {Array.from({ length: 9 }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: i === 4 ? "120px" : "64px" }} />
      </td>
    ))}
  </tr>
);

export default function AuditLogsPage() {
  const navigate = useNavigate();

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");
  const [page,         setPage]         = useState(1);
  const [expanded,     setExpanded]     = useState(null);

  // ── Data state ────────────────────────────────────────────────────────────
  const [logs,       setLogs]       = useState([]);
  const [total,      setTotal]      = useState(0);
  const [stats,      setStats]      = useState({ total_events: 0, today: 0, failed: 0, unique_users: 0 });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [exporting,  setExporting]  = useState(false);

  // ── Debounced search ──────────────────────────────────────────────────────
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAuditLogs({
      search:    debouncedSearch,
      module:    moduleFilter,
      action:    actionFilter,
      dateFrom,
      dateTo,
      page,
      pageSize:  PAGE_SIZE,
    })
      .then(data => {
        if (cancelled) return;
        setLogs(data.items ?? []);
        setTotal(data.total ?? 0);
        if (data.stats) setStats(data.stats);
      })
      .catch(err => {
        if (cancelled) return;
        setError(formatApiError(err, "Could not load audit logs."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [debouncedSearch, moduleFilter, actionFilter, dateFrom, dateTo, page]);

  // Reset page when filters change
  const resetPage = () => setPage(1);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── CSV export (hits same endpoint with large page_size) ──────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await fetchAuditLogs({
        search: debouncedSearch, module: moduleFilter, action: actionFilter,
        dateFrom, dateTo, page: 1, pageSize: 10_000,
      });
      const rows = data.items ?? [];
      const header = "Log ID,User,Action,Module,Details,Date,Time,IP,Machine,Status";
      const csv = [header, ...rows.map(l =>
        [l.id, l.user, l.action, l.module, `"${l.detail}"`, l.date, l.time, l.ip, l.machine, l.status].join(",")
      )].join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      Object.assign(document.createElement("a"), { href: url, download: "audit-logs.csv" }).click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(formatApiError(err, "Export failed."));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-14">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <button onClick={() => navigate("/admin")} className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition-colors">
            <LayoutDashboard className="h-3.5 w-3.5" />Dashboard
          </button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-800 font-medium">Audit Logs</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Activity className="h-6 w-6 text-deep-ocean" />Audit Logs
            </h1>
            <p className="text-sm text-slate-500 mt-1">Complete trail of all system actions for security and compliance</p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 bg-white rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors disabled:opacity-50 self-start"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export CSV
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Events",   value: stats.total_events, color: "text-deep-ocean" },
            { label: "Today",          value: stats.today,        color: "text-blue-600"   },
            { label: "Failed Actions", value: stats.failed,       color: "text-red-600"    },
            { label: "Unique Users",   value: stats.unique_users, color: "text-emerald-600"},
          ].map(s => (
            <Card key={s.label} className="p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{loading ? "—" : s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-50">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); resetPage(); }}
                placeholder="Search user, action, IP, module…"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean/30"
              />
            </div>
            {[
              { val: moduleFilter, set: v => { setModuleFilter(v); resetPage(); }, opts: MODULES, placeholder: "All Modules" },
              { val: actionFilter, set: v => { setActionFilter(v); resetPage(); }, opts: ACTIONS, placeholder: "All Actions" },
            ].map((f, i) => (
              <select key={i} value={f.val} onChange={e => f.set(e.target.value)}
                className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 appearance-none min-w-30">
                {f.opts.map(o => <option key={o} value={o}>{o === "All" ? f.placeholder : o}</option>)}
              </select>
            ))}
            <input type="date" value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); resetPage(); }}
              className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30"
              title="From date" />
            <input type="date" value={dateTo}
              onChange={e => { setDateTo(e.target.value); resetPage(); }}
              className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30"
              title="To date" />
            <button
              onClick={() => { setSearch(""); setModuleFilter("All"); setActionFilter("All"); setDateFrom(""); setDateTo(""); setPage(1); }}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
              <RefreshCw className="h-3.5 w-3.5" /> Reset
            </button>
          </div>
        </Card>

        {/* Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["Log ID","User","Action","Module","Details","Date / Time","IP / Machine","Status",""].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading
                  ? Array.from({ length: PAGE_SIZE }).map((_, i) => <LogSkeleton key={i} />)
                  : logs.length === 0
                  ? <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-sm">No logs match the current filters.</td></tr>
                  : logs.map(log => (
                    <>
                      <tr
                        key={log.id}
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${log.status === "Failed" ? "bg-red-50/50" : ""}`}
                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{log.id}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-deep-ocean/10 flex items-center justify-center shrink-0">
                              <User className="h-3.5 w-3.5 text-deep-ocean" />
                            </div>
                            <span className="text-xs font-medium text-slate-700">{log.user}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${ACTION_COLORS[log.action] || "bg-slate-100 text-slate-600"}`}>{log.action}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{log.module}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-50 truncate">{log.detail}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          <p>{log.date}</p><p className="text-slate-400">{log.time}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          <p className="font-mono">{log.ip}</p><p className="text-slate-400">{log.machine}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant={log.status === "Success" ? "success" : "destructive"}>{log.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expanded === log.id ? "rotate-180" : ""}`} />
                        </td>
                      </tr>
                      {expanded === log.id && (
                        <tr key={log.id + "-detail"} className="bg-slate-50">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                              {[["Log ID",log.id],["User",log.user],["Action",log.action],["Module",log.module],
                                ["Details",log.detail],["Date",log.date],["Time",log.time],
                                ["IP Address",log.ip],["Machine",log.machine],["Status",log.status]
                              ].map(([k,v]) => (
                                <div key={k}>
                                  <p className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">{k}</p>
                                  <p className="text-slate-700 mt-0.5">{v}</p>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                }
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              {loading
                ? "Loading…"
                : `Showing ${total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total} logs`}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return p <= totalPages ? (
                  <button key={p} onClick={() => setPage(p)} disabled={loading}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer
                      ${p === page ? "bg-deep-ocean text-white" : "hover:bg-slate-100 text-slate-600"}`}>{p}</button>
                ) : null;
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}