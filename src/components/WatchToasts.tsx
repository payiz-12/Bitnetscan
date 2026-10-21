import React, { useEffect, useState } from 'react';
import { Star, X } from 'lucide-react';

interface Toast {
  id: number;
  title: string;
  body: string;
  address: string;
}

/** In-app notices for watchlist changes, shown for 8 seconds in the bottom corner. */
export const WatchToasts: React.FC<{ onSelectAddress: (a: string) => void }> = ({ onSelectAddress }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let id = 0;
    const onWatch = (e: Event) => {
      const detail = (e as CustomEvent).detail as Omit<Toast, 'id'>;
      const toast = { ...detail, id: ++id };
      setToasts((t) => [...t.slice(-2), toast]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== toast.id)), 8000);
    };
    window.addEventListener('bitnetscan:watch', onWatch);
    return () => window.removeEventListener('bitnetscan:watch', onWatch);
  }, []);

  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] flex flex-col gap-2 sm:w-80" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="rounded-2xl border border-amber-200 bg-white shadow-lg p-3 flex gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
          </div>
          <button type="button" onClick={() => onSelectAddress(t.address)} className="min-w-0 flex-1 text-left cursor-pointer">
            <div className="text-xs font-bold text-slate-900 truncate">{t.title}</div>
            <div className="text-[11px] text-slate-500 truncate">{t.body}</div>
          </button>
          <button type="button" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 self-start cursor-pointer" aria-label="Dismiss">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
