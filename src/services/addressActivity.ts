import { ethers } from 'ethers';
import { rpcService } from './rpc';
import { decodeStringOrBytes32 } from './abiText';

/**
 * Token transfers and internal transactions of an address, read from the chain itself (the
 * Bitnet RPC archive node), without the explorer index.
 *
 * Token transfers: every Transfer event that names the address, from eth_getLogs over the
 * whole chain (the node answers these from its log index in a few seconds).
 *
 * Internal transactions of a wallet (EOA): the node keeps no index of internal calls by
 * address, so the blocks where the wallet's balance or nonce changed are found by bisection
 * over archive state. A wallet's balance only goes down through its own transactions, and each
 * of those raises its nonce, so when balance and nonce are equal at both ends of a block range
 * nothing happened in between. Every change block is then explained from the block's
 * transactions and their call traces (debug_traceTransaction).
 *
 * Internal transactions of a contract: its balance can change without its nonce, so the
 * transactions are found through the events the contract emitted or that name it, then traced.
 */

const TRANSFER = ethers.id('Transfer(address,address,uint256)');
const hex = (n: number) => '0x' + n.toString(16);
const pad = (address: string) => '0x' + address.toLowerCase().replace(/^0x/, '').padStart(64, '0');

export type TokenStandard = 'BTS-20' | 'BTS-721';

export interface ChainTokenTransfer {
  txHash: string;
  logIndex: number;
  blockNumber: number;
  timestamp: number | null;
  token: string;
  standard: TokenStandard;
  from: string;
  to: string;
  /** Amount for BTS-20, token id for BTS-721. */
  value: bigint;
}

export interface TokenMeta {
  name: string;
  symbol: string;
  decimals: number | null;
}

interface RawLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A JSON-RPC batch, retried twice with a pause when the node drops any answer. The public RPC
 * throttles bursts, so every scan here keeps its parallel requests low and waits on failure.
 */
async function batchRetry(calls: { method: string; params: unknown[] }[], timeoutMs: number): Promise<any[]> {
  let res: any[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await rpcService.batch(calls as { method: string; params: any[] }[], timeoutMs).catch(() => calls.map(() => null));
    if (res.every((x) => x !== null && x !== undefined)) return res;
    await sleep(1500 * (attempt + 1));
  }
  return res;
}

async function rpc<T>(method: string, params: unknown[], timeoutMs = 30000): Promise<T> {
  const [result] = await batchRetry([{ method, params }], timeoutMs);
  if (result === null || result === undefined) throw new Error(`${method} failed`);
  return result as T;
}

/** eth_getLogs over [from, to]; a range the node refuses is split in two and retried. */
async function getLogs(filter: Record<string, unknown>, from: number, to: number, depth = 0): Promise<RawLog[]> {
  try {
    return await rpc<RawLog[]>('eth_getLogs', [{ ...filter, fromBlock: hex(from), toBlock: hex(to) }]);
  } catch (e) {
    if (depth >= 8 || to - from < 1000) throw e;
    const mid = Math.floor((from + to) / 2);
    const [a, b] = await Promise.all([getLogs(filter, from, mid, depth + 1), getLogs(filter, mid + 1, to, depth + 1)]);
    return [...a, ...b];
  }
}

async function timestamps(blocks: number[]): Promise<Map<number, number>> {
  const headers = await rpcService.getBlockHeadersByNumbers([...new Set(blocks)]).catch(() => []);
  return new Map(headers.map((b) => [b.number, b.timestamp] as [number, number]));
}

const metaCache = new Map<string, TokenMeta>();
const ERC20 = new ethers.Interface(['function name() view returns (string)', 'function symbol() view returns (string)', 'function decimals() view returns (uint8)']);

/** Name, symbol and decimals of token contracts, read with eth_call. */
export async function tokenMeta(tokens: string[]): Promise<Map<string, TokenMeta>> {
  const missing = [...new Set(tokens.map((t) => t.toLowerCase()))].filter((t) => !metaCache.has(t));
  for (let i = 0; i < missing.length; i += 30) {
    const chunk = missing.slice(i, i + 30);
    const calls = chunk.flatMap((t) => ['name', 'symbol', 'decimals'].map((fn) => ({ method: 'eth_call', params: [{ to: t, data: ERC20.encodeFunctionData(fn) }, 'latest'] })));
    const res = await rpcService.batch(calls, 15000).catch(() => calls.map(() => null));
    chunk.forEach((t, j) => {
      const [name, symbol, decimals] = res.slice(j * 3, j * 3 + 3);
      let dec: number | null = null;
      try { if (decimals && decimals !== '0x') dec = Number(BigInt(decimals)); } catch { /* not a number */ }
      metaCache.set(t, {
        name: (name && decodeStringOrBytes32(name)) || 'Unknown token',
        symbol: (symbol && decodeStringOrBytes32(symbol)) || '?',
        decimals: dec !== null && dec <= 36 ? dec : null,
      });
    });
  }
  return new Map(tokens.map((t) => [t.toLowerCase(), metaCache.get(t.toLowerCase())!]));
}

