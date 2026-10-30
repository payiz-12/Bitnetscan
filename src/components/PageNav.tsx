import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Scrolls smoothly (or at once with reduced motion). Some embedded or background views do not
 * animate smooth scrolling at all, so if nothing has moved shortly after, it jumps instead.
 */
function scrollWith(move: (behavior: ScrollBehavior) => void) {
  const start = window.scrollY;
  move(reducedMotion() ? 'auto' : 'smooth');
  window.setTimeout(() => { if (Math.abs(window.scrollY - start) < 2) move('auto'); }, 400);
}

/**
 * "On this page" links for a long page: each item scrolls to the element with its id (the target
 * carries a scroll margin, so it lands below the sticky header). Scrolls sideways on phones.
 */
export const SectionNav: React.FC<{ items: { id: string; label: string }[] }> = ({ items }) => (
  <nav aria-label="On this page" className="flex items-center gap-2 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">On this page</span>
    {items.map((item) => (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          const target = document.getElementById(item.id);
          if (target) scrollWith((behavior) => target.scrollIntoView({ behavior, block: 'start' }));
        }}
        className="shrink-0 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:border-petrol hover:text-petrol cursor-pointer transition-colors"
      >
        {item.label}
      </button>
    ))}
  </nav>
);

/** Class for the elements SectionNav scrolls to: keeps them clear of the sticky header. */
export const SECTION_ANCHOR = 'scroll-mt-28';

/** A round button that appears after scrolling down a long page and goes back to the top. */
export const BackToTop: React.FC = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const update = () => setShow(window.scrollY > 1200);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  if (!show) return null;
  return (
    <button
      type="button"
      aria-label="Back to top"
      title="Back to top"
      onClick={() => scrollWith((behavior) => window.scrollTo({ top: 0, behavior }))}
      className="fixed bottom-5 right-5 z-40 w-11 h-11 rounded-full bg-petrol hover:bg-petrol-600 text-white shadow-lg flex items-center justify-center cursor-pointer animate-fade-in"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
};
