/**
 * StepAIAnalysis — Step 9
 * ─────────────────────────────────────────────────────────────────────────────
 * Reviews AI-extracted entities and shows suggested leads BEFORE the user
 * hits Submit.
 *
 * What changed:
 *   Previously the leads list was hard-coded in the component and discarded
 *   on submit — they never made it to the database. The component now
 *   COMMITS those leads into `formData.aiLeads` (via setData) the first
 *   time it mounts after FIR processing finishes, so registerCaseFull
 *   actually persists them.
 *
 *   The commit is gated on:
 *     - `hasFIR` so we don't seed leads when the user skipped the FIR.
 *     - `formData.aiLeads` being empty so a user can edit/remove leads on
 *       Step 9 (in a future iteration) without us overwriting their edits
 *       every render.
 *
 *   When the real AI extraction endpoint exists, replace `mockLeads` with
 *   the response from that endpoint — `formData.aiLeads` is already the
 *   contract with caseApi.js, so nothing downstream needs to change.
 *
 * Props:
 *   data    — formData
 *   setData — full formData setter (NEW; previous version was read-only)
 */

import { useEffect } from "react";
import { Brain, AlertTriangle } from "lucide-react";
import { SectionHeading } from "@/pages/form/case-forms/CaseFormFields/page";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function StepAIAnalysis({ data, setData }) {
  const entities = data.extractedEntities || { persons: [], locations: [], weapons: [], vehicles: [], dates: [] };
  const hasFIR = !!data.firFile || !!data.firFileName || data.manualEntry;

  // Suggested leads — currently mocked off the case fields. When the real
  // AI lead pipeline lands, swap this for the API response. Shape matches
  // what services/leadApi.js → buildLeadPayload expects, so caseApi.js can
  // ship these straight to /api/investigator/cases/{caseId}/leads after
  // the case is created.
  const mockLeads = [
    {
      type:         "Case Linkage",
      severity:     "High",
      description:  "Weapon pattern (pistol) matches Case C-2040 (Armed Robbery – Saddar, RWP)",
      confidence:   82,
      source:       "AI Analysis",
      status:       "New",
      weaponPattern: data.weaponUsed || "Pistol",
      locationArea: data.area || data.city || "",
      nextStep:     "Cross-reference suspect IDs from C-2040 with current case.",
    },
    {
      type:         "Suspect Pattern",
      severity:     "Medium",
      description:  "Three-suspect team MO matches Case C-2047 (Drug Trafficking – Port Area)",
      confidence:   74,
      source:       "AI Analysis",
      status:       "New",
      similarCaseId: "C-2047",
      nextStep:     "Pull suspect profiles from C-2047 and compare physical descriptions.",
    },
    {
      type:         "Location Pattern",
      severity:     "Critical",
      description:  "Crime hotspot analysis shows 5 similar incidents within 2 km radius in last 30 days",
      confidence:   90,
      source:       "AI Analysis",
      status:       "New",
      locationArea: data.area || data.city || "",
      nextStep:     "Request additional patrols in the area. Check CCTV from neighboring incidents.",
    },
  ];

  // ── Commit AI leads to formData on first mount of this step ──────────────
  // Only writes when (a) we actually have FIR context and (b) there's
  // nothing already on aiLeads (so we don't overwrite future edits on
  // every re-render). This is what makes the leads survive Submit.
  useEffect(() => {
    if (!hasFIR) return;
    if (Array.isArray(data.aiLeads) && data.aiLeads.length > 0) return;
    if (typeof setData !== "function") return;          // backward compat

    setData(d => ({ ...d, aiLeads: mockLeads }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFIR]);

  // What we render is whatever's currently in formData.aiLeads, falling
  // back to the local mock for the no-setData (legacy) call site. This
  // way, if a future iteration adds inline edit/delete for AI leads on
  // this step, the user sees their edits reflected.
  const displayLeads = Array.isArray(data.aiLeads) && data.aiLeads.length
    ? data.aiLeads
    : mockLeads;

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
          <p className="text-xs mt-1">You can also skip this — the case will be registered without leads.</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "AI Confidence",      value: `${data.confidence || 0}%`,                           color: "text-deep-ocean"  },
              { label: "FIR Completeness",   value: `${data.completeness || 0}%`,                         color: "text-emerald-600" },
              { label: "Entities Extracted", value: Object.values(entities).flat().length,                color: "text-purple-600"  },
            ].map(s => (
              <Card key={s.label} className="p-4 text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-1 font-medium">{s.label}</p>
              </Card>
            ))}
          </div>

          {/* Entities */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-3">Extracted Entities</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(entities).map(([key, vals]) =>
                vals.length > 0 && (
                  <div key={key} className="border border-slate-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-slate-500 capitalize tracking-wider mb-2">{key}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {vals.map((v, i) => <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">{v}</span>)}
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

          {/* Leads */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-3">
              Suggested Investigative Leads
              <span className="ml-2 text-xs font-normal text-slate-400">
                — Will be saved to the case on submit
              </span>
            </h4>
            <div className="space-y-3">
              {displayLeads.map((lead, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                    lead.severity === "Critical" ? "bg-red-500"
                    : lead.severity === "High"   ? "bg-orange-500"
                    : "bg-yellow-500"}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-semibold text-slate-500 uppercase">{lead.type}</span>
                      <Badge variant={lead.severity === "Critical" ? "destructive" : lead.severity === "High" ? "warning" : "default"}>
                        {lead.severity}
                      </Badge>
                      {lead.confidence != null && (
                        <span className="text-[10px] text-slate-500">· {lead.confidence}% confidence</span>
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Keep the named export for callers that imported `{ StepAIAnalysis }`.
export { StepAIAnalysis as StepAIAnalysisNamed };