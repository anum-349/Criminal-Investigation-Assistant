// /**
//  * CaseTimeline.jsx  (updated — replaces existing src/pages/investigator/case/CaseTimeline.jsx)
//  * Now supports manual event addition via AddTimelineModal.
//  * Auto-events (system-generated) are shown with a lock icon and cannot be deleted.
//  * Manual events can be deleted by the investigator.
//  */
// import { useState } from "react";
// import {
//   FileText, Clock, Plus, Trash2, AlertTriangle,
//   CheckCircle2, Gavel, Camera, Brain, User,
//   Users, MapPin, Shield, X, Lock,
// } from "lucide-react";
// import { AddTimelineModal } from "./CaseDetailModals";
// import { Badge } from "../../../components/ui/Badge";

// // ── Event type config ─────────────────────────────────────────────────────────
// const EVENT_STYLES = {
//   "FIR Filed":            { bg: "bg-deep-ocean",     icon: FileText,       badge: "default"     },
//   "Evidence Added":       { bg: "bg-teal-600",        icon: Camera,         badge: "default"     },
//   "Status Changed":       { bg: "bg-amber-600",       icon: Clock,          badge: "warning"     },
//   "Lead Generated":       { bg: "bg-purple-600",      icon: Brain,          badge: "default"     },
//   "Suspect Arrested":     { bg: "bg-red-600",         icon: Users,          badge: "destructive" },
//   "Field Visit":          { bg: "bg-blue-600",        icon: MapPin,         badge: "default"     },
//   "Witness Interview":    { bg: "bg-violet-600",      icon: User,           badge: "default"     },
//   "Suspect Interview":    { bg: "bg-orange-500",      icon: Users,          badge: "warning"     },
//   "Court Hearing":        { bg: "bg-indigo-600",      icon: Gavel,          badge: "default"     },
//   "Evidence Collection":  { bg: "bg-cyan-600",        icon: Camera,         badge: "default"     },
//   "Note / Observation":   { bg: "bg-slate-500",       icon: FileText,       badge: "default"     },
//   "Arrest":               { bg: "bg-red-700",         icon: Shield,         badge: "destructive" },
//   "Other":                { bg: "bg-slate-600",       icon: FileText,       badge: "default"     },
// };

// const getStyle = (type) => EVENT_STYLES[type] || EVENT_STYLES["Other"];

// // ── Initial timeline (replaces hardcoded data — mix of auto + manual) ─────────
// const INITIAL_EVENTS = [
//   { id: "TL-001", eventType: "FIR Filed",           title: "FIR Registered at Gulshan PS",           description: "FIR #FIR-2026-1042 registered. Case assigned to Insp. Rashid Ali Khan.", date: "2026-04-10", time: "23:15", officerName: "DSP Asif Malik",        eventSource: "system"  },
//   { id: "TL-002", eventType: "Field Visit",          title: "Initial Site Visit",                     description: "Crime scene secured. CCTV footage recovered from adjacent shop. Footprints near back exit preserved.", date: "2026-04-11", time: "09:30", officerName: "Insp. Rashid Ali Khan", eventSource: "manual", severity: "High"   },
//   { id: "TL-003", eventType: "Evidence Added",       title: "CCTV Footage Submitted to Evidence Log", description: "2 CCTV recordings added: EVD-001 (shop camera), EVD-002 (street view).", date: "2026-04-11", time: "14:00", officerName: "Insp. Rashid Ali Khan", eventSource: "system"  },
//   { id: "TL-004", eventType: "Witness Interview",    title: "Victim Muhammad Saleem Interviewed",     description: "Victim gave full statement. Three masked men, one armed with pistol. White Toyota Corolla used as getaway vehicle.", date: "2026-04-12", time: "10:00", officerName: "Insp. Rashid Ali Khan", eventSource: "manual"  },
//   { id: "TL-005", eventType: "Lead Generated",       title: "AI Lead: Suspect Pattern Match",         description: "AI identified similarity with Case C-2040 (pistol, same area). Confidence: 82%.", date: "2026-04-12", time: "15:20", officerName: "System (AI)",           eventSource: "system"  },
//   { id: "TL-006", eventType: "Status Changed",       title: "Case Status: Open → Under Investigation", description: "Case status updated by Insp. Rashid Ali Khan following initial findings.", date: "2026-04-13", time: "08:45", officerName: "Insp. Rashid Ali Khan", eventSource: "system"  },
// ];

// // ── Delete Confirmation inline ────────────────────────────────────────────────
// function DeleteConfirm({ onConfirm, onCancel }) {
//   return (
//     <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5">
//       <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
//       <p className="text-xs text-red-700 flex-1">Delete this event permanently?</p>
//       <button onClick={onConfirm} className="text-xs font-semibold text-red-600 hover:text-red-800 cursor-pointer px-2">Yes, Delete</button>
//       <button onClick={onCancel}  className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer px-2">Cancel</button>
//     </div>
//   );
// }

// // ── Main component ────────────────────────────────────────────────────────────
// const CaseTimeline = ({ caseId = "C-2052" }) => {
//   const [events,   setEvents]   = useState(INITIAL_EVENTS);
//   const [showAdd,  setShowAdd]  = useState(false);
//   const [toDelete, setToDelete] = useState(null);

//   const handleSave = (newEvent) => setEvents(ev => [newEvent, ...ev]);
//   const handleDelete = (id) => { setEvents(ev => ev.filter(e => e.id !== id)); setToDelete(null); };

//   // Sort by date+time descending (newest first)
//   const sorted = [...events].sort((a, b) => {
//     const da = new Date(`${a.date}T${a.time || "00:00"}`);
//     const db = new Date(`${b.date}T${b.time || "00:00"}`);
//     return db - da;
//   });

