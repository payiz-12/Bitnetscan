import React, { useEffect, useRef, useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';

interface ShareButtonProps {
  /** Path form of the page, e.g. /tx/0x…, so link previews show its share card. */
  path: string;
  text: string;
}

/**
 * Shares a page link. Phones use the system share sheet; elsewhere a menu offers X,
 * Telegram, WhatsApp and copying the link. The link uses the /tx/… form, whose preview
 * card is rendered from the chain by /api/og.
 */
export const ShareButton: React.FC<ShareButtonProps> = ({ path, text }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const url = `${window.location.origin}${path}`;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const onClick = async () => {
    const touch = window.matchMedia?.('(pointer: coarse)').matches;
    if (touch && navigator.share) {
      try {
        await navigator.share({ title: text, text, url });
        return;
      } catch {
        // dismissed or unsupported: fall back to the menu
      }
    }
    setOpen((o) => !o);
  };

  const copy = () => {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const e = encodeURIComponent;
  const targets = [
    { name: 'X', href: `https://twitter.com/intent/tweet?text=${e(text)}&url=${e(url)}` },
    { name: 'Telegram', href: `https://t.me/share/url?url=${e(url)}&text=${e(text)}` },
    { name: 'WhatsApp', href: `https://wa.me/?text=${e(`${text} ${url}`)}` },
  ];

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:border-petrol hover:text-petrol shadow-2xs cursor-pointer transition-colors"
      >
        <Share2 className="w-3.5 h-3.5" />
        Share
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1.5 z-40 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg animate-fade-in">
          {targets.map((t) => (
            <a
              key={t.name}
              role="menuitem"
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-petrol-50 hover:text-petrol"
            >
              Share on {t.name}
            </a>
          ))}
          <button
            role="menuitem"
            type="button"
            onClick={copy}
            className="w-full flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-petrol-50 hover:text-petrol cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Link copied' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  );
};
