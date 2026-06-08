'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

export interface LocationPoint {
  lat: number; lng: number; address: string;
}

interface Props {
  apiKey: string;
  onOriginSet: (pt: LocationPoint) => void;
  onDestSet:   (pt: LocationPoint) => void;
  origin: LocationPoint | null;
  dest:   LocationPoint | null;
}

type ActivePin = 'origin' | 'dest';

declare global {
  interface Window { google: typeof google; }
}

export default function RouteMap({ apiKey, onOriginSet, onDestSet, origin, dest }: Props) {
  const mapDivRef   = useRef<HTMLDivElement>(null);
  const mapRef      = useRef<google.maps.Map | null>(null);
  const gRef        = useRef<typeof google | null>(null);
  const markerA     = useRef<google.maps.Marker | null>(null);
  const markerB     = useRef<google.maps.Marker | null>(null);
  const dirRenderer = useRef<google.maps.DirectionsRenderer | null>(null);
  const originACRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destACRef   = useRef<google.maps.places.Autocomplete | null>(null);

  const [activePin,  setActivePin]  = useState<ActivePin>('origin');
  const [mapLoaded,  setMapLoaded]  = useState(false);
  const [loadError,  setLoadError]  = useState<string | null>(null);
  const [routeInfo,  setRouteInfo]  = useState<{ distance: string; duration: string } | null>(null);

  // ── Geocode lat/lng → address string ──────────────────────────
  const geocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    if (!gRef.current) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    return new Promise((resolve) => {
      const gc = new gRef.current!.maps.Geocoder();
      gc.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results?.[0]) resolve(results[0].formatted_address);
        else resolve(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      });
    });
  }, []);

  // ── Draw / update route between two markers ───────────────────
  const drawRoute = useCallback((a: LocationPoint, b: LocationPoint) => {
    if (!gRef.current || !mapRef.current || !dirRenderer.current) return;
    const svc = new gRef.current.maps.DirectionsService();
    svc.route(
      { origin: { lat: a.lat, lng: a.lng }, destination: { lat: b.lat, lng: b.lng }, travelMode: gRef.current.maps.TravelMode.DRIVING },
      (result, status) => {
        if (status === 'OK' && result) {
          dirRenderer.current!.setDirections(result);
          const leg = result.routes[0].legs[0];
          setRouteInfo({ distance: leg.distance?.text || '', duration: leg.duration?.text || '' });
        }
      }
    );
  }, []);

  // ── Place / move a named marker ───────────────────────────────
  const placeMarker = useCallback((pin: ActivePin, lat: number, lng: number) => {
    if (!gRef.current || !mapRef.current) return;
    const isOrigin = pin === 'origin';
    const ref      = isOrigin ? markerA : markerB;

    if (ref.current) ref.current.setMap(null);

    ref.current = new gRef.current.maps.Marker({
      position: { lat, lng },
      map:      mapRef.current,
      label:    { text: isOrigin ? 'A' : 'B', color: 'white', fontWeight: 'bold' },
      title:    isOrigin ? 'Titik Keberangkatan' : 'Titik Tujuan',
      icon: {
        path: gRef.current.maps.SymbolPath.CIRCLE,
        scale:       16,
        fillColor:   isOrigin ? '#2563eb' : '#dc2626',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
    });
  }, []);

  // ── Bootstrap Google Maps ─────────────────────────────────────
  useEffect(() => {
    if (!apiKey || !mapDivRef.current) return;

    const loader = new Loader({ apiKey, version: 'weekly', libraries: ['places', 'geometry'] });

    loader.load().then((google) => {
      gRef.current = google;

      const map = new google.maps.Map(mapDivRef.current!, {
        center:             { lat: -6.2088, lng: 106.8456 }, // Jakarta
        zoom:               12,
        mapTypeControl:     false,
        streetViewControl:  false,
        fullscreenControl:  false,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
      });
      mapRef.current = map;

      dirRenderer.current = new google.maps.DirectionsRenderer({
        suppressMarkers:  true,
        polylineOptions:  { strokeColor: '#2563eb', strokeWeight: 4, strokeOpacity: 0.7 },
      });
      dirRenderer.current.setMap(map);

      // ── Places Autocomplete for origin input ──────────────────
      const originInput = document.getElementById('fuel-origin-input') as HTMLInputElement;
      if (originInput) {
        const ac = new google.maps.places.Autocomplete(originInput, { componentRestrictions: { country: 'id' }, fields: ['geometry', 'formatted_address'] });
        originACRef.current = ac;
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (!place.geometry?.location) return;
          const pt: LocationPoint = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), address: place.formatted_address || originInput.value };
          placeMarker('origin', pt.lat, pt.lng);
          map.panTo({ lat: pt.lat, lng: pt.lng });
          onOriginSet(pt);
        });
      }

      // ── Places Autocomplete for dest input ────────────────────
      const destInput = document.getElementById('fuel-dest-input') as HTMLInputElement;
      if (destInput) {
        const ac = new google.maps.places.Autocomplete(destInput, { componentRestrictions: { country: 'id' }, fields: ['geometry', 'formatted_address'] });
        destACRef.current = ac;
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (!place.geometry?.location) return;
          const pt: LocationPoint = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), address: place.formatted_address || destInput.value };
          placeMarker('dest', pt.lat, pt.lng);
          map.panTo({ lat: pt.lat, lng: pt.lng });
          onDestSet(pt);
        });
      }

      // ── Click-to-drop-pin ─────────────────────────────────────
      map.addListener('click', async (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        const address = await geocode(lat, lng);
        const pt: LocationPoint = { lat, lng, address };

        // Read current activePin from the DOM button to avoid stale closure
        const activePinEl = document.querySelector<HTMLButtonElement>('[data-active-pin="true"]');
        const pin = (activePinEl?.dataset.pin as ActivePin) || 'origin';

        placeMarker(pin, lat, lng);
        if (pin === 'origin') { onOriginSet(pt); }
        else                  { onDestSet(pt);   }
      });

      setMapLoaded(true);
    }).catch((err) => {
      setLoadError(err.message || 'Gagal memuat Google Maps');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // ── Draw route when both points available ─────────────────────
  useEffect(() => {
    if (origin && dest && mapLoaded) drawRoute(origin, dest);
  }, [origin, dest, mapLoaded, drawRoute]);

  if (loadError) {
    return (
      <div className="h-72 rounded-xl bg-gray-100 flex items-center justify-center text-sm text-gray-500 p-4 text-center">
        <div>
          <p className="font-medium text-red-500 mb-1">Gagal memuat Google Maps</p>
          <p className="text-xs">{loadError}</p>
          <p className="text-xs mt-2 text-gray-400">Pastikan <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> sudah diisi dan API aktif (Maps JS, Places, Directions, Distance Matrix).</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Address inputs */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold shrink-0">A</span>
          <input
            id="fuel-origin-input"
            type="text"
            placeholder="Titik keberangkatan…"
            onClick={() => setActivePin('origin')}
            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold shrink-0">B</span>
          <input
            id="fuel-dest-input"
            type="text"
            placeholder="Titik tujuan…"
            onClick={() => setActivePin('dest')}
            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Pin-drop mode selector */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-500">Mode klik peta:</span>
        {(['origin', 'dest'] as ActivePin[]).map((pin) => (
          <button
            key={pin}
            type="button"
            data-pin={pin}
            data-active-pin={activePin === pin ? 'true' : undefined}
            onClick={() => setActivePin(pin)}
            className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
              activePin === pin
                ? (pin === 'origin' ? 'bg-brand-600 text-white' : 'bg-red-500 text-white')
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {pin === 'origin' ? '🔵 Titik A' : '🔴 Titik B'}
          </button>
        ))}
        <span className="text-gray-400">← klik peta untuk memasang pin</span>
      </div>

      {/* Map canvas */}
      <div
        ref={mapDivRef}
        className="w-full h-80 rounded-xl border border-gray-200 overflow-hidden bg-gray-100"
        style={{ minHeight: 320 }}
      >
        {!mapLoaded && (
          <div className="h-full flex items-center justify-center text-sm text-gray-400 animate-pulse">
            Memuat Google Maps…
          </div>
        )}
      </div>

      {/* Route info */}
      {routeInfo && (
        <div className="flex gap-4 text-sm bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
          <span className="font-semibold text-blue-800">🛣 Rute ditemukan:</span>
          <span className="text-blue-700 font-bold">{routeInfo.distance}</span>
          <span className="text-blue-500">·</span>
          <span className="text-blue-600">≈ {routeInfo.duration} berkendara</span>
        </div>
      )}

      {/* Location chips */}
      {(origin || dest) && (
        <div className="space-y-1">
          {origin && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold shrink-0 text-[10px]">A</span>
              <span className="truncate">{origin.address}</span>
            </div>
          )}
          {dest && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center font-bold shrink-0 text-[10px]">B</span>
              <span className="truncate">{dest.address}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
