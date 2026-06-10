import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronRight, Search, FolderOpen, LayoutDashboard,
  Loader2, AlertTriangle,
} from "lucide-react";
import Header from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { getAuthHeader } from "@/services/apiCommon";

const PAGE_SIZE = 5;

const getStatusVariant = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "ongoing" || s === "open" || s === "new" || s.includes("active") || s.includes("under"))
    return "success";
  if (s === "closed" || s === "cleared" || s === "recovered" || s === "solved") return "default";
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

// Map category key → singular tag used inside the card and for routing.
const TYPE_FOR_CATEGORY = {
  cases: "case",
  suspects: "suspect",
  victims: "victim",
  witnesses: "witness",
  leads: "lead",
  locations: "location",
};

// Build a deep link URL for a result back to the parent case detail page.
const caseHref = (caseId) =>
  caseId && caseId !== "—"
    ? `/investigator/case/${encodeURIComponent(caseId)}`
    : "/investigator/case";

// ─── Result Card Components ───────────────────────────────────────────────────
// (Identical layout to the previous page; only data shape changes — backend
//  returns snake_case so the cards read item.case_id etc.)

const CaseCard = ({ item }) => (
  <Card className="p-4 border border-border bg-card hover:shadow-md transition-shadow">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 py-0.5 bg-muted rounded">Case</span>
          <Link to={caseHref(item.id)} className="font-semibold text-deep-ocean-500 hover:underline">{item.id}</Link>
          <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
        </div>
        <h2 className="font-semibold text-foreground">{item.title}</h2>
        <p className="text-sm text-muted-foreground">📍 {item.location}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
          <span><strong>Investigator:</strong> {item.investigator}</span>
          <span><strong>Complainant:</strong> {item.complainant || "—"}</span>
          <span><strong>Created:</strong> {item.created}</span>
          <span><strong>Offense:</strong> {item.offense_type}</span>
        </div>
      </div>
      <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
        <span className="text-sm text-muted-foreground">FIR: {item.fir_id || "—"}</span>
        <Link to={caseHref(item.id)} className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-deep-ocean-500 hover:bg-deep-ocean-900 text-white transition-colors mt-1">
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
        <h2 className="font-semibold text-foreground">{item.name || "Unknown"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
          <span><strong>Case:</strong> <Link to={caseHref(item.case_id)} className="text-deep-ocean-500 hover:underline">{item.case_id}</Link></span>
          <span><strong>Relation:</strong> {item.relation || "—"}</span>
          <span><strong>Reason:</strong> {item.reason || "—"}</span>
          <span><strong>Alibi:</strong> {item.alibi || "—"}</span>
        </div>
      </div>
      <div className="shrink-0">
        <Link to={caseHref(item.case_id)} className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-deep-ocean-500 hover:bg-deep-ocean-900 text-white transition-colors">
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
        <h2 className="font-semibold text-foreground">{item.name || "—"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
          <span><strong>Case:</strong> <Link to={caseHref(item.case_id)} className="text-deep-ocean-500 hover:underline">{item.case_id}</Link></span>
          <span><strong>Age:</strong> {item.age ?? "—"} · <strong>Gender:</strong> {item.gender || "—"}</span>
          <span><strong>Contact:</strong> {item.contact || "—"}</span>
          <span><strong>Injury:</strong> {item.injury_type || "—"}</span>
        </div>
      </div>
      <div className="shrink-0">
        <Link to={caseHref(item.case_id)} className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-deep-ocean-500 hover:bg-deep-ocean-900 text-white transition-colors">
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
          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${item.credibility === "High" ? "text-green-700 bg-green-50 border-green-200" : "text-yellow-700 bg-yellow-50 border-yellow-200"}`}>
            {item.credibility} Credibility
          </span>
        </div>
        <h2 className="font-semibold text-foreground">{item.name || "Anonymous"}</h2>
        {item.statement && (
          <p className="text-sm text-muted-foreground italic">"{item.statement}"</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 text-sm text-muted-foreground">
          <span><strong>Case:</strong> <Link to={caseHref(item.case_id)} className="text-deep-ocean-500 hover:underline">{item.case_id}</Link></span>
          <span><strong>Contact:</strong> {item.contact || "—"}</span>
        </div>
      </div>
      <div className="shrink-0">
        <Link to={caseHref(item.case_id)} className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-deep-ocean-500 hover:bg-deep-ocean-900 text-white transition-colors">
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
          <span><strong>Case:</strong> <Link to={caseHref(item.case_id)} className="text-deep-ocean-500 hover:underline">{item.case_id}</Link></span>
          <span><strong>Type:</strong> {item.type}</span>
          <span><strong>Date:</strong> {item.date}</span>
        </div>
      </div>
      <div className="shrink-0">
        <Link to={caseHref(item.case_id)} className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-deep-ocean-500 hover:bg-deep-ocean-900 text-white transition-colors">
          View Case <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </div>
  </Card>
);

const LocationCard = ({ item }) => {
  const firstCase = item.case_ids?.[0];
  return (
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
            <span><strong>Crime Type:</strong> {item.crime_type}</span>
            <span><strong>Total Cases:</strong> {item.cases}</span>
            <span><strong>Last Incident:</strong> {item.last_incident || "—"}</span>
            <span><strong>Case IDs:</strong> {item.case_ids?.join(", ") || "—"}</span>
          </div>
        </div>
        <div className="shrink-0">
          <Link to={caseHref(firstCase)} className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-deep-ocean-500 hover:bg-deep-ocean-900 text-white transition-colors">
            View Case <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      </div>
    </Card>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const CaseSearch = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const navigate = useNavigate();

  const [appliedQuery, setAppliedQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [results, setResults] = useState({
    cases: [], suspects: [], victims: [], witnesses: [], leads: [], locations: [],
  });
  const [counts, setCounts] = useState({
    all: 0, cases: 0, suspects: 0, victims: 0, witnesses: 0, leads: 0, locations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestSeq = useRef(0);

  // Sync with URL changes (e.g. from header search)
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setAppliedQuery(q);
    setCurrentPage(1);
    setActiveCategory("all");
  }, [searchParams]);

  // Fetch from backend whenever appliedQuery changes
  const fetchSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const seq = ++requestSeq.current;

    try {
      const url = import.meta.env.VITE_API_URL;
      const res = await axios.get(`${url}/api/investigator/cases/search`, {
        headers: getAuthHeader(),
        params: { q: appliedQuery },
      });

      if (seq !== requestSeq.current) return;

      const d = res.data || {};
      setResults({
        cases: d.cases || [],
        suspects: d.suspects || [],
        victims: d.victims || [],
        witnesses: d.witnesses || [],
        leads: d.leads || [],
        locations: d.locations || [],
      });
      setCounts(d.counts || {
        all: 0, cases: 0, suspects: 0, victims: 0, witnesses: 0, leads: 0, locations: 0,
      });
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.error("Search failed:", err);
      setError(
        err?.response?.data?.detail ||
        "Could not load search results. Please retry."
      );
      setResults({ cases: [], suspects: [], victims: [], witnesses: [], leads: [], locations: [] });
      setCounts({ all: 0, cases: 0, suspects: 0, victims: 0, witnesses: 0, leads: 0, locations: 0 });
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [appliedQuery]);

  useEffect(() => { fetchSearch(); }, [fetchSearch]);

  // Build the unified list for the active category
  const buildFlatResults = () => {
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
    const type = TYPE_FOR_CATEGORY[activeCategory];
    return (results[activeCategory] || []).map(r => ({ ...r, _type: type }));
  };

  const flatResults = buildFlatResults();
  const totalResults = flatResults.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, totalResults);
  const pageResults = flatResults.slice(start, end);

  const renderCard = (item) => {
    // Cards must have unique keys across categories — combine type + id
    const key = `${item._type}-${item.id}`;
    switch (item._type) {
      case "case": return <CaseCard key={key} item={item} />;
      case "suspect": return <SuspectCard key={key} item={item} />;
      case "victim": return <VictimCard key={key} item={item} />;
      case "witness": return <WitnessCard key={key} item={item} />;
      case "lead": return <LeadCard key={key} item={item} />;
      case "location": return <LocationCard key={key} item={item} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-10">
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
          {appliedQuery && !loading && (
            <p className="text-sm text-muted-foreground mt-2">
              Showing results for{" "}
              <span className="font-semibold text-foreground">"{appliedQuery}"</span>
              {" — "}{counts.all} total matches
            </p>
          )}
        </section>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-5 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Category filter tabs */}
        <section className="mb-5 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => { setActiveCategory(cat.key); setCurrentPage(1); }}
              className={`flex items-center cursor-pointer gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all
                                ${activeCategory === cat.key
                  ? "bg-deep-ocean-500 text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-deep-ocean-500/10 hover:text-deep-ocean-500"
                }`}
            >
              {cat.label}
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold
                                    ${activeCategory === cat.key
                    ? "bg-white/20 text-white"
                    : "bg-background text-muted-foreground"
                  }`}
              >
                {counts[cat.key] ?? 0}
              </span>
            </button>
          ))}
        </section>

        {/* Results */}
        <section className="space-y-4">
          {loading ? (
            <Card className="p-10 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 mx-auto mb-3 animate-spin" />
              <p className="text-sm">Searching…</p>
            </Card>
          ) : pageResults.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">
                No results found{appliedQuery ? ` for "${appliedQuery}"` : ""}.
              </p>
              <p className="text-sm mt-1">
                Try different keywords or select a different category.
              </p>
            </Card>
          ) : (
            pageResults.map(renderCard)
          )}
        </section>

        {!loading && totalResults > 0 && (
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