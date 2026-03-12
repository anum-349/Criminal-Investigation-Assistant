import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, Search, FolderOpen, LayoutDashboard } from "lucide-react";
import Header from "../../../components/Header";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Pagination } from "../../../components/ui/Pagination";

const PAGE_SIZE = 5;

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_CASES = [
  { id: "CA001243", title: "Robbery near Green Park", status: "Ongoing", created: "12 Dec, 2023", investigator: "Inspector A. Khan", complainant: "Ahmed Raza", firUpload: "12 Dec, 2023", firId: "FIR8765234QR", offenseType: "Robbery", location: "Green Park, Lahore" },
  { id: "CA001244", title: "Theft at Central Market", status: "Ongoing", created: "11 Dec, 2023", investigator: "Inspector B. Ali", complainant: "Sara Ahmed", firUpload: "11 Dec, 2023", firId: "FIR8765235AB", offenseType: "Theft", location: "Central Market, Karachi" },
  { id: "CA001245", title: "Burglary – Residential", status: "Closed", created: "10 Dec, 2023", investigator: "Inspector A. Khan", complainant: "Ali Hassan", firUpload: "10 Dec, 2023", firId: "FIR8765236CD", offenseType: "Burglary", location: "Model Town, Lahore" },
  { id: "CA001246", title: "Assault near Railway Station", status: "Pending", created: "09 Dec, 2023", investigator: "Inspector C. Raza", complainant: "Fatima Khan", firUpload: "09 Dec, 2023", firId: "FIR8765237EF", offenseType: "Assault", location: "Railway Station, Rawalpindi" },
  { id: "CA001247", title: "Fraud – Online Scam", status: "Ongoing", created: "08 Dec, 2023", investigator: "Inspector B. Ali", complainant: "Omar Sheikh", firUpload: "08 Dec, 2023", firId: "FIR8765238GH", offenseType: "Fraud", location: "Islamabad" },
  { id: "CA001248", title: "Murder – Homicide Investigation", status: "Ongoing", created: "07 Dec, 2023", investigator: "Inspector A. Khan", complainant: "N/A", firUpload: "07 Dec, 2023", firId: "FIR8765239IJ", offenseType: "Murder", location: "Clifton, Karachi" },
];

const MOCK_SUSPECTS = [
  { id: "S-1001", name: "Ali Raza", caseId: "CA001243", caseTitle: "Robbery near Green Park", status: "Under Investigation", relation: "Primary Suspect", reason: "Seen near crime scene", alibi: "Claims was at home" },
  { id: "S-1002", name: "Bilal Ahmed", caseId: "CA001244", caseTitle: "Theft at Central Market", status: "Cleared", relation: "Secondary Suspect", reason: "Fingerprint match", alibi: "Witness confirmed alibi" },
  { id: "S-1003", name: "Kamran Shah", caseId: "CA001246", caseTitle: "Assault near Railway Station", status: "Arrested", relation: "Primary Suspect", reason: "CCTV footage", alibi: "None" },
  { id: "S-1004", name: "Usman Malik", caseId: "CA001247", caseTitle: "Fraud – Online Scam", status: "Under Investigation", relation: "Primary Suspect", reason: "Phone record match", alibi: "Pending verification" },
  { id: "S-1005", name: "Tariq Hassan", caseId: "CA001248", caseTitle: "Murder – Homicide Investigation", status: "Arrested", relation: "Primary Suspect", reason: "DNA evidence", alibi: "None" },
];

