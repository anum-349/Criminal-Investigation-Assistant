/**
 * Forms 9, 10, 11 — Person Management
 * SuspectProfilePage | VictimProfilePage | WitnessFormModal
 * Route: /investigator/suspects/:id  /investigator/victims/:id
 * HCI: risk colour-coding, photo upload, related case chips, clear hierarchy
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Users, Shield, AlertTriangle, FileText, MapPin,
  Phone, ChevronRight, LayoutDashboard, Camera, Plus, X,
  Save, Eye, Pencil, CheckCircle2, AlertCircle, MessageSquare
} from "lucide-react";
import Header from "../../../components/Header";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";

// ── Shared helpers ────────────────────────────────────────────────────────────
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
const Select = ({ error, options, placeholder = "Select…", ...p }) => (
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

const RISK_COLORS = {
  "Critical": "bg-red-100 text-red-700 border-red-200",
  "High": "bg-orange-100 text-orange-700 border-orange-200",
  "Medium": "bg-amber-100 text-amber-700 border-amber-200",
  "Low": "bg-green-100 text-green-700 border-green-200",
};

// ══════════════════════════════════════════════════════════════════════════════
// FORM 9 — Suspect Profile
// ══════════════════════════════════════════════════════════════════════════════
const MOCK_SUSPECT = {
  id: "SUP-0041", name: "Zafar Iqbal", alias: "Kala", cnic: "42201-1234567-9",
  age: "34", gender: "Male", address: "Flat 3B, Liaquatabad, Karachi",
  phone: "+92-312-8765432", occupation: "Unemployed", riskLevel: "High",
  knownAffiliations: "Lyari Gang War – East Unit",
  physicalDescription: "5ft 10in, medium build, dark complexion, scar on left cheek, tattoo on right forearm",
  criminalRecord: true, previousCases: ["C-2040", "C-2033", "C-2019"],
  status: "At Large", notes: "Considered armed and dangerous. Do not approach alone.",
};

export function SuspectProfilePage() {
  const navigate = useNavigate();
  const [suspect, setSuspect] = useState(MOCK_SUSPECT);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...MOCK_SUSPECT });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newCase, setNewCase] = useState("");

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.riskLevel) e.riskLevel = "Risk level required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSuspect({ ...form });
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const addCase = () => {
    if (newCase.trim() && !form.previousCases.includes(newCase.trim())) {
      setForm(f => ({ ...f, previousCases: [...f.previousCases, newCase.trim()] }));
      setNewCase("");
    }
  };

  const removeCase = (c) => setForm(f => ({ ...f, previousCases: f.previousCases.filter(x => x !== c) }));

  const data = editing ? form : suspect;

  return (
    <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-14">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <button onClick={() => navigate("/investigator")} className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition-colors"><LayoutDashboard className="h-3.5 w-3.5" />Dashboard</button>
          <ChevronRight className="h-3 w-3" />
          <button onClick={() => navigate("/investigator/cases")} className="hover:text-slate-800 cursor-pointer transition-colors">Cases</button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-800 font-medium">Suspect Profile</span>
        </nav>

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row gap-5">
            {/* Photo */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-24 h-24 rounded-xl bg-deep-ocean/10 border-2 border-dashed border-deep-ocean/30 flex flex-col items-center justify-center text-deep-ocean/50 cursor-pointer hover:bg-deep-ocean/15 transition-colors relative overflow-hidden">
                <Camera className="h-6 w-6" />
                <span className="text-[10px] mt-1 font-medium">Photo</span>
              </div>
              <span className="text-[10px] text-slate-400 text-center">Click to upload</span>
            </div>
            {/* Basic info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-start gap-3 mb-2">
                <h1 className="text-xl font-bold text-slate-800">{data.name}</h1>
                {data.alias && <span className="text-sm text-slate-500 italic">"{data.alias}"</span>}
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${RISK_COLORS[data.riskLevel] || "bg-slate-100 text-slate-600"}`}>
                  {data.riskLevel} Risk
                </span>
                <Badge variant={data.status === "Arrested" ? "success" : "destructive"}>{data.status}</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600">
                <div><span className="font-semibold text-slate-400 uppercase">ID</span><p className="font-mono">{data.id}</p></div>
                <div><span className="font-semibold text-slate-400 uppercase">CNIC</span><p>{data.cnic || "—"}</p></div>
                <div><span className="font-semibold text-slate-400 uppercase">Age</span><p>{data.age} yrs / {data.gender}</p></div>
                <div><span className="font-semibold text-slate-400 uppercase">Cases</span><p>{data.previousCases.length} linked</p></div>
              </div>
            </div>
            <div className="flex gap-2 self-start">
              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-deep-ocean text-white rounded-lg text-sm font-medium hover:bg-deep-ocean-900 cursor-pointer transition-colors">
                  <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                </button>
              ) : (
                <>
                  <button onClick={() => { setEditing(false); setForm({ ...suspect }); setErrors({}); }}
                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 cursor-pointer transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer transition-colors
                      ${saving ? "bg-deep-ocean/60" : "bg-deep-ocean hover:bg-deep-ocean-900"}`}>
                    {saving ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : <><Save className="h-3.5 w-3.5" />Save</>}
                  </button>
                </>
              )}
            </div>
          </div>
          {saved && (
            <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
              <CheckCircle2 className="h-4 w-4" /> Suspect profile saved successfully.
            </div>
          )}
          {suspect.criminalRecord && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Known criminal record — exercise caution.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: details form */}
          <div className="lg:col-span-2 space-y-5">
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><User className="h-4 w-4 text-deep-ocean" />Personal Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full Name" required error={errors.name}>
                  {editing ? <Input value={form.name} onChange={set("name")} error={errors.name} /> : <p className="text-sm text-slate-800 py-2">{data.name}</p>}
                </Field>
                <Field label="Alias / Nickname">
                  {editing ? <Input value={form.alias} onChange={set("alias")} placeholder="Known by…" /> : <p className="text-sm text-slate-800 py-2">{data.alias || "—"}</p>}
                </Field>
                <Field label="CNIC Number">
                  {editing ? <Input value={form.cnic} onChange={set("cnic")} placeholder="XXXXX-XXXXXXX-X" /> : <p className="text-sm text-slate-800 py-2">{data.cnic || "—"}</p>}
                </Field>
                <Field label="Age">
                  {editing ? <Input type="number" value={form.age} onChange={set("age")} min="1" max="120" /> : <p className="text-sm text-slate-800 py-2">{data.age} yrs</p>}
                </Field>
                <Field label="Gender">
                  {editing ? <Select options={["Male", "Female", "Transgender / Other", "Unknown"]} value={form.gender} onChange={set("gender")} /> : <p className="text-sm text-slate-800 py-2">{data.gender}</p>}
                </Field>
                <Field label="Occupation">
                  {editing ? <Input value={form.occupation} onChange={set("occupation")} placeholder="If known" /> : <p className="text-sm text-slate-800 py-2">{data.occupation || "—"}</p>}
                </Field>
                <Field label="Phone / Contact">
                  {editing ? <Input value={form.phone} onChange={set("phone")} placeholder="+92-3XX-XXXXXXX" /> : <p className="text-sm text-slate-800 py-2">{data.phone || "—"}</p>}
                </Field>
                <Field label="Suspect Status">
                  {editing ? <Select options={["At Large", "Detained", "Arrested", "Charged", "Absconding", "Released", "Deceased"]} value={form.status} onChange={set("status")} /> : <p className="text-sm text-slate-800 py-2">{data.status}</p>}
                </Field>
              </div>
              <Field label="Last Known Address">
                {editing ? <Textarea value={form.address} onChange={set("address")} rows={2} placeholder="Full residential address" /> : <p className="text-sm text-slate-800 py-2">{data.address || "—"}</p>}
              </Field>
              <Field label="Physical Description">
                {editing ? <Textarea value={form.physicalDescription} onChange={set("physicalDescription")} rows={2} placeholder="Height, build, distinguishing marks…" /> : <p className="text-sm text-slate-800 py-2">{data.physicalDescription || "—"}</p>}
              </Field>
              <Field label="Known Affiliations / Gang">
                {editing ? <Input value={form.knownAffiliations} onChange={set("knownAffiliations")} placeholder="Criminal organization, gang" /> : <p className="text-sm text-slate-800 py-2">{data.knownAffiliations || "—"}</p>}
              </Field>
            </Card>

            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-700">Additional Notes</h3>
              {editing
                ? <Textarea value={form.notes} onChange={set("notes")} rows={3} placeholder="Investigator notes, warnings…" />
                : <p className="text-sm text-slate-700 leading-relaxed">{data.notes || "—"}</p>}
            </Card>
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Shield className="h-4 w-4 text-deep-ocean" />Risk & Status</h3>
              <Field label="Risk Level" required error={errors.riskLevel}>
                {editing
                  ? <Select options={["Critical", "High", "Medium", "Low"]} value={form.riskLevel} onChange={set("riskLevel")} error={errors.riskLevel} />
                  : <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full border ${RISK_COLORS[data.riskLevel]}`}>{data.riskLevel}</span>}
              </Field>
              {editing && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.criminalRecord} onChange={e => setForm(f => ({ ...f, criminalRecord: e.target.checked }))} className="w-4 h-4 rounded" />
                  Has Prior Criminal Record
                </label>
              )}
            </Card>

            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><FileText className="h-4 w-4 text-deep-ocean" />Linked Cases</h3>
              <div className="flex flex-wrap gap-2">
                {data.previousCases.map(c => (
                  <span key={c} className="flex items-center gap-1 text-xs font-medium bg-deep-ocean/10 text-deep-ocean px-2.5 py-1 rounded-full">
                    {c}
                    {editing && <button onClick={() => removeCase(c)} className="hover:text-red-600 cursor-pointer"><X className="h-3 w-3" /></button>}
                  </span>
                ))}
              </div>
              {editing && (
                <div className="flex gap-2">
                  <input value={newCase} onChange={e => setNewCase(e.target.value)} onKeyDown={e => e.key === "Enter" && addCase()}
                    placeholder="Add case ID…" className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-deep-ocean/30" />
                  <button onClick={addCase} className="p-1.5 rounded-lg bg-deep-ocean text-white hover:bg-deep-ocean-900 cursor-pointer"><Plus className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FORM 10 — Victim Profile
// ══════════════════════════════════════════════════════════════════════════════
const MOCK_VICTIM = {
  id: "VIC-0017", name: "Muhammad Saleem", age: "45", gender: "Male",
  cnic: "42201-9876543-1", contact: "+92-321-4567890",
  address: "House 12, Block 5, Gulshan-e-Iqbal, Karachi",
  occupation: "Shopkeeper", status: "Alive",
  injuryType: "Minor", relatedCases: ["C-2052", "C-2041"],
  statement: "Three men entered my shop at night. They were armed with pistols. They demanded cash from the register and threatened me not to call police.",
  protectionRequired: true, medicalReport: true,
};

export function VictimProfilePage() {
  const navigate = useNavigate();
  const [victim, setVictim] = useState(MOCK_VICTIM);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...MOCK_VICTIM });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setVictim({ ...form });
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const data = editing ? form : victim;

  return (
    <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-14">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <button onClick={() => navigate("/investigator")} className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition-colors"><LayoutDashboard className="h-3.5 w-3.5" />Dashboard</button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-800 font-medium">Victim Profile</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="w-20 h-20 rounded-xl bg-blue-50 border-2 border-dashed border-blue-200 flex items-center justify-center">
              <User className="h-8 w-8 text-blue-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-800">{data.name}</h1>
              <p className="text-xs text-slate-500 mt-0.5">Victim ID: <span className="font-mono font-medium">{data.id}</span></p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant={data.status === "Deceased" ? "destructive" : data.status === "Alive" ? "success" : "warning"}>{data.status}</Badge>
                {data.protectionRequired && <Badge variant="destructive">Protection Required</Badge>}
                {data.medicalReport && <Badge variant="default">Medical Report Filed</Badge>}
              </div>
            </div>
            <div className="flex gap-2 self-start">
              {!editing
                ? <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-deep-ocean text-white rounded-lg text-sm cursor-pointer hover:bg-deep-ocean-900 transition-colors"><Pencil className="h-3.5 w-3.5 mr-2" />Edit</button>
                : <>
                  <button onClick={() => { setEditing(false); setForm({ ...victim }); }} className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 cursor-pointer">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer ${saving ? "bg-deep-ocean/60" : "bg-deep-ocean hover:bg-deep-ocean-900"} transition-colors`}>
                    {saving ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : <><Save className="h-3.5 w-3.5" />Save</>}
                  </button>
                </>}
            </div>
          </div>
          {saved && <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5"><CheckCircle2 className="h-4 w-4" />Victim profile saved.</div>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-700">Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  ["Name", "name", "text", "Full name as on CNIC"],
                  ["Age", "age", "number", "Age in years"],
                  ["CNIC", "cnic", "text", "XXXXX-XXXXXXX-X"],
                  ["Contact", "contact", "text", "+92-3XX-XXXXXXX"],
                  ["Occupation", "occupation", "text", ""],
                ].map(([label, key, type, placeholder]) => (
                  <Field key={key} label={label}>
                    {editing
                      ? <Input type={type} value={form[key]} onChange={set(key)} placeholder={placeholder} />
                      : <p className="text-sm text-slate-800 py-2">{data[key] || "—"}</p>}
                  </Field>
                ))}
                <Field label="Gender">
                  {editing ? <Select options={["Male", "Female", "Transgender / Other"]} value={form.gender} onChange={set("gender")} /> : <p className="text-sm text-slate-800 py-2">{data.gender}</p>}
                </Field>
                <Field label="Status">
                  {editing ? <Select options={["Alive", "Deceased", "Critical", "Hospitalized", "Missing"]} value={form.status} onChange={set("status")} /> : <p className="text-sm text-slate-800 py-2">{data.status}</p>}
                </Field>
                <Field label="Nature of Injury / Harm">
                  {editing ? <Select options={["Fatal", "Severe", "Moderate", "Minor", "No Physical Injury", "Psychological Trauma"]} value={form.injuryType} onChange={set("injuryType")} /> : <p className="text-sm text-slate-800 py-2">{data.injuryType}</p>}
                </Field>
              </div>
              <Field label="Address">
                {editing ? <Textarea value={form.address} onChange={set("address")} rows={2} /> : <p className="text-sm text-slate-800 py-2">{data.address || "—"}</p>}
              </Field>
              {editing && (
                <div className="flex flex-wrap gap-4">
                  {[["protectionRequired", "Protection Required"], ["medicalReport", "Medical Report Filed"]].map(([k, l]) => (
                    <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={!!form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.checked }))} className="w-4 h-4 rounded" />{l}
                    </label>
                  ))}
                </div>
              )}
            </Card>
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-deep-ocean" />Victim Statement</h3>
              {editing ? <Textarea value={form.statement} onChange={set("statement")} rows={4} placeholder="Statement given by victim…" /> : <p className="text-sm text-slate-700 leading-relaxed">{data.statement || "—"}</p>}
            </Card>
          </div>
          <div className="space-y-5">
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-700">Linked Cases</h3>
              {data.relatedCases.map(c => (
                <div key={c} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-deep-ocean/5 border border-deep-ocean/10 text-xs font-medium text-deep-ocean cursor-pointer hover:bg-deep-ocean/10 transition-colors">
                  <FileText className="h-3.5 w-3.5" />{c}
                </div>
              ))}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FORM 11 — Witness Form (Modal)
