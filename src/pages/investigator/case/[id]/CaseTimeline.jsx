import { useEffect, useMemo, useState } from "react";
import {
  Plus, Lock, Clock, Trash2, X, AlertTriangle,
  FileText, User, Users, Camera, Brain, Gavel, MapPin,
  ShieldCheck, RefreshCw, FolderOpen, Eye, ClipboardCheck,
  AlertCircle, CheckCircle2, Columns2, AlignJustify,
  Loader2,
} from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";

import { SYSTEM_EVENT, MANUAL_EVENT_COLORS, EVENT_SOURCE } from "./caseEventConstants";
import AddTimelineDialog from "./forms/AddTimeline";

const PAGE_SIZE = 5;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Event-type → icon mapping
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_ICON = {
  [SYSTEM_EVENT.CASE_REGISTERED]: FolderOpen,
  [SYSTEM_EVENT.FIR_FILED]: FileText,
  [SYSTEM_EVENT.CASE_UPDATED]: RefreshCw,
  [SYSTEM_EVENT.STATUS_CHANGED]: ClipboardCheck,
  [SYSTEM_EVENT.VICTIM_ADDED]: User,
  [SYSTEM_EVENT.SUSPECT_ADDED]: Users,
  [SYSTEM_EVENT.WITNESS_ADDED]: User,
  [SYSTEM_EVENT.EVIDENCE_ADDED]: Camera,
  [SYSTEM_EVENT.AI_LEAD_GENERATED]: Brain,
  [SYSTEM_EVENT.CASE_LINKED]: FolderOpen,
  [SYSTEM_EVENT.REPORT_GENERATED]: FileText,
  [SYSTEM_EVENT.CASE_CLOSED]: ShieldCheck,
  [SYSTEM_EVENT.CASE_REOPENED]: RefreshCw,
  "Field Visit": MapPin,
  "Witness Interview": User,
  "Suspect Interview": Users,
  "Arrest": ShieldCheck,
  "Evidence Collection": Camera,
  "Court Hearing": Gavel,
  "Surveillance": Eye,
  "Informant Contact": User,
  "Forensic Visit": Camera,
  "Status Update": ClipboardCheck,
  "Note / Observation": FileText,
  "Other": Clock,
};
const getEventIcon = (eventType) => EVENT_ICON[eventType] || Clock;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Inline delete-confirm row
// ─────────────────────────────────────────────────────────────────────────────

const DeleteConfirm = ({ onConfirm, onCancel, deleting }) => (
  <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5">
    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
    <p className="text-xs text-red-700 flex-1">Delete this event permanently?</p>
    <button
      onClick={onConfirm}
      disabled={deleting}
      className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50 cursor-pointer px-2 flex items-center gap-1"
    >
      {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
      {deleting ? "Deleting…" : "Yes, Delete"}
    </button>
    <button
      onClick={onCancel}
      disabled={deleting}
      className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50 cursor-pointer px-2"
    >
      Cancel
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Source badge + severity pill
// ─────────────────────────────────────────────────────────────────────────────

const SourceBadge = ({ source }) => {
  if (source === EVENT_SOURCE.SYSTEM) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
        <Lock className="h-2.5 w-2.5" /> Auto
      </span>
    );
  }
  if (source === EVENT_SOURCE.AI) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
        <Brain className="h-2.5 w-2.5" /> AI
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
      <User className="h-2.5 w-2.5" /> Manual
    </span>
  );
};

