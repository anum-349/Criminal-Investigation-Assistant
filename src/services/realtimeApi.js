const getRawToken = () => {
  for (const store of [localStorage, sessionStorage]) {
    for (let i = 0; i < store.length; i++) {
      const v = store.getItem(store.key(i));
      if (v && v.startsWith("eyJ") && v.split(".").length === 3) {
        return v;
      }
    }
  }
  return "";
};

const wsBaseFromHttp = (httpBase) => {
  if (!httpBase) return "";
  return httpBase.replace(/^http/i, "ws");
};

const BACKOFF_INITIAL_MS = 500;
const BACKOFF_MAX_MS = 30_000;
const BACKOFF_FACTOR = 2;
const JITTER = 0.2;

const TERMINAL_CLOSE_CODES = new Set([4401, 4403, 4404]);

export const connectRealtime = ({ onNotification, onReady } = {}) => {
  let ws = null;
  let stopped = false;
  let reconnectTimer = null;
  let backoff = BACKOFF_INITIAL_MS;

  const httpBase = import.meta.env.VITE_API_URL;
  const wsBase = wsBaseFromHttp(httpBase);

  const scheduleReconnect = () => {
    if (stopped) return;
    const jittered = backoff * (1 + (Math.random() * 2 - 1) * JITTER);
    reconnectTimer = setTimeout(() => connect(), jittered);
    backoff = Math.min(backoff * BACKOFF_FACTOR, BACKOFF_MAX_MS);
  };

  const connect = () => {
    if (stopped) return;
    const token = getRawToken();
    if (!token) {
      console.warn("[realtime] no JWT in storage — not connecting");
      return;
    }

    const url = `${wsBase}/api/notifications/ws?token=${encodeURIComponent(token)}`;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      console.error("[realtime] WebSocket constructor threw:", err);
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      if (stopped) {
        ws.close();
        return;
      }
      backoff = BACKOFF_INITIAL_MS;
    };

    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      const t = msg?.type;

      if (t === "ping") {
        try { ws.send(JSON.stringify({ type: "pong" })); } catch { }
        return;
      }

      if (t === "ready") {
        if (typeof onReady === "function") {
          try { onReady(msg); } catch (e) { console.error("[realtime] onReady threw:", e); }
        }
        return;
      }

      if (t === "notification") {
        if (typeof onNotification === "function") {
          try { onNotification(msg); } catch (e) { console.error("[realtime] onNotification threw:", e); }
        }
        return;
      }
    };

    ws.onerror = (e) => {
      console.debug("[realtime] ws error:", e);
    };

    ws.onclose = (e) => {
      ws = null;
      if (TERMINAL_CLOSE_CODES.has(e.code)) {
        console.warn("[realtime] auth-related close code", e.code);
        stopped = true;
        return;
      }
      if (!stopped) scheduleReconnect();
    };
  };

  connect();

  return {
    close: () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try { ws && ws.close(); } catch { }
      ws = null;
    },
  };
};
