'use client';

import { AuditedItem, ItemAuditStatus } from '@/lib/api';

interface Props {
  items: AuditedItem[];
}

function fmtRp(n: number | null) {
  if (n === null) return '-';
  return 'Rp ' + n.toLocaleString('id-ID');
}

const STATUS_CONFIG: Record<ItemAuditStatus, { label: string; cls: string; icon: string }> = {
  APPROVED: { label: 'Disetujui',   cls: 'bg-green-100 text-green-700', icon: '✓' },
  REJECTED: { label: 'Ditolak',     cls: 'bg-red-100 text-red-700',     icon: '✕' },
  UNKNOWN:  { label: 'Perlu Review',cls: 'bg-yellow-100 text-yellow-700',icon: '?' },
};

export default function ExtractedItemsTable({ items }: Props) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">Tidak ada item yang diekstrak</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</th>
            <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">Qty</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Harga Satuan</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subtotal</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kategori</th>
            <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.map((item, i) => {
            const cfg = STATUS_CONFIG[item.status];
            const rowCls = item.status === 'REJECTED' ? 'bg-red-50/50' : '';
            return (
              <tr key={i} className={rowCls}>
                <td className="py-2.5 px-3">
                  <div className="font-medium text-gray-800">{item.name}</div>
                  {item.status === 'REJECTED' && item.rejection_reason && (
                    <div className="text-xs text-red-500 mt-0.5">{item.rejection_reason}</div>
                  )}
                </td>
                <td className="py-2.5 px-2 text-center text-gray-500">
                  {item.quantity ?? '—'}
                </td>
                <td className="py-2.5 px-3 text-right text-gray-500 font-mono text-xs">
                  {fmtRp(item.unit_price)}
                </td>
                <td className={`py-2.5 px-3 text-right font-mono text-xs font-semibold ${
                  item.status === 'REJECTED' ? 'text-red-500 line-through' : 'text-gray-800'
                }`}>
                  {fmtRp(item.total_price)}
                </td>
                <td className="py-2.5 px-3 text-xs text-gray-400">
                  {item.category_name ?? '—'}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
