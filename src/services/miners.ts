/**
 * What miners earned and sent per UTC day, computed by BitnetScan from every block
 * (scripts/chain-rewards.mjs), served by /api/miner. Earned is block rewards plus uncle rewards,
 * exact to the µBTN; transaction fees (about 20 BTN over the whole chain) are left out.
 */
export interface MinerDay {
  date: string;
  blocks: number;
  uncles: number;
  earned: number;
  sent: number;
  sends: number;
  /** Balance at the end of the day, from the archive state. */
  balance: number;
  /** Blocks mined by everyone that day. */
  blocksThatDay: number;
  firstBlock: number;
  lastBlock: number;
}

export interface MinerProgress {
  toBlock: number;
  chainBlock: number;
  firstDay: string;
  lastDay: string;
}

export interface MinerReport extends MinerProgress {
  address: string;
  mined: boolean;
  days: MinerDay[];
}

export interface MinerTotals {
  address: string;
  blocks: number;
  uncles: number;
  earned: number;
  sent: number;
  sends: number;
  firstDay: string | null;
  lastDay: string | null;
}

/** The error message while the hourly job has not published the miner history yet. */
export const MINERS_PENDING = 'pending';

async function getJson(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (res.ok) return res.json();
  const body = await res.json().catch(() => ({}));
  throw new Error(/not computed/.test(body.error ?? '') ? MINERS_PENDING : `HTTP ${res.status}`);
}

const reports = new Map<string, Promise<MinerReport>>();

export function loadMinerReport(address: string): Promise<MinerReport> {
  const key = address.toLowerCase();
  let job = reports.get(key);
  if (!job) {
    job = getJson(`/api/miner?address=${key}`).then((d) => ({
      ...d,
      days: d.days.map(([date, blocks, uncles, earned, sent, sends, balance, blocksThatDay, firstBlock, lastBlock]: any[]) => ({ date, blocks, uncles, earned, sent, sends, balance, blocksThatDay, firstBlock, lastBlock })),
    }));
    job.catch(() => reports.delete(key));
    reports.set(key, job);
  }
  return job;
}

export interface MinerPeriod {
  start: string;
  end: string;
  days: number;
  blocks: number;
  uncles: number;
  earned: number;
  sent: number;
  sends: number;
  /** Blocks mined by everyone in the period. */
  allBlocks: number;
  /** Balance at the end of the period (the latest day with a record), or null before the first. */
  balance: number | null;
}

const weekStart = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

/**
 * The miner's days over every day of the chain (`allDays`, with everyone's blocks) since `since`,
 * grouped by day, ISO week or month; days without a record count as zero.
 */
export function minerPeriods(days: MinerDay[], allDays: { date: string; blocks: number }[], grouping: 'day' | 'week' | 'month', since?: string): MinerPeriod[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const groups = new Map<string, MinerPeriod>();
  let balance: number | null = null;
  for (const all of allDays) {
    const d = byDate.get(all.date);
    if (d) balance = d.balance;
    if (since && all.date < since) continue;
    const key = grouping === 'day' ? all.date : grouping === 'week' ? weekStart(all.date) : all.date.slice(0, 7);
    let p = groups.get(key);
    if (!p) {
      p = { start: all.date, end: all.date, days: 0, blocks: 0, uncles: 0, earned: 0, sent: 0, sends: 0, allBlocks: 0, balance };
      groups.set(key, p);
    }
    p.end = all.date;
    p.days += 1;
    p.allBlocks += all.blocks;
    p.balance = balance;
    if (d) {
      p.blocks += d.blocks; p.uncles += d.uncles; p.earned += d.earned; p.sent += d.sent; p.sends += d.sends;
    }
  }
  return [...groups.values()];
}
