import { useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ReferenceLine, Area, AreaChart
} from 'recharts';
import {
    TrendingUp, BarChart2, PieChart as PieIcon, Map,
    Download, Filter, ChevronRight, ArrowLeft, LayoutDashboard,
    Calendar, RefreshCw, AlertTriangle, CheckCircle2, Clock,
    Zap, ShieldAlert, TrendingDown, Info
} from 'lucide-react';
import Header from '../../../components/Header';
import { Card } from '../../../components/ui/Card';

// ── Theme colors ──────────────────────────────────────────────────────────────
const COLORS = {
    primary: '#1B3C53',
    second: '#345A76',
    accent: '#4A90B8',
    light: '#7FB3D0',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
    muted: '#94a3b8',
};

const PIE_COLORS = ['#1B3C53', '#345A76', '#4A90B8', '#7FB3D0', '#dc2626', '#d97706', '#16a34a', '#8b5cf6'];

// ── Mock data (replace with API calls) ───────────────────────────────────────

const MONTHLY_TREND = [
    { month: 'Jul', cases: 38, solved: 22, leads: 45 },
    { month: 'Aug', cases: 42, solved: 28, leads: 52 },
    { month: 'Sep', cases: 35, solved: 19, leads: 38 },
    { month: 'Oct', cases: 51, solved: 34, leads: 63 },
    { month: 'Nov', cases: 47, solved: 31, leads: 58 },
    { month: 'Dec', cases: 60, solved: 40, leads: 72 },
    { month: 'Jan', cases: 55, solved: 36, leads: 66 },
    { month: 'Feb', cases: 48, solved: 30, leads: 54 },
    { month: 'Mar', cases: 67, solved: 45, leads: 80 },
];

const CRIME_BY_TYPE = [
    { type: 'Murder', count: 28, prev: 22 },
    { type: 'Robbery', count: 45, prev: 38 },
    { type: 'Theft', count: 67, prev: 71 },
    { type: 'Assault', count: 39, prev: 33 },
    { type: 'Fraud', count: 31, prev: 28 },
    { type: 'Kidnapping', count: 14, prev: 11 },
    { type: 'Drug', count: 22, prev: 19 },
];

const CRIME_BY_PROVINCE = [
    { name: 'Punjab', value: 38 },
    { name: 'Sindh', value: 28 },
    { name: 'Balochistan', value: 14 },
    { name: 'KPK', value: 12 },
    { name: 'ICT', value: 5 },
    { name: 'GB', value: 3 },
];

const STATUS_DIST = [
    { name: 'Active', value: 42 },
    { name: 'Pending', value: 18 },
    { name: 'Closed', value: 80 },
    { name: 'Archived', value: 15 },
];

const WEEKLY_HEATMAP = {
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    hours: ['00', '03', '06', '09', '12', '15', '18', '21'],
    data: [
        [1, 0, 0, 2, 3, 4, 5, 3],
        [2, 1, 0, 3, 4, 6, 7, 4],
        [1, 0, 1, 2, 5, 5, 6, 3],
        [0, 0, 0, 3, 4, 7, 8, 5],
        [2, 1, 0, 4, 5, 6, 9, 6],
        [3, 2, 1, 2, 3, 4, 5, 4],
        [1, 0, 0, 1, 2, 3, 4, 2],
    ],
};

const SEVERITY_TREND = [
    { month: 'Jul', critical: 5, high: 12, medium: 14, low: 7 },
    { month: 'Aug', critical: 7, high: 14, medium: 13, low: 8 },
    { month: 'Sep', critical: 4, high: 10, medium: 13, low: 8 },
    { month: 'Oct', critical: 9, high: 18, medium: 16, low: 8 },
    { month: 'Nov', critical: 8, high: 16, medium: 15, low: 8 },
    { month: 'Dec', critical: 11, high: 20, medium: 18, low: 11 },
    { month: 'Jan', critical: 10, high: 18, medium: 17, low: 10 },
    { month: 'Feb', critical: 8, high: 15, medium: 16, low: 9 },
    { month: 'Mar', critical: 13, high: 22, medium: 21, low: 11 },
];

