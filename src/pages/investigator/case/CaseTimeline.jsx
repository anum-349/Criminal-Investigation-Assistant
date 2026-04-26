import { useEffect, useMemo, useState } from "react";
import {
  Plus, Lock, Clock, Trash2, X, AlertTriangle,
  FileText, User, Users, Camera, Brain, Gavel, MapPin,
  ShieldCheck, RefreshCw, FolderOpen, Eye, ClipboardCheck,
  AlertCircle, CheckCircle2, Columns2, AlignJustify,
} from "lucide-react";

import {
  EVENT_SOURCE,
  SYSTEM_EVENT,
  MANUAL_EVENT_COLORS,
  createSystemEvent,
  createManualEvent,
} from "./caseEventConstants";
import AddTimelineDialog from "./forms/AddTimeline";
import { Pagination } from "../../../components/ui/Pagination";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

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
// 2. Fallback seed (uncontrolled mode only)
// ─────────────────────────────────────────────────────────────────────────────
const buildSeedEvents = (caseId) => [
  { ...createSystemEvent({
      caseId,
      eventType: SYSTEM_EVENT.AI_LEAD_GENERATED,
      title: "AI Lead Generated: Vehicle Match (white sedan)",
      description: "Cross-camera analysis matched the suspect vehicle to 3 prior incidents in adjacent districts. Confidence 87%.",
      officerName: "System (AI)",
    }), date: "2026-04-25", time: "09:14" },

  { ...createManualEvent({
      eventType: "Field Visit",
      title: "Re-canvassed neighbouring buildings",
      description: "Spoke to residents of Apt 9, 10, 14, 15. Apt 14 resident heard a door slam at ~10:35 PM matching the timeline.",
      officerName: "Insp. Rana Ali Khan",
      severity: "Normal",
      location: "Clifton Block 5, Building B",
      outcome: "New corroborating witness identified — see W-10049.",
      date: "2026-04-24",
      time: "16:20",
    }, caseId) },

  { ...createSystemEvent({
      caseId,
      eventType: SYSTEM_EVENT.WITNESS_ADDED,
      title: "Witness Statement Recorded: Imran Khan (W-10049)",
      description: "Security guard from building lobby. Reported unusual activity that evening.",
      officerName: "Insp. Rana Ali Khan",
    }), date: "2026-04-24", time: "17:05" },

  { ...createSystemEvent({
      caseId,
      eventType: SYSTEM_EVENT.EVIDENCE_ADDED,
      title: "Evidence Added: Building entry-log printout",
      description: "Hard-copy entry log for 20 Aug 2025 attached to evidence locker (E-2053-08).",
      officerName: "Insp. Rana Ali Khan",
    }), date: "2026-04-24", time: "17:30" },

  { ...createManualEvent({
      eventType: "Suspect Interview",
      title: "Initial questioning of Bilal Hussain",
      description: "Suspect denied being at the scene. Provided alibi: claims he was at a restaurant in DHA Phase 5 between 9:30 PM and 11:00 PM. Restaurant receipt to be verified.",
      officerName: "Insp. Rana Ali Khan",
      severity: "High",
      location: "Clifton PS interview room 2",
      outcome: "Alibi noted; awaiting CCTV verification at restaurant.",
      date: "2026-04-23",
      time: "11:00",
    }, caseId) },

  { ...createManualEvent({
      eventType: "Witness Interview",
      title: "Interviewed Farooq Sheikh (W-10046)",
      description: "Confirmed hearing argument at 10:30 PM. Did not see the suspect but heard a male voice raised in Urdu.",
      officerName: "Insp. Rana Ali Khan",
      severity: "Normal",
      location: "Apt 12, Clifton Block 5",
      outcome: "Statement recorded; matches earlier witness account.",
      date: "2026-04-22",
      time: "15:30",
    }, caseId) },

  { ...createSystemEvent({
      caseId,
      eventType: SYSTEM_EVENT.AI_LEAD_GENERATED,
      title: "AI Lead Generated: Suspect Pattern Match",
      description: "AI detected MO similarity with Case C-2040 (also Clifton, similar weapon). Confidence 82%.",
      officerName: "System (AI)",
    }), date: "2026-04-21", time: "08:00" },

  // ═══════════════════════════════════════════════════════════════════════
  // MID-INVESTIGATION — last 1-2 weeks
  // ═══════════════════════════════════════════════════════════════════════

  { ...createManualEvent({
      eventType: "Forensic Visit",
      title: "Site walkthrough with forensic team",
      description: "Re-examined apartment with the forensic team. Identified two new sample points — partial fingerprint on bedroom door handle and a fibre on the window latch.",
      officerName: "Insp. Rana Ali Khan",
      severity: "High",
      location: "Apt 12, Clifton Block 5",
      outcome: "Two new samples collected; logged as E-2053-06 and E-2053-07.",
      date: "2026-04-19",
      time: "10:00",
      followUpRequired: true,
      followUpDate: "2026-04-30",
    }, caseId) },

  { ...createSystemEvent({
      caseId,
      eventType: SYSTEM_EVENT.EVIDENCE_ADDED,
      title: "Evidence Added: Partial fingerprint sample",
      description: "Sample from bedroom door handle. Sent to AFIS lab for comparison.",
      officerName: "Insp. Rana Ali Khan",
    }), date: "2026-04-19", time: "14:45" },

  { ...createSystemEvent({
      caseId,
      eventType: SYSTEM_EVENT.EVIDENCE_ADDED,
      title: "Evidence Added: Fibre sample",
      description: "Fibre from window latch. Sent for material analysis.",
      officerName: "Insp. Rana Ali Khan",
    }), date: "2026-04-19", time: "14:50" },

  { ...createManualEvent({
      eventType: "Court Hearing",
      title: "Preliminary court date set for case briefing",
      description: "Magistrate set a preliminary briefing for 12 May. Need to submit forensic report and witness summary by 5 May.",
      officerName: "DSP Asif Malik",
      severity: "Normal",
      location: "Karachi Sessions Court",
      outcome: "Hearing scheduled; deadline noted.",
      date: "2026-04-17",
      time: "11:30",
      followUpRequired: true,
      followUpDate: "2026-05-05",
    }, caseId) },

  { ...createSystemEvent({
      caseId,
      eventType: SYSTEM_EVENT.SUSPECT_ADDED,
      title: "Suspect Added: Bilal Hussain",
      description: "Primary suspect entry created. Identified via CCTV review and informant tip.",
      officerName: "Insp. Rana Ali Khan",
    }), date: "2026-04-15", time: "13:20" },

  { ...createManualEvent({
      eventType: "Informant Contact",
      title: "Met with confidential informant 'Z'",
      description: "Informant identified the figure in the Block 5 CCTV footage as Bilal Hussain, known to frequent the area. Provided a current address.",
      officerName: "Insp. Rana Ali Khan",
      severity: "High",
      location: "Sea View Park (offsite meet)",
      outcome: "Suspect ID actioned; surveillance approved.",
      date: "2026-04-14",
      time: "20:00",
    }, caseId) },

  { ...createManualEvent({
      eventType: "Surveillance",
      title: "Surveillance of suspect's known address",
      description: "Plain-clothes team observed the address for 6 hours. Suspect arrived at 22:40 in a white sedan matching CCTV.",
      officerName: "Insp. Rana Ali Khan",
      severity: "High",
      location: "Defence Phase 5",
      outcome: "Vehicle confirmed; arrest warrant requested.",
      date: "2026-04-13",
      time: "16:00",
    }, caseId) },

  { ...createSystemEvent({
      caseId,
      eventType: SYSTEM_EVENT.AI_LEAD_GENERATED,
      title: "AI Lead Generated: CCTV figure identification",
      description: "Enhanced still from neighbouring shop CCTV. Confidence 78% match against persons-of-interest database.",
      officerName: "System (AI)",
    }), date: "2026-04-12", time: "09:45" },

  // ═══════════════════════════════════════════════════════════════════════
  // EARLIER — first two weeks
  // ═══════════════════════════════════════════════════════════════════════

  { ...createSystemEvent({
      caseId,
      eventType: SYSTEM_EVENT.EVIDENCE_ADDED,
      title: "Evidence Added: CCTV Footage (neighbouring shop)",
      description: "12 hours of footage uploaded to evidence locker (E-2053-04). Initial review flagged 3 timestamps for AI enhancement.",
      officerName: "Insp. Rana Ali Khan",
    }), date: "2026-04-10", time: "11:00" },

  { ...createManualEvent({
      eventType: "Field Visit",
      title: "Crime scene re-photography",
      description: "Took 38 additional photos for the case file with measurements. Wide-angle shots of all rooms and entry points.",
      officerName: "Insp. Rana Ali Khan",
      severity: "Normal",
      location: "Apt 12, Clifton Block 5",
      outcome: "Photos archived under E-2053-03.",
      date: "2026-04-08",
      time: "10:00",
    }, caseId) },

  { ...createSystemEvent({
      caseId,
      eventType: SYSTEM_EVENT.VICTIM_ADDED,
      title: "Victim Added: Ahmad Khan",
      description: "Primary victim record created. IT professional, 38, multiple stab wounds.",
      officerName: "Insp. Rana Ali Khan",
      severity: "Critical",
    }), date: "2026-04-05", time: "14:00" },

  { ...createSystemEvent({
      caseId,
      eventType: SYSTEM_EVENT.STATUS_CHANGED,
      title: "Status: Open → Under Investigation",
      description: "Case status updated following initial findings. Forensic and witness leads available.",
      officerName: "Insp. Rana Ali Khan",
    }), date: "2026-04-02", time: "09:30" },

  { ...createManualEvent({
      eventType: "Witness Interview",
      title: "Initial interview with Saima Raza (W-10048)",
      description: "Victim's colleague. Provided detailed timeline of victim's day, including a heated phone call with an unknown male around 6 PM the day before.",
      officerName: "Insp. Rana Ali Khan",
      severity: "Normal",
      location: "Tech Park, Karachi",
      outcome: "New investigative lead — phone records to be requested.",
      date: "2026-03-30",
      time: "13:00",
    }, caseId) },

  { ...createSystemEvent({
      caseId,
      eventType: SYSTEM_EVENT.EVIDENCE_ADDED,
      title: "Evidence Added: Crime scene photographs (set 1)",
      description: "Initial photographic evidence set logged (E-2053-01).",
      officerName: "Insp. Rana Ali Khan",
    }), date: "2026-03-28", time: "11:15" },

  { ...createManualEvent({
      eventType: "Field Visit",
      title: "Initial scene examination",
      description: "First responder report reviewed. No forced entry. Front door locked from inside. Body found in living room. Approximate time of death 22:00–23:00.",
      officerName: "Insp. Rana Ali Khan",
      severity: "Critical",
      location: "Apt 12, Clifton Block 5",
      outcome: "Scene secured; forensic team called in.",
      date: "2026-03-27",
      time: "06:30",
    }, caseId) },

  { ...createSystemEvent({
      caseId,
      eventType: SYSTEM_EVENT.FIR_FILED,
      title: "FIR Filed: FIR-2026-1042",
      description: "First Information Report filed at Clifton Police Station. Sections 302, 460 of Pakistan Penal Code.",
      officerName: "DSP Asif Malik",
      severity: "Critical",
    }), date: "2026-03-15", time: "08:00" },

  { ...createSystemEvent({
      caseId,
      eventType: SYSTEM_EVENT.CASE_REGISTERED,
      title: "Case Registered",
      description: "Case C-2053 created in the system. Assigned to Inspector Rana Ali Khan.",
      officerName: "DSP Asif Malik",
      severity: "Critical",
    }), date: "2026-03-15", time: "08:15" },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. Inline delete-confirm row
// ─────────────────────────────────────────────────────────────────────────────

const DeleteConfirm = ({ onConfirm, onCancel }) => (
  <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5">
    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
    <p className="text-xs text-red-700 flex-1">Delete this event permanently?</p>
    <button onClick={onConfirm} className="text-xs font-semibold text-red-600 hover:text-red-800 cursor-pointer px-2">
      Yes, Delete
    </button>
    <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer px-2">
      Cancel
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Source badge + severity pill
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
// 5. Single timeline event card (used in both columns and combined view)
// ─────────────────────────────────────────────────────────────────────────────

function TimelineEventCard({ ev, onAskDelete, askingDelete, onConfirmDelete, onCancelDelete }) {
  const Icon = getEventIcon(ev.eventType);
  const isSystem = ev.eventSource === EVENT_SOURCE.SYSTEM;
  const isAI = ev.eventSource === EVENT_SOURCE.AI;
  const typeColour = MANUAL_EVENT_COLORS[ev.eventType] || "bg-slate-100 text-slate-600";

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
                {ev.eventType}
              </span>
              <SourceBadge source={ev.eventSource} />
              <SeverityPill severity={ev.severity} />
            </div>

            <p className="text-xs text-slate-500 mb-2 flex items-center gap-2 flex-wrap">
              <Clock className="h-3 w-3" />
              <span>{ev.date}{ev.time ? ` at ${ev.time}` : ""}</span>
              {ev.officerName && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="truncate">{ev.officerName}</span>
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
            {ev.followUpRequired && ev.followUpDate && (
              <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Follow-up due: {ev.followUpDate}
              </p>
            )}
            {ev.attachmentNote && (
              <p className="text-[11px] text-slate-400 mt-1 italic">
                Attachment: {ev.attachmentNote}
              </p>
            )}
          </div>

          {ev.editable && (
            <button
              onClick={onAskDelete}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors cursor-pointer shrink-0"
              title={askingDelete ? "Cancel delete" : "Delete event"}
            >
              {askingDelete ? <X className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
            </button>
          )}
        </div>

        {askingDelete && (
          <DeleteConfirm onConfirm={onConfirmDelete} onCancel={onCancelDelete} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Single column shell — title, vertical line, events, pagination
// ─────────────────────────────────────────────────────────────────────────────

function TimelineColumn({
  title,
  subtitle,
  icon: TitleIcon,
  iconBg,
  events,
  emptyMessage,
  toDelete,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
  page,
  setPage,
}) {
  const total = events.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);
  const pageEvents = events.slice(start, end);

  // If the user deletes the last item on a page, snap back to a valid page.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages, setPage]);

  return (
    <div className="flex flex-col h-full bg-slate-50/50 border border-slate-200 rounded-xl">
      {/* Column header */}
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

      {/* Events */}
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
                  onAskDelete={() => onAskDelete(ev.id)}
                  onConfirmDelete={() => onConfirmDelete(ev.id)}
                  onCancelDelete={() => onCancelDelete()}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Per-column pagination */}
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
// 7. Main component
// ─────────────────────────────────────────────────────────────────────────────

const CaseTimeline = ({
  caseId = "C-2053",
  events: eventsProp,
  onAddEvent,
  onDeleteEvent,
}) => {
  // Controlled / uncontrolled mode
  const isControlled = Array.isArray(eventsProp);
  const [localEvents, setLocalEvents] = useState(() =>
    isControlled ? [] : buildSeedEvents(caseId)
  );
  const events = isControlled ? eventsProp : localEvents;

  const [showAdd, setShowAdd] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [view, setView] = useState("split");          // "split" | "combined"

  // Per-column / combined-view page state
  const [systemPage, setSystemPage] = useState(1);
  const [manualPage, setManualPage] = useState(1);
  const [combinedPage, setCombinedPage] = useState(1);

  // ── Save/delete handlers ────────────────────────────────────────────────
  const handleSave = (incoming) => {
    const isAlreadyEvent = !!incoming?.id && !!incoming?.eventSource;
    const ev = isAlreadyEvent ? incoming : createManualEvent(incoming, caseId);

    if (isControlled) onAddEvent?.(ev);
    else setLocalEvents(curr => [ev, ...curr]);

    // Bring user to page 1 of whichever column the new event lands in
    if (ev.eventSource === EVENT_SOURCE.MANUAL) setManualPage(1);
    else setSystemPage(1);
    setCombinedPage(1);
  };

  const handleDelete = (id) => {
    if (isControlled) onDeleteEvent?.(id);
    else setLocalEvents(curr => curr.filter(e => e.id !== id));
    setToDelete(null);
  };

  // ── Sort newest-first helper ────────────────────────────────────────────
  const sortDesc = (arr) =>
    [...arr].sort((a, b) => {
      const da = new Date(`${a.date}T${a.time || "00:00"}`);
      const db = new Date(`${b.date}T${b.time || "00:00"}`);
      return db - da;
    });

  // ── Split into the two columns + a combined view ────────────────────────
  const { systemEvents, manualEvents, combinedEvents } = useMemo(() => {
    const sys = events.filter(e => e.eventSource !== EVENT_SOURCE.MANUAL);
    const man = events.filter(e => e.eventSource === EVENT_SOURCE.MANUAL);
    return {
      systemEvents:   sortDesc(sys),
      manualEvents:   sortDesc(man),
      combinedEvents: sortDesc(events),
    };
  }, [events]);

  // ── Combined-view pagination math ───────────────────────────────────────
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
      {/* Top header */}
      <header className="flex items-start justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Case Timeline</h2>
          <p className="text-sm text-slate-600 mt-1">
            {events.length} event{events.length !== 1 ? "s" : ""} —
            {" "}{systemEvents.length} auto-logged · {manualEvents.length} manual
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
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

      {/* Legend */}
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

      {/* ── Split view (default) ─────────────────────────────────────── */}
      {view === "split" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TimelineColumn
            title="System & AI"
            subtitle="Auto-logged actions and AI-generated entries"
            icon={Lock}
            iconBg="bg-slate-600"
            events={systemEvents}
            emptyMessage="No auto-logged events yet."
            toDelete={toDelete}
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
            onAskDelete={(id) => setToDelete(toDelete === id ? null : id)}
            onConfirmDelete={(id) => handleDelete(id)}
            onCancelDelete={() => setToDelete(null)}
            page={manualPage}
            setPage={setManualPage}
          />
        </div>
      ) : (
        // ── Combined view ─────────────────────────────────────────────
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

      {/* Add Event dialog */}
      <AddTimelineDialog
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onSubmit={(data) => {
          const ev = data?.events?.[0];
          if (ev) handleSave(ev);
        }}
        caseId={caseId}
      />
    </section>
  );
};

export default CaseTimeline;