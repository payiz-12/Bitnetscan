import { useEffect, useRef, useState } from 'react';
import { rpcService } from './rpc';
import { isPageHidden } from './pageVisibility';

export interface MinerShare {
  address: string;
  count: number;
  share: number;
}

export interface Concentration {
  total: number;
  miners: MinerShare[];
  /** Fewest miners whose blocks together exceed half of the total. */
  nakamoto: number;
}

/** Block counts per miner address → sorted shares and the Nakamoto coefficient. */
export function concentration(counts: Record<string, number>): Concentration {
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const miners = Object.entries(counts)
    .map(([address, count]) => ({ address, count, share: total > 0 ? count / total : 0 }))
    .sort((a, b) => b.count - a.count);
  let sum = 0;
  let nakamoto = 0;
  for (const m of miners) {
    sum += m.share;
    nakamoto += 1;
    if (sum > 0.5) break;
  }
  return { total, miners, nakamoto };
}

export type RiskLevel = 'critical' | 'elevated' | 'moderate' | 'healthy';

/** Risk from the largest miner's share: above 50% it can outpace everyone else combined. */
export function riskLevel(topShare: number): RiskLevel {
  if (topShare > 0.5) return 'critical';
  if (topShare >= 1 / 3) return 'elevated';
  if (topShare >= 0.25) return 'moderate';
  return 'healthy';
}

/**
 * Probability that a miner with hashrate share q eventually overtakes a chain that is z
 * blocks ahead (Nakamoto, "Bitcoin: A Peer-to-Peer Electronic Cash System", section 11).
 */
export function catchUpProbability(q: number, z: number): number {
  const p = 1 - q;
  if (q >= p) return 1;
  const lambda = (z * q) / p;
  let sum = 1;
  let poisson = Math.exp(-lambda);
  for (let k = 0; k <= z; k++) {
    if (k > 0) poisson *= lambda / k;
    sum -= poisson * (1 - Math.pow(q / p, z - k));
  }
  return Math.min(1, Math.max(0, sum));
}

/** Confirmations needed to push the catch-up probability below `target`, or null if no number does. */
export function confirmationsFor(q: number, target = 0.001, max = 2000): number | null {
  if (q >= 0.5) return null;
  for (let z = 0; z <= max; z++) if (catchUpProbability(q, z) < target) return z;
  return null;
}

export interface IndexedReorg {
  from: number;
  to: number;
  depth: number;
  timestamp: string;
  miners: string[];
}

const INDEXER_BASES = ['/api/explorer', 'https://explorer.bitnetmoney.com'];

/**
 * Blocks the explorer indexer had stored and later saw replaced by another chain ("reorg"
 * blocks), grouped into runs of consecutive heights. The indexer only records reorgs that
 * happened after it had stored the block, so this is a lower bound.
 */
export async function loadIndexedReorgs(): Promise<IndexedReorg[] | null> {
  // /api/reorgs is the edge-cached copy (production); the indexer itself takes ~20 s to answer.
  const sources = ['/api/reorgs', ...INDEXER_BASES.map((b) => `${b}/api/v2/blocks?type=reorg`)];
  for (const url of sources) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(45000) });
      if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) continue;
      const data = await res.json();
      if (!Array.isArray(data?.items)) continue;
      const blocks = data.items
        .map((b: any) => ({ height: Number(b.height), timestamp: String(b.timestamp), miner: String(b.miner?.hash ?? b.miner ?? '').toLowerCase() }))
        .filter((b: any) => Number.isFinite(b.height))
        .sort((a: any, b: any) => b.height - a.height);
      const runs: IndexedReorg[] = [];
      for (const b of blocks) {
        const last = runs[runs.length - 1];
        if (last && last.from - b.height === 1) {
          last.from = b.height;
          last.depth += 1;
          if (!last.miners.includes(b.miner)) last.miners.push(b.miner);
        } else if (!last || last.from !== b.height) {
          runs.push({ from: b.height, to: b.height, depth: 1, timestamp: b.timestamp, miners: [b.miner] });
        }
      }
      return runs;
    } catch {
      // try the next base
    }
  }
  return null;
}

export interface LiveReorg {
  detectedAt: number;
  from: number;
  to: number;
  depth: number;
}

/**
 * Watches the newest 32 block hashes while the page is open (every 15 s) and reports any
 * height whose block hash changed: a chain reorganization seen live.
 */
export function useReorgWatch() {
  const seen = useRef(new Map<number, string>());
  const [events, setEvents] = useState<LiveReorg[]>([]);
  const [watchedSince] = useState(() => Date.now());
  const [blocksWatched, setBlocksWatched] = useState(0);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      if (isPageHidden()) return;
      try {
        const head = await rpcService.getBlockNumber();
        const heights = Array.from({ length: 32 }, (_, i) => head - 31 + i).filter((h) => h > 0);
        const headers = await rpcService.getBlockHeadersByNumbers(heights, { cache: false });
        if (!active || headers.length === 0) return;
        const changed: number[] = [];
        for (const b of headers) {
          const prev = seen.current.get(b.number);
          if (prev && prev !== b.hash) changed.push(b.number);
          seen.current.set(b.number, b.hash);
        }
        // Forget heights far below the head so the map stays small.
        for (const h of seen.current.keys()) if (h < head - 200) seen.current.delete(h);
        setBlocksWatched(seen.current.size);
        if (changed.length > 0) {
          changed.sort((a, b) => a - b);
          setEvents((prev) => [{ detectedAt: Date.now(), from: changed[0], to: changed[changed.length - 1], depth: changed.length }, ...prev].slice(0, 20));
        }
      } catch {
        // try again on the next tick
      }
    };
    poll();
    const timer = setInterval(poll, 15000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  return { events, watchedSince, blocksWatched };
}