const transferCache = new Map<string, { at: number; job: Promise<ChainTokenTransfer[]> }>();

/** Every BTS-20 and BTS-721 Transfer event that names the address, newest first (kept for a minute). */
export function getAddressTokenTransfers(address: string): Promise<ChainTokenTransfer[]> {
  const key = address.toLowerCase();
  const hit = transferCache.get(key);
  if (hit && Date.now() - hit.at < 60_000) return hit.job;
  const job = readTokenTransfers(address);
  transferCache.set(key, { at: Date.now(), job });
  job.catch(() => transferCache.delete(key));
  return job;
}

async function readTokenTransfers(address: string): Promise<ChainTokenTransfer[]> {
  const head = await rpc<string>('eth_blockNumber', []).then((h) => parseInt(h, 16));
  const me = pad(address);
  const [sent, received] = await Promise.all([
    getLogs({ topics: [TRANSFER, me] }, 0, head),
    getLogs({ topics: [TRANSFER, null, me] }, 0, head),
  ]);
  const byKey = new Map<string, RawLog>();
  for (const log of [...sent, ...received]) byKey.set(`${log.transactionHash}:${log.logIndex}`, log);
  const logs = [...byKey.values()].filter((l) => l.topics.length === 3 || l.topics.length === 4);
  const times = await timestamps(logs.map((l) => parseInt(l.blockNumber, 16)));
  return logs
    .map((l) => {
      const blockNumber = parseInt(l.blockNumber, 16);
      const nft = l.topics.length === 4;
      let value = 0n;
      try { value = BigInt(nft ? l.topics[3] : l.data && l.data !== '0x' ? l.data.slice(0, 66) : '0x0'); } catch { /* malformed */ }
      return {
        txHash: l.transactionHash,
        logIndex: parseInt(l.logIndex, 16),
        blockNumber,
        timestamp: times.get(blockNumber) ?? null,
        token: ethers.getAddress(l.address),
        standard: (nft ? 'BTS-721' : 'BTS-20') as TokenStandard,
        from: ethers.getAddress('0x' + l.topics[1].slice(26)),
        to: ethers.getAddress('0x' + l.topics[2].slice(26)),
        value,
      };
    })
    .sort((a, b) => b.blockNumber - a.blockNumber || b.logIndex - a.logIndex);
}

export interface InternalTx {
  txHash: string;
  blockNumber: number;
  timestamp: number | null;
  type: string;
  from: string;
  to: string;
  value: bigint;
  /** The call reverted, so no value moved. */
  failed: boolean;
}

interface CallFrame {
  type: string;
  from: string;
  to?: string;
  value?: string;
  error?: string;
  calls?: CallFrame[];
}

/** Calls inside a transaction's trace (depth 1 and below) that move BTN to or from the address. */
function framesFor(frame: CallFrame, address: string, depth = 0, out: CallFrame[] = []): CallFrame[] {
  const a = address.toLowerCase();
  if (depth > 0) {
    let value = 0n;
    try { value = frame.value ? BigInt(frame.value) : 0n; } catch { /* malformed */ }
    const involved = frame.from?.toLowerCase() === a || frame.to?.toLowerCase() === a;
    if (involved && (value > 0n || frame.type.startsWith('CREATE'))) out.push(frame);
  }
  for (const c of frame.calls ?? []) framesFor(c, address, depth + 1, out);
  return out;
}

