import { useState, useCallback, useMemo, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search, ChevronDown, ChevronRight, Plus, ArrowUpDown, ArrowUp, ArrowDown, LayoutDashboard } from "lucide-react";
import Header from "../../../components/Header";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Pagination } from "../../../components/ui/Pagination";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow, TableWrapper
} from "../../../components/ui/Table";

const PAGE_SIZE = 10;

// ── Mock Data ─────────────────────────────────────────────────────────────────
const ALL_CASES = [
    { id: "C-2053", title: "Murder – Homicide Investigation", crimeType: "Murder", location: "Clifton, Karachi", investigator: "Insp. Rana Ali Khan", complainant: "N/A", firId: "FIR8765234QR", status: "Active", severity: "Critical", registered: "2026-11-23", lastUpdate: "2026-11-25" },
    { id: "C-2052", title: "Robbery near Green Park", crimeType: "Robbery", location: "Green Park, Lahore", investigator: "Insp. A. Khan", complainant: "Ahmed Raza", firId: "FIR8765235AB", status: "Active", severity: "High", registered: "2026-11-20", lastUpdate: "2026-11-24" },
    { id: "C-2051", title: "Theft at Central Market", crimeType: "Theft", location: "Central Market, Karachi", investigator: "Insp. B. Ali", complainant: "Sara Ahmed", firId: "FIR8765236CD", status: "Pending", severity: "Medium", registered: "2026-11-18", lastUpdate: "2026-11-22" },
    { id: "C-2050", title: "Assault near Railway Station", crimeType: "Assault", location: "Railway Station, RWP", investigator: "Insp. C. Raza", complainant: "Fatima Khan", firId: "FIR8765237EF", status: "Pending", severity: "High", registered: "2026-11-15", lastUpdate: "2026-11-20" },
    { id: "C-2049", title: "Fraud – Online Scam", crimeType: "Fraud", location: "Islamabad", investigator: "Insp. B. Ali", complainant: "Omar Sheikh", firId: "FIR8765238GH", status: "Active", severity: "Medium", registered: "2026-11-14", lastUpdate: "2026-11-19" },
    { id: "C-2048", title: "Burglary – Model Town Residential", crimeType: "Burglary", location: "Model Town, Lahore", investigator: "Insp. A. Khan", complainant: "Ali Hassan", firId: "FIR8765239IJ", status: "Closed", severity: "Medium", registered: "2026-11-10", lastUpdate: "2026-11-18" },
    { id: "C-2047", title: "Drug Trafficking – Port Area", crimeType: "Drug", location: "Port Qasim, Karachi", investigator: "Insp. N. Hashmi", complainant: "ANF Report", firId: "FIR8765240KL", status: "Active", severity: "Critical", registered: "2026-11-08", lastUpdate: "2026-11-17" },
    { id: "C-2046", title: "Kidnapping – F-8 Sector", crimeType: "Kidnap", location: "F-8, Islamabad", investigator: "Insp. S. Qureshi", complainant: "Nadia Arif", firId: "FIR8765241MN", status: "Active", severity: "Critical", registered: "2026-11-05", lastUpdate: "2026-11-16" },
    { id: "C-2045", title: "Vehicle Theft – Gulshan", crimeType: "Theft", location: "Gulshan-e-Iqbal, Karachi", investigator: "Insp. R. Malik", complainant: "Hamid Raza", firId: "FIR8765242OP", status: "Closed", severity: "Low", registered: "2026-11-03", lastUpdate: "2026-11-15" },
    { id: "C-2044", title: "Cybercrime – Data Breach", crimeType: "Cyber", location: "Lahore", investigator: "Insp. T. Hussain", complainant: "TechCorp Ltd", firId: "FIR8765243QR", status: "Pending", severity: "High", registered: "2026-11-01", lastUpdate: "2026-11-14" },
    { id: "C-2043", title: "Arson – Industrial Zone", crimeType: "Arson", location: "SITE Area, Karachi", investigator: "Insp. A. Khan", complainant: "Factory Owner", firId: "FIR8765244ST", status: "Closed", severity: "High", registered: "2026-10-28", lastUpdate: "2026-11-10" },
    { id: "C-2042", title: "Extortion – Business District", crimeType: "Extortion", location: "Blue Area, Islamabad", investigator: "Insp. C. Raza", complainant: "Shop Owner", firId: "FIR8765245UV", status: "Active", severity: "Medium", registered: "2026-10-25", lastUpdate: "2026-11-08" },
    { id: "C-2041", title: "Missing Person – Hayatabad", crimeType: "Missing", location: "Hayatabad, Peshawar", investigator: "Insp. B. Ali", complainant: "Family", firId: "FIR8765246WX", status: "Pending", severity: "High", registered: "2026-10-22", lastUpdate: "2026-11-05" },
    { id: "C-2040", title: "Armed Robbery – Bank Branch", crimeType: "Robbery", location: "Saddar, Rawalpindi", investigator: "Insp. N. Hashmi", complainant: "Bank Manager", firId: "FIR8765247YZ", status: "Active", severity: "Critical", registered: "2026-10-20", lastUpdate: "2026-11-03" },
    { id: "C-2039", title: "Domestic Violence – Gulberg", crimeType: "Violence", location: "Gulberg, Lahore", investigator: "Insp. S. Qureshi", complainant: "Anon Report", firId: "FIR8765248AA", status: "Closed", severity: "Medium", registered: "2026-10-18", lastUpdate: "2026-11-01" },
    { id: "C-2038", title: "Smuggling – Border Checkpoint", crimeType: "Smuggling", location: "Torkham Border", investigator: "Insp. R. Malik", complainant: "Customs Dept", firId: "FIR8765249BB", status: "Active", severity: "High", registered: "2026-10-15", lastUpdate: "2026-10-30" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_TABS = [
    { key: "all", label: "All Cases" },
    { key: "Active", label: "Active" },
    { key: "Pending", label: "Pending" },
    { key: "Closed", label: "Closed" },
];

const CRIME_TYPES = ["All Types", ...Array.from(new Set(ALL_CASES.map(c => c.crimeType))).sort()];
const SEVERITIES = ["All Severities", "Critical", "High", "Medium", "Low"];

const getStatusVariant = (status) => {
    if (status === "Active") return "success";
    if (status === "Pending") return "warning";
    if (status === "Closed") return "default";
    return "default";
};

const getSeverityStyle = (severity) => {
    if (severity === "Critical") return "text-red-700 bg-red-50 border border-red-200";
    if (severity === "High") return "text-orange-700 bg-orange-50 border border-orange-200";
    if (severity === "Medium") return "text-yellow-700 bg-yellow-50 border border-yellow-200";
    return "text-green-700 bg-green-50 border border-green-200";
};

const SortIcon = ({ field, sortField, sortDir }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
    return sortDir === "asc"
        ? <ArrowUp className="h-3.5 w-3.5 text-white" />
        : <ArrowDown className="h-3.5 w-3.5 text-white" />;
};

const AllCasesPage = () => {
    const [searchParams] = useSearchParams();
    const initialQuery = searchParams.get("tab") || "all";

    const navigate = useNavigate();

    // Filters
    const [searchInput, setSearchInput] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [statusTab, setStatusTab] = useState(initialQuery);
    const [crimeType, setCrimeType] = useState("All Types");
    const [severity, setSeverity] = useState("All Severities");

    // Sorting
    const [sortField, setSortField] = useState("registered");
    const [sortDir, setSortDir] = useState("desc");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const s = searchParams.get("tab") || "all";
        setStatusTab(s);
        setCurrentPage(1);
    }, [searchParams]);

    const handleSearch = () => {
        setAppliedSearch(searchInput.trim());
        setCurrentPage(1);
    };

    const handleClear = () => {
        setSearchInput("");
        setAppliedSearch("");
        setCrimeType("All Types");
        setSeverity("All Severities");
        setStatusTab("all");
        setCurrentPage(1);
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDir("asc");
        }
        setCurrentPage(1);
    };

    // Filter + sort
    const filteredCases = useMemo(() => {
        let result = ALL_CASES.filter(c => {
            const q = appliedSearch.toLowerCase();
            if (q && ![c.id, c.title, c.investigator, c.complainant, c.location, c.crimeType, c.firId]
                .some(f => f?.toLowerCase().includes(q))) return false;
            if (statusTab !== "all" && c.status !== statusTab) return false;
            if (crimeType !== "All Types" && c.crimeType !== crimeType) return false;
            if (severity !== "All Severities" && c.severity !== severity) return false;
            return true;
        });

        result = [...result].sort((a, b) => {
            let va = a[sortField] || "";
            let vb = b[sortField] || "";
            if (sortDir === "asc") return va < vb ? -1 : va > vb ? 1 : 0;
            return va > vb ? -1 : va < vb ? 1 : 0;
        });

        return result;
    }, [appliedSearch, statusTab, crimeType, severity, sortField, sortDir]);

    // Status tab counts
    const tabCounts = useMemo(() => ({
        all: ALL_CASES.length,
        Active: ALL_CASES.filter(c => c.status === "Active").length,
        Pending: ALL_CASES.filter(c => c.status === "Pending").length,
        Closed: ALL_CASES.filter(c => c.status === "Closed").length,
    }), []);

    const totalResults = filteredCases.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, totalResults);
    const pageResults = filteredCases.slice(start, end);

    return (
        <div className="min-h-screen bg-background text-foreground mt-14">
            <Header />

            <main className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">

                {/* Page header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <button
                                onClick={() => navigate("/investigator")}
                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <LayoutDashboard className="h-3.5 w-3.5" />
                                Dashboard
                            </button>
                            <span className="text-muted-foreground text-xs">/</span>
                            <span className="text-xs font-medium text-foreground">All Cases</span>
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">All Cases</h1>
                    </div>
                    <Button
                        onClick={() => navigate("/upload-fir")}
                        className="flex items-center gap-2 self-start sm:self-auto px-4 py-2"
                    >
                        <Plus className="h-4 w-4" />
                        Register New Case
                    </Button>
                </div>

                {/* Status tabs */}
                <div className="flex flex-wrap gap-2 border-b border-border pb-3">
                    {STATUS_TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => { setStatusTab(tab.key); setCurrentPage(1); }}
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all
                                ${statusTab === tab.key
                                    ? "bg-deep-ocean text-white shadow-sm"
                                    : "bg-muted text-muted-foreground hover:bg-deep-ocean/10 hover:text-deep-ocean"
                                }`}
                        >
                            {tab.label}
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold
                                ${statusTab === tab.key ? "bg-white/20 text-white" : "bg-background text-muted-foreground"}`}>
                                {tabCounts[tab.key]}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Search + Filters */}
                <Card className="p-4">
                    <div className="flex flex-wrap gap-3 items-end">
                        {/* Search */}
                        <div className="relative flex-1 min-w-52">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="search"
                                placeholder="Search by case ID, title, investigator, location..."
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleSearch()}
                                className="w-full pl-9 pr-4 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean"
                            />
                        </div>

                        {/* Crime Type filter */}
                        <div className="relative">
                            <select
                                value={crimeType}
                                onChange={e => { setCrimeType(e.target.value); setCurrentPage(1); }}
                                className="appearance-none pl-3 pr-8 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean"
                            >
                                {CRIME_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>

                        {/* Severity filter */}
                        <div className="relative">
                            <select
                                value={severity}
                                onChange={e => { setSeverity(e.target.value); setCurrentPage(1); }}
                                className="appearance-none pl-3 pr-8 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean"
                            >
                                {SEVERITIES.map(s => <option key={s}>{s}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>

                        <Button onClick={handleSearch} className="px-4 py-2">Search</Button>
                        {(appliedSearch || crimeType !== "All Types" || severity !== "All Severities") && (
                            <Button variant="outline" onClick={handleClear} className="px-5">Clear</Button>
                        )}
                    </div>
                </Card>

                {/* Table */}
                <Card className="p-0">
                    <TableWrapper>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {[
                                        { label: "Title", field: "title" },
                                        { label: "Crime Type", field: "crimeType" },
                                        { label: "Location", field: "location" },
                                        { label: "Investigator", field: "investigator" },
                                        { label: "Status", field: "status" },
                                        { label: "Registered", field: "registered" },
                                        { label: "Last Update", field: "lastUpdate" },
                                    ].map(col => (
                                        <TableHead key={col.field}>
                                            <button
                                                onClick={() => handleSort(col.field)}
                                                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity text-nowrap"
                                            >
                                                {col.label}
                                                <SortIcon field={col.field} sortField={sortField} sortDir={sortDir} />
                                            </button>
                                        </TableHead>
                                    ))}
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {pageResults.length === 0 ? (
                                    <TableRow>
                                        <TableCell className="py-12 text-center text-muted-foreground" style={{ gridColumn: "span 10" }}>
                                            <div className="flex flex-col items-center gap-2">
                                                <Search className="h-8 w-8 opacity-25" />
                                                <p>No cases match your filters.</p>
                                                <button onClick={handleClear} className="text-deep-ocean text-sm underline">Clear filters</button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    pageResults.map(c => (
                                        <TableRow key={c.id} className="hover:bg-muted/40 transition-colors">
                                            <TableCell>
                                                <Link
                                                    to="/investigator/case"
                                                    className="font-semibold text-blue-800 hover:underline"
                                                >
                                                    {c.id}
                                                </Link>
                                                <p className="font-medium text-foreground max-w-48 truncate" title={c.title}>
                                                    {c.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{c.firId}</p>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs font-medium px-2 py-1 bg-muted rounded-md">
                                                    {c.crimeType}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm max-w-36 truncate" title={c.location}>{c.location}</p>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm max-w-36 truncate" title={c.investigator}>{c.investigator}</p>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`text-xs font-semibold px-2 block mb-2 py-1 rounded-md ${getSeverityStyle(c.severity)}`}>
                                                    {c.severity}
                                                </span>
                                                <Badge variant={getStatusVariant(c.status)}>{c.status}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm text-muted-foreground">{c.registered}</p>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm text-muted-foreground">{c.lastUpdate}</p>
                                            </TableCell>
                                            <TableCell>
                                                <Link
                                                    to="/investigator/case"
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-deep-ocean hover:bg-deep-ocean-900 text-white transition-colors"
                                                >
                                                    View <ChevronRight className="h-3.5 w-3.5" />
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableWrapper>
                </Card>

                {/* Pagination */}
                {totalResults > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={totalResults}
                        start={start}
                        end={end}
                        itemLabel="cases"
                    />
                )}
            </main>
        </div>
    );
};

export default AllCasesPage;