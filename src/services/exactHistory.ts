/**
 * Exact mining, supply and holding history computed from every block (scripts/chain-history.mjs),
 * served by /api/chain-history; the stored dataset on the chain-data branch is the fallback.
 */
export interface HistoryDay {
  date: string;
  first: number;
  last: number;
  blocks: number;
  uncles: number;
  /** BTN created on the day: block rewards, uncle inclusion rewards and uncle rewards. */
  issued: number;
  /** [miner index, blocks], most blocks first. */
  miners: [number, number][];
  /** Hashes behind the day's blocks (total difficulty added that day), or null while unknown. */
  work: number | null;
}

export interface HoldingSnapshot {
  date: string;
  block: number;
  supply: number;
  /** BTN at the addresses BitnetScan follows (burned coins included). */
  tracked: number;
  burned: number;
  holders: number;
  holdersWithOneBtn: number;
  top1: number;
  top10: number;
  top100: number;
  /** BTN by how long it has stayed at its address, youngest band first. */
  holdingBands: number[];
}

export interface ExactHistory {
  /** When the hourly job wrote the dataset. */
  generatedAt?: string;
  toBlock: number;
  chainBlock: number;
  supply: number;
  supplyBlock: number;
  addresses: number;
  holdBandDays: number[];
  miners: string[];
  days: HistoryDay[];
  monthEnds: HoldingSnapshot[];
  latest: HoldingSnapshot | null;
}

/** Holding-time bands, matching holdBandDays (30, 90, 180, 365, 730, 1095 days). */
export const HOLD_BANDS = ['Under 1 month', '1–3 months', '3–6 months', '6–12 months', '1–2 years', '2–3 years', 'Over 3 years'];

const RAW_URL = 'https://raw.githubusercontent.com/payiz-12/Bitnetscan/chain-data/chain-daily.json';
const HOLD_BAND_DAYS = [30, 90, 180, 365, 730, 1095];
let cache: { at: number; data: ExactHistory } | null = null;
/** Error message while the first hourly run has not published the history yet. */
export const PENDING = 'pending';

const toDays = (rows: any[]): HistoryDay[] =>
  rows.map(([date, first, last, blocks, uncles, issued, miners, work]) => ({ date, first, last, blocks, uncles, issued, miners, work: work ?? null }));

async function fromApi(): Promise<ExactHistory> {
  const res = await fetch('/api/chain-history', { signal: AbortSignal.timeout(30000) });
  if (res.status === 503 && /not computed/.test((await res.json().catch(() => ({}))).error ?? '')) throw new Error(PENDING);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = await res.json();
  return { ...d, generatedAt: d.datasetGeneratedAt, days: toDays(d.days) };
}

/** The same figures read from the stored dataset (amounts there are in µBTN). */
async function fromDataset(): Promise<ExactHistory> {
  const res = await fetch(RAW_URL, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const h = data.history;
  if (!h) throw new Error(PENDING);
  const btn = (micro: number) => micro / 1e6;
  const snapshot = (s: any): HoldingSnapshot | null => s && ({
    date: s.date, block: s.block, supply: btn(s.supply), tracked: btn(s.tracked), burned: btn(s.burned),
    holders: s.holders, holdersWithOneBtn: s.holders1, top1: btn(s.top1), top10: btn(s.top10), top100: btn(s.top100),
    holdingBands: s.bands.map(btn),
  });
  const last = h.days[h.days.length - 1];
  const td = h.td ?? {};
  let before: bigint | null = td.genesis !== undefined ? BigInt(td.genesis) : null;
  const work = h.days.map((d: any[]) => {
    const end = td[d[0]] !== undefined ? BigInt(td[d[0]]) : null;
    const w = end !== null && before !== null ? Number(end - before) : null;
    before = end;
    return w;
  });
  return {
    generatedAt: data.generatedAt,
    toBlock: h.to,
    chainBlock: data.to,
    supply: btn(h.supply - (h.open?.issued ?? 0)),
    supplyBlock: last ? last[2] : 0,
    addresses: h.known.length,
    holdBandDays: HOLD_BAND_DAYS,
    miners: h.miners,
    days: toDays(h.days.map((d: any[], i: number) => [...d.slice(0, 5), btn(d[5]), d[6], work[i]])),
    monthEnds: h.months.map(snapshot),
    latest: snapshot(h.latest),
  };
}

/** The history if it has been loaded in this page already. */
export const getCachedExactHistory = (): ExactHistory | null => cache?.data ?? null;

const cumulative = new WeakMap<ExactHistory, number[]>();

/**
 * Exact supply (BTN) after `block`: exact at the end of every day, spread evenly over the blocks
 * within a day; after the last written day, at that day's rate per block.
 */
export function exactSupplyAtBlock(h: ExactHistory, block: number): number | null {
  const days = h.days;
  if (block < 1) return 0;
  if (!days.length) return null;
  let cum = cumulative.get(h);
  if (!cum) {
    let sum = 0;
    cum = days.map((d) => (sum += d.issued));
    cumulative.set(h, cum);
  }
  const lastIndex = days.length - 1;
  if (block > days[lastIndex].last) {
    const d = days[lastIndex];
    return cum[lastIndex] + (block - d.last) * (d.issued / d.blocks);
  }
  let lo = 0;
  let hi = lastIndex;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (days[mid].last >= block) hi = mid; else lo = mid + 1;
  }
  const d = days[lo];
  return (lo > 0 ? cum[lo - 1] : 0) + (block - d.first + 1) * (d.issued / d.blocks);
}

