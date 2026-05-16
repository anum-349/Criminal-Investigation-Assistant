/**
 * Admin Dashboard
 * Route: /admin
 *
 * Landing page for the Administrator. Mirrors the layout language used by
 * the Investigator dashboard and the rest of the /admin/* sub-pages (same
 * Card primitive, soft-mist background, deep-ocean accent, mt-14 for the
 * fixed Header, breadcrumb-free since this IS the dashboard root).
 *
 * Dummy data only — wire to backend later via `/api/admin/dashboard`.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Users, Database, Activity, Settings, FileText, ShieldCheck,
  AlertTriangle, CheckCircle2, Clock, HardDrive, Server,
  TrendingUp, TrendingDown, ChevronRight, UserPlus,
  FolderOpen, Bell, Shield, LogIn, LogOut, Pencil, Trash2,
  Plus, Download, Eye,
} from "lucide-react";

import Header from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

// ─── Theme (matches investigator/analytics for visual consistency) ───────────
const COLORS = {
  primary: "#1B3C53",   // deep-ocean
  second:  "#345A76",
  accent:  "#4A90B8",
  light:   "#7FB3D0",
  success: "#16a34a",
  warning: "#d97706",
  danger:  "#dc2626",
};
const PIE_COLORS = ["#1B3C53", "#4A90B8", "#7FB3D0", "#d97706", "#dc2626", "#16a34a"];

// ══════════════════════════════════════════════════════════════════════════════
// DUMMY DATA
// ══════════════════════════════════════════════════════════════════════════════

const STATS = [
  {
    label: "Total Cases",
    value: "3,248",
    change: "+12.4%",
    trend: "up",
    icon: FolderOpen,
    color: "text-deep-ocean",
    bg: "bg-blue-50",
    hint: "vs. last month",
  },
  {
    label: "Active Users",
    value: "47",
    change: "+3",
    trend: "up",
    icon: Users,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    hint: "5 admins · 42 investigators",
  },
  {
    label: "Pending Reports",
    value: "18",
    change: "-5",
    trend: "down",
    icon: FileText,
    color: "text-amber-600",
    bg: "bg-amber-50",
    hint: "awaiting review",
  },
  {
    label: "System Health",
    value: "99.9%",
    change: "Optimal",
    trend: "up",
    icon: ShieldCheck,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    hint: "uptime · 30 days",
  },
];

const QUICK_ACTIONS = [
  {
    icon: Users,
    label: "Manage Users",
    description: "Add, edit, or deactivate accounts",
    path: "/admin/user-management",
    color: "text-deep-ocean",
    bg: "bg-blue-50 hover:bg-blue-100 border-blue-200",
  },
  {
    icon: Database,
    label: "Database",
    description: "Backup, restore, optimize",
    path: "/admin/database",
    color: "text-purple-600",
    bg: "bg-purple-50 hover:bg-purple-100 border-purple-200",
  },
  {
    icon: Activity,
    label: "Audit Logs",
    description: "Review all system actions",
    path: "/admin/audit-logs",
    color: "text-emerald-600",
    bg: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200",
  },
  {
    icon: Settings,
    label: "System Settings",
    description: "Security, policies, theme",
    path: "/admin/settings",
    color: "text-amber-600",
    bg: "bg-amber-50 hover:bg-amber-100 border-amber-200",
  },
];

const MONTHLY_TREND = [
  { month: "Nov", cases: 198, solved: 142, users: 32 },
  { month: "Dec", cases: 224, solved: 168, users: 35 },
  { month: "Jan", cases: 256, solved: 187, users: 38 },
  { month: "Feb", cases: 241, solved: 195, users: 41 },
  { month: "Mar", cases: 289, solved: 218, users: 44 },
  { month: "Apr", cases: 312, solved: 234, users: 47 },
];

const CASE_STATUS = [
  { name: "Under Investigation", value: 1284 },
  { name: "Pending Review", value: 412 },
  { name: "Solved", value: 1098 },
  { name: "Closed",   value: 318 },
  { name: "Archived", value: 136 },
];

const USERS_BY_ROLE = [
  { role: "Investigators", count: 42, color: "#1B3C53" },
  { role: "Admins", count: 5, color: "#4A90B8" },
];

const RECENT_LOGS = [
  { id: "LOG-1042", user: "nadia.admin",    action: "CREATE", module: "User Management", time: "10 min ago", status: "Success" },
  { id: "LOG-1041", user: "rashid.ali",     action: "LOGIN",  module: "Authentication",  time: "23 min ago", status: "Success" },
  { id: "LOG-1040", user: "sara.malik",     action: "UPDATE", module: "Case Management", time: "1 hr ago",   status: "Success" },
  { id: "LOG-1039", user: "kamran.b",       action: "DELETE", module: "Evidence",        time: "2 hr ago",   status: "Success" },
  { id: "LOG-1038", user: "tariq.mehmood",  action: "LOGIN",  module: "Authentication",  time: "3 hr ago",   status: "Failed"  },
  { id: "LOG-1037", user: "nadia.admin",    action: "BACKUP", module: "Database",        time: "5 hr ago",   status: "Success" },
];

const ACTION_COLORS = {
  LOGIN:  "bg-blue-100 text-blue-700",
  LOGOUT: "bg-slate-100 text-slate-600",
  CREATE: "bg-emerald-100 text-emerald-700",
  UPDATE: "bg-amber-100 text-amber-700",
  DELETE: "bg-red-100 text-red-700",
  VIEW:   "bg-cyan-100 text-cyan-700",
  EXPORT: "bg-purple-100 text-purple-700",
  BACKUP: "bg-teal-100 text-teal-700",
};

const SYSTEM_HEALTH = [
  { label: "Database",      value: "Online",  status: "ok",   icon: Database, detail: "142 MB · 12 tables"  },
  { label: "API Server",    value: "Healthy", status: "ok",   icon: Server,   detail: "Avg 84ms response"   },
  { label: "Storage",       value: "68%",     status: "warn", icon: HardDrive, detail: "68 GB / 100 GB used" },
  { label: "Last Backup",   value: "2h ago",  status: "ok",   icon: Clock,    detail: "Auto · Encrypted"    },
];

const HEALTH_STYLES = {
  ok:   { dot: "bg-emerald-500", text: "text-emerald-700", border: "border-emerald-200", bg: "bg-emerald-50" },
  warn: { dot: "bg-amber-500",   text: "text-amber-700",   border: "border-amber-200",   bg: "bg-amber-50"   },
  err:  { dot: "bg-red-500",     text: "text-red-700",     border: "border-red-200",     bg: "bg-red-50"     },
};

const ALERTS = [
  { id: 1, severity: "warning", title: "Storage usage above 65%", detail: "Consider archiving older case files or expanding capacity.", time: "12 min ago" },
  { id: 2, severity: "info",    title: "3 new investigator requests pending", detail: "Review and approve new user signup requests.",   time: "1 hr ago" },
  { id: 3, severity: "success", title: "Scheduled backup completed", detail: "Full encrypted backup completed at 04:00. 142 MB.",        time: "5 hr ago" },
];

const ALERT_STYLES = {
  warning: { icon: AlertTriangle, color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-200"  },
  info:    { icon: Bell,          color: "text-blue-600",    bg: "bg-blue-50",    border: "border-blue-200"   },
  success: { icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200"},
  error:   { icon: AlertTriangle, color: "text-red-600",     bg: "bg-red-50",     border: "border-red-200"    },
};

// ══════════════════════════════════════════════════════════════════════════════
// CHART HELPERS
// ══════════════════════════════════════════════════════════════════════════════

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

const StatCard = ({ stat }) => {
  const TrendIcon = stat.trend === "up" ? TrendingUp : TrendingDown;
  const trendColor = stat.trend === "up" ? "text-emerald-600" : "text-red-500";
  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${stat.bg}`}>
          <stat.icon className={`h-5 w-5 ${stat.color}`} />
        </div>
        <span className={`flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
          <TrendIcon className="h-3.5 w-3.5" />
          {stat.change}
        </span>
      </div>
      <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
      <p className="text-sm text-slate-600 font-medium mt-1">{stat.label}</p>
      <p className="text-xs text-slate-400 mt-1">{stat.hint}</p>
    </Card>
  );
};

const QuickActionCard = ({ action, onClick }) => (
  <button
    onClick={onClick}
    className={`text-left p-5 rounded-xl border ${action.bg} transition-all cursor-pointer hover:shadow-md group`}
  >
    <div className="flex items-start justify-between mb-3">
      <action.icon className={`h-6 w-6 ${action.color}`} />
      <ChevronRight className={`h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform ${action.color}`} />
    </div>
    <p className="font-bold text-slate-800 text-sm">{action.label}</p>
    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{action.description}</p>
  </button>
);

// ══════════════════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════════════════

export default function AdminPage() {
  const navigate = useNavigate();

  const totalCases = useMemo(
    () => CASE_STATUS.reduce((sum, s) => sum + s.value, 0),
    []
  );

  return (
    <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-14">
      <Header />

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-8 space-y-6">
        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Shield className="h-6 w-6 text-deep-ocean" />
              Admin Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              System overview, user management, and operational health at a glance.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            Last refreshed: just now
          </div>
        </div>

        {/* ── Stats Row ── */}
        <section aria-label="Key Statistics">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((s) => <StatCard key={s.label} stat={s} />)}
          </div>
        </section>

        {/* ── Quick Actions ── */}
        <section aria-label="Quick Actions">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {QUICK_ACTIONS.map((a) => (
              <QuickActionCard key={a.label} action={a} onClick={() => navigate(a.path)} />
            ))}
          </div>
        </section>

        {/* ── Charts Row ── */}
        <section aria-label="Analytics" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Monthly Trend — spans 2 cols */}
          <Card className="lg:col-span-2 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Cases & User Activity</h3>
                <p className="text-xs text-slate-500 mt-0.5">Last 6 months</p>
              </div>
              <button
                onClick={() => navigate("/admin/analytics")}
                className="text-xs font-medium text-deep-ocean hover:underline cursor-pointer flex items-center gap-1"
              >
                View analytics <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MONTHLY_TREND} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="cases"  stroke={COLORS.primary} strokeWidth={2.5} dot={{ r: 4 }} name="New Cases" />
                  <Line type="monotone" dataKey="solved" stroke={COLORS.success} strokeWidth={2.5} dot={{ r: 4 }} name="Solved" />
                  <Line type="monotone" dataKey="users"  stroke={COLORS.accent}  strokeWidth={2}   dot={{ r: 3 }} strokeDasharray="5 5" name="Active Users" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Case Status Pie */}
          <Card className="p-5">
            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-800">Case Status</h3>
              <p className="text-xs text-slate-500 mt-0.5">{totalCases.toLocaleString()} total cases</p>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={CASE_STATUS}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    outerRadius={75} innerRadius={42}
                    paddingAngle={3}
                  >
                    {CASE_STATUS.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {CASE_STATUS.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                    {s.name}
                  </span>
                  <span className="font-semibold text-slate-800">{s.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ── Recent Activity + System Health Row ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Audit Logs — spans 2 cols */}
          <Card className="lg:col-span-2 p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-deep-ocean" />
                  Recent Activity
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Latest actions across the system</p>
              </div>
              <button
                onClick={() => navigate("/admin/audit-logs")}
                className="text-xs font-medium text-deep-ocean hover:underline cursor-pointer flex items-center gap-1"
              >
                View all <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Log ID", "User", "Action", "Module", "Status", "Time"].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2.5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {RECENT_LOGS.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{log.id}</td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{log.user}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${ACTION_COLORS[log.action] || "bg-slate-100 text-slate-600"}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{log.module}</td>
                      <td className="px-4 py-3">
                        <Badge variant={log.status === "Success" ? "success" : "destructive"}>
                          {log.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{log.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* System Health */}
          <Card className="p-5">
            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-deep-ocean" />
                System Health
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Live operational status</p>
            </div>
            <div className="space-y-3">
              {SYSTEM_HEALTH.map((h) => {
                const style = HEALTH_STYLES[h.status];
                return (
                  <div key={h.label} className={`flex items-center gap-3 p-3 rounded-lg border ${style.border} ${style.bg}`}>
                    <h.icon className="h-4 w-4 text-slate-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{h.label}</p>
                      <p className="text-xs text-slate-500 truncate">{h.detail}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse`} />
                      <span className={`text-xs font-semibold ${style.text}`}>{h.value}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        {/* ── Alerts + User Breakdown Row ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Alerts */}
          <Card className="lg:col-span-2 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Bell className="h-4 w-4 text-deep-ocean" />
                  System Alerts
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Notifications requiring attention</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-deep-ocean/10 text-deep-ocean font-semibold">
                {ALERTS.length} active
              </span>
            </div>
            <div className="space-y-3">
              {ALERTS.map((alert) => {
                const style = ALERT_STYLES[alert.severity];
                return (
                  <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg border ${style.border} ${style.bg}`}>
                    <style.icon className={`h-4 w-4 ${style.color} shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{alert.title}</p>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{alert.detail}</p>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">{alert.time}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Users by Role */}
          <Card className="p-5">
            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Users className="h-4 w-4 text-deep-ocean" />
                Users by Role
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {USERS_BY_ROLE.reduce((s, u) => s + u.count, 0)} total accounts
              </p>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={USERS_BY_ROLE} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis dataKey="role" type="category" tick={{ fontSize: 11, fill: "#475569" }} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {USERS_BY_ROLE.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <button
              onClick={() => navigate("/admin/user-management")}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2 rounded-lg bg-deep-ocean text-white text-sm font-medium hover:bg-deep-ocean/90 transition-colors cursor-pointer"
            >
              <UserPlus className="h-4 w-4" /> Add New User
            </button>
          </Card>
        </section>
      </main>
    </div>
  );
}