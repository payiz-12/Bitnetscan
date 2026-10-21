import { useEffect, useState } from 'react';

/**
 * Light / dark theme. Until the visitor picks one, the site follows the device setting.
 * index.html applies the same rule before the first paint, so pages never flash light.
 */
export type Theme = 'light' | 'dark';

const KEY = 'bitnetscan:theme';
const EVENT = 'bitnetscan:theme';
const systemQuery = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null);

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export function currentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  window.dispatchEvent(new CustomEvent(EVENT, { detail: theme }));
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // private mode: the choice lasts for this page only
  }
  apply(theme);
}

/** The active theme; re-renders when it changes (toggle, or the device setting while no choice is stored). */
export function useTheme(): Theme {
  const [theme, setState] = useState<Theme>(currentTheme);
  useEffect(() => {
    const onTheme = () => setState(currentTheme());
    const query = systemQuery();
    const onSystem = (e: MediaQueryListEvent) => { if (!storedTheme()) apply(e.matches ? 'dark' : 'light'); };
    window.addEventListener(EVENT, onTheme);
    query?.addEventListener?.('change', onSystem);
    return () => {
      window.removeEventListener(EVENT, onTheme);
      query?.removeEventListener?.('change', onSystem);
    };
  }, []);
  return theme;
}
