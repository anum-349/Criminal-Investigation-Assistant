import {
    apiGet,
    apiPost,
    apiPatch,
    apiDelete,
    apiGetWithParams,
} from "./apiCommon";

export { formatApiError } from "./apiCommon";

const T = "/api/tickets";

export const listTickets = async ({
    page = 1,
    pageSize = 10,
    statusFilter = "all",
    search = "",
} = {}) => {
    const { data } = await apiGetWithParams(T, {
        page,
        page_size: pageSize,
        status_filter: statusFilter,
        search: search || undefined,
    });
    return data;
};

export const getTicket = async (ticketId) => {
    const { data } = await apiGet(`${T}/${encodeURIComponent(ticketId)}`);
    return data;
};

export const createTicket = async ({ priority = "normal", subject, message }) => {
    const { data } = await apiPost(T, {
        priority,
        subject: subject.trim(),
        message: message.trim(),
    });
    return data;
};

export const updateTicket = async (ticketId, { status, assignedTo, adminNotes } = {}) => {
    const body = {};
    if (status !== undefined) body.status = status;
    if (assignedTo !== undefined) body.assigned_to = assignedTo;
    if (adminNotes !== undefined) body.admin_notes = adminNotes;

    const { data } = await apiPatch(`${T}/${encodeURIComponent(ticketId)}`, body);
    return data;
};

export const replyToTicket = async (ticketId, body) => {
    const { data } = await apiPost(`${T}/${encodeURIComponent(ticketId)}/replies`, {
        body: body.trim(),
    });
    return data;
};

export const deleteTicket = async (ticketId) => {
    const { data } = await apiDelete(`${T}/${encodeURIComponent(ticketId)}`);
    return data;
};
