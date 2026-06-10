/**
 * src/pages/admin/user-management/page.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin — User Management.
 * Route: /admin/user-management
 *
 * Backend integration:
 *   - GET    /api/admin/users
 *   - POST   /api/admin/users
 *   - PATCH  /api/admin/users/{userId}
 *   - PATCH  /api/admin/users/{userId}/toggle-status
 *   - DELETE /api/admin/users/{userId}
 *
 * All wrapped in src/services/adminApi.js → listUsers, createUser,
 * updateUser, toggleUserStatus, deleteUser.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Search, Pencil, Trash2, LayoutDashboard, Eye, EyeOff,
  UserPlus, Users, CheckCircle2, X, AlertCircle, AlertTriangle,
  ChevronRight, ChevronLeft, Shield, RefreshCw, ToggleLeft, ToggleRight,
  Loader2,
} from "lucide-react";

import Header from "@/components/Header";
import { Card } from "@/components/ui/Card";
import {
  listUsers, createUser, updateUser,
  toggleUserStatus, deleteUser, formatApiError,
} from "@/services/adminApi";

// ── Constants ────────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  "Homicide", "Cybercrime", "Narcotics", "Organised Crime",
  "Counter Terrorism", "Fraud", "Traffic", "General Investigation", "Administration",
];
const ROLES = ["Admin", "Investigator"];
const PAGE_SIZE = 10;

// Debounced input hook
function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// ═════════════════════════════════════════════════════════════════════════════
// Add/Edit User Modal
// ═════════════════════════════════════════════════════════════════════════════
function UserFormModal({ mode, initial, onClose, onSaved }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState(() => ({
    fullName:   initial?.full_name || "",
    username:   initial?.username  || "",
    email:      initial?.email     || "",
    password:   "",
    role:       initial?.role      || "Investigator",
    phone:      initial?.phone     || "",
    department: initial?.department|| "",
    status:     initial?.status    || "Active",
    rank:       initial?.rank      || "",
  }));
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const isValid = () => {
    if (!form.fullName.trim() || !form.email.trim()) return false;
    if (!isEdit) {
      if (!form.username.trim() || form.password.length < 8) return false;
    } else if (form.password && form.password.length < 8) {
      return false;
    }
    return true;
  };

  const handle = async () => {
    setBusy(true);
    setError(null);
    try {
      const saved = isEdit
        ? await updateUser(initial.id, form)
        : await createUser(form);
      onSaved(saved);
    } catch (err) {
      setError(formatApiError(err, "Save failed"));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            {isEdit ? <Pencil className="h-4 w-4 text-deep-ocean" /> : <UserPlus className="h-4 w-4 text-deep-ocean" />}
            {isEdit ? "Edit User" : "Add New User"}
          </h2>
          <button onClick={onClose} disabled={busy} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Full Name *</label>
              <input value={form.fullName} onChange={set("fullName")}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Username *</label>
              <input value={form.username} onChange={set("username")} disabled={isEdit}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm
                  ${isEdit ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" : "border-slate-300 focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean"}`} />
              {isEdit && <p className="text-[10px] text-slate-400 mt-1">Username cannot be changed</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Email *</label>
              <input type="email" value={form.email} onChange={set("email")}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Password {isEdit ? "(leave blank to keep current)" : "*"}
              </label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={form.password} onChange={set("password")}
                  placeholder={isEdit ? "New password (optional, min 8 chars)" : "Min 8 characters"}
                  className="w-full px-3 py-2.5 pr-10 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean" />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Role *</label>
              <select value={form.role} onChange={set("role")} disabled={isEdit}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-white
                  ${isEdit ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" : "border-slate-300 focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean"}`}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Status</label>
              <select value={form.status} onChange={set("status")}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean">
                <option>Active</option><option>Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Phone</label>
              <input value={form.phone} onChange={set("phone")} placeholder="+92-3XX-XXXXXXX"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Department</label>
              <select value={form.department} onChange={set("department")}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean">
                <option value="">— Select —</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>

            {form.role === "Investigator" && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Rank</label>
                <input value={form.rank} onChange={set("rank")} placeholder="e.g. Insp., SI, ASI"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean" />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} disabled={busy}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
            Cancel
          </button>
          <button onClick={handle} disabled={!isValid() || busy}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 text-white
              ${(!isValid() || busy) ? "bg-deep-ocean/40 cursor-not-allowed" : "bg-deep-ocean hover:bg-deep-ocean-900 cursor-pointer"}`}>
            {busy
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
              : <><CheckCircle2 className="h-4 w-4" /> {isEdit ? "Save Changes" : "Create User"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Delete Modal
// ═════════════════════════════════════════════════════════════════════════════
function DeleteUserModal({ user, onClose, onConfirmed }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const handle = async () => {
    setBusy(true); setError(null);
    try {
      await deleteUser(user.id);
      onConfirmed(user.id);
    } catch (err) {
      setError(formatApiError(err, "Delete failed"));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <Trash2 className="h-6 w-6 text-red-600" />
        </div>
        <div className="text-center">
          <h3 className="text-base font-bold text-slate-800">Delete this user?</h3>
          <p className="text-sm text-slate-500 mt-1">
            <strong>{user.full_name}</strong> ({user.username}) will be permanently removed.
            This action cannot be undone.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} disabled={busy}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
            Cancel
          </button>
          <button onClick={handle} disabled={busy}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
            {busy
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting…</>
              : <><Trash2 className="h-4 w-4" /> Delete</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function UserManagementPage() {
  const navigate = useNavigate();

  // Filters
  const [searchInput, setSearchInput]   = useState("");
  const debouncedSearch                 = useDebounced(searchInput, 350);
  const [roleFilter, setRoleFilter]     = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deptFilter, setDeptFilter]     = useState("All");
  const [page, setPage]                 = useState(1);

  // Data
  const [users, setUsers]   = useState([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  // Modal
  const [modal, setModal] = useState(null);

  const [toast, setToast] = useState(null);
  const showToast = (msg, kind = "success") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2500);
  };

  // ── Fetch ─────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listUsers({
        search:     debouncedSearch,
        role:       roleFilter,
        status:     statusFilter,
        department: deptFilter,
        page,
        pageSize:   PAGE_SIZE,
      });
      setUsers(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(formatApiError(err, "Could not load users."));
      setUsers([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, roleFilter, statusFilter, deptFilter, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleToggle = async (id) => {
    try {
      await toggleUserStatus(id);
      fetchUsers();
      showToast("User status updated.");
    } catch (err) {
      showToast(formatApiError(err, "Toggle failed"), "error");
    }
  };

  const stats = useMemo(() => ({
    total: total,
    active:   users.filter(u => u.status === "Active").length,
    inactive: users.filter(u => u.status === "Inactive").length,
    admins:   users.filter(u => u.role === "Admin").length,
  }), [users, total]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-10">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <button onClick={() => navigate("/admin")}
            className="flex items-center gap-1.5 hover:text-slate-800 transition-colors cursor-pointer">
            <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
          </button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-800 font-medium">User Management</span>
        </nav>

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="h-6 w-6 text-deep-ocean" /> User Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">Manage system users, roles, and access permissions</p>
          </div>
          <button onClick={() => setModal({ type: "add" })}
            className="flex items-center gap-2 px-4 py-2.5 bg-deep-ocean text-white rounded-lg text-sm font-semibold hover:bg-deep-ocean-900 cursor-pointer">
            <UserPlus className="h-4 w-4" /> Add User
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Could not load users</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
            <button onClick={fetchUsers}
              className="text-xs font-semibold text-red-700 hover:underline cursor-pointer">Retry</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Users", value: stats.total,    icon: Users, color: "text-deep-ocean" },
            { label: "Active",      value: stats.active,   icon: CheckCircle2, color: "text-emerald-600" },
            { label: "Inactive",    value: stats.inactive, icon: AlertCircle,  color: "text-red-600" },
            { label: "Admins (on page)", value: stats.admins, icon: Shield, color: "text-purple-600" },
          ].map(s => (
            <Card key={s.label} className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color} shrink-0`} />
              <div>
                <p className="text-xs font-semibold text-slate-500">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row md:flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text" value={searchInput} onChange={e => { setSearchInput(e.target.value); setPage(1); }}
                placeholder="Search by name, username, email…"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean"
              />
            </div>
            <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean min-w-[140px]">
              <option>All</option><option>Admin</option><option>Investigator</option>
            </select>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean min-w-[140px]">
              <option>All</option><option>Active</option><option>Inactive</option>
            </select>
            <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean min-w-[180px]">
              <option>All</option>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
            <button
              onClick={() => { setSearchInput(""); setRoleFilter("All"); setStatusFilter("All"); setDeptFilter("All"); setPage(1); }}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">
              <RefreshCw className="h-3.5 w-3.5" /> Reset
            </button>
          </div>
        </Card>

        {/* Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-deep-ocean text-white">
                <tr>
                  {["User ID", "Name", "Username", "Email", "Role", "Department", "Status", "Last Login", "Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-14 text-slate-400 text-sm">
                    <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" /> Loading users…
                  </td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-14 text-slate-400 text-sm">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    No users match the current filters.
                  </td></tr>
                ) : users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">{u.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-deep-ocean flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {u.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <p className="font-medium text-slate-800">{u.full_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">@{u.username}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{u.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        u.role === "Admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {u.role === "Admin" ? <><Shield className="h-3 w-3 inline mr-1" />{u.role}</> : u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{u.department || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button onClick={() => handleToggle(u.id)}
                        className="flex items-center gap-1 cursor-pointer">
                        {u.status === "Active"
                          ? <ToggleRight className="h-5 w-5 text-emerald-600" />
                          : <ToggleLeft  className="h-5 w-5 text-slate-300" />}
                        <span className={`text-xs font-medium ${u.status === "Active" ? "text-emerald-700" : "text-slate-500"}`}>{u.status}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{u.last_login}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setModal({ type: "edit", user: u })}
                          title="Edit"
                          className="p-1.5 rounded-lg text-deep-ocean hover:bg-deep-ocean/10 cursor-pointer">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setModal({ type: "delete", user: u })}
                          title="Delete"
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && total > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-500">
                Showing <span className="font-semibold">{(page - 1) * PAGE_SIZE + 1}</span>–
                <span className="font-semibold">{Math.min(page * PAGE_SIZE, total)}</span>
                {" "}of <span className="font-semibold">{total}</span> users
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                  <ChevronLeft className="h-4 w-4 text-slate-600" />
                </button>
                <span className="text-xs text-slate-500 px-2">
                  Page <span className="font-semibold">{page}</span> / {totalPages}
                </span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-2 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                </button>
              </div>
            </div>
          )}
        </Card>
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium
          ${toast.kind === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"}`}>
          <CheckCircle2 className="h-4 w-4" /> {toast.msg}
        </div>
      )}

      {/* Modals */}
      {(modal?.type === "add" || modal?.type === "edit") && (
        <UserFormModal
          mode={modal.type} initial={modal.user}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchUsers(); showToast(modal.type === "add" ? "User created." : "User updated."); }}
        />
      )}
      {modal?.type === "delete" && (
        <DeleteUserModal
          user={modal.user}
          onClose={() => setModal(null)}
          onConfirmed={() => { setModal(null); fetchUsers(); showToast("User deleted."); }}
        />
      )}
    </div>
  );
}
