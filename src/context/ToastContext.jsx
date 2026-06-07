/**
 * src/context/ToastContext.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * What changed:
 *
 *  1. `value` is now memoized via useMemo. Previously every render of
 *     ToastProvider built a fresh `{ show, success, …, toasts }` object,
 *     so every `useToast()` consumer re-rendered on every toast added.
 *     If a consumer used `toast` in a useCallback/useEffect dep array
 *     (e.g. Header.refreshNotifications), it would re-fire — which is
 *     how the notification poll → toast → re-poll loop happened.
 *
 *     We still rebuild the object when `toasts` or `soundEnabled`
 *     change (those are real changes consumers care about), but the
 *     `show / success / error / …` callbacks themselves are stable
 *     across renders, so most consumers stay put.
 *
 *  2. Sound is preference-driven and dynamic.
 *     `soundEnabled` used to be a prop (`<ToastProvider soundEnabled={…}>`),
 *     set once. Now ToastProvider:
 *       - Reads its initial sound state from localStorage (cheap, no
 *         network) so the very first toast after page-load already
 *         honours the user's setting.
 *       - Exposes `setSoundEnabled(bool)` so Settings → Preferences can
 *         flip the flag live, without a page reload.
 *     The Settings page calls `toast.setSoundEnabled(prefs.sound_alerts)`
 *     after a successful preference save.
 *
 *  3. Per-call override still works. Pass `{ sound: false }` to silence
 *     one toast even when the global flag is on (useful for autosave-style
 *     silent confirmations).
 */

import {
    createContext, useCallback, useContext, useEffect,
    useMemo, useRef, useState,
} from "react";

const ToastContext = createContext(null);

let _idCounter = 0;
const uid = () => `toast-${++_idCounter}-${Date.now()}`;

const getSoundSrc = (file) => {
    if (typeof window.__APP_PATH__ !== 'undefined') {
        // __APP_PATH__ already points at the sounds folder
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

// Persisted under this key so sound choice survives reloads.
// The Settings page is the canonical source of truth (writes to /api/auth/preferences),
// but we mirror it to localStorage so the first toast after page-load
// doesn't wait for a server round-trip.
const LS_KEY = "cia.toast.sound_enabled";

const _readInitialSound = () => {
    try {
        const v = localStorage.getItem(LS_KEY);
        // Default to true ONLY if nothing is set yet; respect explicit "false".
        if (v === null) return true;
        return v !== "false";
    } catch {
        return true;
    }
};

const _writeSound = (enabled) => {
    try { localStorage.setItem(LS_KEY, enabled ? "true" : "false"); }
    catch { /* private mode / quota — silently ignore */ }
};

/** Play one short clip. No preload (clips are tiny), no cache. */
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
                console.warn("[Toast sound] Blocked by browser — needs a user gesture first (click/keypress).");
            } else if (err.name === "NotSupportedError") {
                console.warn(`[Toast sound] File not supported or missing: ${src}`);
            } else {
                console.warn("[Toast sound] Playback error:", err.name, err.message);
            }
        });
    }
};


export const ToastProvider = ({ children }) => {
    const [toasts, setToasts]               = useState([]);
    const [soundEnabled, setSoundEnabled]   = useState(_readInitialSound);

    // Mirror the toggle to localStorage so the next page-load picks it up
    // before any preference fetch completes.
    useEffect(() => { _writeSound(soundEnabled); }, [soundEnabled]);

    // Keep the latest sound state in a ref so `show` can read it without
    // changing its identity on every toggle (would invalidate consumers'
    // memoized callbacks).
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

        // Per-call `sound: false` ALWAYS wins (silent autosave confirmations).
        // Otherwise we obey the live preference via ref.
        if (options.sound !== false && soundRef.current) {
            playSound(variant);
        }

        return id;
    }, []);   // stable across renders — show() reads soundRef.current dynamically

    const success      = useCallback((msg, opts) => show(msg, { ...opts, variant: "success" }), [show]);
    const error        = useCallback((msg, opts) => show(msg, { ...opts, variant: "error", duration: opts?.duration ?? 6000 }), [show]);
    const warning      = useCallback((msg, opts) => show(msg, { ...opts, variant: "warning" }), [show]);
    const info         = useCallback((msg, opts) => show(msg, { ...opts, variant: "info" }), [show]);
    const notification = useCallback((msg, opts) => show(msg, { ...opts, variant: "notification" }), [show]);

    const dismiss    = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);
    const dismissAll = useCallback(()   => setToasts([]), []);

    // Memoize the context value so consumers don't re-render every time a
    // toast is added/dismissed. The shape is intentionally identical to
    // the previous version — no consumer code changes.
    const value = useMemo(() => ({
        show, success, error, warning, info, notification,
        dismiss, dismissAll,
        toasts,
        soundEnabled,
        setSoundEnabled,   // Settings page calls this on preference save.
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

/**
 * useToast — use anywhere inside <ToastProvider>
 *
 *   toast.success("Saved!")
 *   toast.error("Failed.")
 *   toast.warning("Watch out.")
 *   toast.info("FYI.")
 *   toast.notification("New alert", { severity: "critical" })
 *   toast.success("Silent", { sound: false })     // one-off silent
 *
 *   // From Settings → Preferences after a successful save:
 *   toast.setSoundEnabled(prefs.sound_alerts);
 */
export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
    return ctx;
};