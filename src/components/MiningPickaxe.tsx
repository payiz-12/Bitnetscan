import React, { useEffect, useState } from 'react';
import { isPageHidden } from '../services/pageVisibility';

interface Coin {
  dx: number;
  dy: number;
  rot: number;
}

/** Five coins flung up and out from the impact point, each in its own direction. */
const scatter = (): Coin[] =>
  Array.from({ length: 5 }, (_, i) => {
    // Spread the five coins across the upper half circle, with a little jitter.
    const angle = (-165 + i * 37.5 + (Math.random() - 0.5) * 22) * (Math.PI / 180);
    const dist = 170 + Math.random() * 110;
    return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, rot: (Math.random() - 0.5) * 540 };
  });

/**
 * A shaded pickaxe that strikes every `intervalMs`; each strike throws five Bitnet coins
 * that scatter and fade. Static when the reader prefers reduced motion or the tab is hidden.
 */
export const MiningPickaxe: React.FC<{ intervalMs?: number; className?: string }> = ({ intervalMs = 5000, className = '' }) => {
  const [strike, setStrike] = useState<{ id: number; coins: Coin[] } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let id = 0;
    const hit = () => {
      if (isPageHidden()) return;
      id += 1;
      setStrike({ id, coins: scatter() });
    };
    const first = setTimeout(hit, 1200);
    const timer = setInterval(hit, intervalMs);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [intervalMs]);

  return (
    <div className={`relative w-full h-full ${className}`} aria-hidden="true">
      <svg
        key={strike?.id ?? 0}
        viewBox="0 0 64 64"
        className={`absolute inset-[6%] w-[88%] h-[88%] pickaxe-shadow ${strike ? 'pickaxe-swing' : ''}`}
      >
        <defs>
          <linearGradient id="pxHandle" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#D9A066" />
            <stop offset="0.55" stopColor="#A86B34" />
            <stop offset="1" stopColor="#7A4A20" />
          </linearGradient>
          <linearGradient id="pxHead" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F4F8FA" />
            <stop offset="0.45" stopColor="#B9C6CE" />
            <stop offset="1" stopColor="#5E6E79" />
          </linearGradient>
          <linearGradient id="pxCollar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3A98A4" />
            <stop offset="1" stopColor="#01424B" />
          </linearGradient>
        </defs>
        {/* Handle with a highlight and a grip wrap */}
        <line x1="17" y1="55" x2="40" y2="20" stroke="url(#pxHandle)" strokeWidth="6.5" strokeLinecap="round" />
        <line x1="16.2" y1="52.4" x2="38" y2="19.5" stroke="#F3C996" strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
        <line x1="17.6" y1="49.5" x2="22.4" y2="52.6" stroke="#5B3414" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        <line x1="19.4" y1="46.8" x2="24.2" y2="49.9" stroke="#5B3414" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        {/* Curved steel head */}
        <path d="M11 22 Q 36 2 61 25 L 57.5 28.5 Q 37 11 15 25.5 Z" fill="url(#pxHead)" stroke="#3E4C56" strokeWidth="0.9" strokeLinejoin="round" />
        <path d="M15 20.6 Q 36 5.5 57 23.6" fill="none" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
        {/* Brand-colored collar where head meets handle */}
        <rect x="34.5" y="12.5" width="10" height="9" rx="2.2" transform="rotate(33 39.5 17)" fill="url(#pxCollar)" stroke="#012F36" strokeWidth="0.7" />
        <rect x="36" y="13.6" width="7" height="2" rx="1" transform="rotate(33 39.5 17)" fill="#A7D9DF" opacity="0.7" />
      </svg>

      {strike && (
        <div key={`burst-${strike.id}`} className="pointer-events-none absolute left-[78%] top-[62%] w-0 h-0">
          <span className="pickaxe-impact" />
          {strike.coins.map((c, i) => (
            <img
              key={i}
              src="/bitnet-logo-blue.svg"
              alt=""
              className="pickaxe-coin"
              style={{ '--dx': `${c.dx}%`, '--dy': `${c.dy}%`, '--rot': `${c.rot}deg` } as React.CSSProperties}
            />
          ))}
        </div>
      )}
    </div>
  );
};
