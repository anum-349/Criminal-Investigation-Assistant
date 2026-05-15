/**
 * src/services/investigatorApi.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches the list of investigators for the "Assigned To" dropdown across
 * all case forms (Register Case → Case Details, AddLead, AddTimeline, etc.).
 *
 * Backend endpoint:
 *   GET /api/investigator/lookups/investigators
 *
 * Returns a list of:
 *   { id, username, fullName, rank, department, displayLabel }
 *
 * The frontend dropdown stores the `username` (a stable, human-readable
 * identifier that the backend already accepts in CaseRegisterRequest.
 * assignedInvestigator). The label shown to the user is `displayLabel`,
 * which already includes rank + name + department.
 */

import axios from "axios";

export const getAuthHeader = () => {
    const token = localStorage.getItem("cia_token") || sessionStorage.getItem("cia_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const apiBase = () => import.meta.env.VITE_API_URL;

/** GET the list. Cached on the call site if needed — this endpoint is cheap
 *  and rarely changes, so most consumers just fetch once on mount.
 *
 *  @param {object} params
 *  @param {string} [params.search]  — free-text filter (matches name / username / department)
 *  @param {boolean} [params.activeOnly=true] — exclude deactivated accounts
 *  @returns Promise<Array<InvestigatorOption>>
 */
export const listInvestigators = async ({ search, activeOnly = true } = {}) => {
    const res = await axios.get(
        `${apiBase()}/api/investigator/lookups/investigators`,
        {
            headers: getAuthHeader(),
            params: {
                search:      search || undefined,
                active_only: activeOnly,
            },
        },
    );
    // Server returns { items: [...] }
    return res.data?.items || [];
};