const MOCK_VICTIMS = [
  { id: "V-2001", name: "Ahmed Raza", caseId: "CA001243", caseTitle: "Robbery near Green Park", age: 34, gender: "Male", contact: "0300-1234567", status: "Recovered", injuryType: "Minor injuries" },
  { id: "V-2002", name: "Sara Ahmed", caseId: "CA001244", caseTitle: "Theft at Central Market", age: 28, gender: "Female", contact: "0312-9876543", status: "Recovered", injuryType: "None" },
  { id: "V-2003", name: "Nadia Khan", caseId: "CA001246", caseTitle: "Assault near Railway Station", age: 42, gender: "Female", contact: "0321-5556677", status: "Hospitalized", injuryType: "Severe injuries" },
  { id: "V-2004", name: "Imran Qureshi", caseId: "CA001248", caseTitle: "Murder – Homicide Investigation", age: 45, gender: "Male", contact: "N/A", status: "Deceased", injuryType: "Fatal" },
];

const MOCK_WITNESSES = [
  { id: "W-3001", name: "Hamza Butt", caseId: "CA001243", caseTitle: "Robbery near Green Park", statement: "Saw a man running from the scene at 10 PM", credibility: "High", contact: "0333-1122334" },
  { id: "W-3002", name: "Sana Mirza", caseId: "CA001244", caseTitle: "Theft at Central Market", statement: "Noticed suspicious activity near the stall", credibility: "Medium", contact: "0345-9988776" },
  { id: "W-3003", name: "Asif Javed", caseId: "CA001246", caseTitle: "Assault near Railway Station", statement: "Heard shouting and saw altercation", credibility: "High", contact: "0311-4455667" },
  { id: "W-3004", name: "Rabia Noor", caseId: "CA001248", caseTitle: "Murder – Homicide Investigation", statement: "Heard a struggle at 10:30 PM from next apartment", credibility: "High", contact: "0322-7788990" },
];

const MOCK_LEADS = [
  { id: "L-10046", caseId: "CA001248", caseTitle: "Murder – Homicide Investigation", description: "Enhancing footage to identify unknown male leaving apartment.", type: "CCTV Analysis", severity: "High", status: "Under Review", date: "11/23/2026" },
  { id: "L-10045", caseId: "CA001248", caseTitle: "Murder – Homicide Investigation", description: "Compare prints from knife and doorknob with known suspects.", type: "Fingerprint Match", severity: "Critical", status: "In Progress", date: "11/23/2026" },
  { id: "L-10044", caseId: "CA001243", caseTitle: "Robbery near Green Park", description: "Extract call logs and messages from victim's phone for timeline.", type: "Extract Phone Data", severity: "High", status: "New", date: "11/23/2026" },
  { id: "L-10043", caseId: "CA001246", caseTitle: "Assault near Railway Station", description: "Blood spatter analysis suggests altercation in living room.", type: "Forensic Analysis", severity: "Medium", status: "Pending", date: "11/22/2026" },
];

const MOCK_LOCATIONS = [
  { id: "LOC-001", area: "Green Park, Lahore", crimeType: "Robbery", cases: 3, lastIncident: "12 Dec, 2023", severity: "High", caseIds: ["CA001243"] },
  { id: "LOC-002", area: "Central Market, Karachi", crimeType: "Theft", cases: 5, lastIncident: "11 Dec, 2023", severity: "Medium", caseIds: ["CA001244"] },
  { id: "LOC-003", area: "Railway Station, Rawalpindi", crimeType: "Assault", cases: 2, lastIncident: "09 Dec, 2023", severity: "High", caseIds: ["CA001246"] },
  { id: "LOC-004", area: "Clifton, Karachi", crimeType: "Murder", cases: 1, lastIncident: "07 Dec, 2023", severity: "Critical", caseIds: ["CA001248"] },
  { id: "LOC-005", area: "Model Town, Lahore", crimeType: "Burglary", cases: 4, lastIncident: "10 Dec, 2023", severity: "Medium", caseIds: ["CA001245"] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatusVariant = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "ongoing" || s === "open" || s === "new") return "success";
  if (s === "closed" || s === "cleared" || s === "recovered") return "default";
  if (s === "pending" || s === "hospitalized") return "warning";
  if (s === "arrested" || s === "critical" || s === "deceased") return "destructive";
  return "default";
};

