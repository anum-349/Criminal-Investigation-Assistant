import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ReferenceLine, Area, AreaChart,
} from 'recharts';
import {
    TrendingUp, BarChart2, PieChart as PieIcon, Map,
    Download, Filter, ChevronRight, LayoutDashboard,
    Calendar, RefreshCw, AlertTriangle, CheckCircle2, Clock,
    Zap, ShieldAlert, TrendingDown, Info, Loader2,
} from 'lucide-react';
import Header from '@/components/Header';
import { Card } from '@/components/ui/Card';
import {
    fetchOverview, fetchTrends, fetchBreakdown,
    fetchHeatmap, fetchPredictions,
} from '@/services/analyticsApi';

// ── Theme ─────────────────────────────────────────────────────────────────────
const COLORS = {
    primary: '#1B3C53',
    second:  '#345A76',
    accent:  '#4A90B8',
    light:   '#7FB3D0',
    success: '#16a34a',
    warning: '#d97706',
    danger:  '#dc2626',
    muted:   '#94a3b8',
};
const PIE_COLORS = ['#1B3C53','#345A76','#4A90B8','#7FB3D0','#dc2626','#d97706','#16a34a','#8b5cf6'];

const ALERT_STYLE = {
    critical: { border:'border-red-200',    bg:'bg-red-50',    badge:'bg-red-600 text-white',    icon: ShieldAlert,   iconColor:'text-red-600'    },
    high:     { border:'border-orange-200', bg:'bg-orange-50', badge:'bg-orange-500 text-white',  icon: AlertTriangle, iconColor:'text-orange-500'  },
    medium:   { border:'border-yellow-200', bg:'bg-yellow-50', badge:'bg-yellow-500 text-white',  icon: TrendingUp,    iconColor:'text-yellow-600'  },
    low:      { border:'border-green-200',  bg:'bg-green-50',  badge:'bg-green-600 text-white',   icon: TrendingDown,  iconColor:'text-green-600'   },
};

// ── Static pattern alerts (AI-generated — replace with API when available) ────
const PATTERN_ALERTS = [
    { id:1, severity:'critical', title:'Robbery spike predicted — Karachi',
      description:'Model detects a 78% probability of a significant robbery cluster in Clifton and DHA areas within the next 2 weeks.',
      confidence:78, timeframe:'Next 2 weeks', crimeType:'Robbery', province:'Sindh' },
    { id:2, severity:'high',     title:'Seasonal theft increase — Punjab',
      description:'Based on 3-year seasonal patterns, vehicle thefts in Lahore and Faisalabad are predicted to rise by 20–30% during April–May.',
      confidence:85, timeframe:'Next 4–6 weeks', crimeType:'Theft', province:'Punjab' },
    { id:3, severity:'medium',   title:'Fraud pattern emerging — ICT',
      description:'Clustering algorithm detected a potential organized fraud network in Islamabad with 3 cases showing similar MO in the last 30 days.',
      confidence:62, timeframe:'Ongoing', crimeType:'Fraud', province:'ICT' },
    { id:4, severity:'low',      title:'Crime rate stabilizing — Balochistan',
      description:'Prediction model shows a likely 7% decrease in reported cases in Quetta over the next month based on recent resolution trends.',
      confidence:71, timeframe:'Next month', crimeType:'All types', province:'Balochistan' },
];

const DATE_RANGES  = ['Last 3 months','Last 6 months','Last 9 months','This year'];
const PROVINCES    = ['All Provinces','Punjab','Sindh','Balochistan','KPK','ICT','GB'];
const CRIME_TYPES  = ['All Types','Murder','Robbery','Theft','Assault','Fraud','Kidnapping','Drug'];

