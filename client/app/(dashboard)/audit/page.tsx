'use client';

import { useState, useEffect } from 'react';
import {
  getEmployees, scanReceipt, getAuditPolicy,
  Employee, AuditResult, PolicyCategory,
} from '@/lib/api';
import ReceiptUploader       from '@/components/audit/ReceiptUploader';
import ExtractedItemsTable   from '@/components/audit/ExtractedItemsTable';
import AuditSummary          from '@/components/audit/AuditSummary';

type Tab = 'scan' | 'policy';

export default function AuditPage() {
  const [tab, setTab]               = useState<Tab>('scan');
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<number>(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview]       = useState<string | null>(null);
  const [result, setResult]         = useState<AuditResult | null>(null);
  const [policy, setPolicy]         = useState<PolicyCategory[]>([]);
  const [loading, setLoading]       = useState(false);
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    getEmployees().then((data) => {
      setEmployees(data);
      if (data.length > 0) setSelectedEmp(data[0].id);
    }).catch(() => setError('Gagal memuat data karyawan. Pastikan API server berjalan.'));
  }, []);

  const handleFileSelected = (file: File, previewUrl: string) => {
    setSelectedFile(file);
    setPreview(previewUrl);
    setResult(null);
    setError(null);
  };

  const handleScan = async () => {
    if (!selectedFile || !selectedEmp) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await scanReceipt(selectedEmp, selectedFile);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses struk');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadPolicy = async () => {
    if (policy.length > 0) return;
    setLoadingPolicy(true);
    try {
      const data = await getAuditPolicy();
      setPolicy(data);
    } catch {
      // ignore
    } finally {
      setLoadingPolicy(false);
    }
  };

  const emp = employees.find((e) => e.id === selectedEmp);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Agent</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload foto struk belanja. AI akan mengekstrak item dan memvalidasi sesuai kebijakan Finance.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {(['scan', 'policy'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === 'policy') handleLoadPolicy(); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'scan' ? '🧾 Scan Struk' : '📋 Whitelist Policy'}
          </button>
        ))}
      </div>

      {tab === 'scan' && (
        <div className="space-y-5">
          {/* Step 1: Pilih karyawan */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Step n={1} /> Karyawan Pengaju
            </h2>
            <select
              value={selectedEmp}
              onChange={(e) => setSelectedEmp(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name} — {e.position} (Gol. {e.grade})
                </option>
              ))}
            </select>
            {emp && (
              <p className="text-xs text-gray-400 mt-1.5">
                Departemen: {emp.department} · Golongan {emp.grade} — {emp.grade_label}
              </p>
            )}
          </div>

          {/* Step 2: Upload struk */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Step n={2} /> Upload Foto Struk
            </h2>
            <ReceiptUploader onFileSelected={handleFileSelected} disabled={loading} />
            {selectedFile && (
              <button
                onClick={handleScan}
                disabled={loading}
                className="mt-4 w-full bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Membaca struk dengan Gemini Vision…
                  </>
                ) : (
                  '🔍 Scan & Audit Struk'
                )}
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Step 3: Hasil */}
          {result && (
            <>
              {/* Summary */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Step n={3} /> Ringkasan Audit
                </h2>
                <AuditSummary result={result} />
              </div>

              {/* Item table */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Step n={4} /> Detail Item Belanja
                  </h2>
                  <div className="flex gap-3 text-xs">
                    <span className="text-green-600 font-medium">
                      ✓ {result.approvedItems.length} disetujui
                    </span>
                    {result.rejectedItems.length > 0 && (
                      <span className="text-red-500 font-medium">
                        ✕ {result.rejectedItems.length} ditolak
                      </span>
                    )}
                    {result.unknownItems.length > 0 && (
                      <span className="text-yellow-600 font-medium">
                        ? {result.unknownItems.length} perlu review
                      </span>
                    )}
                  </div>
                </div>
                <ExtractedItemsTable items={result.auditedItems} />
              </div>

              {/* Side-by-side: foto + info */}
              {preview && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-gray-700 mb-3">Foto Struk yang Diproses</h2>
                  <div className="flex gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="Receipt"
                      className="max-h-80 w-auto rounded-lg border border-gray-200 object-contain"
                    />
                    <div className="text-xs text-gray-500 space-y-1.5">
                      <p><strong>Karyawan:</strong> {result.employeeName}</p>
                      <p><strong>Merchant:</strong> {result.receipt.merchant_name}</p>
                      <p><strong>Tanggal:</strong> {result.receipt.date || '—'}</p>
                      <p><strong>No. Struk:</strong> {result.receipt.receipt_number || '—'}</p>
                      <p><strong>Pembayaran:</strong> {result.receipt.payment_method || '—'}</p>
                      <p className="mt-3"><strong>Submission ID:</strong></p>
                      <p className="font-mono bg-gray-100 px-2 py-1 rounded text-xs break-all">
                        {result.submissionId}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'policy' && (
        <div className="space-y-3">
          {loadingPolicy ? (
            <p className="text-sm text-gray-400 animate-pulse">Memuat kebijakan…</p>
          ) : policy.length === 0 ? (
            <p className="text-sm text-gray-400">Tidak ada data kebijakan.</p>
          ) : (
            <>
              {/* Allowed */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-green-700 mb-3">✅ Kategori Diizinkan</h3>
                <div className="space-y-2">
                  {policy.filter((p) => p.is_allowed).map((p) => (
                    <PolicyRow key={p.id} item={p} />
                  ))}
                </div>
              </div>
              {/* Rejected */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-red-700 mb-3">❌ Kategori Dilarang</h3>
                <div className="space-y-2">
                  {policy.filter((p) => !p.is_allowed).map((p) => (
                    <PolicyRow key={p.id} item={p} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs shrink-0">
      {n}
    </span>
  );
}

function PolicyRow({ item }: { item: PolicyCategory }) {
  return (
    <div className={`rounded-lg px-3 py-2.5 border ${item.is_allowed ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-800">{item.category_name}</p>
          {item.rejection_reason && (
            <p className="text-xs text-red-500 mt-0.5">{item.rejection_reason}</p>
          )}
        </div>
        {item.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-end">
            {item.keywords.slice(0, 6).map((kw) => (
              <span key={kw} className="text-xs bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                {kw}
              </span>
            ))}
            {item.keywords.length > 6 && (
              <span className="text-xs text-gray-400">+{item.keywords.length - 6}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
