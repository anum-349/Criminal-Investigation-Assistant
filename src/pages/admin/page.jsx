import { useEffect, useState } from "react";
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
  Plus, Download, Eye, Loader2,
} from "lucide-react";

import Header from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { fetchAdminDashboard, formatApiError } from "@/services/adminApi";

// ─── Theme ────────────────────────────────────────────────────────────────────
const COLORS = {
  primary: "#1B3C53", second: "#345A76", accent: "#4A90B8",
  light: "#7FB3D0", success: "#16a34a", warning: "#d97706", danger: "#dc2626",
};
const PIE_COLORS = ["#1B3C53", "#4A90B8", "#7FB3D0", "#d97706", "#dc2626", "#16a34a"];

// Static map from KPI label → icon + bg/color classes. Keeps the look
// consistent regardless of what the backend returns.
const KPI_VISUAL = {
  "Total Cases":     { icon: FolderOpen,  bg: "bg-blue-50",    color: "text-deep-ocean" },
  "Active Users":    { icon: Users,       bg: "bg-emerald-50", color: "text-emerald-600" },
  "Pending Cases":   { icon: FileText,    bg: "bg-amber-50",   color: "text-amber-600" },
  "Pending Reports": { icon: FileText,    bg: "bg-amber-50",   color: "text-amber-600" },
  "System Health":   { icon: ShieldCheck, bg: "bg-emerald-50", color: "text-emerald-600" },
};

const ALERT_STYLES = {
  critical: { border: "border-red-200",    bg: "bg-red-50",    color: "text-red-700",    icon: AlertTriangle },
  warning:  { border: "border-amber-200",  bg: "bg-amber-50",  color: "text-amber-700",  icon: AlertTriangle },
  info:     { border: "border-blue-200",   bg: "bg-blue-50",   color: "text-blue-700",   icon: Bell },
};

const QUICK_ACTIONS = [
  { icon: Users,    label: "Manage Users",    description: "Add, edit, or deactivate accounts", path: "/admin/users",
    color: "text-deep-ocean",  bg: "bg-blue-50 hover:bg-blue-100 border-blue-200" },
  { icon: FolderOpen, label: "All Cases",     description: "View, delete, or re-assign cases",  path: "/admin/cases",
    color: "text-cyan-600",    bg: "bg-cyan-50 hover:bg-cyan-100 border-cyan-200" },
  { icon: Database, label: "Database",        description: "Backup, restore, optimize",         path: "/admin/database",
    color: "text-purple-600",  bg: "bg-purple-50 hover:bg-purple-100 border-purple-200" },
  { icon: Activity, label: "Audit Logs",      description: "Review all system actions",         path: "/admin/audit-logs",
    color: "text-emerald-600", bg: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200" },
];

// ─── Cards ────────────────────────────────────────────────────────────────────
const StatCard = ({ stat }) => {
  const v = KPI_VISUAL[stat.label] || KPI_VISUAL["Total Cases"];
  const TrendIcon = stat.trend === "up" ? TrendingUp : TrendingDown;
  const trendColor = stat.trend === "up" ? "text-emerald-600"
                   : stat.trend === "down" ? "text-red-500"
                   : "text-slate-400";
  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${v.bg}`}>
          <v.icon className={`h-5 w-5 ${v.color}`} />
        </div>
        {stat.change && (
          <span className={`flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            {stat.change}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
      <p className="text-sm text-slate-600 font-medium mt-1">{stat.label}</p>
      {stat.hint && <p className="text-xs text-slate-400 mt-1">{stat.hint}</p>}
    </Card>
  );
};

const StatSkeleton = () => (
  <Card className="p-5">
    <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse mb-3" />
    <div className="h-7 w-20 bg-slate-200 rounded animate-pulse mb-2" />
    <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
  </Card>
);

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

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const payload = await fetchAdminDashboard();
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) setError(formatApiError(err, "Could not load dashboard."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const totalCases = (data?.case_status || []).reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-14">
      <Header />

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-8 space-y-6">
        {/* Page Header */}
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
            {loading ? "Loading…" : "Last refreshed: just now"}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Could not load dashboard</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <section aria-label="Key Statistics">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
              : (data?.stats || []).map(s => <StatCard key={s.label} stat={s} />)}
          </div>
        </section>

        {/* Quick Actions */}
        <section aria-label="Quick Actions">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {QUICK_ACTIONS.map(a => (
              <QuickActionCard key={a.label} action={a} onClick={() => navigate(a.path)} />
            ))}
          </div>
        </section>

        {/* Charts Row */}
        <section aria-label="Analytics" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Cases & User Activity</h3>
                <p className="text-xs text-slate-500 mt-0.5">Last 6 months</p>
              </div>
              <button onClick={() => navigate("/admin/analytics")}
                className="text-xs font-medium text-deep-ocean hover:underline cursor-pointer flex items-center gap-1">
                View analytics <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            {loading ? (
              <div className="h-64 bg-slate-100 rounded-lg animate-pulse flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data?.monthly_trend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="cases"  stroke={COLORS.primary} strokeWidth={2.5} name="New Cases" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="solved" stroke={COLORS.success} strokeWidth={2.5} name="Solved"    dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="users"  stroke={COLORS.accent}  strokeWidth={2}   name="Active Users" dot={{ r: 3 }} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Case status pie */}
          <Card className="p-5">
            <h3 className="text-base font-bold text-slate-800">Cases by Status</h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">{totalCases.toLocaleString()} total</p>
            {loading ? (
              <div className="h-56 bg-slate-100 rounded-lg animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data?.case_status || []} dataKey="value" nameKey="name"
                       cx="50%" cy="50%" innerRadius={45} outerRadius={75} fontSize={10}>
                    {(data?.case_status || []).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </section>

        {/* Alerts + Users by Role */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Bell className="h-4 w-4 text-deep-ocean" /> System Alerts
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Notifications requiring attention</p>
              </div>
              {!loading && (
                <span className="text-xs px-2 py-1 rounded-full bg-deep-ocean/10 text-deep-ocean font-semibold">
                  {(data?.alerts || []).length} active
                </span>
              )}
            </div>
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
                ))
              ) : (data?.alerts || []).map(alert => {
                const style = ALERT_STYLES[alert.severity] || ALERT_STYLES.info;
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

          <Card className="p-5">
            <h3 className="text-base font-bold text-slate-800">Users by Role</h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">Current platform users</p>
            {loading ? (
              <div className="h-44 bg-slate-100 rounded-lg animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data?.users_by_role || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="role" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Bar dataKey="count" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </section>

        {/* Recent activity */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Activity className="h-4 w-4 text-deep-ocean" /> Recent Activity
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Latest audit log entries</p>
            </div>
            <button onClick={() => navigate("/admin/audit-logs")}
              className="text-xs font-medium text-deep-ocean hover:underline cursor-pointer flex items-center gap-1">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Log ID", "User", "Action", "Module", "Status", "Time"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-2 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : (data?.recent_logs || []).length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-6 text-slate-400 text-sm">No recent activity.</td></tr>
                ) : (data?.recent_logs || []).map(l => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-2 py-2 font-mono text-xs text-slate-500 whitespace-nowrap">{l.id}</td>
                    <td className="px-2 py-2 text-xs text-slate-700 whitespace-nowrap">{l.user}</td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{l.action}</span>
                    </td>
                    <td className="px-2 py-2 text-xs text-slate-600 whitespace-nowrap">{l.module}</td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <Badge variant={l.status === "Success" ? "success" : "destructive"}>{l.status}</Badge>
                    </td>
                    <td className="px-2 py-2 text-xs text-slate-400 whitespace-nowrap">{l.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