//   return (
//     <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
//       {/* Header */}
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <h2 className="text-xl font-bold text-slate-800">Case Timeline</h2>
//           <p className="text-xs text-slate-500 mt-0.5">{events.length} events · auto-logged + manual entries</p>
//         </div>
//         <button
//           onClick={() => setShowAdd(true)}
//           className="flex items-center gap-2 px-4 py-2 bg-deep-ocean text-white rounded-lg text-sm font-semibold hover:bg-deep-ocean-900 transition-colors cursor-pointer shadow-sm"
//         >
//           <Plus className="h-4 w-4" /> Add Event
//         </button>
//       </div>

//       {/* Legend */}
//       <div className="flex items-center gap-4 mb-5 text-xs text-slate-500">
//         <span className="flex items-center gap-1.5"><Lock className="h-3 w-3 text-slate-400" />Auto-logged (system)</span>
//         <span className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-emerald-600" />Manual entry</span>
//       </div>

//       {/* Timeline */}
//       {sorted.length === 0 ? (
//         <div className="text-center py-10 text-slate-400">
//           <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
//           <p className="text-sm">No timeline events yet.</p>
//         </div>
//       ) : (
//         <div className="relative">
//           {/* Vertical line */}
//           <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-slate-200" />

//           <div className="space-y-4">
//             {sorted.map((ev) => {
//               const { bg, icon: Icon } = getStyle(ev.eventType);
//               const isAuto = ev.eventSource === "system";
//               const isDeleting = toDelete === ev.id;

//               return (
//                 <div key={ev.id} className="flex gap-4">
//                   {/* Dot */}
//                   <div className={`relative z-10 w-9 h-9 rounded-full ${bg} flex items-center justify-center shrink-0 shadow-sm`}>
//                     <Icon className="h-4 w-4 text-white" />
//                   </div>

//                   {/* Card */}
//                   <div className={`flex-1 rounded-xl border p-4 transition-all
//                     ${isAuto ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200 hover:border-slate-300"}`}>
//                     <div className="flex items-start justify-between gap-2">
//                       <div className="flex-1">
//                         <div className="flex flex-wrap items-center gap-2 mb-1">
//                           <p className="text-sm font-bold text-slate-800">{ev.title}</p>
//                           <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
//                             ${ev.eventType in EVENT_STYLES
//                               ? EVENT_STYLES[ev.eventType].bg + " bg-opacity-10 text-white"
//                               : "bg-slate-100 text-slate-600"}`}
//                             style={{ backgroundColor: undefined }}
//                           >
//                             {/* Re-render as simple text badge */}
//                           </span>
//                           <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{ev.eventType}</span>
//                           {isAuto && <Lock className="h-3 w-3 text-slate-400" title="Auto-logged by system" />}
//                           {ev.severity === "Critical" && <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Critical</span>}
//                           {ev.severity === "High"     && <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">High</span>}
//                         </div>
//                         <p className="text-xs text-slate-500 mb-2 flex items-center gap-2">
//                           <span>{ev.date}{ev.time ? " at " + ev.time : ""}</span>
//                           <span className="text-slate-300">·</span>
//                           <span>{ev.officerName}</span>
//                         </p>
//                         <p className="text-sm text-slate-700 leading-relaxed">{ev.description}</p>
//                         {ev.outcome && <p className="text-xs text-emerald-700 mt-2 font-medium">Outcome: {ev.outcome}</p>}
//                         {ev.followUpRequired && ev.followUpDate && (
//                           <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
//                             <AlertTriangle className="h-3 w-3" /> Follow-up due: {ev.followUpDate}
//                           </p>
//                         )}
//                       </div>
//                       {/* Delete — manual events only */}
//                       {!isAuto && (
//                         <button
//                           onClick={() => setToDelete(isDeleting ? null : ev.id)}
//                           className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors cursor-pointer shrink-0"
//                           title="Delete event"
//                         >
//                           {isDeleting ? <X className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
//                         </button>
//                       )}
//                     </div>
//                     {isDeleting && (
//                       <DeleteConfirm onConfirm={() => handleDelete(ev.id)} onCancel={() => setToDelete(null)} />
//                     )}
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       )}

//       {showAdd && (
//         <AddTimelineModal
//           caseId={caseId}
//           onClose={() => setShowAdd(false)}
//           onSave={handleSave}
//         />
//       )}
//     </div>
//   );
// };

// export default CaseTimeline;

import { FileText } from "lucide-react";

const CaseTimeline = () => {
    const timelineData = [
        { id: 1, text: "Initial suspect interviews conducted.", date: "16 Dec 2025", time: "3:00 PM" },
        { id: 2, text: "Police notified; crime scene secured.", date: "15 Dec 2025", time: "11:00 PM" },
        { id: 3, text: "CCTV footage recovered from nearby streets.", date: "16 Dec 2025", time: "12:00 PM" },
        { id: 4, text: "Victim found stabbed by family member.", date: "15 Dec 2025", time: "10:45 PM" },
        { id: 5, text: "CCTV footage recovered (alternate view).", date: "16 Dec 2025", time: "10:00 AM" },
        { id: 6, text: "Neighbors report hearing loud argument.", date: "15 Dec 2025", time: "10:30 PM" },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            {timelineData.map((item) => (
                <div key={item.id} className={`${item.id%3 === 0 ? "bg-crimson-red" : item.id%3 === 1 ? "bg-emerald-green" : "bg-amber-gold"} text-white p-5 rounded-lg flex items-start gap-4 shadow-md`}>
                    <div className="mt-1 p-1 border-2 border-white rounded">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm">{item.text}</h4>
                        <p className="text-xs opacity-90 mt-1">{item.date} – {item.time}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default CaseTimeline;