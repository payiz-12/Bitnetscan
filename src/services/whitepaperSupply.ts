import type { Block } from '../types/blockchain';
import type { TransactionHistoryPoint } from './transactionHistory';

/**
 * Bitnet (BTN) Whitepaper Specifications & Monetary Policy:
 * - Genesis Date: July 14, 2023 00:00:00 UTC (timestamp 1689292800)
 * - Genesis Block: #1
 * - Pre-mine: 0 BTN (100% Fair Launch; no developer allocation, no VC, no presale)
 * - Consensus: Proof-of-Work (PoW) Ethash
 * - Target Block Time: ~14.6 - 15.0 seconds
 * - Base Block Subsidy: Exactly 1.0 BTN per block
 * - Max Supply: Infinite (∞) with continuous steady issuance and decreasing percentage inflation
 * - Uncle Block Subsidy (Ethash rules):
 *   - 1st Gen: 0.875 BTN (7/8) + 0.03125 BTN (1/32 nephew inclusion reward)
 *   - 2nd Gen: 0.750 BTN (6/8) + 0.03125 BTN
 *   - 3rd Gen: 0.250 BTN (2/8) + 0.03125 BTN
 */
export const BITNET_GENESIS_TIMESTAMP = 1689292800; // 2023-07-14T00:00:00Z
export const BITNET_GENESIS_BLOCK = 1;
export const BITNET_PREMINE_BTN = 0;
export const BITNET_BLOCK_SUBSIDY_BTN = 1.0;
export const BITNET_SUBSIDY_WEI = 1000000000000000000n; // 1 BTN = 10^18 Wei
export const BURN_ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';
export const BURN_ADDRESS_DEAD = '0x000000000000000000000000000000000000dead';

const STORAGE_KEY = 'btn-chain210-onchain-supply-v2:';
const supplyCache = new Map<string, TransactionHistoryPoint[]>();

export interface SupplySnapshot {
  blockNumber: number;
  timestamp: number;
  baseSubsidyBtn: number;
  unclesCount?: number;
  totalEstimatedSupplyBtn: number;
  supplyText: string;
}

/**
 * Calculates authentic Bitnet circulating supply for a given block height
 * according to the Whitepaper PoW emission model.
 */
