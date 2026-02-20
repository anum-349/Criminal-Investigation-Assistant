import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronDown, Calendar, ChevronRight } from "lucide-react";
import Header from "../../../components/Header";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Badge } from "../../../components/ui/Badge";
import { Pagination } from "../../../components/ui/Pagination";

const PAGE_SIZE = 5;
const AREAS = ["All Areas", "Central", "North", "South", "East", "West", "Green Park"];
const STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "ongoing", label: "Ongoing" },
  { value: "closed", label: "Closed" },
  { value: "pending", label: "Pending" },
];

// Mock search results matching the UI design
const MOCK_RESULTS = [
  {
    id: "CA001243",
    title: "Robbery near Green Park",
    status: "Ongoing",
    created: "12 Dec, 2023 at 05:47 PM",
    investigator: "Inspector A. Khan",
    complainant: "Ahmed Raza",
    firUpload: "12 Dec, 2023",
    firId: "FIR8765234QR",
    offenseType: "Robbery",
  },
  {
    id: "CA001244",
    title: "Theft at Central Market",
    status: "Ongoing",
    created: "11 Dec, 2023 at 02:30 PM",
    investigator: "Inspector B. Ali",
    complainant: "Sara Ahmed",
    firUpload: "11 Dec, 2023",
    firId: "FIR8765235AB",
    offenseType: "Theft",
  },
  {
    id: "CA001245",
    title: "Burglary – Residential",
    status: "Closed",
    created: "10 Dec, 2023 at 09:15 AM",
    investigator: "Inspector A. Khan",
    complainant: "Ali Hassan",
    firUpload: "10 Dec, 2023",
    firId: "FIR8765236CD",
    offenseType: "Burglary",
  },
  {
    id: "CA001246",
    title: "Assault near Railway Station",
    status: "Pending",
    created: "09 Dec, 2023 at 04:20 PM",
    investigator: "Inspector C. Raza",
    complainant: "Fatima Khan",
    firUpload: "09 Dec, 2023",
    firId: "FIR8765237EF",
    offenseType: "Assault",
  },
  {
    id: "CA001247",
    title: "Fraud – Online Scam",
    status: "Ongoing",
    created: "08 Dec, 2023 at 11:00 AM",
    investigator: "Inspector B. Ali",
    complainant: "Omar Sheikh",
    firUpload: "08 Dec, 2023",
    firId: "FIR8765238GH",
    offenseType: "Fraud",
  },
  // Additional entries to reach 16 for pagination demo
  ...Array.from({ length: 11 }, (_, i) => ({
    id: `CA00124${8 + i}`,
    title: `Case ${8 + i} – Incident`,
    status: i % 3 === 0 ? "Closed" : i % 3 === 1 ? "Pending" : "Ongoing",
    created: `${7 - (i % 7)} Dec, 2023 at 10:00 AM`,
    investigator: "Inspector A. Khan",
    complainant: "Complainant Name",
    firUpload: `${7 - (i % 7)} Dec, 2023`,
    firId: `FIR876523${9 + i}XX`,
    offenseType: "Other",
  })),
];

const getStatusVariant = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "ongoing") return "success";
  if (s === "closed") return "default";
  if (s === "pending") return "warning";
  return "default";
};

