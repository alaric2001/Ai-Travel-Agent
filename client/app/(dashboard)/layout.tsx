'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/booking', label: 'Booking Agent',  icon: '✈️',  desc: 'Tiket & Hotel' },
  { href: '/audit',   label: 'Audit Agent',    icon: '🧾',  desc: 'Klaim Expense' },
  { href: '/fuel',    label: 'Fuel Agent',     icon: '⛽',  desc: 'Manajemen BBM' },
  { href: '/admin',   label: 'Admin Panel',    icon: '⚙️',  desc: 'Pengaturan' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-900 text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-brand-700">
          <h1 className="text-lg font-bold leading-tight">AI Travel Agent</h1>
          <p className="text-xs text-blue-300 mt-0.5">Sistem Perjalanan Dinas</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-brand-600 text-white font-medium'
                    : 'text-blue-200 hover:bg-brand-700 hover:text-white'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs opacity-70">{item.desc}</div>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-brand-700 text-xs text-blue-300">
          <div className="font-medium text-white">PoC v1.0</div>
          <div>Tahap 2: Booking Agent</div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
