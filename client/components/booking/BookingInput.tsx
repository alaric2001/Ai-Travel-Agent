'use client';

import { useState } from 'react';
import { Employee } from '@/lib/api';

const EXAMPLES = [
  'Mau ke Surabaya besok, balik Jumat, budget tiket max 1.5 juta, butuh hotel 3 malam',
  'Perjalanan ke Bali minggu depan Senin, pulang Kamis, hanya tiket saja',
  'Booking tiket Jakarta-Makassar tanggal 15 Juni, PP, max 2 juta per tiket',
  'Ke Yogyakarta bulan depan tanggal 1, pulang tanggal 3, tiket + hotel bintang 4',
];

interface Props {
  employees: Employee[];
  onSubmit: (employeeId: number, rawInput: string) => void;
  loading: boolean;
}

export default function BookingInput({ employees, onSubmit, loading }: Props) {
  const [selectedEmployee, setSelectedEmployee] = useState<number>(employees[0]?.id || 0);
  const [rawInput, setRawInput] = useState('');

  const selected = employees.find((e) => e.id === selectedEmployee);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawInput.trim() || !selectedEmployee) return;
    onSubmit(selectedEmployee, rawInput.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Employee Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Karyawan
        </label>
        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(Number(e.target.value))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.full_name} — {emp.position} (Gol. {emp.grade})
            </option>
          ))}
        </select>

        {selected && (
          <div className="mt-2 flex gap-3 text-xs text-gray-500">
            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              Golongan {selected.grade} — {selected.grade_label}
            </span>
            <span>Max Tiket: Rp {selected.max_flight_price.toLocaleString('id-ID')}</span>
            <span>Max Hotel: Rp {selected.max_hotel_price_per_night.toLocaleString('id-ID')}/malam</span>
          </div>
        )}
      </div>

      {/* Text Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Deskripsikan Perjalanan Dinas
        </label>
        <textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder="Contoh: Mau ke Surabaya besok lusa, balik Jumat, butuh tiket dan hotel 2 malam, budget max 1.5 juta..."
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
        <p className="text-xs text-gray-400 mt-1">
          Gunakan bahasa natural. AI akan mengekstrak rincian secara otomatis.
        </p>
      </div>

      {/* Example Prompts */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Contoh permintaan:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRawInput(ex)}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2.5 py-1 rounded-full transition-colors text-left"
            >
              {ex.slice(0, 50)}…
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !rawInput.trim()}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Menganalisis dengan Gemini AI…
          </>
        ) : (
          '✈️ Analisis Permintaan'
        )}
      </button>
    </form>
  );
}
