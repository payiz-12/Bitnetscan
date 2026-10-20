import { rpcService } from './rpc';
import type { Block } from '../types/blockchain';
import { KNOWN_MINING_POOLS } from '../data/miningPools';

export type HistoryRange = '7d' | '30d' | '1y' | 'all';

export const HISTORY_RANGES: { id: HistoryRange; label: string; seconds: number | null }[] = [
  { id: '7d', label: '7D', seconds: 7 * 86400 },
  { id: '30d', label: '30D', seconds: 30 * 86400 },
  { id: '1y', label: '1Y', seconds: 365 * 86400 },
  { id: 'all', label: 'All', seconds: null },
];

const BUCKETS = 30;
export const SAMPLES_PER_BUCKET = 50;

const SOLO_NODE = '0x6afcdfec8066a7fbf1295f10c4907924e99e72a4';
const GTPOOL = '0xfad4a236c87880035497043f24ea58d73c3e50de';
const COOLPOOL = '0x6c0db3ea9eed7ed145f36da461d84a8d02596b08';

/** Fixed series order and colors for miner share charts; colors follow the miner, never its rank. */
export const MINER_GROUPS = [
  { id: SOLO_NODE, name: KNOWN_MINING_POOLS[SOLO_NODE]?.name || 'Solo node', color: '#0D9488' },
  { id: GTPOOL, name: 'GTPool', color: '#D97706' },
  { id: COOLPOOL, name: 'CoolPool', color: '#0284C7' },
  { id: 'other', name: 'Other miners', color: '#94A3B8' },
] as const;

export const minerGroupOf = (miner: string) => {
  const m = (miner || '').toLowerCase();
  return MINER_GROUPS.some((g) => g.id === m) ? m : 'other';
};

export interface HistoryBucket {
  fromBlock: number;
  toBlock: number;
  startTs: number;
  endTs: number;
  /** H/s: total work (totalDifficulty delta) divided by elapsed time. */
  hashrate: number;
  /** Average difficulty per block in the bucket. */
  difficulty: number;
  /** Average seconds between blocks in the bucket. */
  blockTime: number;
  /** Uncles per canonical block, from the sampled headers. */
  uncleRate: number;
  sampleSize: number;
  /** Sampled block counts by miner group id. */
  miners: Record<string, number>;
  /** Sampled block counts by miner address (lowercase). */
  addresses: Record<string, number>;
}

export interface ChainHistory {
  range: HistoryRange;
  buckets: HistoryBucket[];
  sampledBlocks: number;
  updatedAt: number;
}

const STORAGE_KEY = 'btn-chain-history-v2:';
const FRESH_MS = 10 * 60 * 1000;
const memory = new Map<HistoryRange, ChainHistory>();
const jobs = new Map<HistoryRange, Promise<ChainHistory>>();

/** Last computed history for a range (memory, then browser storage up to 6 hours old). */
export function getCachedHistory(range: HistoryRange): ChainHistory | null {
  const inMemory = memory.get(range);
  if (inMemory) return inMemory;
  try {
    const raw = localStorage.getItem(STORAGE_KEY + range);
    if (!raw) return null;
    const data = JSON.parse(raw) as ChainHistory;
    if (Array.isArray(data?.buckets) && data.buckets.length > 0 && Date.now() - data.updatedAt < 6 * 3600 * 1000) {
      memory.set(range, data);
      return data;
    }
  } catch {
    // storage unavailable
  }
  return null;
}

async function header(n: number): Promise<Block> {
  const [b] = await rpcService.getBlockHeadersByNumbers([n], { cache: false });
  if (!b) throw new Error(`Block ${n} unavailable`);
  return b;
}

/** Height of the last block mined at or before `target` (unix seconds), to within ~30 minutes. */
async function blockAtTime(target: number, first: Block, last: Block): Promise<number> {
  let lo = first;
  let hi = last;
  for (let step = 0; step < 30 && hi.number - lo.number > 1; step++) {
    const fraction = step < 8 && hi.timestamp > lo.timestamp ? (target - lo.timestamp) / (hi.timestamp - lo.timestamp) : 0.5;
    const n = Math.max(lo.number + 1, Math.min(hi.number - 1, Math.floor(lo.number + fraction * (hi.number - lo.number))));
    const b = await header(n);
    if (Math.abs(b.timestamp - target) < 1800) return b.number;
    if (b.timestamp <= target) lo = b; else hi = b;
  }
  return lo.number;
}

