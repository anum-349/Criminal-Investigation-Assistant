import { Routes, Route } from "react-router-dom";
import LoginPage from "../pages/login/page";
import InvestigatorPage from "../pages/investigator/page";
import CasePage from "../pages/investigator/case/page";
import ProtectedRoute from "./protected-routes/page";
import CaseSearch from "../pages/investigator/search-result/page";
import AdminPage from "../pages/admin/page";
import NotFoundPage from "../pages/404/page";
import AllCasesPage from "../pages/investigator/all-cases/page";
import HelpPage from "../pages/investigator/help/page";
import ProfilePage from "../pages/investigator/profile/page";
import ReportPage from "../pages/investigator/report/page";
import AnalyticsPage from "../pages/investigator/analytics/page";
import RegisterCasePage from "../pages/form/case-forms/register-case/page";
// import UpdateCasePage from "../pages/form/case-forms/update-case/page";
import UserManagementPage from "../pages/form/user-management/page";
import SystemSettingsPage from "../pages/form/system-setting/page";
import ChangePasswordForm from "../pages/form/change-password/page";
import { InvestigationNotesPage } from "../pages/form/investigation/page";
import { AuditLogsPage } from "../pages/form/admin-audit/page";

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

            <Route path="/search-case" element={
                <ProtectedRoute allowedRoles={["investigator"]}>
                    <CaseSearch />
                </ProtectedRoute>} />

            <Route path="/investigator/cases" element={
                <ProtectedRoute allowedRoles={["investigator"]}>
                    <AllCasesPage />
                </ProtectedRoute>
            } />
            <Route path="/investigator/help" element={
                <ProtectedRoute allowedRoles={["investigator"]}>
                    <HelpPage />
                </ProtectedRoute>
            } />
            <Route path="/investigator/profile" element={
                <ProtectedRoute allowedRoles={["investigator"]}>
                    <ProfilePage />
                </ProtectedRoute>
            } />
            <Route path="/investigator/report" element={
                <ProtectedRoute allowedRoles={["investigator"]}>
                    <ReportPage />
                </ProtectedRoute>
            } />
            <Route path="/investigator/trends" element={
                <ProtectedRoute allowedRoles={["investigator"]}>
                    <AnalyticsPage />
                </ProtectedRoute>
            } />

            <Route path="/register-case" element={
                <RegisterCasePage />
            } />

            {/* <Route path="/update-case" element={
                <UpdateCasePage />
            } /> */}

            <Route path="user-management" element={
                <UserManagementPage />
            } />

            <Route path="system-settings" element={
                <SystemSettingsPage />
            } />
            <Route path="change-password" element={
                <ChangePasswordForm />
            } />
            <Route path="investigation-notes" element={
                <InvestigationNotesPage />
            } />
            <Route path="admin-audit" element={
                <AuditLogsPage />
            } />

            <Route path="/admin" element={
                <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminPage />
                </ProtectedRoute>} />
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}