/**
 * src/services/ticketApi.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Backend integration for the tickets module.
 *
 * Pairs with backend routes/ticket_routes.py + services/ticket_service.py.
 *
 *   GET    /api/tickets
 *   GET    /api/tickets/{ticketId}
 *   POST   /api/tickets
 *   PATCH  /api/tickets/{ticketId}                — admin only
 *   POST   /api/tickets/{ticketId}/replies        — admin or sender
 *   DELETE /api/tickets/{ticketId}                — admin or sender
 *
 * Backend response shape (TicketOut):
 *   {
 *     id, ticket_id, sender_id, sender_name,
 *     priority, subject, message,
 *     status, status_code,
 *     assigned_to_id, assigned_to_name,
 *     admin_notes, resolved_at, created_at, updated_at,
 *     replies: [{ id, author_id, author_name, body, is_admin, created_at }]
 *   }
 */

import axios from "axios";

// ── Auth ────────────────────────────────────────────────────────────────────
export const getAuthHeader = () => {
    const token =
        localStorage.getItem("cia_token") || sessionStorage.getItem("cia_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const apiBase = () => import.meta.env.VITE_API_URL;
const T = () => `${apiBase()}/api/tickets`;

export const formatApiError = (err, fallback = "Request failed") => {
    if (!err) return fallback;
    const detail = err?.response?.data?.detail;
    if (Array.isArray(detail)) return detail.map(d => d?.msg || JSON.stringify(d)).join("; ");
    if (typeof detail === "string") return detail;
    return err.message || fallback;
};

// ── List ────────────────────────────────────────────────────────────────────

/**
 * GET /api/tickets
 *
 * @param {object} params
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize=10]
 * @param {string} [params.statusFilter="all"] — "all" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
 * @param {string} [params.search=""]
 */
export const listTickets = async ({
    page = 1,
    pageSize = 10,
    statusFilter = "all",
    search = "",
} = {}) => {
    const res = await axios.get(T(), {
        headers: getAuthHeader(),
        params: {
            page,
            page_size:     pageSize,
            status_filter: statusFilter,
            search:        search || undefined,
        },
    });
    return res.data;   // { items, total, page, page_size }
};

// ── Get one ─────────────────────────────────────────────────────────────────

export const getTicket = async (ticketId) => {
    const res = await axios.get(
        `${T()}/${encodeURIComponent(ticketId)}`,
        { headers: getAuthHeader() },
    );
    return res.data;
};

// ── Create (used by investigator's Help → Contact Admin) ───────────────────

/** POST /api/tickets — CreateTicketRequest */
export const createTicket = async ({ priority = "normal", subject, message }) => {
    const res = await axios.post(
        T(),
        { priority, subject: subject.trim(), message: message.trim() },
        { headers: getAuthHeader() },
    );
    return res.data;   // TicketOut
};

// ── Update (admin-only) ─────────────────────────────────────────────────────

/**
 * PATCH /api/tickets/{ticketId}
 *
 * @param {string} ticketId
 * @param {object} body
 * @param {string} [body.status]      — "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
 * @param {number} [body.assignedTo]  — user_id of the admin taking ownership
 * @param {string} [body.adminNotes]
 */
export const updateTicket = async (ticketId, { status, assignedTo, adminNotes } = {}) => {
    const body = {};
    if (status !== undefined)      body.status      = status;
    if (assignedTo !== undefined)  body.assigned_to = assignedTo;
    if (adminNotes !== undefined)  body.admin_notes = adminNotes;

    const res = await axios.patch(
        `${T()}/${encodeURIComponent(ticketId)}`,
        body,
        { headers: getAuthHeader() },
    );
    return res.data;   // TicketOut
};

// ── Reply ───────────────────────────────────────────────────────────────────

/** POST /api/tickets/{ticketId}/replies */
export const replyToTicket = async (ticketId, body) => {
    const res = await axios.post(
        `${T()}/${encodeURIComponent(ticketId)}/replies`,
        { body: body.trim() },
        { headers: getAuthHeader() },
    );
    return res.data;   // TicketOut (full ticket with new reply included)
};

// ── Delete ──────────────────────────────────────────────────────────────────

export const deleteTicket = async (ticketId) => {
    const res = await axios.delete(
        `${T()}/${encodeURIComponent(ticketId)}`,
        { headers: getAuthHeader() },
    );
    return res.data;   // { deleted, ticket_id }
};
