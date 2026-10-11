import { ethers } from 'ethers';
import type { AddressTransaction } from './explorerApi';

export type TransactionCursor = Record<string, string | number>;
export interface IndexedTransactionPage {
  transactions: AddressTransaction[];
  next: TransactionCursor | null;
  source: string;
}

export class IndexedTransactions {
  private daily: { day: string; at: number; count: number | null } | null = null;
  private dailyJob: Promise<number | null> | null = null;
  private first: { at: number; page: IndexedTransactionPage } | null = null;
  private firstJob: Promise<IndexedTransactionPage> | null = null;

  constructor(
    private fetcher: typeof fetch = (input, init) => fetch(input, init),
    private bases = ['/api/explorer', '/api/bitnet-explorer', 'https://explorer.bitnetmoney.com'],
    private now = () => Date.now(),
  ) {}

  public async page(cursor?: TransactionCursor, source?: string): Promise<IndexedTransactionPage> {
    if (!cursor && !source) {
      if (this.first && this.now() - this.first.at < 15000) return this.first.page;
      if (this.firstJob) return this.firstJob;
      this.firstJob = this.readPage().then(page => {
        this.first = { at: this.now(), page };
        return page;
      });
      try { return await this.firstJob; } finally { this.firstJob = null; }
    }
    return this.readPage(cursor, source);
  }

  private async readPage(cursor?: TransactionCursor, source?: string): Promise<IndexedTransactionPage> {
    // A cursor belongs to one indexer. Never reuse it against another host.
    for (const base of source ? [source] : this.bases) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const query = new URLSearchParams({ filter: 'validated' });
        for (const [key, value] of Object.entries(cursor || {})) query.set(key, String(value));
        const res = await this.fetcher(`${base}/api/v2/transactions?${query}`, {
          signal: controller.signal, headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(`Indexer HTTP ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data.items) || !Object.hasOwnProperty.call(data, 'next_page_params')) {
          throw new Error('Invalid transaction page');
        }
        const transactions = data.items.map((item: any): AddressTransaction => {
          if (!/^0x[0-9a-f]{64}$/i.test(item.hash)) throw new Error('Invalid transaction hash');
          const valueWei = BigInt(item.value).toString();
          const value = ethers.formatEther(valueWei);
          const timestamp = Date.parse(item.timestamp) / 1000;
          const blockNumber = Number(item.block_number);
          if (!Number.isFinite(timestamp) || !Number.isSafeInteger(blockNumber) || item.block_number == null) {
            throw new Error('Invalid confirmed transaction');
          }
          const feeWei = item.fee?.value != null ? BigInt(item.fee.value).toString() : undefined;
          return {
            hash: item.hash, blockNumber, timestamp,
            from: item.from?.hash || item.from || '', to: item.to?.hash || item.to || '',
            value, valueWei, valueNum: Number(value), feeWei,
            fee: feeWei !== undefined ? `${ethers.formatEther(feeWei)} BTN` : undefined,
            status: item.status === 'ok' ? 'success' : item.status === 'error' ? 'failed' : 'unknown',
            type: 'OUT', nonce: item.nonce,
          };
        });
        const next = data.next_page_params;
        if (next != null && (typeof next !== 'object' || Array.isArray(next) || !Object.keys(next).length
          || Object.values(next).some(value => typeof value !== 'string' && typeof value !== 'number'))) {
          throw new Error('Invalid transaction cursor');
        }
        if (cursor && next && JSON.stringify(next) === JSON.stringify(cursor)) throw new Error('Repeated cursor');
        return { transactions, next: next ?? null, source: base };
      } catch { /* Initial page may fail over; subsequent pages stay on the same source. */ }
      finally { clearTimeout(timer); }
    }
    throw new Error('Transaction indexer unavailable');
  }

  public async today(): Promise<number | null> {
    const now = this.now(), day = new Date(now).toISOString().slice(0, 10);
    if (this.daily?.day === day && now - this.daily.at < 30000) return this.daily.count;
    if (this.dailyJob) { await this.dailyJob; return this.today(); }
    this.dailyJob = (async () => {
      const start = Date.parse(day) / 1000, end = start + 86400;
      const seen = new Set<string>(), cursors = new Set<string>();
      let cursor: TransactionCursor | undefined, source: string | undefined;
      let previousTime = Infinity, count = 0;
      try {
        for (let i = 0; i < 200; i++) {
          const page = await this.page(cursor, source);
          source = page.source;
          for (const tx of page.transactions) {
            if (tx.timestamp > previousTime) throw new Error('Unordered transaction history');
            previousTime = tx.timestamp;
            if (tx.timestamp < start) return count;
            const hash = tx.hash.toLowerCase();
            if (tx.timestamp < end && !seen.has(hash)) { seen.add(hash); count++; }
          }
          if (!page.next) return count;
          const key = JSON.stringify(page.next, Object.keys(page.next).sort());
          if (cursors.has(key)) throw new Error('Repeated transaction page');
          cursors.add(key);
          cursor = page.next;
        }
      } catch { /* Partial scans must not become daily totals. */ }
      return null;
    })().then(count => {
      this.daily = { day, at: this.now(), count };
      return count;
    });
    try { return await this.dailyJob; } finally { this.dailyJob = null; }
  }
}

export const indexedTransactions = new IndexedTransactions();