const getSeverityColor = (severity) => {
  const s = (severity || "").toLowerCase();
  if (s === "critical") return "text-red-600 bg-red-50 border-red-200";
  if (s === "high") return "text-orange-600 bg-orange-50 border-orange-200";
  if (s === "medium") return "text-yellow-700 bg-yellow-50 border-yellow-200";
  return "text-green-700 bg-green-50 border-green-200";
};

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "cases", label: "Cases" },
  { key: "suspects", label: "Suspects" },
  { key: "victims", label: "Victims" },
  { key: "witnesses", label: "Witnesses" },
  { key: "leads", label: "Leads" },
  { key: "locations", label: "Locations" },
];

// ─── Result Card Components ───────────────────────────────────────────────────

const CaseCard = ({ item }) => (
  <Card className="p-4 border border-border bg-card hover:shadow-md transition-shadow">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 py-0.5 bg-muted rounded">Case</span>
          <Link to="/investigator/case" className="font-semibold text-deep-ocean-500 hover:underline">{item.id}</Link>
          <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
        </div>
        <h2 className="font-semibold text-foreground">{item.title}</h2>
        <p className="text-sm text-muted-foreground">📍 {item.location}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
          <span>Investigator: {item.investigator}</span>
          <span>Complainant: {item.complainant}</span>
          <span>Created: {item.created}</span>
          <span>Offense: {item.offenseType}</span>
        </div>
      </div>
      <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
        <span className="text-sm text-muted-foreground">FIR: {item.firId}</span>
        <Link to="/investigator/case" className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-deep-ocean-500 hover:bg-deep-ocean-900 text-white transition-colors mt-1">
          View Details <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </div>
  </Card>
);

const SuspectCard = ({ item }) => (
  <Card className="p-4 border border-border bg-card hover:shadow-md transition-shadow">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 py-0.5 bg-orange-100 text-orange-700 rounded">Suspect</span>
          <span className="font-semibold text-foreground">{item.id}</span>
          <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
        </div>
        <h2 className="font-semibold text-foreground">{item.name}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
          <span>Case: <Link to="/investigator/case" className="text-deep-ocean-500 hover:underline">{item.caseId}</Link></span>
          <span>Relation: {item.relation}</span>
          <span>Reason: {item.reason}</span>
          <span>Alibi: {item.alibi}</span>
        </div>
      </div>
      <div className="shrink-0">
        <Link to="/investigator/case" className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-deep-ocean-500 hover:bg-deep-ocean-900 text-white transition-colors">
          View Case <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </div>
  </Card>
);

const VictimCard = ({ item }) => (
  <Card className="p-4 border border-border bg-card hover:shadow-md transition-shadow">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 py-0.5 bg-red-100 text-red-700 rounded">Victim</span>
          <span className="font-semibold text-foreground">{item.id}</span>
          <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
        </div>
        <h2 className="font-semibold text-foreground">{item.name}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
          <span>Case: <Link to="/investigator/case" className="text-deep-ocean-500 hover:underline">{item.caseId}</Link></span>
          <span>Age: {item.age} · {item.gender}</span>
          <span>Contact: {item.contact}</span>
          <span>Injury: {item.injuryType}</span>
        </div>
      </div>
      <div className="shrink-0">
        <Link to="/investigator/case" className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-deep-ocean-500 hover:bg-deep-ocean-900 text-white transition-colors">
          View Case <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </div>
  </Card>
);

