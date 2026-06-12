'use client';

import { MockFlight, MockHotel } from '@/lib/api';

interface FlightGridProps { flights: MockFlight[]; flightLimit: number; }
interface HotelGridProps  { hotels: MockHotel[];  hotelLimit: number; }

function fmtRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

const AIRLINE_CODES: Record<string, string> = {
  'Garuda Indonesia': 'GA', 'Citilink': 'QG', 'Lion Air': 'JT',
  'Batik Air': 'ID', 'Sriwijaya Air': 'SJ', 'AirAsia': 'QZ',
  'TransNusa': 'TN', 'Super Air Jet': 'IU',
};

function SourceBadge({ source }: { source: 'realtime' | 'mock' }) {
  return source === 'realtime'
    ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">● LIVE</span>
    : <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 font-medium">SIMULASI</span>;
}

export function FlightOptionsGrid({ flights, flightLimit }: FlightGridProps) {
  if (flights.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Opsi Penerbangan</h3>
        <span className="text-xs text-gray-400">Pagu: {fmtRp(flightLimit)}</span>
      </div>
      <div className="space-y-2">
        {flights.map((f) => (
          <div
            key={f.id}
            className={`border rounded-xl p-3 flex items-center gap-4 transition-shadow hover:shadow-sm ${
              f.withinPagu ? 'border-gray-200 bg-white' : 'border-red-100 bg-red-50 opacity-75'
            }`}
          >
            {/* Airline badge */}
            <div className="w-10 h-10 rounded-lg bg-brand-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {AIRLINE_CODES[f.airline] || f.airline.slice(0, 2).toUpperCase()}
            </div>

            {/* Route info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-gray-800 truncate">{f.airline}</span>
                <SourceBadge source={f.source} />
              </div>
              <div className="text-xs text-gray-500">
                {f.flightNo} · {f.class} · {f.duration}
                {f.stops === 0
                  ? <span className="ml-1 text-green-600">· Langsung</span>
                  : <span className="ml-1 text-amber-600">· {f.stops} transit</span>
                }
              </div>
            </div>

            {/* Times */}
            <div className="text-center shrink-0">
              <div className="text-sm font-semibold">{f.departureTime}</div>
              <div className="text-xs text-gray-400">→ {f.arrivalTime}</div>
            </div>

            {/* Price + badge */}
            <div className="text-right shrink-0">
              <div className={`text-sm font-bold ${f.withinPagu ? 'text-gray-900' : 'text-red-600'}`}>
                {fmtRp(f.price)}
              </div>
              {f.withinPagu
                ? <span className="text-xs text-green-600 font-medium">✓ Sesuai pagu</span>
                : <span className="text-xs text-red-500 font-medium">✕ Melebihi pagu</span>
              }
            </div>

            <button
              disabled={!f.withinPagu}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors
                disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
                bg-brand-600 hover:bg-brand-700 text-white"
            >
              Pilih
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HotelOptionsGrid({ hotels, hotelLimit }: HotelGridProps) {
  if (hotels.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Opsi Hotel</h3>
        <span className="text-xs text-gray-400">Pagu/malam: {fmtRp(hotelLimit)}</span>
      </div>
      <div className="space-y-2">
        {hotels.map((h) => (
          <div
            key={h.id}
            className={`border rounded-xl p-3 transition-shadow hover:shadow-sm ${
              h.withinPagu ? 'border-gray-200 bg-white' : 'border-red-100 bg-red-50 opacity-75'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-base shrink-0">
                🏨
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-800 truncate">{h.name}</span>
                  <SourceBadge source={h.source} />
                </div>
                <div className="text-xs text-gray-400 truncate">{h.location}</div>
                <div className="flex items-center flex-wrap gap-1 mt-1">
                  <span>{'⭐'.repeat(Math.min(h.stars, 5))}</span>
                  {h.rating && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                      {h.rating.toFixed(1)} / 5
                    </span>
                  )}
                  {h.facilities.slice(0, 3).map((f) => (
                    <span key={f} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{f}</span>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-sm font-bold ${h.withinPagu ? 'text-gray-900' : 'text-red-600'}`}>
                  {fmtRp(h.pricePerNight)}<span className="text-xs font-normal text-gray-400">/malam</span>
                </div>
                <div className="text-xs text-gray-500">{h.nights} malam = {fmtRp(h.totalPrice)}</div>
                {h.withinPagu
                  ? <span className="text-xs text-green-600 font-medium">✓ Sesuai pagu</span>
                  : <span className="text-xs text-red-500 font-medium">✕ Melebihi pagu</span>
                }
              </div>
              <button
                disabled={!h.withinPagu}
                className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors
                  disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
                  bg-brand-600 hover:bg-brand-700 text-white"
              >
                Pilih
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
