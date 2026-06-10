import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
    Search, ChevronDown, ChevronRight, Plus,
    ArrowUpDown, ArrowUp, ArrowDown, LayoutDashboard,
    Loader2, AlertTriangle,
} from "lucide-react";
import Header from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow, TableWrapper,
} from "@/components/ui/Table";
import { useDebounce, useSortAndFilter, useRequestSequence } from "@/utils/hooks";
import { getStatusVariant, getSeverityStyle } from "@/utils/styling";
import { PAGE_SIZES, STATUS_TABS } from "@/utils/constants";
import { getAuthHeader } from "@/services/apiCommon";

const SortIcon = ({ field, sortField, sortDir }) => {
    if (sortField !== field)
        return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
    return sortDir === "asc" ? (
        <ArrowUp className="h-3.5 w-3.5 text-white" />
    ) : (
        <ArrowDown className="h-3.5 w-3.5 text-white" />
    );
};

const AllCasesPage = () => {
    const [searchParams] = useSearchParams();
    const initialTab = searchParams.get("tab") || "all";
    const navigate = useNavigate();

    const [searchInput, setSearchInput] = useState("");
    const debouncedSearch = useDebounce(searchInput, 400);
    const [statusTab, setStatusTab] = useState(initialTab);
    const [crimeType, setCrimeType] = useState("All Types");
    const [severity, setSeverity] = useState("All Severities");

    const { sortField, sortDir, currentPage, setCurrentPage, handleSort } = 
        useSortAndFilter("registered", "desc");

    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [tabCounts, setTabCounts] = useState({
        all: 0, Active: 0, Pending: 0, Closed: 0,
    });
    const [crimeTypes, setCrimeTypes] = useState(["All Types"]);
    const [severities, setSeverities] = useState(["All Severities"]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { nextSeq, isStale } = useRequestSequence();

    useEffect(() => {
        const t = searchParams.get("tab") || "all";
        setStatusTab(t);
        setCurrentPage(1);
    }, [searchParams]);

    const fetchCases = useCallback(async () => {
        setLoading(true);
        setError(null);
        const seq = nextSeq();

        try {
            const url = import.meta.env.VITE_API_URL;
            const res = await axios.get(`${url}/api/investigator/cases`, {
                headers: getAuthHeader(),
                params: {
                    search: debouncedSearch,
                    status: statusTab,
                    crime_type: crimeType,
                    severity,
                    sort_field: sortField,
                    sort_dir: sortDir,
                    page: currentPage,
                    page_size: PAGE_SIZES.CASES,
                },
            });

            if (isStale(seq)) return;

            const d = res.data || {};
            setItems(d.items || []);
            setTotal(d.total || 0);
            setTabCounts(d.tab_counts || { all: 0, Active: 0, Pending: 0, Closed: 0 });

            const opts = d.filter_options || {};
            setCrimeTypes(["All Types", ...(opts.crime_types || [])]);
            setSeverities(["All Severities", ...(opts.severities || [])]);
        } catch (err) {
            if (isStale(seq)) return;
            setError(
                err?.response?.data?.detail ||
                "Could not load cases. Please retry."
            );
            setItems([]);
            setTotal(0);
        } finally {
            if (!isStale(seq)) setLoading(false);
        }
    }, [
        debouncedSearch, statusTab, crimeType, severity,
        sortField, sortDir, currentPage, nextSeq, isStale,
    ]);

    useEffect(() => {
        fetchCases();
    }, [fetchCases]);

    const handleClear = () => {
        setSearchInput("");
        setCrimeType("All Types");
        setSeverity("All Severities");
        setStatusTab("all");
        setCurrentPage(1);
    };

    const handleViewCase = async (caseId) => {
        try {
            const url = import.meta.env.VITE_API_URL;
            await axios.get(
                `${url}/api/investigator/cases/${caseId}/summary`,
                { headers: getAuthHeader() }
            );
        } catch (err) {
            // Non-fatal
        }
        navigate(`/investigator/case/${caseId}`);
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZES.CASES));
    const start = (currentPage - 1) * PAGE_SIZES.CASES;
    const end = Math.min(start + PAGE_SIZES.CASES, total);

    const isFiltered =
        debouncedSearch ||
        crimeType !== "All Types" ||
        severity !== "All Severities" ||
        statusTab !== "all";

    return (
        <div className="min-h-screen bg-background text-foreground mt-10">
            <Header />

            <main className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <button
                                onClick={() => navigate("/investigator")}
                                className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
                        onClick={() => navigate("/register-case")}
                        className="flex items-center gap-2 self-start sm:self-auto px-4 py-2"
                    >
                        <Plus className="h-4 w-4" />
                        Register New Case
                    </Button>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        {error}
                    </div>
                )}

                <div className="flex flex-wrap gap-2 border-b border-border pb-3">
                    {STATUS_TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => {
                                setStatusTab(tab.key);
                                setCurrentPage(1);
                            }}
                            className={`cursor-pointer flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all
                                ${statusTab === tab.key
                                    ? "bg-deep-ocean text-white shadow-sm"
                                    : "bg-muted text-muted-foreground hover:bg-deep-ocean/10 hover:text-deep-ocean"
                                }`}
                        >
                            {tab.label}
                            <span
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold
                                    ${statusTab === tab.key
                                        ? "bg-white/20 text-white"
                                        : "bg-background text-muted-foreground"
                                    }`}
                            >
                                {tabCounts[tab.key] ?? 0}
                            </span>
                        </button>
                    ))}
                </div>

                <Card className="p-4">
                    <div className="flex flex-wrap gap-3 items-end">
                        <div className="relative flex-1 min-w-52">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="search"
                                placeholder="Search by case ID, title, investigator, location..."
                                value={searchInput}
                                onChange={(e) => {
                                    setSearchInput(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-9 pr-4 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean"
                            />
                        </div>

                        <div className="relative">
                            <select
                                value={crimeType}
                                onChange={(e) => {
                                    setCrimeType(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="appearance-none pl-3 pr-8 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean"
                            >
                                {crimeTypes.map((t) => (
                                    <option key={t}>{t}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>

                        <div className="relative">
                            <select
                                value={severity}
                                onChange={(e) => {
                                    setSeverity(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="appearance-none pl-3 pr-8 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean"
                            >
                                {severities.map((s) => (
                                    <option key={s}>{s}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>

                        {isFiltered && (
                            <Button variant="outline" onClick={handleClear} className="px-5">
                                Clear
                            </Button>
                        )}
                    </div>
                </Card>

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
                                    ].map((col) => (
                                        <TableHead key={col.field}>
                                            <button
                                                onClick={() => handleSort(col.field)}
                                                className="flex cursor-pointer items-center gap-1.5 hover:opacity-80 transition-opacity text-nowrap"
                                            >
                                                {col.label}
                                                <SortIcon
                                                    field={col.field}
                                                    sortField={sortField}
                                                    sortDir={sortDir}
                                                />
                                            </button>
                                        </TableHead>
                                    ))}
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell className="py-12 text-center text-muted-foreground col-span-10">
                                            <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                                            Loading cases…
                                        </TableCell>
                                    </TableRow>
                                ) : items.length === 0 ? (
                                    <TableRow>
                                        <TableCell className="py-12 text-center text-muted-foreground col-span-10">
                                            <div className="flex flex-col items-center gap-2">
                                                <Search className="h-8 w-8 opacity-25" />
                                                <p>No cases match your filters.</p>
                                                {isFiltered && (
                                                    <button
                                                        onClick={handleClear}
                                                        className="text-deep-ocean text-sm underline cursor-pointer"
                                                    >
                                                        Clear filters
                                                    </button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((c) => (
                                        <TableRow
                                            key={c.id}
                                            className="hover:bg-muted/40 transition-colors"
                                        >
                                            <TableCell>
                                                <button
                                                    onClick={() => handleViewCase(c.id)}
                                                    className="font-semibold text-blue-800 hover:underline cursor-pointer"
                                                >
                                                    {c.id}
                                                </button>
                                                <p
                                                    className="font-medium text-foreground max-w-48 truncate"
                                                    title={c.title}
                                                >
                                                    {c.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {c.fir_id}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs font-medium px-2 py-1 bg-muted rounded-md">
                                                    {c.crime_type}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <p
                                                    className="text-sm max-w-36 truncate"
                                                    title={c.location}
                                                >
                                                    {c.location}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <p
                                                    className="text-sm max-w-36 truncate"
                                                    title={c.investigator}
                                                >
                                                    {c.investigator}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className={`text-xs font-semibold px-2 block mb-2 py-1 rounded-md ${getSeverityStyle(c.severity)}`}
                                                >
                                                    {c.severity}
                                                </span>
                                                <Badge variant={getStatusVariant(c.status)}>
                                                    {c.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm text-muted-foreground">
                                                    {c.registered}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm text-muted-foreground">
                                                    {c.last_update}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <button
                                                    onClick={() => handleViewCase(c.id)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-deep-ocean hover:bg-deep-ocean-900 text-white transition-colors cursor-pointer"
                                                >
                                                    View <ChevronRight className="h-3.5 w-3.5" />
                                                </button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableWrapper>
                </Card>

                {!loading && total > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={total}
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