const SUMMARY_STATS = [
    { label: 'Total Cases', value: '246', change: '+12%', up: true, icon: BarChart2 },
    { label: 'Solved This Month', value: '45', change: '+8%', up: true, icon: CheckCircle2 },
    { label: 'Avg Resolution', value: '18d', change: '-3d', up: true, icon: Clock },
    { label: 'High Severity', value: '34', change: '+5%', up: false, icon: AlertTriangle },
];

// ── Prediction mock data (replace with ML API response) ──────────────────────

// Historical + predicted — predicted months marked with isPrediction: true
const PREDICTION_TREND = [
    { month: 'Nov', cases: 47, predicted: null, upper: null, lower: null },
    { month: 'Dec', cases: 60, predicted: null, upper: null, lower: null },
    { month: 'Jan', cases: 55, predicted: null, upper: null, lower: null },
    { month: 'Feb', cases: 48, predicted: null, upper: null, lower: null },
    { month: 'Mar', cases: 67, predicted: null, upper: null, lower: null },
    // Predicted months — no actual, show dashed + confidence band
    { month: 'Apr', cases: null, predicted: 72, upper: 80, lower: 64 },
    { month: 'May', cases: null, predicted: 78, upper: 89, lower: 67 },
    { month: 'Jun', cases: null, predicted: 69, upper: 82, lower: 56 },
];

const PROVINCE_FORECAST = [
    { province: 'Punjab', current: 45, forecast: 52, change: 15.6 },
    { province: 'Sindh', current: 38, forecast: 44, change: 15.8 },
    { province: 'KPK', current: 12, forecast: 16, change: 33.3 },
    { province: 'Balochistan', current: 14, forecast: 13, change: -7.1 },
    { province: 'ICT', current: 5, forecast: 7, change: 40.0 },
];

const CRIME_FORECAST = [
    { type: 'Robbery', current: 45, forecast: 53, change: 17.8 },
    { type: 'Theft', current: 67, forecast: 61, change: -9.0 },
    { type: 'Murder', current: 28, forecast: 34, change: 21.4 },
    { type: 'Assault', current: 39, forecast: 45, change: 15.4 },
    { type: 'Fraud', current: 31, forecast: 29, change: -6.5 },
];

const PATTERN_ALERTS = [
    {
        id: 1,
        severity: 'critical',
        title: 'Robbery spike predicted — Karachi',
        description: 'Model detects a 78% probability of a significant robbery cluster in Clifton and DHA areas within the next 2 weeks, based on historical patterns and recent activity.',
        confidence: 78,
        timeframe: 'Next 2 weeks',
        crimeType: 'Robbery',
        province: 'Sindh',
    },
    {
        id: 2,
        severity: 'high',
        title: 'Seasonal theft increase — Punjab',
        description: 'Based on 3-year seasonal patterns, vehicle thefts in Lahore and Faisalabad are predicted to rise by 20–30% during April–May.',
        confidence: 85,
        timeframe: 'Next 4–6 weeks',
        crimeType: 'Theft',
        province: 'Punjab',
    },
    {
        id: 3,
        severity: 'medium',
        title: 'Fraud pattern emerging — ICT',
        description: 'Clustering algorithm detected a potential organized fraud network in Islamabad with 3 cases showing similar MO in the last 30 days.',
        confidence: 62,
        timeframe: 'Ongoing',
        crimeType: 'Fraud',
        province: 'ICT',
    },
    {
        id: 4,
        severity: 'low',
        title: 'Crime rate stabilizing — Balochistan',
        description: 'Prediction model shows a likely 7% decrease in reported cases in Quetta over the next month based on recent resolution trends.',
        confidence: 71,
        timeframe: 'Next month',
        crimeType: 'All types',
        province: 'Balochistan',
    },
];