async function traceTransactions(hashes: string[], address: string, onProgress?: (done: number, total: number) => void): Promise<InternalTx[]> {
  const out: InternalTx[] = [];
  const chunks: string[][] = [];
  for (let i = 0; i < hashes.length; i += 4) chunks.push(hashes.slice(i, i + 4));
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < chunks.length) {
      const chunk = chunks[next++];
      const traces = await batchRetry(chunk.map((h) => ({ method: 'debug_traceTransaction', params: [h, { tracer: 'callTracer' }] })), 30000);
      const txs = await batchRetry(chunk.map((h) => ({ method: 'eth_getTransactionByHash', params: [h] })), 15000);
      if (traces.some((t) => !t)) throw new Error('The node did not return a call trace');
      chunk.forEach((h, j) => {
        const block = txs[j]?.blockNumber ? parseInt(txs[j].blockNumber, 16) : 0;
        const trace = traces[j] as CallFrame | null;
        if (!trace) return;
        for (const f of framesFor(trace, address)) {
          let value = 0n;
          try { value = f.value ? BigInt(f.value) : 0n; } catch { /* malformed */ }
          out.push({
            txHash: h, blockNumber: block, timestamp: null, type: f.type,
            from: ethers.getAddress(f.from), to: f.to ? ethers.getAddress(f.to) : '', value, failed: Boolean(f.error),
          });
        }
      });
      done += chunk.length;
      onProgress?.(done, hashes.length);
    }
  };
  await Promise.all([worker(), worker()]);
  const times = await timestamps(out.map((t) => t.blockNumber));
  for (const t of out) t.timestamp = times.get(t.blockNumber) ?? null;
  return out.sort((a, b) => b.blockNumber - a.blockNumber);
}

interface State { balance: bigint; nonce: number }
const same = (a: State, b: State) => a.balance === b.balance && a.nonce === b.nonce;

async function statesAt(address: string, blocks: number[]): Promise<Map<number, State>> {
  const out = new Map<number, State>();
  const chunks: number[][] = [];
  for (let i = 0; i < blocks.length; i += 50) chunks.push(blocks.slice(i, i + 50));
  let next = 0;
  const worker = async () => {
    while (next < chunks.length) {
      const chunk = chunks[next++];
      const res = await batchRetry(chunk.flatMap((b) => [
        { method: 'eth_getBalance', params: [address, hex(b)] },
        { method: 'eth_getTransactionCount', params: [address, hex(b)] },
      ]), 20000);
      chunk.forEach((b, j) => {
        const bal = res[j * 2];
        const nonce = res[j * 2 + 1];
        if (bal === null || nonce === null) throw new Error('The archive node did not return the state of a past block');
        out.set(b, { balance: BigInt(bal), nonce: parseInt(nonce, 16) });
      });
    }
  };
  await Promise.all([worker(), worker()]);
  return out;
}

export interface InternalScan {
  items: InternalTx[];
  /** False when the history was too long to scan completely and only recent changes were checked. */
  complete: boolean;
  method: 'state' | 'events';
  checkedTransactions: number;
}

/**
 * Internal transactions of a wallet (EOA) from archive state bisection and call traces.
 * At most `limit` ranges are followed at a time; beyond that only the most recent are kept.
 */
