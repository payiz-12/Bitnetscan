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
