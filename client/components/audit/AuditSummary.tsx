'use client';

import { AuditResult } from '@/lib/api';

interface Props { result: AuditResult; }

function fmtRp(n: number) { return 'Rp ' + n.toLocaleString('id-ID'); }
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function AuditSummary({ result }: Props) {
  const { receipt: r, totalClaimed, totalRejected, totalApproved, rejectedItems, status } = result;

  const hasRejected = totalRejected > 0;
  const overallColor = hasRejected ? 'border-yellow-300 bg-yellow-50' : 'border-green-300 bg-green-50';

  return (
    <div className="space-y-4">
      {/* Merchant Info */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-gray-400">Merchant</span>
            <p className="font-semibold text-gray-800 mt-0.5">{r.merchant_name}</p>
            {r.merchant_address && <p className="text-xs text-gray-500 mt-0.5">{r.merchant_address}</p>}
          </div>
          <div>
            <span className="text-xs text-gray-400">Tanggal Transaksi</span>
            <p className="font-semibold text-gray-800 mt-0.5">{fmtDate(r.date)}</p>
          </div>
          {r.receipt_number && (
            <div>
              <span className="text-xs text-gray-400">No. Struk</span>
              <p className="font-mono text-sm font-medium text-gray-700 mt-0.5">{r.receipt_number}</p>
            </div>
          )}
          {r.payment_method && (
            <div>
              <span className="text-xs text-gray-400">Metode Bayar</span>
              <p className="font-semibold text-gray-800 mt-0.5">{r.payment_method}</p>
            </div>
          )}
        </div>
      </div>

      {/* Rejected Items Detail */}
      {hasRejected && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700 mb-2">Item Ditolak Sistem:</p>
          <ul className="space-y-1.5">
            {rejectedItems.map((item, i) => (
              <li key={i} className="flex justify-between text-sm">
                <span className="text-red-600">
                  <span className="line-through opacity-70">{item.name}</span>
                  {item.rejection_reason && (
                    <span className="text-xs text-red-400 ml-2">— {item.rejection_reason}</span>
                  )}
                </span>
                <span className="text-red-500 font-mono font-semibold shrink-0 ml-4">
                  - {fmtRp(item.total_price)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Financial Summary */}
      <div className={`border rounded-xl p-4 ${overallColor}`}>
        <p className="text-sm font-semibold text-gray-700 mb-3">Ringkasan Keuangan</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Klaim (dari struk)</span>
            <span className="font-mono font-semibold text-gray-800">{fmtRp(totalClaimed)}</span>
          </div>
          {hasRejected && (
            <div className="flex justify-between">
              <span className="text-red-600">Dikurangi item ditolak</span>
              <span className="font-mono font-semibold text-red-600">- {fmtRp(totalRejected)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-2 flex justify-between">
            <span className="font-semibold text-gray-800">
              Nominal Disetujui
            </span>
            <span className={`font-mono text-lg font-bold ${hasRejected ? 'text-yellow-700' : 'text-green-700'}`}>
              {fmtRp(totalApproved)}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            status === 'AUDITED' || status === 'APPROVED'
              ? 'bg-green-200 text-green-800'
              : 'bg-yellow-200 text-yellow-800'
          }`}>
            {status === 'PARTIAL_APPROVED' ? '⚠️ Partial Approved — ada item ditolak' : '✅ Semua item disetujui'}
          </span>
          <span className="text-xs text-gray-400">
            ID: <code className="font-mono">{result.submissionId.slice(0, 8)}…</code>
          </span>
        </div>

        {/* Rumus */}
        <div className="mt-3 pt-3 border-t border-gray-200 font-mono text-xs text-gray-500">
          Rumus: {fmtRp(totalClaimed)} - {fmtRp(totalRejected)} = <strong className="text-gray-700">{fmtRp(totalApproved)}</strong>
        </div>
      </div>
    </div>
  );
}
