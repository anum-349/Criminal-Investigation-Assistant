// src/context/RealtimeContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { connectRealtime } from "@/services/realtimeApi";

const RealtimeContext = createContext(null);

export const RealtimeProvider = ({ children }) => {
  const [status, setStatus] = useState("disconnected");
  const listenersRef = useRef(new Set());

  useEffect(() => {
    let rt;
    const timer = setTimeout(() => {
      rt = connectRealtime({
        onReady: () => {
          console.log("[realtime] ✅ ready");
          setStatus("connected");
        },
        onNotification: (data) => {
          console.log("[realtime] 🔔 notification, notifying", listenersRef.current.size, "listeners");
          listenersRef.current.forEach(fn => {
            try { fn(data); } catch (e) { console.error(e); }
          });
        },
      });
    }, 50);

    return () => {
      clearTimeout(timer);
      rt?.close();
      setStatus("disconnected");
    };
  }, []); // runs once for the entire app

  const subscribe = (fn) => {
    listenersRef.current.add(fn);
    return () => listenersRef.current.delete(fn); // returns unsubscribe
  };

  return (
    <RealtimeContext.Provider value={{ status, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtimeEvent = (onNotification) => {
  const ctx = useContext(RealtimeContext);
  const fnRef = useRef(onNotification);

  useEffect(() => { fnRef.current = onNotification; }, [onNotification]);

  useEffect(() => {
    if (!ctx) return;
    // Always calls the latest version via ref
    return ctx.subscribe((data) => fnRef.current?.(data));
  }, [ctx]);

  return { status: ctx?.status ?? "disconnected" };
};