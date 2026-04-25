/**
 * CaseFormFields.jsx
 * Reusable primitive UI components shared by every case-form step.
 * Never duplicate these — import from here.
 *
 * Place at: src/pages/investigator/case-for../CaseFormFields/page.jsx
 */
import { HelpCircle, AlertCircle } from "lucide-react";

// ── FieldLabel ────────────────────────────────────────────────────────────────
export const FieldLabel = ({ children, required, hint }) => (
  <div className="flex items-center gap-1.5 mb-1.5">
    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {hint && (
      <div className="group relative">
        <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help" />
        <div className="absolute left-0 bottom-5 hidden group-hover:block w-52 bg-slate-800 text-white
                        text-xs rounded-lg p-2 z-50 shadow-xl pointer-events-none">
          {hint}
        </div>
      </div>
    )}
  </div>
);

// ── TextField ─────────────────────────────────────────────────────────────────
export const TextField = ({ label, required, hint, error, className = "", ...props }) => (
  <div className={className}>
    {label && <FieldLabel required={required} hint={hint}>{label}</FieldLabel>}
    <input
      className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-all focus:outline-none
        focus:ring-2 focus:ring-deep-ocean focus:border-transparent
        ${error
          ? "border-red-400 bg-red-50 focus:ring-red-400"
          : props.readOnly
          ? "border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
          : "border-slate-300 bg-white text-slate-800"
        }`}
      {...props}
    />
    {error && (
      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />{error}
      </p>
    )}
  </div>
);

// ── SelectField ───────────────────────────────────────────────────────────────
export const SelectField = ({
  label, required, hint, error,
  options = [], placeholder = "Select…",
  className = "", ...props
}) => (
  <div className={className}>
    {label && <FieldLabel required={required} hint={hint}>{label}</FieldLabel>}
    <select
      className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-all focus:outline-none
        focus:ring-2 focus:ring-deep-ocean focus:border-transparent appearance-none bg-white
        ${error ? "border-red-400 bg-red-50" : "border-slate-300 text-slate-800"}`}
      {...props}
    >
      <option value="">{placeholder}</option>
      {options.map(o =>
        typeof o === "string"
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
      )}
    </select>
    {error && (
      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />{error}
      </p>
    )}
  </div>
);

// ── TextareaField ─────────────────────────────────────────────────────────────
export const TextareaField = ({
  label, required, hint, error,
  rows = 3, maxLength, className = "", ...props
}) => (
  <div className={className}>
    {label && <FieldLabel required={required} hint={hint}>{label}</FieldLabel>}
    <textarea
      rows={rows}
      maxLength={maxLength}
      className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-all focus:outline-none
        focus:ring-2 focus:ring-deep-ocean focus:border-transparent resize-y
        ${error ? "border-red-400 bg-red-50" : "border-slate-300 bg-white text-slate-800"}`}
      {...props}
    />
    {maxLength && props.value !== undefined && (
      <p className="mt-0.5 text-right text-xs text-slate-400">
        {(props.value || "").length}/{maxLength}
      </p>
    )}
    {error && (
      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />{error}
      </p>
    )}
  </div>
);

// ── CheckField ────────────────────────────────────────────────────────────────
export const CheckField = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
    <input
      type="checkbox"
      checked={!!checked}
      onChange={e => onChange(e.target.checked)}
      className="w-4 h-4 rounded border-slate-300 accent-deep-ocean"
    />
    <span className="text-slate-700">{label}</span>
  </label>
);

// ── SectionHeading ────────────────────────────────────────────────────────────
export const SectionHeading = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-start gap-3 mb-6 pb-4 border-b border-slate-200">
    <div className="p-2 rounded-lg bg-deep-ocean/10 shrink-0">
      <Icon className="h-5 w-5 text-deep-ocean" />
    </div>
    <div>
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

// ── Shared primitives ─────────────────────────────────────────────────────────
export const Overlay = ({ children, onClose }) => {
  // Close on Escape
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>
  );
};

export const ModalShell = ({ title, subtitle, icon: Icon, accentColor = "bg-deep-ocean", children, onClose, maxW = "max-w-lg" }) => (
  <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxW} max-h-[92vh] flex flex-col`}>
    {/* Header */}
    <div className={`${accentColor} px-6 py-4 rounded-t-2xl flex items-center justify-between gap-3`}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white/20">
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">{title}</h2>
          {subtitle && <p className="text-xs text-white/70 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors cursor-pointer"
        aria-label="Close modal"
      >
        <X className="h-4 w-4 text-white" />
      </button>
    </div>

    {/* Scrollable body */}
    <div className="overflow-y-auto flex-1">{children}</div>
  </div>
);

export const Input = ({ error, ...p }) => (
  <input
    className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2
      ${error ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-slate-300 bg-white focus:ring-deep-ocean/30 focus:border-deep-ocean"}`}
    {...p}
  />
);


export const SaveBtn = ({ saving, label = "Save", savedLabel = "Saved", icon: Icon = CheckCircle2 }) => (
  <button
    type="submit"
    disabled={saving}
    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white flex-1 justify-center transition-all cursor-pointer
      ${saving ? "bg-deep-ocean/60 cursor-not-allowed" : "bg-deep-ocean hover:bg-deep-ocean-900"}`}
  >
    {saving
      ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
      : <><Icon className="h-4 w-4" />{label}</>}
  </button>
);