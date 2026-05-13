// src/services/reportApi.js
import axios from "axios";

const getAuthHeader = () => {
    const token = localStorage.getItem("cia_token") || sessionStorage.getItem("cia_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const apiBase = () => import.meta.env.VITE_API_URL;

export const generateReport = async (reportType, filters) => {
    const res = await axios.post(
        `${apiBase()}/api/reports/generate`,
        {
            reportType,
            filters: {
                caseId:        filters.caseId        || null,
                dateFrom:      filters.dateFrom       || null,
                dateTo:        filters.dateTo         || null,
                province:      filters.province !== "All Provinces" ? filters.province : null,
                crimeType:     filters.crimeType !== "All Types"    ? filters.crimeType : null,
                minConfidence: parseFloat(filters.minConfidence) || 60,
                format:        filters.format || "PDF",
            },
        },
        { headers: getAuthHeader() },
    );
    return res.data;   // ReportData { title, sections }
};

export const fetchReportHistory = async (page = 1, pageSize = 10) => {
    const res = await axios.get(`${apiBase()}/api/reports/history`, {
        headers: getAuthHeader(),
        params:  { page, page_size: pageSize },
    });
    return res.data;   // { items, total }
};