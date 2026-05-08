import { useState } from 'react';
import { MapPin, Building2, AlertTriangle, ExternalLink, Navigation, Clock, Shield } from 'lucide-react';
import LeafletMap from '@/components/HotSpot/map';

const CASE_LOCATION = {
    address: 'Flat 4B, Block 7, Clifton Apartments',
    area: 'Clifton, Karachi',
    city: 'Karachi',
    province: 'Sindh',
    coordinates: { lat: 24.8133, lng: 67.0286 },
    crimeSceneType: 'Residential – Indoor',
    accessStatus: 'Secured',
    securedBy: 'Karachi Police – Clifton Division',
    securedOn: '15 Dec 2025, 11:30 PM',
    releasedOn: 'Pending',
    nearestPoliceStation: 'Clifton Police Station – 1.2 km',
    nearestHospital: 'Aga Khan University Hospital – 2.8 km',
    landmarks: ['Sea View Beach – 0.5 km', 'Dolmen Mall Clifton – 1.0 km', 'Clifton Bridge – 1.4 km'],
    notes: 'No forced entry. Scene secured with police tape. Forensic team completed sweep on 16 Dec 2025.',
};

const NEARBY_CASES = [
    { id: 'C-2040', title: 'Armed Robbery – Bank Branch', distance: '0.8 km', crimeType: 'Robbery', date: '20 Oct 2026', severity: 'Critical' },
    { id: 'C-2047', title: 'Drug Trafficking – Port Area', distance: '1.4 km', crimeType: 'Drug', date: '08 Nov 2026', severity: 'Critical' },
    { id: 'C-2045', title: 'Vehicle Theft – Gulshan', distance: '2.1 km', crimeType: 'Theft', date: '03 Nov 2026', severity: 'Low' },
    { id: 'C-2045', title: 'Vehicle Theft – Gulshan', distance: '2.1 km', crimeType: 'Theft', date: '03 Nov 2026', severity: 'Low' },
];

const SEVERITY_STYLE = {
    Critical: 'text-red-700 bg-red-50 border-red-200',
    High: 'text-orange-700 bg-orange-50 border-orange-200',
    Medium: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    Low: 'text-green-700 bg-green-50 border-green-200',
};

// ── Mini Pakistan SVG map with a single crime scene pin ──────────────────────
// We reuse the same simplified province paths as the dashboard map
const PROVINCES = [
    { id: 'punjab', d: 'M 230 180 L 270 160 L 320 170 L 345 200 L 350 240 L 330 270 L 300 290 L 260 285 L 230 270 L 215 245 L 220 210 Z' },
    { id: 'sindh', d: 'M 230 270 L 260 285 L 300 290 L 315 320 L 310 360 L 290 395 L 260 415 L 225 410 L 200 380 L 195 340 L 205 305 Z' },
    { id: 'balochistan', d: 'M 80 200 L 130 175 L 180 168 L 215 245 L 230 270 L 205 305 L 195 340 L 180 370 L 150 390 L 110 385 L 75 355 L 55 310 L 60 260 Z' },
    { id: 'kpk', d: 'M 180 168 L 215 145 L 230 120 L 250 110 L 260 130 L 270 160 L 230 180 L 215 245 Z' },
    { id: 'gb', d: 'M 230 120 L 250 110 L 270 90 L 310 75 L 345 85 L 360 110 L 345 135 L 320 145 L 295 150 L 270 160 L 260 130 Z' },
    { id: 'azk', d: 'M 295 150 L 320 145 L 345 135 L 355 155 L 345 175 L 320 170 L 270 160 Z' },
];

// Crime scene pin position (Karachi / Sindh area on the SVG)
const CRIME_SCENE_PIN = { x: 238, y: 375 };

// Nearby case pins (approximate positions around Karachi)
const NEARBY_PINS = [
    { x: 230, y: 360, id: 'C-2040', severity: 'Critical' },
    { x: 248, y: 383, id: 'C-2047', severity: 'Critical' },
    { x: 252, y: 368, id: 'C-2045', severity: 'Low' },
];

const PIN_COLOR = { Critical: '#991b1b', High: '#c2410c', Medium: '#a16207', Low: '#15803d' };

