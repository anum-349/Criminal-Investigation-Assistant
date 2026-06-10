export const getStatusVariant = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("active") || s.includes("open") || s.includes("under")) return "success";
    if (s.includes("pending")) return "warning";
    if (s.includes("closed") || s.includes("solved")) return "default";
    return "default";
};

export const getSeverityStyle = (severity) => {
    const s = (severity || "").toLowerCase();
    if (s === "critical") return "text-red-700 bg-red-50 border border-red-200";
    if (s === "high") return "text-orange-700 bg-orange-50 border border-orange-200";
    if (s === "medium") return "text-yellow-700 bg-yellow-50 border border-yellow-200";
    return "text-green-700 bg-green-50 border border-green-200";
};

export const getSeverityBadgeVariant = (label) => {
    const s = (label || "").toLowerCase();
    if (s === "critical") return "destructive";
    if (s === "high") return "warning";
    if (s === "medium") return "default";
    return "default";
};

export const getStatusPillClass = (label) => {
    const s = (label || "").toLowerCase();
    if (s.includes("closed") || s.includes("solved")) return "bg-slate-500";
    if (s.includes("pending")) return "bg-amber-500";
    return "bg-forest-teal";
};

export const getActivityStyles = (type) => {
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

export const getSeverityDotClass = (severity) => {
    if (!severity) return "bg-slate-300";
    const s = severity.toLowerCase();
    if (s === "critical") return "bg-red-500";
    if (s === "high") return "bg-orange-400";
    return "bg-blue-400";
};

export const getDotClass = (code) => {
    if (code === "CLOSED" || code === "ARCHIVED") return "bg-slate-400";
    if (code === "PENDING") return "bg-amber-400";
    return "bg-forest-teal";
};

export const getProgressIndicatorStyle = (percent) => {
    if (percent >= 80) return "bg-emerald-100 text-emerald-700";
    if (percent >= 40) return "bg-amber-100 text-amber-700";
    return "bg-slate-100 text-slate-600";
};

export const combineClasses = (...classes) => {
    return classes.filter(Boolean).join(" ");
};

export const getConditionalClass = (condition, trueClass, falseClass = "") => {
    return condition ? trueClass : falseClass;
};