const VIEWS = [
    { id:'overview',     label:'Overview',        icon: BarChart2   },
    { id:'trends',       label:'Time Trends',      icon: TrendingUp  },
    { id:'breakdown',    label:'Crime Breakdown',  icon: PieIcon     },
    { id:'heatmap',      label:'Time Heatmap',     icon: Map         },
    { id:'predictions',  label:'Predictions',      icon: Zap         },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
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

const heatColor = (val) => {
    if (val === 0)  return 'bg-slate-100';
    if (val <= 2)   return 'bg-blue-200';
    if (val <= 4)   return 'bg-blue-400';
    if (val <= 6)   return 'bg-orange-400';
    return 'bg-red-500';
};

const exportCSV = (data, filename) => {
    if (!data?.length) return;
    const keys = Object.keys(data[0]);
    const csv  = [keys.join(','), ...data.map(row => keys.map(k => row[k] ?? '').join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
};

const exportPNG = (chartRef, filename) => {
    const svg = chartRef.current?.querySelector('svg');
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
};

// ── ChartCard ─────────────────────────────────────────────────────────────────
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

// ── Skeleton loader ───────────────────────────────────────────────────────────
const Skeleton = ({ h = 'h-64' }) => (
    <div className={`${h} rounded-xl bg-slate-200 animate-pulse`} />
);

// ═════════════════════════════════════════════════════════════════════════════
const AnalyticsPage = () => {
    const navigate       = useNavigate();
    const [searchParams] = useSearchParams();

    const [dateRange,  setDateRange]  = useState('Last 9 months');
    const [province,   setProvince]   = useState('All Provinces');
    const [crimeType,  setCrimeType]  = useState('All Types');
    const [activeView, setActiveView] = useState(searchParams.get('tab') || 'overview');

    // ── Live data ─────────────────────────────────────────────────────────
    const [overviewData,     setOverviewData]     = useState(null);
    const [trendsData,       setTrendsData]       = useState(null);
    const [breakdownData,    setBreakdownData]    = useState(null);
    const [heatmapData,      setHeatmapData]      = useState(null);
    const [predictionsData,  setPredictionsData]  = useState(null);
    const [dataLoading,      setDataLoading]      = useState(false);
    const [dataError,        setDataError]        = useState(null);

    // Chart refs
    const trendRef    = useRef(null);
    const barRef      = useRef(null);
    const severityRef = useRef(null);
    const predRef     = useRef(null);

    // Sync tab from URL
    useEffect(() => {
        const t = searchParams.get('tab') || 'overview';
        setActiveView(t);
    }, [searchParams]);

    // ── Fetch on tab / filter change ──────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        setDataLoading(true);
        setDataError(null);

        const f = { dateRange, province, crimeType };

        const calls = {
            overview:    () => fetchOverview(f).then(d  => { if (!cancelled) setOverviewData(d);    }),
            trends:      () => fetchTrends(f).then(d    => { if (!cancelled) setTrendsData(d);      }),
            breakdown:   () => fetchBreakdown(f).then(d => { if (!cancelled) setBreakdownData(d);   }),
            heatmap:     () => fetchHeatmap(f).then(d   => { if (!cancelled) setHeatmapData(d);     }),
            predictions: () => fetchPredictions().then(d=> { if (!cancelled) setPredictionsData(d); }),
        };

        // Always fetch overview (needed for summary strip on every tab)
        const toFetch = activeView === 'overview'
            ? [calls.overview]
            : [calls.overview, calls[activeView]].filter(Boolean);

        Promise.all(toFetch.map(fn => fn()))
            .catch(err => {
                if (!cancelled) setDataError(
                    err?.response?.data?.detail || 'Failed to load analytics data.'
                );
            })
            .finally(() => { if (!cancelled) setDataLoading(false); });

        return () => { cancelled = true; };
    }, [activeView, dateRange, province, crimeType]);

    // ── Derived data (with null guard) ────────────────────────────────────
    const summaryStats = overviewData ? [
        { label:'Total Cases',       value: String(overviewData.summary.totalCases),
          change: overviewData.summary.totalCasesChange,
          up: !overviewData.summary.totalCasesChange.startsWith('-'), icon: BarChart2 },
        { label:'Solved This Month', value: String(overviewData.summary.solvedThisMonth),
          change: overviewData.summary.solvedChange,
          up: !overviewData.summary.solvedChange.startsWith('-'), icon: CheckCircle2 },
        { label:'Avg Resolution',    value: `${overviewData.summary.avgResolutionDays}d`,
          change: overviewData.summary.avgResolutionChange,
          up: overviewData.summary.avgResolutionChange.startsWith('-'), icon: Clock },
        { label:'High Severity',     value: String(overviewData.summary.highSeverity),
          change: overviewData.summary.highSeverityChange,
          up: false, icon: AlertTriangle },
    ] : null;

    const filteredMonthly  = (activeView === 'trends' ? trendsData?.monthlyTrend  : overviewData?.monthlyTrend)  ?? null;
    const filteredSeverity = trendsData?.severityTrend    ?? null;
    const filteredCrimeType= breakdownData?.crimeByType   ?? null;
    const crimeByProvince  = overviewData?.crimeByProvince ?? null;
    const statusDist       = overviewData?.statusDist      ?? null;
    const heatmap          = heatmapData?.heatmap          ?? null;
    const predTrend        = predictionsData?.predictionTrend   ?? null;
    const provForecast     = predictionsData?.provinceForecast  ?? null;
    const crimeForecast    = predictionsData?.crimeForecast     ?? null;

    // Derived heatmap insights from live data
    const heatmapInsights = (() => {
        if (!heatmap) return null;
        const DAYS  = heatmap.days;
        const HOURS = heatmap.hours;
        const grid  = heatmap.data;

        let peakDay = 0, peakHour = 0, safestHour = 0;
        let peakDayVal = 0, peakHourVal = 0, safestVal = Infinity;

        grid.forEach((row, di) => {
            const dayTotal = row.reduce((a, b) => a + b, 0);
            if (dayTotal > peakDayVal) { peakDayVal = dayTotal; peakDay = di; }
        });
        HOURS.forEach((_, hi) => {
            const hourTotal = grid.reduce((sum, row) => sum + (row[hi] ?? 0), 0);
            if (hourTotal > peakHourVal)  { peakHourVal = hourTotal; peakHour = hi; }
            if (hourTotal < safestVal)    { safestVal   = hourTotal; safestHour = hi; }
        });

        const nextH = (i) => HOURS[(i + 1) % HOURS.length] ?? '24';
        return {
            peakDay:    DAYS[peakDay]  ?? '—',
            peakHour:   `${HOURS[peakHour]}:00–${nextH(peakHour)}:00`,
            safestTime: `${HOURS[safestHour]}:00–${nextH(safestHour)}:00`,
        };
    })();

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900 mt-14">
            <Header />

            <main className="max-w-7xl mx-auto px-4 lg:px-6 py-8 space-y-6">

                {/* Breadcrumb */}
                <nav className="flex items-center gap-1.5 text-xs text-slate-500">
                    <button onClick={() => navigate('/investigator')}
                        className="flex items-center gap-1.5 cursor-pointer hover:text-slate-800 transition-colors">
                        <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                    </button>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-slate-800 font-medium">Analytics & Trends</span>
                </nav>

                {/* Page header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Analytics & Trends</h1>
                        <p className="text-sm text-slate-500 mt-1">Visualize crime patterns, trends, and case statistics</p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex cursor-pointer items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-600 hover:bg-slate-50 transition-colors self-start">
                        <RefreshCw className="h-4 w-4" /> Refresh
                    </button>
                </div>

                {/* Filter bar */}
                <Card className="p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <Filter className="h-3.5 w-3.5" /> Filters
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <select value={dateRange} onChange={e => setDateRange(e.target.value)}
                                className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-deep-ocean">
                                {DATE_RANGES.map(d => <option key={d}>{d}</option>)}
                            </select>
                        </div>
                        <select value={province} onChange={e => setProvince(e.target.value)}
                            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-deep-ocean">
                            {PROVINCES.map(p => <option key={p}>{p}</option>)}
                        </select>
                        <select value={crimeType} onChange={e => setCrimeType(e.target.value)}
                            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-deep-ocean">
                            {CRIME_TYPES.map(c => <option key={c}>{c}</option>)}
                        </select>
                        <button
                            onClick={() => { setDateRange('Last 9 months'); setProvince('All Provinces'); setCrimeType('All Types'); }}
                            className="text-xs text-slate-500 cursor-pointer hover:text-slate-800 underline transition-colors ml-auto">
                            Reset filters
                        </button>
                    </div>
                </Card>

                {/* Status strips */}
                {dataLoading && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading data…
                    </div>
                )}
                {dataError && !dataLoading && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {dataError}
                    </div>
                )}

                {/* View tabs */}
                <div className="flex gap-2 flex-wrap">
                    {VIEWS.map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => setActiveView(id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer text-sm font-medium transition-all
                                ${activeView === id
                                    ? 'bg-deep-ocean text-white shadow-sm'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:border-deep-ocean hover:text-deep-ocean'}`}>
                            <Icon className="h-3.5 w-3.5" />{label}
                        </button>
                    ))}
                </div>

                {/* ══ OVERVIEW ══════════════════════════════════════════════ */}
                {activeView === 'overview' && (
                    <div className="space-y-6">

                        {/* Summary cards */}
                        {summaryStats ? (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {summaryStats.map(({ label, value, change, up, icon: Icon }) => (
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
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[1,2,3,4].map(i => <Skeleton key={i} h="h-28" />)}
                            </div>
                        )}

                        {/* Monthly trend line chart */}
                        <ChartCard
                            title="Monthly Case Overview"
                            subtitle="New cases registered vs solved per month"
                            onExportCSV={filteredMonthly ? () => exportCSV(filteredMonthly, 'monthly-trend.csv') : null}
                            onExportPNG={() => exportPNG(trendRef, 'monthly-trend.svg')}
                        >
                            {filteredMonthly ? (
                                <div ref={trendRef} className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={filteredMonthly} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="month" tick={{ fontSize:11, fill:'#94a3b8' }} />
                                            <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend wrapperStyle={{ fontSize:12 }} />
                                            <Line type="monotone" dataKey="cases"  stroke={COLORS.danger}  strokeWidth={2.5} dot={{ r:4 }} activeDot={{ r:6 }} name="New Cases" />
                                            <Line type="monotone" dataKey="solved" stroke={COLORS.success} strokeWidth={2.5} dot={{ r:4 }} activeDot={{ r:6 }} name="Solved" />
                                            <Line type="monotone" dataKey="leads"  stroke={COLORS.accent}  strokeWidth={2}   dot={{ r:3 }} activeDot={{ r:5 }} name="Leads" strokeDasharray="5 5" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : <Skeleton />}
                        </ChartCard>

                        {/* Province + status pie */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartCard
                                title="Cases by Province"
                                subtitle="Geographic distribution"
                                onExportCSV={crimeByProvince ? () => exportCSV(crimeByProvince, 'cases-by-province.csv') : null}
                            >
                                {crimeByProvince ? (
                                    <div className="h-56">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={crimeByProvince} dataKey="value" nameKey="name"
                                                    cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                                                    paddingAngle={3}
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                    labelLine={false}>
                                                    {crimeByProvince.map((_, i) => (
                                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(v, n) => [v, n]} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : <Skeleton h="h-56" />}
                            </ChartCard>

                            <ChartCard
                                title="Case Status Distribution"
                                subtitle="Active, pending, closed, archived"
                                onExportCSV={statusDist ? () => exportCSV(statusDist, 'status-distribution.csv') : null}
                            >
                                {statusDist ? (
                                    <div className="h-56">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={statusDist} dataKey="value" nameKey="name"
                                                    cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                                                    {statusDist.map((_, i) => (
                                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend wrapperStyle={{ fontSize:11 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : <Skeleton h="h-56" />}
                            </ChartCard>
                        </div>
                    </div>
                )}

                {/* ══ TRENDS ════════════════════════════════════════════════ */}
                {activeView === 'trends' && (
                    <div className="space-y-6">
                        <ChartCard
                            title="Cases by Severity Over Time"
                            subtitle="Monthly breakdown — critical, high, medium, low"
                            onExportCSV={filteredSeverity ? () => exportCSV(filteredSeverity, 'severity-trend.csv') : null}
                            onExportPNG={() => exportPNG(severityRef, 'severity-trend.svg')}
                        >
                            {filteredSeverity ? (
                                <div ref={severityRef} className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={filteredSeverity} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="month" tick={{ fontSize:11, fill:'#94a3b8' }} />
                                            <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend wrapperStyle={{ fontSize:12 }} />
                                            <Bar dataKey="critical" stackId="a" fill="#dc2626" name="Critical" />
                                            <Bar dataKey="high"     stackId="a" fill="#f97316" name="High" />
                                            <Bar dataKey="medium"   stackId="a" fill="#eab308" name="Medium" />
                                            <Bar dataKey="low"      stackId="a" fill="#22c55e" name="Low" radius={[4,4,0,0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : <Skeleton h="h-72" />}
                        </ChartCard>

                        <ChartCard
                            title="Cases Registered vs AI Leads Generated"
                            subtitle="Correlation between case load and lead generation"
                            onExportCSV={filteredMonthly ? () => exportCSV(filteredMonthly, 'cases-vs-leads.csv') : null}
                        >
                            {filteredMonthly ? (
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={filteredMonthly} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="month" tick={{ fontSize:11, fill:'#94a3b8' }} />
                                            <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend wrapperStyle={{ fontSize:12 }} />
                                            <Line type="monotone" dataKey="cases" stroke={COLORS.primary} strokeWidth={2.5} dot={{ r:4 }} name="Cases" />
                                            <Line type="monotone" dataKey="leads" stroke={COLORS.accent}  strokeWidth={2.5} dot={{ r:4 }} name="AI Leads" strokeDasharray="5 5" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : <Skeleton />}
                        </ChartCard>
                    </div>
                )}

                {/* ══ BREAKDOWN ═════════════════════════════════════════════ */}
                {activeView === 'breakdown' && (
                    <div className="space-y-6">
                        <ChartCard
                            title="Crime Type Comparison"
                            subtitle="Current period vs previous period"
                            onExportCSV={filteredCrimeType ? () => exportCSV(filteredCrimeType, 'crime-by-type.csv') : null}
                            onExportPNG={() => exportPNG(barRef, 'crime-by-type.svg')}
                        >
                            {filteredCrimeType ? (
                                <div ref={barRef} className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={filteredCrimeType} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="type" tick={{ fontSize:11, fill:'#94a3b8' }} />
                                            <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend wrapperStyle={{ fontSize:12 }} />
                                            <Bar dataKey="count" fill={COLORS.primary} name="Current"  radius={[4,4,0,0]} />
                                            <Bar dataKey="prev"  fill={COLORS.light}   name="Previous" radius={[4,4,0,0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : <Skeleton h="h-72" />}
                        </ChartCard>

                        <ChartCard
                            title="Crime Type Summary Table"
                            subtitle="Sorted by case count"
                            onExportCSV={filteredCrimeType ? () => exportCSV(filteredCrimeType, 'crime-summary.csv') : null}
                        >
                            {filteredCrimeType ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                {['Crime Type','Current','Previous','Change','Trend'].map(h => (
                                                    <th key={h} className={`py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${h === 'Crime Type' ? 'text-left' : 'text-right last:text-left'}`}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredCrimeType.map(row => {
                                                const diff = row.count - row.prev;
                                                const pct  = row.prev ? ((diff / row.prev) * 100).toFixed(0) : 0;
                                                const up   = diff > 0;
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
                                                                    style={{ width: `${Math.min((row.count / 70) * 100, 100)}%` }} />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : <Skeleton h="h-48" />}
                        </ChartCard>
                    </div>
                )}

                {/* ══ HEATMAP ═══════════════════════════════════════════════ */}
                {activeView === 'heatmap' && (
                    <div className="space-y-6">
                        <ChartCard
                            title="Crime Occurrence Heatmap"
                            subtitle="Day of week vs time of day — darker = more incidents"
                            onExportCSV={heatmap ? () => {
                                const rows = heatmap.days.flatMap((day, di) =>
                                    heatmap.hours.map((hr, hi) => ({
                                        day, hour: `${hr}:00`, incidents: heatmap.data[di][hi],
                                    }))
                                );
                                exportCSV(rows, 'crime-heatmap.csv');
                            } : null}
                        >
                            {heatmap ? (
                                <div className="overflow-x-auto">
                                    <div className="min-w-105">
                                        <div className="flex gap-1 mb-1 ml-10">
                                            {heatmap.hours.map(h => (
                                                <div key={h} className="flex-1 text-center text-[10px] text-slate-400">{h}:00</div>
                                            ))}
                                        </div>
                                        {heatmap.days.map((day, di) => (
                                            <div key={day} className="flex items-center gap-1 mb-1">
                                                <div className="w-9 text-right text-xs text-slate-500 pr-1 shrink-0">{day}</div>
                                                {(heatmap.data[di] ?? []).map((val, hi) => (
                                                    <div key={hi}
                                                        className={`flex-1 h-8 rounded ${heatColor(val)} flex items-center justify-center cursor-default transition-opacity hover:opacity-80`}
                                                        title={`${day} ${heatmap.hours[hi]}:00 — ${val} incidents`}>
                                                        <span className="text-[9px] font-bold text-white/80 drop-shadow">{val > 0 ? val : ''}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                        <div className="flex items-center gap-3 mt-4 text-xs text-slate-500">
                                            <span>Low</span>
                                            {['bg-blue-200','bg-blue-400','bg-orange-400','bg-red-500'].map(c => (
                                                <div key={c} className={`w-8 h-3 rounded ${c}`} />
                                            ))}
                                            <span>High</span>
                                        </div>
                                    </div>
                                </div>
                            ) : <Skeleton h="h-56" />}
                        </ChartCard>

                        {/* Insight cards — derived from live data */}
                        {heatmapInsights ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                    { label:'Peak Day',    value: heatmapInsights.peakDay,    sub:'Day with most total incidents',  color:'border-red-200 bg-red-50'      },
                                    { label:'Peak Hours',  value: heatmapInsights.peakHour,   sub:'Time slot with highest activity', color:'border-orange-200 bg-orange-50' },
                                    { label:'Safest Time', value: heatmapInsights.safestTime, sub:'Lowest incident rate window',     color:'border-green-200 bg-green-50'   },
                                ].map(({ label, value, sub, color }) => (
                                    <div key={label} className={`rounded-lg border ${color} p-4`}>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
                                        <p className="text-xl font-bold text-slate-800 mt-1">{value}</p>
                                        <p className="text-xs text-slate-500 mt-1">{sub}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[1,2,3].map(i => <Skeleton key={i} h="h-24" />)}
                            </div>
                        )}
                    </div>
                )}

                {/* ══ PREDICTIONS ═══════════════════════════════════════════ */}
                {activeView === 'predictions' && (
                    <div className="space-y-6">

                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200">
                            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-blue-700">
                                Predictions are generated by a statistical model trained on historical case data.
                                They are indicative, not conclusive — always verify with field intelligence.
                            </p>
                        </div>

                        {/* Forecast trend chart */}
                        <ChartCard
                            title="Crime Forecast — Next 3 Months"
                            subtitle="Historical (solid) vs predicted (dashed) with confidence band"
                            onExportCSV={predTrend ? () => exportCSV(
                                predTrend.map(d => ({ month:d.month, actual:d.cases??'', predicted:d.predicted??'', upper:d.upper??'', lower:d.lower??'' })),
                                'crime-forecast.csv'
                            ) : null}
                        >
                            {predTrend ? (
                                <div ref={predRef} className="h-72 bg-white rounded pt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={predTrend} margin={{ top:5, right:16, left:-20, bottom:0 }}>
                                            <defs>
                                                <linearGradient id="confBand" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%"  stopColor="#4A90B8" stopOpacity={0.18} />
                                                    <stop offset="95%" stopColor="#4A90B8" stopOpacity={0.02} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="month" tick={{ fontSize:11, fill:'#94a3b8' }} />
                                            <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend wrapperStyle={{ fontSize:12 }} />
                                            <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confBand)" name="Upper bound" legendType="none" connectNulls />
                                            <Area type="monotone" dataKey="lower" stroke="none" fill="#ffffff"         name="Lower bound" legendType="none" connectNulls />
                                            <Line type="monotone" dataKey="cases"     stroke="#1B3C53" strokeWidth={2.5} dot={{ r:4, fill:'#1B3C53' }} activeDot={{ r:6 }} name="Actual cases"    connectNulls={false} />
                                            <Line type="monotone" dataKey="predicted" stroke="#4A90B8" strokeWidth={2.5} dot={{ r:4, fill:'#4A90B8' }} activeDot={{ r:6 }} name="Predicted cases" strokeDasharray="6 4" connectNulls />
                                            <ReferenceLine
                                                x={predTrend.find(d => d.cases !== null && d.cases !== undefined)
                                                    ? predTrend.filter(d => d.cases != null).at(-1)?.month
                                                    : undefined}
                                                stroke="#94a3b8" strokeDasharray="4 2"
                                                label={{ value:'Today', position:'top', fontSize:10, fill:'#94a3b8' }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : <Skeleton h="h-72" />}
                        </ChartCard>

                        {/* Province forecast bar */}
                        <ChartCard
                            title="Province Risk Forecast — Next Month"
                            subtitle="Current month vs predicted next month case count"
                            onExportCSV={provForecast ? () => exportCSV(provForecast, 'province-forecast.csv') : null}
                        >
                            {provForecast ? (
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={provForecast} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="province" tick={{ fontSize:11, fill:'#94a3b8' }} />
                                            <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend wrapperStyle={{ fontSize:12 }} />
                                            <Bar dataKey="current"  fill="#1B3C53" name="Current"  radius={[4,4,0,0]} />
                                            <Bar dataKey="forecast" fill="#4A90B8" name="Forecast" radius={[4,4,0,0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : <Skeleton />}
                        </ChartCard>

                        {/* Crime type forecast table */}
                        <ChartCard
                            title="Crime Type Forecast"
                            subtitle="Predicted change in case count for next month"
                            onExportCSV={crimeForecast ? () => exportCSV(crimeForecast, 'crime-type-forecast.csv') : null}
                        >
                            {crimeForecast ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                {['Crime Type','Current','Forecast','Change','Risk'].map(h => (
                                                    <th key={h} className={`py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${h === 'Crime Type' ? 'text-left' : 'text-right last:text-left'}`}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {crimeForecast.map(row => {
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
                            ) : <Skeleton h="h-48" />}
                        </ChartCard>

                        {/* Pattern alerts — static (AI-generated in future) */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 mb-3">
                                AI Pattern Alerts
                                <span className="ml-2 text-xs font-normal text-slate-400">
                                    — Unusual activity clusters detected by the model
                                </span>
                            </h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {PATTERN_ALERTS.map(alert => {
                                    const style = ALERT_STYLE[alert.severity];
                                    const Icon  = style.icon;
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