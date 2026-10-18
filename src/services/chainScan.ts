import { rpcService } from './rpc';
import type { Block } from '../types/blockchain';

/** Number of most recent blocks read for uncle statistics and the current issuance rate. */
export const RECENT_SCAN_BLOCKS = 2000;

const WEI_PER_BTN = 10n ** 18n;

export interface UncleInfo {
  hash: string;
  /** Height of the uncle itself. */
  number: number;
  miner: string;
  timestamp: number;
  /** Canonical block that included the uncle. */
  includedIn: number;
  includedBy: string;
  /** includedIn − number (1–6). */
  depth: number;
  /** (8 − depth) / 8 BTN, paid to the uncle miner. */
  rewardWei: bigint;
}

export interface RecentScan {
  from: number;
  to: number;
  startTimestamp: number;
  endTimestamp: number;
  /** Canonical headers, newest first. */
  blocks: Block[];
  /** Uncles included in [from, to], newest first. */
  uncles: UncleInfo[];
  /** BTN created in [from, to]: block subsidies, uncle inclusion rewards and uncle rewards (fees only move coins). */
  issuedWei: bigint;
  /** Uncle rewards alone (part of issuedWei). */
  uncleRewardsWei: bigint;
  updatedAt: number;
}

let cache: RecentScan | null = null;
let job: Promise<RecentScan> | null = null;

/**
 * Reads the last RECENT_SCAN_BLOCKS headers and every uncle they include, over JSON-RPC.
 * Rewards follow Bitnet's Ethash rules (checked against miner balance changes): 1 BTN per
 * block, +1/32 BTN per included uncle to the block miner, (8 − depth)/8 BTN to the uncle miner.
 */
export function loadRecentScan(maxAgeMs = 120000): Promise<RecentScan> {
  if (cache && Date.now() - cache.updatedAt < maxAgeMs) return Promise.resolve(cache);
  if (job) return job;
  job = (async () => {
    const head = await rpcService.getBlockNumber();
    const from = Math.max(1, head - RECENT_SCAN_BLOCKS + 1);
    const headers = await rpcService.getBlockHeadersByNumbers(Array.from({ length: head - from + 1 }, (_, i) => from + i), { cache: false });
    if (headers.length === 0) throw new Error('No blocks');

    const refs = headers.flatMap((b) => b.uncles.map((_, i) => ({ block: b, index: i })));
    const calls = refs.map((r) => ({ method: 'eth_getUncleByBlockNumberAndIndex', params: ['0x' + r.block.number.toString(16), '0x' + r.index.toString(16)] }));
    const chunks: (typeof calls)[] = [];
    for (let i = 0; i < calls.length; i += 200) chunks.push(calls.slice(i, i + 200));
    const raw = (await Promise.all(chunks.map((c) => rpcService.batch(c, 15000)))).flat();
    const uncles: UncleInfo[] = [];
    raw.forEach((u, i) => {
      if (!u?.number) return;
      const nephew = refs[i].block;
      const number = parseInt(u.number, 16);
      const depth = nephew.number - number;
      uncles.push({
        hash: u.hash,
        number,
        miner: String(u.miner || '').toLowerCase(),
        timestamp: parseInt(u.timestamp, 16),
        includedIn: nephew.number,
        includedBy: nephew.miner.toLowerCase(),
        depth,
        rewardWei: depth >= 1 && depth <= 7 ? ((8n - BigInt(depth)) * WEI_PER_BTN) / 8n : 0n,
      });
    });
    if (uncles.length < refs.length) throw new Error('Uncle headers unavailable');

    const subsidyWei = BigInt(headers.length) * WEI_PER_BTN + (BigInt(refs.length) * WEI_PER_BTN) / 32n;
    const uncleRewardsWei = uncles.reduce((sum, u) => sum + u.rewardWei, 0n);
    const sorted = [...headers].sort((a, b) => b.number - a.number);
    const result: RecentScan = {
      from: sorted[sorted.length - 1].number,
      to: sorted[0].number,
      startTimestamp: sorted[sorted.length - 1].timestamp,
      endTimestamp: sorted[0].timestamp,
      blocks: sorted,
      uncles: uncles.sort((a, b) => b.includedIn - a.includedIn || b.number - a.number),
      issuedWei: subsidyWei + uncleRewardsWei,
      uncleRewardsWei,
      updatedAt: Date.now(),
    };
    cache = result;
    return result;
  })().finally(() => { job = null; });
  return job;
}

export function getCachedRecentScan(): RecentScan | null {
  return cache;
}

/** Average BTN created per canonical block in the scan window. */
export function issuancePerBlock(scan: RecentScan): number {
  const blocks = scan.to - scan.from + 1;
  return blocks > 0 ? Number((scan.issuedWei * 1000000n) / BigInt(blocks) / WEI_PER_BTN) / 1e6 : 0;
}

/** Average block time in seconds over the scan window. */
export function scanBlockTime(scan: RecentScan): number | null {
  const span = scan.endTimestamp - scan.startTimestamp;
  const intervals = scan.to - scan.from;
  return span > 0 && intervals > 0 ? span / intervals : null;
}

export const weiToBtn = (wei: bigint) => Number(wei / 10n ** 12n) / 1e6;
