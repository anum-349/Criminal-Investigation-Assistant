import axios from "axios";

const apiBase = () => import.meta.env.VITE_API_URL;

const tokenKey = () => import.meta.env.VITE_TOKEN_KEY || "cia_token";

export const getStoredToken = () =>
    localStorage.getItem(tokenKey()) || sessionStorage.getItem(tokenKey());

export const getAuthHeader = () => {
    const token = getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const formatApiError = (err, fallback = "Request failed") => {
    if (!err) return fallback;
    const detail = err?.response?.data?.detail;
    if (Array.isArray(detail)) {
        return detail.map((d) => d?.msg || JSON.stringify(d)).join("; ");
    }
    if (typeof detail === "string") return detail;
    return err.message || fallback;
};

export const parseAge = (v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? undefined : n;
};

export const fileToDataUrl = (file) =>
    file
        ? new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onloadend = () => resolve(r.result);
            r.onerror = reject;
            r.readAsDataURL(file);
        })
        : Promise.resolve(null);

export const isNewPhoto = (p) =>
    !p?.existingPhotoId && typeof p?.dataUrl === "string" && p.dataUrl.startsWith("data:");

export const hasNewFile = (ev) =>
    (ev?.file instanceof File) ||
    (typeof ev?.fileDataUrl === "string" && ev.fileDataUrl.startsWith("data:"));

export const ensureFileDataUrl = async (ev) => {
    if (!ev) return ev;
    if (ev.fileDataUrl && ev.fileDataUrl.startsWith("data:")) return ev;
    if (ev.file instanceof File) {
        const dataUrl = await fileToDataUrl(ev.file);
        return {
            ...ev,
            fileDataUrl: dataUrl,
            fileName: ev.fileName || ev.file.name,
            fileMime: ev.fileMime || ev.file.type,
        };
    }
    return ev;
};

export const apiGet = (endpoint) =>
    axios.get(`${apiBase()}${endpoint}`, { headers: getAuthHeader() });

export const apiPost = (endpoint, data) =>
    axios.post(`${apiBase()}${endpoint}`, data, { headers: getAuthHeader() });

export const apiPatch = (endpoint, data) =>
    axios.patch(`${apiBase()}${endpoint}`, data, { headers: getAuthHeader() });

export const apiDelete = (endpoint) =>
    axios.delete(`${apiBase()}${endpoint}`, { headers: getAuthHeader() });

export const apiGetWithParams = (endpoint, params) =>
    axios.get(`${apiBase()}${endpoint}`, { headers: getAuthHeader(), params });

export const handlePhotoUpload = async (caseId, entityType, entityId, dataUrl, fileName) =>
    apiPost(
        `/api/investigator/cases/${caseId}/${entityType}/${entityId}/photos`,
        { dataUrl, fileName },
    );

export const handlePhotoDelete = async (caseId, entityType, entityId) =>
    apiDelete(`/api/investigator/cases/${caseId}/${entityType}/${entityId}/photo`);

export const uploadPhotos = async (caseId, entityType, createdIds, items) => {
    const photoFailures = [];

    for (let i = 0; i < items.length; i++) {
        const entityId = createdIds[i];
        const item = items[i];
        if (!entityId) continue;

        const photoArr = Array.isArray(item?.photoUrl) ? item.photoUrl : [];
        const newPhoto = photoArr.find(isNewPhoto);
        if (!newPhoto) continue;

        try {
            await handlePhotoUpload(caseId, entityType, entityId, newPhoto.dataUrl, newPhoto.name);
        } catch (err) {
            photoFailures.push({
                entityId,
                photoName: newPhoto.name || "(unnamed)",
                error: err?.response?.data?.detail || err.message || "Upload failed",
            });
        }
    }

    return photoFailures;
};

export const createStringNormalizer = (defaultValue = undefined) => (v) => {
    if (v === undefined || v === null) return defaultValue;
    if (typeof v !== "string") return v;
    const t = v.trim();
    return t === "" ? defaultValue : t;
};

export const createNumberNormalizer = () => (v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
};

export const createPayloadBuilder = (schema) => (data) => {
    const payload = {};

    Object.entries(schema).forEach(([key, processor]) => {
        const value = processor(data[key]);
        if (value !== undefined) {
            payload[key] = value;
        }
    });

    return payload;
};

export const createPatchPayloadBuilder = (schema) => (data) => {
    const payload = {};
    const fwd = (k, val) => { if (val !== undefined) payload[k] = val; };

    Object.entries(schema).forEach(([key, processor]) => {
        if (processor.type === "boolean") {
            if (data[key] !== undefined) payload[key] = !!data[key];
        } else if (processor.type === "array") {
            if (Array.isArray(data[key])) payload[key] = data[key];
        } else if (processor.type === "age") {
            if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
                payload[key] = parseAge(data[key]);
            }
        } else {
            fwd(key, processor(data[key]));
        }
    });

    return payload;
};

export const detailToFormShape = (detail, schema) => {
    if (!detail) return null;

    const form = {};
    Object.entries(schema).forEach(([key, config]) => {
        if (config.fromPath) {
            let value = detail;
            config.fromPath.split(".").forEach((segment) => {
                value = value?.[segment];
            });
            form[key] = value || config.default || "";
        } else {
            form[key] = detail[key] || config.default || "";
        }
    });

    return form;
};
