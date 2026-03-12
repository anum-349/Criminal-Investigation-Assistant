import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Card } from '../ui/Card'; // adjust path
import createCachedTileLayer from '../../utils/CachedTileLayer'; // adjust path

// Fix Leaflet default marker icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const HOTSPOTS = [
    { id: 1, city: 'Karachi',    lat: 24.8607, lng: 67.0011, severity: 'high',   cases: 14, province: 'Sindh' },
    { id: 2, city: 'Lahore',     lat: 31.5204, lng: 74.3587, severity: 'high',   cases: 11, province: 'Punjab' },
    { id: 3, city: 'Rawalpindi', lat: 33.5651, lng: 73.0169, severity: 'medium', cases: 7,  province: 'Punjab' },
    { id: 4, city: 'Peshawar',   lat: 34.0151, lng: 71.5249, severity: 'medium', cases: 6,  province: 'KPK' },
    { id: 5, city: 'Quetta',     lat: 30.1798, lng: 66.9750, severity: 'high',   cases: 9,  province: 'Balochistan' },
    { id: 6, city: 'Multan',     lat: 30.1575, lng: 71.5249, severity: 'medium', cases: 5,  province: 'Punjab' },
    { id: 7, city: 'Hyderabad',  lat: 25.3960, lng: 68.3578, severity: 'low',    cases: 3,  province: 'Sindh' },
    { id: 8, city: 'Faisalabad', lat: 31.4504, lng: 73.1350, severity: 'low',    cases: 4,  province: 'Punjab' },
    { id: 9, city: 'Gujranwala', lat: 32.1877, lng: 74.1945, severity: 'medium', cases: 5,  province: 'Punjab' },
    { id: 10, city: 'Islamabad', lat: 33.6844, lng: 73.0479, severity: 'low',    cases: 2,  province: 'ICT' },
];

const SEVERITY_CONFIG = {
    high:   { color: '#991b1b', fillColor: '#ef4444', label: 'High'   },
    medium: { color: '#c2410c', fillColor: '#f97316', label: 'Medium' },
    low:    { color: '#a16207', fillColor: '#eab308', label: 'Low'    },
};

const CrimeHotspotMap = () => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [cachedCount, setCachedCount] = useState(0);

    useEffect(() => {
        const handleOnline  = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online',  handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online',  handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        if (mapInstanceRef.current || !mapRef.current) return;

        // Initialize map centered on Pakistan
        const map = L.map(mapRef.current, {
            center: [30.3753, 69.3451],
            zoom: 5,
            minZoom: 4,
            maxZoom: 16,
            zoomControl: false, // we'll add custom controls
        });

        mapInstanceRef.current = map;

        // Add cached tile layer
        const tileLayer = createCachedTileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
                attribution: '© OpenStreetMap contributors',
                subdomains: ['a', 'b', 'c'],
                maxZoom: 19,
            }
        );
        tileLayer.addTo(map);

        // Add custom zoom controls (top-right)
        L.control.zoom({ position: 'topright' }).addTo(map);

        // Add hotspot circle markers
        HOTSPOTS.forEach((hotspot) => {
            const cfg = SEVERITY_CONFIG[hotspot.severity];

            const circle = L.circleMarker([hotspot.lat, hotspot.lng], {
                radius: hotspot.severity === 'high' ? 14 : hotspot.severity === 'medium' ? 10 : 7,
                color: cfg.color,
                fillColor: cfg.fillColor,
                fillOpacity: 0.75,
                weight: 2,
            });

            circle.bindPopup(`
                <div style="font-family: system-ui; min-width: 140px;">
                    <strong style="font-size: 14px;">${hotspot.city}</strong>
                    <p style="margin: 4px 0 0; color: #555; font-size: 12px;">${hotspot.province}</p>
                    <hr style="margin: 6px 0; border-color: #eee;" />
                    <p style="margin: 0; font-size: 12px;">
                        <span style="color: ${cfg.fillColor}; font-weight: 600;">${cfg.label} Severity</span>
                    </p>
                    <p style="margin: 4px 0 0; font-size: 12px;">
                        🔴 <strong>${hotspot.cases}</strong> active cases
                    </p>
                </div>
            `);

            circle.addTo(map);
        });

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    return (
        <Card className="p-5 bg-card border border-border shadow-sm animate-slide-up">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Legend + Top Hotspots */}
                <div className="space-y-5">
                    <h2 className="text-lg font-semibold text-foreground">
                        Crime Hotspot Locations
                    </h2>

                    {/* Severity Legend */}
                    <div className="space-y-3">
                        {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => (
                            <div key={key} className="flex items-center gap-3">
                                <div
                                    className="w-4 h-4 rounded-full shrink-0"
                                    style={{
                                        backgroundColor: cfg.fillColor,
                                        boxShadow: `0 0 6px ${cfg.fillColor}80`
                                    }}
                                />
                                <span className="text-sm text-foreground">{cfg.label}</span>
                                <span className="text-xs text-muted-foreground ml-auto">
                                    {HOTSPOTS.filter(h => h.severity === key).reduce((a, h) => a + h.cases, 0)} cases
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-border" />

                    {/* Top Hotspots */}
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            Top Hotspots
                        </p>
                        <div className="space-y-2">
                            {[...HOTSPOTS]
                                .sort((a, b) => b.cases - a.cases)
                                .slice(0, 3)
                                .map(h => (
                                    <div
                                        key={h.id}
                                        className="flex items-center justify-between cursor-pointer hover:bg-accent rounded px-1 py-0.5 transition-colors"
                                        onClick={() => {
                                            mapInstanceRef.current?.flyTo(
                                                [h.lat, h.lng], 10,
                                                { animate: true, duration: 1 }
                                            );
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-2 h-2 rounded-full shrink-0"
                                                style={{ backgroundColor: SEVERITY_CONFIG[h.severity].fillColor }}
                                            />
                                            <span className="text-sm text-foreground">{h.city}</span>
                                        </div>
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {h.cases} cases
                                        </span>
                                    </div>
                                ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                            ↑ Click a city to fly to it
                        </p>
                    </div>
                </div>

                {/* Map */}
                <div className="lg:col-span-2">
                    <div
                        ref={mapRef}
                        className="w-full h-64 lg:h-80 rounded-lg overflow-hidden border border-border"
                        style={{ zIndex: 0 }}
                    />
                    <p className="text-xs text-muted-foreground mt-2 text-right">
                        Click a marker to see case details · Scroll to zoom
                    </p>
                </div>
            </div>
        </Card>
    );
};

export default CrimeHotspotMap;