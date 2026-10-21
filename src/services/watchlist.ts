import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { rpcService } from './rpc';
import { isPageHidden } from './pageVisibility';

/**
 * Watchlist kept in this browser (localStorage). While BitnetScan is open, even in a
 * background tab, every watched address's balance and nonce are checked; a change is logged,
 * shown in the app and, with permission, sent as a system notification (at most one per
 * address every 10 minutes, with the changes in between added up).
 */

export interface WatchedAddress {
  address: string;
  name: string;
  notify: boolean;
  addedAt: number;
  balanceWei: string | null;
  nonce: number | null;
  checkedAt: number | null;
  lastNotifiedAt: number | null;
  pendingWei: string;
  pendingSent: number;
}

export interface WatchEvent {
  id: string;
  address: string;
  name: string;
  at: number;
  block: number | null;
  deltaWei: string;
  sent: number;
  balanceWei: string;
}

const LIST_KEY = 'bitnetscan-watchlist-v1';
const EVENTS_KEY = 'bitnetscan-watch-events-v1';
const SEEN_KEY = 'bitnetscan-watch-seen-v1';
const MAX_ADDRESSES = 50;
const MAX_EVENTS = 100;
const NOTIFY_GAP_MS = 10 * 60 * 1000;

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
};

let list: WatchedAddress[] = read<WatchedAddress[]>(LIST_KEY, []);
let events: WatchEvent[] = read<WatchEvent[]>(EVENTS_KEY, []);
let seenAt: number = read<number>(SEEN_KEY, 0);
const listeners = new Set<() => void>();
const emit = () => { listeners.forEach((l) => { try { l(); } catch { /* ignore */ } }); };
const saveList = () => { write(LIST_KEY, list); emit(); };

// Another tab changed the list: pick it up.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === LIST_KEY) list = read(LIST_KEY, []);
    if (e.key === EVENTS_KEY) events = read(EVENTS_KEY, []);
    if (e.key === SEEN_KEY) seenAt = read(SEEN_KEY, 0);
    if (e.key === LIST_KEY || e.key === EVENTS_KEY || e.key === SEEN_KEY) emit();
  });
}

export const getWatchlist = () => list;
export const getWatchEvents = () => events;
export const isWatched = (address: string) => list.some((w) => w.address === address.toLowerCase());
export const unseenCount = () => events.filter((e) => e.at > seenAt).length;
export const markEventsSeen = () => { seenAt = Date.now(); write(SEEN_KEY, seenAt); emit(); };

export function addWatch(address: string, name = ''): boolean {
  const a = address.toLowerCase();
  if (!ethers.isAddress(a) || isWatched(a) || list.length >= MAX_ADDRESSES) return false;
  list = [...list, { address: a, name: name.trim().slice(0, 40), notify: true, addedAt: Date.now(), balanceWei: null, nonce: null, checkedAt: null, lastNotifiedAt: null, pendingWei: '0', pendingSent: 0 }];
  saveList();
  checkWatchlist().catch(() => {});
  return true;
}

export function removeWatch(address: string) {
  list = list.filter((w) => w.address !== address.toLowerCase());
  saveList();
}

export function updateWatch(address: string, patch: Partial<Pick<WatchedAddress, 'name' | 'notify'>>) {
  list = list.map((w) => (w.address === address.toLowerCase() ? { ...w, ...patch, name: (patch.name ?? w.name).slice(0, 40) } : w));
  saveList();
}

export function clearWatchEvents() {
  events = [];
  write(EVENTS_KEY, events);
  emit();
}

/** JSON backup of the watchlist (addresses, names, notification settings). */
export function exportWatchlist(): string {
  return JSON.stringify({ version: 1, addresses: list.map(({ address, name, notify }) => ({ address, name, notify })) }, null, 2);
}

/** Adds the addresses from a JSON backup; returns how many were new. */
export function importWatchlist(json: string): number {
  const data = JSON.parse(json);
  const items: any[] = Array.isArray(data?.addresses) ? data.addresses : [];
  let added = 0;
  for (const item of items) {
    if (typeof item?.address === 'string' && addWatch(item.address, String(item.name || ''))) {
      added += 1;
      if (item.notify === false) updateWatch(item.address, { notify: false });
    }
  }
  return added;
}

export const formatBtnDelta = (wei: bigint) => {
  const abs = wei < 0n ? -wei : wei;
  const s = ethers.formatEther(abs);
  return `${wei < 0n ? '−' : '+'}${s.endsWith('.0') ? s.slice(0, -2) : s} BTN`;
};

