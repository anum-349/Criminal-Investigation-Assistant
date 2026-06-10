import { apiGetWithParams, apiPost } from "./apiCommon";

export const generateReport = async (reportType, filters) => {
    const { data } = await apiPost("/api/reports/generate", {
        reportType,
        filters: {
            caseId: filters.caseId || null,
            dateFrom: filters.dateFrom || null,
            dateTo: filters.dateTo || null,
            province: filters.province !== "All Provinces" ? filters.province : null,
            crimeType: filters.crimeType !== "All Types" ? filters.crimeType : null,
            minConfidence: parseFloat(filters.minConfidence) || 60,
            format: filters.format || "PDF",
        },
    });
    return data;
};

export const fetchReportHistory = async (page = 1, pageSize = 10) => {
    const { data } = await apiGetWithParams("/api/reports/history", {
        page,
        page_size: pageSize,
    });
    return data;
};
