import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText,
    Download,
    Eye,
    ChevronRight,
    ArrowLeft,
    LayoutDashboard,
    Filter,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Users,
    MapPin,
    Brain,
    Loader2,
    Printer,
    FileDown,
} from 'lucide-react';

import Header from '@/components/Header';
import { Card } from '@/components/ui/Card';
import logoSrc from '@/assets/logo.png'

import { generateReport, fetchReportHistory } from "@/services/reportApi";

// ─────────────────────────────────────────────────────────────────────────────
// REPORT TYPES
// ─────────────────────────────────────────────────────────────────────────────

const REPORT_TYPES = [
    {
        id: 'case_summary',
        label: 'Case Summary',
        icon: FileText,
        color: 'border-blue-200 bg-blue-50',
        iconColor: 'text-blue-700',
        description:
            'Full overview of a case including suspects, victims, evidence, and timeline.',
        fields: ['caseId', 'dateRange'],
    },
    {
        id: 'crime_hotspot',
        label: 'Crime Hotspot',
        icon: MapPin,
        color: 'border-red-200 bg-red-50',
        iconColor: 'text-red-700',
        description:
            'Geographic distribution of crimes by province, city, and severity.',
        fields: ['dateRange', 'province', 'crimeType'],
    },
    {
        id: 'case_timeline',
        label: 'Case Timeline',
        icon: Clock,
        color: 'border-purple-200 bg-purple-50',
        iconColor: 'text-purple-700',
        description:
            'Chronological event log for a specific case from registration to current status.',
        fields: ['caseId'],
    },
    {
        id: 'leads_report',
        label: 'AI Leads Report',
        icon: Brain,
        color: 'border-green-200 bg-green-50',
        iconColor: 'text-green-700',
        description:
            'All AI-generated investigative leads with confidence scores and evidence links.',
        fields: ['caseId', 'minConfidence'],
    },
    {
        id: 'suspect_report',
        label: 'Suspect Analysis',
        icon: Users,
        color: 'border-orange-200 bg-orange-50',
        iconColor: 'text-orange-700',
        description:
            'Detailed suspect profiles across cases with cross-reference analysis.',
        fields: ['dateRange', 'crimeType'],
    },
];

const PROVINCES = [
    'All Provinces',
    'Punjab',
    'Sindh',
    'Balochistan',
    'KPK',
    'ICT',
    'GB',
];

const toBase64 = (src) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = src;
    });

const FORMATS = ['PDF', 'CSV'];

