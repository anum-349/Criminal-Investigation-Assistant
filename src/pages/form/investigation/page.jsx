/**
 * Forms 12, 13, 14 — Investigation Forms
 * LeadSuggestionPanel | LinkCasesModal | InvestigationNotesPage
 * HCI: read-only AI panel with clear confidence signals, action affordances
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Brain, Link2, FileText, MapPin, Users, Crosshair,
  AlertTriangle, CheckCircle2, ChevronRight, LayoutDashboard,
  Plus, X, Save, Pencil, Trash2, Search, Calendar,
  AlertCircle, ArrowRight, Eye, Clock
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Header from "@/components/Header";

// ── Shared ────────────────────────────────────────────────────────────────────
const Field = ({ label, required, error, hint, children }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    {error && <p className="flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{error}</p>}
    {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
  </div>
);
const Input = ({ error, ...p }) => (
  <input className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2
    ${error ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-slate-300 bg-white focus:ring-deep-ocean/30 focus:border-deep-ocean"}`} {...p} />
);
const Select = ({ options, error, placeholder = "Select…", ...p }) => (
  <select className={`w-full px-3 py-2.5 rounded-lg border text-sm appearance-none bg-white focus:outline-none focus:ring-2
    ${error ? "border-red-400 bg-red-50" : "border-slate-300 focus:ring-deep-ocean/30 focus:border-deep-ocean"}`} {...p}>
    <option value="">{placeholder}</option>
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);
const Textarea = ({ error, rows = 3, ...p }) => (
  <textarea rows={rows} className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 resize-y
    ${error ? "border-red-400 bg-red-50" : "border-slate-300 bg-white focus:ring-deep-ocean/30 focus:border-deep-ocean"}`} {...p} />
);

const ConfidenceBar = ({ value, color = "bg-deep-ocean" }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
    </div>
    <span className="text-xs font-bold text-slate-600 w-9 text-right">{value}%</span>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// FORM 12 — Lead Suggestion Panel (AI-generated, read-mostly)
// ══════════════════════════════════════════════════════════════════════════════
const MOCK_LEADS = [
  {
    id: "LEAD-081", caseId: "C-2052", type: "Suspect Match", severity: "Critical", status: "New", confidence: 89,
    suggestedSuspect: { name: "Zafar Iqbal (alias: Kala)", suspectId: "SUP-0041", basis: "Same MO, same weapon type (pistol), active in same area." },
    similarCase: { id: "C-2040", title: "Armed Robbery – Saddar", similarity: 84 },
    weaponPattern: { weapon: "Firearm (Pistol)", matchedCases: ["C-2040", "C-2033", "C-2019"], frequency: "3x in 30 days" },
    locationPattern: { area: "Gulshan-e-Iqbal", radius: "2km", incidents: 5, period: "last 30 days" },
    nextStep: "Cross-reference suspect SUP-0041's known associates with victim's neighbourhood. Review CCTV on routes between suspect's last known address and crime scene.",
    generatedAt: "2026-04-22 09:15",
    dismissed: false,
  },
  {
    id: "LEAD-082", caseId: "C-2052", type: "Location Pattern", severity: "High", status: "Under Review", confidence: 76,
    suggestedSuspect: null,
    similarCase: { id: "C-2047", title: "Drug Trafficking – Port Area", similarity: 68 },
    weaponPattern: { weapon: "Firearm (Pistol)", matchedCases: ["C-2047"], frequency: "1x in 15 days" },
    locationPattern: { area: "Karachi East Zone", radius: "5km", incidents: 8, period: "last 60 days" },
    nextStep: "Deploy surveillance on Block 5 exit routes. Coordinate with Saddar PS for shared intelligence on vehicle (White Toyota Corolla).",
    generatedAt: "2026-04-22 09:17",
    dismissed: false,
  },
];

const SEVERITY_STYLES = {
  Critical: "bg-red-100 text-red-700 border-red-200",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  Low: "bg-green-100 text-green-700 border-green-200",
};
const STATUS_VARIANTS = { New: "destructive", "Under Review": "warning", Actioned: "success", Dismissed: "default" };

export function LeadSuggestionPanel({ caseId = "C-2052" }) {
  const [leads, setLeads] = useState(MOCK_LEADS);
  const [expanded, setExpanded] = useState(MOCK_LEADS[0]?.id);
  const [actioning, setActioning] = useState(null);

  const action = async (id, newStatus) => {
    setActioning(id);
    await new Promise(r => setTimeout(r, 600));
    setLeads(ls => ls.map(l => l.id === id ? { ...l, status: newStatus } : l));
    setActioning(null);
  };

  const activeLeads = leads.filter(l => l.status !== "Dismissed");
  const confidenceColor = (v) => v >= 80 ? "bg-emerald-500" : v >= 60 ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-deep-ocean/10">
            <Brain className="h-5 w-5 text-deep-ocean" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">AI Investigative Leads</h3>
            <p className="text-xs text-slate-500">Auto-generated from NLP analysis · Case {caseId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          {activeLeads.length} active lead{activeLeads.length !== 1 && "s"}
        </div>
      </div>

      {activeLeads.length === 0 && (
        <Card className="p-8 text-center text-slate-400">
          <Brain className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No active leads for this case.</p>
        </Card>
      )}

      {activeLeads.map(lead => (
        <Card key={lead.id} className={`p-0 overflow-hidden border-l-4 ${SEVERITY_STYLES[lead.severity]?.includes("red") ? "border-l-red-400" : lead.severity === "High" ? "border-l-orange-400" : "border-l-amber-400"}`}>
          {/* Lead summary row */}
          <button
            className="w-full flex items-start gap-4 p-4 text-left hover:bg-slate-50 transition-colors cursor-pointer"
            onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
          >
            <div className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${SEVERITY_STYLES[lead.severity]}`}>
              {lead.severity}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-sm font-bold text-slate-800">{lead.id} — {lead.type}</span>
                <Badge variant={STATUS_VARIANTS[lead.status] || "default"}>{lead.status}</Badge>
              </div>
              <ConfidenceBar value={lead.confidence} color={confidenceColor(lead.confidence)} />
              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Generated {lead.generatedAt}
              </p>
            </div>
            <ChevronRight className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${expanded === lead.id ? "rotate-90" : ""}`} />
          </button>

          {/* Expanded detail */}
          {expanded === lead.id && (
            <div className="border-t border-slate-100 p-5 space-y-5 bg-slate-50/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Suggested suspect */}
                {lead.suggestedSuspect && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Suggested Suspect</p>
                    <p className="text-sm font-semibold text-slate-800">{lead.suggestedSuspect.name}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{lead.suggestedSuspect.basis}</p>
                    <p className="text-xs font-mono text-deep-ocean">{lead.suggestedSuspect.suspectId}</p>
                  </div>
                )}
                {/* Similar case */}
                {lead.similarCase && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />Similar Past Case</p>
                    <p className="text-sm font-semibold text-slate-800">{lead.similarCase.title}</p>
                    <p className="text-xs font-mono text-deep-ocean">{lead.similarCase.id}</p>
                    <ConfidenceBar value={lead.similarCase.similarity} color="bg-blue-400" />
                    <p className="text-xs text-slate-400">Similarity score</p>
                  </div>
                )}
                {/* Weapon pattern */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Crosshair className="h-3.5 w-3.5" />Weapon Pattern</p>
                  <p className="text-sm font-semibold text-slate-800">{lead.weaponPattern.weapon}</p>
                  <p className="text-xs text-slate-500">Matched in {lead.weaponPattern.frequency}</p>
                  <div className="flex flex-wrap gap-1">
                    {lead.weaponPattern.matchedCases.map(c => <span key={c} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded font-mono">{c}</span>)}
                  </div>
                </div>
                {/* Location pattern */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Location Pattern</p>
                  <p className="text-sm font-semibold text-slate-800">{lead.locationPattern.area}</p>
                  <p className="text-xs text-slate-500">{lead.locationPattern.incidents} incidents within {lead.locationPattern.radius} in {lead.locationPattern.period}</p>
                </div>
              </div>
              {/* Next recommended step */}
              <div className="bg-deep-ocean/5 border border-deep-ocean/15 rounded-xl p-4">
                <p className="text-xs font-bold text-deep-ocean uppercase tracking-wider mb-2 flex items-center gap-1.5"><ArrowRight className="h-3.5 w-3.5" />Next Recommended Step</p>
                <p className="text-sm text-slate-700 leading-relaxed">{lead.nextStep}</p>
              </div>
              {/* Action buttons */}
              <div className="flex gap-2">
                <button onClick={() => action(lead.id, "Actioned")} disabled={actioning === lead.id || lead.status === "Actioned"}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
                    ${lead.status === "Actioned" ? "bg-emerald-100 text-emerald-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                  <CheckCircle2 className="h-4 w-4" /> Mark Actioned
                </button>
                <button onClick={() => action(lead.id, "Under Review")} disabled={actioning === lead.id || lead.status === "Under Review"}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
                  <Eye className="h-4 w-4" /> Under Review
                </button>
                <button onClick={() => action(lead.id, "Dismissed")}
                  className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                  <X className="h-4 w-4" /> Dismiss
                </button>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FORM 13 — Link Cases Modal
// ══════════════════════════════════════════════════════════════════════════════
export function LinkCasesModal({ currentCaseId = "C-2052", onClose, onSave }) {
  const [form, setForm] = useState({
    currentCaseId, linkedCaseId: "", similarityScore: "", reason: "", linkType: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => ({ ...er, [k]: "" })); };

  const validate = () => {
    const e = {};
    if (!form.linkedCaseId.trim()) e.linkedCaseId = "Linked case ID is required";
    if (form.linkedCaseId.trim() === form.currentCaseId) e.linkedCaseId = "Cannot link a case to itself";
    if (!form.reason.trim()) e.reason = "Reason for linking is required";
    if (!form.linkType) e.linkType = "Link type is required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    onSave?.({ ...form, id: "LINK-" + Date.now() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-deep-ocean/10"><Link2 className="h-4 w-4 text-deep-ocean" /></div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Link Cases</h2>
              <p className="text-xs text-slate-500">Current case: {currentCaseId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Current Case ID">
              <div className="px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500 font-mono">{form.currentCaseId}</div>
            </Field>
            <Field label="Linked Case ID" required error={errors.linkedCaseId}>
              <Input value={form.linkedCaseId} onChange={set("linkedCaseId")} placeholder="e.g. C-2040" error={errors.linkedCaseId} />
            </Field>
          </div>

          <Field label="Link Type" required error={errors.linkType}>
            <Select
              options={["Same Suspect", "Same Victim", "Same Weapon", "Same Location", "Same MO", "Common Evidence", "Related Incident", "Other"]}
              value={form.linkType} onChange={set("linkType")} error={errors.linkType}
            />
          </Field>

          <Field label="Similarity Score (%)" hint="Optional — enter a percentage (0–100) if AI-calculated or estimated">
            <div className="space-y-2">
              <Input type="number" min="0" max="100" value={form.similarityScore} onChange={set("similarityScore")} placeholder="e.g. 78" />
              {form.similarityScore && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full">
                    <div className="h-1.5 rounded-full bg-deep-ocean transition-all" style={{ width: `${Math.min(100, Number(form.similarityScore))}%` }} />
                  </div>
                  <span className="text-xs text-slate-500">{form.similarityScore}%</span>
                </div>
              )}
            </div>
          </Field>

          <Field label="Reason for Linking" required error={errors.reason}>
            <Textarea value={form.reason} onChange={set("reason")} rows={4}
              placeholder="Explain why these cases are related (e.g., same suspect CNIC found in both, same weapon ballistics, witness identifies same perpetrator)…"
              error={errors.reason} />
          </Field>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 border border-slate-300 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 cursor-pointer transition-all
              ${saving ? "bg-deep-ocean/60" : "bg-deep-ocean hover:bg-deep-ocean-900"}`}>
            {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Linking…</> : <><Link2 className="h-4 w-4" />Link Cases</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FORM 14 — Investigation Notes Page
// ══════════════════════════════════════════════════════════════════════════════
const MOCK_NOTES = [
  { id: "NOTE-001", caseId: "C-2052", officerName: "Insp. Rashid Ali Khan", date: "2026-04-22", title: "Initial Site Visit", detail: "Visited the crime scene at Main Street Market. CCTV footage from adjacent shop recovered. Footprints preserved near the back exit. Cashier (victim Saleem) available for detailed statement tomorrow.", createdAt: "09:30" },
  { id: "NOTE-002", caseId: "C-2052", officerName: "Insp. Rashid Ali Khan", date: "2026-04-21", title: "Suspect Intel from CI", detail: "Confidential informant provided tip that Zafar Iqbal (alias Kala) was seen in the area two days before the robbery. Cross-referencing with his last known associates.", createdAt: "16:45" },
];

export function InvestigationNotesPage() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState(MOCK_NOTES);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ caseId: "", officerName: "", date: "", title: "", detail: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => ({ ...er, [k]: "" })); };

  const validate = () => {
    const e = {};
    if (!form.caseId.trim()) e.caseId = "Case ID required";
    if (!form.officerName.trim()) e.officerName = "Officer name required";
    if (!form.date) e.date = "Date required";
    if (!form.title.trim()) e.title = "Note title required";
    if (!form.detail.trim()) e.detail = "Note detail required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const openAdd = () => { setForm({ caseId: "", officerName: "Insp. Rashid Ali Khan", date: new Date().toISOString().split("T")[0], title: "", detail: "" }); setEditing(null); setErrors({}); setShowForm(true); };
  const openEdit = (n) => { setForm({ ...n }); setEditing(n.id); setErrors({}); setShowForm(true); };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    if (editing) setNotes(ns => ns.map(n => n.id === editing ? { ...n, ...form } : n));
    else setNotes(ns => [{ ...form, id: "NOTE-" + Date.now(), createdAt: new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }) }, ...ns]);
    setSaving(false);
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = (id) => { setNotes(ns => ns.filter(n => n.id !== id)); setToDelete(null); };

  const filtered = notes.filter(n => {
    const q = search.toLowerCase();
    return !q || [n.caseId, n.officerName, n.title, n.detail].some(f => f?.toLowerCase().includes(q));
  });

  return (
    <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-14">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <button onClick={() => navigate("/investigator")} className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition-colors"><LayoutDashboard className="h-3.5 w-3.5" />Dashboard</button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-800 font-medium">Investigation Notes</span>
        </nav>

        {/* Page header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><FileText className="h-6 w-6 text-deep-ocean" />Investigation Notes</h1>
            <p className="text-sm text-slate-500 mt-1">Log and track all investigative observations and intelligence</p>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-deep-ocean text-white rounded-lg text-sm font-semibold hover:bg-deep-ocean-900 cursor-pointer transition-colors shadow-sm">
            <Plus className="h-4 w-4" /> Add Note
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes by case ID, officer, title…"
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean" />
        </div>

        {/* Notes list */}
        {filtered.length === 0 ? (
          <Card className="p-10 text-center text-slate-400">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No notes found.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map(note => (
              <Card key={note.id} className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold text-slate-800">{note.title}</h4>
                      <span className="text-xs font-mono bg-deep-ocean/10 text-deep-ocean px-2 py-0.5 rounded">{note.caseId}</span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <span>{note.officerName}</span>
                      <span className="text-slate-300">•</span>
                      <Calendar className="h-3 w-3" />{note.date}
                      {note.createdAt && <><span className="text-slate-300">•</span><Clock className="h-3 w-3" />{note.createdAt}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(note)} className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors cursor-pointer" title="Edit"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => setToDelete(note)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{note.detail}</p>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">{editing ? "Edit Note" : "Add Investigation Note"}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Case ID" required error={errors.caseId}>
                  <Input value={form.caseId} onChange={set("caseId")} placeholder="e.g. C-2052" error={errors.caseId} />
                </Field>
                <Field label="Date" required error={errors.date}>
                  <Input type="date" value={form.date} onChange={set("date")} max={new Date().toISOString().split("T")[0]} error={errors.date} />
                </Field>
                <Field label="Officer Name" required error={errors.officerName} className="col-span-2">
                  <Input value={form.officerName} onChange={set("officerName")} error={errors.officerName} />
                </Field>
              </div>
              <Field label="Note Title" required error={errors.title}>
                <Input value={form.title} onChange={set("title")} placeholder="Brief descriptive title…" error={errors.title} />
              </Field>
              <Field label="Note Detail" required error={errors.detail}>
                <Textarea value={form.detail} onChange={set("detail")} rows={6} placeholder="Full note — observations, intel, actions taken, follow-ups…" error={errors.detail} />
              </Field>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-slate-300 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 cursor-pointer transition-all
                  ${saving ? "bg-deep-ocean/60" : "bg-deep-ocean hover:bg-deep-ocean-900"}`}>
                {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : <><Save className="h-4 w-4" />{editing ? "Save Changes" : "Add Note"}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto"><Trash2 className="h-5 w-5 text-red-600" /></div>
            <h3 className="text-base font-bold text-slate-800">Delete Note?</h3>
            <p className="text-sm text-slate-500">This will permanently remove <strong>"{toDelete.title}"</strong>.</p>
            <div className="flex gap-3">
              <button onClick={() => setToDelete(null)} className="flex-1 border border-slate-300 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button onClick={() => handleDelete(toDelete.id)} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 cursor-pointer flex items-center justify-center gap-2">
                <Trash2 className="h-4 w-4" />Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}