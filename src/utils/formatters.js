export const timeAgo = (iso) => {
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

export const formatRelativeTime = (iso) => {
    if (!iso) return "—";
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return "—";
    const secs = Math.max(1, Math.round((Date.now() - t) / 1000));
    if (secs < 60) return `${secs}s ago`;
    if (secs < 3600) return `${Math.round(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.round(secs / 3600)}h ago`;
    return `${Math.round(secs / 86400)}d ago`;
};

export const formatDate = (iso, locale = "en-GB") => {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleString(locale, {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "—";
    }
};

export const formatFileName = (fullPath) => {
    if (!fullPath) return "";
    return fullPath.split("/").pop();
};

export const truncateText = (text, maxLength = 100) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

export const formatPhotoName = (photo) => {
    if (typeof photo === "string") return photo;
    return photo?.name || photo?.fileName || "(unnamed)";
};

export const formatErrorMessage = (error, fallback = "An error occurred") => {
    if (typeof error === "string") return error;
    if (error?.message) return error.message;
    return fallback;
};

export const formatCaseCount = (count = 0) => {
    return count > 99 ? "99+" : count.toString();
};

export const photoSrc = (rawUrl) => {
    if (!rawUrl) return "";
    if (rawUrl.startsWith("http")) return rawUrl;
    if (rawUrl.startsWith("/uploads")) return `${import.meta.env.VITE_API_URL}${rawUrl}`;
    return rawUrl;
};
