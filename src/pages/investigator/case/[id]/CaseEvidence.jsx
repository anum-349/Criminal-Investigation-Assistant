import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
    Search, ChevronDown, Calendar, X, ExternalLink, Pencil,
    Loader2, AlertTriangle, Download, CheckCircle, Clock,
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

const PAGE_SIZE = 5;
const STATUSES = [
    { value: 'CCTV', label: 'CCTV / Video Footage' },
    { value: 'PHOTO', label: 'Photograph' },
    { value: 'FINGERPRINT', label: 'Fingerprint' },
    { value: 'DNA', label: 'DNA Sample' },
    { value: 'WEAPON', label: 'Weapon' },
    { value: 'DOCUMENT', label: 'Document / Paper' },
    { value: 'DIGITAL', label: 'Digital Evidence' },
    { value: 'STATEMENT', label: 'Witness Statement' },
    { value: 'MEDICAL', label: 'Medical Report' },
    { value: 'FORENSIC', label: 'Forensic Report' },
    { value: 'PHYSICAL', label: 'Physical Object' },
    { value: 'OTHER', label: 'Other' },
    { value: 'all', label: 'All Evidences' },
];

const EVIDENCE_STATUSES = [
    { value: 'Pending Analysis', label: 'Pending Analysis' },
    { value: 'Analyzed', label: 'Analyzed' },
];

// Build absolute URL for a file. Paths saved by the backend come back as
// "/uploads/..." paths; we prefix them with VITE_API_URL so the browser resolves them.
const photoSrc = (rawUrl) => {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('http')) return rawUrl;
    if (rawUrl.startsWith('/uploads')) return `${import.meta.env.VITE_API_URL}${rawUrl}`;
    return rawUrl;
};

// Derive file type category from MIME type or file name extension.
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

// Trigger a browser download for a URL.
const triggerDownload = (url, fileName) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'download';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

