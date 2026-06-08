import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Travel Agent — Sistem Perjalanan Dinas',
  description: 'Sistem AI Agent Otonom untuk Travel, Perdin, dan Manajemen BBM',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
