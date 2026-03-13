import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import createCachedTileLayer from '../../utils/CachedTileLayer';
import { Card } from '../ui/Card';
import { MapPin } from 'lucide-react';

// Fix Leaflet default marker icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Severity config ───────────────────────────────────────────────────────────
const SEVERITY_CONFIG = {
    high: { color: '#991b1b', fillColor: '#ef4444', label: 'High', radius: 14 },
    medium: { color: '#c2410c', fillColor: '#f97316', label: 'Medium', radius: 10 },
    low: { color: '#a16207', fillColor: '#eab308', label: 'Low', radius: 7 },
    critical: { color: '#7f1d1d', fillColor: '#dc2626', label: 'Critical', radius: 16 },
    // internal keys — NOT shown in legend
    scene: { color: '#7f1d1d', fillColor: '#dc2626', label: 'Scene', radius: 12 },
    nearby: { color: '#1e3a8a', fillColor: '#3b82f6', label: 'Nearby', radius: 8 },
};

// Only these keys appear in the hotspot legend
const LEGEND_KEYS = ['high', 'medium', 'low'];

// ── Popup builders ────────────────────────────────────────────────────────────
const buildHotspotPopup = (hotspot) => {
    const cfg = SEVERITY_CONFIG[hotspot.severity] || SEVERITY_CONFIG.low;
    return `
        <div style="font-family:system-ui;min-width:150px;">
            <strong style="font-size:14px;">${hotspot.city}</strong>
            <p style="margin:4px 0 0;color:#555;font-size:12px;">${hotspot.province}</p>
            <hr style="margin:6px 0;border-color:#eee;" />
            <p style="margin:0;font-size:12px;">
                <span style="color:${cfg.fillColor};font-weight:600;">${cfg.label} Severity</span>
            </p>
            <p style="margin:4px 0 0;font-size:12px;">
                🔴 <strong>${hotspot.cases}</strong> active cases
            </p>
        </div>
    `;
};

const buildSinglePopup = (pin) => `
    <div style="font-family:system-ui;min-width:150px;">
        <strong style="font-size:13px;color:#dc2626;">📍 Crime Scene</strong>
        <p style="margin:4px 0 0;font-size:12px;color:#333;">${pin.label || ''}</p>
        ${pin.address ? `<p style="margin:4px 0 0;font-size:11px;color:#666;">${pin.address}</p>` : ''}
    </div>
`;

const buildNearbyPopup = (np) => {
    const cfg = SEVERITY_CONFIG[np.severity?.toLowerCase()];
    return `
        <div style="font-family:system-ui;min-width:140px;">
            <strong style="font-size:13px;">${np.id}</strong>
            <p style="margin:4px 0 0;font-size:12px;color:#555;">${np.title || 'Nearby Case'}</p>
            <p style="margin:4px 0 0;font-size:11px;color:#888;">${np.distance || ''}</p>
            <hr style="margin:6px 0;border-color:#eee;" />
            <p style="margin:0;font-size:12px;color:${cfg?.fillColor || '#555'};font-weight:600;">
                ${np.severity || ''} Severity
            </p>
        </div>
    `;
};

// ═════════════════════════════════════════════════════════════════════════════
//
//  LeafletMap — reusable map component
//
//  Props:
//  ┌─────────────┬──────────────────────────────────────────────────────────┐
//  │ mode        │ "hotspots" | "single"                                    │
//  │ hotspots    │ (hotspots mode) { id, city, lat, lng, severity, cases,   │
//  │             │  province }[]                                            │
//  │ pin         │ (single mode) { lat, lng, label, address? }              │
//  │ nearbyPins  │ (single mode) { id, lat, lng, severity, title?,          │
//  │             │  distance? }[]                                           │
//  │ height      │ Tailwind height class e.g. "h-80" (default "h-80")      │
//  │ initialZoom │ Initial Leaflet zoom level (default 5)                   │
//  │ center      │ [lat, lng] initial center (default Pakistan)             │
//  └─────────────┴──────────────────────────────────────────────────────────┘
//
// ═════════════════════════════════════════════════════════════════════════════

