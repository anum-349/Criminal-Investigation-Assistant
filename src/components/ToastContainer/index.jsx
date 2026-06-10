import { useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, Bell, X } from "lucide-react";
import { useToast } from "@/context/ToastContext";

const DEFAULT_DURATION = 4000;

const VARIANTS = {
  success: {
    icon: CheckCircle2,
    bar:        "bg-emerald-500",
    iconColor:  "text-emerald-500",
    border:     "border-emerald-200",
    bg:         "bg-white",
    titleColor: "text-emerald-700",
  },
  error: {
    icon: XCircle,
    bar:        "bg-red-500",
    iconColor:  "text-red-500",
    border:     "border-red-200",
    bg:         "bg-white",
    titleColor: "text-red-700",
  },
  warning: {
    icon: AlertTriangle,
    bar:        "bg-amber-400",
    iconColor:  "text-amber-500",
    border:     "border-amber-200",
    bg:         "bg-white",
    titleColor: "text-amber-700",
  },
  info: {
    icon: Info,
    bar:        "bg-sky-500",
    iconColor:  "text-sky-500",
    border:     "border-sky-200",
    bg:         "bg-white",
    titleColor: "text-sky-700",
  },
  notification: {
    icon: Bell,
    bar:        "bg-[#1b3c53]",
    iconColor:  "text-[#1b3c53]",
    border:     "border-slate-200",
    bg:         "bg-white",
    titleColor: "text-slate-800",
  },
};

const SEVERITY_BAR = {
  critical: "bg-red-500",
  high:     "bg-orange-400",
};

const SEVERITY_DOT = {
  critical: "bg-red-500",
  high:     "bg-orange-400",
  default:  "bg-blue-400",
};

const ToastItem = ({ toast, onDismiss }) => {
  const [mounted, setMounted]   = useState(false);
  const [leaving, setLeaving]   = useState(false);
  const [paused,  setPaused]    = useState(false);
  const timerRef                = useRef(null);
  const duration                = toast.duration ?? DEFAULT_DURATION;
  const sticky                  = duration === 0;

  const cfg = VARIANTS[toast.variant] ?? VARIANTS.info;

  const sevKey  = toast.severity?.toLowerCase();
  const barClass = toast.variant === "notification" && SEVERITY_BAR[sevKey]
    ? SEVERITY_BAR[sevKey]
    : cfg.bar;
  const dotClass = toast.variant === "notification"
    ? (SEVERITY_DOT[sevKey] ?? SEVERITY_DOT.default)
    : null;

  const Icon = cfg.icon;

  const startTimer = () => {
    if (sticky) return;
    timerRef.current = setTimeout(() => triggerLeave(), duration);
  };
  const clearTimer = () => clearTimeout(timerRef.current);

  const triggerLeave = () => {
    clearTimer();
    setLeaving(true);
    setTimeout(() => onDismiss(toast.id), 320);
  };

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    startTimer();
    return clearTimer;
  }, []);

  const handleMouseEnter = () => { setPaused(true);  clearTimer(); };
  const handleMouseLeave = () => { setPaused(false); startTimer(); };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: mounted && !leaving ? "translateY(0) scale(1)" : "translateY(20px) scale(0.97)",
        opacity:   mounted && !leaving ? 1 : 0,
        transition: leaving
          ? "transform 0.3s ease-in, opacity 0.28s ease-in"
          : "transform 0.38s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease",
      }}
      className={`relative w-85 max-w-[90vw] rounded-xl shadow-xl border ${cfg.border} ${cfg.bg} overflow-hidden`}
    >
      {!sticky && (
        <div className="absolute bottom-0 left-0 right-0 h-0.75 bg-black/5 rounded-b-xl overflow-hidden">
          <div
            className={`h-full ${barClass} rounded-b-xl origin-left`}
            style={{
              animation: paused
                ? "none"
                : `toast-shrink ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}

      <div className="flex items-start gap-3 px-4 py-3 pb-4">
        {dotClass ? (
          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${dotClass}`} />
        ) : (
          <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${cfg.iconColor}`} />
        )}

        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className={`text-sm font-semibold leading-tight ${cfg.titleColor}`}>
              {toast.title}
            </p>
          )}
          <p className={`text-sm leading-snug ${toast.title ? "text-slate-600 mt-0.5" : "text-slate-800 font-medium"}`}>
            {toast.message}
          </p>
        </div>

        <button
          onClick={() => triggerLeave()}
          className="shrink-0 ml-1 p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export const ToastContainer = () => {
  const { toasts, dismiss } = useToast();

  return (
    <>
      <style>{`
        @keyframes toast-shrink {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>

      <div
        aria-live="polite"
        aria-label="Notifications"
        className="fixed bottom-5 right-5 z-9999 flex flex-col-reverse gap-2 items-end pointer-events-none"
      >
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </>
  );
};
