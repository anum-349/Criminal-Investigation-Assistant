import { apiPost, apiGet, apiDelete } from "./apiCommon";

const _sanitizeForDraft = (formData) => {
    const clone = JSON.parse(JSON.stringify({
        ...formData,
        firFile: null,
    }));

    delete clone._addressTouched;
    delete clone._fromPicker;

    if (Array.isArray(clone.evidences)) {
        clone.evidences = clone.evidences.map(ev => {
            const { file, ...rest } = ev || {};
            return rest;
        });
    }

    const _stripPhotos = (arr) => {
        if (!Array.isArray(arr)) return arr;
        return arr.map(p => {
            if (Array.isArray(p?.photoUrl)) {
                p = {
                    ...p,
                    photoUrl: p.photoUrl.map(ph => {
                        const { file, ...rest } = ph || {};
                        return rest;
                    }),
                };
            }
            return p;
        });
    };
    clone.victims = _stripPhotos(clone.victims);
    clone.suspects = _stripPhotos(clone.suspects);
    clone.witnesses = _stripPhotos(clone.witnesses);

    return clone;
};

export const saveDraft = async (formData) => {
    const safe = _sanitizeForDraft(formData);

    const res = await apiPost(
        `/api/investigator/cases/case-drafts`,
        {
            draftId: formData.draftId || undefined,
            title: formData.caseTitle || formData.firNumber || undefined,
            formData: safe,
        }
    );

    return res.data;
};

export const listDrafts = async () => {
    const res = await apiGet(`/api/investigator/cases/case-drafts`);
    return res.data?.items || [];
};

export const getDraft = async (draftId) => {
    if (!draftId) throw new Error("draftId is required");
    const res = await apiGet(
        `/api/investigator/cases/case-drafts/${encodeURIComponent(draftId)}`
    );
    return res.data;
};

export const deleteDraft = async (draftId) => {
    if (!draftId) return { deleted: false };
    const res = await apiDelete(
        `/api/investigator/cases/case-drafts/${encodeURIComponent(draftId)}`
    );
    return res.data;
};
