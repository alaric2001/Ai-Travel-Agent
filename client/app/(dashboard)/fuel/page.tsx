'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  getEmployees, getVehicles, getFuelPrices, createFuelClaim,
  Employee, Vehicle, FuelPrice, FuelClaimResult,
} from '@/lib/api';
import { LocationPoint } from '@/components/fuel/RouteMap';
import FuelCalculation from '@/components/fuel/FuelCalculation';

// Google Maps harus di-render sisi client — tidak bisa SSR
const RouteMap = dynamic(() => import('@/components/fuel/RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="h-80 rounded-xl bg-gray-100 flex items-center justify-center text-sm text-gray-400 animate-pulse">
      Memuat peta…
    </div>
  ),
});

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export default function FuelPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [prices, setPrices] = useState<FuelPrice[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<number>(0);
  const [selectedVeh, setSelectedVeh] = useState<number>(0);
  const [origin, setOrigin] = useState<LocationPoint | null>(null);
  const [dest, setDest] = useState<LocationPoint | null>(null);
  const [result, setResult] = useState<FuelClaimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initErr, setInitErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getEmployees(), getVehicles(), getFuelPrices()])
      .then(([emps, vehs, prs]) => {
        setEmployees(emps);
        setVehicles(vehs);
        setPrices(prs);
        if (emps.length > 0) setSelectedEmp(emps[0].id);
        if (vehs.length > 0) setSelectedVeh(vehs[0].id);
      })
      .catch(() => setInitErr('Gagal memuat data. Pastikan API server berjalan.'));
  }, []);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVeh);
  const vehiclePrice = selectedVehicle
    ? prices.find((p) => p.fuel_type === selectedVehicle.fuel_type)
    : null;

  const canSubmit = origin && dest && selectedEmp && selectedVeh;

  const handleLockClaim = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await createFuelClaim({
        employeeId: selectedEmp,
        vehicleId: selectedVeh,
        originLat: origin!.lat,
        originLng: origin!.lng,
        destLat: dest!.lat,
        destLng: dest!.lng,
        originAddress: origin!.address,
        destAddress: dest!.address,
      });
      setResult(data);
      // Scroll ke hasil
      setTimeout(() => document.getElementById('fuel-result')?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat klaim BBM');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fuel Agent</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tentukan titik A dan B di peta. AI menghitung jarak aktual dan mengunci klaim BBM sesuai formula.
        </p>
      </div>

      {/* Formula info bar */}
      <div className="bg-slate-800 text-slate-200 rounded-xl px-4 py-3 mb-6 flex flex-wrap gap-4 text-xs font-mono">
        <span>📐 V_BBM = D_aktual ÷ E</span>
        <span className="text-slate-500">·</span>
        <span>💰 Cost_BBM = V_BBM × C</span>
        <span className="text-slate-500">·</span>
        <span className="text-emerald-400">🔒 Klaim dikunci saat submit</span>
      </div>

      {initErr && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">{initErr}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Config panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Step 1: Karyawan */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Step n={1} /> Karyawan
            </h2>
            <select
              value={selectedEmp}
              onChange={(e) => setSelectedEmp(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.full_name} (Gol. {e.grade})</option>
              ))}
            </select>
          </div>

          {/* Step 2: Kendaraan */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Step n={2} /> Kendaraan Dinas
            </h2>
            <select
              value={selectedVeh}
              onChange={(e) => setSelectedVeh(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model} ({v.fuel_efficiency} KM/L)
                </option>
              ))}
            </select>

            {selectedVehicle && (
              <div className="mt-2 space-y-1 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Efisiensi (E)</span>
                  <span className="font-semibold text-gray-700">{selectedVehicle.fuel_efficiency} KM/Liter</span>
                </div>
                <div className="flex justify-between">
                  <span>Jenis BBM</span>
                  <span className="font-semibold text-gray-700">{selectedVehicle.fuel_type}</span>
                </div>
                {vehiclePrice && (
                  <div className="flex justify-between">
                    <span>Harga BBM (C)</span>
                    <span className="font-semibold text-green-700">Rp {vehiclePrice.price_per_liter.toLocaleString('id-ID')}/L</span>
                  </div>
                )}
                {selectedVehicle.license_plate && (
                  <div className="flex justify-between">
                    <span>Nopol</span>
                    <span className="font-mono font-semibold text-gray-700">{selectedVehicle.license_plate}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Harga BBM ref */}
          {prices.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-700 mb-2">Harga BBM Aktif (Juni 2026)</p>
              {prices.map((p) => (
                <div key={p.fuel_type} className={`flex justify-between text-xs py-0.5 ${selectedVehicle?.fuel_type === p.fuel_type ? 'font-bold text-amber-900' : 'text-amber-700'
                  }`}>
                  <span>{p.fuel_type}</span>
                  <span>Rp {p.price_per_liter.toLocaleString('id-ID')}/L</span>
                </div>
              ))}
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleLockClaim}
            disabled={!canSubmit || loading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Menghitung jarak &amp; mengunci klaim…
              </>
            ) : (
              <>🔒 Hitung &amp; Kunci Klaim BBM</>
            )}
          </button>

          {!canSubmit && !loading && (
            <p className="text-xs text-gray-400 text-center">
              {!origin && !dest ? 'Tentukan titik A dan B di peta' : !origin ? 'Tentukan titik A (keberangkatan)' : 'Tentukan titik B (tujuan)'}
            </p>
          )}
        </div>

        {/* Right: Map */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Step n={3} /> Tentukan Rute di Peta
            </h2>

            {!MAPS_API_KEY ? (
              <div className="h-80 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-center p-6">
                <div>
                  <p className="text-2xl mb-2">🗺️</p>
                  <p className="text-sm font-medium text-gray-600">Google Maps API Key belum dikonfigurasi</p>
                  <p className="text-xs text-gray-400 mt-1">Isi <code className="bg-gray-100 px-1 rounded">GOOGLE_MAPS_API_KEY</code> di <code>.env</code></p>
                  <p className="text-xs text-gray-400 mt-1">Aktifkan: Maps JS API, Places API, Directions API, Distance Matrix API</p>
                </div>
              </div>
            ) : (
              <RouteMap
                apiKey={MAPS_API_KEY}
                origin={origin}
                dest={dest}
                onOriginSet={setOrigin}
                onDestSet={setDest}
              />
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-5 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Result */}
      {result && (
        <div id="fuel-result" className="mt-6 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Step n={4} /> Hasil Kalkulasi &amp; Klaim Terkunci
          </h2>
          <FuelCalculation result={result} />
        </div>
      )}
    </div>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs shrink-0">{n}</span>
  );
}