const WitnessCard = ({ item }) => (
  <Card className="p-4 border border-border bg-card hover:shadow-md transition-shadow">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Witness</span>
          <span className="font-semibold text-foreground">{item.id}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${item.credibility === 'High' ? 'text-green-700 bg-green-50 border-green-200' : 'text-yellow-700 bg-yellow-50 border-yellow-200'}`}>
            {item.credibility} Credibility
          </span>
        </div>
        <h2 className="font-semibold text-foreground">{item.name}</h2>
        <p className="text-sm text-muted-foreground italic">"{item.statement}"</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 text-sm text-muted-foreground">
          <span>Case: <Link to="/investigator/case" className="text-deep-ocean-500 hover:underline">{item.caseId}</Link></span>
          <span>Contact: {item.contact}</span>
        </div>
      </div>
      <div className="shrink-0">
        <Link to="/investigator/case" className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-deep-ocean-500 hover:bg-deep-ocean-900 text-white transition-colors">
          View Case <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </div>
  </Card>
);

const LeadCard = ({ item }) => (
  <Card className="p-4 border border-border bg-card hover:shadow-md transition-shadow">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 py-0.5 bg-purple-100 text-purple-700 rounded">Lead</span>
          <span className="font-semibold text-foreground">{item.id}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${getSeverityColor(item.severity)}`}>{item.severity}</span>
          <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
        </div>
        <p className="text-sm text-foreground">{item.description}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 text-sm text-muted-foreground">
          <span>Case: <Link to="/investigator/case" className="text-deep-ocean-500 hover:underline">{item.caseId}</Link></span>
          <span>Type: {item.type}</span>
          <span>Date: {item.date}</span>
        </div>
      </div>
      <div className="shrink-0">
        <Link to="/investigator/case" className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-deep-ocean-500 hover:bg-deep-ocean-900 text-white transition-colors">
          View Case <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </div>
  </Card>
);

