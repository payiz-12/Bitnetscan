import type { Block } from '../types/blockchain';

/**
 * Ethash work is difficulty in expected hashes (cumulative totalDifficulty).
 * Computes exact average hashrate in H/s between two blocks on-chain:
 * Hashrate = (totalDifficulty_last - totalDifficulty_first) / (timestamp_last - timestamp_first)
 */
export function calculateHashrate(first: Block, last: Block): number | null {
  try {
    if (last.number <= first.number || last.timestamp <= first.timestamp) return null;
    const timeDelta = last.timestamp - first.timestamp;
    if (timeDelta <= 0) return null;

    if (last.totalDifficulty && first.totalDifficulty) {
      const work = BigInt(last.totalDifficulty) - BigInt(first.totalDifficulty);
      const rate = Number(work) / timeDelta;
      if (work > 0n && Number.isFinite(rate) && rate > 0) return rate;
    }

    return null;
  } catch {
    return null;
  }
}

export function formatHashrate(rate: number | null): string {
  if (rate == null || !Number.isFinite(rate)) return 'Unknown';
  for (const [unit, scale] of [
    ['TH/s', 1e12],
    ['GH/s', 1e9],
    ['MH/s', 1e6],
    ['kH/s', 1e3],
    ['H/s', 1],
  ] as const) {
    if (rate >= scale || scale === 1) return `${(rate / scale).toFixed(2)} ${unit}`;
  }
  return 'Unknown';
}

export interface HashratePoint {
  date: string;
  fullDate: string;
  hashrate: number;
  timestamp: number;
}

const historyCache = new Map<string, HashratePoint[]>();
const STORAGE_KEY = 'btn-chain210-hashrate-v3:';

/**
 * Returns cached hashrate history for instantaneous 0ms UI rendering
 */
export function getCachedHashrateHistory(timeframe: string): HashratePoint[] {
  // 1. In-memory cache
  for (const [key, points] of [...historyCache].reverse()) {
    if (key.startsWith(`${timeframe}:`) && Array.isArray(points) && points.length > 0) {
      return points;
    }
  }

  // 2. Local storage cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY + timeframe);
    if (raw) {
      const data = JSON.parse(raw);
      if (
        data &&
        Date.now() - data.savedAt < 86400000 &&
        Array.isArray(data.points) &&
        data.points.length > 0 &&
        data.points.every(
          (p: HashratePoint) => Number.isFinite(p.hashrate) && p.hashrate > 0 && Number.isFinite(p.timestamp)
        )
      ) {
        historyCache.set(`${timeframe}:local`, data.points);
        return data.points;
      }
    }
  } catch {
    // Storage may be disabled
  }

  return [];
}

/**
 * Loads authentic on-chain hashrate curve for 1d, 7d, 30d, 90d (3 Months), 1y (1 Year), and all (All Time).
 * Uses batched parallel RPC queries instead of exhaustive binary search, avoiding timeouts and rate limits.
 */
