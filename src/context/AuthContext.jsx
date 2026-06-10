import { createContext, useState, useEffect, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

export const AuthContext = createContext();

const TOKEN_KEY    = import.meta.env.VITE_TOKEN_KEY;
const REMEMBER_KEY = import.meta.env.VITE_REMEMBER_KEY;
const API_URL      = import.meta.env.VITE_API_URL;

export const AuthProvider = ({ children }) => {
    const [user, setUser]       = useState(null);
    const [loading, setLoading] = useState(true);

    const getStoredToken = () => {
        const remember = localStorage.getItem(REMEMBER_KEY) === "true";
        return remember
            ? localStorage.getItem(TOKEN_KEY)
            : sessionStorage.getItem(TOKEN_KEY);
    };

    const clearStoredToken = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REMEMBER_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
        delete axios.defaults.headers.common["Authorization"];
    };

    const setAxiosAuth = (token) => {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    };

    useEffect(() => {
        const token = getStoredToken();
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const decoded = jwtDecode(token);
            if (decoded.exp * 1000 <= Date.now()) {
                clearStoredToken();
                setLoading(false);
                return;
            }
        } catch {
            clearStoredToken();
            setLoading(false);
            return;
        }

        setAxiosAuth(token);
        axios.get(`${API_URL}/api/auth/me`)
            .then((res) => setUser(res.data))
            .catch(() => clearStoredToken())
            .finally(() => setLoading(false));
    }, []);

    const login = useCallback(async ({ identifier, password, secret_code, rememberMe = true }) => {
        const res = await axios.post(`${API_URL}/api/auth/login`, {
            identifier,
            password,
            secret_code: secret_code || undefined,
        });

        const { access_token } = res.data;

        if (rememberMe) {
            localStorage.setItem(TOKEN_KEY, access_token);
            localStorage.setItem(REMEMBER_KEY, "true");
            sessionStorage.removeItem(TOKEN_KEY);
        } else {
            sessionStorage.setItem(TOKEN_KEY, access_token);
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REMEMBER_KEY);
        }

        setAxiosAuth(access_token);

        const me = await axios.get(`${API_URL}/api/auth/me`);
        setUser(me.data);
        return me.data;
    }, []);

    const logout = useCallback(async () => {
        try {
            await axios.post(`${API_URL}/api/auth/logout`);
        } catch (err) {
            console.warn("Logout audit call failed:", err.message);
        } finally {
            clearStoredToken();
            setUser(null);
        }
    }, []);

    const isAuth   = !!user;
    const userRole = user?.role || null;

    return (
        <AuthContext.Provider value={{ user, isAuth, userRole, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
