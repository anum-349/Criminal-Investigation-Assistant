import { useState, useCallback, useEffect, useRef } from "react";

export const useDebounce = (value, ms = 350) => {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return debounced;
};

export const useAsync = (asyncFunction, immediate = true) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    const execute = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await asyncFunction();
            setData(response);
            return response;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [asyncFunction]);

    useEffect(() => {
        if (immediate) {
            execute();
        }
    }, [execute, immediate]);

    return { execute, loading, error, data };
};

export const useSortAndFilter = (initialField = "registered", initialDir = "desc") => {
    const [sortField, setSortField] = useState(initialField);
    const [sortDir, setSortDir] = useState(initialDir);
    const [currentPage, setCurrentPage] = useState(1);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDir("asc");
        }
        setCurrentPage(1);
    };

    return { sortField, sortDir, currentPage, setCurrentPage, handleSort };
};

export const useRequestSequence = () => {
    const requestSeq = useRef(0);

    const nextSeq = useCallback(() => {
        return ++requestSeq.current;
    }, []);

    const isStale = useCallback((seq) => {
        return seq !== requestSeq.current;
    }, []);

    return { nextSeq, isStale };
};

export const useFormState = (initialValues = {}) => {
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setValues((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    }, []);

    const handleBlur = useCallback((e) => {
        const { name } = e.target;
        setTouched((prev) => ({ ...prev, [name]: true }));
    }, []);

    const resetForm = useCallback(() => {
        setValues(initialValues);
        setErrors({});
        setTouched({});
    }, [initialValues]);

    return {
        values,
        setValues,
        errors,
        setErrors,
        touched,
        setTouched,
        handleChange,
        handleBlur,
        resetForm,
    };
};

export const usePagination = (total = 0, pageSize = 10) => {
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, total);

    return {
        currentPage,
        setCurrentPage,
        totalPages,
        start,
        end,
    };
};

export const useConfirmDialog = () => {
    const [confirmId, setConfirmId] = useState(null);
    const [busyId, setBusyId] = useState(null);

    const open = useCallback((id) => setConfirmId(id), []);
    const close = useCallback(() => setConfirmId(null), []);
    const setBusy = useCallback((id) => setBusyId(id), []);
    const clearBusy = useCallback(() => setBusyId(null), []);

    return { confirmId, busyId, open, close, setBusy, clearBusy };
};

export const useOutsideClick = (ref, callback) => {
    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                callback();
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [ref, callback]);
};

export const useLocalStorage = (key, initialValue) => {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch {
            return initialValue;
        }
    });

    const setValue = useCallback((value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(error);
        }
    }, [key, storedValue]);

    return [storedValue, setValue];
};