const CaseSearch = () => {
  const [keywords, setKeywords] = useState("");
  const [area, setArea] = useState("All Areas");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [appliedFilters, setAppliedFilters] = useState({ keywords: "", area: "All Areas", date: "", status: "all" });
  const [currentPage, setCurrentPage] = useState(1);

  // Filter results based on applied filters (HCI: user control – Apply confirms intent)
  const filteredResults = MOCK_RESULTS.filter((c) => {
    const kw = (appliedFilters.keywords || "").toLowerCase();
    if (kw && !c.title.toLowerCase().includes(kw) && !c.id.toLowerCase().includes(kw) && !c.firId.toLowerCase().includes(kw)) return false;
    if (appliedFilters.area && appliedFilters.area !== "All Areas" && !c.title.toLowerCase().includes(appliedFilters.area.toLowerCase())) return false;
    if (appliedFilters.status && appliedFilters.status !== "all" && c.status.toLowerCase() !== appliedFilters.status) return false;
    return true;
  });

  const totalResults = filteredResults.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, totalResults);
  const pageResults = filteredResults.slice(start, end);

  const handleApply = useCallback(() => {
    setAppliedFilters({
      keywords: keywords.trim(),
      area,
      date: dateFilter,
      status: statusFilter,
    });
    setCurrentPage(1);
  }, [keywords, area, dateFilter, statusFilter]);

  const handleClear = useCallback(() => {
    setKeywords("");
    setArea("All Areas");
    setDateFilter("");
    setStatusFilter("all");
    setAppliedFilters({ keywords: "", area: "All Areas", date: "", status: "all" });
    setCurrentPage(1);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <title>Criminal Investigation Assistant - Case Search Results</title>
      <meta name="description" content="Search and filter criminal investigation cases." />

      <Header />

      <main className="p-4 lg:p-6 max-w-6xl mx-auto">
        {/* Page title – HCI: Clear hierarchy and context */}
        <section aria-label="Page title" className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Case Search Results</h1>
          <p className="text-muted-foreground text-sm mt-1">View all search results</p>
        </section>

        {/* Search and filters – HCI: Flexibility, visibility of options, explicit Apply */}
        <section aria-label="Search and filter cases" className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-50">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                placeholder="Enter keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApply()}
                className="pl-9 w-full"
                aria-label="Search by keywords"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="filter-area">Filter by area</label>
              <div className="relative">
                <select
                  id="filter-area"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="appearance-none pl-4 pr-8 py-2 border border-gray-300 rounded-md bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#14374E] focus:border-transparent"
                  aria-label="Filter by area"
                >
                  {AREAS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden />
              </div>
              <label className="sr-only" htmlFor="filter-date">Filter by date</label>
              <div className="relative flex items-center">
                <Calendar className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden />
                <Input
                  id="filter-date"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="pl-9"
                  aria-label="Select date"
                />
              </div>
              <label className="sr-only" htmlFor="filter-status">Filter by status</label>
              <div className="relative">
                <select
                  id="filter-status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none pl-4 pr-8 py-2 border border-gray-300 rounded-md bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#14374E] focus:border-transparent"
                  aria-label="Filter by status"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden />
              </div>
              <Button onClick={handleApply} className="px-4 py-2" aria-label="Apply filters">
                Apply
              </Button>
              <Button variant="outline" onClick={handleClear} className="px-4 py-2" aria-label="Clear filters">
                Clear
              </Button>
            </div>
          </div>
        </section>

        {/* Result cards – HCI: Consistency, recognition over recall, clear actions */}
        <section aria-label="Case results" className="space-y-4">
          {pageResults.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <p>No cases match your search. Try different keywords or filters.</p>
            </Card>
          ) : (
            pageResults.map((caseItem) => (
              <Card
                key={caseItem.id}
                className="p-4 border border-border bg-card hover:shadow-md transition-shadow duration-200"
                role="article"
                aria-labelledby={`case-title-${caseItem.id}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/investigator/case"
                        className="font-semibold text-[#14374E] hover:underline focus:outline-none focus:ring-2 focus:ring-[#14374E] focus:ring-offset-1 rounded"
                        id={`case-id-${caseItem.id}`}
                      >
                        {caseItem.id}
                      </Link>
                      <Badge variant={getStatusVariant(caseItem.status)} className="shrink-0">
                        {caseItem.status}
                      </Badge>
                    </div>
                    <h2 id={`case-title-${caseItem.id}`} className="font-semibold text-foreground">
                      {caseItem.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">Created: {caseItem.created}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                      <span>Investigator: {caseItem.investigator}</span>
                      <span>Complainant: {caseItem.complainant}</span>
                      <span>FIR Upload: {caseItem.firUpload}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
                    <Link
                      to="/investigator/case"
                      className="font-semibold text-[#14374E] hover:underline focus:outline-none focus:ring-2 focus:ring-[#14374E] focus:ring-offset-1 rounded text-sm"
                    >
                      FIR ID: {caseItem.firId}
                    </Link>
                    <p className="text-sm text-muted-foreground">Type of Offense: {caseItem.offenseType}</p>
                    <Link
                      to="/investigator/case"
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-[#14374E] hover:bg-[#021624] text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 mt-1"
                    >
                      View Details <ChevronRight className="ml-1 h-4 w-4 inline" aria-hidden />
                    </Link>
                  </div>
                </div>
              </Card>
            ))
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
