// Exact mining, supply and holding history, computed from every block since genesis. Kept in
// chain-daily.json under `history` by scripts/chain-daily.mjs: each hourly run continues from the
// last block it read, so the first pass over the whole chain is spread over several runs.
//
// Per UTC day: blocks, uncles, BTN issued (1 BTN per block, +1/32 BTN per included uncle to the
// block's miner, (8 − depth)/8 BTN to the uncle's miner; fees only move coins) and the blocks of
// every miner. Every address the chain has paid or seen sending (transaction senders and
// recipients, miners, uncle miners, created contracts) is followed: its balance is read from the
// archive state at the end of each day it was involved in, and every address is read again at
// each month's end, which also catches BTN moved by contracts.
//
// From those balances: how long BTN has stayed where it is (for each address, the amount that
// never left it since a given day is the lowest balance it had at the end of any day since then),
// and how much of the supply the largest addresses hold. Amounts are kept in µBTN (10^-6 BTN) as
// integers, so sums are exact.

import { rpcBatch, utcDate } from '../api/_lib/daily.js';

const hex = (n) => '0x' + n.toString(16);
const WEI_PER_MICRO = 10n ** 12n;
const BLOCK_REWARD = 1_000_000;
const NEPHEW_REWARD = 31_250;
const uncleReward = (depth) => (8 - depth) * 125_000;
const CHUNK = 10_000;
/** Burned coins: counted in the supply, left out of holders and holding times. */
export const BURN_ADDRESSES = ['0x0000000000000000000000000000000000000000', '0x000000000000000000000000000000000000dead'];
/** Upper bounds (days) of the holding-time bands; the last band is everything older. */
export const HOLD_BANDS = [30, 90, 180, 365, 730, 1095];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const epochDay = (ts) => Math.floor(ts / 86400);

export const emptyHistory = () => ({ version: 1, to: 0, supply: 0, miners: [], days: [], open: null, known: [], held: {}, months: [], latest: null });

/** Runs `fn` until it succeeds, waiting a minute after each failure; null once `until` has passed. */
async function patiently(fn, label, until, log) {
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (Date.now() > until) return null;
      log(`${label}: ${err.message}; retrying in a minute`);
      await sleep(60_000);
    }
  }
}

/** Answers to many calls, in order, sent as batches of `size` by `workers` parallel requests. */
async function batched(calls, { size = 200, workers = 3 } = {}) {
  const out = new Array(calls.length);
  let next = 0;
  const worker = async () => {
    while (next < calls.length) {
      const start = next;
      next += size;
      const res = await rpcBatch(calls.slice(start, start + size));
      res.forEach((r, i) => { out[start + i] = r; });
    }
  };
  await Promise.all(Array.from({ length: Math.min(workers, Math.ceil(calls.length / size)) }, worker));
  return out;
}

const balancesAt = async (addresses, block) =>
  (await batched(addresses.map((a) => ({ method: 'eth_getBalance', params: [a, hex(block)] })))).map((w) => Number(BigInt(w) / WEI_PER_MICRO));

/** Blocks [from, to] with their miner, uncles (number and miner) and the addresses their transactions touch. */
async function readChunk(from, to) {
  const raw = await batched(Array.from({ length: to - from + 1 }, (_, k) => ({ method: 'eth_getBlockByNumber', params: [hex(from + k), true] })));
  const uncleRefs = raw.flatMap((b) => (b.uncles || []).map((_, i) => ({ method: 'eth_getUncleByBlockNumberAndIndex', params: [b.number, hex(i)] })));
  const creations = raw.flatMap((b) => (b.transactions || []).filter((tx) => !tx.to).map((tx) => ({ method: 'eth_getTransactionReceipt', params: [tx.hash] })));
  const [uncles, receipts] = await Promise.all([batched(uncleRefs), batched(creations)]);
  const created = new Map(receipts.map((r) => [r.transactionHash, r.contractAddress?.toLowerCase()]));
  let u = 0;
  return raw.map((b) => {
    const number = parseInt(b.number, 16);
    return {
      number,
      timestamp: parseInt(b.timestamp, 16),
      miner: b.miner.toLowerCase(),
      uncles: (b.uncles || []).map(() => {
        const x = uncles[u++];
        if (!x) throw new Error(`uncle of block ${number} missing`);
        return { miner: x.miner.toLowerCase(), depth: number - parseInt(x.number, 16) };
      }),
      addresses: (b.transactions || []).flatMap((tx) => [tx.from.toLowerCase(), tx.to ? tx.to.toLowerCase() : created.get(tx.hash)].filter(Boolean)),
    };
  });
}

/**
 * Sets an address's balance at the end of `day` in its holding record: pairs [day, amount], the
 * amount rising with each pair, meaning `amount` µBTN has stayed at the address since `day`.
 * The last amount is the current balance; addresses with no balance have no record.
 */
function setBalance(held, address, day, balance) {
  const s = held[address] || [];
  let i = s.length;
  while (i > 0 && s[i - 1][1] >= balance) i--;
  if (i < s.length) {
    const since = s[i][0];
    s.length = i;
    if (balance > 0) s.push([since, balance]);
  } else if (balance > (s.length ? s[s.length - 1][1] : 0)) {
    s.push([day, balance]);
  }
  if (s.length) held[address] = s; else delete held[address];
}

/**
 * Keeps holding records short: pairs older than a week are merged per week, older than a year
 * per 30 days. A merged pair takes the later day, so a holding time is never overstated (by at
 * most a week, or a month past a year, it is understated; the bands start at 30 days).
 */
