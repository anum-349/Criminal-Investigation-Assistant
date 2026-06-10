/**
 * Admin Database Management Page
 * Route: /admin/database
 *
 * Features:
 *  - Live DB stats from backend
 *  - Backup (trigger + download), Restore (file upload), Optimize
 *  - Backup history table with download links
 *  - Destructive-action confirm modal with typed confirmation
 *  - Full loading / error / success feedback states
 *
 * Backend endpoints used (all in adminApi.js):
 *   GET  /api/admin/database/stats
 *   POST /api/admin/database/backup
 *   POST /api/admin/database/restore   (multipart/form-data)
 *   POST /api/admin/database/optimize
 *   GET  /api/admin/database/backups
 *   GET  /api/admin/database/backups/:id/download  (streaming)
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Database, Download, Upload, Zap, RefreshCw,
  CheckCircle2, Loader2, AlertTriangle, X,
  LayoutDashboard, ChevronRight, HardDrive,
  FileText, Shield, Clock, Activity,
  AlertCircle, Server, RotateCcw, Info,
  CloudDownload, FolderOpen, Trash2,
} from "lucide-react";
import Header from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  getDatabaseStats,
  triggerBackup,
  restoreDatabase,
  optimizeDatabase,
  listBackups,
  downloadBackup,
  formatApiError,
} from "@/services/adminApi";

// ── tiny helpers ──────────────────────────────────────────────────────────────
const fmt = (n) => (n ?? "—");

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, bg, sub }) {
  return (
    <Card className="p-4 flex items-center gap-3.5">
      <div className={`p-2.5 rounded-xl ${bg} shrink-0`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">{label}</p>
        <p className={`text-sm font-bold ${color} truncate`}>{value}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </Card>
  );
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ config, onClose, onConfirm, loading }) {
  const [typed, setTyped] = useState("");
  const needsConfirmWord = config.confirmWord;
  const canProceed = !needsConfirmWord || typed === config.confirmWord;

  useEffect(() => setTyped(""), [config]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header stripe */}
        <div className={`h-1.5 w-full ${config.danger ? "bg-red-500" : "bg-amber-400"}`} />

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${config.danger ? "bg-red-100" : "bg-amber-100"}`}>
              <AlertTriangle className={`h-5 w-5 ${config.danger ? "text-red-600" : "text-amber-600"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-800">{config.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{config.subtitle}</p>
            </div>
            <button onClick={onClose} disabled={loading}
              className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer shrink-0 disabled:opacity-40">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3.5 border border-slate-200 leading-relaxed">
            {config.message}
          </p>

          {needsConfirmWord && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600">
                Type <span className="font-mono font-bold text-red-600">{config.confirmWord}</span> to proceed:
              </p>
              <input
                autoFocus
                value={typed}
                onChange={e => setTyped(e.target.value)}
                onKeyDown={e => e.key === "Enter" && canProceed && !loading && onConfirm()}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
                placeholder={config.confirmWord}
              />
            </div>
          )}

          <div className="flex gap-2.5 pt-1">
            <button onClick={onClose} disabled={loading}
              className="flex-1 border border-slate-300 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!canProceed || loading}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 cursor-pointer transition-all
                ${config.danger
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-amber-500 hover:bg-amber-600"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" />Working…</>
                : <><CheckCircle2 className="h-4 w-4" />{config.actionLabel}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white
            ${t.type === "success" ? "bg-emerald-600" : t.type === "error" ? "bg-red-600" : "bg-deep-ocean"}
            animate-in slide-in-from-right-4 fade-in duration-300`}>
          {t.type === "success"
            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
            : t.type === "error"
            ? <AlertCircle className="h-4 w-4 shrink-0" />
            : <Info className="h-4 w-4 shrink-0" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ── Action Card ───────────────────────────────────────────────────────────────
function ActionCard({ action, onTrigger, running, succeeded }) {
  const Icon = action.icon;
  const isRunning = running === action.id;
  const isDone = succeeded === action.id;

  return (
    <div className={`rounded-2xl border-2 p-5 space-y-4 transition-all duration-200
      ${isDone
        ? "border-emerald-200 bg-emerald-50"
        : isRunning
        ? "border-deep-ocean/20 bg-deep-ocean/5"
        : action.borderColor + " " + action.bgColor
      }`}>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl bg-white border shadow-sm shrink-0 ${action.iconBorder}`}>
          {isDone
            ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            : isRunning
            ? <Loader2 className="h-5 w-5 text-deep-ocean animate-spin" />
            : <Icon className={`h-5 w-5 ${action.iconColor}`} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-800">{action.label}</p>
            {action.badge && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${action.badge}`}>
                {action.badgeText}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{action.description}</p>
        </div>
      </div>

      {/* Progress bar when running */}
      {isRunning && (
        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-deep-ocean rounded-full animate-pulse" style={{ width: "60%" }} />
        </div>
      )}

      {/* Extra info row */}
      {action.infoItems && !isRunning && !isDone && (
        <div className="flex flex-wrap gap-2">
          {action.infoItems.map(item => (
            <span key={item} className="text-[10px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-lg">
              {item}
            </span>
          ))}
        </div>
      )}

      {/* Button */}
      <button
        onClick={() => onTrigger(action)}
        disabled={!!running}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2
          cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-50
          ${isDone
            ? "bg-emerald-600 text-white"
            : isRunning
            ? "bg-deep-ocean/80 text-white"
            : action.btnColor + " text-white hover:opacity-90 active:scale-[0.98]"
          }`}
      >
        {isDone ? (
          <><CheckCircle2 className="h-4 w-4" /> Completed</>
        ) : isRunning ? (
          <><Loader2 className="h-4 w-4 animate-spin" />{action.runningLabel || "Running…"}</>
        ) : (
          <><Icon className="h-4 w-4" />{action.buttonLabel}</>
        )}
      </button>
    </div>
  );
}