const LeafletMap = ({
    mode = 'hotspots',
    hotspots = [],
    pin = null,
    nearbyPins = [],
    height = 'h-80',
    initialZoom = 5,
    center = [30.3753, 69.3451],
}) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // ── Online / offline detection ────────────────────────────────────────
    useEffect(() => {
        const on = () => setIsOnline(true);
        const off = () => setIsOnline(false);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        return () => {
            window.removeEventListener('online', on);
            window.removeEventListener('offline', off);
        };
    }, []);

    useEffect(() => {
        if (mapInstanceRef.current || !mapRef.current) return;

        const map = L.map(mapRef.current, {
            center,
            zoom: initialZoom,
            minZoom: 3,
            maxZoom: 18,
            zoomControl: false,
            zoomAnimation: true,
            fadeAnimation: true,
            markerZoomAnimation: true
        });

        mapInstanceRef.current = map;

        // Cached tile layer (works offline after first load)
        createCachedTileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            subdomains: ['a', 'b', 'c'],
            maxZoom: 19,
        }).addTo(map);

        // Leaflet's native zoom control
        L.control.zoom({ position: 'topright' }).addTo(map);

        setTimeout(() => {
            const zoomContainer = mapRef.current?.querySelector('.leaflet-top.leaflet-right .leaflet-bar');
            if (!zoomContainer) return;
            if (zoomContainer.querySelector('.leaflet-control-zoom-reset')) return;

            const btn = L.DomUtil.create('a', 'leaflet-control-zoom-reset');
            btn.title = 'Reset view';
            btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
    `;
            btn.style.cssText = 'display:flex;align-items:center;justify-content:center;cursor:pointer;';
            btn.href = '#';

            L.DomEvent.on(btn, 'click', (e) => {
                L.DomEvent.preventDefault(e);
                L.DomEvent.stopPropagation(e);
                mapInstanceRef.current?.flyTo(center, initialZoom, {
                    animate: true,
                    duration: 1.2,      // seconds — increase for slower/smoother
                    easeLinearity: 0.25,     // 0 = very curved ease, 1 = linear. 0.25 is smooth
                });
            });

            zoomContainer.appendChild(btn);
        }, 100);

        // ── HOTSPOTS MODE ─────────────────────────────────────────────────
        if (mode === 'hotspots') {
            hotspots.forEach(hotspot => {
                const cfg = SEVERITY_CONFIG[hotspot.severity] || SEVERITY_CONFIG.low;
                L.circleMarker([hotspot.lat, hotspot.lng], {
                    radius: cfg.radius,
                    color: cfg.color,
                    fillColor: cfg.fillColor,
                    fillOpacity: 0.75,
                    weight: 2,
                })
                    .bindPopup(buildHotspotPopup(hotspot))
                    .addTo(map);
            });
        }

        // ── SINGLE / CASE LOCATION MODE ───────────────────────────────────
        if (mode === 'single') {
            // Nearby pins — smaller, blue border
            nearbyPins.forEach(np => {
                const cfg = SEVERITY_CONFIG[np.severity?.toLowerCase()] || SEVERITY_CONFIG.nearby;
                L.circleMarker([np.lat, np.lng], {
                    radius: 8,
                    color: SEVERITY_CONFIG.nearby.color,
                    fillColor: cfg.fillColor,
                    fillOpacity: 0.7,
                    weight: 1.5,
                })
                    .bindPopup(buildNearbyPopup(np))
                    .addTo(map);
            });

            // Crime scene pin — larger red, popup auto-opens
            if (pin) {
                L.circleMarker([pin.lat, pin.lng], {
                    radius: 14,
                    color: '#7f1d1d',
                    fillColor: '#dc2626',
                    fillOpacity: 0.85,
                    weight: 2.5,
                })
                    .bindPopup(buildSinglePopup(pin))
                    .openPopup()
                    .addTo(map);

                map.setView([pin.lat, pin.lng], initialZoom);
            }
        }

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []); // intentionally runs once — Leaflet manages its own state

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <Card className="p-5 bg-card border border-border shadow-sm animate-slide-up">
            <div className={mode === 'hotspots' ? 'grid grid-cols-1 lg:grid-cols-3 gap-6' : ''}>

                {/* ── Hotspots sidebar (legend + top list) ── */}
                {mode === 'hotspots' && (
                    <div className="space-y-5">
                        <h2 className="text-lg font-semibold text-foreground">
                            Crime Hotspot Locations
                        </h2>

                        {/* Legend — only high/medium/low, NOT scene/nearby/critical */}
                        <div className="space-y-3">
                            {LEGEND_KEYS.map(key => {
                                const cfg = SEVERITY_CONFIG[key];
                                return (
                                    <div key={key} className="flex items-center gap-3">
                                        <div
                                            className="w-4 h-4 rounded-full shrink-0"
                                            style={{ backgroundColor: cfg.fillColor, boxShadow: `0 0 6px ${cfg.fillColor}80` }}
                                        />
                                        <span className="text-sm text-foreground">{cfg.label}</span>
                                        <span className="text-xs text-muted-foreground ml-auto">
                                            {hotspots.filter(h => h.severity === key).reduce((a, h) => a + h.cases, 0)} cases
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="border-t border-border" />

                        {/* Top hotspots — click to fly */}
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                Top Hotspots
                            </p>
                            <div className="space-y-2">
                                {[...hotspots]
                                    .sort((a, b) => b.cases - a.cases)
                                    .slice(0, 3)
                                    .map(h => (
                                        <div
                                            key={h.id}
                                            className="flex items-center justify-between cursor-pointer hover:bg-accent rounded px-1 py-0.5 transition-colors"
                                            onClick={() => mapInstanceRef.current?.flyTo([h.lat, h.lng], 15, { animate: true, duration: 1 })}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full shrink-0"
                                                    style={{ backgroundColor: SEVERITY_CONFIG[h.severity].fillColor }} />
                                                <span className="text-sm text-foreground">{h.city}</span>
                                            </div>
                                            <span className="text-xs font-medium text-muted-foreground">
                                                {h.cases} cases
                                            </span>
                                        </div>
                                    ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-3">↑ Click a city to fly to it</p>
                        </div>
                    </div>
                )}

                {/* ── Map column ── */}
                <div className={mode === 'hotspots' ? 'lg:col-span-2 space-y-2' : 'space-y-2'}>

                    {/* Toolbar — only in single mode, only when pin exists */}
                    {mode === 'single' && pin && (  // ✅ pin null-check before accessing pin.address
                        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-red-600" />
                                <span className="text-sm font-medium text-slate-700">
                                    {pin.address || pin.label || 'Crime Scene'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Leaflet map div — Leaflet controls zoom/pan, no extra handlers needed */}
                    <div
                        ref={mapRef}
                        className={`w-full ${height} rounded-lg overflow-hidden border border-border`}
                        style={{ zIndex: 0 }}
                    />

                    <p className="text-xs text-muted-foreground text-right">
                        Click a marker to see details · Scroll to zoom
                    </p>
                </div>
            </div>
        </Card>
    );
};

export default LeafletMap;