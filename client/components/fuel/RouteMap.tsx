'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

export interface LocationPoint {
  lat: number; lng: number; address: string;
}

interface Props {
  apiKey:       string;
  onOriginSet:  (pt: LocationPoint) => void;
  onDestSet:    (pt: LocationPoint) => void;
  origin:       LocationPoint | null;
  dest:         LocationPoint | null;
}

type ActivePin = 'origin' | 'dest';

export default function RouteMap({ apiKey, onOriginSet, onDestSet, origin, dest }: Props) {
  const mapDivRef        = useRef<HTMLDivElement>(null);
  const originContRef    = useRef<HTMLDivElement>(null);
  const destContRef      = useRef<HTMLDivElement>(null);
  const mapRef           = useRef<google.maps.Map | null>(null);
  const gRef             = useRef<typeof google | null>(null);
  const markerA          = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const markerB          = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const dirRenderer      = useRef<google.maps.DirectionsRenderer | null>(null);

  const [activePin,  setActivePin]  = useState<ActivePin>('origin');
  const [mapLoaded,  setMapLoaded]  = useState(false);
  const [loadError,  setLoadError]  = useState<string | null>(null);
  const [routeInfo,  setRouteInfo]  = useState<{ distance: string; duration: string } | null>(null);

  // ── Geocode lat/lng → address ──────────────────────────────────
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

  // ── Draw route ─────────────────────────────────────────────────
  const drawRoute = useCallback((a: LocationPoint, b: LocationPoint) => {
    if (!gRef.current || !mapRef.current || !dirRenderer.current) return;
    new gRef.current.maps.DirectionsService().route(
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

  // ── Place AdvancedMarker ───────────────────────────────────────
  const placeMarker = useCallback((pin: ActivePin, lat: number, lng: number) => {
    if (!gRef.current || !mapRef.current) return;
    const isOrigin = pin === 'origin';
    const ref      = isOrigin ? markerA : markerB;
    if (ref.current) ref.current.map = null;

    const dot = document.createElement('div');
    dot.style.cssText = `
      width:32px;height:32px;border-radius:50%;display:flex;align-items:center;
      justify-content:center;font-weight:bold;font-size:14px;color:white;
      background:${isOrigin ? '#2563eb' : '#dc2626'};
      border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);
    `;
    dot.textContent = isOrigin ? 'A' : 'B';

    ref.current = new gRef.current.maps.marker.AdvancedMarkerElement({
      position: { lat, lng },
      map:      mapRef.current,
      content:  dot,
      title:    isOrigin ? 'Titik Keberangkatan' : 'Titik Tujuan',
    });
  }, []);

  // ── Init Google Maps ───────────────────────────────────────────
  useEffect(() => {
    if (!apiKey || !mapDivRef.current) return;

    const loader = new Loader({ apiKey, version: 'weekly' });

    loader.load().then(async (google) => {
      gRef.current = google;

      // Load libraries via importLibrary (new pattern)
      const { Map }                   = await google.maps.importLibrary('maps')    as google.maps.MapsLibrary;
      const { AdvancedMarkerElement } = await google.maps.importLibrary('marker')  as google.maps.MarkerLibrary;
      const { PlaceAutocompleteElement } = await google.maps.importLibrary('places') as google.maps.PlacesLibrary;
      const { DirectionsService, DirectionsRenderer, TravelMode } = await google.maps.importLibrary('routes') as google.maps.RoutesLibrary;

      const map = new Map(mapDivRef.current!, {
        center:             { lat: -6.2088, lng: 106.8456 },
        zoom:               12,
        mapId:              'TRAVEL_AGENT_MAP',
        mapTypeControl:     false,
        streetViewControl:  false,
        fullscreenControl:  false,
      });
      mapRef.current = map;

      // Keep refs in sync for drawRoute
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _AM = AdvancedMarkerElement; // ensure library loaded

      dirRenderer.current = new DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: { strokeColor: '#2563eb', strokeWeight: 4, strokeOpacity: 0.7 },
      });
      dirRenderer.current.setMap(map);

      // ── PlaceAutocompleteElement (new API — replaces Autocomplete) ─
      const setupAC = (
        containerRef: React.RefObject<HTMLDivElement>,
        onSelect: (pt: LocationPoint) => void,
        pin: ActivePin
      ) => {
        if (!containerRef.current) return;
        containerRef.current.innerHTML = ''; // clear on remount (StrictMode)

        const acEl = new PlaceAutocompleteElement({
          includedRegionCodes: ['id'],   // new API — bukan componentRestrictions
        }) as unknown as HTMLElement & EventTarget;

        // CSS custom properties untuk styling shadow DOM
        // (Tailwind [&_input] tidak bisa menembus shadow DOM)
        const el = acEl as HTMLElement;
        el.style.setProperty('width', '100%');
        el.style.setProperty('--gmp-input-border-radius', '8px');
        el.style.setProperty('--gmp-input-border-color', '#d1d5db');
        el.style.setProperty('--gmp-input-font-size', '14px');
        el.style.setProperty('--gmp-input-padding', '10px 12px');

        containerRef.current.appendChild(el);

        const handleSelect = async (e: Event) => {
          try {
            const ev = e as any;
            let place = ev.place;
            if (!place && ev.placePrediction && typeof ev.placePrediction.toPlace === 'function') {
              place = ev.placePrediction.toPlace();
            }
            if (!place && ev.detail?.place) {
              place = ev.detail.place;
            }
            if (!place) return;

            await place.fetchFields({ fields: ['location', 'formattedAddress', 'displayName'] });
            if (!place.location) return;
            const pt: LocationPoint = {
              lat:     place.location.lat(),
              lng:     place.location.lng(),
              address: place.formattedAddress || place.displayName?.text || '',
            };
            placeMarker(pin, pt.lat, pt.lng);
            map.panTo({ lat: pt.lat, lng: pt.lng });
            onSelect(pt);
          } catch (err) {
            console.error('[PlaceAC] select error:', err);
          }
        };

        el.addEventListener('gmp-placeselect', handleSelect);
        el.addEventListener('gmp-select', handleSelect);
      };

      setupAC(originContRef, onOriginSet, 'origin');
      setupAC(destContRef,   onDestSet,   'dest');

      // ── Click-to-pin ───────────────────────────────────────────
      map.addListener('click', async (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        const address = await geocode(lat, lng);
        const pt: LocationPoint = { lat, lng, address };

        const activePinEl = document.querySelector<HTMLElement>('[data-active-pin="true"]');
        const pin = (activePinEl?.dataset.pin as ActivePin) || 'origin';

        placeMarker(pin, lat, lng);
        if (pin === 'origin') onOriginSet(pt);
        else                  onDestSet(pt);
      });

      setMapLoaded(true);
    }).catch((err) => {
      setLoadError(err.message || 'Gagal memuat Google Maps');
    });

    return () => {
      if (markerA.current) {
        markerA.current.map = null;
        markerA.current = null;
      }
      if (markerB.current) {
        markerB.current.map = null;
        markerB.current = null;
      }
      if (dirRenderer.current) {
        dirRenderer.current.setMap(null);
        dirRenderer.current = null;
      }
      if (originContRef.current) {
        originContRef.current.innerHTML = '';
      }
      if (destContRef.current) {
        destContRef.current.innerHTML = '';
      }
      if (mapRef.current) {
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  useEffect(() => {
    if (origin && dest && mapLoaded) drawRoute(origin, dest);
  }, [origin, dest, mapLoaded, drawRoute]);

  if (loadError) {
    return (
      <div className="h-72 rounded-xl bg-gray-100 flex items-center justify-center text-sm text-gray-500 p-4 text-center">
        <div>
          <p className="font-medium text-red-500 mb-1">Gagal memuat Google Maps</p>
          <p className="text-xs">{loadError}</p>
          <p className="text-xs mt-2 text-gray-400">Pastikan <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> sudah diisi dan Maps JS API + Places API aktif.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Address inputs — badge di samping, bukan overlay (shadow DOM tidak bisa ditembus CSS) */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-[11px] flex items-center justify-center font-bold shrink-0">A</span>
          <div ref={originContRef} className="flex-1 min-w-0" />
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-red-500 text-white text-[11px] flex items-center justify-center font-bold shrink-0">B</span>
          <div ref={destContRef} className="flex-1 min-w-0" />
        </div>
      </div>

      {/* Pin-drop mode */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-500">Klik peta untuk:</span>
        {(['origin', 'dest'] as ActivePin[]).map((pin) => (
          <button key={pin} type="button"
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
      </div>

      {/* Map canvas */}
      <div className="relative w-full h-80 rounded-xl border border-gray-200 overflow-hidden bg-gray-100">
        {!mapLoaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-gray-400 bg-gray-100 animate-pulse">
            Memuat Google Maps…
          </div>
        )}
        <div ref={mapDivRef} className="w-full h-full" />
      </div>

      {/* Route info */}
      {routeInfo && (
        <div className="flex gap-4 text-sm bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
          <span className="font-semibold text-blue-800">🛣 Rute:</span>
          <span className="text-blue-700 font-bold">{routeInfo.distance}</span>
          <span className="text-blue-500">·</span>
          <span className="text-blue-600">≈ {routeInfo.duration}</span>
        </div>
      )}

      {(origin || dest) && (
        <div className="space-y-1">
          {origin && <div className="flex items-center gap-2 text-xs text-gray-600"><span className="w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold shrink-0 text-[10px]">A</span><span className="truncate">{origin.address}</span></div>}
          {dest   && <div className="flex items-center gap-2 text-xs text-gray-600"><span className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center font-bold shrink-0 text-[10px]">B</span><span className="truncate">{dest.address}</span></div>}
        </div>
      )}
    </div>
  );
}