const MODEL_STATS = [
    { label: 'Model Accuracy', value: '87%', sub: 'On last 6-month backtest' },
    { label: 'Data Points Used', value: '2,841', sub: 'Cases in training window' },
    { label: 'Last Trained', value: '10 Mar 2026', sub: 'Monthly retraining cycle' },
    { label: 'Forecast Horizon', value: '3 months', sub: 'Maximum reliable window' },
];

const ALERT_STYLE = {
    critical: { border: 'border-red-200', bg: 'bg-red-50', badge: 'bg-red-600 text-white', icon: ShieldAlert, iconColor: 'text-red-600' },
    high: { border: 'border-orange-200', bg: 'bg-orange-50', badge: 'bg-orange-500 text-white', icon: AlertTriangle, iconColor: 'text-orange-500' },
    medium: { border: 'border-yellow-200', bg: 'bg-yellow-50', badge: 'bg-yellow-500 text-white', icon: TrendingUp, iconColor: 'text-yellow-600' },
    low: { border: 'border-green-200', bg: 'bg-green-50', badge: 'bg-green-600 text-white', icon: TrendingDown, iconColor: 'text-green-600' },
};

const DATE_RANGES = ['Last 3 months', 'Last 6 months', 'Last 9 months', 'This year'];
const PROVINCES = ['All Provinces', 'Punjab', 'Sindh', 'Balochistan', 'KPK', 'ICT', 'GB'];
const CRIME_TYPES = ['All Types', 'Murder', 'Robbery', 'Theft', 'Assault', 'Fraud', 'Kidnapping', 'Drug'];

// ── Custom tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3 text-xs">
            <p className="font-bold text-slate-700 mb-2">{label}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 mb-0.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-600 capitalize">{entry.name}:</span>
                    <span className="font-semibold text-slate-800">{entry.value}</span>
                </div>
            ))}
        </div>
    );
};

// ── Heatmap cell helper ───────────────────────────────────────────────────────
const heatColor = (val) => {
    if (val === 0) return 'bg-slate-100';
    if (val <= 2) return 'bg-blue-200';
    if (val <= 4) return 'bg-blue-400';
    if (val <= 6) return 'bg-orange-400';
    return 'bg-red-500';
};