function compact(s, today) {
  const bucket = (day) => (today - day <= 7 ? `d${day}` : today - day <= 365 ? `w${Math.floor(day / 7)}` : `m${Math.floor(day / 30)}`);
  for (let i = s.length - 2; i >= 0; i--) {
    if (bucket(s[i][0]) === bucket(s[i + 1][0])) s.splice(i, 1);
  }
}

const balanceOf = (held, address) => held[address]?.at(-1)[1] ?? 0;

/** Holders, concentration and holding times at the end of `day` (an epoch day). */
export function holdingStats(h, day, date, block, supply) {
  let tracked = 0;
  let burned = 0;
  const balances = [];
  const bands = new Array(HOLD_BANDS.length + 1).fill(0);
  for (const [address, s] of Object.entries(h.held)) {
    const balance = s[s.length - 1][1];
    tracked += balance;
    if (BURN_ADDRESSES.includes(address)) { burned += balance; continue; }
    balances.push(balance);
    let below = 0;
    for (const [since, amount] of s) {
      const age = day - since;
      const band = HOLD_BANDS.findIndex((limit) => age < limit);
      bands[band < 0 ? HOLD_BANDS.length : band] += amount - below;
      below = amount;
    }
  }
  balances.sort((a, b) => b - a);
  const top = (n) => balances.slice(0, n).reduce((s, b) => s + b, 0);
  return {
    date,
    block,
    supply,
    tracked,
    burned,
    holders: balances.length,
    holders1: balances.filter((b) => b >= 1_000_000).length,
    top1: top(1),
    top10: top(10),
    top100: top(100),
    bands,
  };
}

/**
 * Reads blocks after `h.to` up to `head` until `until` (ms), updating `h` in place. A day is
 * written once its last block is read and its balances are known; work stops between steps, so
 * the history is always consistent with `h.to`.
 */
export async function extendHistory(h, head, until, { log = console.log, save = () => {} } = {}) {
  const known = new Set(h.known);
  const minerIndex = new Map(h.miners.map((m, i) => [m, i]));
  let open = h.open && { ...h.open, miners: new Map(h.open.miners), touched: new Set(h.open.touched) };
  const persistOpen = () => {
    h.open = open && { ...open, miners: [...open.miners], touched: [...open.touched] };
  };
  const touch = (address) => {
    if (!known.has(address)) { known.add(address); h.known.push(address); }
    open.touched.add(address);
  };

  /** Writes the open day: balances of the addresses it touched and, at a month's end, of all. */
  const closeDay = async (nextDate) => {
    const touched = [...open.touched];
    const balances = await patiently(() => balancesAt(touched, open.last), `balances ${open.date}`, until, log);
    if (!balances) return false;
    const monthEnd = nextDate.slice(0, 7) !== open.date.slice(0, 7);
    const all = monthEnd ? await patiently(() => balancesAt(h.known, open.last), `month-end balances ${open.date}`, until, log) : null;
    if (monthEnd && !all) return false;

    touched.forEach((a, i) => setBalance(h.held, a, open.day, balances[i]));
    let moved = 0;
    if (all) {
      h.known.forEach((a, i) => {
        if (balanceOf(h.held, a) !== all[i]) { setBalance(h.held, a, open.day, all[i]); moved++; }
      });
    }
    // Records age between month ends without being touched, so all are compacted then.
    for (const a of all ? Object.keys(h.held) : touched) if (h.held[a]) compact(h.held[a], open.day);
    h.days.push([open.date, open.first, open.last, open.blocks, open.uncles, open.issued, [...open.miners].sort((a, b) => b[1] - a[1])]);
    if (all) h.months.push({ ...holdingStats(h, open.day, open.date, open.last, h.supply), movedByContracts: moved });
    open = null;
    return true;
  };

  while (h.to < head && Date.now() < until) {
    const from = h.to + 1;
    const to = Math.min(head, from + CHUNK - 1);
    const blocks = await patiently(() => readChunk(from, to), `blocks ${from}-${to}`, until, log);
    if (!blocks) break;
    for (const b of blocks) {
      const date = utcDate(b.timestamp);
      if (open && open.date !== date && !(await closeDay(date))) {
        persistOpen();
        return h;
      }
      if (!open) open = { date, day: epochDay(b.timestamp), first: b.number, last: b.number, blocks: 0, uncles: 0, issued: 0, miners: new Map(), touched: new Set() };
      let issued = BLOCK_REWARD + NEPHEW_REWARD * b.uncles.length;
      for (const u of b.uncles) { issued += uncleReward(u.depth); touch(u.miner); }
      if (!minerIndex.has(b.miner)) { minerIndex.set(b.miner, h.miners.length); h.miners.push(b.miner); }
      const m = minerIndex.get(b.miner);
      open.miners.set(m, (open.miners.get(m) || 0) + 1);
      touch(b.miner);
      for (const a of b.addresses) touch(a);
      open.blocks++;
      open.uncles += b.uncles.length;
      open.issued += issued;
      open.last = b.number;
      h.supply += issued;
      h.to = b.number;
    }
    persistOpen();
    const last = h.days.at(-1);
    // The supply at the end of the last written day: the open day's blocks come after it.
    if (last) h.latest = holdingStats(h, epochDay(Date.parse(`${last[0]}T00:00:00Z`) / 1000), last[0], last[2], h.supply - (open?.issued ?? 0));
    save();
    log(`history: to block ${h.to} (${open?.date ?? last?.[0]}), ${h.days.length} days, ${h.known.length} addresses, supply ${(h.supply / 1e6).toLocaleString('en-US')} BTN`);
  }
  persistOpen();
  return h;
}