const LocationCard = ({ item }) => (
  <Card className="p-4 border border-border bg-card hover:shadow-md transition-shadow">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 py-0.5 bg-green-100 text-green-700 rounded">Location</span>
          <span className="font-semibold text-foreground">{item.id}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${getSeverityColor(item.severity)}`}>{item.severity}</span>
        </div>
        <h2 className="font-semibold text-foreground">📍 {item.area}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 text-sm text-muted-foreground">
          <span>Crime Type: {item.crimeType}</span>
          <span>Total Cases: {item.cases}</span>
          <span>Last Incident: {item.lastIncident}</span>
          <span>Case IDs: {item.caseIds.join(", ")}</span>
        </div>
      </div>
      <div className="shrink-0">
        <Link to="/investigator/case" className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-deep-ocean-500 hover:bg-deep-ocean-900 text-white transition-colors">
          View Case <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </div>
  </Card>
);

// ─── Search Logic ─────────────────────────────────────────────────────────────

const searchAll = (kw) => {
  if (!kw) return { cases: MOCK_CASES, suspects: MOCK_SUSPECTS, victims: MOCK_VICTIMS, witnesses: MOCK_WITNESSES, leads: MOCK_LEADS, locations: MOCK_LOCATIONS };
  const q = kw.toLowerCase();
  return {
    cases: MOCK_CASES.filter(c => [c.id, c.title, c.investigator, c.complainant, c.offenseType, c.location, c.firId].some(f => f?.toLowerCase().includes(q))),
    suspects: MOCK_SUSPECTS.filter(s => [s.id, s.name, s.caseId, s.reason, s.relation, s.status].some(f => f?.toLowerCase().includes(q))),
    victims: MOCK_VICTIMS.filter(v => [v.id, v.name, v.caseId, v.status, v.injuryType, v.gender].some(f => f?.toLowerCase().includes(q))),
    witnesses: MOCK_WITNESSES.filter(w => [w.id, w.name, w.caseId, w.statement, w.credibility].some(f => f?.toLowerCase().includes(q))),
    leads: MOCK_LEADS.filter(l => [l.id, l.caseId, l.description, l.type, l.severity, l.status].some(f => f?.toLowerCase().includes(q))),
    locations: MOCK_LOCATIONS.filter(l => [l.id, l.area, l.crimeType, l.severity, ...l.caseIds].some(f => f?.toLowerCase().includes(q))),
  };
};

// ─── Main Component ───────────────────────────────────────────────────────────

const CaseSearch = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [inputValue, setInputValue] = useState(initialQuery);
  const [appliedQuery, setAppliedQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const navigate = useNavigate()
  // Sync input when URL param changes (e.g. from header search)
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setInputValue(q);
    setAppliedQuery(q);
    setCurrentPage(1);
    setActiveCategory("all");
  }, [searchParams]);

  // Get all results grouped by category
  const results = searchAll(appliedQuery);

  // Flatten results based on active category
  const getCategoryResults = () => {
    if (activeCategory === "all") {
      return [
        ...results.cases.map(r => ({ ...r, _type: "case" })),
        ...results.suspects.map(r => ({ ...r, _type: "suspect" })),
        ...results.victims.map(r => ({ ...r, _type: "victim" })),
        ...results.witnesses.map(r => ({ ...r, _type: "witness" })),
        ...results.leads.map(r => ({ ...r, _type: "lead" })),
        ...results.locations.map(r => ({ ...r, _type: "location" })),
      ];
    }
    const map = { cases: "case", suspects: "suspect", victims: "victim", witnesses: "witness", leads: "lead", locations: "location" };
    return results[activeCategory]?.map(r => ({ ...r, _type: map[activeCategory] })) || [];
  };

  const flatResults = getCategoryResults();
  const totalResults = flatResults.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, totalResults);
  const pageResults = flatResults.slice(start, end);

  // Category counts for badges
  const counts = {
    all: Object.values(results).reduce((a, arr) => a + arr.length, 0),
    cases: results.cases.length,
    suspects: results.suspects.length,
    victims: results.victims.length,
    witnesses: results.witnesses.length,
    leads: results.leads.length,
    locations: results.locations.length,
  };

  const renderCard = (item) => {
    switch (item._type) {
      case "case": return <CaseCard key={item.id} item={item} />;
      case "suspect": return <SuspectCard key={item.id} item={item} />;
      case "victim": return <VictimCard key={item.id} item={item} />;
      case "witness": return <WitnessCard key={item.id} item={item} />;
      case "lead": return <LeadCard key={item.id} item={item} />;
      case "location": return <LocationCard key={item.id} item={item} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-14">

      <Header />

      <main className="p-4 mt-6 lg:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={() => navigate("/investigator")}
            className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </button>
          <span className="text-muted-foreground text-xs">/</span>
          <button
            onClick={() => navigate("/investigator/cases")}
            className="flex items-center gap-1.5 text-xs cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            All Cases
          </button>
          <span className="text-muted-foreground text-xs">/</span>
          <span className="text-xs font-medium text-foreground">Search Results</span>
        </div>

        {/* Page title */}
        <section className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Search Results</h1>
          {appliedQuery && (
            <p className="text-sm text-muted-foreground mt-2">
              Showing results for <span className="font-semibold text-foreground">"{appliedQuery}"</span> — {counts.all} total matches
            </p>
          )}
        </section>

        {/* Category filter tabs */}
        <section className="mb-5 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => { setActiveCategory(cat.key); setCurrentPage(1); }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all
                ${activeCategory === cat.key
                  ? "bg-deep-ocean-500 text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-deep-ocean-500/10 hover:text-deep-ocean-500"
                }`}
            >
              {cat.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold
                ${activeCategory === cat.key ? "bg-white/20 text-white" : "bg-background text-muted-foreground"}`}>
                {counts[cat.key]}
              </span>
            </button>
          ))}
        </section>

        {/* Results */}
        <section className="space-y-4">
          {pageResults.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No results found{appliedQuery ? ` for "${appliedQuery}"` : ""}.</p>
              <p className="text-sm mt-1">Try different keywords or select a different category.</p>
            </Card>
          ) : (
            pageResults.map((item) => renderCard(item))
          )}
        </section>

        {totalResults > 0 && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalResults}
              start={start}
              end={end}
              itemLabel="results"
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default CaseSearch;