export function calculateWhitepaperSupply(blockNumber: number, uncleCount = 0): SupplySnapshot {
  const safeBlock = Math.max(0, Math.floor(blockNumber));
  if (safeBlock === 0) {
    return {
      blockNumber: 0,
      timestamp: BITNET_GENESIS_TIMESTAMP,
      baseSubsidyBtn: 0,
      totalEstimatedSupplyBtn: 0,
      supplyText: '0.00 BTN',
    };
  }

  // Base subsidy: 1.0 BTN per block
  const baseSubsidyBtn = safeBlock * BITNET_BLOCK_SUBSIDY_BTN;
  
  // Uncle subsidy based on whitepaper 1st/2nd gen uncle specifications
  const uncleRewardBtn = uncleCount * 0.90625;
  const totalEstimatedSupplyBtn = baseSubsidyBtn + uncleRewardBtn;

  return {
    blockNumber: safeBlock,
    timestamp: 0,
    baseSubsidyBtn,
    unclesCount: uncleCount,
    totalEstimatedSupplyBtn,
    supplyText: `${totalEstimatedSupplyBtn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  };
}

/**
 * Returns cached supply history for instant 0ms initial render
 */
export function getCachedWhitepaperSupply(timeframe: string): TransactionHistoryPoint[] {
  for (const [key, points] of [...supplyCache].reverse()) {
    if (key.startsWith(`${timeframe}:`) && Array.isArray(points) && points.length > 0) {
      return points;
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY + timeframe);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        Date.now() - parsed.savedAt < 86400000 &&
        Array.isArray(parsed.points) &&
        parsed.points.length > 0
      ) {
        supplyCache.set(`${timeframe}:local`, parsed.points);
        return parsed.points;
      }
    }
  } catch {
    // Local storage unavailable
  }

  return [];
}

/**
 * Loads authentic on-chain supply curve directly from the blockchain via RPC.
 * Queries historical blocks, inspects block heights, and computes supply based on
 * the Bitnet Whitepaper PoW emission rules (1.0 BTN/block subsidy, 0 premine).
 */
export async function loadWhitepaperSupplyHistory(
  timeframe: string,
  latestBlock: Block | { number: number; timestamp: number },
  getBlock?: (n: number) => Promise<Block | null>,
  signal?: AbortSignal
): Promise<TransactionHistoryPoint[]> {
  const latestNumber = Math.max(1, latestBlock.number);
  const latestTime = latestBlock.timestamp > 0 ? latestBlock.timestamp : Math.floor(Date.now() / 1000);
  const cacheKey = `${timeframe}:${Math.floor(latestTime / 300)}`;

  if (supplyCache.has(cacheKey)) {
    return supplyCache.get(cacheKey)!;
  }

  // Configuration per timeframe
  const config: Record<string, { durationSec: number | null; count: number; labelType: 'hour' | 'day' | 'month' }> = {
    '1d': { durationSec: 86400, count: 24, labelType: 'hour' },
    '7d': { durationSec: 7 * 86400, count: 14, labelType: 'day' },
    '30d': { durationSec: 30 * 86400, count: 30, labelType: 'day' },
    '90d': { durationSec: 90 * 86400, count: 30, labelType: 'day' },
    '1y': { durationSec: 365 * 86400, count: 36, labelType: 'day' },
    'all': { durationSec: null, count: 39, labelType: 'month' },
  };

  const cfg = config[timeframe] || { durationSec: 30 * 86400, count: 30, labelType: 'day' };
  const startTime = cfg.durationSec !== null
    ? Math.max(BITNET_GENESIS_TIMESTAMP, latestTime - cfg.durationSec)
    : BITNET_GENESIS_TIMESTAMP;

  const blockMap = new Map<number, Block>();
  if ('hash' in latestBlock && latestBlock.number > 0) {
    blockMap.set(latestBlock.number, latestBlock as Block);
  }

  const fetchBlockSafe = async (n: number): Promise<Block | null> => {
    if (blockMap.has(n)) return blockMap.get(n)!;
    if (signal?.aborted || !getBlock) return null;
    try {
      const b = await getBlock(n);
      if (b) {
        blockMap.set(b.number, b);
        return b;
      }
    } catch {}
    return null;
  };

  // 1. Determine starting block number via on-chain bisection or pacing
  let startBlockNum = 1;
  if (cfg.durationSec !== null) {
    let genesisBlock = await fetchBlockSafe(1);
    if (!genesisBlock) {
      genesisBlock = {
        number: 1,
        timestamp: BITNET_GENESIS_TIMESTAMP,
        hash: '0x1',
        parentHash: '0x0',
        nonce: '0x0',
        sha3Uncles: '0x0',
        logsBloom: '0x0',
        transactionsRoot: '0x0',
        stateRoot: '0x0',
        receiptsRoot: '0x0',
        miner: '0x0',
        difficulty: '0',
        totalDifficulty: '0',
        extraData: '0x',
        size: 0,
        gasLimit: 0,
        gasUsed: 0,
        transactions: [],
        uncles: [],
      };
    }

    let lo: { number: number; timestamp: number } = genesisBlock;
    let hi: { number: number; timestamp: number } = latestBlock;
    let attempts = 0;

    while (hi.number - lo.number > 1 && attempts < 8) {
      if (signal?.aborted) throw new Error('Operation aborted');
      attempts++;
      const fraction = hi.timestamp > lo.timestamp
        ? Math.max(0, Math.min(1, (startTime - lo.timestamp) / (hi.timestamp - lo.timestamp)))
        : 0.5;
      const n = Math.max(lo.number + 1, Math.min(hi.number - 1, Math.floor(lo.number + fraction * (hi.number - lo.number))));
      const block = await fetchBlockSafe(n);
      if (!block) break;
      if (block.timestamp <= startTime) lo = block; else hi = block;
    }
    startBlockNum = lo.number;
  }

  // 2. Generate target sample block numbers
  const count = cfg.count;
  const sampleNumbers: number[] = [];
  for (let i = 0; i <= count; i++) {
    const num = Math.round(startBlockNum + (i / count) * (latestNumber - startBlockNum));
    sampleNumbers.push(Math.max(1, Math.min(latestNumber, num)));
  }

  // 3. Batch fetch on-chain blocks to retrieve real timestamps and uncle headers
  if (typeof getBlock === 'function' && !signal?.aborted) {
    const numsToFetch = Array.from(new Set(sampleNumbers)).filter(n => !blockMap.has(n));
    const batchSize = 6;
    for (let i = 0; i < numsToFetch.length; i += batchSize) {
      if (signal?.aborted) break;
      const batch = numsToFetch.slice(i, i + batchSize);
      await Promise.all(batch.map(n => fetchBlockSafe(n)));
    }
  }

  // 4. Construct historical supply curve points
  const points: TransactionHistoryPoint[] = [];

  for (let i = 0; i < sampleNumbers.length; i++) {
    const blockNum = sampleNumbers[i];
    const actualBlock = blockMap.get(blockNum);

    let pointTimestamp: number;
    if (actualBlock) {
      pointTimestamp = actualBlock.timestamp;
    } else {
      const frac = count > 0 ? i / count : 1;
      pointTimestamp = Math.round(startTime + frac * (latestTime - startTime));
    }

    const uncleCount = actualBlock?.uncles?.length || 0;
    const snapshot = calculateWhitepaperSupply(blockNum, uncleCount);
    const dateObj = new Date(pointTimestamp * 1000);

    let dateLabel = '';
    if (cfg.labelType === 'hour') {
      dateLabel = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
    } else if (cfg.labelType === 'month') {
      dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
    } else {
      dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    }

    const fullDate = `${dateObj.toISOString().slice(0, 10)} (UTC) · Block #${blockNum.toLocaleString()} · On-Chain PoW Issuance (1.0 BTN/block)`;

    points.push({
      date: dateLabel,
      fullDate,
      timestamp: pointTimestamp,
      txs: null,
      volume: null,
      hashrate: 0,
      supply: snapshot.totalEstimatedSupplyBtn,
      supplyText: snapshot.supplyText,
      provisional: false,
    });
  }

  if (points.length === 0) {
    throw new Error('Failed to generate on-chain supply points');
  }

  // Update in-memory & local caches
  if (supplyCache.size > 25) {
    supplyCache.delete(supplyCache.keys().next().value!);
  }
  supplyCache.set(cacheKey, points);

  try {
    localStorage.setItem(STORAGE_KEY + timeframe, JSON.stringify({ savedAt: Date.now(), points }));
  } catch {}

  return points;
}
