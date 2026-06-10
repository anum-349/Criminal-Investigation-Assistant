/**
 * src/pages/admin/profile/page.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin — Profile.
 * Route: /admin/profile
 *
 * Backend integration (uses existing /api/auth endpoints):
 *   - GET  /api/auth/me                — current user
 *   - PUT  /api/auth/profile           — update email / phone / address
 *   - POST /api/auth/change-password
 *   - GET  /api/auth/preferences       — fetch saved prefs
 *   - PUT  /api/auth/preferences       — save prefs
 */

import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  User, Shield, Bell, Lock, Eye, EyeOff,
  ChevronRight, LayoutDashboard, Camera, Check,
  LogOut, Key, ToggleLeft, ToggleRight, AlertTriangle, Loader2,
} from "lucide-react";

import Header from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { formatApiError } from "@/services/adminApi";
import { AuthContext } from '@/context/AuthContext';
import { getAuthHeader } from "@/services/apiCommon";

const apiBase = () => import.meta.env.VITE_API_URL;

const TABS = [
  { id: "profile",     label: "Personal Info", icon: User },
  { id: "security",    label: "Security",      icon: Shield },
  { id: "preferences", label: "Preferences",   icon: Bell },
];

const Field = ({ label, value, onChange, type = "text", disabled = false, hint, placeholder }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</label>
    <input
      type={type} value={value ?? ""} onChange={onChange} disabled={disabled} placeholder={placeholder}
      className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-all focus:outline-none
        ${disabled
          ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
          : "bg-white border-slate-300 text-slate-800 focus:ring-2 focus:ring-deep-ocean focus:border-transparent"}`}
    />
    {hint && <p className="text-xs text-slate-400">{hint}</p>}
  </div>
);

const Toggle = ({ label, description, value, onChange }) => (
  <div className="flex items-start justify-between gap-4 py-3.5 border-b border-slate-100 last:border-0">
    <div>
      <p className="text-sm font-medium text-slate-800">{label}</p>
      <p className="text-xs text-slate-500 mt-0.5">{description}</p>
    </div>
    <button onClick={() => onChange(!value)} className="shrink-0 mt-0.5 cursor-pointer">
      {value
        ? <ToggleRight className="h-7 w-7 text-deep-ocean" />
        : <ToggleLeft  className="h-7 w-7 text-slate-300" />}
    </button>
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
// PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function AdminProfilePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");

  // ── Profile ─────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError]   = useState(null);

  const [savingProfile, setSavingProfile] = useState(false);
    const { logout } = useContext(AuthContext);

  // ── Password ────────────────────────────────────────────────────────────
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwBusy, setPwBusy]           = useState(false);

  // ── Preferences ─────────────────────────────────────────────────────────
  const DEFAULT_PREFS = {
    email_notifications:    true,
    case_update_alerts:     true,
    new_user_alerts:        true,
    failed_login_alerts:    true,
    backup_completion:      false,
    weekly_summary_email:   true,
    sound_alerts:           false,
  };
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [prefsBusy, setPrefsBusy] = useState(false);

  // ── Toast ───────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const showToast = (msg, kind = "success") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2500);
  };

  // ── Load profile ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // GET /api/auth/me — current user
        const meRes = await axios.get(`${apiBase()}/api/auth/me`, { headers: getAuthHeader() });
        if (cancelled) return;
        setProfile({
          username:     meRes.data?.username     || "—",
          badge_number: meRes.data?.badge_number || "—",
          email:        meRes.data?.email        || "",
          contact_info: meRes.data?.contact_info || "",
          address:      meRes.data?.address      || "",
          role:         meRes.data?.role,
          picture_url:  meRes.data?.picture_url,
        });

        // GET /api/auth/preferences
        try {
          const prefsRes = await axios.get(`${apiBase()}/api/auth/preferences`, { headers: getAuthHeader() });
          if (!cancelled && prefsRes.data?.preferences) {
            setPrefs(p => ({ ...p, ...prefsRes.data.preferences }));
          }
        } catch {
          /* preferences are optional */
        }
      } catch (err) {
        if (!cancelled) setProfileError(formatApiError(err, "Could not load profile."));
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Save profile ────────────────────────────────────────────────────────
  const handleProfileSave = async () => {
    setSavingProfile(true);
    try {
      const body = {
        email:        profile.email,
        contact_info: profile.contact_info,
        address:      profile.address,
      };
      await axios.put(`${apiBase()}/api/auth/profile`, body, { headers: getAuthHeader() });
      showToast("Profile updated.");
    } catch (err) {
      showToast(formatApiError(err, "Update failed"), "error");
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Update password ─────────────────────────────────────────────────────
  const handlePasswordUpdate = async () => {
    if (pw.next !== pw.confirm) { showToast("Passwords do not match.", "error"); return; }
    if (pw.next.length < 8)     { showToast("Password must be at least 8 characters.", "error"); return; }

    setPwBusy(true);
    try {
      await axios.post(`${apiBase()}/api/auth/change-password`,
        { current_password: pw.current, new_password: pw.next },
        { headers: getAuthHeader() },
      );
      setPw({ current: "", next: "", confirm: "" });
      showToast("Password updated successfully.");
    } catch (err) {
      showToast(formatApiError(err, "Password update failed"), "error");
    } finally {
      setPwBusy(false);
    }
  };

  // ── Save preferences ────────────────────────────────────────────────────
  const handlePrefsSave = async () => {
    setPrefsBusy(true);
    try {
      await axios.put(`${apiBase()}/api/auth/preferences`,
        { preferences: prefs },
        { headers: getAuthHeader() },
      );
      showToast("Preferences saved.");
    } catch (err) {
      showToast(formatApiError(err, "Save failed"), "error");
    } finally {
      setPrefsBusy(false);
    }
  };

  const setPref = (k) => (v) => setPrefs(p => ({ ...p, [k]: v }));
    const handleLogout = () => { logout(); navigate('/login'); };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-soft-mist mt-10">
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-16 text-center text-slate-500">
          <Loader2 className="h-8 w-8 mx-auto animate-spin mb-3 text-deep-ocean" />
          Loading profile…
        </main>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-soft-mist mt-10">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-16">
          <Card className="p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-slate-800">Could not load profile</h2>
            <p className="text-sm text-slate-500 mt-1">{profileError}</p>
          </Card>
        </main>
      </div>
    );
  }

  const initials = (profile.username || "??").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-10">
      <Header />

      <main className="max-w-6xl mx-auto px-4 lg:px-6 py-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <button onClick={() => navigate("/admin")}
            className="flex items-center gap-1.5 hover:text-slate-800 transition-colors cursor-pointer">
            <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
          </button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-800 font-medium">Profile</span>
        </nav>

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <User className="h-6 w-6 text-deep-ocean" /> My Profile
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage your account, security, and notification settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-5 flex flex-col items-center text-center">
              <div className="relative mb-3">
                <div className="w-20 h-20 rounded-full bg-deep-ocean flex items-center justify-center text-white text-2xl font-bold">
                  {initials}
                </div>
                <button className="absolute bottom-0 right-0 p-1.5 rounded-full bg-white border-2 border-slate-200 hover:bg-slate-50 cursor-pointer" title="Change photo">
                  <Camera className="h-3.5 w-3.5 text-slate-600" />
                </button>
              </div>
              <p className="font-bold text-slate-800">{profile.username}</p>
              <p className="text-xs text-slate-500 font-mono">{profile.badge_number}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                <Shield className="h-3 w-3" /> Admin
              </span>
            </Card>

            <Card className="p-2">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
                    ${activeTab === id
                      ? "bg-deep-ocean text-white"
                      : "text-slate-600 hover:bg-slate-100"}`}>
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              ))}
              <div className="border-t border-slate-100 mt-2 pt-2">
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                  <LogOut className="h-4 w-4 shrink-0" /> Sign Out
                </button>
              </div>
            </Card>
          </div>

          {/* Right content */}
          <div className="lg:col-span-3 space-y-4">
            {/* Personal Info */}
            {activeTab === "profile" && (
              <Card className="p-6 space-y-6">
                <div className="border-b border-slate-200 pb-4">
                  <h2 className="text-lg font-bold text-slate-800">Personal Information</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Update your contact details.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Username"     value={profile.username}     disabled hint="Username cannot be changed" />
                  <Field label="Badge Number" value={profile.badge_number} disabled hint="Badge number cannot be changed" />
                  <Field label="Email Address" type="email" value={profile.email}
                    onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
                  <Field label="Contact / Phone" value={profile.contact_info}
                    onChange={e => setProfile(p => ({ ...p, contact_info: e.target.value }))} />
                  <Field label="Role" value="Administrator" disabled />
                  <Field label="Address" value={profile.address}
                    onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} />
                </div>

                <div className="flex justify-end pt-2">
                  <button onClick={handleProfileSave} disabled={savingProfile}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-deep-ocean text-white text-sm font-medium hover:bg-deep-ocean-900 disabled:opacity-50 cursor-pointer">
                    {savingProfile
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Check className="h-4 w-4" />}
                    {savingProfile ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </Card>
            )}

            {/* Security */}
            {activeTab === "security" && (
              <Card className="p-6 space-y-6">
                <div className="border-b border-slate-200 pb-4">
                  <h2 className="text-lg font-bold text-slate-800">Security</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Password and authentication settings</p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Key className="h-4 w-4 text-deep-ocean" /> Change Password
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: "Current Password", value: pw.current, set: v => setPw(p => ({ ...p, current: v })), show: showCurrent, setShow: setShowCurrent, span: "sm:col-span-2" },
                      { label: "New Password",     value: pw.next,    set: v => setPw(p => ({ ...p, next:    v })), show: showNext,    setShow: setShowNext },
                      { label: "Confirm New Password", value: pw.confirm, set: v => setPw(p => ({ ...p, confirm: v })), show: showConfirm, setShow: setShowConfirm },
                    ].map((f, i) => (
                      <div key={i} className={`space-y-1.5 ${f.span || ""}`}>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">{f.label}</label>
                        <div className="relative">
                          <input type={f.show ? "text" : "password"} value={f.value} onChange={e => f.set(e.target.value)}
                            className="w-full px-3 py-2.5 pr-10 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean"
                            placeholder="••••••••" />
                          <button type="button" onClick={() => f.setShow(s => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer">
                            {f.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 text-xs text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Password requirements</p>
                      <p>Minimum 8 characters with at least one uppercase letter, one lowercase letter, and one digit.</p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button onClick={handlePasswordUpdate} disabled={pwBusy || !pw.current || !pw.next || !pw.confirm}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-deep-ocean text-white text-sm font-medium hover:bg-deep-ocean-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                      {pwBusy
                        ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <Lock className="h-4 w-4" />}
                      {pwBusy ? "Updating…" : "Update Password"}
                    </button>
                  </div>
                </div>
              </Card>
            )}

            {/* Preferences */}
            {activeTab === "preferences" && (
              <Card className="p-6 space-y-5">
                <div className="border-b border-slate-200 pb-4">
                  <h2 className="text-lg font-bold text-slate-800">Preferences</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Notification and display settings.</p>
                </div>

                <div className="bg-slate-50 rounded-lg px-4 divide-y divide-slate-100">
                  <Toggle label="Email Notifications"   description="Receive admin alerts via email"                       value={prefs.email_notifications}  onChange={setPref("email_notifications")} />
                  <Toggle label="Case Update Alerts"    description="Alert when a case status changes system-wide"         value={prefs.case_update_alerts}   onChange={setPref("case_update_alerts")} />
                  <Toggle label="New User Alerts"       description="Notify when a new user account is created"            value={prefs.new_user_alerts}      onChange={setPref("new_user_alerts")} />
                  <Toggle label="Failed Login Alerts"   description="Notify on repeated failed login attempts"             value={prefs.failed_login_alerts}  onChange={setPref("failed_login_alerts")} />
                  <Toggle label="Backup Completion"     description="Confirmation when scheduled backups finish"           value={prefs.backup_completion}    onChange={setPref("backup_completion")} />
                  <Toggle label="Weekly Summary Email"  description="Receive a system-health digest every Monday"         value={prefs.weekly_summary_email} onChange={setPref("weekly_summary_email")} />
                  <Toggle label="Sound Alerts"          description="Play a sound for urgent notifications"                value={prefs.sound_alerts}         onChange={setPref("sound_alerts")} />
                </div>

                <div className="flex justify-end">
                  <button onClick={handlePrefsSave} disabled={prefsBusy}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-deep-ocean text-white text-sm font-medium hover:bg-deep-ocean-900 disabled:opacity-50 cursor-pointer">
                    {prefsBusy
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Check className="h-4 w-4" />}
                    {prefsBusy ? "Saving…" : "Save Preferences"}
                  </button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium
          ${toast.kind === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"}`}>
          {toast.kind === "success" ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
