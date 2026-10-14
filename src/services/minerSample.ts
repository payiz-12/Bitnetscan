import { rpcService } from './rpc';
import type { Block } from '../types/blockchain';

export const MINER_SAMPLE_SIZE = 200;

let cache: { at: number; blocks: Block[] } | null = null;
let job: Promise<Block[]> | null = null;

/** The latest MINER_SAMPLE_SIZE block headers (newest first), fetched with batched RPC calls. */
export function loadMinerSample(maxAgeMs = 60000): Promise<Block[]> {
  if (cache && Date.now() - cache.at < maxAgeMs) return Promise.resolve(cache.blocks);
  if (job) return job;
  job = (async () => {
    const head = await rpcService.getBlockNumber();
    const from = Math.max(0, head - MINER_SAMPLE_SIZE + 1);
    const blocks = (await rpcService.getBlockHeaders(from, head - from + 1)).reverse();
    if (blocks.length === 0) throw new Error('No blocks');
    cache = { at: Date.now(), blocks };
    return blocks;
  })().finally(() => { job = null; });
  return job;
}

export function getCachedMinerSample(): Block[] {
  return cache?.blocks || [];
}
