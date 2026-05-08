/**
 * Forms 19, 20 — Admin Database & Audit Logs
 * ManageDatabasePage | AuditLogsPage
 * Route: /admin/database  /admin/audit-logs
 * HCI: destructive action guards, clear status feedback, filterable log table
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Database, RefreshCw, Download, Upload, Trash2, AlertTriangle,
  CheckCircle2, Loader2, Activity, Search, Filter, Clock,
  LayoutDashboard, ChevronRight, ShieldAlert, User, FileText,
  HardDrive, Zap, RotateCcw, X, AlertCircle, ChevronLeft,
  ChevronDown, Shield, Eye, Calendar
} from "lucide-react";
import Header from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

// ── Shared ────────────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</label>
    {children}
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// FORM 19 — Manage Database
// ══════════════════════════════════════════════════════════════════════════════
const DB_ACTIONS = [
  {
    id: "backup",
    label: "Backup Database",
    icon: Download,
    color: "text-blue-600",
    bg: "bg-blue-50 hover:bg-blue-100 border-blue-200",
    description: "Create a full encrypted backup of all case records, evidence metadata, and user data.",
    buttonLabel: "Start Backup",
    buttonColor: "bg-blue-600 hover:bg-blue-700",
    destructive: false,
    confirm: false,
  },
  {
    id: "restore",
    label: "Restore from Backup",
    icon: Upload,
    color: "text-emerald-600",
    bg: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200",
    description: "Restore the database from a previous backup file. Current data will be replaced.",
    buttonLabel: "Choose Backup File",
    buttonColor: "bg-emerald-600 hover:bg-emerald-700",
    destructive: false,
    confirm: true,
    confirmMessage: "Restoring will overwrite all current data with the selected backup. This cannot be undone.",
  },
  {
    id: "optimize",
    label: "Optimize Database",
    icon: Zap,
    color: "text-amber-600",
    bg: "bg-amber-50 hover:bg-amber-100 border-amber-200",
    description: "Run ANALYZE and VACUUM operations to improve query performance and reclaim disk space.",
    buttonLabel: "Optimize Now",
    buttonColor: "bg-amber-600 hover:bg-amber-700",
    destructive: false,
    confirm: false,
  },
  {
    id: "reindex",
    label: "Reindex Database",
    icon: RefreshCw,
    color: "text-purple-600",
    bg: "bg-purple-50 hover:bg-purple-100 border-purple-200",
    description: "Rebuild all database indexes to fix corruption and restore optimal query performance.",
    buttonLabel: "Run Reindex",
    buttonColor: "bg-purple-600 hover:bg-purple-700",
    destructive: false,
    confirm: false,
  },
  {
    id: "deduplicate",
    label: "Delete Duplicate Data",
    icon: Trash2,
    color: "text-red-600",
    bg: "bg-red-50 hover:bg-red-100 border-red-200",
    description: "Scan and remove duplicate case entries, orphaned evidence records, and redundant suspect profiles.",
    buttonLabel: "Scan & Remove Duplicates",
    buttonColor: "bg-red-600 hover:bg-red-700",
    destructive: true,
    confirm: true,
    confirmMessage: "This will permanently delete detected duplicate records. Make a backup before proceeding.",
  },
];

const MOCK_BACKUPS = [
  { id: "BK-001", date: "2026-04-21 02:00", size: "142 MB", status: "Success", type: "Auto" },
  { id: "BK-002", date: "2026-04-20 02:00", size: "140 MB", status: "Success", type: "Auto" },
  { id: "BK-003", date: "2026-04-18 14:32", size: "139 MB", status: "Success", type: "Manual" },
  { id: "BK-004", date: "2026-04-15 02:00", size: "137 MB", status: "Failed", type: "Auto" },
];

function ConfirmModal({ action, onClose, onConfirm }) {
  const [typed, setTyped] = useState("");
  const isDestructive = action.destructive;
  const canConfirm = !isDestructive || typed === "CONFIRM";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isDestructive ? "bg-red-100" : "bg-amber-100"}`}>
            <AlertTriangle className={`h-5 w-5 ${isDestructive ? "text-red-600" : "text-amber-600"}`} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Confirm: {action.label}</h3>
            <p className="text-xs text-slate-500">Admin action · Cannot be undone</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
        </div>

        <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-200">{action.confirmMessage}</p>

        {isDestructive && (
          <div className="space-y-2">
            <p className="text-xs text-slate-600 font-medium">Type <strong>CONFIRM</strong> to proceed:</p>
            <input value={typed} onChange={e => setTyped(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400" placeholder="CONFIRM" />
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-slate-300 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={!canConfirm}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 cursor-pointer transition-all
              ${canConfirm ? action.buttonColor : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}>
            {isDestructive ? <Trash2 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {action.buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ManageDatabasePage() {
  const navigate = useNavigate();
  const [running, setRunning] = useState(null);
  const [done, setDone] = useState({});
  const [confirmAction, setConfirmAction] = useState(null);
  const [dbStats] = useState({ size: "142 MB", tables: 12, records: 3248, lastOptimized: "2026-04-20", integrity: "OK" });

  const runAction = async (actionId) => {
    setRunning(actionId);
    await new Promise(r => setTimeout(r, 2000));
    setRunning(null);
    setDone(d => ({ ...d, [actionId]: true }));
    setTimeout(() => setDone(d => { const n = { ...d }; delete n[actionId]; return n; }), 3000);
  };

  const handleActionClick = (action) => {
    if (action.confirm) setConfirmAction(action);
    else runAction(action.id);
  };

  return (
    <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-14">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <button onClick={() => navigate("/admin")} className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition-colors"><LayoutDashboard className="h-3.5 w-3.5" />Dashboard</button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-800 font-medium">Database Management</span>
        </nav>

        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Database className="h-6 w-6 text-deep-ocean" />Database Management</h1>
          <p className="text-sm text-slate-500 mt-1">Backup, restore, and maintain the system database.</p>
        </div>

        {/* DB Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: "DB Size", value: dbStats.size, icon: HardDrive, color: "text-blue-600" },
            { label: "Tables", value: dbStats.tables, icon: Database, color: "text-purple-600" },
            { label: "Total Records", value: dbStats.records.toLocaleString(), icon: FileText, color: "text-deep-ocean" },
            { label: "Last Optimized", value: dbStats.lastOptimized, icon: Clock, color: "text-amber-600" },
            { label: "Integrity", value: dbStats.integrity, icon: Shield, color: "text-emerald-600" },
          ].map(s => (
            <Card key={s.label} className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color} shrink-0`} />
              <div>
                <p className="text-xs font-semibold text-slate-500">{s.label}</p>
                <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DB_ACTIONS.map(action => {
            const Icon = action.icon;
            const isRunning = running === action.id;
            const isDone = done[action.id];
            return (
              <div key={action.id} className={`rounded-xl border p-5 space-y-3 transition-all ${action.bg}`}>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white border border-white/80 shadow-sm shrink-0">
                    <Icon className={`h-5 w-5 ${action.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">{action.label}</p>
                    <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{action.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleActionClick(action)}
                  disabled={isRunning || !!running}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all cursor-pointer
                    ${isDone ? "bg-emerald-600" : isRunning ? "opacity-60 cursor-not-allowed " + action.buttonColor : action.buttonColor}
                    disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {isDone
                    ? <><CheckCircle2 className="h-4 w-4" />Completed</>
                    : isRunning
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Running…</>
                    : <><Icon className="h-4 w-4" />{action.buttonLabel}</>}
                </button>
              </div>
            );
          })}
        </div>

        {/* Backups history */}
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">Backup History</h3>
            <Badge variant="default">{MOCK_BACKUPS.length} backups</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["Backup ID", "Date & Time", "Size", "Type", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MOCK_BACKUPS.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{b.id}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{b.date}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{b.size}</td>
                    <td className="px-4 py-3"><Badge variant={b.type === "Manual" ? "warning" : "default"}>{b.type}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={b.status === "Success" ? "success" : "destructive"}>{b.status}</Badge></td>
                    <td className="px-4 py-3">
                      {b.status === "Success" && (
                        <button className="flex items-center gap-1 text-xs text-deep-ocean hover:underline cursor-pointer">
                          <Download className="h-3.5 w-3.5" />Download
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      {confirmAction && (
        <ConfirmModal
          action={confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => { setConfirmAction(null); runAction(confirmAction.id); }}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FORM 20 — Audit Logs
// ══════════════════════════════════════════════════════════════════════════════
const MODULES = ["All", "Authentication", "Case Management", "User Management", "Evidence", "Database", "Reports", "Settings"];
const ACTIONS = ["All", "LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE", "VIEW", "EXPORT", "BACKUP", "RESTORE"];

const MOCK_LOGS = Array.from({ length: 40 }, (_, i) => {
  const actions = ["LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE", "VIEW", "EXPORT", "BACKUP"];
  const users = ["rashid.ali", "nadia.admin", "kamran.b", "sara.malik", "tariq.mehmood", "amna.qadir"];
  const modules = ["Authentication", "Case Management", "User Management", "Evidence", "Database", "Reports"];
  const ips = ["192.168.1.10", "192.168.1.15", "192.168.1.22", "10.0.0.5"];
  const action = actions[i % actions.length];
  const module = modules[i % modules.length];
  const details = {
    LOGIN: "User logged in successfully", LOGOUT: "User logged out",
    CREATE: `Created new ${module === "Case Management" ? "case C-20" + (50 + i) : "record"}`,
    UPDATE: `Updated ${module === "User Management" ? "user profile" : "case record"}`,
    DELETE: "Record deleted", VIEW: "Accessed case detail",
    EXPORT: "Exported report as PDF", BACKUP: "Database backup completed",
  };
  const d = new Date(2026, 3, 22 - Math.floor(i / 5), 9 + (i % 10), (i * 7) % 60);
  return {
    id: `LOG-${String(1000 + i).padStart(4, "0")}`,
    user: users[i % users.length],
    action, module,
    detail: details[action] || "Action performed",
    date: d.toISOString().split("T")[0],
    time: d.toTimeString().slice(0, 5),
    ip: ips[i % ips.length],
    machine: `PC-${100 + (i % 8)}`,
    status: i % 10 === 3 ? "Failed" : "Success",
  };
});

const ACTION_COLORS = {
  LOGIN: "bg-blue-100 text-blue-700", LOGOUT: "bg-slate-100 text-slate-600",
  CREATE: "bg-emerald-100 text-emerald-700", UPDATE: "bg-amber-100 text-amber-700",
  DELETE: "bg-red-100 text-red-700", VIEW: "bg-cyan-100 text-cyan-700",
  EXPORT: "bg-purple-100 text-purple-700", BACKUP: "bg-teal-100 text-teal-700",
  RESTORE: "bg-orange-100 text-orange-700",
};

const PAGE_SIZE = 10;

export function AuditLogsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return MOCK_LOGS.filter(l =>
      (!q || [l.id, l.user, l.action, l.module, l.detail, l.ip, l.machine].some(f => f?.toLowerCase().includes(q))) &&
      (moduleFilter === "All" || l.module === moduleFilter) &&
      (actionFilter === "All" || l.action === actionFilter) &&
      (!dateFrom || l.date >= dateFrom) &&
      (!dateTo || l.date <= dateTo)
    );
  }, [search, moduleFilter, actionFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-14">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <button onClick={() => navigate("/admin")} className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition-colors"><LayoutDashboard className="h-3.5 w-3.5" />Dashboard</button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-800 font-medium">Audit Logs</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Activity className="h-6 w-6 text-deep-ocean" />Audit Logs</h1>
            <p className="text-sm text-slate-500 mt-1">Complete trail of all system actions for security and compliance</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 bg-white rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors self-start">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Events", value: MOCK_LOGS.length, color: "text-deep-ocean" },
            { label: "Today", value: MOCK_LOGS.filter(l => l.date === "2026-04-22").length, color: "text-blue-600" },
            { label: "Failed Actions", value: MOCK_LOGS.filter(l => l.status === "Failed").length, color: "text-red-600" },
            { label: "Unique Users", value: new Set(MOCK_LOGS.map(l => l.user)).size, color: "text-emerald-600" },
          ].map(s => (
            <Card key={s.label} className="p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-50">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search user, action, IP, module…"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean/30" />
            </div>
            {[
              { val: moduleFilter, set: setModuleFilter, opts: MODULES, placeholder: "All Modules" },
              { val: actionFilter, set: setActionFilter, opts: ACTIONS, placeholder: "All Actions" },
            ].map((f, i) => (
              <select key={i} value={f.val} onChange={e => { f.set(e.target.value); setPage(1); }}
                className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 appearance-none min-w-30">
                {f.opts.map(o => <option key={o} value={o}>{o === "All" ? f.placeholder : o}</option>)}
              </select>
            ))}
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30"
              placeholder="From date" title="From date" />
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30"
              placeholder="To date" title="To date" />
            <button onClick={() => { setSearch(""); setModuleFilter("All"); setActionFilter("All"); setDateFrom(""); setDateTo(""); setPage(1); }}
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
                  {["Log ID", "User", "Action", "Module", "Details", "Date / Time", "IP / Machine", "Status", ""].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageData.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-sm">No logs match the current filters.</td></tr>
                ) : pageData.map(log => (
                  <>
                    <tr key={log.id} className={`hover:bg-slate-50 transition-colors cursor-pointer ${log.status === "Failed" ? "bg-red-50/50" : ""}`} onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
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
                            {[["Log ID", log.id], ["User", log.user], ["Action", log.action], ["Module", log.module], ["Details", log.detail], ["Date", log.date], ["Time", log.time], ["IP Address", log.ip], ["Machine", log.machine], ["Status", log.status]].map(([k, v]) => (
                              <div key={k}><p className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">{k}</p><p className="text-slate-700 mt-0.5">{v}</p></div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} logs
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return p <= totalPages ? (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer
                      ${p === page ? "bg-deep-ocean text-white" : "hover:bg-slate-100 text-slate-600"}`}>{p}</button>
                ) : null;
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
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