/** System notification; Android Chrome only shows them through the service worker. */
async function showNotification(n: { title: string; body: string; address: string }) {
  const options = { body: n.body, icon: '/pwa-192.png', tag: `watch-${n.address}`, data: { url: `/#/address/${n.address}` } };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) {
      await reg.showNotification(n.title, options);
      return;
    }
  } catch { /* fall back below */ }
  try {
    const note = new Notification(n.title, options);
    note.onclick = () => { window.focus(); window.location.hash = `#/address/${n.address}`; note.close(); };
  } catch { /* notifications unavailable */ }
}

let running: Promise<void> | null = null;

/** Reads every watched address in one batch request and records what changed. */
export function checkWatchlist(): Promise<void> {
  if (running) return running;
  running = (async () => {
    if (list.length === 0) return;
    const snapshot = list;
    const results = await rpcService.batch([
      { method: 'eth_blockNumber', params: [] },
      ...snapshot.flatMap((w) => [
        { method: 'eth_getBalance', params: [w.address, 'latest'] },
        { method: 'eth_getTransactionCount', params: [w.address, 'latest'] },
      ]),
    ], 15000);
    const block = typeof results[0] === 'string' ? parseInt(results[0], 16) : null;
    const now = Date.now();
    const newEvents: WatchEvent[] = [];
    const notices: { title: string; body: string; address: string }[] = [];

    const updated = new Map<string, WatchedAddress>();
    snapshot.forEach((w, i) => {
      const bal = results[1 + i * 2];
      const nonceHex = results[2 + i * 2];
      if (typeof bal !== 'string' || typeof nonceHex !== 'string') return;
      const balance = BigInt(bal);
      const nonce = parseInt(nonceHex, 16);
      const next: WatchedAddress = { ...w, balanceWei: balance.toString(), nonce, checkedAt: now };
      if (w.balanceWei !== null && w.nonce !== null) {
        const delta = balance - BigInt(w.balanceWei);
        const sent = Math.max(0, nonce - w.nonce);
        if (delta !== 0n || sent > 0) {
          newEvents.push({ id: `${w.address}-${now}`, address: w.address, name: w.name, at: now, block, deltaWei: delta.toString(), sent, balanceWei: balance.toString() });
          next.pendingWei = (BigInt(w.pendingWei || '0') + delta).toString();
          next.pendingSent = (w.pendingSent || 0) + sent;
        }
      }
      // Throttled notification with everything that changed since the last one.
      const pending = BigInt(next.pendingWei || '0');
      if (w.notify && (pending !== 0n || next.pendingSent > 0) && (!w.lastNotifiedAt || now - w.lastNotifiedAt >= NOTIFY_GAP_MS)) {
        const who = w.name || `${w.address.slice(0, 6)}…${w.address.slice(-4)}`;
        const parts = [pending !== 0n ? formatBtnDelta(pending) : null, next.pendingSent > 0 ? `${next.pendingSent} sent ${next.pendingSent === 1 ? 'transaction' : 'transactions'}` : null].filter(Boolean);
        notices.push({ title: `${who}: ${parts.join(', ')}`, body: `Balance ${ethers.formatEther(balance)} BTN${block ? ` · block #${block.toLocaleString('en-US')}` : ''}`, address: w.address });
        next.lastNotifiedAt = now;
        next.pendingWei = '0';
        next.pendingSent = 0;
      }
      updated.set(w.address, next);
    });

    // Merge into the current list (it may have changed while the request ran).
    list = list.map((w) => updated.get(w.address) ?? w);
    write(LIST_KEY, list);
    if (newEvents.length) {
      events = [...newEvents.reverse(), ...events].slice(0, MAX_EVENTS);
      write(EVENTS_KEY, events);
    }
    emit();
    for (const n of notices) {
      window.dispatchEvent(new CustomEvent('bitnetscan:watch', { detail: n }));
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') showNotification(n);
    }
  })().finally(() => { running = null; });
  return running;
}

let timer: ReturnType<typeof setTimeout> | null = null;

/** Starts the background checks: every 30 s while visible, every 60 s in a background tab. */
export function startWatchlistMonitor() {
  if (timer || typeof window === 'undefined') return;
  const tick = async () => {
    try { await checkWatchlist(); } catch { /* next tick */ }
    timer = setTimeout(tick, isPageHidden() ? 60000 : 30000);
  };
  timer = setTimeout(tick, 3000);
}

/** Re-renders when the watchlist or its change log changes. */
export function useWatchlist() {
  const [, setVersion] = useState(0);
  useEffect(() => {
    const l = () => setVersion((v) => v + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return { list, events, unseen: unseenCount() };
}
