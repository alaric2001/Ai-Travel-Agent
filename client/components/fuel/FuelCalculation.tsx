'use client';

import { FuelClaimResult } from '@/lib/api';

interface Props {
  result: FuelClaimResult;
}

function fmtRp(n: number) { return 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
function fmtNum(n: number, dp = 2) { return n.toFixed(dp); }

export default function FuelCalculation({ result: r }: Props) {
  const {
    vehicle, fuelEfficiency: E, fuelPricePerLiter: C, fuelType,
    originAddress, destAddress, distanceKm: D,
    distanceText, durationText,
    fuelVolumeLiters: V, maxCostApproved: cost,
    claimId, lockedAt,
  } = r;

  return (
    <div className="space-y-4">
      {/* Route summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Rute Perjalanan</p>
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center shrink-0 mt-1">
            <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">A</span>
            <div className="w-px h-6 bg-gray-300 my-0.5" />
            <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">B</span>
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-sm text-gray-700 leading-tight">{originAddress}</p>
            <p className="text-sm text-gray-700 leading-tight">{destAddress}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-brand-700">{distanceText}</p>
            <p className="text-xs text-gray-400">{durationText}</p>
          </div>
        </div>
      </div>

      {/* Vehicle */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kendaraan Dinas</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl shrink-0">🚗</div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{vehicle.brand} {vehicle.model}</p>
            <p className="text-xs text-gray-500">
              {vehicle.licensePlate && <span className="mr-2 font-mono">{vehicle.licensePlate}</span>}
              Efisiensi: <strong>{E} KM/Liter</strong> · BBM: <strong>{fuelType}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Step-by-step formula */}
      <div className="bg-slate-900 text-slate-100 rounded-xl p-5 font-mono text-sm space-y-3">
        <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Kalkulasi BBM (Transparan &amp; Dapat Diaudit)</p>

        <div className="space-y-1 text-slate-300 text-xs">
          <p>D_aktual  = <span className="text-cyan-400 font-bold">{fmtNum(D, 2)} km</span>   <span className="text-slate-500">(dari Google Maps API)</span></p>
          <p>E         = <span className="text-green-400 font-bold">{E} KM/L</span>    <span className="text-slate-500">(efisiensi {vehicle.brand} {vehicle.model})</span></p>
          <p>C         = <span className="text-yellow-400 font-bold">{fmtRp(C)}/L</span>  <span className="text-slate-500">({fuelType})</span></p>
        </div>

        <div className="border-t border-slate-700 pt-3 space-y-2">
          <div>
            <p className="text-slate-400 text-xs">Volume BBM:</p>
            <p className="text-white">
              V_BBM = D ÷ E = {fmtNum(D)} ÷ {E}
              <span className="text-cyan-300 font-bold ml-2">= {fmtNum(V)} Liter</span>
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Biaya BBM:</p>
            <p className="text-white">
              Cost  = V × C = {fmtNum(V)} × {fmtRp(C)}
              <span className="text-emerald-300 font-bold ml-2">= {fmtRp(cost)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Locked claim */}
      <div className="bg-green-50 border-2 border-green-400 rounded-xl p-5 text-center">
        <div className="text-2xl mb-1">🔒</div>
        <p className="text-sm font-semibold text-green-800 mb-1">Klaim BBM Dikunci</p>
        <p className="text-3xl font-bold text-green-700 mb-2">{fmtRp(cost)}</p>
        <p className="text-xs text-green-600">
          Nilai ini tidak dapat diubah. Karyawan tidak dapat mengklaim melebihi jumlah ini.
        </p>
        <div className="mt-3 pt-3 border-t border-green-200 flex justify-between text-xs text-green-600">
          <span>ID Klaim: <code className="font-mono">{claimId.slice(0, 8)}…</code></span>
          <span>Dikunci: {new Date(lockedAt).toLocaleString('id-ID')}</span>
        </div>
      </div>
    </div>
  );
}
