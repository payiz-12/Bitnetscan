/** True while the tab is in the background; polling loops skip their work then. */
export const isPageHidden = (): boolean =>
  typeof document !== 'undefined' && document.visibilityState === 'hidden';

/** Runs `cb` whenever the tab becomes visible again (to catch up after a paused poll). */
export function onPageVisible(cb: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  const handler = () => {
    if (!isPageHidden()) cb();
  };
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}
