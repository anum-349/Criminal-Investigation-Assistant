/**
 * Forms 3, 4, 5 — User Management (Admin)
 * Add User | Edit User | View Users
 * Route: /admin/users
 * HCI: clear table affordances, inline status toggles, modal-based add/edit,
 *      search + filter, pagination, role color-coding, keyboard-accessible
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Search, Pencil, Trash2, LayoutDashboard, Eye, EyeOff,
  UserPlus, Users, CheckCircle2, X, AlertCircle, Filter,
  ChevronRight, ChevronLeft, ChevronDown, ShieldAlert, Shield,
  RefreshCw, Download, ToggleLeft, ToggleRight, User
} from "lucide-react";
import Header from "../../../components/Header";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";

// ── Constants ─────────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  "Homicide", "Cybercrime", "Narcotics", "Organised Crime",
  "Counter Terrorism", "Fraud", "Traffic", "General Investigation", "Administration"
];
const ROLES = ["Admin", "Investigator"];
const PAGE_SIZE = 8;

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_USERS = [
  { id: "USR-001", fullName: "Insp. Rashid Ali Khan", username: "rashid.ali", email: "rashid.ali@cia.pk", role: "Investigator", phone: "+92-321-1234567", department: "Homicide", status: "Active", lastLogin: "2026-04-22 09:14", created: "2024-01-10" },
  { id: "USR-002", fullName: "Admin Nadia Hussain", username: "nadia.admin", email: "nadia.admin@cia.pk", role: "Admin", phone: "+92-333-9876543", department: "Administration", status: "Active", lastLogin: "2026-04-22 08:30", created: "2023-11-05" },
  { id: "USR-003", fullName: "Insp. Kamran Baig", username: "kamran.b", email: "kamran.baig@cia.pk", role: "Investigator", phone: "+92-312-5556677", department: "Narcotics", status: "Inactive", lastLogin: "2026-03-15 14:22", created: "2024-03-20" },
  { id: "USR-004", fullName: "Insp. Sara Malik", username: "sara.malik", email: "sara.malik@cia.pk", role: "Investigator", phone: "+92-345-1122334", department: "Cybercrime", status: "Active", lastLogin: "2026-04-21 17:05", created: "2024-06-01" },
  { id: "USR-005", fullName: "Admin Tariq Mehmood", username: "tariq.mehmood", email: "tariq@cia.pk", role: "Admin", phone: "+92-300-9988776", department: "Administration", status: "Active", lastLogin: "2026-04-20 11:45", created: "2023-09-14" },
  { id: "USR-006", fullName: "Insp. Faraz Ahmed", username: "faraz.ahmed", email: "faraz@cia.pk", role: "Investigator", phone: "+92-322-6677889", department: "Fraud", status: "Inactive", lastLogin: "2026-02-28 09:00", created: "2025-01-15" },
  { id: "USR-007", fullName: "Insp. Amna Qadir", username: "amna.qadir", email: "amna@cia.pk", role: "Investigator", phone: "+92-311-4433221", department: "Organised Crime", status: "Active", lastLogin: "2026-04-22 07:50", created: "2025-02-20" },
  { id: "USR-008", fullName: "Insp. Bilal Chaudhry", username: "bilal.c", email: "bilal@cia.pk", role: "Investigator", phone: "+92-318-8877665", department: "Counter Terrorism", status: "Active", lastLogin: "2026-04-19 16:30", created: "2024-08-12" },
  { id: "USR-009", fullName: "Insp. Zara Siddiqui", username: "zara.s", email: "zara@cia.pk", role: "Investigator", phone: "+92-344-2233445", department: "Homicide", status: "Active", lastLogin: "2026-04-18 10:15", created: "2024-11-03" },
];

// ── Reusable Field ────────────────────────────────────────────────────────────
const Field = ({ label, required, error, children, hint }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    {error && <p className="flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{error}</p>}
    {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
  </div>
);

const InputEl = ({ error, ...props }) => (
  <input
    className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2
      ${error ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-slate-300 bg-white focus:ring-deep-ocean/30 focus:border-deep-ocean"}`}
    {...props}
  />
);

const SelectEl = ({ error, options, placeholder = "Select…", ...props }) => (
  <select
    className={`w-full px-3 py-2.5 rounded-lg border text-sm appearance-none bg-white transition-all focus:outline-none focus:ring-2
      ${error ? "border-red-400 bg-red-50" : "border-slate-300 focus:ring-deep-ocean/30 focus:border-deep-ocean"}`}
    {...props}
  >
    <option value="">{placeholder}</option>
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

// ── Add / Edit User Modal ─────────────────────────────────────────────────────
const emptyUser = () => ({
  fullName: "", username: "", email: "", password: "",
  role: "", phone: "", department: "", status: "Active"
});

function UserFormModal({ mode, user, onClose, onSave }) {
  const [form, setForm] = useState(mode === "edit" ? { ...user, password: "" } : emptyUser());
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => ({ ...er, [k]: "" })); };

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required";
    if (!form.username.trim()) e.username = "Username is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email address";
    if (mode === "add" && !form.password) e.password = "Password is required";
    if (mode === "add" && form.password && form.password.length < 8) e.password = "Min 8 characters";
    if (!form.role) e.role = "Role is required";
    if (!form.department) e.department = "Department is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    onSave({ ...form, id: user?.id || "USR-" + Date.now() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-deep-ocean/10">
              <UserPlus className="h-4 w-4 text-deep-ocean" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{mode === "edit" ? "Edit User" : "Add New User"}</h2>
              <p className="text-xs text-slate-500">{mode === "edit" ? `Editing: ${user.username}` : "Create a new system user"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {/* Form body */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" required error={errors.fullName}>
              <InputEl value={form.fullName} onChange={set("fullName")} error={errors.fullName} placeholder="As per ID card" />
            </Field>
            <Field label="Username" required error={errors.username}>
              <InputEl value={form.username} onChange={set("username")} error={errors.username} placeholder="unique_username" />
            </Field>
            <Field label="Email Address" required error={errors.email} className="sm:col-span-2">
              <InputEl type="email" value={form.email} onChange={set("email")} error={errors.email} placeholder="name@cia.pk" />
            </Field>
            <Field
              label={mode === "edit" ? "New Password (leave blank to keep)" : "Password"}
              required={mode === "add"} error={errors.password}
            >
              <div className="relative">
                <InputEl
                  type={showPwd ? "text" : "password"}
                  value={form.password} onChange={set("password")}
                  error={errors.password} placeholder="Min 8 characters"
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Field label="Role" required error={errors.role}>
              <SelectEl options={ROLES} value={form.role} onChange={set("role")} error={errors.role} />
            </Field>
            <Field label="Phone Number" error={errors.phone}>
              <InputEl value={form.phone} onChange={set("phone")} error={errors.phone} placeholder="+92-3XX-XXXXXXX" />
            </Field>
            <Field label="Department" required error={errors.department}>
              <SelectEl options={DEPARTMENTS} value={form.department} onChange={set("department")} error={errors.department} />
            </Field>
            <Field label="Status">
              <SelectEl options={["Active", "Inactive"]} value={form.status} onChange={set("status")} />
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all
              ${saving ? "bg-deep-ocean/60 cursor-not-allowed" : "bg-deep-ocean hover:bg-deep-ocean-900 cursor-pointer"} text-white`}>
            {saving
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
              : <><CheckCircle2 className="h-4 w-4" /> {mode === "edit" ? "Save Changes" : "Create User"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirmation ───────────────────────────────────────────────────────
function DeleteModal({ user, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 text-center">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <Trash2 className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Delete User?</h3>
        <p className="text-sm text-slate-500">
          This will permanently remove <strong>{user.fullName}</strong> ({user.username}) from the system. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
            Cancel
          </button>
          <button onClick={() => onConfirm(user.id)}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer flex items-center justify-center gap-2">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── View User Detail Modal ────────────────────────────────────────────────────
function ViewUserModal({ user, onClose, onEdit }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">User Details</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-deep-ocean flex items-center justify-center text-white text-xl font-bold">
              {user.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <p className="font-bold text-slate-800">{user.fullName}</p>
              <p className="text-xs text-slate-500">@{user.username}</p>
              <span className={`mt-1 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full
                ${user.role === "Admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                {user.role}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["User ID", user.id], ["Email", user.email], ["Phone", user.phone],
              ["Department", user.department], ["Status", user.status], ["Last Login", user.lastLogin],
              ["Created", user.created],
            ].map(([k, v]) => (
              <div key={k} className="space-y-0.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{k}</p>
                <p className="text-slate-800">{v}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 border border-slate-300 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">Close</button>
          <button onClick={() => { onEdit(user); onClose(); }}
            className="flex-1 bg-deep-ocean text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-deep-ocean-900 cursor-pointer flex items-center justify-center gap-2">
            <Pencil className="h-4 w-4" /> Edit User
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main User Management Page ─────────────────────────────────────────────────
export default function UserManagementPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState(MOCK_USERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // null | {type:"add"|"edit"|"delete"|"view", user?}

  // ── Filtering & pagination ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u =>
      (!q || [u.fullName, u.username, u.email, u.id, u.department].some(f => f?.toLowerCase().includes(q))) &&
      (roleFilter === "All" || u.role === roleFilter) &&
      (statusFilter === "All" || u.status === statusFilter) &&
      (deptFilter === "All" || u.department === deptFilter)
    );
  }, [users, search, roleFilter, statusFilter, deptFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSave = (user) => {
    setUsers(us => us.find(u => u.id === user.id) ? us.map(u => u.id === user.id ? { ...u, ...user } : u) : [{ ...user, lastLogin: "—", created: new Date().toISOString().split("T")[0] }, ...us]);
    setModal(null);
  };

  const handleDelete = (id) => {
    setUsers(us => us.filter(u => u.id !== id));
    setModal(null);
  };

  const toggleStatus = (id) => {
    setUsers(us => us.map(u => u.id === id ? { ...u, status: u.status === "Active" ? "Inactive" : "Active" } : u));
  };

  const stats = { total: users.length, active: users.filter(u => u.status === "Active").length, admins: users.filter(u => u.role === "Admin").length, inactive: users.filter(u => u.status === "Inactive").length };

  return (
    <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-14">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <button onClick={() => navigate("/admin")} className="flex items-center gap-1.5 hover:text-slate-800 transition-colors cursor-pointer">
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
          <button
            onClick={() => setModal({ type: "add" })}
            className="flex items-center gap-2 px-5 py-2.5 bg-deep-ocean text-white rounded-lg text-sm font-semibold hover:bg-deep-ocean-900 transition-colors cursor-pointer shadow-sm self-start sm:self-auto"
          >
            <UserPlus className="h-4 w-4" /> Add New User
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: stats.total, icon: Users, color: "text-deep-ocean" },
            { label: "Active", value: stats.active, icon: CheckCircle2, color: "text-emerald-600" },
            { label: "Admins", value: stats.admins, icon: ShieldAlert, color: "text-purple-600" },
            { label: "Inactive", value: stats.inactive, icon: User, color: "text-slate-400" },
          ].map(s => (
            <Card key={s.label} className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-slate-50">
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by name, username, email, ID…"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean"
              />
            </div>
            {[
              { label: "Role", value: roleFilter, set: setRoleFilter, opts: ["All", "Admin", "Investigator"] },
              { label: "Status", value: statusFilter, set: setStatusFilter, opts: ["All", "Active", "Inactive"] },
              { label: "Dept", value: deptFilter, set: setDeptFilter, opts: ["All", ...DEPARTMENTS] },
            ].map(f => (
              <select key={f.label} value={f.value} onChange={e => { f.set(e.target.value); setPage(1); }}
                className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 appearance-none min-w-30">
                {f.opts.map(o => <option key={o} value={o}>{o === "All" ? `All ${f.label}s` : o}</option>)}
              </select>
            ))}
            <button onClick={() => { setSearch(""); setRoleFilter("All"); setStatusFilter("All"); setDeptFilter("All"); setPage(1); }}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
              <RefreshCw className="h-3.5 w-3.5" /> Reset
            </button>
          </div>
        </Card>

        {/* Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["User ID", "Name", "Role", "Email", "Department", "Status", "Last Login", "Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap first:rounded-tl-lg">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageData.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400 text-sm">No users match the current filters.</td></tr>
                ) : pageData.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{user.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-deep-ocean flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {user.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{user.fullName}</p>
                          <p className="text-xs text-slate-400">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full
                        ${user.role === "Admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                        {user.role === "Admin" ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{user.email}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{user.department}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button onClick={() => toggleStatus(user.id)}
                        className="flex items-center gap-1.5 text-xs font-medium cursor-pointer group/toggle" title="Click to toggle status">
                        {user.status === "Active"
                          ? <><ToggleRight className="h-5 w-5 text-emerald-500" /><span className="text-emerald-700">Active</span></>
                          : <><ToggleLeft className="h-5 w-5 text-slate-300" /><span className="text-slate-400">Inactive</span></>}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{user.lastLogin}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setModal({ type: "view", user })} title="View"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => setModal({ type: "edit", user })} title="Edit"
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors cursor-pointer">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setModal({ type: "delete", user })} title="Delete"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer">
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} users
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer
                    ${p === page ? "bg-deep-ocean text-white" : "hover:bg-slate-100 text-slate-600"}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          </div>
        </Card>
      </main>

      {/* Modals */}
      {modal?.type === "add" && <UserFormModal mode="add" onClose={() => setModal(null)} onSave={handleSave} />}
      {modal?.type === "edit" && <UserFormModal mode="edit" user={modal.user} onClose={() => setModal(null)} onSave={handleSave} />}
      {modal?.type === "delete" && <DeleteModal user={modal.user} onClose={() => setModal(null)} onConfirm={handleDelete} />}
      {modal?.type === "view" && <ViewUserModal user={modal.user} onClose={() => setModal(null)} onEdit={(u) => setModal({ type: "edit", user: u })} />}
    </div>
  );
}