const SEVERITY_PILL = {
  Critical: "bg-red-100 text-red-700",
  High: "bg-orange-100 text-orange-700",
};
const SeverityPill = ({ severity }) => {
  if (!SEVERITY_PILL[severity]) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${SEVERITY_PILL[severity]}`}>
      <AlertCircle className="h-2.5 w-2.5" /> {severity}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. Single timeline event card
// ─────────────────────────────────────────────────────────────────────────────

function TimelineEventCard({
  ev, onAskDelete, askingDelete, onConfirmDelete, onCancelDelete, deleting,
}) {
  const Icon = getEventIcon(ev.event_type);
  const isSystem = ev.event_source === EVENT_SOURCE.SYSTEM;
  const isAI = ev.event_source === EVENT_SOURCE.AI;
  const typeColour = MANUAL_EVENT_COLORS[ev.event_type] || "bg-slate-100 text-slate-600";

  const dotBg =
    isSystem ? "bg-slate-500"
      : isAI ? "bg-purple-500"
        : "bg-emerald-600";

  const cardSurface = isSystem
    ? "bg-slate-50 border-slate-200"
    : "bg-white border-slate-200 hover:border-slate-300";

  return (
    <div className="flex gap-3">
      <div className={`relative z-10 w-9 h-9 rounded-full ${dotBg} flex items-center justify-center shrink-0 shadow-sm`}>
        <Icon className="h-4 w-4 text-white" />
      </div>

      <div className={`flex-1 min-w-0 rounded-xl border p-4 transition-all ${cardSurface}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className="text-sm font-bold text-slate-800">{ev.title}</p>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeColour}`}>
                {ev.event_type}
              </span>
              <SourceBadge source={ev.event_source} />
              <SeverityPill severity={ev.severity} />
            </div>

            <p className="text-xs text-slate-500 mb-2 flex items-center gap-2 flex-wrap">
              <Clock className="h-3 w-3" />
              <span>{ev.date}{ev.time ? ` at ${ev.time}` : ""}</span>
              {ev.officer_name && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="truncate">{ev.officer_name}</span>
                </>
              )}
            </p>

            {ev.description && (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap wrap-break-word">
                {ev.description}
              </p>
            )}

            {ev.location && (
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {ev.location}
              </p>
            )}
            {ev.outcome && (
              <p className="text-xs text-emerald-700 mt-2 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Outcome: {ev.outcome}
              </p>
            )}
            {ev.follow_up_required && ev.follow_up_date && (
              <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Follow-up due: {ev.follow_up_date}
              </p>
            )}
            {ev.attachment_note && (
              <p className="text-[11px] text-slate-400 mt-1 italic">
                Attachment: {ev.attachment_note}
              </p>
            )}
          </div>

          {ev.editable && (
            <button
              onClick={onAskDelete}
              disabled={deleting}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
              title={askingDelete ? "Cancel delete" : "Delete event"}
            >
              {askingDelete ? <X className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
            </button>
          )}
        </div>

        {askingDelete && (
          <DeleteConfirm
            onConfirm={onConfirmDelete}
            onCancel={onCancelDelete}
            deleting={deleting}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Single column shell
// ─────────────────────────────────────────────────────────────────────────────

function TimelineColumn({
  title, subtitle, icon: TitleIcon, iconBg,
  events, emptyMessage,
  toDelete, onAskDelete, onConfirmDelete, onCancelDelete, deletingId,
  page, setPage,
}) {
  const total = events.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);
  const pageEvents = events.slice(start, end);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages, setPage]);

  return (
    <div className="flex flex-col h-full bg-slate-50/50 border border-slate-200 rounded-xl">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-white rounded-t-xl">
        <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
          <TitleIcon className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-800 truncate">{title}</h3>
          <p className="text-[11px] text-slate-500">{subtitle}</p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
          {total}
        </span>
      </div>

      <div className="flex-1 p-4">
        {total === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs font-medium">{emptyMessage}</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-4.5 top-2 bottom-2 w-0.5 bg-slate-200" aria-hidden />
            <div className="space-y-3">
              {pageEvents.map((ev) => (
                <TimelineEventCard
                  key={ev.id}
                  ev={ev}
                  askingDelete={toDelete === ev.id}
                  deleting={deletingId === ev.id}
                  onAskDelete={() => onAskDelete(ev.id)}
                  onConfirmDelete={() => onConfirmDelete(ev.id)}
                  onCancelDelete={() => onCancelDelete()}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {total > PAGE_SIZE && (
        <div className="px-3 py-3 border-t border-slate-200 bg-white rounded-b-xl">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={total}
            start={start}
            end={end}
            itemLabel="events"
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Main component — fully controlled by parent
// ─────────────────────────────────────────────────────────────────────────────
//
// PROPS
//   caseId       — string, required
//   events       — array from the parent (loaded from GET /timeline)
//   onAddEvent   — async (eventBody) => createdRow
//                  body shape mirrors AddTimelineDialog → POST /timeline
//   onDeleteEvent — async (eventId) => void
//                  parent handles the DELETE call + state update; THROW on failure
//   loading      — bool, optional (parent's initial load state)
//
// The component no longer keeps its own seed events. Everything is DB-backed.

const CaseTimeline = ({
  caseId = "C-2053",
  events = [],
  onAddEvent,
  onDeleteEvent,
  loading = false,
}) => {
  const [showAdd, setShowAdd]     = useState(false);
  const [toDelete, setToDelete]   = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [view, setView]           = useState("split");

  const [systemPage, setSystemPage]     = useState(1);
  const [manualPage, setManualPage]     = useState(1);
  const [combinedPage, setCombinedPage] = useState(1);

  // ── Sort newest-first ───────────────────────────────────────────────────
  const sortDesc = (arr) =>
    [...arr].sort((a, b) => {
      const da = new Date(`${a.date}T${a.time || "00:00"}`);
      const db = new Date(`${b.date}T${b.time || "00:00"}`);
      return db - da;
    });

  // ── Split events. "manual in manual, system+ai in System & AI" ─────────
  const { systemEvents, manualEvents, combinedEvents } = useMemo(() => {
    const sys = events.filter(e => e.event_source === EVENT_SOURCE.SYSTEM || e.event_source === EVENT_SOURCE.AI);
    const man = events.filter(e => e.event_source === EVENT_SOURCE.MANUAL);
    return {
      systemEvents:   sortDesc(sys),
      manualEvents:   sortDesc(man),
      combinedEvents: sortDesc(events),
    };
  }, [events]);

  // ── Save handler — AddTimelineDialog calls this with { caseId, events: [ev] } ──
  // We unwrap and pass the raw event up to the parent, who turns it into a
  // POST to /api/investigator/cases/{caseId}/timeline.
  const handleSave = async (payload) => {
    const ev = payload?.events?.[0];
    if (!ev) return;

    const result = await onAddEvent?.(ev);
    // Always reset to page 1 of whichever column the new event landed in
    if (ev.event_source === EVENT_SOURCE.MANUAL) setManualPage(1);
    else setSystemPage(1);
    setCombinedPage(1);
    return result;
  };

  // ── Delete handler ──────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await onDeleteEvent?.(id);
      setToDelete(null);
    } catch {
      // Parent surfaces the error toast; we just close the inline confirm.
      setToDelete(null);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Combined view pagination ────────────────────────────────────────────
  const combinedTotal = combinedEvents.length;
  const combinedTotalPages = Math.max(1, Math.ceil(combinedTotal / (PAGE_SIZE * 2)));
  const combinedStart = (combinedPage - 1) * PAGE_SIZE * 2;
  const combinedEnd = Math.min(combinedStart + PAGE_SIZE * 2, combinedTotal);
  const combinedPageEvents = combinedEvents.slice(combinedStart, combinedEnd);

  useEffect(() => {
    if (combinedPage > combinedTotalPages) setCombinedPage(combinedTotalPages);
  }, [combinedPage, combinedTotalPages]);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <section
      className="bg-white rounded-t-lg border-x border-t border-slate-300 shadow-sm p-6"
      aria-label="Case timeline"
    >
      <header className="flex items-start justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Case Timeline</h2>
          <p className="text-sm text-slate-600 mt-1">
            {events.length} event{events.length !== 1 ? "s" : ""} —
            {" "}{systemEvents.length} auto-logged · {manualEvents.length} manual
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border border-slate-300 bg-white overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setView("split")}
              className={`flex items-center gap-1.5 px-3 py-1.5 cursor-pointer transition-colors
                ${view === "split"
                  ? "bg-deep-ocean text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"}`}
              aria-pressed={view === "split"}
            >
              <Columns2 className="h-3.5 w-3.5" /> Two columns
            </button>
            <button
              type="button"
              onClick={() => setView("combined")}
              className={`flex items-center gap-1.5 px-3 py-1.5 cursor-pointer transition-colors border-l border-slate-300
                ${view === "combined"
                  ? "bg-deep-ocean text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"}`}
              aria-pressed={view === "combined"}
            >
              <AlignJustify className="h-3.5 w-3.5" /> Combined
            </button>
          </div>

          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-deep-ocean text-white rounded-lg text-sm font-semibold hover:bg-deep-ocean-900 transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Event
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-5 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-500" /> System (auto-logged)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-500" /> AI-generated
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-600" /> Manual entry
        </span>
      </div>

      {/* ── Loading ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Loading timeline…</span>
        </div>
      ) : view === "split" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TimelineColumn
            title="System & AI"
            subtitle="Auto-logged actions and AI-generated entries"
            icon={Lock}
            iconBg="bg-slate-600"
            events={systemEvents}
            emptyMessage="No auto-logged events yet."
            toDelete={toDelete}
            deletingId={deletingId}
            onAskDelete={(id) => setToDelete(toDelete === id ? null : id)}
            onConfirmDelete={(id) => handleDelete(id)}
            onCancelDelete={() => setToDelete(null)}
            page={systemPage}
            setPage={setSystemPage}
          />
          <TimelineColumn
            title="Manual Entries"
            subtitle="Investigator notes, interviews, field visits"
            icon={User}
            iconBg="bg-emerald-600"
            events={manualEvents}
            emptyMessage="No manual entries yet. Click 'Add Event' to record one."
            toDelete={toDelete}
            deletingId={deletingId}
            onAskDelete={(id) => setToDelete(toDelete === id ? null : id)}
            onConfirmDelete={(id) => handleDelete(id)}
            onCancelDelete={() => setToDelete(null)}
            page={manualPage}
            setPage={setManualPage}
          />
        </div>
      ) : (
        <>
          {combinedTotal === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No timeline events yet.</p>
              <p className="text-xs mt-1">Click "Add Event" to record an investigative observation.</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-4.5 top-2 bottom-2 w-0.5 bg-slate-200" aria-hidden />
              <div className="space-y-3">
                {combinedPageEvents.map((ev) => (
                  <TimelineEventCard
                    key={ev.id}
                    ev={ev}
                    askingDelete={toDelete === ev.id}
                    deleting={deletingId === ev.id}
                    onAskDelete={() => setToDelete(toDelete === ev.id ? null : ev.id)}
                    onConfirmDelete={() => handleDelete(ev.id)}
                    onCancelDelete={() => setToDelete(null)}
                  />
                ))}
              </div>
            </div>
          )}

          {combinedTotal > PAGE_SIZE * 2 && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <Pagination
                currentPage={combinedPage}
                totalPages={combinedTotalPages}
                onPageChange={setCombinedPage}
                totalItems={combinedTotal}
                start={combinedStart}
                end={combinedEnd}
                itemLabel="events"
              />
            </div>
          )}
        </>
      )}

      <AddTimelineDialog
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onSubmit={handleSave}
        caseId={caseId}
      />
    </section>
  );
};

export default CaseTimeline;