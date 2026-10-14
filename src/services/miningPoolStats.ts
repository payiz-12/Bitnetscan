import { Block, NetworkStats } from '../types/blockchain';
import { identifyMinerPool } from '../data/miningPools';

export interface LivePoolStats {
  /** Worker count as reported by the pool's own API. */
  workers: number;
  hashrateGh?: number;
  networkHashrateGh?: number;
  lastUpdated: number;
  source: string;
  /** Stratum servers, fee and payout terms as published by the pool. */
  servers?: { region: string; host: string; note?: string }[];
  feePercent?: number;
  minPayoutBtn?: number;
}

export const COOLPOOL_ADDR = '0x6c0db3ea9eed7ed145f36da461d84a8d02596b08';
export const GTPOOL_ADDR = '0xfad4a236c87880035497043f24ea58d73c3e50de';
export const SOLO_NODE_ADDR = '0x6afcdfec8066a7fbf1295f10c4907924e99e72a4';

// Only values measured from pool APIs are stored here; nothing is seeded.
let poolStatsCache: Record<string, LivePoolStats> = {};

let lastFetchTime = 0;
let isFetching = false;

export async function fetchLivePoolStats(): Promise<Record<string, LivePoolStats>> {
  const now = Date.now();
  if (isFetching || now - lastFetchTime < 30000) {
    return poolStatsCache;
  }

  isFetching = true;
  lastFetchTime = now;

  try {
    // CoolPool publishes its connected worker count; other miners do not.
    const coolPoolUrls = [
      '/api/coolpool/api/coin/btnsolo',
      'https://coolpool.top/api/coin/btnsolo',
    ];

    for (const url of coolPoolUrls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
        clearTimeout(timeout);

        if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) continue;
        const json = await res.json();
        const workers = Number(json?.coin?.minersTotal);
        if (Number.isFinite(workers) && workers >= 0) {
          const poolHashrate = parseFloat(json.coin.poolHashrate?.value);
          const networkHashrate = parseFloat(json.coin.networkHashrate?.value);
          poolStatsCache = {
            ...poolStatsCache,
            [COOLPOOL_ADDR]: {
              workers,
              hashrateGh: Number.isFinite(poolHashrate) ? poolHashrate : undefined,
              networkHashrateGh: Number.isFinite(networkHashrate) ? networkHashrate : undefined,
              lastUpdated: Date.now(),
              source: 'CoolPool API',
              servers: Array.isArray(json.coin.servers)
                ? json.coin.servers
                    .filter((srv: any) => typeof srv?.ip === 'string' && srv.ip)
                    .map((srv: any) => ({ region: String(srv.country || ''), host: String(srv.ip), note: srv.text ? String(srv.text) : undefined }))
                : undefined,
              feePercent: Number.isFinite(parseFloat(json.coin.commission?.value)) ? parseFloat(json.coin.commission.value) : undefined,
              minPayoutBtn: Number.isFinite(parseFloat(json.coin.minPayout?.value)) ? parseFloat(json.coin.minPayout.value) : undefined,
            },
          };
          break;
        }
      } catch {
        // Try next URL or keep the last measured value
      }
    }
  } finally {
    isFetching = false;
  }

  return poolStatsCache;
}

export function getCachedPoolStats(): Record<string, LivePoolStats> {
  return poolStatsCache;
}

export interface ComputedMinerStats {
  miner: string;
  poolName: string;
  poolTag: string;
  poolUrl?: string;
  category: 'known' | 'unknown';
  categoryLabel: string;
  badge: string;
  /** Worker count reported by the pool API, or null when the miner does not publish one. */
  minersCount: number | null;
  workersSource?: string;
  count: number;
  percent: string;
  /** Network hashrate × block share; null while the network hashrate is unknown. */
  estimatedHashrateGh: number | null;
}

export interface NetworkMiningSummary {
  miners: ComputedMinerStats[];
  /** Sum of worker counts reported by pool APIs (null when no pool reported). */
  reportedWorkers: number | null;
  reportedWorkerSources: string[];
  /** Miners in the sample whose worker count is not published. */
  minersWithoutWorkerData: number;
  knownPoolsCount: number;
  unknownMinersCount: number;
  totalBlocksSampled: number;
  networkHashrateGh: number | null;
}

/**
 * Block-share distribution of the sampled blocks. Worker counts come only from pool APIs:
 * block production share does not reveal how many physical workers a miner runs.
 */
export function computeLiveMiningSummary(
  blocks: Block[],
  networkHashrateHps?: number | null,
  poolStats?: Record<string, LivePoolStats>
): NetworkMiningSummary {
  const activePoolStats = poolStats || poolStatsCache;
  const netHashrateGh = networkHashrateHps && networkHashrateHps > 0 ? networkHashrateHps / 1e9 : null;

  const counts: Record<string, { count: number; extraDataAscii?: string }> = {};
  if (Array.isArray(blocks)) {
    for (const b of blocks) {
      if (!b.miner) continue;
      const m = b.miner.toLowerCase();
      if (!counts[m]) counts[m] = { count: 0, extraDataAscii: b.extraDataAscii };
      counts[m].count += 1;
    }
  }

  const totalBlocks = Object.values(counts).reduce((sum, item) => sum + item.count, 0);

  const miners: ComputedMinerStats[] = Object.entries(counts).map(([miner, data]) => {
    const poolInfo = identifyMinerPool(miner, data.extraDataAscii);
    const share = totalBlocks > 0 ? data.count / totalBlocks : 0;
    const reported = activePoolStats[miner];
    return {
      miner,
      poolName: poolInfo.name,
      poolTag: poolInfo.tag,
      poolUrl: poolInfo.url,
      category: poolInfo.category,
      categoryLabel: poolInfo.categoryLabel,
      badge: poolInfo.badge,
      minersCount: reported ? reported.workers : null,
      workersSource: reported?.source,
      count: data.count,
      percent: (share * 100).toFixed(1),
      estimatedHashrateGh: netHashrateGh !== null ? parseFloat((netHashrateGh * share).toFixed(1)) : null,
    };
  });

  miners.sort((a, b) => b.count - a.count);

  // Pool-reported worker counts do not depend on whether the pool mined one of the sampled blocks.
  const reportingPools = Object.values(activePoolStats);
  return {
    miners,
    reportedWorkers: reportingPools.length > 0 ? reportingPools.reduce((acc, p) => acc + p.workers, 0) : null,
    reportedWorkerSources: [...new Set(reportingPools.map((p) => p.source))],
    minersWithoutWorkerData: miners.filter((m) => m.minersCount === null).length,
    knownPoolsCount: miners.filter((m) => m.category === 'known').length,
    unknownMinersCount: miners.filter((m) => m.category === 'unknown').length,
    totalBlocksSampled: totalBlocks,
    networkHashrateGh: netHashrateGh !== null ? parseFloat(netHashrateGh.toFixed(1)) : null,
  };
}
