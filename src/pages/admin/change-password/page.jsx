/**
 * Form 2 — Change Password
 * Route: used inside /investigator/profile (Security tab) and /admin/settings
 * HCI: immediate inline validation, password strength meter, toggle visibility,
 *      clear error messages, disabled submit until valid, success feedback
 */
import { useState } from "react";
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle, ShieldCheck, X } from "lucide-react";
import { Card } from "../../../components/ui/Card";

// ── Password strength helper ──────────────────────────────────────────────────
const getStrength = (pwd) => {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score; // 0-4
};
const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = ["", "bg-red-500", "bg-amber-400", "bg-blue-500", "bg-emerald-500"];
const STRENGTH_TEXT = ["", "text-red-600", "text-amber-600", "text-blue-600", "text-emerald-600"];

// ── Password field ────────────────────────────────────────────────────────────
const PwdField = ({ label, value, onChange, show, onToggle, error, hint, id }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
      {label} <span className="text-red-500">*</span>
    </label>
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        autoComplete="new-password"
        className={`w-full pl-9 pr-11 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2
          ${error
            ? "border-red-400 bg-red-50 focus:ring-red-300"
            : value && !error
            ? "border-emerald-400 bg-emerald-50/30 focus:ring-emerald-300"
            : "border-slate-300 bg-white focus:ring-deep-ocean/30 focus:border-deep-ocean"
          }`}
        placeholder="••••••••"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-0.5 cursor-pointer"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
    {error && (
      <p className="flex items-center gap-1.5 text-xs text-red-600">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
      </p>
    )}
    {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
  </div>
);

// ── Requirements checklist ────────────────────────────────────────────────────
const Requirement = ({ met, label }) => (
  <li className={`flex items-center gap-1.5 text-xs transition-colors ${met ? "text-emerald-600" : "text-slate-400"}`}>
    <div className={`w-1.5 h-1.5 rounded-full transition-colors ${met ? "bg-emerald-500" : "bg-slate-300"}`} />
    {label}
  </li>
);

// ── Main component ────────────────────────────────────────────────────────────
export default function ChangePasswordForm({ onSuccess, onCancel }) {
  const [fields, setFields] = useState({ old: "", newPwd: "", confirm: "" });
  const [show, setShow] = useState({ old: false, newPwd: false, confirm: false });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const strength = getStrength(fields.newPwd);

  const set = (key) => (e) => {
    setFields((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: "" }));
  };

  const toggle = (key) => () => setShow((s) => ({ ...s, [key]: !s[key] }));

  const validate = () => {
    const e = {};
    if (!fields.old.trim()) e.old = "Current password is required.";
    if (!fields.newPwd) e.newPwd = "New password is required.";
    else if (fields.newPwd.length < 8) e.newPwd = "Must be at least 8 characters.";
    else if (strength < 2) e.newPwd = "Password is too weak. Add uppercase, numbers, or symbols.";
    if (!fields.confirm) e.confirm = "Please confirm your new password.";
    else if (fields.confirm !== fields.newPwd) e.confirm = "Passwords do not match.";
    if (fields.newPwd && fields.old && fields.newPwd === fields.old)
      e.newPwd = "New password must differ from current password.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitting(false);
    setDone(true);
    setTimeout(() => { setDone(false); setFields({ old: "", newPwd: "", confirm: "" }); onSuccess?.(); }, 2000);
  };

  const canSubmit = fields.old && fields.newPwd && fields.confirm && !submitting;

  if (done) {
    return (
      <Card className="p-8 text-center space-y-3 max-w-md mx-auto">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Password Updated</h3>
        <p className="text-sm text-slate-500">Your password has been changed successfully.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 max-w-md space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-deep-ocean/10">
            <ShieldCheck className="h-5 w-5 text-deep-ocean" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Change Password</h2>
            <p className="text-xs text-slate-500 mt-0.5">Keep your account secure</p>
          </div>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        )}
      </div>

      <div className="border-t border-slate-100" />

      {/* Fields */}
      <PwdField
        id="old-password" label="Current Password"
        value={fields.old} onChange={set("old")}
        show={show.old} onToggle={toggle("old")}
        error={errors.old}
        hint="Enter your current active password"
      />

      <PwdField
        id="new-password" label="New Password"
        value={fields.newPwd} onChange={set("newPwd")}
        show={show.newPwd} onToggle={toggle("newPwd")}
        error={errors.newPwd}
      />

      {/* Strength meter — only shown when user starts typing */}
      {fields.newPwd && (
        <div className="space-y-2 -mt-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-all duration-300
                  ${i <= strength ? STRENGTH_COLORS[strength] : "bg-slate-200"}`}
              />
            ))}
          </div>
          <p className={`text-xs font-semibold ${STRENGTH_TEXT[strength]}`}>
            {STRENGTH_LABELS[strength]}
          </p>
          {/* Requirements list */}
          <ul className="space-y-1 pl-1">
            <Requirement met={fields.newPwd.length >= 8} label="At least 8 characters" />
            <Requirement met={/[A-Z]/.test(fields.newPwd)} label="One uppercase letter" />
            <Requirement met={/[0-9]/.test(fields.newPwd)} label="One number" />
            <Requirement met={/[^A-Za-z0-9]/.test(fields.newPwd)} label="One special character (!@#$…)" />
          </ul>
        </div>
      )}

      <PwdField
        id="confirm-password" label="Confirm New Password"
        value={fields.confirm} onChange={set("confirm")}
        show={show.confirm} onToggle={toggle("confirm")}
        error={errors.confirm}
        hint={fields.confirm && fields.confirm === fields.newPwd ? "✓ Passwords match" : ""}
      />

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2
            ${canSubmit
              ? "bg-deep-ocean text-white hover:bg-deep-ocean-900 cursor-pointer shadow-sm"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
        >
          {submitting ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Updating…</>
          ) : (
            <><Lock className="h-4 w-4" /> Update Password</>
          )}
        </button>
      </div>

      <p className="text-xs text-slate-400 text-center">
        You will remain logged in after changing your password.
      </p>
    </Card>
  );
}