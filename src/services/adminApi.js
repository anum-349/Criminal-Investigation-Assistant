/**
 * src/services/adminApi.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Backend integration for every admin-only endpoint.
 *
 * Pairs with backend routes/admin_routes.py.
 *
 *   GET    /api/admin/dashboard
 *   GET    /api/admin/users
 *   POST   /api/admin/users
 *   PATCH  /api/admin/users/{userId}
 *   PATCH  /api/admin/users/{userId}/toggle-status
 *   DELETE /api/admin/users/{userId}
 *   DELETE /api/admin/cases/{caseId}
 *   PATCH  /api/admin/cases/{caseId}/assign
 *
 * Conventions match the rest of the frontend's service files (see
 * caseApi.js, ticketApi.js, etc.):
 *   - cia_token from localStorage/sessionStorage
 *   - VITE_API_URL for the base URL
 *   - formatApiError() to unwrap FastAPI's `detail` field
 */

import axios from "axios";

// ── Auth ────────────────────────────────────────────────────────────────────
export const getAuthHeader = () => {
    const token =
        localStorage.getItem("cia_token") || sessionStorage.getItem("cia_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const apiBase = () => import.meta.env.VITE_API_URL;
const A = () => `${apiBase()}/api/admin`;

// ── Error helper (same shape as caseApi.formatApiError) ────────────────────
export const formatApiError = (err, fallback = "Request failed") => {
    if (!err) return fallback;
    const detail = err?.response?.data?.detail;
    if (Array.isArray(detail)) return detail.map(d => d?.msg || JSON.stringify(d)).join("; ");
    if (typeof detail === "string") return detail;
    return err.message || fallback;
};

// ═══════════════════════════════════════════════════════════════════════════
// Dashboard
// ═══════════════════════════════════════════════════════════════════════════

/** GET /api/admin/dashboard → AdminDashboardResponse */
export const fetchAdminDashboard = async () => {
    const res = await axios.get(`${A()}/dashboard`, { headers: getAuthHeader() });
    return res.data;
};

// ═══════════════════════════════════════════════════════════════════════════
// User management
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/users
 * @param {object} params
 * @param {string} [params.search]
 * @param {string} [params.role]       — "All" | "Admin" | "Investigator"
 * @param {string} [params.status]     — "All" | "Active" | "Inactive"
 * @param {string} [params.department] — "All" or department name
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize=10]
 */
export const listUsers = async ({
    search = "",
    role = "All",
    status = "All",
    department = "All",
    page = 1,
    pageSize = 10,
} = {}) => {
    const res = await axios.get(`${A()}/users`, {
        headers: getAuthHeader(),
        params: {
            search:     search || undefined,
            role,
            status,
            department,
            page,
            page_size:  pageSize,
        },
    });
    return res.data;   // { items, total, page, page_size }
};

/**
 * POST /api/admin/users
 * Body matches AdminCreateUserRequest. The function accepts the same
 * camelCase shape the AddUser modal already produces:
 *
 *   { fullName, username, email, password, role, phone, department, status, rank }
 *
 * The backend's schema uses snake_case fields, so we translate here.
 */
export const createUser = async (form) => {
    const body = {
        full_name:  form.fullName,
        username:   form.username,
        email:      form.email,
        password:   form.password,
        role:       form.role,                 // "Admin" | "Investigator"
        phone:      form.phone || null,
        department: form.department || null,
        status:     form.status || "Active",
        rank:       form.rank || null,
    };
    const res = await axios.post(`${A()}/users`, body, { headers: getAuthHeader() });
    return res.data;   // AdminUserRow
};

/**
 * PATCH /api/admin/users/{userId}
 * Accepts the same form shape. Password is only sent if non-empty.
 */
export const updateUser = async (userId, form) => {
    const body = {};
    if (form.fullName  !== undefined) body.full_name  = form.fullName;
    if (form.email     !== undefined) body.email      = form.email;
    if (form.phone     !== undefined) body.phone      = form.phone;
    if (form.department!== undefined) body.department = form.department;
    if (form.rank      !== undefined) body.rank       = form.rank;
    if (form.status    !== undefined) body.status     = form.status;
    if (form.password)                body.password   = form.password;

    const res = await axios.patch(`${A()}/users/${encodeURIComponent(userId)}`, body, {
        headers: getAuthHeader(),
    });
    return res.data;   // AdminUserRow
};

/** PATCH /api/admin/users/{userId}/toggle-status → { id, status } */
export const toggleUserStatus = async (userId) => {
    const res = await axios.patch(
        `${A()}/users/${encodeURIComponent(userId)}/toggle-status`,
        {},
        { headers: getAuthHeader() },
    );
    return res.data;
};

/** DELETE /api/admin/users/{userId} → { deleted, id } */
export const deleteUser = async (userId) => {
    const res = await axios.delete(
        `${A()}/users/${encodeURIComponent(userId)}`,
        { headers: getAuthHeader() },
    );
    return res.data;
};

// ═══════════════════════════════════════════════════════════════════════════
// Case authority operations
// ═══════════════════════════════════════════════════════════════════════════

/** DELETE /api/admin/cases/{caseId} → { deleted, case_id } */
export const deleteCase = async (caseId) => {
    const res = await axios.delete(
        `${A()}/cases/${encodeURIComponent(caseId)}`,
        { headers: getAuthHeader() },
    );
    return res.data;
};

/**
 * PATCH /api/admin/cases/{caseId}/assign
 * @param {string} caseId
 * @param {string} investigatorUsername — from the investigator dropdown
 * @param {string} [reason]
 */
export const assignCase = async (caseId, investigatorUsername, reason) => {
    const res = await axios.patch(
        `${A()}/cases/${encodeURIComponent(caseId)}/assign`,
        { investigator_username: investigatorUsername, reason: reason || null },
        { headers: getAuthHeader() },
    );
    return res.data;   // { case_id, investigator, assigned_at }
};

/**
 * GET /api/admin/audit-logs
 * @param {object} params
 * @param {string}  [params.search]
 * @param {string}  [params.module]      — "All" | module name
 * @param {string}  [params.action]      — "All" | action name
 * @param {string}  [params.dateFrom]    — "YYYY-MM-DD"
 * @param {string}  [params.dateTo]      — "YYYY-MM-DD"
 * @param {number}  [params.page=1]
 * @param {number}  [params.pageSize=10]
 */ 
 export const fetchAuditLogs = async ({
    search = "",
    module = "All",
    action = "All",
    dateFrom = "",
    dateTo = "",
    page = 1,
    pageSize = 10,
} = {}) => {
    const res = await axios.get(`${A()}/audit-logs`, {
        headers: getAuthHeader(),
        params: {
            search:      search    || undefined,
            module:      module    !== "All" ? module    : undefined,
            action:      action    !== "All" ? action    : undefined,
            date_from:   dateFrom  || undefined,
            date_to:     dateTo    || undefined,
            page,
            page_size:   pageSize,
        },
    });
    return res.data; // { items, total, page, page_size, stats }
};

export const getDatabaseStats = async () => {
    const res = await axios.get(`${A()}/database/stats`, { headers: getAuthHeader() });
    return res.data;
};

export const triggerBackup = async () => {
    const res = await axios.post(`${A()}/database/backup`, {}, { headers: getAuthHeader() });
    return res.data;
};

export const restoreDatabase = async (file) => {
    const form = new FormData();
    form.append("file", file);
    const res = await axios.post(`${A()}/database/restore`, form, {
        headers: {
            ...getAuthHeader(),
            "Content-Type": "multipart/form-data",
        },
    });
    return res.data;
};

export const optimizeDatabase = async () => {
    const res = await axios.post(`${A()}/database/optimize`, {}, { headers: getAuthHeader() });
    return res.data;
};

export const listBackups = async () => {
    const res = await axios.get(`${A()}/database/backups`, { headers: getAuthHeader() });
    return res.data;
};

export const downloadBackup = async (backupId) => {
    const res = await axios.get(
        `${A()}/database/backups/${encodeURIComponent(backupId)}/download`,
        {
            headers: getAuthHeader(),
            responseType: "blob",
        },
    );
    return res.data; // Blob
};