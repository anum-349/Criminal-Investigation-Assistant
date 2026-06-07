import { Button } from "@/components/ui/Button";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  fetchNotifications, markRead, markAllRead,
  deleteNotification, fetchPreferences,
} from "@/services/notificationApi";
import { Search, Bell, ChevronDown, Check, Trash2, User } from "lucide-react";
import axios from "axios";
import { getAuthHeader } from "@/services/caseApi";
import { useToast } from "@/context/ToastContext";
import { useRealtimeEvent } from "@/context/RealtimeContext";

const getRoleFromToken = () => {
  const token = localStorage.getItem("cia_token") || sessionStorage.getItem("cia_token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role || null;
  } catch { return null; }
};

const investigatorNavItems = [
  { label: "File", items: [{ label: "New Case", path: "/register-case" }, { label: "Drafts", path: "/investigator/drafts" }] },
  { label: "Cases", items: [{ label: "All Cases", path: "/investigator/cases?tab=all" }, { label: "Active", path: "/investigator/cases?tab=Active" }, { label: "Closed", path: "/investigator/cases?tab=Closed" }] },
  { label: "Analytics", items: [{ label: "Dashboard", path: "/investigator" }, { label: "Generate Report", path: "/investigator/report" }, { label: "Trends", path: "/investigator/trends?tab=trends" }, { label: "Predictions", path: "/investigator/trends?tab=predictions" }] },
  { label: "Settings", items: [{ label: "Profile", path: "/investigator/profile" }, { label: "Help", path: "/investigator/help" }] },
];

const adminNavItems = [
  { label: "Dashboard", items: [{ label: "Admin Home", path: "/admin" }, { label: "Analytics", path: "/admin/analytics" }, { label: "Reports", path: "/admin/reports" }] },
  { label: "Users", items: [{ label: "All Users", path: "/admin/users" }, {label: "Tickets", path: "/admin/tickets"}] },
  { label: "Cases", items: [{ label: "All Cases", path: "/admin/cases" }] },
  { label: "Settings", items: [{ label: "Profile", path: "/admin/profile" }, { label: "System Logs", path: "/admin/audit-logs" }, { label: "Help", path: "/admin/help" }] },
]

const photoSrc = (rawUrl) => {
  if (!rawUrl) return "";
  if (rawUrl.startsWith("http")) return rawUrl;
  if (rawUrl.startsWith("/uploads")) return `${import.meta.env.VITE_API_URL}${rawUrl}`;
  return rawUrl;
};

const severityDot = (sev) => {
  if (!sev) return "bg-slate-300";
  const s = sev.toLowerCase();
  if (s === "critical") return "bg-red-500";
  if (s === "high") return "bg-orange-400";
  return "bg-blue-400";
};