export async function loadHashrateHistory(
  timeframe: string,
  latest: Block,
  getBlock: (n: number) => Promise<Block | null>,
  signal: AbortSignal
): Promise<HashratePoint[]> {
  const cacheBucket = Math.floor(latest.timestamp / 300); // 5-minute freshness bucket
  const key = `${timeframe}:${cacheBucket}`;
  if (historyCache.has(key)) return historyCache.get(key)!;

  // Configuration per timeframe
  const config: Record<string, { durationSec: number | null; count: number }> = {
    '1d': { durationSec: 86400, count: 24 },
    '7d': { durationSec: 7 * 86400, count: 14 },
    '30d': { durationSec: 30 * 86400, count: 30 },
    '90d': { durationSec: 90 * 86400, count: 30 },
    '1y': { durationSec: 365 * 86400, count: 36 },
    'all': { durationSec: null, count: 39 },
  };

  const currentCfg = config[timeframe] || { durationSec: 30 * 86400, count: 30 };
  const count = currentCfg.count;

  // Map to hold fetched blocks
  const blockMap = new Map<number, Block>();
  blockMap.set(latest.number, latest);

  const fetchBlockSafe = async (n: number): Promise<Block | null> => {
    if (blockMap.has(n)) return blockMap.get(n)!;
    if (signal.aborted) return null;
    try {
      const b = await getBlock(n);
      if (b) {
        blockMap.set(b.number, b);
        return b;
      }
    } catch {}
    return null;
  };

  const genesis = await fetchBlockSafe(1);
  if (!genesis) throw new Error('Genesis block unavailable');
  let startBlockNum = 1;
  if (currentCfg.durationSec !== null) {
    const target = Math.max(genesis.timestamp, latest.timestamp - currentCfg.durationSec);
    let lo = genesis, hi = latest;
    let attempts = 0;
    while (hi.number - lo.number > 1) {
      if (signal.aborted) throw new Error('Operation aborted');
      // Interpolation is fast on regular block times; bisection guarantees convergence.
      const fraction = attempts++ < 8 && hi.timestamp > lo.timestamp
        ? (target - lo.timestamp) / (hi.timestamp - lo.timestamp) : 0.5;
      const n = Math.max(lo.number + 1, Math.min(hi.number - 1,
        Math.floor(lo.number + fraction * (hi.number - lo.number))));
      const block = await fetchBlockSafe(n);
      if (!block) throw new Error('Historical boundary block unavailable');
      if (block.timestamp <= target) lo = block; else hi = block;
    }
    startBlockNum = lo.number;
  }

  // Generate target block sample numbers evenly across the range
  const sampleNumbers: number[] = [];
  for (let i = 0; i <= count; i++) {
    const num = Math.round(startBlockNum + (i / count) * (latest.number - startBlockNum));
    sampleNumbers.push(num);
  }

  // Deduplicate and filter out blocks already in memory
  const numsToFetch = Array.from(new Set(sampleNumbers)).filter((n) => !blockMap.has(n));

  // Batch fetch in gentle chunks of 6 to prevent RPC throttling
  const batchSize = 6;
  for (let i = 0; i < numsToFetch.length; i += batchSize) {
    if (signal.aborted) throw new Error('Operation aborted');
    const batch = numsToFetch.slice(i, i + batchSize);
    await Promise.all(batch.map(n => fetchBlockSafe(n)));
  }

  if (signal.aborted) throw new Error('Operation aborted');

  // Build the contiguous edges list
  const resolvedEdges: Block[] = [];
  for (const n of sampleNumbers) {
    if (blockMap.has(n)) {
      resolvedEdges.push(blockMap.get(n)!);
    } else {
      throw new Error('Historical sample block unavailable');
    }
  }

  // Sort edges ascending by block number and deduplicate
  const uniqueEdges: Block[] = [];
  resolvedEdges.sort((a, b) => a.number - b.number);
  for (const b of resolvedEdges) {
    if (uniqueEdges.length === 0 || uniqueEdges[uniqueEdges.length - 1].number < b.number) {
      uniqueEdges.push(b);
    }
  }

  if (uniqueEdges.length < 2) {
    throw new Error('Insufficient block data available');
  }

  // Calculate hashrate points between adjacent edges
  const points: HashratePoint[] = [];

  for (let i = 1; i < uniqueEdges.length; i++) {
    const first = uniqueEdges[i - 1];
    const last = uniqueEdges[i];

    const rate = calculateHashrate(first, last);
    if (rate === null) throw new Error('Cumulative work unavailable');

    const lastDate = new Date(last.timestamp * 1000);
    const firstDate = new Date(first.timestamp * 1000);

    let dateLabel = '';
    if (timeframe === '1d') {
      dateLabel = lastDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
    } else if (timeframe === '7d' || timeframe === '30d' || timeframe === '90d') {
      dateLabel = lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    } else if (timeframe === '1y') {
      dateLabel = lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    } else {
      // all
      dateLabel = lastDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
    }

    const fullDate = `${firstDate.toISOString()} – ${lastDate.toISOString()} · #${first.number.toLocaleString()}–#${last.number.toLocaleString()}`;

    points.push({
      date: dateLabel,
      fullDate,
      hashrate: rate / 1e9, // GH/s; round only presentation, never the stored sample
      timestamp: last.timestamp,
    });
  }

  if (points.length === 0) {
    throw new Error('Failed to generate hashrate points');
  }

  // Cache in memory and localStorage
  if (historyCache.size > 20) {
    historyCache.delete(historyCache.keys().next().value!);
  }
  historyCache.set(key, points);

  try {
    localStorage.setItem(STORAGE_KEY + timeframe, JSON.stringify({ savedAt: Date.now(), points }));
  } catch {}

  return points;
}