// ── Component ─────────────────────────────────────────────────────────────────
const CaseLocation = () => {
    const [tooltip, setTooltip] = useState(null);


    // ── Zoom controls


    return (
        <section className="space-y-6" aria-label="Case Location">

            {/* Header */}
            <header>
                <h2 className="text-2xl font-bold text-slate-800">Crime Scene Location</h2>
                <p className="text-sm text-slate-600 mt-1">Geographic details and nearby case activity</p>
            </header>

            {/* Top grid — map + details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* ── Map ── */}
                <div className='space-y-4 lg:col-span-2'>
                    <div>
                        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                            <LeafletMap
                                mode="single"
                                pin={{
                                    lat: 24.8133,
                                    lng: 67.0286,
                                    label: 'Flat 4B, Block 7, Clifton Apartments',
                                    address: 'Clifton, Karachi',
                                }}
                                nearbyPins={[
                                    { id: 'C-2040', lat: 24.8200, lng: 67.0150, severity: 'critical', title: 'Armed Robbery – Bank Branch', distance: '0.8 km' },
                                    { id: 'C-2047', lat: 24.8050, lng: 67.0400, severity: 'critical', title: 'Drug Trafficking – Port Area', distance: '1.4 km' },
                                    { id: 'C-2045', lat: 24.8300, lng: 67.0500, severity: 'low', title: 'Vehicle Theft – Gulshan', distance: '2.1 km' },
                                ]}
                                height="h-80"
                                initialZoom={14}
                                center={[24.8133, 67.0286]}
                            />
                        </div>
                    </div>
                    {/* Nearby Cases */}
                    <div >
                        <article className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-orange-600" />
                                <h3 className="text-base font-bold text-slate-800">Nearby Cases in the Area</h3>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {NEARBY_CASES.map(nc => (
                                    <div key={nc.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 w-2 h-2 rounded-full bg-red-800 shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">{nc.title}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{nc.id} · {nc.crimeType} · {nc.date}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="text-right">
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${SEVERITY_STYLE[nc.severity]}`}>
                                                    {nc.severity}
                                                </span>
                                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 justify-end">
                                                    <Navigation className="h-3 w-3" />{nc.distance}
                                                </p>
                                            </div>
                                            <a
                                                href="/investigator/case"
                                                className="flex items-center gap-1 text-xs font-medium text-deep-ocean-500 hover:underline"
                                            >
                                                View <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </article>
                    </div>
                </div>

                {/* ── Location Details ── */}
                <div className="space-y-4 h-full">

                    {/* Address card */}
                    <article className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                        <h3 className="text-base font-bold text-slate-800 border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-red-600" />
                            Crime Scene Address
                        </h3>
                        <div className="space-y-1.5 text-sm">
                            <p className="font-semibold text-slate-800">{CASE_LOCATION.address}</p>
                            <p className="text-slate-600">{CASE_LOCATION.area}</p>
                            <p className="text-slate-600">{CASE_LOCATION.city}, {CASE_LOCATION.province}</p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Scene Type</span>
                                <span className="text-slate-800 font-medium">{CASE_LOCATION.crimeSceneType}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Access Status</span>
                                <span className="text-red-700 font-semibold bg-red-50 px-2 py-0.5 rounded text-xs">{CASE_LOCATION.accessStatus}</span>
                            </div>
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
                                <span className="text-slate-800 text-right">{CASE_LOCATION.securedBy}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                                <span className="text-slate-500 shrink-0">Secured On</span>
                                <span className="text-slate-800 text-right">{CASE_LOCATION.securedOn}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                                <span className="text-slate-500 shrink-0">Released On</span>
                                <span className="text-slate-500 italic text-right">{CASE_LOCATION.releasedOn}</span>
                            </div>
                        </div>
                    </article>

                    {/* Proximity info */}
                    <article className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                        <h3 className="text-base font-bold text-slate-800 border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-slate-600" />
                            Proximity Info
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-2">
                                <Shield className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
                                <span className="text-slate-700">{CASE_LOCATION.nearestPoliceStation}</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Clock className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                                <span className="text-slate-700">{CASE_LOCATION.nearestHospital}</span>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Landmarks</p>
                            <ul className="space-y-1">
                                {CASE_LOCATION.landmarks.map((lm, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                        {lm}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </article>

                    {/* Scene notes */}
                    <article className="bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-sm">
                        <h3 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Scene Notes
                        </h3>
                        <p className="text-sm text-amber-900">{CASE_LOCATION.notes}</p>
                    </article>
                </div>
            </div>
        </section>
    );
};

export default CaseLocation;