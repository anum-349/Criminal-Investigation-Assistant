import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText, Download, Eye, ChevronRight, ArrowLeft,
    LayoutDashboard, Filter, Calendar, CheckCircle2,
    AlertTriangle, Clock, Users, MapPin, Brain,
    Loader2, Printer, FileDown, X
} from 'lucide-react';
import Header from '@/components/Header';
import { Card } from '@/components/ui/Card';

// ── Install: npm install jspdf html2canvas ────────────────────────────────────
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ── Report type definitions ───────────────────────────────────────────────────
const REPORT_TYPES = [
    {
        id:          'case_summary',
        label:       'Case Summary',
        icon:        FileText,
        color:       'border-blue-200 bg-blue-50',
        iconColor:   'text-blue-700',
        description: 'Full overview of a case including suspects, victims, evidence, and timeline.',
        fields:      ['caseId', 'dateRange'],
    },
    {
        id:          'crime_hotspot',
        label:       'Crime Hotspot',
        icon:        MapPin,
        color:       'border-red-200 bg-red-50',
        iconColor:   'text-red-700',
        description: 'Geographic distribution of crimes by province, city, and severity.',
        fields:      ['dateRange', 'province', 'crimeType'],
    },
    {
        id:          'case_timeline',
        label:       'Case Timeline',
        icon:        Clock,
        color:       'border-purple-200 bg-purple-50',
        iconColor:   'text-purple-700',
        description: 'Chronological event log for a specific case from registration to current status.',
        fields:      ['caseId'],
    },
    {
        id:          'leads_report',
        label:       'AI Leads Report',
        icon:        Brain,
        color:       'border-green-200 bg-green-50',
        iconColor:   'text-green-700',
        description: 'All AI-generated investigative leads with confidence scores and evidence links.',
        fields:      ['caseId', 'minConfidence'],
    },
    {
        id:          'suspect_report',
        label:       'Suspect Analysis',
        icon:        Users,
        color:       'border-orange-200 bg-orange-50',
        iconColor:   'text-orange-700',
        description: 'Detailed suspect profiles across cases with cross-reference analysis.',
        fields:      ['dateRange', 'crimeType'],
    },
];

const PROVINCES   = ['All Provinces', 'Punjab', 'Sindh', 'Balochistan', 'KPK', 'ICT', 'GB'];
const CRIME_TYPES = ['All Types', 'Murder', 'Robbery', 'Theft', 'Assault', 'Fraud', 'Kidnapping', 'Drug'];
const FORMATS     = ['PDF', 'CSV'];

// ── Mock preview data ─────────────────────────────────────────────────────────
const MOCK_PREVIEW = {
    case_summary: {
        title:    'Case Summary Report — C-2053',
        sections: [
            { heading: 'Case Overview', rows: [['Case ID','C-2053'],['Type','Murder – Homicide'],['Status','Under Investigation'],['Assigned','Inspector Rana Ali Khan'],['Registered','15 Dec 2025'],['Days Open','89']] },
            { heading: 'Suspects',      rows: [['Name','Bilal Hussain'],['CNIC','35201-1234567-1'],['Status','Detained'],['—','—'],['Name','Unknown Male'],['Status','At Large']] },
            { heading: 'Evidence',      rows: [['#','Item','Collected'],['1','CCTV Footage','16 Dec 2025'],['2','DNA Sample','17 Dec 2025'],['3','Weapon (knife)','16 Dec 2025']] },
        ],
    },
    crime_hotspot: {
        title:    'Crime Hotspot Report — Mar 2026',
        sections: [
            { heading: 'Hotspot Summary', rows: [['Province','Cases','Severity'],['Punjab','45','High'],['Sindh','38','High'],['Balochistan','14','Medium'],['KPK','12','Medium'],['ICT','5','Low']] },
            { heading: 'Top Crime Types', rows: [['Type','Count','Change'],['Robbery','45','+18%'],['Theft','67','-6%'],['Murder','28','+27%'],['Assault','39','+18%']] },
        ],
    },
    case_timeline: {
        title:    'Case Timeline Report — C-2053',
        sections: [
            { heading: 'Timeline Events', rows: [['Date','Time','Event'],['15 Dec 2025','10:45 PM','Victim found by family'],['15 Dec 2025','11:00 PM','Police notified; scene secured'],['15 Dec 2025','11:30 PM','Scene secured by Clifton Division'],['16 Dec 2025','9:00 AM','Forensic team arrives'],['16 Dec 2025','12:00 PM','CCTV footage recovered'],['16 Dec 2025','3:00 PM','Initial suspect interviews']] },
        ],
    },
    leads_report: {
        title:    'AI Leads Report — C-2053',
        sections: [
            { heading: 'Generated Leads', rows: [['#','Lead','Confidence','Status'],['1','Suspect linked to prior robbery case','92%','Flagged'],['2','Weapon matches C-2040 evidence','87%','Pending'],['3','Location pattern near Case C-2047','74%','Unverified'],['4','Witness statement inconsistency','68%','Review']] },
        ],
    },
    suspect_report: {
        title:    'Suspect Analysis Report — All Types',
        sections: [
            { heading: 'Suspect Overview', rows: [['Name','Cases','Status','Risk'],['Bilal Hussain','3','Detained','High'],['Unknown Male','1','At Large','Critical'],['Ahmed Raza','2','Released','Medium']] },
        ],
    },
};

