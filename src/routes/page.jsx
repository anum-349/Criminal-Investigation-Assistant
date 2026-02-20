import { Routes, Route } from "react-router-dom";
import LoginPage from "../pages/login/page";
import InvestigatorPage from "../pages/investigator/page";
import CasePage from "../pages/investigator/case/page";
import AddSuspectModal from "../pages/form/add-suspect/page";
import FIRUploadModal from "../pages/form/fir-upload/page";
import ProtectedRoute from "./protected-routes/page";
import CaseSearch from "../pages/investigator/search-result/page";
import AdminPage from "../pages/admin/page";
import ForbiddenPage from "../pages/forebidden/page";
import NotFoundPage from "../pages/404/page";


export default function AppRoutes() {
    const token = localStorage.getItem("token");
    let isAuth = false;
    let isAdmin = false;

    if (token) {
        try {
            const decoded = jwtDecode(token);
            isAuth = true;
            isAdmin = decoded.role === "admin";
        } catch (err) {
            console.error("Invalid token");
        }
    }

    return (
        <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/investigator" element={
                <ProtectedRoute isAuth={isAuth} fallback={<ForbiddenPage />}>
                    <InvestigatorPage />
                </ProtectedRoute>} />
            <Route path="/investigator/case" element={
                <ProtectedRoute isAuth={isAuth} fallback={<ForbiddenPage />}>
                    <CasePage />
                </ProtectedRoute>} />
            <Route path="/upload-fir" element={
                <ProtectedRoute isAuth={isAuth} fallback={<ForbiddenPage />}>
                    <FIRUploadModal />
                </ProtectedRoute>
            } />
            <Route path="/add-suspect" element={
                <ProtectedRoute isAuth={isAuth} fallback={<ForbiddenPage />}>
                    <AddSuspectModal />
                </ProtectedRoute>} />
            <Route path="/search-case" element={
                <ProtectedRoute isAuth={isAuth} fallback={<ForbiddenPage />}>
                    <CaseSearch />
                </ProtectedRoute>} />

            <Route path="/admin" element={
                <ProtectedRoute isAuth={isAuth} isAdmin={isAdmin} fallback={<ForbiddenPage />}>
                    <AdminPage />
                </ProtectedRoute>} />
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}