const CaseEvidence = () => {
    const { id: caseIdFromUrl } = useParams();
    const caseId = caseIdFromUrl || 'C-2053';

    // ── Filter inputs (live state) ────────────────────────────────────────
    const [searchName, setSearchName] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Applied filters — what the server is actually using right now.
    const [appliedFilters, setAppliedFilters] = useState({
        name: '',
        date: '',
        status: 'all',
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
    const [selectedImage, setSelectedImage] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [updateTarget, setUpdateTarget] = useState(null);
    const [uploading, setUploading] = useState(false);

    // ── Status update state ───────────────────────────────────────────────
    const [statusUpdating, setStatusUpdating] = useState(false);

    const fetchEvidences = useCallback(async () => {
        if (!caseId) return;
        setLoading(true);
        setError(null);
        const seq = ++requestSeq.current;

        try {
            const data = await listEvidences(caseId, {
                search: appliedFilters.name,
                date: appliedFilters.date,
                status: appliedFilters.status,
                page: currentPage,
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
    const end = Math.min(start + PAGE_SIZE, total);

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

    // ── Status update handler ─────────────────────────────────────────────
    const handleStatusChange = async (newStatus) => {
        if (!dialogEvidence || statusUpdating) return;
        setStatusUpdating(true);
        try {
            // We send a minimal PATCH payload — only the status field.
            const { row } = await updateEvidence(caseId, dialogEvidence.id, {
                status: newStatus,
            });
            const updated = row ?? { ...dialogEvidence, status: newStatus };
            setDialogEvidence(updated);
            setItems(curr => curr.map(it => (it.id === dialogEvidence.id ? updated : it)));
        } catch (err) {
            console.error("Status update failed:", err);
            alert(`Status update failed: ${formatApiError(err)}`);
        } finally {
            setStatusUpdating(false);
        }
    };

    // ── Photo upload ──────────────────────────────────────────────────────
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

    // ── Photo delete ──────────────────────────────────────────────────────
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
    // KEY FIX: We now also detect if the form has a NEW file attached (no
    // existingFileId / existingFileName) and pass it through to updateEvidence
    // so the API actually receives the new file upload.
    const handleUpdateSubmit = async ({ caseId: cid, evidences, isUpdate, initialId }) => {
        if (!isUpdate) {
            return { ok: false, error: "CaseEvidence handles updates only." };
        }
        const evid = updateTarget?.id;
        const first = evidences?.[0];
        if (!evid || !first) {
            setUpdateTarget(null);
            return { ok: false, error: "Missing evidence reference." };
        }

        try {
            // Detect deleted photos by comparing against the row we opened.
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

            // IMPORTANT: Ensure the form payload includes any new file the user
            // attached in the update dialog. `first` should already carry it if
            // AddEvidenceDialog populates `file` / `fileDataUrl` on the evidence
            // object. We spread it explicitly so nothing is silently dropped.
            const payload = {
                ...first,
                // If there's a brand-new file (not an existing one), make sure
                // it travels to updateEvidence. The API service reads these keys.
                ...(first.fileDataUrl && !first.existingFileName
                    ? { fileDataUrl: first.fileDataUrl, fileName: first.fileName, fileMime: first.fileMime }
                    : {}),
            };

            const { row, photo_failures } = await updateEvidence(cid, evid, payload);

            setItems(curr => curr.map(it => (it.id === evid ? row : it)));

            // If the details dialog is open for the same item, refresh it too.
            if (dialogEvidence?.id === evid) {
                setDialogEvidence(row);
            }

            return { ok: true, row, photo_failures };
        } catch (err) {
            console.error("Update failed:", err);
            return { ok: false, error: formatApiError(err, "Update failed.") };
        } finally {
            setTimeout(() => setUpdateTarget(null), 0);
        }
    };

    // ── File action helpers ───────────────────────────────────────────────
    const renderFileSection = (evidence) => {
        if (!evidence.fileName) {
            return <p className="text-sm text-slate-400 italic">No file attached yet.</p>;
        }

        const fileUrl = photoSrc(evidence.fileName);
        const category = getFileCategory(evidence.fileMime, evidence.fileName);
        const baseName = evidence.fileName.split('/').pop();

        const DownloadBtn = ({ label = 'Download' }) => (
            <button
                onClick={() => triggerDownload(fileUrl, baseName)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition-colors"
            >
                <Download className="h-3.5 w-3.5" />
                {label}
            </button>
        );

        const OpenBtn = ({ label = 'Open' }) => (
            <button
                onClick={() => window.open(fileUrl, '_blank')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
                <ExternalLink className="h-3.5 w-3.5" />
                {label}
            </button>
        );

        // ── VIDEO ─────────────────────────────────────────────────────────
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
                        <p className="text-sm text-slate-600 truncate">{baseName}</p>
                        <div className="flex gap-2">
                            <OpenBtn label="Open in tab" />
                            <DownloadBtn />
                        </div>
                    </div>
                </div>
            );
        }

        // ── PDF ───────────────────────────────────────────────────────────
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

        // ── DOCUMENT (doc, docx, txt, etc.) ───────────────────────────────
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

        // ── ARCHIVE (zip, rar, 7z, etc.) ──────────────────────────────────
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

        // ── FALLBACK / OTHER ──────────────────────────────────────────────
        return (
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                <div className="h-52 bg-slate-100 flex flex-col items-center justify-center gap-2">
                    <span className="text-6xl" aria-hidden>📁</span>
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
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:border-transparent"
                        aria-label="Search evidence by name"
                    />
                </div>

                <label className="sr-only" htmlFor="filter-date">Select date</label>
                <div className="relative flex items-center">
                    <Calendar className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" aria-hidden />
                    <input
                        id="filter-date"
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm"
                        aria-label="Select date"
                    />
                </div>

                <label className="sr-only" htmlFor="filter-status">Filter by status</label>
                <div className="relative">
                    <select
                        id="filter-status"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="appearance-none pl-4 pr-8 py-2 border border-slate-300 rounded-md bg-white text-slate-800 text-sm"
                        aria-label="Filter by status"
                    >
                        {STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" aria-hidden />
                </div>

                <Button onClick={handleApply} className="px-6 py-2 shadow-inner shadow-deep-ocean-900" aria-label="Apply filters">
                    Apply
                </Button>
                <Button variant="outline" onClick={handleClear} className="px-6 py-2" aria-label="Clear filters">
                    Clear
                </Button>
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-b-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm" role="table" aria-label="Evidence list">
                        <thead className="bg-slate-100 text-slate-600 text-nowrap">
                            <tr>
                                <th scope="col" className="p-4 font-semibold uppercase text-[11px] tracking-wide">Evidence ID</th>
                                <th scope="col" className="p-4 font-semibold uppercase text-[11px] tracking-wide">Type</th>
                                <th scope="col" className="p-4 font-semibold uppercase text-[11px] tracking-wide">Date</th>
                                <th scope="col" className="p-4 font-semibold uppercase text-[11px] tracking-wide">Description</th>
                                <th scope="col" className="p-4 font-semibold uppercase text-[11px] tracking-wide">Collected By</th>
                                <th scope="col" className="p-4 font-semibold uppercase text-[11px] tracking-wide">Status</th>
                                <th className="p-4 font-semibold uppercase text-[11px] tracking-wide">Photos</th>
                                <th scope="col" className="p-4 font-semibold uppercase text-[11px] tracking-wide text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center text-slate-500">
                                        <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                                        Loading evidences…
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-500">
                                        No evidence matches your search. Try different filters.
                                    </td>
                                </tr>
                            ) : (
                                items.map((e) => (
                                    <tr key={e.id} className="hover:bg-slate-50 transition-colors *:text-sm">
                                        <td className="p-4 font-semibold text-slate-800 text-nowrap">{e.id}</td>
                                        <td className="p-4 text-slate-800">{e.type}</td>
                                        <td className="p-4 text-slate-700">{e.date}</td>
                                        <td className="p-4 text-slate-700">{e.description || '—'}</td>
                                        <td className="p-4 text-slate-700">{e.collectedBy || '—'}</td>
                                        <td className="p-4">
                                            <Badge variant={e.status === 'Analyzed' ? 'success' : 'warning'}>
                                                {e.status === 'Analyzed'
                                                    ? <><CheckCircle className="h-3 w-3 inline mr-1" />Analyzed</>
                                                    : <><Clock className="h-3 w-3 inline mr-1" />Pending</>
                                                }
                                            </Badge>
                                        </td>
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
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
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

            {/* Details dialog */}
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
                        {/* Sticky header */}
                        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                            <h3 id="evidence-dialog-title" className="text-lg font-bold text-slate-800">
                                Evidence Details – {dialogEvidence.type} ({dialogEvidence.id})
                            </h3>
                            <button
                                ref={closeButtonRef}
                                type="button"
                                onClick={closeDialog}
                                className="p-2 rounded-md text-slate-500 cursor-pointer hover:bg-slate-blue hover:text-cool-silver focus:outline-none focus:ring-2"
                                aria-label="Close dialog"
                            >
                                <X className="h-5 w-5" aria-hidden />
                            </button>
                        </div>

                        <div id="evidence-dialog-desc" className="p-6 space-y-6">
                            {/* Core details */}
                            <section className="space-y-1.5">
                                <p><span className="font-semibold">Evidence ID:</span> {dialogEvidence.id}</p>
                                <p><span className="font-semibold">Type:</span> {dialogEvidence.type}</p>
                                <p><span className="font-semibold">Collected By:</span> {dialogEvidence.collectedBy || '—'}</p>
                                <p><span className="font-semibold">Date:</span> {dialogEvidence.date || '—'}</p>

                                {/* ── Status with inline update ── */}
                                <div className="flex items-center gap-3 pt-1">
                                    <span className="font-semibold">Status:</span>
                                    <div className="flex items-center gap-2">
                                        {EVIDENCE_STATUSES.map(({ value, label }) => {
                                            const isActive = dialogEvidence.status === value;
                                            const isAnalyzed = value === 'Analyzed';
                                            return (
                                                <button
                                                    key={value}
                                                    disabled={statusUpdating}
                                                    onClick={() => !isActive && handleStatusChange(value)}
                                                    className={[
                                                        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all',
                                                        isActive
                                                            ? isAnalyzed
                                                                ? 'bg-emerald-100 text-emerald-700 border-emerald-300 cursor-default'
                                                                : 'bg-amber-100 text-amber-700 border-amber-300 cursor-default'
                                                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700 cursor-pointer',
                                                        statusUpdating && !isActive ? 'opacity-50 pointer-events-none' : '',
                                                    ].join(' ')}
                                                    aria-pressed={isActive}
                                                    aria-label={`Set status to ${label}`}
                                                >
                                                    {statusUpdating && isActive
                                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                                        : isAnalyzed
                                                            ? <CheckCircle className="h-3 w-3" />
                                                            : <Clock className="h-3 w-3" />
                                                    }
                                                    {label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
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
                                                className="group rounded-lg overflow-hidden border border-slate-200"
                                            >
                                                <img
                                                    src={photoSrc(photo.url)}
                                                    alt={`Evidence ${dialogEvidence.id} photo ${index + 1}`}
                                                    className="w-full h-40 object-cover cursor-pointer"
                                                    onClick={() => {
                                                        setSelectedImage(photoSrc(photo.url));
                                                        setZoom(1);
                                                        setPosition({ x: 0, y: 0 });
                                                    }}
                                                />
                                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                                    <button
                                                        onClick={() => triggerDownload(photoSrc(photo.url), `photo-${index + 1}`)}
                                                        className="bg-black/60 text-white text-xs px-2 py-1 rounded"
                                                        aria-label="Download photo"
                                                    >
                                                        <Download className="h-3 w-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => handlePhotoDelete(photo)}
                                                        className="bg-black/60 text-white text-xs px-2 py-1 rounded"
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

            {/* Image lightbox */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-100 bg-black flex items-center justify-center overflow-hidden"
                    onClick={() => setSelectedImage(null)}
                >
                    <div
                        className="relative w-full h-full flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute top-6 right-6 z-20 flex gap-2">
                            <Button size="sm" variant='ghost'
                                className="text-white bg-cool-silver px-2 py-1 hover:bg-cool-silver/80"
                                onClick={() => setZoom((z) => Math.min(z + 0.2, 4))}>➕</Button>
                            <Button size="sm" variant="ghost"
                                className="text-white bg-cool-silver px-2 py-1 hover:bg-cool-silver/80"
                                onClick={() => setZoom((z) => Math.max(z - 0.2, 1))}>➖</Button>
                            <Button size="sm" variant="outline"
                                className="bg-cool-silver px-2 py-1 hover:bg-cool-silver/80"
                                onClick={() => { setZoom(1); setPosition({ x: 0, y: 0 }); }}>Reset</Button>
                            <Button size="sm" variant="outline"
                                className="bg-cool-silver px-2 py-1 hover:bg-cool-silver/80"
                                onClick={() => triggerDownload(selectedImage, 'evidence-photo')}>
                                <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="outline"
                                className="bg-cool-silver px-2 py-1 hover:bg-cool-silver/80"
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

            {/* Update dialog */}
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