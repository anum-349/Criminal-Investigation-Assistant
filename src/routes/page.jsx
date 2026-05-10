import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
const InvestigatorPage = lazy(() => import('@/pages/investigator/page'));
const CasePage = lazy(() => import('@/pages/investigator/case/[id]/page'));
const CaseSearch = lazy(() => import('@/pages/investigator/search-result/page'));
const AdminPage = lazy(() => import('@/pages/admin/page'));
const NotFoundPage = lazy(() => import('@/pages/404/page'));
const AllCasesPage = lazy(() => import('@/pages/investigator/all-cases/page'));
const HelpPage = lazy(() => import('@/pages/investigator/help/page'));
const ProfilePage = lazy(() => import('@/pages/investigator/profile/page'));
const ReportPage = lazy(() => import('@/pages/investigator/report/page'));
const AnalyticsPage = lazy(() => import('@/pages/investigator/analytics/page'));
const RegisterCasePage = lazy(() => import('@/pages/form/case-forms/register-case/page'));
// const UpdateCasePage = lazy(() => import('@/pages/form/case-forms/update-case/page'));
const UserManagementPage = lazy(() => import('@/pages/admin/user-management/page'));
const SystemSettingsPage = lazy(() => import('@/pages/admin/system-setting/page'));
const ChangePasswordForm = lazy(() => import('@/pages/admin/change-password/page'));
// const InvestigationNotesPage = lazy(() => import('@/pages/form/investigation-notes/page'));
const AuditLogsPage = lazy(() => import('@/pages/admin/admin-audit/page'));

import LoginPage from "@/pages/login/page";
import ProtectedRoute from "./protected-routes/page";

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/investigator" element={
                <ProtectedRoute requiredRole="investigator">
                    <InvestigatorPage />
                </ProtectedRoute>
            } />

            <Route path="/investigator/case/:id" element={
                <ProtectedRoute requiredRole="investigator">
                    <CasePage />
                </ProtectedRoute>} />

            <Route path="/search-case" element={
                <ProtectedRoute requiredRole="investigator">
                    <CaseSearch />
                </ProtectedRoute>} />

            <Route path="/investigator/cases" element={
                <ProtectedRoute requiredRole="investigator">
                    <AllCasesPage />
                </ProtectedRoute>
            } />
            <Route path="/investigator/help" element={
                <ProtectedRoute requiredRole="investigator">
                    <HelpPage />
                </ProtectedRoute>
            } />
            <Route path="/investigator/profile" element={
                <ProtectedRoute requiredRole="investigator">
                    <ProfilePage />
                </ProtectedRoute>
            } />
            <Route path="/investigator/report" element={
                <ProtectedRoute requiredRole="investigator">
                    <ReportPage />
                </ProtectedRoute>
            } />
            <Route path="/investigator/trends" element={
                <ProtectedRoute requiredRole="investigator">
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
            {/* <Route path="investigation-notes" element={
                <InvestigationNotesPage />
            } /> */}
            <Route path="admin-audit" element={
                <AuditLogsPage />
            } />

            <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin">
                    <AdminPage />
                </ProtectedRoute>} />
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}