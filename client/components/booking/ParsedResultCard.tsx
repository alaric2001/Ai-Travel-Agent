'use client';

import { BookingResult } from '@/lib/api';

interface Props {
  result: BookingResult;
}

const AIRPORT_NAMES: Record<string, string> = {
  CGK: 'Jakarta (Soekarno-Hatta)',
  DPS: 'Bali (Ngurah Rai)',
  SUB: 'Surabaya (Juanda)',
  JOG: 'Yogyakarta (Adisutjipto)',
  KNO: 'Medan (Kualanamu)',
  SRG: 'Semarang (Ahmad Yani)',
  UPG: 'Makassar (Sultan Hasanuddin)',
  BPN: 'Balikpapan (Sultan Aji)',
  PLM: 'Palembang (Sultan Mahmud)',
  LOP: 'Lombok (Zainuddin Abdul Majid)',
};

function airportLabel(code: string) {
  return AIRPORT_NAMES[code] || code;
}

function fmtDate(d: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

export default function ParsedResultCard({ result }: Props) {
  const { parsedPayload: p, allowanceCheck: ac } = result;

  const statusColor = ac.passed
    ? 'bg-green-50 border-green-300 text-green-800'
    : 'bg-yellow-50 border-yellow-300 text-yellow-800';

  return (
    <div className="space-y-4">
      {/* Pagu Status Banner */}
      <div className={`border rounded-xl p-4 ${statusColor}`}>
        <div className="font-semibold text-sm">{ac.message}</div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          <span>Golongan: <strong>{ac.grade} — {ac.gradeLabel}</strong></span>
          <span>Max Tiket: <strong>{fmtRp(ac.flightLimit)}</strong></span>
          <span>Max Hotel/malam: <strong>{fmtRp(ac.hotelLimitPerNight)}</strong></span>
        </div>
      </div>

      {/* Parsed Details */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Detail Perjalanan (Hasil Parsing AI)</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Detail label="Dari" value={airportLabel(p.origin || 'CGK')} />
          <Detail label="Tujuan" value={airportLabel(p.destination)} />
          <Detail label="Tgl Berangkat" value={fmtDate(p.departure_date)} />
          <Detail label="Tgl Pulang" value={p.return_date ? fmtDate(p.return_date) : 'One-way'} />
          {p.max_price && (
            <Detail label="Budget Tiket" value={fmtRp(p.max_price)} highlight />
          )}
          {p.duration_nights && (
            <Detail label="Menginap" value={`${p.duration_nights} malam`} />
          )}
          <Detail
            label="Kategori"
            value={{ flight: 'Tiket Saja', hotel: 'Hotel Saja', both: 'Tiket + Hotel', unknown: 'Tidak Diketahui' }[p.category] || p.category}
          />
        </div>

        {p.preferences.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-1.5">Preferensi:</p>
            <div className="flex flex-wrap gap-1.5">
              {p.preferences.map((pref, i) => (
                <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{pref}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`font-medium mt-0.5 ${highlight ? 'text-blue-700' : 'text-gray-800'}`}>{value}</div>
    </div>
  );
}
