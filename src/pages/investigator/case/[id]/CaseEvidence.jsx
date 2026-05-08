import { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import {
    Search, ChevronDown, Calendar, X, ExternalLink, Pencil,
    Loader2, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';
import AddEvidenceDialog from './forms/AddEvidence';
const PAGE_SIZE = 5;
const STATUSES = [
    { value: 'all', label: 'All Evidences' },
    { value: 'Analyzed', label: 'Analyzed' },
    { value: 'Pending Analysis', label: 'Pending Analysis' },
];

// Build absolute URL for a photo. Photos saved by the backend come back as
// "/uploads/..." paths; we prefix them with VITE_API_URL so the <img> resolves.
const photoSrc = (rawUrl) => {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('http')) return rawUrl;
    if (rawUrl.startsWith('/uploads')) return `${import.meta.env.VITE_API_URL}${rawUrl}`;
    return rawUrl;
};

const rowToFormShape = (row) => {
    if (!row) return null;
    return {
        // React key for the EvidenceCard
        id: row.id,
        // Form fields
        evidenceId: row.id,                 // map external ID → form's evidenceId
        type: row.type || "",
        dateCollected: row.date || "",         // ← the key fix: date → dateCollected
        collectedBy: row.collectedBy || "",
        description: row.description || "",
        fileName: row.fileName || "",
        status: row.status,
        // Existing photos already on the row, in the form's shape.
        // dataUrl is set to the public URL so <img src> still resolves.
        photos: (row.photos || []).map((p) => ({
            existingPhotoId: p.id,             // marks "already on server"
            name: p.file_name || `photo-${p.id}`,
            dataUrl: p.url,
        })),
    };
};

const formShapeToPatchBody = (formItem) => ({
    type: formItem?.type,
    description: formItem?.description,
    dateCollected: formItem?.dateCollected,
    collectedBy: formItem?.collectedBy,
    status: formItem?.status,
});

const getAuthHeader = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const CaseEvidence = () => {
    const { id: caseIdFromUrl } = useParams();
    const caseId = caseIdFromUrl || 'C-2053';   // graceful fallback if mounted outside the dynamic route

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

    // ── Fetch ─────────────────────────────────────────────────────────────
    const fetchEvidences = useCallback(async () => {
        if (!caseId) return;
        setLoading(true);
        setError(null);
        const seq = ++requestSeq.current;

        try {
            const url = import.meta.env.VITE_API_URL;
            const res = await axios.get(
                `${url}/api/investigator/cases/${caseId}/evidences`,
                {
                    headers: getAuthHeader(),
                    params: {
                        search: appliedFilters.name,
                        date: appliedFilters.date,
                        status: appliedFilters.status,
                        page: currentPage,
                        page_size: PAGE_SIZE,
                    },
                },
            );
            if (seq !== requestSeq.current) return;
            setItems(res.data?.items || []);
            setTotal(res.data?.total || 0);
        } catch (err) {
            if (seq !== requestSeq.current) return;
            console.error('Failed to load evidences:', err);
            setError(err?.response?.data?.detail || 'Could not load evidences.');
            setItems([]);
            setTotal(0);
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

    // ── Photo upload (POST base-64 dataURL) ───────────────────────────────
    const handlePhotoUpload = async (file) => {
        if (!file || !dialogEvidence) return;
        setUploading(true);

        try {
            // Convert to base64 dataURL the way the old code did
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const url = import.meta.env.VITE_API_URL;
            const res = await axios.post(
                `${url}/api/investigator/cases/${caseId}/evidences/${dialogEvidence.id}/photos`,
                { dataUrl, fileName: file.name },
                { headers: getAuthHeader() },
            );

            // Replace the dialog's photos with the server-returned full list
            setDialogEvidence((prev) => prev && ({
                ...prev,
                photos: res.data?.photos || [],
            }));

            // Refresh the table row so its photo count matches
            setItems(curr =>
                curr.map(it =>
                    it.id === dialogEvidence.id
                        ? { ...it, photos: res.data?.photos || [] }
                        : it,
                ),
            );
        } catch (err) {
            console.error('Photo upload failed:', err);
            alert(`Upload failed: ${err?.response?.data?.detail || err.message}`);
        } finally {
            setUploading(false);
        }
    };

    // ── Photo delete (DELETE by photo_id) ────────────────────────────────
    const handlePhotoDelete = async (photo) => {
        if (!photo?.id || !dialogEvidence) return;
        if (!confirm('Delete this photo?')) return;

        try {
            const url = import.meta.env.VITE_API_URL;
            const res = await axios.delete(
                `${url}/api/investigator/cases/${caseId}/evidences/${dialogEvidence.id}/photos/${photo.id}`,
                { headers: getAuthHeader() },
            );
            setDialogEvidence((prev) => prev && ({
                ...prev,
                photos: res.data?.photos || [],
            }));
            setItems(curr =>
                curr.map(it =>
                    it.id === dialogEvidence.id
                        ? { ...it, photos: res.data?.photos || [] }
                        : it,
                ),
            );
        } catch (err) {
            console.error('Photo delete failed:', err);
            alert(`Delete failed: ${err?.response?.data?.detail || err.message}`);
        }
    };

    // ── Update dialog submit ──────────────────────────────────────────────

    const handleUpdateSubmit = async (data) => {
        const evid = updateTarget?.id;
        const first = data?.evidences?.[0];
        if (!evid || !first) {
            setUpdateTarget(null);
            return;
        }

        try {
            const url = import.meta.env.VITE_API_URL;

            // 1. PATCH the row's editable fields.
            const res = await axios.patch(
                `${url}/api/investigator/cases/${caseId}/evidences/${evid}`,
                formShapeToPatchBody(first),
                { headers: getAuthHeader() },
            );

            // 2. Upload any NEW photos (photos without an existingPhotoId
            //    were added during this editing session).
            const newPhotos = (first.photos || []).filter((p) => !p.existingPhotoId);
            let latest = res.data;
            for (const ph of newPhotos) {
                if (!ph.dataUrl || !ph.dataUrl.startsWith("data:")) continue;
                try {
                    const photoRes = await axios.post(
                        `${url}/api/investigator/cases/${caseId}/evidences/${evid}/photos`,
                        { dataUrl: ph.dataUrl, fileName: ph.name },
                        { headers: getAuthHeader() },
                    );
                    // Keep the latest photos list so we can patch the row in place.
                    latest = { ...latest, photos: photoRes.data?.photos || latest.photos };
                } catch (err) {
                    console.warn(`Photo upload failed (${ph.name}):`, err);
                }
            }

            // 3. Patch the row in the table without a full refetch.
            setItems((curr) =>
                curr.map((it) => (it.id === evid ? latest : it)),
            );
        } catch (err) {
            console.error("Update failed:", err);
            alert(`Update failed: ${err?.response?.data?.detail || err.message}`);
        } finally {
            setUpdateTarget(null);
        }
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
                                <th className="p-4 font-semibold uppercase text-[11px] tracking-wide">Photos</th>
                                <th scope="col" className="p-4 font-semibold uppercase text-[11px] tracking-wide text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-500">
                                        <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                                        Loading evidences…
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-500">
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
                                                className={'px-4 py-2 '}
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
                            <section>
                                <p><span className="font-semibold">Evidence ID:</span> {dialogEvidence.id}</p>
                                <p><span className="font-semibold">Type:</span> {dialogEvidence.type}</p>
                                <p><span className="font-semibold">Collected By:</span> {dialogEvidence.collectedBy || '—'}</p>
                                <p><span className="font-semibold">Date:</span> {dialogEvidence.date || '—'}</p>
                                <p>
                                    <span className="font-semibold">Status:</span>{' '}
                                    <Badge variant={dialogEvidence.status === 'Analyzed' ? 'success' : 'warning'}>
                                        {dialogEvidence.status}
                                    </Badge>
                                </p>
                            </section>

                            <section>
                                <h4 className="font-semibold mt-4 mb-2">Description</h4>
                                <p className="text-slate-700">{dialogEvidence.description || '—'}</p>
                            </section>

                            <section>
                                <div className="flex justify-between items-center mt-6 mb-3">
                                    <h4 className="font-semibold text-slate-800">
                                        Evidence Photographs
                                    </h4>

                                    <label className={`cursor-pointer text-sm text-blue-600 hover:underline ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {uploading ? (
                                            <><Loader2 className="h-3.5 w-3.5 inline animate-spin mr-1" /> Uploading…</>
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
                                                <button
                                                    onClick={() => handlePhotoDelete(photo)}
                                                    className="absolute top-2 cursor-pointer right-2 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
                                                    aria-label="Delete photo"
                                                >
                                                    🗑
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 italic">No photos attached yet.</p>
                                )}
                            </section>
                        </div>
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
                                className=" bg-cool-silver px-2 py-1 hover:bg-cool-silver/80"
                                onClick={() => { setZoom(1); setPosition({ x: 0, y: 0 }); }}>Reset</Button>
                            <Button size="sm" variant="outline"
                                className=" bg-cool-silver px-2 py-1 hover:bg-cool-silver/80"
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