// ── Preview Table ─────────────────────────────────────────────────────────────
const PreviewTable = ({ rows }) => (
    <table className="w-full text-xs border-collapse mb-4">
        <tbody>
            {rows.map((row, ri) => (
                <tr key={ri} className={ri === 0 && rows[0].length > 2 ? 'bg-deep-ocean text-white' : ri % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                    {row.map((cell, ci) => (
                        <td key={ci} className="px-3 py-1.5 border border-slate-200 text-slate-800"
                            style={{ color: ri === 0 && rows[0].length > 2 ? 'white' : undefined }}>
                            {cell}
                        </td>
                    ))}
                </tr>
            ))}
        </tbody>
    </table>
);

// ═════════════════════════════════════════════════════════════════════════════
const ReportPage = () => {
    const navigate = useNavigate();

    // ── Step state: 'select' → 'configure' → 'preview' ───────────────────
    const [step,         setStep]         = useState('select');
    const [selectedType, setSelectedType] = useState(null);
    const [format,       setFormat]       = useState('PDF');
    const [generating,   setGenerating]   = useState(false);
    const [previewOpen,  setPreviewOpen]  = useState(false);
    const previewRef = useRef(null);

    // ── Filter state ─────────────────────────────────────────────────────
    const [filters, setFilters] = useState({
        caseId:        '',
        dateFrom:      '',
        dateTo:        '',
        province:      'All Provinces',
        crimeType:     'All Types',
        minConfidence: '60',
    });
    const setF = (key) => (e) => setFilters(f => ({ ...f, [key]: e.target.value }));

    // ── History ───────────────────────────────────────────────────────────
    const [history, setHistory] = useState([
        { id: 1, type: 'Case Summary',    date: '12 Mar 2026', format: 'PDF', status: 'success' },
        { id: 2, type: 'Crime Hotspot',   date: '10 Mar 2026', format: 'CSV', status: 'success' },
        { id: 3, type: 'AI Leads Report', date: '08 Mar 2026', format: 'PDF', status: 'success' },
    ]);

    const currentType = REPORT_TYPES.find(r => r.id === selectedType);
    const preview     = MOCK_PREVIEW[selectedType];

    // ── Validation ────────────────────────────────────────────────────────
    const validate = () => {
        if (!currentType) return false;
        if (currentType.fields.includes('caseId') && !filters.caseId.trim()) return false;
        return true;
    };

    // ── Generate PDF using jsPDF + html2canvas ────────────────────────────
    const handleGenerate = async () => {
        if (!validate()) return;
        setGenerating(true);

        try {
            if (format === 'CSV') {
                // Build CSV from preview data
                const rows = preview.sections.flatMap(s => s.rows);
                const csv  = rows.map(r => r.join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement('a');
                a.href     = url;
                a.download = `${selectedType}_report.csv`;
                a.click();
                URL.revokeObjectURL(url);
            } else {
                // PDF — screenshot the preview panel
                // Dynamic import so app loads even if jsPDF not installed yet
                const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
                    import('jspdf'),
                    import('html2canvas'),
                ]);

                // Make sure preview is open before capturing
                setPreviewOpen(true);
                await new Promise(r => setTimeout(r, 300)); // wait for render

                const el = previewRef.current;
                if (!el) throw new Error('Preview element not found');

                // Fix oklch colors in clone
                const canvas = await html2canvas(el, {
                    backgroundColor: '#ffffff',
                    scale:           2,
                    useCORS:         true,
                    logging:         false,
                    x:      -16,
                    y:      -16,
                    width:  el.offsetWidth  + 32,
                    height: el.offsetHeight + 32,
                    onclone: (clonedDoc) => {
                        const s = clonedDoc.createElement('style');
                        s.textContent = `* { background-color: revert !important; color: revert !important; border-color: revert !important; } body { background: white !important; }`;
                        clonedDoc.head.appendChild(s);
                    },
                });

                const imgData = canvas.toDataURL('image/png');
                const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const pdfW    = pdf.internal.pageSize.getWidth();
                const pdfH    = (canvas.height * pdfW) / canvas.width;

                // If content exceeds one page, split across pages
                let y = 0;
                const pageH = pdf.internal.pageSize.getHeight();
                while (y < pdfH) {
                    pdf.addImage(imgData, 'PNG', 0, -y, pdfW, pdfH);
                    y += pageH;
                    if (y < pdfH) pdf.addPage();
                }

                pdf.save(`${selectedType}_report.pdf`);
            }

            // Add to history
            setHistory(h => [{
                id:     h.length + 1,
                type:   currentType.label,
                date:   new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                format,
                status: 'success',
            }, ...h]);

        } catch (err) {
            console.error('Report generation failed:', err);
            alert('Report generation failed. Make sure jspdf and html2canvas are installed:\nnpm install jspdf html2canvas');
        } finally {
            setGenerating(false);
        }
    };

    // ── Field renderer ────────────────────────────────────────────────────
    const renderFields = () => {
        if (!currentType) return null;
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentType.fields.includes('caseId') && (
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Case ID <span className="text-red-500">*</span>
                        </label>
                        <input type="text" value={filters.caseId} onChange={setF('caseId')}
                            placeholder="e.g. C-2053"
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean" />
                    </div>
                )}
                {currentType.fields.includes('dateRange') && (
                    <>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Date From</label>
                            <input type="date" value={filters.dateFrom} onChange={setF('dateFrom')}
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Date To</label>
                            <input type="date" value={filters.dateTo} onChange={setF('dateTo')}
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean" />
                        </div>
                    </>
                )}
                {currentType.fields.includes('province') && (
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Province</label>
                        <select value={filters.province} onChange={setF('province')}
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean">
                            {PROVINCES.map(p => <option key={p}>{p}</option>)}
                        </select>
                    </div>
                )}
                {currentType.fields.includes('crimeType') && (
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Crime Type</label>
                        <select value={filters.crimeType} onChange={setF('crimeType')}
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean">
                            {CRIME_TYPES.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                )}
                {currentType.fields.includes('minConfidence') && (
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Min. Confidence: <span className="text-deep-ocean font-bold">{filters.minConfidence}%</span>
                        </label>
                        <input type="range" min="50" max="95" step="5" value={filters.minConfidence}
                            onChange={setF('minConfidence')}
                            className="w-full accent-deep-ocean" />
                        <div className="flex justify-between text-[10px] text-slate-400">
                            <span>50%</span><span>95%</span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
            <Header />

            <main className="max-w-6xl mx-auto px-4 lg:px-6 py-8 space-y-6">

                {/* Breadcrumb */}
                <div className="flex items-center justify-between">
                    <nav className="flex items-center gap-1.5 text-xs text-slate-500">
                        <button onClick={() => navigate('/investigator')} className="hover:text-slate-800 cursor-pointer transition-colors">Dashboard</button>
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-slate-800 font-medium">Generate Report</span>
                    </nav>
                    <div className="flex gap-2">
                        <button onClick={() => navigate(-1)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer border border-slate-300 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                            <ArrowLeft className="h-3.5 w-3.5" /> Back
                        </button>
                        <button onClick={() => navigate('/investigator')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer bg-deep-ocean text-xs font-medium text-white hover:bg-[#162f42] transition-colors">
                            <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                        </button>
                    </div>
                </div>

                {/* Page title */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Generate Report</h1>
                    <p className="text-sm text-slate-500 mt-1">Select a report type, configure filters, preview and export as PDF or CSV</p>
                </div>

                {/* ── Step indicator ── */}
                <div className="flex items-center gap-2">
                    {[['select','1','Select Type'],['configure','2','Configure'],['preview','3','Preview & Export']].map(([id, num, label], i) => (
                        <div key={id} className="flex items-center gap-2">
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                                ${step === id ? 'bg-deep-ocean text-white' : ['select','configure','preview'].indexOf(step) > i ? 'bg-green-100 text-green-700' : 'bg-white border border-slate-200 text-slate-400'}`}>
                                {['select','configure','preview'].indexOf(step) > i
                                    ? <CheckCircle2 className="h-3.5 w-3.5" />
                                    : <span>{num}</span>
                                }
                                {label}
                            </div>
                            {i < 2 && <div className="w-6 h-px bg-slate-300" />}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── Main area ── */}
                    <div className="lg:col-span-2 space-y-4">

                        {/* ── STEP 1: SELECT TYPE ── */}
                        {step === 'select' && (
                            <Card className="p-6 space-y-4">
                                <h2 className="text-base font-bold text-slate-800">Select Report Type</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {REPORT_TYPES.map(({ id, label, icon: Icon, color, iconColor, description }) => (
                                        <button key={id}
                                            onClick={() => { setSelectedType(id); setStep('configure'); }}
                                            className={`rounded-lg border-2 p-4 text-left transition-all hover:shadow-md
                                                ${selectedType === id ? 'border-deep-ocean ring-2 ring-deep-ocean/20' : color}`}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className={`p-2 rounded-lg bg-white border border-slate-200`}>
                                                    <Icon className={`h-4 w-4 ${iconColor}`} />
                                                </div>
                                                <span className="text-sm font-bold text-slate-800">{label}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
                                        </button>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* ── STEP 2: CONFIGURE ── */}
                        {step === 'configure' && currentType && (
                            <Card className="p-6 space-y-5">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setStep('select')}
                                        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                                        <ArrowLeft className="h-4 w-4 text-slate-500" />
                                    </button>
                                    <div>
                                        <h2 className="text-base font-bold text-slate-800">{currentType.label}</h2>
                                        <p className="text-xs text-slate-500">{currentType.description}</p>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-4 space-y-4">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        <Filter className="h-3.5 w-3.5" /> Report Filters
                                    </div>
                                    {renderFields()}
                                </div>

                                {/* Format selector */}
                                <div className="border-t border-slate-100 pt-4">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Export Format</p>
                                    <div className="flex gap-2">
                                        {FORMATS.map(f => (
                                            <button key={f} onClick={() => setFormat(f)}
                                                className={`flex items-center cursor-pointer gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all
                                                    ${format === f ? 'bg-deep-ocean text-white border-deep-ocean' : 'bg-white border-slate-300 text-slate-600 hover:border-deep-ocean'}`}>
                                                {f === 'PDF' ? <FileDown className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => { setStep('preview'); setPreviewOpen(true); }}
                                        disabled={!validate()}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                                        <Eye className="h-4 w-4" /> Preview
                                    </button>
                                    <button onClick={handleGenerate}
                                        disabled={!validate() || generating}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-deep-ocean text-white text-sm font-medium hover:bg-[#162f42] disabled:opacity-40 transition-colors">
                                        {generating
                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                            : <Download className="h-4 w-4" />
                                        }
                                        {generating ? 'Generating…' : `Export ${format}`}
                                    </button>
                                </div>

                                {!validate() && currentType.fields.includes('caseId') && !filters.caseId && (
                                    <p className="text-xs text-red-500 flex items-center gap-1">
                                        <AlertTriangle className="h-3.5 w-3.5" /> Case ID is required for this report type
                                    </p>
                                )}
                            </Card>
                        )}

                        {/* ── STEP 3: PREVIEW ── */}
                        {step === 'preview' && preview && (
                            <Card className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setStep('configure')}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                                            <ArrowLeft className="h-4 w-4 text-slate-500" />
                                        </button>
                                        <h2 className="text-base font-bold text-slate-800">Preview</h2>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => window.print()}
                                            className="flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                                            <Printer className="h-3.5 w-3.5" /> Print
                                        </button>
                                        <button onClick={handleGenerate} disabled={generating}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer bg-deep-ocean text-xs font-medium text-white hover:bg-[#162f42] disabled:opacity-50 transition-colors">
                                            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                            {generating ? 'Exporting…' : `Export ${format}`}
                                        </button>
                                    </div>
                                </div>

                                {/* Preview panel — this is what gets captured as PDF */}
                                <div ref={previewRef}
                                    className="bg-white border border-slate-200 rounded-lg p-8 space-y-6 print:shadow-none">

                                    {/* Report header */}
                                    <div className="border-b-2 border-deep-ocean pb-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Criminal Investigation Assistant</p>
                                                <h1 className="text-xl font-bold text-deep-ocean mt-1">{preview.title}</h1>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Generated: {new Date().toLocaleString()} &nbsp;|&nbsp;
                                                    Format: {format} &nbsp;|&nbsp;
                                                    Filters: {filters.caseId || 'All cases'}, {filters.province}, {filters.crimeType}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className="w-10 h-10 rounded-lg bg-deep-ocean flex items-center justify-center">
                                                    <FileText className="h-5 w-5 text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sections */}
                                    {preview.sections.map((section, si) => (
                                        <div key={si} className="space-y-2">
                                            <h3 className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded">
                                                {section.heading}
                                            </h3>
                                            <PreviewTable rows={section.rows} />
                                        </div>
                                    ))}

                                    {/* Footer */}
                                    <div className="border-t border-slate-200 pt-3 flex justify-between text-[10px] text-slate-400">
                                        <span>CONFIDENTIAL — For authorized personnel only</span>
                                        <span>CIA System — Page 1</span>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* ── Right sidebar: recent reports ── */}
                    <div className="space-y-4">
                        <Card className="p-5">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-slate-500" /> Recent Reports
                            </h3>
                            <div className="space-y-3">
                                {history.map(h => (
                                    <div key={h.id} className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                                        <div className="flex items-start gap-2">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-xs font-medium text-slate-800">{h.type}</p>
                                                <p className="text-[10px] text-slate-400">{h.date}</p>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0
                                            ${h.format === 'PDF' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                            {h.format}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Tips */}
                        <Card className="p-5 bg-blue-50 border-blue-200">
                            <h3 className="text-xs font-bold text-blue-800 mb-2">💡 Tips</h3>
                            <ul className="text-xs text-blue-700 space-y-1.5">
                                <li>• Use <strong>Case Summary</strong> for full case documentation</li>
                                <li>• <strong>AI Leads</strong> report requires a specific Case ID</li>
                                <li>• Set confidence ≥80% for high-quality leads only</li>
                                <li>• Preview before exporting to verify data is correct</li>
                                <li>• CSV format is best for importing into spreadsheets</li>
                            </ul>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ReportPage;

