import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

let _idCounter = 0;
const uid = () => `toast-${++_idCounter}-${Date.now()}`;

const SOUND_MAP = {
  success:      "/sounds/success.mp3",
  error:        "/sounds/error.mp3",
  warning:      "/sounds/warning.mp3",
  info:         "/sounds/info.mp3",
  notification: "/sounds/alert.mp3",
};

// Create and play fresh each time — no preload, no cache issues
const playSound = (variant) => {
  const src = SOUND_MAP[variant];
  if (!src) return;

  const audio = new Audio(src);
  audio.volume = 0.5;

  const promise = audio.play();

  if (promise !== undefined) {
    promise.catch((err) => {
      if (err.name === "NotAllowedError") {
        console.warn("[Toast sound] Blocked by browser — needs a user gesture first (click/keypress).");
      } else if (err.name === "NotSupportedError") {
        console.warn(`[Toast sound] File not supported or missing: ${src}`);
      } else {
        console.warn("[Toast sound] Playback error:", err.name, err.message);
      }
    });
  }
};

export const ToastProvider = ({ children, soundEnabled = true }) => {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, options = {}) => {
    const id = uid();
    const variant = options.variant ?? "info";

    setToasts(prev => [...prev, {
      id,
      message,
      variant,
      title:     options.title,
      duration:  options.duration ?? 4000,
      severity:  options.severity,
      createdAt: Date.now(),
    }]);

    if (soundEnabled && options.sound !== false) {
      playSound(variant);
    }

    return id;
  }, [soundEnabled]);

  const success      = useCallback((msg, opts) => show(msg, { ...opts, variant: "success" }), [show]);
  const error        = useCallback((msg, opts) => show(msg, { ...opts, variant: "error", duration: opts?.duration ?? 6000 }), [show]);
  const warning      = useCallback((msg, opts) => show(msg, { ...opts, variant: "warning" }), [show]);
  const info         = useCallback((msg, opts) => show(msg, { ...opts, variant: "info" }), [show]);
  const notification = useCallback((msg, opts) => show(msg, { ...opts, variant: "notification" }), [show]);

  const dismiss    = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  const dismissAll = useCallback(() => setToasts([]), []);

  return (
    <ToastContext.Provider value={{ show, success, error, warning, info, notification, dismiss, dismissAll, toasts }}>
      {children}
    </ToastContext.Provider>
  );
};

/**
 * useToast — use anywhere inside <ToastProvider>
 *
 * toast.success("Saved!")
 * toast.error("Failed.")
 * toast.warning("Watch out.")
 * toast.info("FYI.")
 * toast.notification("New alert", { severity: "critical" })
 * toast.success("Silent", { sound: false })
 */
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
};