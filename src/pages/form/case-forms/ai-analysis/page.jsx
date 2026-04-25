

// ─────────────────────────────────────────────────────────────────────────────
/**
 * StepAIAnalysis.jsx  —  Step 8
 * Place at: src/pages/investigator/case-forms/StepAIAnalysis.jsx
 */
import { Brain, AlertTriangle } from "lucide-react";
import { SectionHeading } from "../CaseFormFields/page";
import { Card } from "../../../../components/ui/Card";
import { Badge } from "../../../../components/ui/Badge";

export function StepAIAnalysis({ data }) {
  const entities = data.extractedEntities || { persons: [], locations: [], weapons: [], vehicles: [], dates: [] };
  const hasFIR = !!data.firFile || data.manualEntry;

  const mockLeads = [
    { id: "L-001", type: "Case Linkage",    desc: "Weapon pattern (pistol) matches Case C-2040 (Armed Robbery – Saddar, RWP)",             confidence: 82, severity: "High"     },
    { id: "L-002", type: "Suspect Pattern", desc: "Three-suspect team MO matches Case C-2047 (Drug Trafficking – Port Area)",               confidence: 74, severity: "Medium"   },
    { id: "L-003", type: "Location Pattern",desc: "Crime hotspot analysis shows 5 similar incidents within 2 km radius in last 30 days",   confidence: 90, severity: "Critical" },
  ];

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
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "AI Confidence",       value: `${data.confidence || 0}%`,                         color: "text-deep-ocean"   },
              { label: "FIR Completeness",    value: `${data.completeness || 0}%`,                       color: "text-emerald-600"  },
              { label: "Entities Extracted",  value: Object.values(entities).flat().length,              color: "text-purple-600"   },
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
            <h4 className="text-sm font-bold text-slate-700 mb-3">Suggested Investigative Leads</h4>
            <div className="space-y-3">
              {mockLeads.map(lead => (
                <div key={lead.id} className="border border-slate-200 rounded-xl p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${lead.severity === "Critical" ? "bg-red-500" : lead.severity === "High" ? "bg-orange-500" : "bg-yellow-500"}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase">{lead.type}</span>
                      <Badge variant={lead.severity === "Critical" ? "destructive" : lead.severity === "High" ? "warning" : "default"}>{lead.severity}</Badge>
                    </div>
                    <p className="text-sm text-slate-700">{lead.desc}</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-slate-500 mb-0.5">
                        <span>Confidence</span><span>{lead.confidence}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-deep-ocean" style={{ width: `${lead.confidence}%` }} />
                      </div>
                    </div>
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
export default StepAIAnalysis;