/** BTN one GH/s would have earned per day: the day's issuance times 86,400 × 10⁹ over its work. */
export const btnPerGhDay = (issued: number, work: number) => (work > 0 ? (issued * 86400 * 1e9) / work : null);

export async function loadExactHistory(): Promise<ExactHistory> {
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache.data;
  const data = await fromApi().catch((e: Error) => (e.message === PENDING ? Promise.reject(e) : fromDataset()));
  cache = { at: Date.now(), data };
  return data;
}

export interface MiningPeriod {
  start: string;
  end: string;
  days: number;
  firstBlock: number;
  lastBlock: number;
  blocks: number;
  uncles: number;
  issued: number;
  /** Exact supply at the end of the period. */
  supply: number;
  /** Blocks by miner address. */
  miners: Map<string, number>;
  /** Hashes behind the period's blocks, and the BTN issued on the days whose work is known. */
  work: number;
  workIssued: number;
  /** The latest week or month, not over yet (or not read to its end yet). */
  partial: boolean;
}

const weekStart = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

/** Days of the last `lastDays` days, or grouped by ISO week or calendar month, with the running supply. */
export function miningPeriods(h: ExactHistory, grouping: 'day' | 'week' | 'month', lastDays?: number): MiningPeriod[] {
  let supply = 0;
  const withSupply = h.days.map((d) => ({ d, supply: (supply += d.issued) }));
  const source = lastDays ? withSupply.slice(-lastDays) : withSupply;
  const groups = new Map<string, typeof source>();
  for (const x of source) {
    const key = grouping === 'day' ? x.d.date : grouping === 'week' ? weekStart(x.d.date) : x.d.date.slice(0, 7);
    const list = groups.get(key) ?? [];
    list.push(x);
    groups.set(key, list);
  }
  const lastOfMonth = (date: string) => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.getUTCDate() === 1;
  };
  const values = [...groups.values()];
  return values.map((list, n) => {
    const miners = new Map<string, number>();
    for (const { d } of list) for (const [i, n] of d.miners) miners.set(h.miners[i], (miners.get(h.miners[i]) || 0) + n);
    return {
      start: list[0].d.date,
      end: list[list.length - 1].d.date,
      days: list.length,
      firstBlock: list[0].d.first,
      lastBlock: list[list.length - 1].d.last,
      blocks: list.reduce((s, x) => s + x.d.blocks, 0),
      uncles: list.reduce((s, x) => s + x.d.uncles, 0),
      issued: list.reduce((s, x) => s + x.d.issued, 0),
      supply: list[list.length - 1].supply,
      work: list.reduce((s, x) => s + (x.d.work ?? 0), 0),
      workIssued: list.reduce((s, x) => s + (x.d.work !== null ? x.d.issued : 0), 0),
      miners,
      partial: n === values.length - 1 && (grouping === 'week' ? list.length < 7 : grouping === 'month' && !lastOfMonth(list[list.length - 1].d.date)),
    };
  });
}

export interface AddressHolding {
  asOf: string;
  block: number;
  followed: boolean;
  balance: number;
  holdingBands: number[];
  /** Amounts that have not left the address since a day, oldest first. */
  layers: { since: string; days: number; btn: number }[];
}

const holdingCache = new Map<string, Promise<AddressHolding | null>>();

/** How long the BTN at an address has stayed there (null when the history has no answer). */
export function loadAddressHolding(address: string): Promise<AddressHolding | null> {
  const key = address.toLowerCase();
  let job = holdingCache.get(key);
  if (!job) {
    job = fetch(`/api/holding?address=${key}`, { signal: AbortSignal.timeout(20000) })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    holdingCache.set(key, job);
  }
  return job;
}
