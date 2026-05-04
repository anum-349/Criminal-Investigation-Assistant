import { useEffect, useState } from "react";
import axios from "axios";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableWrapper,
} from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import Header from "../../components/Header";
import { useNavigate } from "react-router-dom";
import LeafletMap from "../../components/HotSpot/map";
import { ChevronRight, AlertTriangle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getAuthHeader = () => {
    const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// Pretty "X minutes ago" formatter for activity timestamps
const timeAgo = (iso) => {
    if (!iso) return "";
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
};

// ─── Stat card ────────────────────────────────────────────────────────────────

const StatCard = ({ value, label, loading }) => (
    <Card className="p-4 bg-card border border-border shadow-sm hover:shadow-md transition-shadow duration-200 animate-fade-in">
        <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground">
                {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                    value
                )}
            </p>
            <p className="text-sm text-muted-foreground">{label}</p>
        </div>
    </Card>
);

// ─── Active cases table ───────────────────────────────────────────────────────

const ActiveCasesTable = ({ cases, loading }) => {
    const navigate = useNavigate();

    return (
        <Card className="p-5 bg-card border border-border shadow-sm animate-slide-up">
            <div className="mb-4 text-left">
                <div className="flex justify-between">
                    <h2 className="text-lg font-semibold text-foreground text-left">
                        Active Cases
                    </h2>
                    <Link
                        to="/investigator/cases"
                        className="font-medium text-deep-ocean hover:underline flex items-center gap-1"
                    >
                        View All <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
                <p className="text-sm text-muted-foreground text-left">
                    Click view case to view case details and generate ai leads
                </p>
            </div>

            <div className="overflow-x-auto">
                <TableWrapper>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>CaseID</TableHead>
                                <TableHead>Crime Type</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last Update</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="text-center py-8 text-muted-foreground"
                                    >
                                        <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                                        Loading cases…
                                    </TableCell>
                                </TableRow>
                            ) : cases.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="text-center py-8 text-muted-foreground"
                                    >
                                        No active cases assigned.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                cases.map((c, idx) => (
                                    <TableRow
                                        key={`${c.id}-${idx}`}
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <TableCell className="font-medium">
                                            {c.id}
                                        </TableCell>
                                        <TableCell>{c.crime_type}</TableCell>
                                        <TableCell>{c.location}</TableCell>
                                        <TableCell>
                                            <Badge className="bg-green-100 text-green-700">
                                                {c.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{c.last_update}</TableCell>
                                        <TableCell>
                                            <Button
                                                className="h-7 px-6 cursor-pointer rounded-md w-full"
                                                onClick={() =>
                                                    navigate(
                                                        `/investigator/case?id=${c.id}`
                                                    )
                                                }
                                            >
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableWrapper>
            </div>
        </Card>
    );
};

// ─── Recent activities ────────────────────────────────────────────────────────

const getActivityStyles = (type) => {
    switch (type) {
        case "new":
            return "bg-accent border-l-4 border-l-status-info";
        case "update":
            return "bg-accent border-l-4 border-l-muted-foreground";
        case "investigation":
            return "bg-accent border-l-4 border-l-status-warning";
        case "lead":
            return "bg-primary/10 border-l-4 border-l-primary";
        default:
            return "bg-accent";
    }
};

const RecentActivities = ({ activities, loading }) => (
    <Card className="p-5 bg-card border border-border shadow-sm h-full animate-slide-up">
        <h2 className="text-lg font-semibold text-foreground mb-4 text-left">
            Recent Activities
        </h2>

        <div className="space-y-3">
            {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Loading…
                </p>
            ) : activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                    No recent activity.
                </p>
            ) : (
                activities.map((activity) => (
                    <div
                        key={activity.id}
                        className={`p-3 rounded-md ${getActivityStyles(
                            activity.type
                        )} transition-all hover:translate-x-1 cursor-pointer`}
                    >
                        <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0 text-left">
                                <p className="font-medium text-sm text-foreground truncate">
                                    {activity.title}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                    {activity.case_id
                                        ? `Case ID: ${activity.case_id}`
                                        : activity.description || ""}
                                </p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {timeAgo(activity.created_at)}
                            </span>
                        </div>
                    </div>
                ))
            )}
        </div>
    </Card>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const STAT_LABELS = [
    { key: "new_cases_this_month", label: "New cases this month" },
    { key: "total_active_cases", label: "Total active cases" },
    { key: "reports_with_missing_data", label: "Reports with missing data" },
    { key: "leads_found", label: "Leads found" },
    { key: "solved_cases", label: "Solved cases" },
];

const InvestigatorPage = () => {
    const [stats, setStats] = useState(null);
    const [cases, setCases] = useState([]);
    const [activities, setActivities] = useState([]);
    const [hotspots, setHotspots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboard = async () => {
            const url = import.meta.env.VITE_API_URL;
            try {
                const res = await axios.get(`${url}/api/investigator/dashboard`, {
                    headers: getAuthHeader(),
                });
                setStats(res.data.stats);
                setCases(res.data.active_cases || []);
                setActivities(res.data.activities || []);
                setHotspots(res.data.hotspots || []);
            } catch (err) {
                console.error("Failed to load dashboard:", err);
                setError(
                    err.response?.data?.detail ||
                        "Could not load dashboard. Please retry."
                );
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    return (
        <div className="min-h-screen bg-background">
            <Header />

            <main className="p-6 space-y-6 pt-20">
                {error && (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        {error}
                    </div>
                )}

                {/* Statistics Cards */}
                <section aria-label="Case Statistics">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {STAT_LABELS.map((s) => (
                            <StatCard
                                key={s.key}
                                value={stats ? stats[s.key] : 0}
                                label={s.label}
                                loading={loading}
                            />
                        ))}
                    </div>
                </section>

                {/* Cases and Activities */}
                <section
                    aria-label="Cases and Activities"
                    className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                >
                    <div className="lg:col-span-2">
                        <ActiveCasesTable cases={cases} loading={loading} />
                    </div>
                    <div className="lg:col-span-1">
                        <RecentActivities
                            activities={activities}
                            loading={loading}
                        />
                    </div>
                </section>

                {/* Crime Hotspot Map */}
                <section aria-label="Crime Hotspot Map">
                    <LeafletMap
                        mode="hotspots"
                        hotspots={hotspots}
                        height="h-80"
                        initialZoom={5}
                    />
                </section>
            </main>
        </div>
    );
};

export default InvestigatorPage;