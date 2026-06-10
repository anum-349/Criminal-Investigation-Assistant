/**
 * Form 21 — System Settings
 * Route: /admin/settings
 * HCI: grouped settings, live preview for theme, toggle switches,
 *      clear save state, confirmation for dangerous changes
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings, Monitor, Globe, Lock, Database, Clock,
  LayoutDashboard, ChevronRight, Save, CheckCircle2,
  ToggleLeft, ToggleRight, Sun, Moon, Bell, Shield,
  AlertTriangle, RefreshCw, X
} from "lucide-react";
import Header from "@/components/Header";
import { Card } from "@/components/ui/Card";

const Toggle = ({ label, description, value, onChange, disabled }) => (
  <div className="flex items-start justify-between gap-4 py-4 border-b border-slate-100 last:border-0">
    <div className="flex-1">
      <p className={`text-sm font-medium ${disabled ? "text-slate-400" : "text-slate-800"}`}>{label}</p>
      {description && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>}
    </div>
    <button onClick={() => !disabled && onChange(!value)} disabled={disabled}
      className={`shrink-0 mt-0.5 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      aria-label={value ? `Disable ${label}` : `Enable ${label}`}
    >
      {value
        ? <ToggleRight className="h-6 w-6 text-deep-ocean" />
        : <ToggleLeft className="h-6 w-6 text-slate-300" />}
    </button>
  </div>
);

const Field = ({ label, hint, children }) => (
  <div className="py-4 border-b border-slate-100 last:border-0 space-y-2">
    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</label>
    {children}
    {hint && <p className="text-xs text-slate-400">{hint}</p>}
  </div>
);

const Select = ({ options, ...p }) => (
  <select className="w-full sm:w-auto px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 appearance-none" {...p}>
    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
  </select>
);

const SectionCard = ({ icon: Icon, title, subtitle, children }) => (
  <Card className="p-0 overflow-hidden">
    <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
        <Icon className="h-4 w-4 text-deep-ocean" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-800">{title}</p>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
    <div className="px-5">{children}</div>
  </Card>
);

const DEFAULT = {
  theme: "light", language: "en", encryptionEnabled: true,
  autoBackup: true, backupInterval: "24", sessionTimeout: "30",
  auditLogging: true, twoFactor: false, passwordExpiry: "90",
  notificationsEnabled: true, emailAlerts: false,
};

export default function SystemSettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(DEFAULT);
  const [original] = useState(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const set = (k) => (v) => setSettings(s => ({ ...s, [k]: v }));
  const setV = (k) => (e) => setSettings(s => ({ ...s, [k]: e.target.value }));

  const isDirty = JSON.stringify(settings) !== JSON.stringify(original);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-10">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <button onClick={() => navigate("/admin")} className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition-colors"><LayoutDashboard className="h-3.5 w-3.5" />Dashboard</button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-800 font-medium">System Settings</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Settings className="h-6 w-6 text-deep-ocean" />System Settings</h1>
            <p className="text-sm text-slate-500 mt-1">Configure application-wide preferences, security, and database policies</p>
          </div>
          {isDirty && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full self-start sm:self-auto">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Unsaved changes
            </div>
          )}
        </div>

        {saved && (
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 font-medium">
            <CheckCircle2 className="h-4 w-4" /> Settings saved successfully.
          </div>
        )}

        {/* ── Theme & Appearance ── */}
        <SectionCard icon={Monitor} title="Theme & Appearance" subtitle="Visual preferences for the application">
          <Field label="Application Theme" hint="Theme applies to all users system-wide">
            <div className="flex gap-3">
              {[["light", Sun, "Light Mode"], ["dark", Moon, "Dark Mode"]].map(([val, Icon, lbl]) => (
                <button key={val} onClick={() => set("theme")(val)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer
                    ${settings.theme === val
                      ? "bg-deep-ocean text-white border-deep-ocean shadow-sm"
                      : "bg-white text-slate-600 border-slate-300 hover:border-deep-ocean/50"}`}>
                  <Icon className="h-4 w-4" />{lbl}
                </button>
              ))}
            </div>
          </Field>
        </SectionCard>

        {/* ── Language ── */}
        <SectionCard icon={Globe} title="Language & Localisation" subtitle="Interface language and regional settings">
          <Field label="System Language" hint="Sets the UI language for all users. Urdu is required for Urdu FIR processing.">
            <Select value={settings.language} onChange={setV("language")}
              options={[["en", "English"], ["ur", "اردو (Urdu)"], ["bi", "Bilingual (EN + UR)"]]} />
          </Field>
        </SectionCard>

        {/* ── Security ── */}
        <SectionCard icon={Lock} title="Security" subtitle="Encryption, session, and authentication policies">
          <Toggle
            label="Data Encryption at Rest"
            description="All case data, evidence metadata, and user information is AES-256 encrypted in the database."
            value={settings.encryptionEnabled}
            onChange={set("encryptionEnabled")}
          />
          <Toggle
            label="Two-Factor Authentication (Admin)"
            description="Require OTP or authenticator app for admin login. Strongly recommended."
            value={settings.twoFactor}
            onChange={set("twoFactor")}
          />
          <Toggle
            label="Full Audit Logging"
            description="Log every CREATE, UPDATE, DELETE, and VIEW action to the audit trail."
            value={settings.auditLogging}
            onChange={set("auditLogging")}
          />
          <Field label="Session Timeout (minutes)" hint="Users are automatically logged out after this period of inactivity.">
            <Select value={settings.sessionTimeout} onChange={setV("sessionTimeout")}
              options={[["15", "15 minutes"], ["30", "30 minutes"], ["60", "1 hour"], ["120", "2 hours"], ["never", "Never (not recommended)"]]} />
          </Field>
          <Field label="Password Expiry (days)" hint="Force all users to reset their password after this many days. Set 0 to disable.">
            <Select value={settings.passwordExpiry} onChange={setV("passwordExpiry")}
              options={[["30", "30 days"], ["60", "60 days"], ["90", "90 days"], ["180", "180 days"], ["0", "Never expire"]]} />
          </Field>
        </SectionCard>

        {/* ── Database / Backup ── */}
        <SectionCard icon={Database} title="Database & Backup" subtitle="Automated backup configuration">
          <Toggle
            label="Automatic Database Backup"
            description="System will automatically create encrypted backups on the configured schedule."
            value={settings.autoBackup}
            onChange={set("autoBackup")}
          />
          <Field label="Backup Interval" hint="How frequently the system creates automatic backups.">
            <Select value={settings.backupInterval} onChange={setV("backupInterval")} disabled={!settings.autoBackup}
              options={[["6", "Every 6 hours"], ["12", "Every 12 hours"], ["24", "Every 24 hours (Daily)"], ["48", "Every 48 hours"], ["168", "Weekly"]]} />
          </Field>
        </SectionCard>

        {/* ── Notifications ── */}
        <SectionCard icon={Bell} title="Notifications" subtitle="Alert and notification preferences">
          <Toggle
            label="In-App Notifications"
            description="Show real-time notifications for new leads, case updates, and system alerts."
            value={settings.notificationsEnabled}
            onChange={set("notificationsEnabled")}
          />
          <Toggle
            label="Email Alerts"
            description="Send email notifications to officers for critical case events and system alerts."
            value={settings.emailAlerts}
            onChange={set("emailAlerts")}
          />
        </SectionCard>

        {/* ── Danger zone ── */}
        <Card className="p-5 border border-red-200 bg-red-50/50">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="text-sm font-bold text-red-700">Danger Zone</h3>
          </div>
          <div className="flex items-center justify-between gap-4 py-3 border-b border-red-100">
            <div>
              <p className="text-sm font-medium text-slate-700">Reset All Settings to Default</p>
              <p className="text-xs text-slate-500 mt-0.5">Revert all settings above to factory defaults. This will not delete any case data.</p>
            </div>
            <button onClick={() => setShowReset(true)}
              className="shrink-0 flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 cursor-pointer transition-colors">
              <RefreshCw className="h-4 w-4" /> Reset
            </button>
          </div>
        </Card>

        {/* Save bar */}
        <div className="flex gap-3 pb-10">
          <button onClick={() => setSettings(DEFAULT)}
            className="px-5 py-2.5 border border-slate-300 bg-white text-slate-600 rounded-lg text-sm hover:bg-slate-50 cursor-pointer transition-colors">
            Discard Changes
          </button>
          <button onClick={handleSave} disabled={saving || !isDirty}
            className={`flex items-center gap-2 px-8 py-2.5 rounded-lg text-sm font-semibold flex-1 justify-center transition-all
              ${saving || !isDirty ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-deep-ocean text-white hover:bg-deep-ocean-900 cursor-pointer shadow-sm"}`}>
            {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : <><Save className="h-4 w-4" />Save Settings</>}
          </button>
        </div>
      </main>

      {/* Reset confirm modal */}
      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto"><RefreshCw className="h-5 w-5 text-red-600" /></div>
            <h3 className="text-base font-bold text-slate-800">Reset to Defaults?</h3>
            <p className="text-sm text-slate-500">All settings will be reverted to factory defaults. No case data will be affected.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowReset(false)} className="flex-1 border border-slate-300 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button onClick={() => { setSettings(DEFAULT); setShowReset(false); }}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors">
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}