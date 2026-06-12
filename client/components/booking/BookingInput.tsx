'use client';

import { useState, useMemo } from 'react';
import { Employee } from '@/lib/api';

const EXAMPLES = [
  'Mau ke Surabaya tanggal 25 Juni, balik 27 Juni, budget tiket max 1.5 juta, butuh hotel 2 malam',
  'Perjalanan ke Bali Senin depan, pulang Kamis, hanya tiket saja',
  'Booking tiket Jakarta–Makassar tanggal 1 Juli, PP, max 2 juta per tiket',
  'Ke Yogyakarta tanggal 10 Juli, pulang 12 Juli, tiket + hotel bintang 4',
];

// Keyword detektor sederhana — tanpa LLM, langsung di client
const CITY_PATTERN  = /\b(surabaya|bali|denpasar|jakarta|yogya(karta)?|medan|semarang|makassar|balikpapan|palembang|lombok|manado|pekanbaru|padang|pontianak|ambon|CGK|DPS|SUB|JOG|KNO|SRG|UPG|BPN|PLM|LOP|MDC|PKU|PDG|PNK|AMQ)\b/i;
const DATE_PATTERN  = /\b(tanggal|besok|lusa|minggu\s+(depan|ini)|bulan\s+depan|januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|\d{1,2}\s+(juni|juli|agustus|september|oktober|november|desember|januari|februari|maret|april|mei)|\d{1,2}[\/\-]\d{1,2})\b/i;
const BUDGET_PATTERN = /\b(budget|max|maksimal|\d[\d.,]+\s*(juta|ribu|rb)|rp\s*[\d.,]+)\b/i;
const HOTEL_PATTERN = /\b(hotel|menginap|nginep|\d+\s*malam|penginapan)\b/i;
const RETURN_PATTERN = /\b(pulang|pp|pergi\s*pulang|balik|kembali|return)\b/i;

interface InputCheck {
  label:    string;
  hint:     string;
  required: boolean;
  met:      boolean;
}

function analyzeInput(text: string): InputCheck[] {
  return [
    {
      label:    'Kota/Bandara tujuan',
      hint:     'Sebutkan kota: "ke Surabaya", "ke Bali", "ke Yogyakarta", dll.',
      required: true,
      met:      CITY_PATTERN.test(text),
    },
    {
      label:    'Tanggal keberangkatan',
      hint:     'Sebutkan tanggal: "tanggal 25 Juni", "besok", "minggu depan", dll.',
      required: true,
      met:      DATE_PATTERN.test(text),
    },
    {
      label:    'Tanggal pulang / one-way',
      hint:     'Sebutkan: "pulang Kamis", "balik 27 Juni", atau tulis "one-way" jika tidak pulang.',
      required: false,
      met:      RETURN_PATTERN.test(text),
    },
    {
      label:    'Budget tiket (opsional)',
      hint:     'Contoh: "max 1.5 juta", "budget 2 juta"',
      required: false,
      met:      BUDGET_PATTERN.test(text),
    },
    {
      label:    'Hotel (opsional)',
      hint:     'Contoh: "butuh hotel 2 malam", "hotel bintang 4"',
      required: false,
      met:      HOTEL_PATTERN.test(text),
    },
  ];
}

interface Props {
  employees: Employee[];
  onSubmit:  (employeeId: number, rawInput: string) => void;
  loading:   boolean;
}

