import { Card } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableWrapper
} from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import Header from "../../components/Header";
import { useNavigate } from "react-router-dom";
import LeafletMap from "../../components/HotSpot/map";
import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom";

const HOTSPOTS = [
    { id: 1, city: 'Karachi', lat: 24.8607, lng: 67.0011, severity: 'high', cases: 14, province: 'Sindh' },
    { id: 2, city: 'Lahore', lat: 31.5204, lng: 74.3587, severity: 'high', cases: 11, province: 'Punjab' },
    { id: 3, city: 'Rawalpindi', lat: 33.5651, lng: 73.0169, severity: 'medium', cases: 7, province: 'Punjab' },
    { id: 4, city: 'Peshawar', lat: 34.0151, lng: 71.5249, severity: 'medium', cases: 6, province: 'KPK' },
    { id: 5, city: 'Quetta', lat: 30.1798, lng: 66.9750, severity: 'high', cases: 9, province: 'Balochistan' },
    { id: 6, city: 'Multan', lat: 30.1575, lng: 71.5249, severity: 'medium', cases: 5, province: 'Punjab' },
    { id: 7, city: 'Hyderabad', lat: 25.3960, lng: 68.3578, severity: 'low', cases: 3, province: 'Sindh' },
    { id: 8, city: 'Faisalabad', lat: 31.4504, lng: 73.1350, severity: 'low', cases: 4, province: 'Punjab' },
    { id: 9, city: 'Gujranwala', lat: 32.1877, lng: 74.1945, severity: 'medium', cases: 5, province: 'Punjab' },
    { id: 10, city: 'Islamabad', lat: 33.6844, lng: 73.0479, severity: 'low', cases: 2, province: 'ICT' },
];

const StatCard = ({ value, label }) => {
    return (
        <Card className="p-4 bg-card border border-border shadow-sm hover:shadow-md transition-shadow duration-200 animate-fade-in">
            <div className="space-y-1">
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
            </div>
        </Card>
    );
};

const cases = [
    { id: "CASE-102", crimeType: "Murder", location: "Rawalpindi", status: "Active", lastUpdate: "12-Jan" },
    { id: "CASE-103", crimeType: "Murder", location: "Rawalpindi", status: "Active", lastUpdate: "12-Jan" },
    { id: "CASE-104", crimeType: "Murder", location: "Rawalpindi", status: "Active", lastUpdate: "12-Jan" },
    { id: "CASE-105", crimeType: "Murder", location: "Rawalpindi", status: "Active", lastUpdate: "12-Jan" },
    { id: "CASE-106", crimeType: "Murder", location: "Rawalpindi", status: "Active", lastUpdate: "12-Jan" },
    { id: "CASE-107", crimeType: "Murder", location: "Rawalpindi", status: "Active", lastUpdate: "12-Jan" },
    { id: "CASE-108", crimeType: "Murder", location: "Rawalpindi", status: "Active", lastUpdate: "12-Jan" },
];

const ActiveCasesTable = () => {
    const navigate = useNavigate()
    return (
        <Card className="p-5 bg-card border border-border shadow-sm animate-slide-up">
            <div className="mb-4 text-left">
                <div className="flex justify-between">
                    <h2 className="text-lg font-semibold text-foreground text-left">Active Cases</h2>
                    <Link to="/investigator/cases"
                        className="font-medium text-deep-ocean hover:underline flex items-center gap-1">
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
                            {cases.map((caseItem, index) => (
                                <TableRow
                                    key={`${caseItem.id}-${index}`}
                                    className="hover:bg-gray-50 transition-colors"
                                >
                                    <TableCell className="font-medium">{caseItem.id}</TableCell>
                                    <TableCell>{caseItem.crimeType}</TableCell>
                                    <TableCell>{caseItem.location}</TableCell>
                                    <TableCell>
                                        <Badge className="bg-green-100 text-green-700">
                                            {caseItem.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{caseItem.lastUpdate}</TableCell>
                                    <TableCell>
                                        <Button className="h-7 px-6 cursor-pointer rounded-md w-full" onClick={() => navigate(`/investigator/case`)}>
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableWrapper>
            </div>

        </Card>
    );
};

const activities = [
    {
        id: "1",
        title: "New case registered (CASE-102 – Murder)",
        caseId: "Case ID: C-2041",
        time: "5 minutes ago",
        type: "new",
    },
    {
        id: "2",
        title: "Case status updated",
        caseId: "Case ID: C-2041",
        time: "5 minutes ago",
        type: "update",
    },
    {
        id: "3",
        title: "Case C-2013 marked as Under Investigation",
        caseId: "Case C-2013 marked as Under Investigation",
        time: "5 minutes ago",
        type: "investigation",
    },
    {
        id: "4",
        title: "Lead generated",
        caseId: "Weapon match analysis linked evidence to Case C-203",
        time: "15 minutes ago",
        type: "lead",
    },
];

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

const RecentActivities = () => {
    return (
        <Card className="p-5 bg-card border border-border shadow-sm h-full animate-slide-up">
            <h2 className="text-lg font-semibold text-foreground mb-4 text-left">
                Recent Activities
            </h2>

            <div className="space-y-3">
                {activities.map((activity) => (
                    <div
                        key={activity.id}
                        className={`p-3 rounded-md ${getActivityStyles(activity.type)} transition-all hover:translate-x-1 cursor-pointer`}
                    >
                        <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0 text-left">
                                <p className="font-medium text-sm text-foreground truncate">
                                    {activity.title}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                    {activity.caseId}
                                </p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {activity.time}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

const stats = [
    { value: 67, label: "New cases this month" },
    { value: 42, label: "Total active cases" },
    { value: 23, label: "Reports with missing data" },
    { value: 67, label: "Leads found" },
    { value: 80, label: "Solved cases" },
];

const InvestigatorPage = () => {
    return (
        <div className="min-h-screen bg-background">

            {/* Header */}
            <Header />

            {/* Main Content */}
            <main className="p-6 space-y-6 pt-20">
                {/* Statistics Cards - HCI: Visibility of system status */}
                <section aria-label="Case Statistics">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {stats.map((stat, index) => (
                            <StatCard
                                key={index}
                                value={stat.value}
                                label={stat.label}
                            />
                        ))}
                    </div>
                </section>

                {/* Cases and Activities - HCI: Match between system and real world */}
                <section aria-label="Cases and Activities" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <ActiveCasesTable />
                    </div>
                    <div className="lg:col-span-1">
                        <RecentActivities />
                    </div>
                </section>

                {/* Crime Hotspot Map - HCI: Recognition rather than recall */}
                <section aria-label="Crime Hotspot Map">
                    <LeafletMap
                        mode="hotspots"
                        hotspots={HOTSPOTS}
                        height="h-80"
                        initialZoom={5}
                    />
                </section>
            </main>
        </div>
    );
};

export default InvestigatorPage;
