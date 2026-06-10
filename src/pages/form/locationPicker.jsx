/**
 * LocationPicker.jsx — patched
 * ─────────────────────────────────────────────────────────────────────────────
 * Patches applied vs. the previous version:
 *
 *   1. RICHER MAP TILES
 *      Switched from plain OpenStreetMap to CartoDB Voyager — denser place
 *      labels, neighbourhood names visible at zoom 11+, professional look.
 *
 *   2. ZOOMED-IN DEFAULT
 *      Default centre is now Karachi at zoom 11 instead of the whole country
 *      at zoom 5. Means the user immediately sees neighbourhood labels on
 *      first render, instead of a label-sparse country-wide overview.
 *
 *   3. FREE-TEXT ADDRESS PICK
 *      The search dropdown now shows a "Use exactly what I typed" option at
 *      the top so the investigator can save an address that OSM doesn't know
 *      (informal landmarks, "behind the cricket ground", etc). Picking it
 *      saves the typed text as the address; the pin can then be placed
 *      manually on the map.
 *
 *   4. Z-INDEX ISOLATION
 *      Leaflet's panes default to z-index: 400, which punched through the
 *      sticky page header on scroll. Fixed by wrapping the map container
 *      in a `relative isolate z-0` div — that creates a new stacking
 *      context, so Leaflet's z-indices stay confined inside the wrapper.
 *      The header (typically z-30 or higher) now stays on top.
 *
 * Place at: src/components/LocationPicker.jsx
 *
 * (Required: `npm install leaflet react-leaflet` and import
 *  `'leaflet/dist/leaflet.css'` in main.jsx, as before.)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import {
  Search, Crosshair, MapPin, Loader2, X, AlertCircle, Edit3,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Marker icon (CDN-hosted to dodge bundler asset-path issues)
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_MARKER = new L.Icon({
  iconUrl:        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl:  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl:      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize:    [25, 41],
  iconAnchor:  [12, 41],
  popupAnchor: [1, -34],
  shadowSize:  [41, 41],
});

// ─────────────────────────────────────────────────────────────────────────────
// Defaults — Karachi at zoom 11 so labels are visible immediately.
// If your investigators mostly cover Islamabad/Lahore/etc, swap the lat/lng:
//   Islamabad → [33.6844, 73.0479]
//   Lahore    → [31.5204, 74.3587]
//   Peshawar  → [34.0151, 71.5249]
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_CENTER = [24.8607, 67.0011];   // Karachi
const DEFAULT_ZOOM   = 11;
const PINNED_ZOOM    = 16;                   // Zoom level when a pin is placed

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const UA_HEADER = { "Accept-Language": "en" };

// ─────────────────────────────────────────────────────────────────────────────
// CartoDB Voyager tile config — clean labels, no API key, free
// Reference: https://github.com/CartoDB/basemap-styles
// ─────────────────────────────────────────────────────────────────────────────

const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> ' +
  '&copy; <a href="https://carto.com/attributions">CARTO</a>';
const TILE_SUBDOMAINS = "abcd";
const TILE_MAX_ZOOM = 19;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const parseNominatimResult = (result) => {
  if (!result) return null;
  const a = result.address || {};
  return {
    latitude:       Number(parseFloat(result.lat).toFixed(6)),
    longitude:      Number(parseFloat(result.lon).toFixed(6)),
    displayAddress: result.display_name || "",
    city:           a.city || a.town || a.village || a.county || "",
    area:           a.suburb || a.neighbourhood || a.residential || a.quarter || "",
    province:       a.state || "",
    country:        a.country || "",
  };
};

const useDebounced = (value, delay = 600) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

// ─────────────────────────────────────────────────────────────────────────────
// Map helpers (children of MapContainer)
// ─────────────────────────────────────────────────────────────────────────────

function MapClickHandler({ onClick }) {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function MapRecenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (Array.isArray(center) && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      map.flyTo(center, zoom ?? map.getZoom(), { duration: 0.6 });
    }
  }, [center, zoom, map]);
  return null;
}

// ═════════════════════════════════════════════════════════════════════════════
// LocationPicker
// ═════════════════════════════════════════════════════════════════════════════

export default function LocationPicker({
  value = {},
  onChange,
  height = 320,
  countryCode = "pk",
  className = "",
}) {
  const lat = Number.isFinite(Number(value.latitude))  ? Number(value.latitude)  : null;
  const lng = Number.isFinite(Number(value.longitude)) ? Number(value.longitude) : null;
  const hasPin = lat !== null && lng !== null;

  const [query, setQuery]           = useState("");
  const debouncedQuery              = useDebounced(query, 600);
  const [results, setResults]       = useState([]);
  const [searching, setSearching]   = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const [locating, setLocating]     = useState(false);
  const [locateError, setLocateError] = useState(null);

  const [reversing, setReversing]   = useState(false);

  const lastSearchQuery = useRef("");
  const trimmedQuery = query.trim();
  const showFreeText = trimmedQuery.length >= 3;

  // ── Forward search ──────────────────────────────────────────────────────
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length < 3) {
      setResults([]);
      setSearchError(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    setSearchError(null);
    lastSearchQuery.current = q;

    const url =
      `${NOMINATIM_BASE}/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(q)}` +
      (countryCode ? `&countrycodes=${encodeURIComponent(countryCode)}` : "");

    fetch(url, { headers: UA_HEADER })
      .then(r => {
        if (!r.ok) throw new Error("Search failed");
        return r.json();
      })
      .then(data => {
        if (cancelled) return;
        if (lastSearchQuery.current !== q) return;
        setResults(Array.isArray(data) ? data : []);
        setSearchOpen(true);
      })
      .catch(() => {
        if (!cancelled) setSearchError("Couldn't reach location service. Check your connection.");
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery, countryCode]);

  // Open dropdown as soon as the user types enough characters,
  // even before the geocoder responds, so they see the "use my text" row.
  useEffect(() => {
    if (showFreeText) setSearchOpen(true);
    else setSearchOpen(false);
  }, [showFreeText]);

  // ── Reverse geocode helper ──────────────────────────────────────────────
  const reverseGeocode = async (latNum, lngNum) => {
    setReversing(true);
    try {
      const url = `${NOMINATIM_BASE}/reverse?format=json&addressdetails=1&lat=${latNum}&lon=${lngNum}`;
      const r = await fetch(url, { headers: UA_HEADER });
      if (!r.ok) throw new Error("Reverse failed");
      const data = await r.json();
      const parsed = parseNominatimResult(data);
      if (parsed) {
        parsed.latitude  = Number(latNum.toFixed(6));
        parsed.longitude = Number(lngNum.toFixed(6));
        onChange?.(parsed);
        return;
      }
    } catch {
      /* fall through to the bare-coords payload */
    } finally {
      setReversing(false);
    }
    onChange?.({
      latitude:       Number(latNum.toFixed(6)),
      longitude:      Number(lngNum.toFixed(6)),
      displayAddress: "",
      city: "", area: "", province: "", country: "",
    });
  };

  // ── Event handlers ──────────────────────────────────────────────────────
  const handlePickResult = (result) => {
    const parsed = parseNominatimResult(result);
    if (!parsed) return;
    setQuery(parsed.displayAddress.split(",")[0] || "");
    setSearchOpen(false);
    setResults([]);
    onChange?.(parsed);
  };

  // Pick the user's own typed text as the address — does NOT change the pin.
  // Useful when OSM doesn't know the place ("the empty plot beside the
  // cricket ground"). Investigator can drop the pin manually afterward.
  const handlePickFreeText = () => {
    const text = trimmedQuery;
    if (!text) return;
    setSearchOpen(false);
    setResults([]);
    onChange?.({
      // Keep existing pin if any — otherwise null
      latitude:       lat,
      longitude:      lng,
      displayAddress: text,
      city:           value.city || "",
      area:           value.area || "",
      province:       value.province || "",
      country:        value.country || "",
    });
  };

  const handleMapClick = ({ lat: la, lng: ln }) => {
    reverseGeocode(la, ln);
  };

  const handleMarkerDragEnd = (e) => {
    const { lat: la, lng: ln } = e.target.getLatLng();
    reverseGeocode(la, ln);
  };

  const handleUseMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocateError("Your browser doesn't support geolocation.");
      return;
    }
    setLocateError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setLocating(false);
        const msg =
          err.code === 1 ? "Location permission denied. Allow location access in your browser."
          : err.code === 2 ? "Location unavailable. Try again or pick on the map."
          : err.code === 3 ? "Location request timed out. Try again."
          : "Couldn't get your location.";
        setLocateError(msg);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setSearchOpen(false);
    onChange?.({
      latitude: null, longitude: null,
      displayAddress: "",
      city: "", area: "", province: "", country: "",
    });
  };

  // ── Map center: prefer the current pin, else PK default ─────────────────
  const center = useMemo(
    () => (hasPin ? [lat, lng] : DEFAULT_CENTER),
    [hasPin, lat, lng]
  );
  const zoom = hasPin ? PINNED_ZOOM : DEFAULT_ZOOM;

  return (
    <div className={`space-y-3 ${className}`}>

      {/* ── Search row ─────────────────────────────────────────────────── */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => showFreeText && setSearchOpen(true)}
              placeholder="Search address, place, or type your own — e.g. Clifton Block 5 Karachi"
              className="w-full pl-10 pr-9 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-deep-ocean focus:border-transparent"
              aria-label="Search address"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); setResults([]); setSearchOpen(false); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5 text-slate-400" />
              </button>
            )}
            {searching && (
              <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" aria-hidden />
            )}
          </div>

          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={locating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer transition-colors shrink-0"
            title="Use my current location"
          >
            {locating
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Crosshair className="h-4 w-4" />
            }
            <span className="hidden sm:inline">Use my location</span>
          </button>
        </div>

        {/* ── Search dropdown — free-text option + Nominatim results ───── */}
        {searchOpen && (showFreeText) && (
          <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">

            {/* Free-text option — always shown when input has 3+ chars */}
            <button
              type="button"
              onClick={handlePickFreeText}
              className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 border-b border-slate-100 cursor-pointer flex items-start gap-2 group"
              title="Use this exact text as the address. You can drop the pin manually on the map."
            >
              <Edit3 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
              <span className="text-xs leading-snug">
                <span className="block font-semibold text-emerald-700 group-hover:text-emerald-800">
                  Use exactly: "{trimmedQuery}"
                </span>
                <span className="text-[10px] text-slate-500">
                  Save this typed text as the address. Drop the pin manually if needed.
                </span>
              </span>
            </button>

            {/* Status row while geocoder is fetching */}
            {searching && results.length === 0 && (
              <div className="px-3 py-2.5 text-xs text-slate-500 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Looking up matches…
              </div>
            )}

            {/* Section heading + Nominatim results */}
            {results.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  Suggestions
                </div>
                {results.map((r, i) => (
                  <button
                    key={`${r.place_id || i}`}
                    type="button"
                    onClick={() => handlePickResult(r)}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 cursor-pointer flex items-start gap-2"
                  >
                    <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span className="text-xs text-slate-700 leading-snug">{r.display_name}</span>
                  </button>
                ))}
              </>
            )}

            {/* Nothing matched, but free-text option above is still useful */}
            {!searching && results.length === 0 && (
              <div className="px-3 py-2 text-[11px] text-slate-400 italic">
                No suggestions from the map service. You can still pick "Use exactly" above
                or click somewhere on the map to set the location.
              </div>
            )}
          </div>
        )}

        {searchError && (
          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {searchError}
          </p>
        )}
      </div>

      {/* ── Map (wrapped in `isolate` for z-index containment) ─────────── */}
      {/*
        The `isolate` class creates a new stacking context, so Leaflet's
        internal z-indices (panes default to 400, controls to 1000) are
        confined inside this wrapper. Without this, the map's tile pane
        sat above any sticky page header on scroll.
        See: https://developer.mozilla.org/en-US/docs/Web/CSS/isolation
      */}
      <div
        className="relative isolate z-0 rounded-lg overflow-hidden border border-slate-300"
        style={{ height }}
      >
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution={TILE_ATTR}
            url={TILE_URL}
            subdomains={TILE_SUBDOMAINS}
            maxZoom={TILE_MAX_ZOOM}
          />
          <MapClickHandler onClick={handleMapClick} />
          <MapRecenter center={center} zoom={zoom} />
          {hasPin && (
            <Marker
              position={[lat, lng]}
              draggable
              icon={DEFAULT_MARKER}
              eventHandlers={{ dragend: handleMarkerDragEnd }}
            />
          )}
        </MapContainer>

        {/* Soft hint — fades out once a pin is placed */}
        {!hasPin && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center z-400">
            <span className="bg-black/70 text-white text-[11px] font-medium px-3 py-1.5 rounded-full">
              Click on the map or search above to set the location
            </span>
          </div>
        )}

        {reversing && (
          <div className="absolute top-2 right-2 bg-white/90 border border-slate-200 rounded-md px-2 py-1 text-[11px] flex items-center gap-1.5 text-slate-600 shadow-sm z-400">
            <Loader2 className="h-3 w-3 animate-spin" /> Identifying address…
          </div>
        )}
      </div>

      {locateError && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {locateError}
        </p>
      )}

      {/* ── Read-only summary ──────────────────────────────────────────── */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
              Selected location
            </p>
            {(value.displayAddress || hasPin) ? (
              <>
                <p className="text-sm text-slate-800 wrap-break-word">
                  {value.displayAddress || <span className="italic text-slate-400">No address resolved</span>}
                </p>
                {hasPin && (
                  <p className="mt-1 text-xs font-mono text-slate-500">
                    {lat.toFixed(6)}, {lng.toFixed(6)}
                  </p>
                )}
                {!hasPin && value.displayAddress && (
                  <p className="mt-1 text-[11px] italic text-amber-700">
                    Address saved — pin not yet placed. Click on the map to mark coordinates.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400 italic">No location selected yet</p>
            )}
          </div>
          {(hasPin || value.displayAddress) && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-slate-500 hover:text-red-600 cursor-pointer underline shrink-0"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}