const NotificationsDropdown = ({
  items, unreadCount, loading,
  onMarkRead, onMarkAllRead, onDelete,
}) => {
  const [tab, setTab] = useState("all");

  const visibleItems = tab === "unread"
    ? items.filter(n => !n.isRead)
    : items;

  return (
    <div className="fixed top-14 right-0 w-80 h-[calc(100vh-56px)] bg-white shadow-xl z-50 border-l border-slate-200 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
        <span className="font-semibold text-sm text-slate-800">Notifications</span>
        {unreadCount > 0 && (
          <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">
            {unreadCount} unread
          </span>
        )}
      </div>

      <div className="flex border-b border-slate-200 shrink-0">
        {[["all", "All"], ["unread", "Unread"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2.5 text-xs font-medium cursor-pointer transition-colors ${tab === id
              ? "border-b-2 border-[#1b3c53] text-[#1b3c53]"
              : "text-slate-500 hover:text-slate-700"
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "all" && unreadCount > 0 && (
          <div className="px-4 py-2 border-b border-slate-100 flex justify-end">
            <button
              onClick={onMarkAllRead}
              className="text-[11px] text-[#1b3c53] hover:underline cursor-pointer"
            >
              Mark all as read
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-32 text-xs text-slate-400">
            Loading…
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 space-y-2">
            <Bell className="h-8 w-8 opacity-25" />
            <p className="text-xs">
              {tab === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
          </div>
        ) : (
          visibleItems.map(n => (
            <div
              key={n.id}
              className={`group flex gap-3 px-4 py-3 border-b border-slate-100 transition-colors ${n.isRead
                ? "bg-white hover:bg-slate-50"
                : "bg-blue-50 border-l-[3px] border-l-[#1b3c53] hover:bg-blue-100"
                }`}
            >
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${severityDot(n.severity)}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs leading-snug ${n.isRead ? "font-normal text-slate-700" : "font-semibold text-slate-900"
                  }`}>
                  {n.title}
                </p>
                {n.message && (
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                    {n.message}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                  {new Date(n.createdAt).toLocaleString("en-GB", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {!n.isRead && (
                  <button
                    onClick={() => onMarkRead(n.id)}
                    title="Mark as read"
                    className="p-1 rounded hover:bg-slate-200 cursor-pointer"
                  >
                    <Check className="h-3 w-3 text-slate-500" />
                  </button>
                )}
                <button
                  onClick={() => onDelete(n.id)}
                  title="Delete"
                  className="p-1 rounded hover:bg-red-50 cursor-pointer"
                >
                  <Trash2 className="h-3 w-3 text-red-400" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const Header = () => {
  const [openMenu, setOpenMenu] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [prefs, setPrefs] = useState(null);

  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(true);

  const menuRef = useRef();
  const notificationPanelRef = useRef();
  const bellButtonRef = useRef();
  const prevUnreadIdsRef = useRef(new Set());
  const navigate = useNavigate();
  const toast = useToast();

  const toastRef = useRef(toast);
  const prefsRef = useRef(prefs);

  const role = getRoleFromToken();

  const isAdmin = role === "admin" || role === "superadmin";
  const activeNavItems = isAdmin ? adminNavItems : investigatorNavItems;
  const profilePath = isAdmin ? "/admin/profile" : "/investigator/profile";

  useEffect(() => { toastRef.current = toast; }, [toast]);
  useEffect(() => { prefsRef.current = prefs; }, [prefs]);

  useEffect(() => {
    fetchPreferences().then(setPrefs).catch(() => { });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const role = getRoleFromToken();
        const endpoint = (role === "admin" || role === "superadmin")
          ? "/api/auth/admin/profile"
          : "/api/auth/investigator/profile";

        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}${endpoint}`,
          { headers: getAuthHeader() },
        );
        setCurrentUser(res.data.user ?? res.data);
      } catch { /* ignore */ }
    })();
  }, []);

  const refreshNotifications = useCallback(async (silent = false) => {
    console.log("[Header] refreshNotifications called, silent=", silent);
    if (!silent) setNotifLoading(true);
    try {
      const data = await fetchNotifications({        // ← fetch first
        page: 1, page_size: 30, unread_only: false,
      });

      const newItems = data.items ?? [];
      const currentIds = new Set(prevUnreadIdsRef.current);
      const brandNew = newItems.filter(n => !n.isRead && !currentIds.has(n.id));

      console.log("[Header] 🔔 brand-new notifications:", brandNew.length); // ← now valid

      if (silent && brandNew.length > 0) {
        const livePrefs = prefsRef.current;
        const liveToast = toastRef.current;
        if (livePrefs === null || livePrefs?.email_notifications !== false) {
          brandNew.slice(0, 3).forEach(n => {
            liveToast.notification(n.message ?? n.title, {
              title: n.message ? n.title : undefined,
              severity: n.severity,
              duration: 5000,
            });
          });
        }
        brandNew.forEach(n => currentIds.add(n.id));
        prevUnreadIdsRef.current = currentIds;
      } else if (!silent) {
        prevUnreadIdsRef.current = new Set(
          newItems.filter(n => !n.isRead).map(n => n.id),
        );
      }

      setItems(newItems);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (err) {
      console.error("[Header] refreshNotifications failed:", err); // ← also make catch visible
    } finally {
      if (!silent) setNotifLoading(false);
    }
  }, []);

  const { status } = useRealtimeEvent(useCallback(() => {
    console.log("[Header] 🔄 WS triggered refetch");
    refreshNotifications(true);
  }, [refreshNotifications]));

  // Keep the initial fetch in its own effect
  useEffect(() => {
    refreshNotifications(false);
  }, [refreshNotifications]);

  // ── Outside-click handlers ─────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (!showNotifications) return;
    const h = (e) => {
      if (!notificationPanelRef.current?.contains(e.target) &&
        !bellButtonRef.current?.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    const t = setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", h);
    };
  }, [showNotifications]);

  // ── Notification actions (optimistic — no refetch needed) ──────────────
  const handleMarkRead = async (id) => {
    await markRead(id).catch(() => { });
    setItems(p => p.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllRead().catch(() => { });
    setItems(p => p.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleDelete = async (id) => {
    await deleteNotification(id).catch(() => { });
    const was = items.find(n => n.id === id && !n.isRead);
    setItems(p => p.filter(n => n.id !== id));
    if (was) setUnreadCount(c => Math.max(0, c - 1));
  };

  // ── Search ──────────────────────────────────────────────────────────────
  const handleSearch = () => {
    const q = keywords.trim();
    if (q) {
      navigate(`/search-case?q=${encodeURIComponent(q)}`);
      setKeywords("");
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <header className="fixed top-0 left-0 w-full h-14 z-40 bg-deep-ocean shadow shadow-black/80">
        <nav className="h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-1" ref={menuRef}>
            {activeNavItems.map((item) => (
              <div key={item.label} className="relative">
                <button
                  className={`cursor-pointer text-sm font-medium hover:bg-gray-400 hover:text-deep-ocean-500
                    ${openMenu === item.label ? "bg-cool-silver text-gray-700" : "text-white"}
                    rounded-md px-3 py-2 flex items-center`}
                  onClick={() => setOpenMenu(openMenu === item.label ? null : item.label)}
                >
                  {item.label}
                  <ChevronDown className={`ml-1 h-3 w-3 transition-transform ${openMenu === item.label ? "rotate-180" : ""
                    }`} />
                </button>
                {openMenu === item.label && (
                  <div className="absolute left-0 w-48 text-nowrap bg-cool-silver rounded-md border-deep-ocean border shadow-lg z-20">
                    {item.items.map(sub => (
                      <button
                        key={sub.label}
                        onClick={() => { navigate(sub.path); setOpenMenu(null); }}
                        className="cursor-pointer block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
              <input
                type="text"
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="search case, evidence, suspect"
                className="pl-9 w-md h-9 border-white text-white px-4 py-2 border focus:outline-none placeholder:text-gray-300 focus:border-white rounded-full"
              />
            </div>

            <Button
              ref={bellButtonRef}
              variant="ghost"
              size="icon"
              onClick={() => setShowNotifications(v => !v)}
              className={`${showNotifications ? "bg-slate-blue" : ""
                } hover:bg-slate-blue cursor-pointer relative border-0 p-2 rounded-full transition`}
            >
              <Bell className="h-7 w-7 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Button>

            <button
              onClick={() => navigate(profilePath)}
              className="cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-white/50 hover:scale-105 transition-transform shrink-0"
            >
              {currentUser?.picture_url ? (
                <img
                  src={photoSrc(currentUser.picture_url)}
                  alt={currentUser.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-white text-xs font-bold select-none">
                  {currentUser?.name
                    ? currentUser.name.slice(0, 2).toUpperCase()
                    : <User className="h-4 w-4" />}
                </div>
              )}
            </button>
          </div>
        </nav>
      </header>

      {showNotifications && (
        <div ref={notificationPanelRef}>
          <NotificationsDropdown
            items={items}
            unreadCount={unreadCount}
            loading={notifLoading}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onDelete={handleDelete}
          />
        </div>
      )}
    </>
  );
};

export default Header;