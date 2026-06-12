'use client';

import { useState, useEffect } from 'react';
import { getEmployees, submitBooking, Employee, BookingResult } from '@/lib/api';
import BookingInput from '@/components/booking/BookingInput';
import ParsedResultCard from '@/components/booking/ParsedResultCard';
import { FlightOptionsGrid, HotelOptionsGrid } from '@/components/booking/FlightOptionsGrid';
import { ToastContainer, useToast } from '@/components/ui/Toast';

export default function BookingPage() {
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [result, setResult]         = useState<BookingResult | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [loadingEmp, setLoadingEmp] = useState(true);
  const { toasts, remove, toast }   = useToast();

  useEffect(() => {
    getEmployees()
      .then(setEmployees)
      .catch(() => setError('Gagal memuat data karyawan. Pastikan API server berjalan.'))
      .finally(() => setLoadingEmp(false));
  }, []);

  const handleSubmit = async (employeeId: number, rawInput: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await submitBooking(employeeId, rawInput);
      setResult(data);

      // Toast sesuai kondisi hasil
      if (data.dataSource === 'realtime') {
        toast.success(
          'Data Real-Time Berhasil',
          `${data.mockFlights.length} penerbangan & ${data.mockHotels.length} hotel dari Google Flights/Hotels.`
        );
      } else {
        toast.warning(
          'Menggunakan Data Simulasi',
          'Kota tujuan atau tanggal tidak terdeteksi. Coba tulis lebih spesifik (contoh: "ke Bali tanggal 1 Juli").'
        );
      }

      if (!data.allowanceCheck.passed) {
        toast.warning(
          'Melebihi Pagu Anggaran',
          data.allowanceCheck.message
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setError(msg);
      toast.error('Gagal Memproses Permintaan', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <ToastContainer toasts={toasts} onClose={remove} />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Booking Agent</h1>
        <p className="text-sm text-gray-500 mt-1">
          Deskripsikan perjalanan dinas dalam bahasa natural. AI akan mem-parsing dan memvalidasi sesuai pagu golongan.
        </p>
      </div>

      {/* Input Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
          Permintaan Perjalanan
        </h2>
        {loadingEmp ? (
          <div className="text-sm text-gray-400 animate-pulse">Memuat data karyawan…</div>
        ) : (
          <BookingInput employees={employees} onSubmit={handleSubmit} loading={loading} />
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-5">
          {/* Parsed Result */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
              Hasil Analisis AI
            </h2>
            <ParsedResultCard result={result} />
          </div>

          {/* Flight Options */}
          {result.mockFlights.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs">3</span>
                Opsi Penerbangan
                <DataSourceBadge source={result.dataSource} count={result.mockFlights.length}  />
              </h2>
              <FlightOptionsGrid flights={result.mockFlights} flightLimit={result.allowanceCheck.flightLimit} />
            </div>
          )}

          {/* Hotel Options */}
          {result.mockHotels.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs">4</span>
                Opsi Hotel
                <DataSourceBadge source={result.dataSource} count={result.mockHotels.length}  />
              </h2>
              <HotelOptionsGrid hotels={result.mockHotels} hotelLimit={result.allowanceCheck.hotelLimitPerNight} />
            </div>
          )}

          {/* Submission ID */}
          <div className="text-xs text-gray-400 text-center pb-2">
            ID Pengajuan: <code className="font-mono">{result.submissionId}</code> · Status: {result.status}
          </div>
        </div>
      )}
    </div>
  );
}

function DataSourceBadge({ source, count }: { source: 'realtime' | 'mock'; count: number }) {
  return source === 'realtime' ? (
    <span className="ml-auto flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      {count} hasil live
    </span>
  ) : (
    <span className="ml-auto text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
      {count} hasil simulasi
    </span>
  );
}