/**
 * Network history from block headers read over RPC. The range is split into 30 buckets;
 * hashrate, difficulty and block time come from the exact cumulative work and timestamps
 * at the bucket edges. Uncle rate and miner shares come from 50 evenly spaced headers per bucket.
 */
export function loadHistory(range: HistoryRange): Promise<ChainHistory> {
  const fresh = memory.get(range);
  if (fresh && Date.now() - fresh.updatedAt < FRESH_MS) return Promise.resolve(fresh);
  const running = jobs.get(range);
  if (running) return running;

  const job = (async () => {
    const headNumber = await rpcService.getBlockNumber();
    const [first, head] = await rpcService.getBlockHeadersByNumbers([1, headNumber], { cache: false });
    if (!first || !head) throw new Error('Chain head unavailable');
    const seconds = HISTORY_RANGES.find((r) => r.id === range)?.seconds ?? null;
    const start = seconds === null || head.timestamp - seconds <= first.timestamp
      ? 1
      : await blockAtTime(head.timestamp - seconds, first, head);

    const edges = Array.from({ length: BUCKETS + 1 }, (_, k) => Math.round(start + (k * (head.number - start)) / BUCKETS));
    const samples: number[][] = [];
    for (let k = 0; k < BUCKETS; k++) {
      const lo = edges[k];
      const span = edges[k + 1] - lo;
      const count = Math.min(SAMPLES_PER_BUCKET, span);
      samples.push([...new Set(Array.from({ length: count }, (_, j) => lo + 1 + Math.floor(((j + 0.5) * span) / count)))]);
    }

    const blocks = await rpcService.getBlockHeadersByNumbers([...edges, ...samples.flat()], { cache: false });
    const byNumber = new Map(blocks.map((b) => [b.number, b]));

    const buckets: HistoryBucket[] = [];
    for (let k = 0; k < BUCKETS; k++) {
      const a = byNumber.get(edges[k]);
      const b = byNumber.get(edges[k + 1]);
      if (!a || !b || b.number <= a.number) continue;
      const sampled = samples[k].map((n) => byNumber.get(n)).filter((x): x is Block => !!x);
      const n = b.number - a.number;
      const dt = b.timestamp - a.timestamp;
      if (dt <= 0 || sampled.length === 0) continue;
      let work: number;
      if (a.totalDifficulty && b.totalDifficulty) {
        work = Number(BigInt(b.totalDifficulty) - BigInt(a.totalDifficulty));
      } else {
        // Without totalDifficulty, scale the sampled average difficulty to the whole bucket.
        work = (sampled.reduce((s, x) => s + Number(BigInt(x.difficulty)), 0) / sampled.length) * n;
      }
      const miners: Record<string, number> = {};
      const addresses: Record<string, number> = {};
      for (const x of sampled) {
        const g = minerGroupOf(x.miner);
        miners[g] = (miners[g] || 0) + 1;
        const a = (x.miner || '').toLowerCase();
        addresses[a] = (addresses[a] || 0) + 1;
      }
      buckets.push({
        fromBlock: a.number,
        toBlock: b.number,
        startTs: a.timestamp,
        endTs: b.timestamp,
        hashrate: work / dt,
        difficulty: work / n,
        blockTime: dt / n,
        uncleRate: sampled.reduce((s, x) => s + x.uncles.length, 0) / sampled.length,
        sampleSize: sampled.length,
        miners,
        addresses,
      });
    }
    if (buckets.length < 2) throw new Error('Not enough history');

    const result: ChainHistory = {
      range,
      buckets,
      sampledBlocks: buckets.reduce((s, b) => s + b.sampleSize, 0),
      updatedAt: Date.now(),
    };
    memory.set(range, result);
    try {
      localStorage.setItem(STORAGE_KEY + range, JSON.stringify(result));
    } catch {
      // storage unavailable
    }
    return result;
  })().finally(() => jobs.delete(range));

  jobs.set(range, job);
  return job;
}
