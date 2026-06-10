/**
 * src/pages/investigator/case/[id]/CaseEvidence.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Evidence tab on the case-detail page.
 *
 * Features wired to the backend:
 *   • Server-paginated table with search / date / status filters
 *   • Add new evidence       → uses parent's submitAdd via the page-level "Add Evidence" button
 *   • Update evidence row    → AddEvidenceDialog in update mode (PATCH + photos + file replace)
 *   • Inline status switcher → Pending Analysis ⇄ Analyzed (PATCH minimal payload)
 *   • Photo upload / delete  → from the View Details dialog
 *   • File viewer            → image / video / pdf / doc / archive smart rendering
 *
 * Recent fixes:
 *   1. Status update — toggle in the View dialog now PATCHes the row.
 *   2. File replace on Update — handleUpdateSubmit forwards `file`/`fileDataUrl`
 *      instead of relying on the form to do it.
 *   3. File viewer — videos play inline, PDFs/docs open in new tab, archives
 *      get a download-only card. Download button on every type.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
    Search, ChevronDown, Calendar, X, ExternalLink, Pencil,
    Loader2, AlertTriangle, Download, CheckCircle, Clock, FileText,
    File as FileIcon, Archive, Video, Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';
import AddEvidenceDialog from './forms/AddEvidence';
import {
    listEvidences,
    updateEvidence,
    uploadEvidencePhoto,
    deleteEvidencePhoto,
    rowToFormShape,
    formatApiError,
} from "@/services/evidenceApi";
import { photoSrc } from "@/utils/formatters";

const PAGE_SIZE = 5;

const STATUSES = [
    { value: 'CCTV',        label: 'CCTV / Video Footage' },
    { value: 'PHOTO',       label: 'Photograph' },
    { value: 'FINGERPRINT', label: 'Fingerprint' },
    { value: 'DNA',         label: 'DNA Sample' },
    { value: 'WEAPON',      label: 'Weapon' },
    { value: 'DOCUMENT',    label: 'Document / Paper' },
    { value: 'DIGITAL',     label: 'Digital Evidence' },
    { value: 'STATEMENT',   label: 'Witness Statement' },
    { value: 'MEDICAL',     label: 'Medical Report' },
    { value: 'FORENSIC',    label: 'Forensic Report' },
    { value: 'PHYSICAL',    label: 'Physical Object' },
    { value: 'OTHER',       label: 'Other' },
    { value: 'all',         label: 'All Evidences' },
];

const getFileCategory = (mime, fileName) => {
    if (!mime && !fileName) return 'unknown';
    const m = (mime || '').toLowerCase();
    const ext = (fileName || '').split('.').pop().toLowerCase();

    if (m.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
    if (m === 'application/pdf' || ext === 'pdf') return 'pdf';
    if (
        m.includes('word') || m.includes('document') ||
        ['doc', 'docx', 'odt', 'rtf', 'txt'].includes(ext)
    ) return 'document';
    if (
        ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext) ||
        m.includes('zip') || m.includes('rar') || m.includes('compressed')
    ) return 'archive';
    if (m.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    return 'other';
};

/** Trigger a browser download for a URL (opens new tab as fallback for
 *  cross-origin URLs that the browser refuses to download directly). */
