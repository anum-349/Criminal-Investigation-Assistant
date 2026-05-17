// src/hooks/useRealtime.js

import { useEffect, useRef, useState } from "react";
import { connectRealtime } from "../services/realtimeApi";
import { useToast } from "../context/ToastContext";

export const useRealtime = ({ onNotification } = {}) => {
    const toast = useToast();
    const realtimeRef = useRef(null);
    const [status, setStatus] = useState("disconnected");
    const onNotificationRef = useRef(onNotification);

    // Keep ref current without re-subscribing the effect
    useEffect(() => { onNotificationRef.current = onNotification; }, [onNotification]);

    useEffect(() => {
        let rt;

        // Small delay defeats Strict Mode's unmount/remount — the cleanup
        // fires before the timer, so the real mount wins cleanly.
        const timer = setTimeout(() => {
            rt = connectRealtime({
                onReady: () => {
                    console.log("[useRealtime] ✅ ready");
                    setStatus("connected");
                },
                onNotification: (data) => {
                    console.log("[useRealtime] 🔔 notification:", data);
                    onNotificationRef.current?.(data);

                    // Toast for special types
                    if (data.type === "suspect_detected") {
                        toast.warning(`Suspect Match Found: ${data.name}`, { duration: 8000 });
                    } else if (data.type === "crime_hotspot") {
                        toast.error(`High Crime Activity Detected in ${data.area}`, { duration: 7000 });
                    }
                }
            })

        }, 50)


        return () => {
            clearTimeout(timer);
            rt?.close();
            setStatus("disconnected");
        };
    }, []); // toast intentionally excluded — reads via ref

    return { status };
};