// ══════════════════════════════════════════════════════════════════════════════
export function WitnessFormModal({ caseId = "C-2052", witness = null, onClose, onSave }) {
  const isEdit = !!witness;
  const [form, setForm] = useState(witness || {
    name: "", contact: "", address: "", statement: "",
    credibility: "", relatedCase: caseId, anonymous: false, protectionRequired: false,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => ({ ...er, [k]: "" })); };

  const validate = () => {
    const e = {};
    if (!form.name.trim() && !form.anonymous) e.name = "Name or anonymous required";
    if (!form.statement.trim()) e.statement = "Statement is required";
    if (!form.relatedCase.trim()) e.relatedCase = "Related case ID required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    onSave?.({ ...form, id: witness?.id || "WIT-" + Date.now() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-deep-ocean/10"><User className="h-4 w-4 text-deep-ocean" /></div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{isEdit ? "Edit Witness" : "Add Witness"}</h2>
              <p className="text-xs text-slate-500">Case: {form.relatedCase}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
        </div>

        <div className="p-6 space-y-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={form.anonymous} onChange={e => setForm(f => ({ ...f, anonymous: e.target.checked, name: e.target.checked ? "Anonymous" : "" }))} className="w-4 h-4 rounded" />
            <span className="font-medium text-slate-700">Anonymous Witness</span>
            <span className="text-xs text-slate-400">(name will be hidden)</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Witness Name" required={!form.anonymous} error={errors.name}>
              <Input value={form.name} onChange={set("name")} disabled={form.anonymous} placeholder="Full name" error={errors.name} />
            </Field>
            <Field label="Contact Number">
              <Input value={form.contact} onChange={set("contact")} placeholder="+92-3XX-XXXXXXX" />
            </Field>
            <Field label="Related Case" required error={errors.relatedCase}>
              <Input value={form.relatedCase} onChange={set("relatedCase")} error={errors.relatedCase} />
            </Field>
            <Field label="Credibility Assessment">
              <Select options={["High", "Medium", "Low", "Unverified"]} value={form.credibility} onChange={set("credibility")} placeholder="Select credibility" />
            </Field>
          </div>

          <Field label="Address">
            <Textarea value={form.address} onChange={set("address")} rows={2} placeholder="Witness residential address" />
          </Field>

          <Field label="Statement / Testimony" required error={errors.statement}>
            <Textarea value={form.statement} onChange={set("statement")} rows={5} placeholder="Full witness statement as given…" error={errors.statement} />
          </Field>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.protectionRequired} onChange={e => setForm(f => ({ ...f, protectionRequired: e.target.checked }))} className="w-4 h-4 rounded" />
            <span className="text-slate-700">Witness Protection Required</span>
          </label>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 border border-slate-300 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 cursor-pointer transition-all
              ${saving ? "bg-deep-ocean/60" : "bg-deep-ocean hover:bg-deep-ocean-900"}`}>
            {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : <><CheckCircle2 className="h-4 w-4" />{isEdit ? "Save Changes" : "Add Witness"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}