// ── Restore Upload Zone ───────────────────────────────────────────────────────
function RestoreZone({ onRestore, running }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".sql") || f.name.endsWith(".bak") || f.name.endsWith(".gz") || f.name.endsWith(".zip"))) {
      setFile(f);
    }
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) setFile(f);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-white border border-emerald-200 shadow-sm shrink-0">
          <Upload className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-800">Restore from Backup</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">DANGER</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
            Upload a backup file to restore the database. Current data will be overwritten.
          </p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all
          ${dragging
            ? "border-emerald-400 bg-emerald-100"
            : file
            ? "border-emerald-400 bg-emerald-100"
            : "border-slate-300 bg-white hover:border-emerald-300 hover:bg-emerald-50"
          }`}
      >
        <input ref={inputRef} type="file" accept=".sql,.bak,.gz,.zip" onChange={handleFile} className="hidden" />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-800 truncate max-w-48">{file.name}</p>
              <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setFile(null); }}
              className="ml-auto p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <FolderOpen className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-medium text-slate-600">Drop backup file here</p>
            <p className="text-xs text-slate-400">.sql · .bak · .gz · .zip</p>
          </div>
        )}
      </div>

      <button
        onClick={() => file && onRestore(file)}
        disabled={!file || !!running}
        className="w-full py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white
          flex items-center justify-center gap-2 cursor-pointer transition-all
          disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        {running === "restore"
          ? <><Loader2 className="h-4 w-4 animate-spin" />Restoring…</>
          : <><RotateCcw className="h-4 w-4" />Restore Database</>}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export function ManageDatabasePage() {
  const navigate = useNavigate();

  // ── state ──────────────────────────────────────────────────────────────────
  const [stats,      setStats]      = useState(null);
  const [backups,    setBackups]    = useState([]);
  const [statsLoading,  setStatsLoading]  = useState(true);
  const [backupsLoading, setBackupsLoading] = useState(true);
  const [statsError,    setStatsError]    = useState(null);

  const [running,   setRunning]   = useState(null);   // "backup" | "restore" | "optimize"
  const [succeeded, setSucceeded] = useState(null);
  const [confirmCfg, setConfirmCfg] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [toasts, setToasts] = useState([]);

  // ── toast helper ───────────────────────────────────────────────────────────
  const toast = (message, type = "success") => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  };

  // ── fetch stats ────────────────────────────────────────────────────────────
  const loadStats = async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const data = await getDatabaseStats();
      setStats(data);
    } catch (err) {
      setStatsError(formatApiError(err, "Could not load database stats."));
    } finally {
      setStatsLoading(false);
    }
  };

  // ── fetch backup history ───────────────────────────────────────────────────
  const loadBackups = async () => {
    setBackupsLoading(true);
    try {
      const data = await listBackups();
      setBackups(data.items ?? data ?? []);
    } catch {
      // non-critical — just show empty
    } finally {
      setBackupsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadBackups();
  }, []);

  // ── action runner ──────────────────────────────────────────────────────────
  const runAction = async (id, apiFn, successMsg) => {
    setRunning(id);
    try {
      await apiFn();
      setSucceeded(id);
      toast(successMsg, "success");
      setTimeout(() => setSucceeded(null), 3000);
      if (id === "backup") loadBackups();
      if (id === "optimize") loadStats();
    } catch (err) {
      toast(formatApiError(err, `${id} failed.`), "error");
    } finally {
      setRunning(null);
    }
  };

  // ── handle action button click ─────────────────────────────────────────────
  const handleAction = (action) => {
    if (action.confirm) {
      setConfirmCfg({
        id: action.id,
        title: action.confirmTitle,
        subtitle: "Admin action · Irreversible",
        message: action.confirmMessage,
        confirmWord: action.danger ? "CONFIRM" : null,
        danger: action.danger,
        actionLabel: action.buttonLabel,
        apiFn: action.apiFn,
        successMsg: action.successMsg,
      });
    } else {
      runAction(action.id, action.apiFn, action.successMsg);
    }
  };

  // ── restore ────────────────────────────────────────────────────────────────
  const handleRestore = (file) => {
    setConfirmCfg({
      id: "restore",
      title: "Restore Database",
      subtitle: "Admin action · Irreversible",
      message: `You are about to restore the database from "${file.name}". All current data will be replaced with the backup. This cannot be undone.`,
      confirmWord: "RESTORE",
      danger: true,
      actionLabel: "Restore Now",
      apiFn: () => restoreDatabase(file),
      successMsg: "Database restored successfully.",
    });
  };

  // ── confirm modal submit ───────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!confirmCfg) return;
    setConfirmLoading(true);
    try {
      await runAction(confirmCfg.id, confirmCfg.apiFn, confirmCfg.successMsg);
    } finally {
      setConfirmLoading(false);
      setConfirmCfg(null);
    }
  };

  // ── download backup ────────────────────────────────────────────────────────
  const handleDownload = async (backup) => {
    try {
      toast("Preparing download…", "info");
      const blob = await downloadBackup(backup.id);
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), {
        href: url,
        download: `backup-${backup.id}.sql`,
      }).click();
      URL.revokeObjectURL(url);
      toast("Download started.", "success");
    } catch (err) {
      toast(formatApiError(err, "Download failed."), "error");
    }
  };

  // ── action definitions ─────────────────────────────────────────────────────
  const ACTIONS = [
    {
      id: "backup",
      label: "Backup Database",
      icon: CloudDownload,
      iconColor: "text-blue-600",
      iconBorder: "border-blue-100",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      btnColor: "bg-blue-600",
      description: "Create a full encrypted snapshot of all cases, evidence metadata, users, and audit logs.",
      buttonLabel: "Create Backup",
      runningLabel: "Creating backup…",
      infoItems: ["Encrypted at rest", "Auto-compressed", "~2–5 min"],
      confirm: false,
      apiFn: triggerBackup,
      successMsg: "Backup created successfully.",
    },
    {
      id: "optimize",
      label: "Optimize Database",
      icon: Zap,
      iconColor: "text-amber-600",
      iconBorder: "border-amber-100",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      btnColor: "bg-amber-500",
      description: "Run ANALYZE + VACUUM to improve query speed, rebuild statistics, and reclaim unused space.",
      buttonLabel: "Optimize Now",
      runningLabel: "Optimizing…",
      infoItems: ["VACUUM + ANALYZE", "Safe to run live", "~1–3 min"],
      confirm: false,
      apiFn: optimizeDatabase,
      successMsg: "Database optimized successfully.",
    },
  ];

  // ── derived stats display ──────────────────────────────────────────────────
  const STAT_CARDS = [
    { icon: HardDrive,  label: "DB Size",        value: stats?.size        ?? "—", color: "text-blue-600",    bg: "bg-blue-50",    sub: stats?.size_note },
    { icon: Database,   label: "Tables",          value: stats?.tables      ?? "—", color: "text-purple-600",  bg: "bg-purple-50"  },
    { icon: FileText,   label: "Total Records",   value: stats?.records     ? Number(stats.records).toLocaleString() : "—", color: "text-deep-ocean", bg: "bg-slate-100" },
    { icon: Clock,      label: "Last Optimized",  value: stats?.last_optimized ?? "—", color: "text-amber-600", bg: "bg-amber-50", sub: "local time" },
    { icon: Shield,     label: "Integrity",       value: stats?.integrity   ?? "—", color: "text-emerald-600", bg: "bg-emerald-50", sub: stats?.integrity === "OK" ? "All checks passed" : undefined },
    { icon: Activity,   label: "Active Connections", value: stats?.connections ?? "—", color: "text-cyan-600", bg: "bg-cyan-50"    },
  ];

  return (
    <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-10">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <button onClick={() => navigate("/admin")}
            className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition-colors">
            <LayoutDashboard className="h-3.5 w-3.5" />Dashboard
          </button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-800 font-medium">Database Management</span>
        </nav>

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
              <div className="p-2 bg-deep-ocean/10 rounded-xl">
                <Database className="h-5 w-5 text-deep-ocean" />
              </div>
              Database Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Backup, restore, and maintain the system database.
            </p>
          </div>

          <button
            onClick={() => { loadStats(); loadBackups(); }}
            disabled={statsLoading || backupsLoading}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors disabled:opacity-50 self-start"
          >
            <RefreshCw className={`h-4 w-4 ${statsLoading || backupsLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* ── Error banner ── */}
        {statsError && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{statsError}</span>
            <button onClick={loadStats} className="ml-auto text-xs underline cursor-pointer">Retry</button>
          </div>
        )}

        {/* ── DB Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {STAT_CARDS.map(s => (
            <div key={s.label} className={statsLoading ? "animate-pulse" : ""}>
              {statsLoading ? (
                <Card className="p-4 h-20">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 mb-2" />
                  <div className="h-3 w-16 bg-slate-200 rounded" />
                </Card>
              ) : (
                <StatCard {...s} />
              )}
            </div>
          ))}
        </div>

        {/* ── Notice banner ── */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            <strong>Best practice:</strong> Always create a backup before running restore or any bulk operations.
            Backups are encrypted and stored in the configured backup directory.
            Contact your system administrator if you need to change the backup location.
          </p>
        </div>

        {/* ── Actions Grid ── */}
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Database Operations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Backup + Optimize */}
            {ACTIONS.map(action => (
              <ActionCard
                key={action.id}
                action={action}
                onTrigger={handleAction}
                running={running}
                succeeded={succeeded}
              />
            ))}

            {/* Restore — custom component */}
            <RestoreZone onRestore={handleRestore} running={running} />
          </div>
        </section>

        {/* ── Backup History ── */}
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Server className="h-4 w-4 text-deep-ocean" />
                Backup History
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Recent backup snapshots — click to download</p>
            </div>
            {!backupsLoading && (
              <Badge variant="default">{backups.length} snapshots</Badge>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["Backup ID", "Date & Time", "Size", "Type", "Initiated By", "Status", ""].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backupsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: j === 4 ? "80px" : "56px" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : backups.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                      <CloudDownload className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                      No backups yet. Create your first backup above.
                    </td>
                  </tr>
                ) : backups.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 font-medium">{b.backup_id ?? b.id}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                      {b.started_at
                        ? new Date(b.started_at).toLocaleString()
                        : b.date ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {b.file_size
                        ? (b.file_size / (1024 * 1024)).toFixed(1) + " MB"
                        : b.size ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={b.type === "Manual" ? "warning" : "default"}>
                        {b.type ?? "Full"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {b.started_by?.username ?? b.initiated_by ?? "System"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        (b.status ?? "").toLowerCase() === "success" || (b.status ?? "").toLowerCase() === "completed"
                          ? "success"
                          : (b.status ?? "").toLowerCase() === "failed"
                          ? "destructive"
                          : "default"
                      }>
                        {b.status ?? "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {((b.status ?? "").toLowerCase() === "success" || (b.status ?? "").toLowerCase() === "completed") && (
                        <button
                          onClick={() => handleDownload(b)}
                          className="flex items-center gap-1 text-xs text-deep-ocean hover:underline cursor-pointer font-medium whitespace-nowrap"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── Danger Zone ── */}
        <Card className="p-0 overflow-hidden border-red-200">
          <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <h3 className="text-sm font-bold text-red-700">Danger Zone</h3>
          </div>
          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Purge Duplicate Records</p>
              <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                Scan for and permanently delete duplicate case entries, orphaned evidence records,
                and redundant suspect profiles. <strong>Make a backup first.</strong>
              </p>
            </div>
            <button
              onClick={() => setConfirmCfg({
                id: "purge",
                title: "Purge Duplicate Records",
                subtitle: "Destructive · Cannot be undone",
                message: "This will permanently delete all detected duplicate records from the database. There is no undo. Ensure you have a recent backup before proceeding.",
                confirmWord: "PURGE",
                danger: true,
                actionLabel: "Purge Duplicates",
                apiFn: async () => { await new Promise(r => setTimeout(r, 2000)); }, // stub
                successMsg: "Duplicate records purged.",
              })}
              disabled={!!running}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold cursor-pointer transition-colors disabled:opacity-50 shrink-0"
            >
              <Trash2 className="h-4 w-4" />
              Purge Duplicates
            </button>
          </div>
        </Card>

      </main>

      {/* ── Confirm Modal ── */}
      {confirmCfg && (
        <ConfirmModal
          config={confirmCfg}
          onClose={() => !confirmLoading && setConfirmCfg(null)}
          onConfirm={handleConfirm}
          loading={confirmLoading}
        />
      )}

      {/* ── Toasts ── */}
      <Toast toasts={toasts} />
    </div>
  );
}

export default ManageDatabasePage;