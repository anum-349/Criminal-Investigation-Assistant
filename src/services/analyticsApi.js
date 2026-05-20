// src/services/analyticsApi.js
import axios from "axios";

const getAuthHeader = () => {
    const token = localStorage.getItem("cia_token") || sessionStorage.getItem("cia_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const apiBase = () => import.meta.env.VITE_API_URL;

const get = (path, params) =>
    axios.get(`${apiBase()}/api/analytics/${path}`, {
        headers: getAuthHeader(),
        params,
    }).then(r => r.data);

export const fetchOverview    = (f) => get("overview",    _p(f));
export const fetchTrends      = (f) => get("trends",      _p(f));
export const fetchBreakdown   = (f) => get("breakdown",   _p(f));
export const fetchHeatmap     = (f) => get("heatmap",     { date_range: f.dateRange });
export const fetchPredictions = ()  => get("predictions", {});
 
const _p = (f) => ({
    date_range: f.dateRange,
    province:   f.province,
    crime_type: f.crimeType,
});