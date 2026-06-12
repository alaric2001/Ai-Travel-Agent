'use client';

import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastData {
  id:      number;
  type:    ToastType;
  title:   string;
  message: string;
}

const ICONS: Record<ToastType, string> = {
  success: '✅',
  warning: '⚠️',
  error:   '❌',
  info:    'ℹ️',
};

const COLORS: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-300 text-green-800',
  warning: 'bg-amber-50 border-amber-300 text-amber-800',
  error:   'bg-red-50 border-red-300 text-red-800',
  info:    'bg-blue-50 border-blue-300 text-blue-800',
};

function ToastItem({ toast, onClose }: { toast: ToastData; onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // slide-in
    const show = setTimeout(() => setVisible(true), 10);
    // auto-dismiss setelah 5 detik
    const hide = setTimeout(() => { setVisible(false); setTimeout(onClose, 300); }, 5000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [onClose]);

  return (
    <div
      className={`flex items-start gap-3 border rounded-xl px-4 py-3 shadow-lg max-w-sm w-full
        transition-all duration-300 ${COLORS[toast.type]}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
    >
      <span className="text-base shrink-0 mt-0.5">{ICONS[toast.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{toast.title}</p>
        <p className="text-xs mt-0.5 opacity-80">{toast.message}</p>
      </div>
      <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }} className="shrink-0 opacity-50 hover:opacity-100 text-sm leading-none mt-0.5">✕</button>
    </div>
  );
}

export function ToastContainer({ toasts, onClose }: { toasts: ToastData[]; onClose: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => onClose(t.id)} />
      ))}
    </div>
  );
}

// Hook untuk manajemen toast
let _counter = 0;
export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const add = (type: ToastType, title: string, message: string) => {
    const id = ++_counter;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return { toasts, remove, toast: { success: (t: string, m: string) => add('success', t, m), warning: (t: string, m: string) => add('warning', t, m), error: (t: string, m: string) => add('error', t, m), info: (t: string, m: string) => add('info', t, m) } };
}
