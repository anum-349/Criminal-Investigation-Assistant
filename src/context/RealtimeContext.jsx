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
          setStatus("connected");
        },
        onNotification: (data) => {
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
  }, []);

  const subscribe = (fn) => {
    listenersRef.current.add(fn);
    return () => listenersRef.current.delete(fn);
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
    return ctx.subscribe((data) => fnRef.current?.(data));
  }, [ctx]);

  return { status: ctx?.status ?? "disconnected" };
};