const triggerDownload = (url, fileName) => {
    const a = document.createElement('a');
    a.href     = url;
    a.download = fileName || 'download';
    a.target   = '_blank';
    a.rel      = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

// ────────────────────────────────────────────────────────────────────────────

const CaseEvidence = ({ caseId: caseIdProp }) => {
    const { id: caseIdFromUrl } = useParams();
    const caseId = caseIdProp || caseIdFromUrl || 'C-2053';

    // ── Filter inputs (live state) ────────────────────────────────────────
    const [searchName, setSearchName] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const [appliedFilters, setAppliedFilters] = useState({
        name: '', date: '', status: 'all',
    });

    // ── Pagination + data ─────────────────────────────────────────────────
    const [currentPage, setCurrentPage] = useState(1);
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const requestSeq = useRef(0);

    // ── Dialog states ─────────────────────────────────────────────────────
    const [dialogEvidence, setDialogEvidence] = useState(null);
    const dialogRef = useRef(null);
    const closeButtonRef = useRef(null);

    // Image lightbox
    const [selectedImage, setSelectedImage] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    // Update flow
    const [updateTarget, setUpdateTarget] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState(false);

    // ── Fetch ─────────────────────────────────────────────────────────────
    const fetchEvidences = useCallback(async () => {
        if (!caseId) return;
        setLoading(true);
        setError(null);
        const seq = ++requestSeq.current;

        try {
            const data = await listEvidences(caseId, {
                search:    appliedFilters.name,
                date:      appliedFilters.date,
                status:    appliedFilters.status,
                page:      currentPage,
                page_size: PAGE_SIZE,
            });
            if (seq !== requestSeq.current) return;
            setItems(data?.items || []);
            setTotal(data?.total || 0);
        } catch (err) {
            if (seq !== requestSeq.current) return;
            console.error("Failed to load evidences:", err);
            setError(formatApiError(err, "Could not load evidences."));
        } finally {
            if (seq === requestSeq.current) setLoading(false);
        }
    }, [caseId, appliedFilters, currentPage]);

    useEffect(() => { fetchEvidences(); }, [fetchEvidences]);

    // ── Filter handlers ───────────────────────────────────────────────────
    const handleApply = useCallback(() => {
        setAppliedFilters({
            name: searchName.trim(),
            date: dateFilter,
            status: statusFilter,
        });
        setCurrentPage(1);
    }, [searchName, dateFilter, statusFilter]);

    const handleClear = useCallback(() => {
        setSearchName('');
        setDateFilter('');
        setStatusFilter('all');
        setAppliedFilters({ name: '', date: '', status: 'all' });
        setCurrentPage(1);
    }, []);

    // ── Pagination derivations ────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const start = (currentPage - 1) * PAGE_SIZE;
    const end   = Math.min(start + PAGE_SIZE, total);

    // ── Details dialog ────────────────────────────────────────────────────
    const openDialog = (evidence) => setDialogEvidence(evidence);
    const closeDialog = useCallback(() => setDialogEvidence(null), []);

    useEffect(() => {
        if (!dialogEvidence) return;
        closeButtonRef.current?.focus();
    }, [dialogEvidence]);

    useEffect(() => {
        const handleEscape = (e) => { if (e.key === 'Escape') closeDialog(); };
        if (dialogEvidence) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [dialogEvidence, closeDialog]);

    // ── Photo upload (from view dialog) ───────────────────────────────────
    const handlePhotoUpload = async (file) => {
        if (!file || !dialogEvidence) return;
        setUploading(true);
        try {
            const dataUrl = await new Promise((resolve, reject) => {
                const r = new FileReader();
                r.onloadend = () => resolve(r.result);
                r.onerror = reject;
                r.readAsDataURL(file);
            });

            const result = await uploadEvidencePhoto(caseId, dialogEvidence.id, {
                dataUrl,
                fileName: file.name,
            });

            setDialogEvidence(prev => prev && ({ ...prev, photos: result?.photos || [] }));
            setItems(curr =>
                curr.map(it =>
                    it.id === dialogEvidence.id ? { ...it, photos: result?.photos || [] } : it,
                ),
            );
        } catch (err) {
            console.error("Photo upload failed:", err);
            alert(`Upload failed: ${formatApiError(err)}`);
        } finally {
            setUploading(false);
        }
    };

    // ── Photo delete (from view dialog) ───────────────────────────────────
    const handlePhotoDelete = async (photo) => {
        if (!photo?.id || !dialogEvidence) return;
        if (!confirm("Delete this photo?")) return;

        try {
            const result = await deleteEvidencePhoto(caseId, dialogEvidence.id, photo.id);
            setDialogEvidence(prev => prev && ({ ...prev, photos: result?.photos || [] }));
            setItems(curr =>
                curr.map(it =>
                    it.id === dialogEvidence.id ? { ...it, photos: result?.photos || [] } : it,
                ),
            );
        } catch (err) {
            console.error("Photo delete failed:", err);
            alert(`Delete failed: ${formatApiError(err)}`);
        }
    };

    // ── Update dialog submit ──────────────────────────────────────────────
    // Diffs deleted photos (existed in the row, removed from form), then
    // PATCHes the rest. The service handles file replacement automatically
    // when `file` or `fileDataUrl` is present on the form item.
    const handleUpdateSubmit = async ({ caseId: cid, evidences, isUpdate }) => {
        if (!isUpdate) {
            return { ok: false, error: "CaseEvidence handles updates only." };
        }
        const evid  = updateTarget?.id;
        const first = evidences?.[0];
        if (!evid || !first) {
            setUpdateTarget(null);
            return { ok: false, error: "Missing evidence reference." };
        }

        try {
            // Detect deleted photos by comparing IDs in the row vs. the form.
            const originalPhotoIds = new Set(
                (updateTarget.photos || []).map(p => p.id).filter(Boolean),
            );
            const remainingExistingIds = new Set(
                (first.photos || [])
                    .map(p => p.existingPhotoId)
                    .filter(Boolean),
            );
            const deletedIds = [...originalPhotoIds].filter(id => !remainingExistingIds.has(id));

            for (const photoId of deletedIds) {
                try {
                    await deleteEvidencePhoto(cid, evid, photoId);
                } catch (err) {
                    console.warn(`Failed to delete photo ${photoId}:`, err);
                }
            }

            // updateEvidence reads `first.file` / `first.fileDataUrl` and
            // ships the file to the backend automatically — no extra
            // wrangling needed here.
            const { row, photo_failures } = await updateEvidence(cid, evid, first);

            setItems(curr => curr.map(it => (it.id === evid ? row : it)));

            // If the details dialog is open for the same item, refresh it.
            if (dialogEvidence?.id === evid) {
                setDialogEvidence(row);
            }

            await fetchEvidences()

            return { ok: true, row, photo_failures };
        } catch (err) {
            console.error("Update failed:", err);
            return { ok: false, error: formatApiError(err, "Update failed.") };
        } finally {
            setTimeout(() => setUpdateTarget(null), 0);
        }
    };

    // ── File viewer ───────────────────────────────────────────────────────
    // Smart renderer driven by getFileCategory(). Every type ends with a
    // download button; videos play inline; PDFs/docs open in a new tab;
    // archives offer download only.
    const renderFileSection = (evidence) => {
        if (!evidence.fileName) {
            return <p className="text-sm text-slate-400 italic">No file attached yet.</p>;
        }

        // The backend returns `fileName` as a public URL ("/uploads/...").
        // photoSrc() prefixes it with VITE_API_URL.
        const fileUrl  = photoSrc(evidence.fileName);
        const category = getFileCategory(evidence.fileMime, evidence.fileName);
        const baseName = evidence.fileName.split('/').pop();

        const DownloadBtn = ({ label = 'Download' }) => (
            <button
                onClick={() => triggerDownload(fileUrl, baseName)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
                <Download className="h-3.5 w-3.5" />
                {label}
            </button>
        );

        const OpenBtn = ({ label = 'Open' }) => (
            <button
                onClick={() => window.open(fileUrl, '_blank', 'noopener,noreferrer')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
            >
                <ExternalLink className="h-3.5 w-3.5" />
                {label}
            </button>
        );

        // ── VIDEO — plays inline ──────────────────────────────────────────
        if (category === 'video') {
            return (
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-black">
                    <video
                        src={fileUrl}
                        controls
                        className="w-full max-h-72 bg-black"
                        aria-label={`Video file: ${baseName}`}
                    />
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                        <p className="text-sm text-slate-600 truncate flex items-center gap-2">
                            <Video className="h-4 w-4 text-slate-400" /> {baseName}
                        </p>
                        <div className="flex gap-2">
                            <OpenBtn label="Open in tab" />
                            <DownloadBtn />
                        </div>
                    </div>
                </div>
            );
        }

        // ── IMAGE — clickable to open lightbox ────────────────────────────
        if (category === 'image') {
            return (
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                    <button
                        type="button"
                        onClick={() => { setSelectedImage(fileUrl); setZoom(1); setPosition({ x: 0, y: 0 }); }}
                        className="block w-full bg-slate-50 cursor-zoom-in"
                    >
                        <img src={fileUrl} alt={baseName} className="w-full max-h-72 object-contain" />
                    </button>
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                        <p className="text-sm text-slate-600 truncate flex items-center gap-2">
                            <ImageIcon className="h-4 w-4 text-slate-400" /> {baseName}
                        </p>
                        <DownloadBtn />
                    </div>
                </div>
            );
        }

        // ── PDF — open in new tab ────────────────────────────────────────
        if (category === 'pdf') {
            return (
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                    <div className="h-52 bg-red-50 flex flex-col items-center justify-center gap-2">
                        <span className="text-6xl" aria-hidden>📄</span>
                        <p className="text-sm font-medium text-red-700">PDF Document</p>
                        <p className="text-xs text-slate-500 truncate max-w-xs">{baseName}</p>
                    </div>
                    <div className="px-4 py-3 border-t border-slate-200 flex gap-2">
                        <OpenBtn label="Open PDF" />
                        <DownloadBtn />
                    </div>
                </div>
            );
        }

        // ── DOCUMENT (doc, docx, txt, etc.) — open in new tab ─────────────
        if (category === 'document') {
            return (
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                    <div className="h-52 bg-blue-50 flex flex-col items-center justify-center gap-2">
                        <span className="text-6xl" aria-hidden>📝</span>
                        <p className="text-sm font-medium text-blue-700">Document</p>
                        <p className="text-xs text-slate-500 truncate max-w-xs">{baseName}</p>
                    </div>
                    <div className="px-4 py-3 border-t border-slate-200 flex gap-2">
                        <OpenBtn label="Open in new tab" />
                        <DownloadBtn />
                    </div>
                </div>
            );
        }

        // ── ARCHIVE (zip, rar, 7z, tar, gz) — download only ───────────────
        if (category === 'archive') {
            return (
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                    <div className="h-52 bg-amber-50 flex flex-col items-center justify-center gap-2">
                        <span className="text-6xl" aria-hidden>🗜️</span>
                        <p className="text-sm font-medium text-amber-700">Archive File</p>
                        <p className="text-xs text-slate-500 truncate max-w-xs">{baseName}</p>
                        <p className="text-xs text-slate-400">Cannot preview — download to extract</p>
                    </div>
                    <div className="px-4 py-3 border-t border-slate-200">
                        <DownloadBtn label="Download Archive" />
                    </div>
                </div>
            );
        }

        // ── FALLBACK ──────────────────────────────────────────────────────
        return (
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                <div className="h-52 bg-slate-100 flex flex-col items-center justify-center gap-2">
                    <FileIcon className="h-12 w-12 text-slate-400" />
                    <p className="text-sm font-medium text-slate-600">Attachment</p>
                    <p className="text-xs text-slate-500 truncate max-w-xs">{baseName}</p>
                </div>
                <div className="px-4 py-3 border-t border-slate-200 flex gap-2">
                    <OpenBtn />
                    <DownloadBtn />
                </div>
            </div>
        );
    };

    return (
        <section
            className="bg-white rounded-t-lg border-x border-t border-slate-300 p-6 shadow-sm"
            aria-label="Evidence"
        >
            <header className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Evidence</h2>
                <p className="text-sm text-slate-600 mt-1">View all evidence and their case involvement</p>
            </header>

            {error && (
                <div className="mb-4 flex items-center gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                    <AlertTriangle className="h-4 w-4" /> {error}
                </div>
            )}

            {/* Filters */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
                <label className="sr-only" htmlFor="evidence-search">Search evidence by name</label>
                <div className="relative flex-1 min-w-50">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden />
                    <input
                        id="evidence-search"
                        type="search"
                        placeholder="Search evidence by name"
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-deep-ocean/20 focus:border-deep-ocean focus:outline-none"
                    />
                </div>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden />
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-deep-ocean/20 focus:border-deep-ocean focus:outline-none"
                    />
                </div>
                <div className="relative">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="appearance-none pl-3 pr-9 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-deep-ocean/20 focus:border-deep-ocean focus:outline-none cursor-pointer"
                    >
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
                <Button className={"px-3 py-1.5"} onClick={handleApply}>Apply</Button>
                <Button variant="outline" className={"px-3 py-1.5"} onClick={handleClear}>Clear</Button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr className="text-xs uppercase tracking-wide text-slate-500">
                            <th className="p-4 text-left">Evidence ID</th>
                            <th className="p-4 text-left">Type</th>
                            <th className="p-4 text-left">Date</th>
                            <th className="p-4 text-left">Collected By</th>
                            <th className="p-4 text-left">Description</th>
                            <th className="p-4 text-center">Photos</th>
                            <th className="p-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white text-sm">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="p-12 text-center text-slate-500">
                                    <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                                    Loading evidences…
                                </td>
                            </tr>
                        ) : items.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-12 text-center text-slate-500">
                                    No evidence items found.
                                </td>
                            </tr>
                        ) : (
                            items.map((e) => {
                                return (
                                    <tr key={e.id} className="hover:bg-slate-50">
                                        <td className="p-4 font-mono text-xs">{e.id}</td>
                                        <td className="p-4">{e.type}</td>
                                        <td className="p-4">{e.date}</td>
                                        <td className="p-4">{e.collectedBy || '—'}</td>
                                        <td className="p-4">{e.description || '—'}</td>
                                        <td className="p-4 text-center">
                                            {e.photos?.length > 0 ? (
                                                <Badge variant="default">
                                                    {e.photos.length} Photo{e.photos.length > 1 && 's'}
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-400 text-xs">No Photos</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center grid grid-rows-2">
                                            <Button
                                                variant='default'
                                                className={'px-4 py-2 mb-2'}
                                                onClick={() => openDialog(e)}
                                                aria-label={`View full details for ${e.id}`}
                                            >
                                                <ExternalLink className="h-3.5 w-3.5 mr-2" aria-hidden />
                                                View details
                                            </Button>
                                            <Button
                                                variant='outline'
                                                className={'px-4 py-2'}
                                                onClick={() => setUpdateTarget(e)}
                                                aria-label={`Update evidence ${e.id}`}
                                            >
                                                <Pencil className="h-3.5 w-3.5 mr-2" aria-hidden />
                                                Update
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {!loading && total > 0 && (
                <div className="mt-4 px-4">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={total}
                        start={start}
                        end={end}
                        itemLabel="evidences"
                    />
                </div>
            )}

            {/* ── Details dialog ─────────────────────────────────────────── */}
            {dialogEvidence && (
                <div
                    ref={dialogRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="evidence-dialog-title"
                    aria-describedby="evidence-dialog-desc"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    onClick={(e) => e.target === e.currentTarget && closeDialog()}
                >
                    <div className="absolute inset-0 bg-black/50" aria-hidden />
                    <div
                        className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="sticky top-0 z-10 bg-[#14374E] px-6 py-4 flex items-center justify-between">
                            <div>
                                <h2 id="evidence-dialog-title" className="text-base font-semibold text-white">
                                    Evidence Details
                                </h2>
                                <p id="evidence-dialog-desc" className="text-xs text-white/60 font-mono">
                                    {dialogEvidence.id}
                                </p>
                            </div>
                            <button
                                ref={closeButtonRef}
                                type="button"
                                onClick={closeDialog}
                                className="p-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
                                aria-label="Close dialog"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-5 text-sm">
                            {/* Meta + status switcher */}
                            <section className="space-y-2 text-slate-700">
                                <p><span className="font-semibold">Type:</span> {dialogEvidence.type}</p>
                                <p><span className="font-semibold">Collected By:</span> {dialogEvidence.collectedBy || '—'}</p>
                                <p><span className="font-semibold">Date:</span> {dialogEvidence.date || '—'}</p>
                            </section>

                            {/* Description */}
                            <section>
                                <h4 className="font-semibold mt-2 mb-2">Description</h4>
                                <p className="text-slate-700">{dialogEvidence.description || '—'}</p>
                            </section>

                            {/* Photographs */}
                            <section>
                                <div className="flex justify-between items-center mt-2 mb-3">
                                    <h4 className="font-semibold text-slate-800">Evidence Photographs</h4>
                                    <label className={`cursor-pointer text-sm text-blue-600 hover:underline ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {uploading ? (
                                            <><Loader2 className="h-3.5 w-3.5 inline animate-spin mr-1" />Uploading…</>
                                        ) : (
                                            <>⬆ Upload Photo</>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            hidden
                                            disabled={uploading}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handlePhotoUpload(file);
                                                e.target.value = '';
                                            }}
                                        />
                                    </label>
                                </div>

                                {dialogEvidence.photos?.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {dialogEvidence.photos.map((photo, index) => (
                                            <div
                                                key={photo.id ?? index}
                                                className="relative group rounded-lg overflow-hidden border border-slate-200"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => { setSelectedImage(photoSrc(photo.url)); setZoom(1); setPosition({ x: 0, y: 0 }); }}
                                                    className="block w-full aspect-square cursor-zoom-in"
                                                >
                                                    <img
                                                        src={photoSrc(photo.url)}
                                                        alt={photo.file_name || `Photo ${index + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </button>
                                                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        type="button"
                                                        onClick={() => triggerDownload(photoSrc(photo.url), photo.file_name)}
                                                        className="bg-black/60 text-white text-xs px-2 py-1 rounded cursor-pointer"
                                                        aria-label="Download photo"
                                                    >
                                                        <Download className="h-3 w-3" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePhotoDelete(photo)}
                                                        className="bg-black/60 text-white text-xs px-2 py-1 rounded cursor-pointer"
                                                        aria-label="Delete photo"
                                                    >
                                                        🗑
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 italic">No photos attached yet.</p>
                                )}
                            </section>

                            {/* Attached file — smart rendering by type */}
                            <section>
                                <h4 className="font-semibold mt-2 mb-3 text-slate-800">Attached File</h4>
                                {renderFileSection(dialogEvidence)}
                            </section>
                        </div>

                        {/* Sticky footer */}
                        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end">
                            <Button onClick={closeDialog} className={'px-4 py-2'}>
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Image lightbox ─────────────────────────────────────────── */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <div className="absolute top-6 right-6 z-50 flex gap-2">
                            <Button variant="outline" className="bg-cool-silver px-2 py-1 hover:bg-cool-silver/80"
                                onClick={() => setZoom(z => Math.max(1, z - 0.25))}>−</Button>
                            <Button variant="outline" className="bg-cool-silver px-2 py-1 hover:bg-cool-silver/80"
                                onClick={() => setZoom(z => Math.min(4, z + 0.25))}>+</Button>
                            <Button variant="outline" className="bg-cool-silver px-2 py-1 hover:bg-cool-silver/80"
                                onClick={() => setSelectedImage(null)}>Close</Button>
                        </div>

                        <div className="absolute bottom-6 z-50 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-1 rounded-full text-sm">
                            {Math.round(zoom * 100)}%
                        </div>

                        <div
                            className="cursor-grab active:cursor-grabbing"
                            onMouseDown={() => setIsDragging(true)}
                            onMouseUp={() => setIsDragging(false)}
                            onMouseLeave={() => setIsDragging(false)}
                            onMouseMove={(e) => {
                                if (!isDragging || zoom === 1) return;
                                setPosition((prev) => ({
                                    x: prev.x + e.movementX,
                                    y: prev.y + e.movementY,
                                }));
                            }}
                            onWheel={(e) => {
                                e.preventDefault();
                                const delta = e.deltaY * -0.001;
                                setZoom((prev) => Math.min(Math.max(1, prev + delta), 4));
                            }}
                        >
                            <img
                                src={selectedImage}
                                alt="Evidence full view"
                                draggable={false}
                                style={{
                                    transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                                    transition: isDragging ? "none" : "transform 0.15s ease-out",
                                }}
                                className="max-h-[90vh] max-w-[95vw] select-none"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Update dialog (reuses AddEvidenceDialog with initialData) */}
            <AddEvidenceDialog
                isOpen={!!updateTarget}
                onClose={() => setUpdateTarget(null)}
                caseId={caseId}
                initialData={rowToFormShape(updateTarget)}
                onSubmit={handleUpdateSubmit}
            />
        </section>
    );
};

export default CaseEvidence;