import { createContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

    const [isAuth, setIsAuth] = useState(false);
    const [userRole, setUserRole] = useState(null);

    // Run once when app loads (for refresh support)
    useEffect(() => {
        const token = localStorage.getItem("token") ||
            sessionStorage.getItem("token");
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setIsAuth(true);
                setUserRole(decoded.role);
                if (decoded.exp * 1000 > Date.now()) {
                    setIsAuth(true);
                    setUserRole(decoded.role);
                } else {
                    localStorage.removeItem("token");
                    sessionStorage.removeItem("token");
                }
            } catch (err) {
                localStorage.removeItem("token");
                sessionStorage.removeItem("token");
            }
        }
    }, []);

    // 🔥 Login function
    const login = (token, rememberMe = false) => {
        if (rememberMe) {
            localStorage.setItem("token", token);
        } else {
            sessionStorage.setItem("token", token);
        }
        const decoded = jwtDecode(token);
        setIsAuth(true);
        setUserRole(decoded.role);
    };

    // 🔥 Logout function
    const logout = () => {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        setIsAuth(false);
        setUserRole(null);
    };

    return (
        <AuthContext.Provider value={{ isAuth, userRole, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};