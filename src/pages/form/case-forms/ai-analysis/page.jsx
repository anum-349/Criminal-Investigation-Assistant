/**
 * StepAIAnalysis — Post-registration AI Analysis
 *
 * Rendered on the success screen after caseId is available.
 *   1. Streams real AI leads via leadApi.streamAiLeads (saves to DB internally)
 *   2. Triggers linked-case generation via regenerateLinkedCases
 *
 * Guards against infinite re-triggers with hasRunRef.
 */

import { useEffect, useState, useRef } from "react";
import {
  Brain, AlertTriangle, Loader2, CheckCircle2,
  RefreshCw, Link2, Sparkles,
} from "lucide-react";
import { SectionHeading } from "@/pages/form/case-forms/CaseFormFields/page";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { streamAiLeads } from "@/services/leadApi";
import { regenerateLinkedCases, fetchLinkedCases } from "@/services/caseApi";

// ── Static preview leads from FIR extraction (shown before caseId exists) ────
export function buildFirLeads(data) {
  const leads = [];

  if (data.weaponsInvolved?.length > 0) {
    leads.push({
      type: "Weapon Pattern",
      severity: "High",
      description: `${data.weaponsInvolved.join(", ")} detected — cross-reference recent armed cases in ${data.city || "this district"}.`,
      confidence: 78,
      source: "FIR Extraction",
      status: "New",
      nextStep: "Pull weapon/ballistics reports from last 90 days in this police station.",
    });
  }

  if (data.accusedPersons?.length > 0) {
    leads.push({
      type: "Known Accused",
      severity: "Medium",
      description: `${data.accusedPersons.length} accused named — check prior FIRs: ${data.accusedPersons.slice(0, 2).join(", ")}${data.accusedPersons.length > 2 ? " and others" : ""}.`,
      confidence: 85,
      source: "FIR Extraction",
      status: "New",
      nextStep: "Run CNIC / name check against existing suspect database.",
    });
  }

  const violentSections = (data.legalSections || []).filter(s =>
    ["302", "324", "326", "327", "328", "329"].includes(s)
  );
  if (violentSections.length > 0) {
    leads.push({
      type: "Violent Offence",
      severity: "Critical",
      description: `Sections ${violentSections.join(", ")} indicate violent crime — priority investigation required.`,
      confidence: 95,
      source: "Section Analysis",
      status: "New",
      nextStep: "Assign senior investigator and request forensic team within 24h.",
    });
  }

  const pecaSections = (data.legalSections || []).filter(s =>
    ["3", "4", "5", "9", "10", "14", "15", "16", "17", "18", "20", "21", "22", "23"].includes(s)
  );
  if (pecaSections.length > 0) {
    leads.push({
      type: "Cybercrime Indicators",
      severity: "High",
      description: `PECA 2016 section(s) ${pecaSections.join(", ")} — digital evidence preservation required immediately.`,
      confidence: 90,
      source: "Section Analysis",
      status: "New",
      nextStep: "Issue preservation notice to relevant platform(s). Secure device(s) as evidence.",
    });
  }

  if (data.vehiclePlates?.length > 0) {
    leads.push({
      type: "Vehicle Trace",
      severity: "Medium",
      description: `${data.vehiclePlates.length} vehicle plate(s) extracted: ${data.vehiclePlates.join(", ")} — run MTMIS/NADRA trace.`,
      confidence: 88,
      source: "FIR Extraction",
      status: "New",
      nextStep: "Query vehicle registration database and check recent traffic challans.",
    });
  }

  return leads;
}

// ── Severity helpers ──────────────────────────────────────────────────────────
const severityDot = (s) => ({
  Critical: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-yellow-400",
  Low: "bg-blue-400",
}[s] || "bg-slate-400");

const severityBadge = (s) => ({
  Critical: "destructive",
  High: "warning",
}[s] || "default");

