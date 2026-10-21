/**
 * Named contracts on Bitnet, read live from the Bitnet explorer index: every BTS-20 token, every
 * NFT collection and every verified contract. Used for search by name and for address labels, so
 * a token deployed a minute ago can be found by its name. The list is re-read when it is older
 * than a minute and someone needs it again.
 */
export type DirectoryKind = 'token' | 'nft' | 'contract';

export interface DirectoryEntry {
  address: string;
  name: string;
  symbol?: string;
  kind: DirectoryKind;
}

const BASES = ['/api/explorer', 'https://explorer.bitnetmoney.com'];
const MAX_AGE_MS = 60_000;

async function allPages(path: string, maxPages: number): Promise<any[]> {
  for (const base of BASES) {
    try {
      const items: any[] = [];
      let next: Record<string, string> | null = null;
      for (let i = 0; i < maxPages; i++) {
        const qs = new URLSearchParams(next ?? {}).toString();
        const res = await fetch(`${base}${path}${qs ? `${path.includes('?') ? '&' : '?'}${qs}` : ''}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = await res.json();
        items.push(...(d.items ?? []));
        next = d.next_page_params ?? null;
        if (!next) break;
      }
      return items;
    } catch {
      // try the next base
    }
  }
  throw new Error('The Bitnet explorer could not be reached');
}

let entries: DirectoryEntry[] = [];
let byAddress = new Map<string, DirectoryEntry>();
let loadedAt = 0;
let job: Promise<DirectoryEntry[]> | null = null;
const listeners = new Set<() => void>();

/** Current entries; empty until the first load finishes. */
export function getDirectory(): DirectoryEntry[] {
  return entries;
}

export function findDirectoryEntry(address: string | null | undefined): DirectoryEntry | null {
  return byAddress.get((address || '').toLowerCase()) ?? null;
}

/** Loads (or refreshes, when older than a minute) the directory; resolves with the entries. */
export function loadDirectory(): Promise<DirectoryEntry[]> {
  if (Date.now() - loadedAt < MAX_AGE_MS) return Promise.resolve(entries);
  if (job) return job;
  job = (async () => {
    const [tokens, nfts, contracts] = await Promise.all([
      allPages('/api/v2/tokens?type=ERC-20', 10).catch(() => null),
      allPages('/api/v2/tokens?type=ERC-721', 5).catch(() => null),
      allPages('/api/v2/smart-contracts', 10).catch(() => null),
    ]);
    if (!tokens && !nfts && !contracts) return entries;
    const next = new Map<string, DirectoryEntry>();
    const add = (address: unknown, name: unknown, kind: DirectoryKind, symbol?: unknown) => {
      const a = String(address || '').toLowerCase();
      if (!/^0x[0-9a-f]{40}$/.test(a) || next.has(a) || !name) return;
      next.set(a, { address: String(address), name: String(name), symbol: symbol ? String(symbol) : undefined, kind });
    };
    for (const t of tokens ?? []) add(t.address_hash || t.address, t.name, 'token', t.symbol);
    for (const t of nfts ?? []) add(t.address_hash || t.address, t.name, 'nft', t.symbol);
    for (const c of contracts ?? []) add(c.address?.hash, c.address?.name, 'contract');
    entries = [...next.values()];
    byAddress = next;
    loadedAt = Date.now();
    listeners.forEach((fn) => fn());
    return entries;
  })().finally(() => { job = null; });
  return job;
}

/** Calls `fn` whenever the directory changes; returns the unsubscribe function. */
export function subscribeDirectory(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
