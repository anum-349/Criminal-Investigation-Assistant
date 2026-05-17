// src/services/realtimeApi.js
// ─────────────────────────────────────────────────────────────────────────────
// Real-time client for the notifications WebSocket.
//
// PUBLIC API
// ──────────
//   connectRealtime({ onNotification, onReady }) → { close }
//
//   - onNotification:  called every time the server pushes an event whose
//                      `type` is anything other than "ping" / "ready".
//                      The payload includes `type`, `title`, `severity`.
//                      Treat it as a hint to refetch — we don't try to
//                      render the row directly from the socket frame
//                      because the canonical store is the REST endpoint.
//   - onReady:         called once on successful handshake.
//
//   Returns an object with `close()` that tears down the connection.
//   Callers should invoke it from a useEffect cleanup.
//
// WHY A SEPARATE FILE
// ───────────────────
// `Header.jsx` doesn't care about reconnection math, exponential backoff,
// or message parsing — it just wants "tell me when a notification fires."
// Pulling all that out keeps Header.jsx focused on rendering.
//
// RECONNECT STRATEGY
// ──────────────────
// Browsers do NOT auto-reconnect WebSockets (unlike EventSource). We
// implement it ourselves: exponential backoff capped at 30s, with a
// small ±20% jitter so a reconnect storm after a server restart doesn't
// hammer the backend in lockstep.
// ─────────────────────────────────────────────────────────────────────────────

// Same token-finder pattern as Header.jsx used for the SSE token. Kept
// inline so this module has no internal deps.
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

// Convert http(s) base URL to ws(s) for the WS endpoint. Handles both
// dev (http://localhost:8000) and prod (https://…) uniformly.
const wsBaseFromHttp = (httpBase) => {
  if (!httpBase) return "";
  return httpBase.replace(/^http/i, "ws");
};

// Backoff params — start fast, cap at 30s.
const BACKOFF_INITIAL_MS = 500;
const BACKOFF_MAX_MS = 30_000;
const BACKOFF_FACTOR = 2;
const JITTER = 0.2; // ±20%

// Close codes the backend uses for auth failures. If we get any of these,
// don't bother reconnecting — the user has to log in again.
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
    // Jitter: backoff * (1 ± JITTER)
    const jittered = backoff * (1 + (Math.random() * 2 - 1) * JITTER);
    reconnectTimer = setTimeout(() => connect(), jittered);
    backoff = Math.min(backoff * BACKOFF_FACTOR, BACKOFF_MAX_MS);
  };

  const connect = () => {
    if (stopped) return;
    const token = getRawToken();
    if (!token) {
      // No token — nothing we can do until the user logs in. Bail
      // permanently; whoever calls connectRealtime again after login
      // will start fresh.
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
      // Connection up — reset backoff so the NEXT disconnect retries fast.
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
        // Server liveness probe — reply with pong. Not required by the
        // backend but cheap and helps NAT keepalive.
        try { ws.send(JSON.stringify({ type: "pong" })); } catch {}
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
      // Unknown message type — ignore.
    };

    ws.onerror = (e) => {
      // Don't act on this directly — onclose always follows and that's
      // where we handle reconnection. We just log so the network tab
      // isn't the only signal during dev.
      console.debug("[realtime] ws error:", e);
    };

    ws.onclose = (e) => {
      ws = null;
      if (TERMINAL_CLOSE_CODES.has(e.code)) {
        console.warn("[realtime] auth-related close code", e.code, "— stopping reconnects");
        stopped = true;
        return;
      }
      if (!stopped) scheduleReconnect();
    };
  };

  // Kick off the first connection synchronously so the caller sees a
  // working channel immediately on a logged-in page load.
  connect();

  return {
    close: () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try { ws && ws.close(); } catch {}
      ws = null;
    },
  };
};