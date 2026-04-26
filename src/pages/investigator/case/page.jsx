/**
 * case/page.jsx  (Step 4 — auto-logging wired)
 * ─────────────────────────────────────────────────────────────────────────────
 * The case detail page. Step 4 lifts timeline state up here so that all four
 * "Add" dialogs (Suspect / Evidence / Victim / Witness) can append a system
 * event when their submit fires. CaseTimeline becomes a controlled child.
 *
 * Place at: src/pages/investigator/case/page.jsx
 *
 * Auto-logged events:
 *   - SUSPECT_ADDED   ← AddSuspectDialog.onSubmit
 *   - EVIDENCE_ADDED  ← AddEvidenceDialog.onSubmit
 *   - VICTIM_ADDED    ← AddVictimDialog.onSubmit
 *   - WITNESS_ADDED   ← AddWitnessDialog.onSubmit
 *
 * Each handler still calls console.log so the existing dev-debug flow keeps
 * working — that line is the only thing you'd swap for a real backend POST
 * later. The auto-logging is additive.
 *
 * UX feedback: a lightweight toast pops in the bottom-right when an event
 * is auto-logged, so the user can see the timeline updated even if they're
 * not on the Timeline tab.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, FolderOpen, LayoutDashboard, CheckCircle2, X,
} from 'lucide-react';

import Header from '../../../components/Header';
import { Badge } from '../../../components/ui/Badge';

import CaseTimeline           from './CaseTimeline';
import CaseVictim             from './CaseVictims';
import CaseEvidence           from './CaseEvidence';
import CaseWitnesses          from './CaseWitnesses';
import CaseSuspects           from './CaseSuspects';
import CaseInvestigationLeads from './CaseLeads';
import LinkedCases            from './CaseLinkedCases';
import CaseLocation           from './CaseLocation';

import AddEvidenceDialog from './forms/AddEvidence';
import AddSuspectDialog  from './forms/AddSuspect';
import AddVictimDialog   from './forms/AddVictim';
import AddWitnessDialog  from './forms/AddWitness';

import {
    SYSTEM_EVENT,
    EVENT_SOURCE,
    createSystemEvent,
    createManualEvent,
} from './caseEventConstants';

// ─────────────────────────────────────────────────────────────────────────────
// Mock case data — replace with API fetch when backend is wired.
// Kept here so case constants don't bleed into the constants module.
// ─────────────────────────────────────────────────────────────────────────────

const CASE_ID = 'C-2053';
const CURRENT_OFFICER = 'Inspector Rana Ali Khan';

// Pre-seeded events that match the demo case's history. These are the
// "this case already had stuff happen before this session" events.
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
// Tiny toast — shows once per auto-log so the user has feedback
// ─────────────────────────────────────────────────────────────────────────────

function Toast({ message, onClose }) {
    return (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium bg-deep-ocean text-white max-w-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
            <span className="flex-1">{message}</span>
            <button
                onClick={onClose}
                className="p-0.5 rounded hover:bg-white/10 cursor-pointer"
                aria-label="Dismiss"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// CasePage
// ═════════════════════════════════════════════════════════════════════════════

const CasePage = () => {
    const navigate = useNavigate();

    // ── Tab state ──────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('timeline');

    // ── Dialog visibility ──────────────────────────────────────────────────
    const [showAddEvidence, setShowAddEvidence] = useState(false);
    const [showAddSuspect,  setShowAddSuspect]  = useState(false);
    const [showAddVictim,   setShowAddVictim]   = useState(false);
    const [showAddWitness,  setShowAddWitness]  = useState(false);

    // ── Lifted timeline state (the heart of Step 4) ───────────────────────
    const [events, setEvents] = useState(buildSeedEvents);

    // ── Toast state ────────────────────────────────────────────────────────
    const [toast, setToast] = useState(null);
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3500);
        return () => clearTimeout(t);
    }, [toast]);

    // ── Single helper used by every action handler ────────────────────────
    // Builds a system event via the Step-1 factory and prepends it.
    const logSystemEvent = useCallback((eventType, { title, description, payload, severity } = {}) => {
        const ev = createSystemEvent({
            caseId: CASE_ID,
            eventType,
            title,
            description,
            officerName: CURRENT_OFFICER,
            payload,
            severity,
        });
        setEvents(curr => [ev, ...curr]);
        setToast(`Auto-logged to timeline: ${title}`);
    }, []);

    // Direct add for manual events coming from CaseTimeline's modal.
    const handleAddTimelineEvent = useCallback((ev) => {
        setEvents(curr => [ev, ...curr]);
    }, []);

    const handleDeleteTimelineEvent = useCallback((id) => {
        setEvents(curr => curr.filter(e => e.id !== id));
    }, []);

    // ── Action handlers — each "Add" dialog routes through here ───────────
    // These are where the Step-1 factories meet the real action stream.

    const handleAddSuspectSubmit = (data) => {
        // data shape: { caseId, suspects: [{ id, name, ... }] }
        // Existing console.log keeps demo logging intact:
        console.log('AddSuspect submit', data);

        // Auto-log one event per suspect (usually one, but the dialog allows
        // multiple in a single submission so the loop handles it).
        const list = data?.suspects || [];
        list.forEach((s) => {
            const name = s.name || 'Unnamed suspect';
            logSystemEvent(SYSTEM_EVENT.SUSPECT_ADDED, {
                title: `Suspect Added: ${name}`,
                description: s.reason
                    ? `Reason: ${s.reason}`
                    : 'New suspect record created.',
                payload: { suspectId: s.suspectId || s.id, name },
            });
        });
    };

    const handleAddEvidenceSubmit = (data) => {
        console.log('AddEvidence submit', data);
        const list = data?.evidences || [];
        list.forEach((e) => {
            const label = e.type ? `${e.type}` : 'New item';
            logSystemEvent(SYSTEM_EVENT.EVIDENCE_ADDED, {
                title: `Evidence Added: ${label}`,
                description: e.description || `Evidence ${e.evidenceId || ''} attached to case.`,
                payload: { evidenceId: e.evidenceId || e.id, type: e.type },
            });
        });
    };

    const handleAddVictimSubmit = (data) => {
        console.log('AddVictim submit', data);
        const list = data?.victims || [];
        list.forEach((v) => {
            const name = v.name || 'Unnamed victim';
            logSystemEvent(SYSTEM_EVENT.VICTIM_ADDED, {
                title: `Victim Added: ${name}`,
                description: v.injuryType
                    ? `Injury: ${v.injuryType}${v.status ? ` · Status: ${v.status}` : ''}`
                    : 'New victim record created.',
                payload: { victimId: v.victimId || v.id, name },
                severity: v.status === 'Deceased' ? 'Critical' : 'Normal',
            });
        });
    };

    const handleAddWitnessSubmit = (data) => {
        console.log('AddWitness submit', data);
        const list = data?.witnesses || [];
        list.forEach((w) => {
            const display = w.anonymous ? 'Anonymous witness' : (w.name || 'Unnamed witness');
            logSystemEvent(SYSTEM_EVENT.WITNESS_ADDED, {
                title: `Witness Statement Recorded: ${display}`,
                description: w.description
                    ? (w.description.length > 120
                        ? `${w.description.slice(0, 120)}…`
                        : w.description)
                    : 'New witness statement attached to case.',
                payload: { witnessId: w.witnessId || w.id, name: display },
            });
        });
    };

    return (
        <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-14">

            <Header />

            {/* Case Header */}
            <header className="bg-cool-silver p-6 border-b border-slate-300">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <button
                                onClick={() => navigate('/investigator')}
                                className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <LayoutDashboard className="h-3.5 w-3.5" />
                                Dashboard
                            </button>
                            <span className="text-muted-foreground text-xs">/</span>
                            <button
                                onClick={() => navigate('/investigator/cases')}
                                className="flex items-center gap-1.5 text-xs cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <FolderOpen className="h-3.5 w-3.5" />
                                All Cases
                            </button>
                            <span className="text-muted-foreground text-xs">/</span>
                            <span className="text-xs font-medium text-foreground">Case 101</span>
                        </div>

                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Case ID: {CASE_ID}
                        </p>

                        <h1 className="text-2xl font-bold mt-1">Murder - Homicide Investigation</h1>
                        <p className="text-sm text-slate-600 mt-1">Assigned: {CURRENT_OFFICER}</p>
                        <div className="flex gap-2 mt-3">
                            <span className="bg-forest-teal text-white inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                                Under Investigation
                            </span>
                            <Badge variant="destructive">Critical</Badge>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col items-end gap-3">
                        <div className="grid grid-cols-2 lg:grid-cols-4 *:cursor-pointer gap-2 *:bg-deep-ocean-500 *:text-white *:px-4 *:py-1.5 *:rounded *:text-xs *:font-medium *:hover:bg-slate-700 *:transition *:shadow-inner *:shadow-deep-ocean-900">
                            <button onClick={() => setShowAddEvidence(true)}>Add Evidence</button>
                            <button onClick={() => setShowAddSuspect(true)}>Add Suspect</button>
                            <button onClick={() => setShowAddVictim(true)}>Add Victim</button>
                            <button onClick={() => setShowAddWitness(true)}>Add Witness</button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="px-6 py-6">

                {/* Stats / overview */}
                <section className="bg-white rounded-lg shadow-sm p-6 border border-slate-200 mb-6 space-y-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-2">Case Overview</h2>
                        <p className="text-sm text-slate-700 leading-relaxed">
                            Suspected homicide at residential apartment in Clifton, Karachi.
                            Neighbors reported hearing a struggle and suspicious noises around 10:30 PM.
                            No forced entry was observed.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                            'Evidence Collected: 10',
                            'Suspects: 3',
                            'Investigation Leads: 4',
                            'Victims: 2',
                            'Days Open: 10',
                        ].map((stat, i) => (
                            <div
                                key={i}
                                className="bg-deep-ocean-500 shadow-inner shadow-deep-ocean-900/60 text-white p-3 rounded text-center text-sm font-medium"
                            >
                                {stat}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mt-8 mb-6">
                    {['Timeline', 'Victims', 'Evidences', 'Witnesses', 'Suspects', 'Leads', 'Linked Cases', 'Location'].map((tab) => {
                        const tabKey = tab.toLowerCase();
                        const isActive = activeTab === tabKey;

                        // Show a subtle "new" dot on Timeline when toast was just fired
                        // and the user is not currently on the Timeline tab.
                        const showNewDot = tabKey === 'timeline' && toast && activeTab !== 'timeline';

                        return (
                            <button
                                key={tab}
                                className={`relative cursor-pointer px-6 py-1.5 rounded-full shadow-inner text-xs font-semibold transition-all
                                    ${isActive
                                        ? 'bg-deep-ocean-500 shadow-deep-ocean-900/60 text-white scale-105'
                                        : 'bg-slate-blue shadow-deep-ocean text-white opacity-80 hover:opacity-100'}`}
                                onClick={() => setActiveTab(tabKey)}
                            >
                                {tab}
                                {showNewDot && (
                                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white animate-pulse" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Active tab content */}
                {activeTab === 'timeline'      ? (
                    <CaseTimeline
                        caseId={CASE_ID}
                        events={events}
                        onAddEvent={handleAddTimelineEvent}
                        onDeleteEvent={handleDeleteTimelineEvent}
                    />
                ) : activeTab === 'victims'     ? <CaseVictim />
                : activeTab === 'evidences'     ? <CaseEvidence />
                : activeTab === 'witnesses'     ? <CaseWitnesses />
                : activeTab === 'suspects'      ? <CaseSuspects />
                : activeTab === 'leads'         ? <CaseInvestigationLeads caseId={CASE_ID} />
                : activeTab === 'linked cases'  ? <LinkedCases />
                : activeTab === 'location'      ? <CaseLocation />
                : null}
            </main>

            {/* ── Dialogs (now wired with auto-logging handlers) ─────── */}
            <AddEvidenceDialog
                isOpen={showAddEvidence}
                onClose={() => setShowAddEvidence(false)}
                onSubmit={handleAddEvidenceSubmit}
                caseId={CASE_ID}
            />

            <AddSuspectDialog
                isOpen={showAddSuspect}
                onClose={() => setShowAddSuspect(false)}
                onSubmit={handleAddSuspectSubmit}
                caseId={CASE_ID}
            />

            <AddVictimDialog
                isOpen={showAddVictim}
                onClose={() => setShowAddVictim(false)}
                onSubmit={handleAddVictimSubmit}
                caseId={CASE_ID}
            />

            <AddWitnessDialog
                isOpen={showAddWitness}
                onClose={() => setShowAddWitness(false)}
                onSubmit={handleAddWitnessSubmit}
                caseId={CASE_ID}
            />

            {/* Toast for auto-log feedback */}
            {toast && <Toast message={toast} onClose={() => setToast(null)} />}
        </div>
    );
};

export default CasePage;