/**
 * src/pages/admin/reports/page.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin — Reports.
 * Route: /admin/reports
 *
 * Backend integration (services/reportApi.js):
 *   - POST /api/reports/generate
 *   - GET  /api/reports/history
 *
 * The backend supports 5 builders today:
 *   case_summary, crime_hotspot, case_timeline, leads_report, suspect_report
 *
 * The admin-scope catalogue (system_activity / audit_summary / etc.) shown
 * in the original mock is not yet implemented on the backend. Until those
 * builders are added, this page exposes only the 5 supported types — that
 * way the admin never sees a "Unknown report type" error.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, Download, ChevronRight, LayoutDashboard,
  CheckCircle2, AlertTriangle, Clock, Loader2,
  Calendar, MapPin, Users, Brain, RefreshCw,
} from "lucide-react";

import Header from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

import { generateReport, fetchReportHistory } from "@/services/reportApi";
import { formatApiError } from "@/services/adminApi";

// ── Report types (only the 5 the backend supports) ──────────────────────────
const REPORT_TYPES = [
  {
    id: "case_summary", label: "Case Summary",
    icon: FileText, color: "border-blue-200 bg-blue-50", iconColor: "text-blue-700",
    description: "Full overview of a case including suspects, victims, evidence, and timeline.",
    fields: ["caseId", "dateRange"],
  },
  {
    id: "crime_hotspot", label: "Crime Hotspot",
    icon: MapPin, color: "border-red-200 bg-red-50", iconColor: "text-red-700",
    description: "Geographic distribution of crimes by province, city, and severity.",
    fields: ["dateRange", "province", "crimeType"],
  },
  {
    id: "case_timeline", label: "Case Timeline",
    icon: Clock, color: "border-purple-200 bg-purple-50", iconColor: "text-purple-700",
    description: "Chronological event log for a specific case from registration to current status.",
    fields: ["caseId"],
  },
  {
    id: "leads_report", label: "AI Leads Report",
    icon: Brain, color: "border-green-200 bg-green-50", iconColor: "text-green-700",
    description: "All AI-generated investigative leads with confidence scores and evidence links.",
    fields: ["caseId", "minConfidence"],
  },
  {
    id: "suspect_report", label: "Suspect Analysis",
    icon: Users, color: "border-orange-200 bg-orange-50", iconColor: "text-orange-700",
    description: "Detailed suspect profiles across cases with cross-reference analysis.",
    fields: ["dateRange", "crimeType"],
  },
];

const DATE_RANGES = [
  { label: "Last 7 days",   days: 7 },
  { label: "Last 30 days",  days: 30 },
  { label: "Last 90 days",  days: 90 },
  { label: "Last 6 months", days: 180 },
  { label: "This year",     days: 365 },
];
const FORMATS    = ["PDF", "CSV", "JSON"];
const PROVINCES  = ["All Provinces", "Punjab", "Sindh", "Balochistan", "KPK", "ICT", "GB"];
const CRIME_TYPES = ["All Types", "Murder", "Robbery", "Theft", "Assault", "Fraud", "Kidnapping", "Drug"];

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
// PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function AdminReportsPage() {
  const navigate = useNavigate();

  // ── Selection state ─────────────────────────────────────────────────────
  const [selectedType, setSelectedType] = useState(REPORT_TYPES[0]);
  const [filters, setFilters] = useState({
    caseId:        "",
    dateRangeLabel: "Last 30 days",
    province:      "All Provinces",
    crimeType:     "All Types",
    minConfidence: 60,
    format:        "PDF",
  });
  const [generating, setGenerating] = useState(false);
  const [genError,   setGenError]   = useState(null);
  const [genPreview, setGenPreview] = useState(null);

  // ── History ─────────────────────────────────────────────────────────────
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError,   setHistoryError]   = useState(null);

  const [toast, setToast] = useState(null);
  const showToast = (msg, kind = "success") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2500);
  };

  // ── Fetch history ───────────────────────────────────────────────────────
  const reloadHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await fetchReportHistory(1, 25);
      setHistory(data?.items || []);
    } catch (err) {
      setHistoryError(formatApiError(err, "Could not load report history."));
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => { reloadHistory(); }, []);

  // ── Compute date range → ISO bounds ─────────────────────────────────────
  const computeDateRange = () => {
    const def = DATE_RANGES.find(r => r.label === filters.dateRangeLabel);
    if (!def) return { dateFrom: null, dateTo: null };
    const today = new Date();
    const fromD = new Date(today);
    fromD.setDate(fromD.getDate() - def.days);
    const iso = (d) => d.toISOString().split("T")[0];
    return { dateFrom: iso(fromD), dateTo: iso(today) };
  };

  // ── Validation ──────────────────────────────────────────────────────────
  const isValid = () => {
    if (selectedType.fields.includes("caseId") && !filters.caseId.trim()) return false;
    return true;
  };

  // ── Generate handler ────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!isValid()) {
      setGenError("Please fill in the required filters.");
      return;
    }
    setGenerating(true);
    setGenError(null);
    setGenPreview(null);
    try {
      const { dateFrom, dateTo } = computeDateRange();
      const data = await generateReport(selectedType.id, {
        caseId:        filters.caseId,
        dateFrom, dateTo,
        province:      filters.province,
        crimeType:     filters.crimeType,
        minConfidence: filters.minConfidence,
        format:        filters.format,
      });
      setGenPreview(data);
      showToast(`${selectedType.label} report generated.`);
      reloadHistory();
    } catch (err) {
      setGenError(formatApiError(err, "Report generation failed."));
    } finally {
      setGenerating(false);
    }
  };

  // ── Stats ───────────────────────────────────────────────────────────────
  const stats = {
    total:    history.length,
    thisWeek: history.filter(r => {
      if (!r.generated_at) return false;
      const diff = (Date.now() - new Date(r.generated_at).getTime()) / 86400000;
      return diff <= 7;
    }).length,
  };

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
          <span className="text-slate-800 font-medium">Reports</span>
        </nav>

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-6 w-6 text-deep-ocean" /> Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">Generate reports for audit, compliance, and operational review</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Generated", value: stats.total,    icon: FileText,   color: "text-deep-ocean" },
            { label: "This Week",       value: stats.thisWeek, icon: Calendar,   color: "text-blue-600" },
            { label: "Report Types",    value: REPORT_TYPES.length, icon: FileText, color: "text-purple-600" },
            { label: "Formats",         value: FORMATS.length, icon: Download,   color: "text-emerald-600" },
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

        {/* Report type cards */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Select Report Type
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {REPORT_TYPES.map(t => {
              const active = selectedType.id === t.id;
              return (
                <button key={t.id} onClick={() => setSelectedType(t)}
                  className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer
                    ${active
                      ? `${t.color} ring-2 ring-deep-ocean/30 shadow-sm`
                      : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"}`}>
                  <t.icon className={`h-5 w-5 mb-2 ${active ? t.iconColor : "text-slate-400"}`} />
                  <p className={`font-bold text-sm ${active ? "text-slate-800" : "text-slate-700"}`}>{t.label}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Generation form */}
        <Card className="p-5 space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className={`p-2 rounded-lg ${selectedType.color}`}>
              <selectedType.icon className={`h-5 w-5 ${selectedType.iconColor}`} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">{selectedType.label} Report</h3>
              <p className="text-xs text-slate-500">Configure filters and generate</p>
            </div>
          </div>

          {genError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {genError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Case ID */}
            {selectedType.fields.includes("caseId") && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Case ID <span className="text-red-500">*</span>
                </label>
                <input value={filters.caseId} onChange={e => setFilters(f => ({ ...f, caseId: e.target.value }))}
                  placeholder="e.g. C-2053"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean" />
              </div>
            )}

            {/* Date range */}
            {selectedType.fields.includes("dateRange") && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Date Range</label>
                <select value={filters.dateRangeLabel} onChange={e => setFilters(f => ({ ...f, dateRangeLabel: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean">
                  {DATE_RANGES.map(r => <option key={r.label}>{r.label}</option>)}
                </select>
              </div>
            )}

            {/* Format */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Format</label>
              <select value={filters.format} onChange={e => setFilters(f => ({ ...f, format: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean">
                {FORMATS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>

            {/* Province */}
            {selectedType.fields.includes("province") && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Province</label>
                <select value={filters.province} onChange={e => setFilters(f => ({ ...f, province: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean">
                  {PROVINCES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            )}

            {/* Crime type */}
            {selectedType.fields.includes("crimeType") && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Crime Type</label>
                <select value={filters.crimeType} onChange={e => setFilters(f => ({ ...f, crimeType: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean">
                  {CRIME_TYPES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            )}

            {/* Min confidence */}
            {selectedType.fields.includes("minConfidence") && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Min. Confidence: {filters.minConfidence}%
                </label>
                <input type="range" min={0} max={100}
                  value={filters.minConfidence}
                  onChange={e => setFilters(f => ({ ...f, minConfidence: parseInt(e.target.value, 10) }))}
                  className="w-full accent-deep-ocean" />
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-100">
            <button onClick={handleGenerate} disabled={generating || !isValid()}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white
                ${generating || !isValid()
                  ? "bg-deep-ocean/40 cursor-not-allowed"
                  : "bg-deep-ocean hover:bg-deep-ocean-900 cursor-pointer"}`}>
              {generating
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                : <><FileText className="h-4 w-4" /> Generate Report</>}
            </button>
          </div>

          {/* Preview */}
          {genPreview && (
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h4 className="text-base font-bold text-slate-800">{genPreview.title}</h4>
              {(genPreview.sections || []).map((section, i) => (
                <div key={i}>
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">{section.heading}</p>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-xs">
                      <tbody>
                        {(section.rows || []).map((row, r) => (
                          <tr key={r} className={r === 0 ? "bg-slate-50 font-semibold text-slate-700" : ""}>
                            {row.map((cell, c) => (
                              <td key={c} className="px-3 py-2 border-r last:border-r-0 border-slate-100">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* History */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Recent Reports</h2>
            <button onClick={reloadHistory}
              className="flex items-center gap-1.5 text-xs font-medium text-deep-ocean hover:underline cursor-pointer">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          {historyError && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800 mb-3">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {historyError}
            </div>
          )}

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["Report ID", "Type", "Format", "Generated At"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyLoading ? (
                    <tr><td colSpan={4} className="text-center py-10 text-slate-400 text-sm">
                      <Loader2 className="h-5 w-5 mx-auto animate-spin mb-2" /> Loading…
                    </td></tr>
                  ) : history.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-10 text-slate-400 text-sm">No reports generated yet.</td></tr>
                  ) : history.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">{r.id}</td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {r.report_type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{r.format}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(r.generated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
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
    </div>
  );
}