// ── Export helpers ────────────────────────────────────────────────────────────
const exportCSV = (data, filename) => {
    const keys = Object.keys(data[0]);
    const csv = [keys.join(','), ...data.map(row => keys.map(k => row[k]).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
};

const exportPNG = (chartRef, filename) => {
    const svg = chartRef.current?.querySelector('svg');
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
};

// ── Section wrapper ───────────────────────────────────────────────────────────
const ChartCard = ({ title, subtitle, onExportCSV, onExportPNG, children }) => (
    <Card className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
            <div>
                <h3 className="text-base font-bold text-slate-800">{title}</h3>
                {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            <div className="flex gap-1.5 shrink-0">
                {onExportCSV && (
                    <button onClick={onExportCSV}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                        <Download className="h-3 w-3" /> CSV
                    </button>
                )}
                {onExportPNG && (
                    <button onClick={onExportPNG}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                        <Download className="h-3 w-3" /> PNG
                    </button>
                )}
            </div>
        </div>
        {children}
    </Card>
);

// ═════════════════════════════════════════════════════════════════════════════
const AnalyticsPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // ── Filter state ─────────────────────────────────────────────────────
    const [dateRange, setDateRange] = useState('Last 9 months');
    const [province, setProvince] = useState('All Provinces');
    const [crimeType, setCrimeType] = useState('All Types');

    // Read tab from URL — Analytics → Predictions nav sets ?tab=predictions
    const [activeView, setActiveView] = useState(searchParams.get('tab') || 'overview');

    // Chart refs for PNG export
    const trendRef = useRef(null);
    const barRef = useRef(null);
    const severityRef = useRef(null);
    const predRef = useRef(null);

    // ── Filter monthly data by date range ────────────────────────────────
    const filteredMonthly = useMemo(() => {
        const count = dateRange === 'Last 3 months' ? 3
            : dateRange === 'Last 6 months' ? 6
                : dateRange === 'This year' ? 12
                    : 9;
        return MONTHLY_TREND.slice(-count);
    }, [dateRange]);

    const filteredSeverity = useMemo(() => {
        const count = dateRange === 'Last 3 months' ? 3
            : dateRange === 'Last 6 months' ? 6
                : dateRange === 'This year' ? 12
                    : 9;
        return SEVERITY_TREND.slice(-count);
    }, [dateRange]);

    // ── Filter crime by type ──────────────────────────────────────────────
    const filteredCrimeType = useMemo(() => {
        if (crimeType === 'All Types') return CRIME_BY_TYPE;
        return CRIME_BY_TYPE.filter(c => c.type === crimeType);
    }, [crimeType]);

    const VIEWS = [
        { id: 'overview', label: 'Overview', icon: BarChart2 },
        { id: 'trends', label: 'Time Trends', icon: TrendingUp },
        { id: 'breakdown', label: 'Crime Breakdown', icon: PieIcon },
        { id: 'heatmap', label: 'Time Heatmap', icon: Map },
        { id: 'predictions', label: 'Predictions', icon: Zap },
    ];

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900 mt-14">
            <Header />

            <main className="max-w-7xl mx-auto px-4 lg:px-6 py-8 space-y-6">

                {/* Breadcrumb + nav */}
                <div className="flex items-center justify-between">
                    <nav className="flex items-center gap-1.5 text-xs text-slate-500">
                        <button
                            onClick={() => navigate("/investigator")}
                            className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <LayoutDashboard className="h-3.5 w-3.5" />
                            Dashboard
                        </button>
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-slate-800 font-medium">Analytics & Trends</span>
                    </nav>
                </div>

                {/* Page header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Analytics & Trends</h1>
                        <p className="text-sm text-slate-500 mt-1">Visualize crime patterns, trends, and case statistics</p>
                    </div>
                    <button className="flex cursor-pointer items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-600 hover:bg-slate-50 transition-colors self-start"
                    onClick={()=>{window.location.reload}}>
                        <RefreshCw className="h-4 w-4" /> Refresh
                    </button>
                </div>

                {/* ── Filter bar ── */}
                <Card className="p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <Filter className="h-3.5 w-3.5" /> Filters
                        </div>

                        {/* Date range */}
                        <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <select value={dateRange} onChange={e => setDateRange(e.target.value)}
                                className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-deep-ocean">
                                {DATE_RANGES.map(d => <option key={d}>{d}</option>)}
                            </select>
                        </div>

                        {/* Province */}
                        <select value={province} onChange={e => setProvince(e.target.value)}
                            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-deep-ocean">
                            {PROVINCES.map(p => <option key={p}>{p}</option>)}
                        </select>

                        {/* Crime type */}
                        <select value={crimeType} onChange={e => setCrimeType(e.target.value)}
                            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-deep-ocean">
                            {CRIME_TYPES.map(c => <option key={c}>{c}</option>)}
                        </select>

                        {/* Reset */}
                        <button onClick={() => { setDateRange('Last 9 months'); setProvince('All Provinces'); setCrimeType('All Types'); }}
                            className="text-xs text-slate-500 cursor-pointer hover:text-slate-800 underline transition-colors ml-auto">
                            Reset filters
                        </button>
                    </div>
                </Card>

                {/* ── View tabs ── */}
                <div className="flex gap-2 flex-wrap">
                    {VIEWS.map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => setActiveView(id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer text-sm font-medium transition-all
                                ${activeView === id
                                    ? 'bg-deep-ocean text-white shadow-sm'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:border-deep-ocean hover:text-deep-ocean'
                                }`}>
                            <Icon className="h-3.5 w-3.5" />{label}
                        </button>
                    ))}
                </div>

                {/* ══════════════════════════════════════════════════════════
                    OVERVIEW VIEW
                ══════════════════════════════════════════════════════════ */}
                {activeView === 'overview' && (
                    <div className="space-y-6">

                        {/* Summary stat cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {SUMMARY_STATS.map(({ label, value, change, up, icon: Icon }) => (
                                <Card key={label} className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-slate-500 font-medium">{label}</p>
                                        <Icon className={`h-4 w-4 ${up ? 'text-green-500' : 'text-red-500'}`} />
                                    </div>
                                    <p className="text-2xl font-bold text-slate-800">{value}</p>
                                    <p className={`text-xs font-semibold ${up ? 'text-green-600' : 'text-red-600'}`}>
                                        {change} vs last period
                                    </p>
                                </Card>
                            ))}
                        </div>

                        {/* Cases + solved line chart */}
                        <ChartCard
                            title="Monthly Case Overview"
                            subtitle="New cases registered vs solved per month"
                            onExportCSV={() => exportCSV(filteredMonthly, 'monthly-trend.csv')}
                            onExportPNG={() => exportPNG(trendRef, 'monthly-trend.svg')}
                        >
                            <div ref={trendRef} className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={filteredMonthly} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        <Line type="monotone" dataKey="cases" stroke={COLORS.danger} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} name="New Cases" />
                                        <Line type="monotone" dataKey="solved" stroke={COLORS.success} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Solved" />
                                        <Line type="monotone" dataKey="leads" stroke={COLORS.accent} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Leads" strokeDasharray="5 5" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>

                        {/* Two-col: province pie + status pie */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartCard
                                title="Cases by Province"
                                subtitle="Geographic distribution"
                                onExportCSV={() => exportCSV(CRIME_BY_PROVINCE, 'cases-by-province.csv')}
                            >
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={CRIME_BY_PROVINCE} dataKey="value" nameKey="name"
                                                cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                                                paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                labelLine={false}
                                            >
                                                {CRIME_BY_PROVINCE.map((_, i) => (
                                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(v, n) => [v, n]} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </ChartCard>

                            <ChartCard
                                title="Case Status Distribution"
                                subtitle="Active, pending, closed, archived"
                                onExportCSV={() => exportCSV(STATUS_DIST, 'status-distribution.csv')}
                            >
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={STATUS_DIST} dataKey="value" nameKey="name"
                                                cx="50%" cy="50%" outerRadius={80}
                                                paddingAngle={3}
                                            >
                                                {STATUS_DIST.map((_, i) => (
                                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend wrapperStyle={{ fontSize: 11 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </ChartCard>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    TIME TRENDS VIEW
                ══════════════════════════════════════════════════════════ */}
                {activeView === 'trends' && (
                    <div className="space-y-6">

                        {/* Severity over time stacked bar */}
                        <ChartCard
                            title="Cases by Severity Over Time"
                            subtitle="Monthly breakdown — critical, high, medium, low"
                            onExportCSV={() => exportCSV(filteredSeverity, 'severity-trend.csv')}
                            onExportPNG={() => exportPNG(severityRef, 'severity-trend.svg')}
                        >
                            <div ref={severityRef} className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={filteredSeverity} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        <Bar dataKey="critical" stackId="a" fill="#dc2626" name="Critical" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="high" stackId="a" fill="#f97316" name="High" />
                                        <Bar dataKey="medium" stackId="a" fill="#eab308" name="Medium" />
                                        <Bar dataKey="low" stackId="a" fill="#22c55e" name="Low" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>

                        {/* Cases vs leads line */}
                        <ChartCard
                            title="Cases Registered vs AI Leads Generated"
                            subtitle="Correlation between case load and lead generation"
                            onExportCSV={() => exportCSV(filteredMonthly, 'cases-vs-leads.csv')}
                        >
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={filteredMonthly} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        <Line type="monotone" dataKey="cases" stroke={COLORS.primary} strokeWidth={2.5} dot={{ r: 4 }} name="Cases" />
                                        <Line type="monotone" dataKey="leads" stroke={COLORS.accent} strokeWidth={2.5} dot={{ r: 4 }} name="AI Leads" strokeDasharray="5 5" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    CRIME BREAKDOWN VIEW
                ══════════════════════════════════════════════════════════ */}
                {activeView === 'breakdown' && (
                    <div className="space-y-6">

                        {/* Crime type bar — current vs previous */}
                        <ChartCard
                            title="Crime Type Comparison"
                            subtitle="Current period vs previous period"
                            onExportCSV={() => exportCSV(filteredCrimeType, 'crime-by-type.csv')}
                            onExportPNG={() => exportPNG(barRef, 'crime-by-type.svg')}
                        >
                            <div ref={barRef} className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={filteredCrimeType} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="type" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        <Bar dataKey="count" fill={COLORS.primary} name="Current" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="prev" fill={COLORS.light} name="Previous" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>

                        {/* Crime type table */}
                        <ChartCard
                            title="Crime Type Summary Table"
                            subtitle="Sorted by case count"
                            onExportCSV={() => exportCSV(filteredCrimeType, 'crime-summary.csv')}
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Crime Type</th>
                                            <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Current</th>
                                            <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Previous</th>
                                            <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Change</th>
                                            <th className="py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trend</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredCrimeType.map(row => {
                                            const diff = row.count - row.prev;
                                            const pct = ((diff / row.prev) * 100).toFixed(0);
                                            const up = diff > 0;
                                            return (
                                                <tr key={row.type} className="hover:bg-slate-50 transition-colors">
                                                    <td className="py-3 px-3 font-medium text-slate-800">{row.type}</td>
                                                    <td className="py-3 px-3 text-right text-slate-700">{row.count}</td>
                                                    <td className="py-3 px-3 text-right text-slate-500">{row.prev}</td>
                                                    <td className={`py-3 px-3 text-right font-semibold text-xs ${up ? 'text-red-600' : 'text-green-600'}`}>
                                                        {up ? '+' : ''}{pct}%
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                                                            <div className="h-1.5 rounded-full bg-deep-ocean"
                                                                style={{ width: `${(row.count / 70) * 100}%` }} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </ChartCard>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    HEATMAP VIEW
                ══════════════════════════════════════════════════════════ */}
                {activeView === 'heatmap' && (
                    <div className="space-y-6">
                        <ChartCard
                            title="Crime Occurrence Heatmap"
                            subtitle="Day of week vs time of day — darker = more incidents"
                            onExportCSV={() => {
                                const rows = WEEKLY_HEATMAP.days.flatMap((day, di) =>
                                    WEEKLY_HEATMAP.hours.map((hr, hi) => ({
                                        day, hour: hr, incidents: WEEKLY_HEATMAP.data[di][hi]
                                    }))
                                );
                                exportCSV(rows, 'crime-heatmap.csv');
                            }}
                        >
                            <div className="overflow-x-auto">
                                <div className="min-w-105">
                                    {/* Hour labels */}
                                    <div className="flex gap-1 mb-1 ml-10">
                                        {WEEKLY_HEATMAP.hours.map(h => (
                                            <div key={h} className="flex-1 text-center text-[10px] text-slate-400">{h}:00</div>
                                        ))}
                                    </div>
                                    {/* Grid */}
                                    {WEEKLY_HEATMAP.days.map((day, di) => (
                                        <div key={day} className="flex items-center gap-1 mb-1">
                                            <div className="w-9 text-right text-xs text-slate-500 pr-1 shrink-0">{day}</div>
                                            {WEEKLY_HEATMAP.data[di].map((val, hi) => (
                                                <div key={hi}
                                                    className={`flex-1 h-8 rounded ${heatColor(val)} flex items-center justify-center cursor-default transition-opacity hover:opacity-80`}
                                                    title={`${day} ${WEEKLY_HEATMAP.hours[hi]}:00 — ${val} incidents`}
                                                >
                                                    <span className="text-[9px] font-bold text-white/80 drop-shadow">{val > 0 ? val : ''}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                    {/* Legend */}
                                    <div className="flex items-center gap-3 mt-4 text-xs text-slate-500">
                                        <span>Low</span>
                                        {['bg-blue-200', 'bg-blue-400', 'bg-orange-400', 'bg-red-500'].map(c => (
                                            <div key={c} className={`w-8 h-3 rounded ${c}`} />
                                        ))}
                                        <span>High</span>
                                    </div>
                                </div>
                            </div>
                        </ChartCard>

                        {/* Key insight cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                                { label: 'Peak Day', value: 'Friday', sub: 'Most incidents on Fridays', color: 'border-red-200    bg-red-50' },
                                { label: 'Peak Hour', value: '18:00–21:00', sub: 'Evening rush is highest risk', color: 'border-orange-200 bg-orange-50' },
                                { label: 'Safest Time', 'value': '03:00–06:00', 'sub': 'Lowest incident rate at dawn', color: 'border-green-200  bg-green-50' },
                            ].map(({ label, value, sub, color }) => (
                                <div key={label} className={`rounded-lg border ${color} p-4`}>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
                                    <p className="text-xl font-bold text-slate-800 mt-1">{value}</p>
                                    <p className="text-xs text-slate-500 mt-1">{sub}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    PREDICTIONS VIEW
                ══════════════════════════════════════════════════════════ */}
                {activeView === 'predictions' && (
                    <div className="space-y-6">

                        {/* Disclaimer banner */}
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200">
                            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-blue-700">
                                Predictions are generated by an ML model trained on historical case data.
                                They are indicative, not conclusive — always verify with field intelligence.
                            </p>
                        </div>

                        {/* Model stat cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {MODEL_STATS.map(({ label, value, sub }) => (
                                <Card key={label} className="p-4 space-y-1">
                                    <p className="text-xs text-slate-500 font-medium">{label}</p>
                                    <p className="text-xl font-bold text-deep-ocean">{value}</p>
                                    <p className="text-[10px] text-slate-400">{sub}</p>
                                </Card>
                            ))}
                        </div>

                        {/* Forecast trend — historical + predicted AreaChart */}
                        <ChartCard
                            title="Crime Forecast — Next 3 Months"
                            subtitle="Historical (solid) vs AI-predicted (dashed) with confidence band"
                            onExportCSV={() => exportCSV(PREDICTION_TREND.map(d => ({
                                month: d.month,
                                actual: d.cases ?? '',
                                predicted: d.predicted ?? '',
                                upper: d.upper ?? '',
                                lower: d.lower ?? '',
                            })), 'crime-forecast.csv')}
                        >
                            <div ref={predRef} className="h-72 bg-white rounded pt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={PREDICTION_TREND} margin={{ top: 5, right: 16, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="confBand" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4A90B8" stopOpacity={0.18} />
                                                <stop offset="95%" stopColor="#4A90B8" stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} domain={[0, 100]} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: 12 }} />

                                        {/* Confidence band — upper to lower fill */}
                                        <Area
                                            type="monotone" dataKey="upper"
                                            stroke="none" fill="url(#confBand)"
                                            name="Upper bound" legendType="none"
                                            connectNulls
                                        />
                                        <Area
                                            type="monotone" dataKey="lower"
                                            stroke="none" fill="#ffffff"
                                            name="Lower bound" legendType="none"
                                            connectNulls
                                        />

                                        {/* Historical actual */}
                                        <Line
                                            type="monotone" dataKey="cases"
                                            stroke="#1B3C53" strokeWidth={2.5}
                                            dot={{ r: 4, fill: '#1B3C53' }}
                                            activeDot={{ r: 6 }}
                                            name="Actual cases"
                                            connectNulls={false}
                                        />

                                        {/* Predicted line — dashed */}
                                        <Line
                                            type="monotone" dataKey="predicted"
                                            stroke="#4A90B8" strokeWidth={2.5}
                                            strokeDasharray="6 4"
                                            dot={{ r: 4, fill: '#4A90B8' }}
                                            activeDot={{ r: 6 }}
                                            name="Predicted cases"
                                            connectNulls
                                        />

                                        {/* Divider between historical and predicted */}
                                        <ReferenceLine x="Mar" stroke="#94a3b8" strokeDasharray="4 2"
                                            label={{ value: 'Today', position: 'top', fontSize: 10, fill: '#94a3b8' }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>

                        {/* Province forecast bar */}
                        <ChartCard
                            title="Province Risk Forecast — Next Month"
                            subtitle="Current month vs predicted next month case count"
                            onExportCSV={() => exportCSV(PROVINCE_FORECAST, 'province-forecast.csv')}
                        >
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={PROVINCE_FORECAST} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="province" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        <Bar dataKey="current" fill="#1B3C53" name="Current" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="forecast" fill="#4A90B8" name="Forecast" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>

                        {/* Crime type forecast table */}
                        <ChartCard
                            title="Crime Type Forecast"
                            subtitle="Predicted change in case count for next month"
                            onExportCSV={() => exportCSV(CRIME_FORECAST, 'crime-type-forecast.csv')}
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Crime Type</th>
                                            <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Current</th>
                                            <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Forecast</th>
                                            <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Change</th>
                                            <th className="py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Risk</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {CRIME_FORECAST.map(row => {
                                            const up = row.change > 0;
                                            return (
                                                <tr key={row.type} className="hover:bg-slate-50 transition-colors">
                                                    <td className="py-3 px-3 font-medium text-slate-800">{row.type}</td>
                                                    <td className="py-3 px-3 text-right text-slate-600">{row.current}</td>
                                                    <td className="py-3 px-3 text-right font-semibold text-slate-800">{row.forecast}</td>
                                                    <td className={`py-3 px-3 text-right text-xs font-bold ${up ? 'text-red-600' : 'text-green-600'}`}>
                                                        {up ? '▲' : '▼'} {Math.abs(row.change).toFixed(1)}%
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                                                            <div className={`h-1.5 rounded-full ${up ? 'bg-red-500' : 'bg-green-500'}`}
                                                                style={{ width: `${Math.min((row.forecast / 80) * 100, 100)}%` }} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </ChartCard>

                        {/* Pattern alert cards */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 mb-3">
                                AI Pattern Alerts
                                <span className="ml-2 text-xs font-normal text-slate-400">— Unusual activity clusters detected by the model</span>
                            </h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {PATTERN_ALERTS.map(alert => {
                                    const style = ALERT_STYLE[alert.severity];
                                    const Icon = style.icon;
                                    return (
                                        <div key={alert.id}
                                            className={`rounded-lg border ${style.border} ${style.bg} p-4 space-y-3`}>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-start gap-2">
                                                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${style.iconColor}`} />
                                                    <p className="text-sm font-bold text-slate-800">{alert.title}</p>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${style.badge}`}>
                                                    {alert.severity}
                                                </span>
                                            </div>

                                            <p className="text-xs text-slate-600 leading-relaxed">{alert.description}</p>

                                            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                                                <span>📍 {alert.province}</span>
                                                <span>🕐 {alert.timeframe}</span>
                                                <span>🏷 {alert.crimeType}</span>
                                            </div>

                                            {/* Confidence bar */}
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-[10px] text-slate-500">
                                                    <span>Model confidence</span>
                                                    <span className="font-semibold">{alert.confidence}%</span>
                                                </div>
                                                <div className="w-full bg-white/60 rounded-full h-1.5 border border-slate-200">
                                                    <div className="h-1.5 rounded-full bg-deep-ocean transition-all"
                                                        style={{ width: `${alert.confidence}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                )}

            </main>
        </div>
    );
};

export default AnalyticsPage;