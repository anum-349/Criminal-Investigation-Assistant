import axios from "axios";
import {
    apiGet,
    apiPost,
    apiPatch,
    apiDelete,
    apiGetWithParams,
    getAuthHeader,
} from "./apiCommon";

export { formatApiError } from "./apiCommon";

const A = "/api/admin";

export const fetchAdminDashboard = async () => {
    const { data } = await apiGet(`${A}/dashboard`);
    return data;
};

export const listUsers = async ({
    search = "",
    role = "All",
    status = "All",
    department = "All",
    page = 1,
    pageSize = 10,
} = {}) => {
    const { data } = await apiGetWithParams(`${A}/users`, {
        search: search || undefined,
        role,
        status,
        department,
        page,
        page_size: pageSize,
    });
    return data;
};

export const createUser = async (form) => {
    const body = {
        full_name: form.fullName,
        username: form.username,
        email: form.email,
        password: form.password,
        role: form.role,
        phone: form.phone || null,
        department: form.department || null,
        status: form.status || "Active",
        rank: form.rank || null,
    };
    const { data } = await apiPost(`${A}/users`, body);
    return data;
};

export const updateUser = async (userId, form) => {
    const body = {};
    if (form.fullName !== undefined) body.full_name = form.fullName;
    if (form.email !== undefined) body.email = form.email;
    if (form.phone !== undefined) body.phone = form.phone;
    if (form.department !== undefined) body.department = form.department;
    if (form.rank !== undefined) body.rank = form.rank;
    if (form.status !== undefined) body.status = form.status;
    if (form.password) body.password = form.password;

    const { data } = await apiPatch(`${A}/users/${encodeURIComponent(userId)}`, body);
    return data;
};

export const toggleUserStatus = async (userId) => {
    const { data } = await apiPatch(`${A}/users/${encodeURIComponent(userId)}/toggle-status`, {});
    return data;
};

export const deleteUser = async (userId) => {
    const { data } = await apiDelete(`${A}/users/${encodeURIComponent(userId)}`);
    return data;
};

export const deleteCase = async (caseId) => {
    const { data } = await apiDelete(`${A}/cases/${encodeURIComponent(caseId)}`);
    return data;
};

export const assignCase = async (caseId, investigatorUsername, reason) => {
    const { data } = await apiPatch(`${A}/cases/${encodeURIComponent(caseId)}/assign`, {
        investigator_username: investigatorUsername,
        reason: reason || null,
    });
    return data;
};

export const fetchAuditLogs = async ({
    search = "",
    module = "All",
    action = "All",
    dateFrom = "",
    dateTo = "",
    page = 1,
    pageSize = 10,
} = {}) => {
    const { data } = await apiGetWithParams(`${A}/audit-logs`, {
        search: search || undefined,
        module: module !== "All" ? module : undefined,
        action: action !== "All" ? action : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page,
        page_size: pageSize,
    });
    return data;
};

export const getDatabaseStats = async () => {
    const { data } = await apiGet(`${A}/database/stats`);
    return data;
};

export const triggerBackup = async () => {
    const { data } = await apiPost(`${A}/database/backup`, {});
    return data;
};

export const restoreDatabase = async (file) => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}${A}/database/restore`,
        form,
        {
            headers: {
                ...getAuthHeader(),
                "Content-Type": "multipart/form-data",
            },
        },
    );
    return data;
};

export const optimizeDatabase = async () => {
    const { data } = await apiPost(`${A}/database/optimize`, {});
    return data;
};

export const listBackups = async () => {
    const { data } = await apiGet(`${A}/database/backups`);
    return data;
};

export const downloadBackup = async (backupId) => {
    const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}${A}/database/backups/${encodeURIComponent(backupId)}/download`,
        {
            headers: getAuthHeader(),
            responseType: "blob",
        },
    );
    return data;
};
