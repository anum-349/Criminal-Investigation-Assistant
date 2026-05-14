// src/services/notificationApi.js
import axios from "axios";

const getAuthHeader = () => {
    const token = localStorage.getItem("cia_token") || sessionStorage.getItem("cia_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};
const apiBase = () => import.meta.env.VITE_API_URL;

export const fetchNotifications = (params = {}) =>
    axios.get(`${apiBase()}/api/notifications`, {
        headers: getAuthHeader(), params,
    }).then(r => r.data);

export const markRead = (id) =>
    axios.patch(`${apiBase()}/api/notifications/${id}/read`, {}, {
        headers: getAuthHeader(),
    }).then(r => r.data);

export const markAllRead = () =>
    axios.patch(`${apiBase()}/api/notifications/read-all`, {}, {
        headers: getAuthHeader(),
    }).then(r => r.data);

export const deleteNotification = (id) =>
    axios.delete(`${apiBase()}/api/notifications/${id}`, {
        headers: getAuthHeader(),
    }).then(r => r.data);

export const fetchPreferences = () =>
    axios.get(`${apiBase()}/api/notifications/preferences`, {
        headers: getAuthHeader(),
    }).then(r => r.data);

export const updatePreferences = (prefs) =>
    axios.patch(`${apiBase()}/api/notifications/preferences`, prefs, {
        headers: getAuthHeader(),
    }).then(r => r.data);