// ── Linked case row ───────────────────────────────────────────────────────────
function LinkedCaseRow({ item }) {
  return (
    <div className="border border-slate-200 rounded-xl p-4 flex items-start gap-3 hover:bg-slate-50 transition-all">
      <Link2 className="h-4 w-4 text-deep-ocean shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-mono font-semibold text-slate-700">{item.id || item.linkedCaseId}</span>
          {item.linkType && (
            <span className="text-[10px] bg-deep-ocean/10 text-deep-ocean px-2 py-0.5 rounded-full font-medium">
              {item.linkType.replace(/_/g, " ").toLowerCase()}
            </span>
          )}
          {item.similarityScore != null && (
            <span className="text-[10px] text-slate-400">· {item.similarityScore}% match</span>
          )}
        </div>
        <p className="text-sm text-slate-700 font-medium">{item.title}</p>
        {item.relation && (
          <p className="text-xs text-slate-500 mt-1">{item.relation}</p>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════
export default function StepAIAnalysis({ data, setData }) {
  const entities = data.extractedEntities || {
    persons: [], locations: [], weapons: [], vehicles: [], dates: [],
  };
  const caseId = data.caseId;

  const hasFIR = !!data.firFile || !!data.firFileName || data.manualEntry || !!data.caseId;

  // ── AI Lead streaming state ───────────────────────────────────────────────
  const [streamedLeads, setStreamedLeads] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [streamDone, setStreamDone] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [streamMeta, setStreamMeta] = useState(null);
  const abortRef = useRef(null);
  const hasRunRef = useRef(false); // ← prevents re-trigger on every state update

  // ── Linked cases state ────────────────────────────────────────────────────
  const [linkedCases, setLinkedCases] = useState([]);
  const [linkingDone, setLinkingDone] = useState(false);
  const [linkingRunning, setLinkingRunning] = useState(false);
  const [linkingError, setLinkingError] = useState(null);
  const [linkMeta, setLinkMeta] = useState(null);

  // FIR preview leads (shown before caseId is available)
  const firLeads = hasFIR ? buildFirLeads(data) : [];

  const waitForCase = async (id, retries = 8, delay = 600) => {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/investigator/cases/${id}`,
          { headers: getAuthHeader() }
        );
        if (res.ok) return true;
      } catch { }
      await new Promise(r => setTimeout(r, delay));
    }
    return false;
  };

  useEffect(() => {
    if (!caseId || !hasFIR) return;
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    waitForCase(caseId).then(ready => {
      if (ready) {
        startLeadStream();
        startLinking();
      } else {
        setStreamError("Case not ready after registration — try regenerating manually.");
      }
    });

    return () => abortRef.current?.();
  }, [caseId]);

  const startLeadStream = () => {
    abortRef.current?.();
    setStreamedLeads([]);
    setStreaming(true);
    setStreamDone(false);
    setStreamError(null);
    setStreamMeta(null);

    let leadsCount = 0;

    abortRef.current = streamAiLeads(caseId, {
      onStarted: ({ model }) => {
        console.log("[StepAIAnalysis] Stream started — model:", model, "caseId:", caseId);
        setStreamMeta(m => ({ ...m, model }));
      },

      onContext: ({ depth_score, gap_count }) => {
        setStreamMeta(m => ({ ...m, depth_score, gap_count }));
      },

      onLead: (lead) => {
        leadsCount += 1;
        setStreamedLeads(prev => {
          if (prev.some(l => l.id === lead.id)) return prev;
          return [...prev, { ...lead, status: "New" }];
        });
        setStreamMeta(m => ({ ...m, leads: leadsCount }));
      },

      onRejected: ({ count, issues }) => {
        setStreamMeta(m => ({ ...m, rejected: count, rejectedIssues: issues }));
      },

      onDone: ({ accepted, rejected, duration_ms, reason, raw_lead_count, gap_count }) => {
        setStreamMeta(m => ({ ...m, accepted, rejected, duration_ms, reason, gap_count }));
        setStreaming(false);
        setStreamDone(true);
        abortRef.current = null;

        // Safe to update parent here — we're in an async callback, not a render
        setStreamedLeads(final => {
          setData(d => ({ ...d, aiLeads: final }));
          return final;
        });
      },
      onError: ({ status, detail }) => {
        console.error("[StepAIAnalysis] Stream error:", status, detail);

        if (status === 503) {
          setStreamError("AI service unavailable. Check your GROQ_API_KEY in .env.");
        } else if (status === 504) {
          setStreamError("AI took too long to respond. Try again.");
        } else if (status === 403 || status === 404) {
          setStreamError("Cannot generate leads for this case.");
        } else {
          setStreamError(detail || `Lead generation failed (HTTP ${status || "?"})`);
        }

        setStreaming(false);
        abortRef.current = null;
      },
    });
  };

  // ── Linked cases generation ───────────────────────────────────────────────
  const startLinking = async () => {
    setLinkingRunning(true);
    setLinkingDone(false);
    setLinkingError(null);
    setLinkMeta(null);
    setLinkedCases([]);
    try {
      // Step 1 — regenerate (writes to DB, returns counts only)
      const res = await regenerateLinkedCases(caseId);
      setLinkMeta({
        linksFound: res.linksFound ?? 0,
        newLinks: res.newLinks ?? 0,
        updatedLinks: res.updatedLinks ?? 0,
        semanticAvailable: res.semanticAvailable ?? false,
      });

      // Step 2 — fetch the actual linked case rows
      if ((res.linksFound ?? 0) > 0) {
        const linked = await fetchLinkedCases(caseId);
        const cases = Array.isArray(linked) ? linked : (linked?.items ?? linked?.links ?? []);
        setLinkedCases(cases);
      }

      setLinkingDone(true);
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message || "Linked case generation failed.";
      setLinkingError(detail);
    } finally {
      setLinkingRunning(false);
    }
  };

  // Manual re-run resets the guard so the user can explicitly trigger again
  const handleRerunLeads = () => {
    hasRunRef.current = true; // already mounted — guard stays true, just call directly
    startLeadStream();
  };

  const handleRerunLinking = () => {
    startLinking();
  };

  // ── Display logic ─────────────────────────────────────────────────────────
  const displayLeads = streamedLeads.length > 0 ? streamedLeads : firLeads;
  const isPreview = streamedLeads.length === 0 && !streamDone;
  const showStatement = !!data.statementEnglish;

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={Brain}
        title="AI Analysis & Investigative Leads"
        subtitle="AI leads and linked cases are generated automatically after case registration."
      />

      {!hasFIR ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-500">
          <Brain className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No FIR document was uploaded — AI analysis skipped.</p>
          <p className="text-xs mt-1">You can add leads manually from the case detail page.</p>
        </div>
      ) : (
        <>
          {/* ── Stats ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "AI Confidence", value: `${data.confidence || 0}%`, color: "text-deep-ocean" },
              { label: "FIR Completeness", value: `${data.completeness || 0}%`, color: "text-emerald-600" },
              { label: "Entities Extracted", value: Object.values(entities).flat().length, color: "text-purple-600" },
            ].map(s => (
              <Card key={s.label} className="p-4 text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-1 font-medium">{s.label}</p>
              </Card>
            ))}
          </div>

          {/* ── Extracted entities ── */}
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

          {/* ── Missing fields ── */}
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

          {/* ══════════════════════════════════════════════════════════════
              SECTION 1 — AI Investigative Leads
          ══════════════════════════════════════════════════════════════ */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-deep-ocean" />
                  {streamDone
                    ? "AI Investigative Leads"
                    : streaming
                      ? "Generating AI Leads…"
                      : isPreview && !caseId
                        ? "FIR-Derived Leads (Preview)"
                        : "AI Investigative Leads"}
                </h4>

                {/* Post-stream summary */}
                {streamDone && streamMeta && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {streamMeta.accepted} lead{streamMeta.accepted !== 1 ? "s" : ""} generated
                    {streamMeta.rejected > 0 && ` · ${streamMeta.rejected} rejected`}
                    {streamMeta.duration_ms && ` · ${streamMeta.duration_ms}ms`}
                    {streamMeta.model && ` · ${streamMeta.model}`}
                  </p>
                )}
              </div>

              {/* Re-run button */}
              {caseId && !streaming && (
                <button
                  onClick={handleRerunLeads}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                </button>
              )}
            </div>

            {/* Streaming progress */}
            {streaming && (
              <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>
                  AI is analysing the case
                  {streamMeta?.model && <span className="text-blue-400"> · {streamMeta.model}</span>}
                  {streamedLeads.length > 0 && (
                    <span className="text-blue-700 font-medium">
                      {" "}— {streamedLeads.length} lead{streamedLeads.length !== 1 ? "s" : ""} so far
                    </span>
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
                <span>Leads saved to case — visible in the Investigation Leads tab.</span>
              </div>
            )}

            {/* Lead cards */}
            <div className="space-y-3">
              {displayLeads.map((lead, idx) => (
                <div
                  key={idx}
                  className={`border rounded-xl p-4 flex items-start gap-3 transition-all
                    ${streaming && streamedLeads.includes(lead)
                      ? "border-blue-200 bg-blue-50/40"
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

          {/* ══════════════════════════════════════════════════════════════
              SECTION 2 — Linked Cases
          ══════════════════════════════════════════════════════════════ */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-deep-ocean" />
                  {linkingDone
                    ? "Linked Cases"
                    : linkingRunning
                      ? "Finding Linked Cases…"
                      : "Linked Cases"}
                </h4>
                {linkingDone && linkMeta && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {linkMeta.linksFound} linked case{linkMeta.linksFound !== 1 ? "s" : ""} found
                    {linkMeta.newLinks > 0 && ` · ${linkMeta.newLinks} new`}
                    {!linkMeta.semanticAvailable && " · structured match only"}
                  </p>
                )}
              </div>

              {/* Re-run linking */}
              {caseId && !linkingRunning && (
                <button
                  onClick={handleRerunLinking}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Re-run
                </button>
              )}
            </div>

            {/* Linking in progress */}
            {linkingRunning && (
              <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 mb-3">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>Searching for related cases across the database…</span>
              </div>
            )}

            {/* Linking error */}
            {linkingError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-700 font-medium">Linked case generation failed</p>
                  <p className="text-xs text-red-500 mt-0.5">{linkingError}</p>
                </div>
              </div>
            )}

            {/* No caseId placeholder */}
            {!caseId && !linkingRunning && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-slate-400">
                <Link2 className="h-6 w-6 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Linked case analysis runs automatically after the case is submitted.</p>
              </div>
            )}

            {/* Done — linked case rows */}
            {linkingDone && (
              <>
                {linkedCases.length > 0 ? (
                  <div className="space-y-3">
                    {linkedCases.map((item, idx) => (
                      <LinkedCaseRow key={item.id || item.linkedCaseId || idx} item={item} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                    <CheckCircle2 className="h-5 w-5 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-500">
                      No related cases found. This appears to be a unique incident.
                    </p>
                  </div>
                )}

                {/* Semantic warning */}
                {!linkMeta?.semanticAvailable && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      Semantic narrative matching was unavailable — results are based on structured data only.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Full FIR statement ── */}
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