import {
    createContext, useCallback, useContext, useEffect,
    useMemo, useRef, useState,
} from "react";

const ToastContext = createContext(null);

let _idCounter = 0;
const uid = () => `toast-${++_idCounter}-${Date.now()}`;

const getSoundSrc = (file) => {
    if (typeof window.__APP_PATH__ !== 'undefined') {
        return `file://${window.__APP_PATH__}/${file}`;
    }
    return `/sounds/${file}`;
};

const SOUND_MAP = {
    success:      "success.mp3",
    error:        "error.mp3",
    warning:      "warning.mp3",
    info:         "info.mp3",
    notification: "alert.mp3",
};

const LS_KEY = "cia.toast.sound_enabled";

const _readInitialSound = () => {
    try {
        const v = localStorage.getItem(LS_KEY);
        if (v === null) return true;
        return v !== "false";
    } catch {
        return true;
    }
};

const _writeSound = (enabled) => {
    try { localStorage.setItem(LS_KEY, enabled ? "true" : "false"); }
    catch { }
};

const playSound = (variant) => {
    const file = SOUND_MAP[variant];
    if (!file) return;

    const src = getSoundSrc(file);
    const audio = new Audio(src);
    audio.volume = 0.5;

    const promise = audio.play();
    if (promise !== undefined) {
        promise.catch((err) => {
            if (err.name === "NotAllowedError") {
                console.warn("[Toast sound] Blocked by browser");
            } else if (err.name === "NotSupportedError") {
                console.warn(`[Toast sound] File not supported: ${src}`);
            } else {
                console.warn("[Toast sound] Playback error:", err.name);
            }
        });
    }
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts]               = useState([]);
    const [soundEnabled, setSoundEnabled]   = useState(_readInitialSound);

    useEffect(() => { _writeSound(soundEnabled); }, [soundEnabled]);

    const soundRef = useRef(soundEnabled);
    useEffect(() => { soundRef.current = soundEnabled; }, [soundEnabled]);

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

        if (options.sound !== false && soundRef.current) {
            playSound(variant);
        }

        return id;
    }, []);

    const success      = useCallback((msg, opts) => show(msg, { ...opts, variant: "success" }), [show]);
    const error        = useCallback((msg, opts) => show(msg, { ...opts, variant: "error", duration: opts?.duration ?? 6000 }), [show]);
    const warning      = useCallback((msg, opts) => show(msg, { ...opts, variant: "warning" }), [show]);
    const info         = useCallback((msg, opts) => show(msg, { ...opts, variant: "info" }), [show]);
    const notification = useCallback((msg, opts) => show(msg, { ...opts, variant: "notification" }), [show]);

    const dismiss    = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);
    const dismissAll = useCallback(()   => setToasts([]), []);

    const value = useMemo(() => ({
        show, success, error, warning, info, notification,
        dismiss, dismissAll,
        toasts,
        soundEnabled,
        setSoundEnabled,
    }), [
        show, success, error, warning, info, notification,
        dismiss, dismissAll,
        toasts,
        soundEnabled,
    ]);

    return (
        <ToastContext.Provider value={value}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
    return ctx;
};
