import { Routes, Route } from "react-router-dom";
import LoginPage from "../pages/login/page";
import InvestigatorPage from "../pages/investigator/page";
import CasePage from "../pages/investigator/case/page";
import AddSuspectModal from "../pages/form/add-suspect/page";
import FIRUploadModal from "../pages/form/fir-upload/page";
import ProtectedRoute from "./protected-routes/page";
import CaseSearch from "../pages/investigator/search-result/page";


export default function AppRoutes() {
    const isAuth = !!localStorage.getItem("token");

    return (
        <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/investigator" element={
                <ProtectedRoute isAuth={isAuth}>
                    <InvestigatorPage />
                </ProtectedRoute>} />
            <Route path="/investigator/case" element={
                <ProtectedRoute isAuth={isAuth}>
                    <CasePage />
                </ProtectedRoute>} />
            <Route path="/upload-fir" element={
                <ProtectedRoute isAuth={isAuth}>
                    <FIRUploadModal />
                </ProtectedRoute>
            } />
            <Route path="/add-suspect" element={
                <ProtectedRoute isAuth={isAuth}>
                    <AddSuspectModal />
                </ProtectedRoute>} />
            <Route path="/search-case" element={
                <ProtectedRoute isAuth={isAuth}>
                    <CaseSearch />
                </ProtectedRoute>} />

        </Routes>
    );
}