const PreviewTable = ({ rows }) => (
    <table className="w-full border-collapse text-xs overflow-hidden rounded-lg border border-slate-200">
        <tbody>
            {rows.map((row, ri) => (
                <tr
                    key={ri}
                    className={
                        ri === 0 && rows[0].length > 2
                            ? 'bg-[#1b3c53] text-white'
                            : ri % 2 === 0
                                ? 'bg-[#f8fafc]'
                                : 'bg-white'
                    }
                >
                    {row.map((cell, ci) => (
                        <td
                            key={ci}
                            className={`px-4 py-2 border border-slate-200 ${ri === 0 && rows[0].length > 2
                                ? 'text-white font-semibold'
                                : 'text-slate-700'
                                }`}
                        >
                            {cell}
                        </td>
                    ))}
                </tr>
            ))}
        </tbody>
    </table>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const ReportPage = () => {
    const navigate = useNavigate();

    const previewRef = useRef(null);

    const [step, setStep] = useState('select');

    const [selectedType, setSelectedType] = useState(null);

    const [format, setFormat] = useState('PDF');

    const [livePreview, setLivePreview] = useState(null);

    const [generating, setGenerating] = useState(false);

    const [previewLoading, setPreviewLoading] = useState(false);

    const [previewError, setPreviewError] = useState(null);

    const [history, setHistory] = useState([]);

    const [filters, setFilters] = useState({
        caseId: '',
        dateFrom: '',
        dateTo: '',
        province: 'All Provinces',
        crimeType: 'All Types',
        minConfidence: '60',
    });
    // At component level — load once on mount
    const logoRef = useRef(null);

    const [countHistory, setCountHistory] = useState(6)

    useEffect(() => {
        toBase64(logoSrc).then(b64 => { logoRef.current = b64; }).catch(() => { });
    }, []);

    const setF =
        (key) =>
            (e) =>
                setFilters((f) => ({
                    ...f,
                    [key]: e.target.value,
                }));

    const currentType = REPORT_TYPES.find(
        (r) => r.id === selectedType
    );

    // ─────────────────────────────────────────────────────────────────────────
    // HISTORY
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        fetchReportHistory()
            .then((d) =>
                setHistory(
                    d.items.map((r) => ({
                        id: r.id,
                        type: r.report_type
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, (c) =>
                                c.toUpperCase()
                            ),
                        date: new Date(
                            r.generated_at
                        ).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                        }),
                        format: r.format,
                        status: 'success',
                    }))
                )
            )
            .catch(() => { });
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────────────────────────────────

    const validate = () => {
        if (!currentType) return false;

        if (
            currentType.fields.includes('caseId') &&
            !filters.caseId.trim()
        ) {
            return false;
        }

        return true;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // GENERATE PREVIEW
    // ─────────────────────────────────────────────────────────────────────────

    const handlePreview = async () => {
        if (!validate() || previewLoading) return;

        setPreviewLoading(true);
        setPreviewError(null);

        try {
            const data = await generateReport(selectedType, {
                ...filters,
                format,
            });

            setLivePreview(data);

            setStep('preview');
        } catch (err) {
            const detail = err?.response?.data?.detail;

            setPreviewError(
                typeof detail === 'string'
                    ? detail
                    : 'Preview failed.'
            );
        } finally {
            setPreviewLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // PDF EXPORT
    // ─────────────────────────────────────────────────────────────────────────

    // npm install jspdf  (no html2canvas needed anymore)

    const capturePdf = useCallback(async () => {
        if (!livePreview) return;
        setGenerating(true);

        try {
            const { default: jsPDF } = await import('jspdf');

            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageW = doc.internal.pageSize.getWidth();   // 210
            const pageH = doc.internal.pageSize.getHeight();  // 297
            const marginL = 15;
            const marginR = 15;
            const marginT = 15;
            const marginB = 20;
            const contentW = pageW - marginL - marginR;          // 180
            let y = marginT;

            // ── colour palette ────────────────────────────────────────────────
            const C = {
                darknavy: [2, 22, 36],
                navy: [27, 60, 83],
                navyLight: [235, 242, 247],
                slate700: [51, 65, 85],
                slate500: [100, 116, 139],
                slate300: [203, 213, 225],
                white: [255, 255, 255],
                rowEven: [248, 250, 252],
                headerText: [255, 255, 255],
                black: [15, 23, 42],
            };

            // ── helpers ───────────────────────────────────────────────────────

            const setFill = (rgb) => doc.setFillColor(...rgb);
            const setDraw = (rgb) => doc.setDrawColor(...rgb);
            const setTxtClr = (rgb) => doc.setTextColor(...rgb);

            // Ensure we never write below the bottom margin; add page if needed.
            const checkPage = (needed = 6) => {
                if (y + needed > pageH - marginB) {
                    doc.addPage();
                    y = marginT;
                    drawPageFooter();
                }
            };

            const drawPageFooter = () => {
                const pg = doc.internal.getCurrentPageInfo().pageNumber;
                doc.setFontSize(8);
                setTxtClr(C.slate500);
                doc.text(
                    'CONFIDENTIAL — Authorized Personnel Only',
                    marginL,
                    pageH - 8,
                );
                doc.text(
                    `CIA System   |   Page ${pg}`,
                    pageW - marginR,
                    pageH - 8,
                    { align: 'right' },
                );
            };

            // ── PAGE 1 HEADER ─────────────────────────────────────────────────

            // Navy banner
            setFill(C.navy);
            doc.rect(0, 0, pageW, 38, 'F');

            const logoBase64 = logoRef.current;
            if (logoBase64) {
                doc.addImage(logoBase64, 'PNG', marginL, 8, 18, 18);
            }
            // Logo placeholder (white square + "CIA")
            setFill(C.white);
            doc.roundedRect(marginL, 8, 18, 18, 2, 2, 'F');
            doc.addImage(logoBase64, 'PNG', marginL + 2, 8 + 2, 14, 14);

            // Title block
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            setTxtClr([180, 200, 215]);
            doc.text('CRIMINAL INVESTIGATION ASSISTANT', marginL + 22, 14);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(15);
            setTxtClr(C.white);
            // Clamp title to content width
            const titleLines = doc.splitTextToSize(livePreview.title, contentW - 22);
            doc.text(titleLines, marginL + 22, 22);

            // Meta row
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            setTxtClr([180, 200, 215]);
            const meta = `Generated: ${new Date().toLocaleString()}   |   Format: ${format}`;
            doc.text(meta, marginL + 22, 33);

            y = 46;   // below banner

            drawPageFooter();

            // ── SECTIONS ─────────────────────────────────────────────────────

            livePreview.sections.forEach((section) => {

                // ── Section heading pill ──────────────────────────────────────
                checkPage(12);
                setFill(C.navyLight);
                setDraw(C.slate300);
                doc.roundedRect(marginL, y, contentW, 7.5, 1.5, 1.5, 'FD');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                setTxtClr(C.darknavy);
                doc.text(section.heading.toUpperCase(), marginL + 4, y + 5.2);
                y += 10;

                if (!section.rows?.length) {
                    checkPage(6);
                    doc.setFont('helvetica', 'italic');
                    doc.setFontSize(8.5);
                    setTxtClr(C.slate500);
                    doc.text('No data available.', marginL + 3, y);
                    y += 7;
                    return;
                }

                const rows = section.rows;
                const nCols = rows[0].length;

                // ── Column widths ─────────────────────────────────────────────
                // Two-column tables (key-value) get a 35/65 split.
                // All other tables share equally.
                let colWidths;
                if (nCols === 2) {
                    colWidths = [contentW * 0.38, contentW * 0.62];
                } else {
                    const base = Math.floor(contentW / nCols);
                    colWidths = Array(nCols).fill(base);
                    // Give remainder to last column
                    colWidths[nCols - 1] += contentW - base * nCols;
                }

                const cellPadX = 3;
                const cellPadY = 1.8;
                const fontSize = nCols <= 2 ? 9 : 8;
                const lineH = fontSize * 0.38;

                // ── Rows ──────────────────────────────────────────────────────
                rows.forEach((row, ri) => {
                    const isHeader = ri === 0 && nCols > 2;

                    // Pre-measure row height: find tallest cell
                    doc.setFontSize(fontSize);
                    const cellHeights = row.map((cell, ci) => {
                        const lines = doc.splitTextToSize(
                            String(cell ?? '—'),
                            colWidths[ci] - cellPadX * 2,
                        );
                        return lines.length * (lineH + 0.6) + cellPadY * 2;
                    });
                    const rowH = Math.max(...cellHeights, isHeader ? 7 : 6);

                    checkPage(rowH + 1);

                    // Row background
                    if (isHeader) {
                        setFill(C.navy);
                    } else {
                        setFill(ri % 2 === 0 ? C.rowEven : C.white);
                    }
                    setDraw(C.slate300);
                    doc.rect(marginL, y, contentW, rowH, 'FD');

                    // Cell text
                    let cx = marginL;
                    row.forEach((cell, ci) => {
                        const cw = colWidths[ci];
                        const lines = doc.splitTextToSize(
                            String(cell ?? '—'),
                            cw - cellPadX * 2,
                        );

                        doc.setFont('helvetica', isHeader ? 'bold' : ci === 0 && nCols === 2 ? 'bold' : 'normal');
                        doc.setFontSize(fontSize);
                        setTxtClr(isHeader ? C.headerText : ci === 0 && nCols === 2 ? C.slate700 : C.black);

                        lines.forEach((line, li) => {
                            doc.text(
                                line,
                                cx + cellPadX,
                                y + cellPadY + lineH + li * (lineH + 0.6),
                            );
                        });

                        // Vertical divider between cells
                        if (ci < nCols - 1) {
                            setDraw(isHeader ? [60, 90, 110] : C.slate300);
                            doc.line(cx + cw, y, cx + cw, y + rowH);
                        }

                        cx += cw;
                    });

                    y += rowH;
                });

                y += 6;   // gap after table
            });

            // ── Update footer page numbers (jsPDF doesn't do this natively) ──
            // Re-draw footer on every page with correct number.
            const totalPages = doc.internal.getNumberOfPages();
            for (let p = 1; p <= totalPages; p++) {
                doc.setPage(p);
                // Clear old footer strip
                setFill(C.white);
                doc.rect(0, pageH - 14, pageW, 14, 'F');
                // Divider
                setDraw(C.slate300);
                doc.line(marginL, pageH - 12, pageW - marginR, pageH - 12);
                doc.setFontSize(7.5);
                setTxtClr(C.slate500);
                doc.setFont('helvetica', 'normal');
                doc.text('CONFIDENTIAL — Authorized Personnel Only', marginL, pageH - 7);
                doc.text(`CIA System   |   Page ${p} of ${totalPages}`, pageW - marginR, pageH - 7, { align: 'right' });
            }

            doc.save(`${selectedType}_report.pdf`);

            setHistory(h => [{
                id: h.length + 1,
                type: currentType?.label ?? selectedType,
                date: new Date().toLocaleDateString('en-GB',
                    { day: '2-digit', month: 'short', year: 'numeric' }),
                format: 'PDF',
                status: 'success',
            }, ...h]);

        } catch (err) {
            console.error(err);
            setPreviewError('PDF export failed: ' + err.message);
        } finally {
            setGenerating(false);
        }
    }, [selectedType, currentType, format, livePreview]);

    // ─────────────────────────────────────────────────────────────────────────
    // CSV EXPORT
    // ─────────────────────────────────────────────────────────────────────────

    const exportCsv = () => {
        if (!livePreview) return;

        const rows = livePreview.sections.flatMap(
            (section) => [
                [section.heading],
                ...section.rows,
                [],
            ]
        );

        const csv = rows
            .map((row) =>
                row
                    .map((cell) => `"${cell ?? ''}"`)
                    .join(',')
            )
            .join('\n');

        const blob = new Blob([csv], {
            type: 'text/csv;charset=utf-8;',
        });

        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');

        link.href = url;

        link.download = `${selectedType}_report.csv`;

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        setHistory((h) => [
            {
                id: h.length + 1,
                type:
                    currentType?.label ?? selectedType,
                date: new Date().toLocaleDateString(
                    'en-GB',
                    {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                    }
                ),
                format: 'CSV',
                status: 'success',
            },
            ...h,
        ]);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // FIELDS
    // ─────────────────────────────────────────────────────────────────────────

    const renderFields = () => {
        if (!currentType) return null;

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentType.fields.includes(
                    'caseId'
                ) && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600 uppercase">
                                Case ID *
                            </label>

                            <input
                                type="text"
                                value={filters.caseId}
                                onChange={setF('caseId')}
                                placeholder="e.g. C-2053"
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm"
                            />
                        </div>
                    )}

                {currentType.fields.includes(
                    'dateRange'
                ) && (
                        <>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-600 uppercase">
                                    Date From
                                </label>

                                <input
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={setF('dateFrom')}
                                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-600 uppercase">
                                    Date To
                                </label>

                                <input
                                    type="date"
                                    value={filters.dateTo}
                                    onChange={setF('dateTo')}
                                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm"
                                />
                            </div>
                        </>
                    )}

                {currentType.fields.includes(
                    'province'
                ) && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600 uppercase">
                                Province
                            </label>

                            <select
                                value={filters.province}
                                onChange={setF('province')}
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm"
                            >
                                {PROVINCES.map((p) => (
                                    <option key={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                    )}
            </div>
        );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // UI
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-slate-100 mt-10">
            <Header />

            <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">


                {/* TITLE */}

                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        Generate Report
                    </h1>

                    <p className="text-sm text-slate-500 mt-1">
                        Preview and export professional
                        investigation reports
                    </p>
                </div>

                {/* ── Step indicator ───────────────────────────────────────────────── */}
                <div className="flex items-center gap-2 ">
                    {[
                        ['select', '1', 'Select Type'],
                        ['configure', '2', 'Configure'],
                        ['preview', '3', 'Preview & Export'],
                    ].map(([id, num, label], i, arr) => {
                        const stepOrder = ['select', 'configure', 'preview'];
                        const currentIdx = stepOrder.indexOf(step);
                        const thisIdx = stepOrder.indexOf(id);
                        const isDone = currentIdx > thisIdx;
                        const isActive = step === id;

                        return (
                            <div key={id} className="flex items-center gap-2">
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all select-none
                    ${isActive ? 'bg-[#1b3c53] text-white shadow-md'
                                        : isDone ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                            : 'bg-white border border-slate-200 text-slate-400'}`}
                                >
                                    {isDone
                                        ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                        : <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold
                            ${isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}`}>
                                            {num}
                                        </span>
                                    }
                                    {label}
                                </div>
                                {i < arr.length - 1 && (
                                    <div className={`w-8 h-px transition-colors
                        ${currentIdx > thisIdx ? 'bg-emerald-300' : 'bg-slate-300'}`}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* STEP 1 */}

                {step === 'select' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* ── Report type cards ── */}
                        <div className="lg:col-span-2">
                            <Card className="p-6 space-y-4">
                                <div>
                                    <h2 className="text-base font-bold text-slate-800">
                                        Select Report Type
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Choose what kind of report you want to generate
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {REPORT_TYPES.map(({ id, label, icon: Icon, color, iconColor, description }) => (
                                        <button
                                            key={id}
                                            onClick={() => { setSelectedType(id); setStep('configure'); }}
                                            className={`border-2 rounded-xl p-4 text-left transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99] ${color}`}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 rounded-lg bg-white shadow-sm">
                                                    <Icon className={`h-4 w-4 ${iconColor}`} />
                                                </div>
                                                <h3 className="text-sm font-bold text-slate-800">{label}</h3>
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
                                        </button>
                                    ))}
                                </div>
                            </Card>
                        </div>

                        {/* ── History sidebar ── */}
                        <div className="space-y-4">
                            <Card className="p-5">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-slate-400" />
                                    Recent Reports
                                </h3>

                                {history.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                        <p className="text-xs">No reports generated yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {history.slice(0, countHistory).map((h) => (
                                            <div
                                                key={h.id}
                                                className="flex items-start justify-between gap-2 p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                                            >
                                                <div className="flex items-start gap-2 min-w-0">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-medium text-slate-800 truncate">
                                                            {h.type}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                                            {h.date}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0
                                    ${h.format === 'PDF'
                                                        ? 'bg-red-50 text-red-600 border border-red-100'
                                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                                    {h.format}
                                                </span>
                                            </div>
                                        ))}
                                        <div className="flex justify-end">
                                            <button className='hover:underline text-blue-700 text-sm' onClick={() => countHistory <= history.length ? setCountHistory(countHistory + 6) : setCountHistory(countHistory - 6)}>{countHistory <= history.length ? 'view more' : 'view less'}</button>
                                        </div>
                                    </div>
                                )}
                            </Card>

                            {/* Tips card */}
                            <Card className="p-5 bg-blue-50 border border-blue-200">
                                <h3 className="text-xs font-bold text-blue-800 mb-2">💡 Tips</h3>
                                <ul className="text-xs text-blue-700 space-y-1.5">
                                    <li>• <strong>Case Summary</strong> needs a Case ID</li>
                                    <li>• <strong>AI Leads</strong> requires a specific case</li>
                                    <li>• Set confidence ≥ 80% for high-quality leads</li>
                                    <li>• Preview before exporting to verify data</li>
                                    <li>• CSV is best for spreadsheet imports</li>
                                </ul>
                            </Card>
                        </div>
                    </div>
                )}

                {/* STEP 2 */}

                {step === 'configure' &&
                    currentType && (
                        <Card className="p-6 space-y-5">

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() =>
                                        setStep('select')
                                    }
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </button>

                                <div>
                                    <h2 className="font-bold text-slate-800">
                                        {
                                            currentType.label
                                        }
                                    </h2>

                                    <p className="text-sm text-slate-500">
                                        {
                                            currentType.description
                                        }
                                    </p>
                                </div>
                            </div>

                            {renderFields()}

                            {/* FORMAT */}

                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                                    Export Format
                                </p>

                                <div className="flex gap-2">
                                    {FORMATS.map((f) => (
                                        <button
                                            key={f}
                                            onClick={() =>
                                                setFormat(f)
                                            }
                                            className={`px-4 py-2 rounded-lg border text-sm font-medium ${format === f
                                                ? 'bg-[#1b3c53] text-white'
                                                : 'bg-white'
                                                }`}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ACTION */}

                            <button
                                onClick={handlePreview}
                                disabled={
                                    !validate() ||
                                    previewLoading
                                }
                                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1b3c53] text-white text-sm font-medium disabled:opacity-40"
                            >
                                {previewLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}

                                Generate Preview
                            </button>

                            {!validate() &&
                                currentType.fields.includes(
                                    'caseId'
                                ) && (
                                    <p className="text-xs text-red-500 flex items-center gap-1">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        Case ID required
                                    </p>
                                )}
                        </Card>
                    )}

                {/* PREVIEW */}

                {step === 'preview' &&
                    livePreview && (
                        <Card className="p-6 space-y-5">

                            {/* HEADER */}

                            <div className="flex items-center justify-between">

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() =>
                                            setStep(
                                                'configure'
                                            )
                                        }
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                    </button>

                                    <h2 className="font-bold text-slate-800">
                                        Report Preview
                                    </h2>
                                </div>

                                <div className="flex gap-2">

                                    <button
                                        onClick={() =>
                                            window.print()
                                        }
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                                    >
                                        <Printer className="h-4 w-4" />
                                        Print
                                    </button>

                                    <button
                                        onClick={
                                            format ===
                                                'PDF'
                                                ? capturePdf
                                                : exportCsv
                                        }
                                        disabled={
                                            generating
                                        }
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1b3c53] text-white text-sm"
                                    >
                                        {generating ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Download className="h-4 w-4" />
                                        )}

                                        {format ===
                                            'PDF'
                                            ? 'Download PDF'
                                            : 'Download CSV'}
                                    </button>
                                </div>
                            </div>

                            {/* REPORT */}

                            <div
                                ref={previewRef}
                                className="bg-white border border-slate-200 rounded-xl p-10 shadow-sm space-y-8"
                            >

                                {/* REPORT HEADER */}

                                <div className="border-b pb-5">
                                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400 font-semibold">
                                        Criminal
                                        Investigation
                                        Assistant
                                    </p>

                                    <h1 className="text-3xl font-bold text-[#1b3c53] mt-2">
                                        {
                                            livePreview.title
                                        }
                                    </h1>

                                    <div className="mt-3 text-sm text-slate-500 flex gap-4">
                                        <span>
                                            Generated:{' '}
                                            {new Date().toLocaleString()}
                                        </span>

                                        <span>
                                            Format:{' '}
                                            {format}
                                        </span>
                                    </div>
                                </div>

                                {/* SECTIONS */}

                                {livePreview.sections.map(
                                    (
                                        section,
                                        si
                                    ) => (
                                        <div
                                            key={si}
                                            className="space-y-3"
                                        >
                                            <h3 className="text-sm font-bold text-slate-700 bg-slate-100 px-4 py-2 rounded-lg">
                                                {
                                                    section.heading
                                                }
                                            </h3>

                                            <PreviewTable
                                                rows={
                                                    section.rows
                                                }
                                            />
                                        </div>
                                    )
                                )}

                                {/* FOOTER */}

                                <div className="border-t pt-4 flex justify-between text-xs text-slate-400">
                                    <span>
                                        CONFIDENTIAL —
                                        Authorized
                                        Personnel Only
                                    </span>

                                    <span>
                                        CIA System
                                    </span>
                                </div>
                            </div>
                        </Card>
                    )}

                {/* ERROR */}

                {previewError && (
                    <div className="text-sm text-red-600 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {previewError}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ReportPage;