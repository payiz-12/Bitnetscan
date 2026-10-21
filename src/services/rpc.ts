import { ethers } from 'ethers';
import { calculateHashrate, formatHashrate } from './hashrate';
import { isPageHidden } from './pageVisibility';
import { Block, NetworkStats, Transaction, RpcEndpointStatus } from '../types/blockchain';

export const BITNET_CHAIN_ID = 210;
export const BITNET_CURRENCY_SYMBOL = 'BTN';

export const DEFAULT_RPC_ENDPOINTS = [
  // Browser proxy routes to avoid CORS
  '/api/rpc',
  '/api/rpc2',
  'https://rpc.bitnetmoney.org/',
  'https://rpc.bitnetmoney.com/',
];

class BitnetRpcService {
  private endpoints: string[] = DEFAULT_RPC_ENDPOINTS;
  private blockCache = new Map<number | string, Block>();
  private txCache = new Map<string, Transaction>();
  private activeRpc = this.endpoints[0];
  private inFlightRequests = new Map<string, Promise<any>>();
  private latencyMap = new Map<string, number>();
  private healthListeners = new Set<(status: { activeRpc: string; latencyMs: number | null }) => void>();
  // Direct node URLs usually lack CORS headers in browsers; stop pinging them after a failure.
  private unreachableDirect = new Set<string>();

  constructor() {
    this.activeRpc = this.endpoints[0];
    // Measure latency across all endpoints immediately and re-check periodically
    this.measureLatencies().catch(() => {});
    if (typeof window !== 'undefined') {
      setInterval(() => {
        if (!isPageHidden()) this.measureLatencies().catch(() => {});
      }, 30000);
    }
  }

