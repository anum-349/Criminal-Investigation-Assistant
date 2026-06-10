export const PAGE_SIZES = {
    CASES: 10,
    EVIDENCES: 5,
    VICTIMS: 5,
    SUSPECTS: 5,
    WITNESSES: 5,
    NOTIFICATIONS: 30,
};

export const STATUS_TABS = [
    { key: "all", label: "All Cases" },
    { key: "Active", label: "Active" },
    { key: "Pending", label: "Pending" },
    { key: "Closed", label: "Closed" },
];

export const CASE_STATUSES = [
    { code: "OPEN", label: "Open", is_terminal: false },
    { code: "UNDER_INVESTIGATION", label: "Under Investigation", is_terminal: false },
    { code: "ACTIVE", label: "Active", is_terminal: false },
    { code: "PENDING", label: "Pending", is_terminal: false },
    { code: "COLD_CASE", label: "Cold Case", is_terminal: false },
    { code: "CLOSED", label: "Closed", is_terminal: true },
    { code: "ARCHIVED", label: "Archived", is_terminal: true },
];

export const SEVERITY_LEVELS = {
    CRITICAL: "critical",
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low",
};

export const NOTIFICATION_TYPES = {
    SUSPECT_DETECTED: "suspect_detected",
    CRIME_HOTSPOT: "crime_hotspot",
    CASE_UPDATE: "case_update",
    SYSTEM: "system",
};

export const API_ENDPOINTS = {
    CASES: "/api/investigator/cases",
    VICTIMS: "/api/investigator/cases",
    SUSPECTS: "/api/investigator/cases",
    WITNESSES: "/api/investigator/cases",
    EVIDENCES: "/api/investigator/cases",
    NOTIFICATIONS: "/api/notifications",
    AUTH: "/api/auth",
    DASHBOARD: "/api/investigator/dashboard",
};

export const ERROR_MESSAGES = {
    GENERIC: "An error occurred. Please try again.",
    NETWORK: "Network error. Please check your connection.",
    AUTH: "Authentication failed. Please login again.",
    VALIDATION: "Please check your input and try again.",
    REQUIRED_FIELDS: "Please fill in all required fields.",
};

export const SUCCESS_MESSAGES = {
    SAVED: "Saved successfully!",
    DELETED: "Deleted successfully!",
    UPDATED: "Updated successfully!",
    CREATED: "Created successfully!",
};

export const DEBOUNCE_DELAYS = {
    SEARCH: 400,
    FILTER: 350,
    TYPING: 500,
};

export const ANIMATION_DURATIONS = {
    FAST: 150,
    NORMAL: 300,
    SLOW: 600,
};

export const MODAL_SIZES = {
    SMALL: "max-w-sm",
    MEDIUM: "max-w-md",
    LARGE: "max-w-lg",
    XLARGE: "max-w-2xl",
};
