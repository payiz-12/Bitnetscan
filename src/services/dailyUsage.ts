/**
 * Daily network usage computed from the chain (see api/_lib/daily.js): transactions, active
 * addresses (senders and recipients) and new addresses per UTC day. Served by /api/chain-daily
 * with the current day up to date; the stored dataset on the chain-data branch is the fallback.
 */
export interface DailyRow {
  date: string;
  txs: number;
  active: number;
  senders: number | null;
  new: number;
  /** The current UTC day, still in progress. */
  partial?: boolean;
}

export interface DailyUsage {
  rows: DailyRow[];
  fromBlock: number;
  toBlock: number;
  genesisReached: boolean;
}

const RAW_URL = 'https://raw.githubusercontent.com/payiz-12/Bitnetscan/chain-data/chain-daily.json';
let cache: { at: number; data: DailyUsage } | null = null;

async function fromApi(): Promise<DailyUsage> {
  const res = await fetch('/api/chain-daily', { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = await res.json();
  const rows: DailyRow[] = d.days.map(([date, txs, active, senders, fresh]: [string, number, number, number | null, number]) => ({ date, txs, active, senders, new: fresh }));
  if (d.today) rows.push({ date: d.today.date, txs: d.today.transactions, active: d.today.activeAddresses, senders: d.today.senders, new: d.today.newAddresses, partial: true });
  return { rows, fromBlock: d.fromBlock, toBlock: d.toBlock, genesisReached: d.genesisReached };
}

async function fromDataset(): Promise<DailyUsage> {
  const res = await fetch(RAW_URL, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = await res.json();
  const rows: DailyRow[] = d.days.map((x: any) => ({ date: x.date, txs: x.txs, active: x.active, senders: x.senders ?? null, new: x.new }));
  const p = d.partial;
  if (p) rows.push({ date: p.date, txs: p.txs, active: p.addresses.length, senders: p.senders?.length ?? null, new: p.newAddresses.length, partial: true });
  return { rows, fromBlock: d.from, toBlock: d.to, genesisReached: Boolean(d.genesisReached) };
}

export async function loadDailyUsage(): Promise<DailyUsage> {
  if (cache && Date.now() - cache.at < 5 * 60_000) return cache.data;
  const data = await fromApi().catch(() => fromDataset());
  cache = { at: Date.now(), data };
  return data;
}

export interface UsagePeriod {
  start: string;
  end: string;
  days: number;
  txs: number;
  newAddresses: number;
  /** Active addresses on the day, or the daily average over a week or month. */
  active: number;
  senders: number | null;
  partial: boolean;
}

const weekStart = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

/** Daily rows for the last `days` days, or rows grouped by ISO week or calendar month. */
export function toPeriods(rows: DailyRow[], grouping: 'day' | 'week' | 'month', lastDays?: number): UsagePeriod[] {
  const source = lastDays ? rows.slice(-lastDays) : rows;
  if (grouping === 'day') {
    return source.map((r) => ({ start: r.date, end: r.date, days: 1, txs: r.txs, newAddresses: r.new, active: r.active, senders: r.senders, partial: Boolean(r.partial) }));
  }
  const groups = new Map<string, DailyRow[]>();
  for (const r of source) {
    const key = grouping === 'week' ? weekStart(r.date) : r.date.slice(0, 7);
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }
  return [...groups.values()].map((list) => ({
    start: list[0].date,
    end: list[list.length - 1].date,
    days: list.length,
    txs: list.reduce((s, r) => s + r.txs, 0),
    newAddresses: list.reduce((s, r) => s + r.new, 0),
    active: list.reduce((s, r) => s + r.active, 0) / list.length,
    senders: list.every((r) => r.senders !== null) ? list.reduce((s, r) => s + (r.senders ?? 0), 0) / list.length : null,
    partial: list.some((r) => r.partial),
  }));
}