  public async measureLatencies(): Promise<void> {
    await Promise.all(
      this.endpoints.filter((url) => !this.unreachableDirect.has(url)).map(async (url) => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 2000);
          const start = performance.now();
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (resp.ok) {
            const data = await resp.json();
            if (data && data.result) {
              const ms = Math.max(6, Math.round(performance.now() - start));
              this.latencyMap.set(url, ms);
            }
          } else {
            this.latencyMap.set(url, 9999);
          }
        } catch {
          this.latencyMap.set(url, 9999);
          if (/^https?:/i.test(url)) this.unreachableDirect.add(url);
        }
      })
    );

    // Auto-select lowest-latency healthy endpoint
    const sorted = [...this.endpoints].sort(
      (a, b) => (this.latencyMap.get(a) ?? 9999) - (this.latencyMap.get(b) ?? 9999)
    );
    if (sorted.length > 0 && (this.latencyMap.get(sorted[0]) ?? 9999) < 9999) {
      if (this.activeRpc !== sorted[0]) {
        this.activeRpc = sorted[0];
        this.notifyHealthListeners();
      }
    }
  }

  public getActiveRpc(): string {
    return this.activeRpc;
  }

  /** Last measured round trip in ms, or null before the first successful request. */
  public getLatency(endpoint?: string): number | null {
    const target = endpoint || this.activeRpc;
    const ms = this.latencyMap.get(target);
    return ms !== undefined && ms < 9999 ? ms : null;
  }

  public setActiveRpc(url: string) {
    this.activeRpc = url;
    this.notifyHealthListeners();
  }

  public subscribeHealth(cb: (status: { activeRpc: string; latencyMs: number | null }) => void): () => void {
    this.healthListeners.add(cb);
    cb({ activeRpc: this.activeRpc, latencyMs: this.getLatency() });
    return () => {
      this.healthListeners.delete(cb);
    };
  }

  private notifyHealthListeners() {
    const status = { activeRpc: this.activeRpc, latencyMs: this.getLatency() };
    this.healthListeners.forEach((cb) => {
      try {
        cb(status);
      } catch {}
    });
  }

  /**
   * Sends several JSON-RPC calls in one HTTP request (JSON-RPC batch). Results keep the
   * order of `calls`; a failed call yields null. Falls back to individual requests when
   * no endpoint accepts batches.
   */
  public async batch(calls: { method: string; params: any[] }[], timeoutMs = 8000): Promise<any[]> {
    if (calls.length === 0) return [];
    const urlsToTry = [...this.endpoints]
      .filter((url) => !this.unreachableDirect.has(url))
      .sort((a, b) => (this.latencyMap.get(a) ?? 9999) - (this.latencyMap.get(b) ?? 9999));
    const body = JSON.stringify(calls.map((c, id) => ({ jsonrpc: '2.0', id, method: c.method, params: c.params })));

    for (const url of urlsToTry) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal,
        });
        if (!res.ok) continue;
        const data = await res.json();
        if (!Array.isArray(data)) continue;
        const byId = new Map<number, any>(data.map((item: any) => [item.id, item]));
        return calls.map((_, id) => {
          const item = byId.get(id);
          return item && !item.error && item.result !== undefined ? item.result : null;
        });
      } catch {
        // try the next endpoint
      } finally {
        clearTimeout(timer);
      }
    }

    return Promise.all(calls.map((c) => this.rawRequest(c.method, c.params).catch(() => null)));
  }

  /** Block headers (without transactions) for [from, from + count), oldest first. */
  public async getBlockHeaders(from: number, count: number): Promise<Block[]> {
    const numbers = Array.from({ length: count }, (_, i) => from + i).filter((n) => n >= 0);
    const missing = numbers.filter((n) => !this.blockCache.has(n));
    for (let i = 0; i < missing.length; i += 50) {
      const chunk = missing.slice(i, i + 50);
      const results = await this.batch(chunk.map((n) => ({ method: 'eth_getBlockByNumber', params: ['0x' + n.toString(16), false] })));
      results.forEach((raw) => {
        if (!raw) return;
        const block = this.parseRawBlock(raw);
        this.blockCache.set(block.number, block);
        this.blockCache.set(block.hash.toLowerCase(), block);
      });
    }
    return numbers.map((n) => this.blockCache.get(n)).filter((b): b is Block => !!b);
  }

  /**
   * Block headers for arbitrary heights, in the order given (unknown heights are skipped).
   * Missing headers are fetched in JSON-RPC batches of 100, four batches at a time.
   * With `cache: false` (long historical samples) the fetched headers are not kept in memory.
   */
  public async getBlockHeadersByNumbers(numbers: number[], { cache = true }: { cache?: boolean } = {}): Promise<Block[]> {
    const wanted = numbers.filter((n) => Number.isInteger(n) && n >= 0);
    const fetched = new Map<number, Block>();
    const missing = [...new Set(wanted.filter((n) => !this.blockCache.has(n)))];
    const chunks: number[][] = [];
    for (let i = 0; i < missing.length; i += 100) chunks.push(missing.slice(i, i + 100));
    const worker = async () => {
      for (let chunk = chunks.shift(); chunk; chunk = chunks.shift()) {
        const results = await this.batch(chunk.map((n) => ({ method: 'eth_getBlockByNumber', params: ['0x' + n.toString(16), false] })), 15000);
        results.forEach((raw) => {
          if (!raw) return;
          const block = this.parseRawBlock(raw);
          fetched.set(block.number, block);
          if (!cache) return;
          // Headers carry no transaction objects; never let one replace a cached full block.
          if (!this.blockCache.has(block.number)) this.blockCache.set(block.number, block);
          if (!this.blockCache.has(block.hash.toLowerCase())) this.blockCache.set(block.hash.toLowerCase(), block);
        });
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, chunks.length) }, worker));
    return wanted.map((n) => this.blockCache.get(n) ?? fetched.get(n)).filter((b): b is Block => !!b);
  }

  private async rawRequest(method: string, params: any[] = [], timeoutMs = 2500): Promise<any> {
    // In-flight request deduplication for identical concurrent queries
    const dedupKey = `${method}:${JSON.stringify(params)}:${timeoutMs}`;
    if (this.inFlightRequests.has(dedupKey)) {
      return this.inFlightRequests.get(dedupKey)!;
    }

    const requestPromise = (async () => {
      // Prioritize endpoints strictly by real measured latency
      const urlsToTry = [...this.endpoints].sort(
        (a, b) => (this.latencyMap.get(a) ?? 9999) - (this.latencyMap.get(b) ?? 9999)
      );

      let lastError: any = null;
      for (const url of urlsToTry) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
          const startTime = performance.now();

          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: Math.floor(Math.random() * 100000),
              method,
              params,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();
          if (data.error) {
            throw new Error(data.error.message || 'RPC Error');
          }

          const latencyMs = Math.round(performance.now() - startTime);
          this.latencyMap.set(url, Math.max(6, latencyMs));
          this.activeRpc = url;
          this.notifyHealthListeners();

          return data.result;
        } catch (err) {
          this.latencyMap.set(url, 9999);
          lastError = err;
          continue;
        }
      }

      throw lastError || new Error('All Bitnet RPC endpoints failed');
    })();

    this.inFlightRequests.set(dedupKey, requestPromise);
    try {
      return await requestPromise;
    } finally {
      this.inFlightRequests.delete(dedupKey);
    }
  }

  public async getBlockNumber(): Promise<number> {
    // Race top 2 lowest-latency endpoints for sub-20ms block height detection
    const sorted = [...this.endpoints].sort(
      (a, b) => (this.latencyMap.get(a) ?? 9999) - (this.latencyMap.get(b) ?? 9999)
    );
    const primary = sorted[0];
    const secondary = sorted[1];

    if (primary && secondary && (this.latencyMap.get(primary) ?? 9999) < 2000 && (this.latencyMap.get(secondary) ?? 9999) < 2000) {
      try {
        const fetchBlockNum = async (url: string) => {
          const ctrl = new AbortController();
          const tid = setTimeout(() => ctrl.abort(), 1800);
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
            signal: ctrl.signal,
          });
          clearTimeout(tid);
          if (!res.ok) throw new Error('HTTP error');
          const d = await res.json();
          if (!d?.result) throw new Error('No result');
          return d.result;
        };

        const hex = await Promise.race([fetchBlockNum(primary), fetchBlockNum(secondary)]);
        return parseInt(hex, 16);
      } catch {
        // Fall back to robust sequential failover
      }
    }

    const hex = await this.rawRequest('eth_blockNumber');
    return parseInt(hex, 16);
  }

  public async getGasPrice(): Promise<bigint | null> {
    try {
      const hex = await this.rawRequest('eth_gasPrice');
      if (!hex || hex === '0x') return 0n;
      return BigInt(hex);
    } catch {
      return null;
    }
  }

  public async getPeerCount(): Promise<number | null> {
    try {
      const hex = await this.rawRequest('net_peerCount');
      if (!hex || hex === '0x') return 0;
      return parseInt(hex, 16);
    } catch {
      return null;
    }
  }

  public async getBalance(address: string): Promise<string> {
    const clean = (address || '').trim().toLowerCase();
    const hex = await this.rawRequest('eth_getBalance', [clean, 'latest']);
    return ethers.formatEther(hex || '0x0');
  }

  public async getTransactionCount(address: string): Promise<number> {
    const clean = (address || '').trim().toLowerCase();
    const hex = await this.rawRequest('eth_getTransactionCount', [clean, 'latest']);
    return parseInt(hex || '0x0', 16);
  }

  public async getCode(address: string, timeoutMs = 2500): Promise<string> {
    const clean = (address || '').trim().toLowerCase();
    return await this.rawRequest('eth_getCode', [clean, 'latest'], timeoutMs);
  }

  public async call(to: string, data: string, blockTag = 'latest', timeoutMs = 2500): Promise<string> {
    return await this.rawRequest('eth_call', [{ to, data }, blockTag], timeoutMs);
  }

  /**
   * eth_call that keeps the node's answer when the call reverts: { ok, result } or { ok: false,
   * error, data }. A revert is the contract's answer, so it does not count against the endpoint.
   */
  public async simulateCall(tx: { from?: string; to: string; data: string; value?: string }, timeoutMs = 8000): Promise<{ ok: true; result: string } | { ok: false; error: string; data?: string }> {
    const urls = [...this.endpoints]
      .filter((url) => !this.unreachableDirect.has(url))
      .sort((a, b) => (this.latencyMap.get(a) ?? 9999) - (this.latencyMap.get(b) ?? 9999));
    for (const url of urls) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [tx, 'latest'] }),
          signal: controller.signal,
        });
        if (!res.ok) continue;
        const body = await res.json();
        if (body.error) return { ok: false, error: String(body.error.message || 'execution reverted'), data: typeof body.error.data === 'string' ? body.error.data : undefined };
        if (typeof body.result === 'string') return { ok: true, result: body.result };
      } catch {
        // try the next endpoint
      } finally {
        clearTimeout(timer);
      }
    }
    return { ok: false, error: 'No Bitnet RPC endpoint answered' };
  }

  public async getBlock(numberOrHash: number | string, includeTxs = true): Promise<Block | null> {
    const cacheKey = typeof numberOrHash === 'number' ? numberOrHash : numberOrHash.toLowerCase();
    const cached = this.blockCache.get(cacheKey);
    if (cached) {
      const hasFullTxs = cached.transactions.length === 0 || typeof cached.transactions[0] === 'object';
      if (!includeTxs || hasFullTxs) {
        return cached;
      }
    }

    const param = typeof numberOrHash === 'number' 
      ? '0x' + numberOrHash.toString(16) 
      : numberOrHash;

    const method = typeof numberOrHash === 'number' || !numberOrHash.startsWith('0x') || numberOrHash.length < 50
      ? 'eth_getBlockByNumber'
      : 'eth_getBlockByHash';

    const rawBlock = await this.rawRequest(method, [param, includeTxs]);
    if (!rawBlock) return null;

    const block = this.parseRawBlock(rawBlock);
    this.blockCache.set(block.number, block);
    this.blockCache.set(block.hash.toLowerCase(), block);

    // Cache transactions
    if (includeTxs && Array.isArray(rawBlock.transactions)) {
      const blkTs = block.timestamp;
      for (const rawTx of rawBlock.transactions) {
        if (typeof rawTx === 'object' && rawTx.hash) {
          const parsedTx = this.parseRawTransaction(rawTx, blkTs);
          this.txCache.set(parsedTx.hash.toLowerCase(), parsedTx);
        }
      }
    }

    return block;
  }

  public async getRecentBlocks(count = 15): Promise<Block[]> {
    const latestNum = await this.getBlockNumber();
    const blocks: Block[] = [];

    // Fetch batch of blocks in parallel
    const promises: Promise<Block | null>[] = [];
    for (let i = 0; i < count; i++) {
      const blockNum = latestNum - i;
      if (blockNum >= 0) {
        promises.push(this.getBlock(blockNum, true).catch(() => null));
      }
    }

    const results = await Promise.all(promises);
    return results.filter((b): b is Block => b !== null);
  }

  public async getBlocksRange(startBlock: number, count = 25): Promise<Block[]> {
    const promises: Promise<Block | null>[] = [];
    for (let i = 0; i < count; i++) {
      const blockNum = startBlock - i;
      if (blockNum >= 0) {
        promises.push(this.getBlock(blockNum, true).catch(() => null));
      }
    }
    const results = await Promise.all(promises);
    return results.filter((b): b is Block => b !== null);
  }

  // Scan backwards to find the most recent blocks that contain transactions
  public async findRecentTransactions(maxScan = 50): Promise<Transaction[]> {
    const latestNum = await this.getBlockNumber();
    const txs: Transaction[] = [];

    for (let i = 0; i < maxScan; i++) {
      const blkNum = latestNum - i;
      if (blkNum < 0) break;
      try {
        const blk = await this.getBlock(blkNum, true);
        if (blk && Array.isArray(blk.transactions)) {
          for (const tx of blk.transactions) {
            if (typeof tx === 'object' && tx.hash) {
              txs.push(tx as Transaction);
            }
          }
        }
        if (txs.length >= 10) break;
      } catch {
        continue;
      }
    }

    return txs;
  }

  public async getTransaction(txHash: string): Promise<Transaction | null> {
    const key = txHash.toLowerCase();
    if (this.txCache.has(key)) {
      const cached = this.txCache.get(key)!;
      if (cached.status !== undefined) return cached;
    }

    const rawTx = await this.rawRequest('eth_getTransactionByHash', [txHash]);
    if (!rawTx) return null;

    const parsedTx = this.parseRawTransaction(rawTx);

    // Fetch receipt for status and gas used
    try {
      const rawReceipt = await this.rawRequest('eth_getTransactionReceipt', [txHash]);
      if (rawReceipt) {
        if (rawReceipt.status !== undefined && rawReceipt.status !== null) {
          parsedTx.status = parseInt(rawReceipt.status, 16);
        }
        if (rawReceipt.gasUsed !== undefined && rawReceipt.gasUsed !== null) {
          parsedTx.gasUsed = parseInt(rawReceipt.gasUsed, 16);
        }
        if (rawReceipt.cumulativeGasUsed !== undefined && rawReceipt.cumulativeGasUsed !== null) {
          parsedTx.cumulativeGasUsed = parseInt(rawReceipt.cumulativeGasUsed, 16);
        }
        parsedTx.contractAddress = rawReceipt.contractAddress || null;
        parsedTx.logs = rawReceipt.logs || [];

        if (rawReceipt.effectiveGasPrice) {
          parsedTx.effectiveGasPrice = rawReceipt.effectiveGasPrice;
          try {
            parsedTx.effectiveGasPriceWei = BigInt(rawReceipt.effectiveGasPrice).toString();
          } catch {}
        }

        // Fee formula: receipt.gasUsed * (receipt.effectiveGasPrice ?? tx.gasPrice)
        // Calculated in Wei with BigInt, converted to BTN at display
        if (parsedTx.gasUsed !== undefined && parsedTx.gasUsed !== null) {
          let effPriceWei: bigint | null = null;
          if (rawReceipt.effectiveGasPrice) {
            try { effPriceWei = BigInt(rawReceipt.effectiveGasPrice); } catch {}
          } else if (rawTx.gasPrice) {
            try { effPriceWei = BigInt(rawTx.gasPrice); } catch {}
          }
          if (effPriceWei !== null) {
            const feeWeiBig = BigInt(parsedTx.gasUsed) * effPriceWei;
            parsedTx.feeWei = feeWeiBig.toString();
            parsedTx.fee = `${ethers.formatEther(feeWeiBig)} BTN`;
          }
        }
      }
    } catch {
      // ignore receipt error
    }

    this.txCache.set(key, parsedTx);
    return parsedTx;
  }

  public async getTransactionReceipt(txHash: string): Promise<any> {
    return await this.rawRequest('eth_getTransactionReceipt', [txHash]);
  }

  public async getNetworkStats(): Promise<NetworkStats> {
    const latestBlockNum = await this.getBlockNumber();
    const [latestBlock, gasPrice, peers] = await Promise.all([
      this.getBlock(latestBlockNum, false),
      this.getGasPrice(),
      this.getPeerCount(),
    ]);

    const diffBig = latestBlock ? BigInt(latestBlock.difficulty) : 0n;
    const sampleSize = Math.min(120, latestBlockNum);
    let avgBlockTime: number = null;
    let hashrateHps: number = null;
    if (latestBlock && sampleSize > 0) {
      try {
        const first = await this.getBlock(latestBlockNum - sampleSize, false);
        if (first) {
          hashrateHps = calculateHashrate(first, latestBlock);
          if (hashrateHps !== null) avgBlockTime = (latestBlock.timestamp - first.timestamp) / sampleSize;
        }
      } catch { /* Unknown hashrate stays unknown; no fixed difficulty/time fallback. */ }
    }
    const hashrateEstimate = formatHashrate(hashrateHps);

    let clientVersion = 'Go-Ethereum (Bitnet Geth v1.22)';
    if (latestBlock?.extraDataAscii) {
      clientVersion = latestBlock.extraDataAscii;
    }

    const circulatingEstimate = latestBlockNum > 0
      ? `${(latestBlockNum * 1.0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} BTN`
      : undefined;

    return {
      latestBlock: latestBlockNum,
      gasPriceGwei: gasPrice !== null ? ethers.formatUnits(gasPrice, 'gwei') : null,
      difficulty: diffBig.toLocaleString(),
      hashrateEstimate,
      hashrateHps,
      peerCount: peers,
      chainId: BITNET_CHAIN_ID,
      clientVersion,
      avgBlockTimeSeconds: avgBlockTime,
      blockReward: '1.0 BTN',
      circulatingEstimate,
    };
  }

  public async checkAllEndpoints(): Promise<RpcEndpointStatus[]> {
    const endpointsToTest = [
      { url: '/api/rpc', name: 'Primary RPC Proxy (rpc.bitnetmoney.org)' },
      { url: '/api/rpc2', name: 'Backup RPC Proxy (rpc.bitnetmoney.com)' },
      { url: 'https://rpc.bitnetmoney.org/', name: 'Bitnet Foundation RPC (Direct)' },
      { url: 'https://rpc.bitnetmoney.com/', name: 'Bitnet Core RPC #2 (Direct)' },
    ];

    return Promise.all(
      endpointsToTest.map(async (ep) => {
        const start = performance.now();
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2500);

          const resp = await fetch(ep.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
            signal: controller.signal,
          });
          clearTimeout(timeout);

          const latency = Math.round(performance.now() - start);
          if (resp.ok) {
            const data = await resp.json();
            return {
              url: ep.url,
              name: ep.name,
              status: latency < 1500 ? ('online' as const) : ('degraded' as const),
              latencyMs: latency,
              blockNumber: parseInt(data.result, 16),
              isPrimary: ep.url === this.activeRpc,
            };
          } else {
            return {
              url: ep.url,
              name: ep.name,
              status: 'offline' as const,
              latencyMs: latency,
              blockNumber: 0,
            };
          }
        } catch {
          return {
            url: ep.url,
            name: ep.name,
            status: 'offline' as const,
            latencyMs: 0,
            blockNumber: 0,
          };
        }
      })
    );
  }

  private parseRawBlock(raw: any): Block {
    let extraAscii = '';
    try {
      if (raw.extraData && raw.extraData !== '0x') {
        const hex = raw.extraData.startsWith('0x') ? raw.extraData.slice(2) : raw.extraData;
        const bytes = [];
        for (let i = 0; i < hex.length; i += 2) {
          const code = parseInt(hex.substr(i, 2), 16);
          if (code >= 32 && code <= 126) {
            bytes.push(String.fromCharCode(code));
          }
        }
        extraAscii = bytes.join('');
      }
    } catch {
      // ignore
    }

    const blockNum = parseInt(raw.number, 16);
    let blockTimestamp = parseInt(raw.timestamp, 16);
    // Genesis Block (Block #0) on-chain has EVM default timestamp 0x0 (Jan 1, 1970).
    // Normalize to verified Bitnet L1 Genesis Launch Date: July 14, 2023, 06:54:07 UTC (timestamp 1689317647)
    if (blockNum <= 0 && blockTimestamp <= 0) {
      blockTimestamp = 1689317647;
    }

    return {
      number: blockNum,
      hash: raw.hash,
      parentHash: raw.parentHash,
      nonce: raw.nonce,
      sha3Uncles: raw.sha3Uncles,
      logsBloom: raw.logsBloom,
      transactionsRoot: raw.transactionsRoot,
      stateRoot: raw.stateRoot,
      receiptsRoot: raw.receiptsRoot,
      miner: raw.miner,
      difficulty: raw.difficulty,
      totalDifficulty: raw.totalDifficulty,
      extraData: raw.extraData,
      extraDataAscii: extraAscii,
      size: parseInt(raw.size, 16),
      gasLimit: parseInt(raw.gasLimit, 16),
      gasUsed: parseInt(raw.gasUsed, 16),
      timestamp: blockTimestamp,
      transactions: Array.isArray(raw.transactions)
        ? raw.transactions.map((tx: any) => typeof tx === 'object' ? this.parseRawTransaction(tx, blockTimestamp) : tx)
        : [],
      uncles: raw.uncles || [],
      baseFeePerGas: raw.baseFeePerGas,
      mixHash: raw.mixHash,
    };
  }

  private parseRawTransaction(raw: any, blockTimestamp?: number): Transaction {
    const rawTs = raw.timestamp
      ? (typeof raw.timestamp === 'number' ? raw.timestamp : parseInt(raw.timestamp, 16))
      : undefined;

    let valueWei = '0';
    try {
      if (raw.value) {
        valueWei = typeof raw.value === 'string' && raw.value.startsWith('0x')
          ? BigInt(raw.value).toString()
          : BigInt(raw.value).toString();
      }
    } catch {
      valueWei = '0';
    }

    let gasPriceWei: string | undefined = undefined;
    try {
      if (raw.gasPrice) {
        gasPriceWei = typeof raw.gasPrice === 'string' && raw.gasPrice.startsWith('0x')
          ? BigInt(raw.gasPrice).toString()
          : BigInt(raw.gasPrice).toString();
      }
    } catch {}

    return {
      hash: raw.hash,
      blockHash: raw.blockHash,
      blockNumber: parseInt(raw.blockNumber, 16),
      from: raw.from,
      to: raw.to,
      value: ethers.formatEther(valueWei),
      valueWei,
      timestamp: blockTimestamp || rawTs,
      gas: parseInt(raw.gas, 16),
      gasPrice: gasPriceWei ? ethers.formatUnits(gasPriceWei, 'gwei') : undefined,
      gasPriceWei,
      input: raw.input,
      nonce: parseInt(raw.nonce, 16),
      transactionIndex: parseInt(raw.transactionIndex, 16),
      type: raw.type,
    };
  }
}

export const rpcService = new BitnetRpcService();
