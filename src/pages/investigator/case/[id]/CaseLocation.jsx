import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import {
    MapPin, Building2, AlertTriangle, ExternalLink, Navigation,
    Clock, Shield, Loader2,
} from 'lucide-react';
import LeafletMap from '@/components/HotSpot/map';

// ── Helpers ──────────────────────────────────────────────────────────────────

const getAuthHeader = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// Severity → border/bg/text classes for the nearby-case badge.
const SEVERITY_STYLE = {
    Critical: 'text-red-700 bg-red-50 border-red-200',
    High:     'text-orange-700 bg-orange-50 border-orange-200',
    Medium:   'text-yellow-700 bg-yellow-50 border-yellow-200',
    Low:      'text-green-700 bg-green-50 border-green-200',
};

// LeafletMap expects severity in lower-case ("critical" / "high" / …) for
// its SEVERITY_CONFIG lookup; the API returns Title-case for the badge.
const toMapSeverity = (s) => (s || 'low').toLowerCase();

// "0.8 km" formatter — server gives us a plain number.
const fmtDistance = (km) => (km == null ? '—' : `${Number(km).toFixed(1)} km`);

// ── Component ────────────────────────────────────────────────────────────────

const CaseLocation = ({ caseId: caseIdProp }) => {
    const { id: caseIdFromUrl } = useParams();
    const caseId = caseIdProp || caseIdFromUrl || 'C-2053'; // graceful fallback

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const requestSeq = useRef(0);

    const fetchLocation = useCallback(async () => {
        if (!caseId) return;
        setLoading(true);
        setError(null);
        const seq = ++requestSeq.current;

        try {
            const url = import.meta.env.VITE_API_URL;
            const res = await axios.get(
                `${url}/api/investigator/cases/${caseId}/location`,
                {
                    headers: getAuthHeader(),
                    params: { nearby_radius_km: 3, nearby_limit: 10 },
                },
            );
            if (seq !== requestSeq.current) return;
            setData(res.data || null);
        } catch (err) {
            if (seq !== requestSeq.current) return;
            console.error('Failed to load case location:', err);
            setError(err?.response?.data?.detail || 'Could not load case location.');
            setData(null);
        } finally {
            if (seq === requestSeq.current) setLoading(false);
        }
    }, [caseId]);

    useEffect(() => { fetchLocation(); }, [fetchLocation]);

    // ── Loading state ────────────────────────────────────────────────────
    if (loading) {
        return (
            <section className="space-y-6" aria-label="Case Location">
                <header>
                    <h2 className="text-2xl font-bold text-slate-800">Crime Scene Location</h2>
                    <p className="text-sm text-slate-600 mt-1">Geographic details and nearby case activity</p>
                </header>
                <div className="flex items-center justify-center py-20 bg-white border border-slate-200 rounded-lg">
                    <span className="inline-flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Loading crime scene details…
                    </span>
                </div>
            </section>
        );
    }

    // ── Error state ──────────────────────────────────────────────────────
    if (error) {
        return (
            <section className="space-y-6" aria-label="Case Location">
                <header>
                    <h2 className="text-2xl font-bold text-slate-800">Crime Scene Location</h2>
                    <p className="text-sm text-slate-600 mt-1">Geographic details and nearby case activity</p>
                </header>
                <div className="flex items-center gap-2 px-5 py-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                    {error}
                </div>
            </section>
        );
    }

    // ── Empty state — case has no location row ───────────────────────────
    if (!data || !data.has_location) {
        return (
            <section className="space-y-6" aria-label="Case Location">
                <header>
                    <h2 className="text-2xl font-bold text-slate-800">Crime Scene Location</h2>
                    <p className="text-sm text-slate-600 mt-1">Geographic details and nearby case activity</p>
                </header>
                <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-lg text-slate-500">
                    <MapPin className="h-10 w-10 text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">No crime scene location on file</p>
                    <p className="text-sm mt-1">Add a location to this case to see the map and nearby activity.</p>
                </div>
            </section>
        );
    }

    // ── Normal render ────────────────────────────────────────────────────
    const { address, security, proximity, notes, nearby } = data;
    const coords = address?.coordinates;
    const hasCoords = coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng);

    // Build LeafletMap props from API data
    const mapPin = hasCoords ? {
        lat: coords.lat,
        lng: coords.lng,
        label: address.address,
        address: address.area || `${address.city || ''}${address.province ? `, ${address.province}` : ''}`.replace(/^,\s*/, ''),
    } : null;

    const nearbyPins = (nearby || [])
        .filter(n => Number.isFinite(n.lat) && Number.isFinite(n.lng))
        .map(n => ({
            id: n.id,
            lat: n.lat,
            lng: n.lng,
            severity: toMapSeverity(n.severity),
            title: n.title,
            distance: fmtDistance(n.distanceKm),
        }));

    return (
        <section className="space-y-6" aria-label="Case Location">
            {/* Header */}
            <header>
                <h2 className="text-2xl font-bold text-slate-800">Crime Scene Location</h2>
                <p className="text-sm text-slate-600 mt-1">Geographic details and nearby case activity</p>
            </header>

            {/* Top grid — map + details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* ── Map column ── */}
                <div className="space-y-4 lg:col-span-2">
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                        {hasCoords ? (
                            <LeafletMap
                                mode="single"
                                pin={mapPin}
                                nearbyPins={nearbyPins}
                                height="h-80"
                                initialZoom={14}
                                center={[coords.lat, coords.lng]}
                            />
                        ) : (
                            <div className="h-80 flex items-center justify-center text-sm text-slate-500">
                                Map unavailable — no coordinates recorded for this scene.
                            </div>
                        )}
                    </div>

                    {/* Nearby Cases */}
                    <article className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            <h3 className="text-base font-bold text-slate-800">Nearby Cases in the Area</h3>
                            {nearby?.length > 0 && (
                                <span className="ml-auto text-xs text-slate-500">{nearby.length} case{nearby.length === 1 ? '' : 's'}</span>
                            )}
                        </div>
                        <div className="divide-y divide-slate-100">
                            {(nearby?.length ?? 0) === 0 ? (
                                <div className="px-5 py-8 text-center text-sm text-slate-500">
                                    No other cases recorded within 3 km of this scene.
                                </div>
                            ) : (
                                nearby.map((nc, idx) => (
                                    // Same case_id can legitimately not collide here, but if
                                    // your DB ever has duplicates we still need a stable key.
                                    <div
                                        key={`${nc.id}-${idx}`}
                                        className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 w-2 h-2 rounded-full bg-red-800 shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">{nc.title}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {nc.id} · {nc.crimeType} · {nc.date}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="text-right">
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${SEVERITY_STYLE[nc.severity] || SEVERITY_STYLE.Low}`}>
                                                    {nc.severity}
                                                </span>
                                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 justify-end">
                                                    <Navigation className="h-3 w-3" />{fmtDistance(nc.distanceKm)}
                                                </p>
                                            </div>
                                            <a
                                                href={`/investigator/case/${encodeURIComponent(nc.id)}`}
                                                className="flex items-center gap-1 text-xs font-medium text-deep-ocean-500 hover:underline"
                                            >
                                                View <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </article>
                </div>

                {/* ── Location Details column ── */}
                <div className="space-y-4 h-full">

                    {/* Address card */}
                    <article className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                        <h3 className="text-base font-bold text-slate-800 border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-red-600" />
                            Crime Scene Address
                        </h3>
                        <div className="space-y-1.5 text-sm">
                            <p className="font-semibold text-slate-800">{address.address}</p>
                            {address.area && <p className="text-slate-600">{address.area}</p>}
                            {(address.city || address.province) && (
                                <p className="text-slate-600">
                                    {[address.city, address.province].filter(Boolean).join(', ')}
                                </p>
                            )}
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-sm">
                            {address.crimeSceneType && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Scene Type</span>
                                    <span className="text-slate-800 font-medium">{address.crimeSceneType}</span>
                                </div>
                            )}
                            {address.accessStatus && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Access Status</span>
                                    <span className="text-red-700 font-semibold bg-red-50 px-2 py-0.5 rounded text-xs">
                                        {address.accessStatus}
                                    </span>
                                </div>
                            )}
                        </div>
                    </article>

                    {/* Scene security card */}
                    <article className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                        <h3 className="text-base font-bold text-slate-800 border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                            <Shield className="h-4 w-4 text-slate-600" />
                            Scene Security
                        </h3>
                        <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between gap-2">
                                <span className="text-slate-500 shrink-0">Secured By</span>
                                <span className="text-slate-800 text-right">{security?.securedBy || '—'}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                                <span className="text-slate-500 shrink-0">Secured On</span>
                                <span className="text-slate-800 text-right">{security?.securedOn || '—'}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                                <span className="text-slate-500 shrink-0">Released On</span>
                                <span className={`text-right ${security?.releasedOn === 'Pending' ? 'text-slate-500 italic' : 'text-slate-800'}`}>
                                    {security?.releasedOn || 'Pending'}
                                </span>
                            </div>
                        </div>
                    </article>

                    {/* Proximity info */}
                    {(proximity?.nearestPoliceStation || proximity?.nearestHospital || proximity?.landmarks?.length > 0) && (
                        <article className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                            <h3 className="text-base font-bold text-slate-800 border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-slate-600" />
                                Proximity Info
                            </h3>
                            <div className="space-y-2 text-sm">
                                {proximity?.nearestPoliceStation && (
                                    <div className="flex items-start gap-2">
                                        <Shield className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
                                        <span className="text-slate-700">{proximity.nearestPoliceStation}</span>
                                    </div>
                                )}
                                {proximity?.nearestHospital && (
                                    <div className="flex items-start gap-2">
                                        <Clock className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                                        <span className="text-slate-700">{proximity.nearestHospital}</span>
                                    </div>
                                )}
                            </div>
                            {proximity?.landmarks?.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-100">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Landmarks</p>
                                    <ul className="space-y-1">
                                        {proximity.landmarks.map((lm, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                                                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                                {lm}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </article>
                    )}

                    {/* Scene notes — only shown when the API returns one */}
                    {notes && (
                        <article className="bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-sm">
                            <h3 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                Scene Notes
                            </h3>
                            <p className="text-sm text-amber-900">{notes}</p>
                        </article>
                    )}
                </div>
            </div>
        </section>
    );
};

export default CaseLocation;