export default function BookingInput({ employees, onSubmit, loading }: Props) {
  const [selectedEmployee, setSelectedEmployee] = useState<number>(employees[0]?.id || 0);
  const [rawInput, setRawInput]   = useState('');
  const [showGuide, setShowGuide] = useState(false);

  const selected = employees.find((e) => e.id === selectedEmployee);
  const checks   = useMemo(() => analyzeInput(rawInput), [rawInput]);
  const requiredMet  = checks.filter((c) => c.required).every((c) => c.met);
  const completeness = Math.round((checks.filter((c) => c.met).length / checks.length) * 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawInput.trim() || !selectedEmployee) return;
    onSubmit(selectedEmployee, rawInput.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Employee Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Karyawan</label>
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
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              Golongan {selected.grade} — {selected.grade_label}
            </span>
            <span>Max Tiket: Rp {selected.max_flight_price.toLocaleString('id-ID')}</span>
            <span>Max Hotel: Rp {selected.max_hotel_price_per_night.toLocaleString('id-ID')}/malam</span>
          </div>
        )}
      </div>

      {/* Textarea + live checklist */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-gray-700">Deskripsikan Perjalanan Dinas</label>
          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            className="text-xs text-brand-600 hover:underline"
          >
            {showGuide ? 'Sembunyikan panduan' : 'Lihat panduan isi'}
          </button>
        </div>

        {/* Panduan lengkap */}
        {showGuide && (
          <div className="mb-3 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 space-y-1">
            <p className="font-semibold mb-1.5">AI butuh info berikut untuk cari tiket real-time:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              <div className="flex gap-1.5"><span className="text-red-500">*</span><span><strong>Kota tujuan</strong> — "ke Surabaya", "ke Bali", "ke Yogyakarta"</span></div>
              <div className="flex gap-1.5"><span className="text-red-500">*</span><span><strong>Tanggal berangkat</strong> — "tanggal 25 Juni", "besok", "minggu depan"</span></div>
              <div className="flex gap-1.5"><span className="text-gray-400">○</span><span><strong>Tanggal pulang</strong> — "pulang Kamis", "balik 27 Juni", atau "one-way"</span></div>
              <div className="flex gap-1.5"><span className="text-gray-400">○</span><span><strong>Budget tiket</strong> — "max 1.5 juta", "budget 2 juta"</span></div>
              <div className="flex gap-1.5"><span className="text-gray-400">○</span><span><strong>Kebutuhan hotel</strong> — "butuh hotel 2 malam", "hotel bintang 4"</span></div>
              <div className="flex gap-1.5"><span className="text-gray-400">○</span><span><strong>Preferensi</strong> — "pagi hari", "tanpa transit", "bisnis class"</span></div>
            </div>
            <p className="text-blue-600 mt-1.5">Tanpa kota tujuan & tanggal, AI akan menggunakan data simulasi.</p>
          </div>
        )}

        <div className="relative">
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="Contoh: Mau ke Bali tanggal 1 Juli, pulang 3 Juli, butuh tiket + hotel bintang 4, budget max 2 juta..."
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />

          {/* Progress bar */}
          {rawInput.length > 0 && (
            <div className="mt-1.5">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Kelengkapan info</span>
                <span className={completeness === 100 ? 'text-green-600 font-medium' : ''}>{completeness}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    completeness < 40 ? 'bg-red-400' : completeness < 80 ? 'bg-amber-400' : 'bg-green-500'
                  }`}
                  style={{ width: `${completeness}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Checklist item per item */}
        {rawInput.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {checks.map((c) => (
              <span
                key={c.label}
                title={c.met ? `✓ ${c.label} terdeteksi` : c.hint}
                className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 cursor-help ${
                  c.met
                    ? 'bg-green-100 text-green-700'
                    : c.required
                    ? 'bg-red-50 text-red-500 border border-red-200'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                <span>{c.met ? '✓' : c.required ? '!' : '○'}</span>
                {c.label}
              </span>
            ))}
          </div>
        )}

        {/* Warning jika required belum terpenuhi */}
        {rawInput.length > 10 && !requiredMet && (
          <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span>
              <strong>Kota tujuan</strong> dan/atau <strong>tanggal</strong> belum terdeteksi.
              AI mungkin tidak bisa mencari tiket real-time dan akan menggunakan data simulasi.
            </span>
          </div>
        )}
      </div>

      {/* Example Prompts */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Coba contoh ini:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRawInput(ex)}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2.5 py-1 rounded-full transition-colors text-left"
            >
              {ex.slice(0, 52)}…
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
            Menganalisis &amp; mencari tiket…
          </>
        ) : (
          '✈️ Analisis &amp; Cari Tiket'
        )}
      </button>
    </form>
  );
}
