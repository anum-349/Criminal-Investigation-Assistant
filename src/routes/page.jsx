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
const RegisterCasePage = lazy(() => import('@/pages/form/register-case/page'));
const UserManagementPage = lazy(() => import('@/pages/admin/user-management/page'));
const SystemSettingsPage = lazy(() => import('@/pages/admin/system-setting/page'));

import AuditLogsPage from "@/pages/admin/admin-audit/page";
import LoginPage from "@/pages/login/page";
import ProtectedRoute from "./protected-routes/page";
import DraftsPage from "@/pages/investigator/drafts/page";
import AdminAnalyticsPage from "@/pages/admin/analytics/page";
import AdminAllCasesPage from "@/pages/admin/cases/page";
import AdminHelpPage from "@/pages/admin/help/page";
import AdminCaseDetailPage from "@/pages/admin/case/[id]/page";
import AdminProfilePage from "@/pages/admin/profile/page";
import AdminTicketsPage from "@/pages/admin/tickets/page";
import AdminReportsPage from "@/pages/admin/reports/page";
import ManageDatabasePage from "@/pages/admin/manage-database/page";

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

            <Route path="/investigator/drafts" element={
                <ProtectedRoute requiredRole="investigator">
                    <DraftsPage />
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

            <Route path="/admin/analytics" element={
                <ProtectedRoute requiredRole="admin">
                    <AdminAnalyticsPage />
                </ProtectedRoute>
            } />

            <Route path="/admin/audit-logs" element={
                <ProtectedRoute requiredRole="admin">
                    <AuditLogsPage />
                </ProtectedRoute>
            } />

            <Route path="/admin/cases" element={
                <ProtectedRoute requiredRole="admin">
                    <AdminAllCasesPage />
                </ProtectedRoute>
            } />

            <Route path="/admin/case/:id" element={
                <ProtectedRoute requiredRole="admin">
                    <AdminCaseDetailPage />
                </ProtectedRoute>
            } />

            <Route path="/admin/help" element={
                <ProtectedRoute requiredRole="admin">
                    <AdminHelpPage />
                </ProtectedRoute>} />

            <Route path="/admin/profile" element={
                <ProtectedRoute requiredRole="admin">
                    <AdminProfilePage />
                </ProtectedRoute>} />

            <Route path="/admin/system-settings" element={
                <ProtectedRoute requiredRole="admin">
                    <SystemSettingsPage />
                </ProtectedRoute>} />

            <Route path="/admin/tickets" element={
                <ProtectedRoute requiredRole="admin">
                    <AdminTicketsPage />
                </ProtectedRoute>} />

            <Route path="/admin/reports" element={
                <ProtectedRoute requiredRole="admin">
                    <AdminReportsPage />
                </ProtectedRoute>} />

            <Route path="/admin/users" element={
                <ProtectedRoute requiredRole="admin">
                    <UserManagementPage />
                </ProtectedRoute>} />

            <Route path="/admin/database" element={
                <ProtectedRoute requiredRole="admin">
                    <ManageDatabasePage />
                </ProtectedRoute>} />

            <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin">
                    <AdminPage />
                </ProtectedRoute>} />

            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}