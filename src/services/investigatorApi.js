import { apiGetWithParams } from "./apiCommon";

export { getAuthHeader } from "./apiCommon";

export const listInvestigators = async ({ search, activeOnly = true } = {}) => {
    const { data } = await apiGetWithParams("/api/investigator/lookups/investigators", {
        search: search || undefined,
        active_only: activeOnly,
    });
    return data?.items || [];
};
