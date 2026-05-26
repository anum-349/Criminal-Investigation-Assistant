/**
 * StepAIAnalysis — Step 9
 * Streams real AI leads via leadApi.streamAiLeads once the case is created.
 * Falls back to FIR-derived static leads if no caseId yet (pre-submit preview).
 */

import { useEffect, useState, useRef } from "react";
import { Brain, AlertTriangle, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { SectionHeading } from "@/pages/form/case-forms/CaseFormFields/page";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { streamAiLeads } from "@/services/leadApi";

// ── Derive static preview leads from FIR extraction (pre-submit) ─────────────
function buildFirLeads(data) {
  const leads = [];

  if (data.weaponsInvolved?.length > 0) {
    leads.push({
      type:        "Weapon Pattern",
      severity:    "High",
      description: `${data.weaponsInvolved.join(", ")} detected — cross-reference recent armed cases in ${data.city || "this district"}.`,
      confidence:  78,
      source:      "FIR Extraction",
      status:      "New",
      nextStep:    "Pull weapon/ballistics reports from last 90 days in this police station.",
    });
  }

  if (data.accusedPersons?.length > 0) {
    leads.push({
      type:        "Known Accused",
      severity:    "Medium",
      description: `${data.accusedPersons.length} accused named — check prior FIRs: ${data.accusedPersons.slice(0, 2).join(", ")}${data.accusedPersons.length > 2 ? " and others" : ""}.`,
      confidence:  85,
      source:      "FIR Extraction",
      status:      "New",
      nextStep:    "Run CNIC / name check against existing suspect database.",
    });
  }

  const violentSections = (data.legalSections || []).filter(s =>
    ["302", "324", "326", "327", "328", "329"].includes(s)
  );
  if (violentSections.length > 0) {
    leads.push({
      type:        "Violent Offence",
      severity:    "Critical",
      description: `Sections ${violentSections.join(", ")} indicate violent crime — priority investigation required.`,
      confidence:  95,
      source:      "Section Analysis",
      status:      "New",
      nextStep:    "Assign senior investigator and request forensic team within 24h.",
    });
  }

  const pecaSections = (data.legalSections || []).filter(s =>
    ["3","4","5","9","10","14","15","16","17","18","20","21","22","23"].includes(s)
  );
  if (pecaSections.length > 0) {
    leads.push({
      type:        "Cybercrime Indicators",
      severity:    "High",
      description: `PECA 2016 section(s) ${pecaSections.join(", ")} — digital evidence preservation required immediately.`,
      confidence:  90,
      source:      "Section Analysis",
      status:      "New",
      nextStep:    "Issue preservation notice to relevant platform(s). Secure device(s) as evidence.",
    });
  }

  if (data.vehiclePlates?.length > 0) {
    leads.push({
      type:        "Vehicle Trace",
      severity:    "Medium",
      description: `${data.vehiclePlates.length} vehicle plate(s) extracted: ${data.vehiclePlates.join(", ")} — run MTMIS/NADRA trace.`,
      confidence:  88,
      source:      "FIR Extraction",
      status:      "New",
      nextStep:    "Query vehicle registration database and check recent traffic challans.",
    });
  }

  return leads;
}

// ── Severity colour helper ────────────────────────────────────────────────────
const severityDot = (s) => ({
  Critical: "bg-red-500",
  High:     "bg-orange-500",
  Medium:   "bg-yellow-400",
  Low:      "bg-blue-400",
}[s] || "bg-slate-400");

const severityBadge = (s) => ({
  Critical: "destructive",
  High:     "warning",
}[s] || "default");

// ── Main component ────────────────────────────────────────────────────────────
export default function StepAIAnalysis({ data, setData }) {
  const entities = data.extractedEntities || {
    persons: [], locations: [], weapons: [], vehicles: [], dates: [],
  };
  const hasFIR   = !!data.firFile || !!data.firFileName || data.manualEntry;
  const caseId   = data.caseId; // populated after createCase() succeeds

  // ── Streaming state ────────────────────────────────────────────────────────
  const [streamedLeads, setStreamedLeads] = useState([]);
  const [streaming,     setStreaming]     = useState(false);
  const [streamDone,    setStreamDone]    = useState(false);
  const [streamError,   setStreamError]  = useState(null);
  const [streamMeta,    setStreamMeta]   = useState(null); // { accepted, duration_ms, model }
  const abortRef = useRef(null);

  // Derive static preview leads from FIR fields (shown before streaming starts)
  const firLeads = hasFIR ? buildFirLeads(data) : [];

  // ── Commit static FIR leads to formData for submit (no caseId yet) ─────────
  useEffect(() => {
    if (!hasFIR) return;
    if (caseId) return; // streaming will handle this path
    if (Array.isArray(data.aiLeads) && data.aiLeads.length > 0) return;
    if (typeof setData !== "function") return;
    setData(d => ({ ...d, aiLeads: firLeads }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFIR, caseId]);

  // ── Auto-stream once caseId is available ──────────────────────────────────
  useEffect(() => {
    if (!caseId || !hasFIR) return;
    startStream();
    return () => abortRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const startStream = () => {
    abortRef.current?.(); // cancel any prior stream
    setStreamedLeads([]);
    setStreaming(true);
    setStreamDone(false);
    setStreamError(null);
    setStreamMeta(null);

    abortRef.current = streamAiLeads(caseId, {
      onStarted: ({ model }) => {
        setStreamMeta(m => ({ ...m, model }));
      },
      onContext: ({ depth_score, gap_count }) => {
        setStreamMeta(m => ({ ...m, depth_score, gap_count }));
      },
      onLead: (lead) => {
        setStreamedLeads(prev => {
          const updated = [...prev, { ...lead, status: "New" }];
          // Keep formData.aiLeads in sync so Submit always has latest
          setData(d => ({ ...d, aiLeads: updated }));
          return updated;
        });
      },
      onRejected: ({ count, issues }) => {
        setStreamMeta(m => ({ ...m, rejected: count, rejectedIssues: issues }));
      },
      onDone: ({ accepted, rejected, duration_ms, reason }) => {
        setStreamMeta(m => ({ ...m, accepted, rejected, duration_ms, reason }));
        setStreaming(false);
        setStreamDone(true);
      },
      onError: ({ detail }) => {
        setStreamError(detail || "Lead generation failed.");
        setStreaming(false);
      },
    });
  };

  // ── What to display ────────────────────────────────────────────────────────
  // If we have streamed leads, show them. Otherwise show FIR-derived preview.
  const displayLeads  = streamedLeads.length > 0 ? streamedLeads : firLeads;
  const isPreview     = streamedLeads.length === 0 && !streamDone;
  const showStatement = !!data.statementEnglish;

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={Brain}
        title="AI Analysis & Investigative Leads"
        subtitle="Review AI-generated entity extraction results and suggested investigative leads before final submission."
      />

      {!hasFIR ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-500">
          <Brain className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Upload a FIR document in Step 1 to enable AI analysis</p>
          <p className="text-xs mt-1">You can skip this — the case will be registered without leads.</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "AI Confidence",      value: `${data.confidence || 0}%`,                          color: "text-deep-ocean"  },
              { label: "FIR Completeness",   value: `${data.completeness || 0}%`,                        color: "text-emerald-600" },
              { label: "Entities Extracted", value: Object.values(entities).flat().length,               color: "text-purple-600"  },
            ].map(s => (
              <Card key={s.label} className="p-4 text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-1 font-medium">{s.label}</p>
              </Card>
            ))}
          </div>

          {/* Extracted entities grid */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-3">Extracted Entities</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(entities).map(([key, vals]) =>
                vals.length > 0 && (
                  <div key={key} className="border border-slate-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-slate-500 capitalize tracking-wider mb-2">{key}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {vals.map((v, i) => (
                        <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">{v}</span>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Missing fields */}
          {data.missingFields?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Still Missing
              </p>
              <div className="flex flex-wrap gap-2">
                {data.missingFields.map(f => (
                  <span key={f} className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md border border-amber-200">{f}</span>
                ))}
              </div>
            </div>
          )}

          {/* Leads section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-700">
                  {streamDone ? "AI Investigative Leads" : isPreview ? "FIR-Derived Leads (Preview)" : "Generating Leads…"}
                </h4>
                {isPreview && !caseId && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Full AI analysis runs after case is submitted. These leads will be saved on submit.
                  </p>
                )}
                {streamDone && streamMeta && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {streamMeta.accepted} lead{streamMeta.accepted !== 1 ? "s" : ""} generated
                    {streamMeta.rejected > 0 && ` · ${streamMeta.rejected} rejected`}
                    {streamMeta.duration_ms && ` · ${streamMeta.duration_ms}ms`}
                    {streamMeta.model && ` · ${streamMeta.model}`}
                  </p>
                )}
              </div>

              {/* Re-run button (only when caseId available and not currently streaming) */}
              {caseId && !streaming && (
                <button
                  onClick={startStream}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                </button>
              )}
            </div>

            {/* Streaming indicator */}
            {streaming && (
              <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>
                  AI is analysing the case
                  {streamMeta?.model && <span className="text-blue-400"> · {streamMeta.model}</span>}
                  {streamedLeads.length > 0 && (
                    <span className="text-blue-700 font-medium"> — {streamedLeads.length} lead{streamedLeads.length !== 1 ? "s" : ""} so far</span>
                  )}
                </span>
              </div>
            )}

            {/* Stream error */}
            {streamError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-700 font-medium">Lead generation failed</p>
                  <p className="text-xs text-red-500 mt-0.5">{streamError}</p>
                </div>
              </div>
            )}

            {/* Done banner */}
            {streamDone && streamedLeads.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 mb-3">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Leads saved to case — visible in the case investigation panel.</span>
              </div>
            )}

            {/* Lead cards */}
            <div className="space-y-3">
              {displayLeads.map((lead, idx) => (
                <div
                  key={idx}
                  className={`border rounded-xl p-4 flex items-start gap-3 transition-all
                    ${streaming && streamedLeads.includes(lead)
                      ? "border-blue-200 bg-blue-50/40 animate-pulse-once"
                      : "border-slate-200 hover:bg-slate-50"}`}
                >
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${severityDot(lead.severity)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{lead.type}</span>
                      <Badge variant={severityBadge(lead.severity)}>{lead.severity}</Badge>
                      {lead.confidence != null && (
                        <span className="text-[10px] text-slate-400">· {lead.confidence}% confidence</span>
                      )}
                      {lead.source && (
                        <span className="text-[10px] text-slate-400">· {lead.source}</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700">{lead.description}</p>
                    {lead.nextStep && (
                      <p className="text-xs text-slate-500 mt-1.5">
                        <strong className="text-slate-600">Next step:</strong> {lead.nextStep}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {displayLeads.length === 0 && !streaming && (
                <p className="text-sm text-slate-400 text-center py-6">
                  No leads could be derived from the current case data.
                </p>
              )}
            </div>
          </div>

          {/* Full FIR statement (Urdu translation or English original) */}
          {showStatement && (
            <div className="border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Full FIR Statement {data.firLanguage !== "English" ? "(AI Translation)" : ""}
              </p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                {data.statementEnglish}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export { StepAIAnalysis as StepAIAnalysisNamed };