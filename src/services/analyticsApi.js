import { apiGetWithParams } from "./apiCommon";

const get = (path, params) =>
    apiGetWithParams(`/api/analytics/${path}`, params).then((r) => r.data);

export const fetchOverview = (f) => get("overview", _p(f));
export const fetchTrends = (f) => get("trends", _p(f));
export const fetchBreakdown = (f) => get("breakdown", _p(f));
export const fetchHeatmap = (f) => get("heatmap", { date_range: f.dateRange });
export const fetchPredictions = () => get("predictions", {});

const _p = (f) => ({
    date_range: f.dateRange,
    province: f.province,
    crime_type: f.crimeType,
});
