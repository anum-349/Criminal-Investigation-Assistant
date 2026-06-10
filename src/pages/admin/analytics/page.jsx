/**
 * src/pages/admin/analytics/page.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin — System Analytics.
 * Route: /admin/analytics
 *
 * Backend integration (services/analyticsApi.js):
 *   - GET /api/analytics/overview     → summary, monthlyTrend, crimeByProvince, statusDist
 *   - GET /api/analytics/trends       → severityTrend, monthlyTrend
 *   - GET /api/analytics/breakdown    → current/previous counts by crime type
 *   - GET /api/analytics/predictions  → forecasted trends
 *
 * The analytics service is shared with investigators; admin gets the same
 * shape but the data is system-wide (all cases). We render four panels:
 * top KPIs, monthly trend, crime-by-province, status distribution.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard, ChevronRight, BarChart3, TrendingUp,
  Users, FolderOpen, AlertTriangle, Clock, Loader2,
  Download, ShieldAlert,
} from "lucide-react";

import Header from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { fetchOverview } from "@/services/analyticsApi";
import { formatApiError } from "@/services/adminApi";

// ── Theme ────────────────────────────────────────────────────────────────────
const COLORS = {
  primary: "#1B3C53", second: "#345A76", accent: "#4A90B8",
  light: "#7FB3D0", success: "#16a34a", warning: "#d97706", danger: "#dc2626",
};
const PIE_COLORS = ["#1B3C53", "#4A90B8", "#7FB3D0", "#16a34a", "#d97706", "#dc2626", "#8b5cf6"];

const DATE_RANGES = ["Last 3 months", "Last 6 months", "Last 9 months", "This year"];
const PROVINCES   = ["All Provinces", "Punjab", "Sindh", "Balochistan", "KPK", "ICT", "GB"];
const CRIME_TYPES = ["All Types", "Murder", "Robbery", "Theft", "Assault", "Fraud", "Kidnapping", "Drug"];

const ChartCard = ({ title, subtitle, children, action }) => (
  <Card className="p-5">
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-base font-bold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </Card>
);

// ═════════════════════════════════════════════════════════════════════════════
// PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function AdminAnalyticsPage() {
  const navigate = useNavigate();

  // Filters
  const [dateRange, setDateRange] = useState("Last 6 months");
  const [province, setProvince]   = useState("All Provinces");
  const [crimeType, setCrimeType] = useState("All Types");

  // Data
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchOverview({ dateRange, province, crimeType })
      .then(d => { if (!cancelled) setData(d); })
      .catch(err => { if (!cancelled) setError(formatApiError(err, "Could not load analytics.")); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [dateRange, province, crimeType]);

  // Render KPI tile from server's `summary` shape
  const summary = data?.summary;
  const kpis = [
    {
      label: "Total Cases",   value: summary?.totalCases?.toLocaleString() || "—",
      change: summary?.totalCasesChange,
      icon: FolderOpen, color: "text-deep-ocean",  bg: "bg-blue-50",
    },
    {
      label: "Solved (Month)", value: summary?.solvedThisMonth?.toLocaleString() || "—",
      change: summary?.solvedChange,
      icon: ShieldAlert, color: "text-emerald-600", bg: "bg-emerald-50",
    },
    {
      label: "Avg. Resolution", value: summary?.avgResolutionDays != null ? `${summary.avgResolutionDays}d` : "—",
      change: summary?.avgResolutionChange,
      icon: Clock, color: "text-purple-600", bg: "bg-purple-50",
    },
    {
      label: "High Severity",  value: summary?.highSeverity?.toLocaleString() || "—",
      change: summary?.highSeverityChange,
      icon: AlertTriangle, color: "text-red-600",   bg: "bg-red-50",
    },
  ];

  return (
    <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-10">
      <Header />

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <button onClick={() => navigate("/admin")}
            className="flex items-center gap-1.5 hover:text-slate-800 transition-colors cursor-pointer">
            <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
          </button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-800 font-medium">Analytics</span>
        </nav>

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-deep-ocean" /> System Analytics
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Platform-wide metrics across all investigators and cases
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <select value={dateRange} onChange={e => setDateRange(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean">
              {DATE_RANGES.map(d => <option key={d}>{d}</option>)}
            </select>
            <select value={province} onChange={e => setProvince(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean">
              {PROVINCES.map(p => <option key={p}>{p}</option>)}
            </select>
            <select value={crimeType} onChange={e => setCrimeType(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean">
              {CRIME_TYPES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Could not load analytics</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(k => (
            <Card key={k.label} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${k.bg}`}>
                  <k.icon className={`h-5 w-5 ${k.color}`} />
                </div>
                {k.change && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <TrendingUp className="h-3 w-3" /> {k.change}
                  </span>
                )}
              </div>
              <p className="text-3xl font-bold text-slate-800">
                {loading ? <span className="inline-block w-16 h-7 bg-slate-200 rounded animate-pulse" /> : k.value}
              </p>
              <p className="text-sm text-slate-600 font-medium mt-1">{k.label}</p>
            </Card>
          ))}
        </div>

        {/* Monthly trend + Crime by province */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ChartCard title="Cases & Solved Trend" subtitle={`Trend over ${dateRange.toLowerCase()}`}>
              {loading ? (
                <div className="h-72 bg-slate-100 rounded-lg animate-pulse flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data?.monthlyTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="cases"  stroke={COLORS.primary} strokeWidth={2.5} name="New Cases" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="solved" stroke={COLORS.success} strokeWidth={2.5} name="Solved"    dot={{ r: 3 }} />
                    {data?.monthlyTrend?.[0]?.leads !== undefined && (
                      <Line type="monotone" dataKey="leads" stroke={COLORS.accent} strokeWidth={2}
                        name="Leads" dot={{ r: 3 }} strokeDasharray="4 4" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <ChartCard title="Cases by Status" subtitle="Current distribution">
            {loading ? (
              <div className="h-72 bg-slate-100 rounded-lg animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data?.statusDist || []} dataKey="value" nameKey="name"
                       cx="50%" cy="50%" innerRadius={45} outerRadius={85} fontSize={10}>
                    {(data?.statusDist || []).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Crime by province */}
        <ChartCard title="Crime by Province" subtitle="Top regions by case count">
          {loading ? (
            <div className="h-72 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data?.crimeByProvince || []} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={110} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="value" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </main>
    </div>
  );
}