async function walletInternal(address: string, head: number, onProgress: (p: number, label: string) => void, limit = 400): Promise<InternalScan> {
  const ends = await statesAt(address, [0, head]);
  type Range = { lo: number; hi: number; a: State; b: State };
  let ranges: Range[] = same(ends.get(0)!, ends.get(head)!) ? [] : [{ lo: 0, hi: head, a: ends.get(0)!, b: ends.get(head)! }];
  const changes = new Set<number>();
  let complete = true;
  const depth = Math.log2(Math.max(2, head));
  while (ranges.length > 0) {
    const split: Range[] = [];
    for (const r of ranges) (r.hi - r.lo === 1 ? changes.add(r.hi) : split.push(r));
    if (split.length > limit) {
      split.sort((x, y) => y.hi - x.hi);
      split.length = limit;
      complete = false;
    }
    // Each round splits every open range into up to 4 parts: about 12 rounds over the whole chain
    // instead of 23 halvings, with at most ~200 state reads per round to stay gentle on the RPC.
    const parts = Math.max(2, Math.min(4, Math.floor(200 / Math.max(1, split.length)) + 1));
    const points = split.map((r) => {
      const n = Math.min(parts, r.hi - r.lo);
      const pts = new Set<number>();
      for (let k = 1; k < n; k++) pts.add(r.lo + Math.floor(((r.hi - r.lo) * k) / n));
      return [...pts].filter((p) => p > r.lo && p < r.hi).sort((x, y) => x - y);
    });
    const states = await statesAt(address, points.flat());
    ranges = [];
    split.forEach((r, i) => {
      const at = [r.lo, ...points[i], r.hi];
      const st = [r.a, ...points[i].map((p) => states.get(p)!), r.b];
      for (let k = 0; k < at.length - 1; k++) {
        if (!same(st[k], st[k + 1])) ranges.push({ lo: at[k], hi: at[k + 1], a: st[k], b: st[k + 1] });
      }
    });
    const widest = ranges.reduce((m, r) => Math.max(m, r.hi - r.lo), 1);
    onProgress(0.7 * (1 - Math.log2(widest) / depth), `Scanning balance history: ${changes.size} change ${changes.size === 1 ? 'block' : 'blocks'} found`);
  }

  // Explain each change block: trace the transactions that ran contract code.
  const blocks = [...changes].sort((x, y) => y - x);
  const candidates: string[] = [];
  onProgress(0.7, `Reading ${blocks.length} change ${blocks.length === 1 ? 'block' : 'blocks'}`);
  const chunks: number[][] = [];
  for (let i = 0; i < blocks.length; i += 20) chunks.push(blocks.slice(i, i + 20));
  const results: any[] = [];
  for (const chunk of chunks) results.push(...await batchRetry(chunk.map((b) => ({ method: 'eth_getBlockByNumber', params: [hex(b), true] })), 20000));
  if (results.some((b) => !b)) throw new Error('The node did not return a block');
  for (const block of results) {
    for (const tx of block?.transactions ?? []) {
      if (tx.input && tx.input !== '0x') candidates.push(tx.hash);
    }
  }
  const items = await traceTransactions(candidates, address, (d, t) => onProgress(0.8 + 0.2 * (d / Math.max(1, t)), `Tracing ${t} contract ${t === 1 ? 'call' : 'calls'}`));
  return { items, complete, method: 'state', checkedTransactions: candidates.length };
}

/**
 * Internal transactions of a contract: the newest `want` transactions with events emitted by it
 * or naming it, read in growing windows going back from the head, then traced.
 */
async function contractInternal(address: string, head: number, onProgress: (p: number, label: string) => void, want = 40): Promise<InternalScan> {
  const me = pad(address);
  const hashes = new Map<string, number>();
  // Windows grow fourfold going back from the head (100k, 400k, 1.6M … blocks): a busy contract
  // fills its quota in the first small windows, a quiet one is read whole in a few rounds.
  let size = 100_000;
  let to = head;
  while (to >= 0 && hashes.size < want) {
    const from = Math.max(0, to - size + 1);
    const lists = await Promise.all([
      getLogs({ address }, from, to),
      getLogs({ topics: [null, me] }, from, to),
      getLogs({ topics: [null, null, me] }, from, to),
      getLogs({ topics: [null, null, null, me] }, from, to),
    ]);
    for (const l of lists.flat()) hashes.set(l.transactionHash, parseInt(l.blockNumber, 16));
    onProgress(0.4 * (1 - from / Math.max(1, head)), `Reading events back to block #${from.toLocaleString('en-US')}`);
    to = from - 1;
    size *= 4;
  }
  const newest = [...hashes].sort((a, b) => b[1] - a[1]).slice(0, want).map(([h]) => h);
  const items = await traceTransactions(newest, address, (d, t) => onProgress(0.4 + 0.6 * (d / Math.max(1, t)), `Tracing ${t} transactions`));
  return { items, complete: hashes.size <= want && to < 0, method: 'events', checkedTransactions: newest.length };
}

// Results are kept for the session, and a scan already running is shared, so switching tabs
// does not start the work again.
const internalCache = new Map<string, Promise<InternalScan>>();
const progressListeners = new Map<string, Set<(p: number, label: string) => void>>();

export function getAddressInternalTransactions(address: string, onProgress: (p: number, label: string) => void): Promise<InternalScan> {
  const key = address.toLowerCase();
  const listeners = progressListeners.get(key) ?? new Set();
  listeners.add(onProgress);
  progressListeners.set(key, listeners);
  let job = internalCache.get(key);
  if (!job) {
    const report = (p: number, label: string) => progressListeners.get(key)?.forEach((fn) => fn(p, label));
    job = (async () => {
      const head = await rpc<string>('eth_blockNumber', []).then((h) => parseInt(h, 16));
      const code = await rpc<string>('eth_getCode', [address, 'latest']);
      return code && code !== '0x' ? contractInternal(address, head, report) : walletInternal(address, head, report);
    })();
    internalCache.set(key, job);
    job.catch(() => internalCache.delete(key)).finally(() => progressListeners.delete(key));
  }
  return job;
}
