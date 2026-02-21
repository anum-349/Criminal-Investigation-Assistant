import { Routes, Route } from "react-router-dom";
import LoginPage from "../pages/login/page";
import InvestigatorPage from "../pages/investigator/page";
import CasePage from "../pages/investigator/case/page";
import AddSuspectModal from "../pages/form/add-suspect/page";
import FIRUploadModal from "../pages/form/fir-upload/page";
import ProtectedRoute from "./protected-routes/page";
import CaseSearch from "../pages/investigator/search-result/page";
import AdminPage from "../pages/admin/page";
import NotFoundPage from "../pages/404/page";


export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/investigator" element={
                <ProtectedRoute
                    allowedRoles={["investigator"]}
                >
                    <InvestigatorPage />
                </ProtectedRoute>} />
            <Route path="/investigator/case" element={
                <ProtectedRoute allowedRoles={["investigator"]}>
                    <CasePage />
                </ProtectedRoute>} />
            <Route path="/upload-fir" element={
                <ProtectedRoute allowedRoles={["investigator"]}>
                    <FIRUploadModal />
                </ProtectedRoute>
            } />
            <Route path="/add-suspect" element={
                <ProtectedRoute allowedRoles={["investigator"]}>
                    <AddSuspectModal />
                </ProtectedRoute>} />
            <Route path="/search-case" element={
                <ProtectedRoute allowedRoles={["investigator"]}>
                    <CaseSearch />
                </ProtectedRoute>} />

            <Route path="/admin" element={
                <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminPage />
                </ProtectedRoute>} />
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}