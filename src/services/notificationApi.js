import { apiGet, apiPatch, apiDelete, apiPost } from "./apiCommon";

export const fetchNotifications = (params = {}) =>
    apiGet(`/api/notifications`).then(r => r.data);

export const markRead = (id) =>
    apiPatch(`/api/notifications/${id}/read`, {}).then(r => r.data);

export const markAllRead = () =>
    apiPatch(`/api/notifications/read-all`, {}).then(r => r.data);

export const deleteNotification = (id) =>
    apiDelete(`/api/notifications/${id}`).then(r => r.data);

export const fetchPreferences = () =>
    apiGet(`/api/auth/preferences`).then(r => r.data);

export const createNotification = (notification) =>
    apiPost(`/api/notifications`, notification).then(r => r.data);
