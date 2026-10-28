// What every miner earned and sent, per UTC day, computed from every block since genesis. Kept in
// chain-daily.json under `rewards` by scripts/chain-daily.mjs, resumable like the history.
//
// For each address that mined a block or an uncle, per day: blocks, uncles, BTN earned (1 BTN per
// block, +1/32 BTN per uncle its blocks include, (8 − depth)/8 BTN per uncle it mined; transaction
// fees, about 20 BTN over the whole chain, are left out), BTN it sent in transactions and how many
// such transactions, and its balance at the end of the day, read from the archive state. For a
// pool, earned against sent shows how much of its rewards it pays out.
// Amounts are µBTN integers.

import { utcDate } from '../api/_lib/daily.js';
import { batched, patiently } from './chain-history.mjs';

const hex = (n) => '0x' + n.toString(16);
const WEI_PER_MICRO = 10n ** 12n;
const BLOCK_REWARD = 1_000_000;
const NEPHEW_REWARD = 31_250;
const uncleReward = (depth) => (8 - depth) * 125_000;
const CHUNK = 10_000;

export const emptyRewards = () => ({ version: 1, to: 0, miners: [], days: [], open: null });

async function readChunk(from, to) {
  const raw = await batched(Array.from({ length: to - from + 1 }, (_, k) => ({ method: 'eth_getBlockByNumber', params: [hex(from + k), true] })));
  const uncleRefs = raw.flatMap((b) => (b.uncles || []).map((_, i) => ({ method: 'eth_getUncleByBlockNumberAndIndex', params: [b.number, hex(i)] })));
  const uncles = await batched(uncleRefs);
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
      sends: (b.transactions || []).flatMap((tx) => {
        const micro = Number(BigInt(tx.value) / WEI_PER_MICRO);
        return micro > 0 ? [[tx.from.toLowerCase(), micro]] : [];
      }),
    };
  });
}

const balancesAt = async (addresses, block) =>
  (await batched(addresses.map((a) => ({ method: 'eth_getBalance', params: [a, hex(block)] })))).map((w) => Number(BigInt(w) / WEI_PER_MICRO));

/**
 * Reads blocks after `r.to` up to `head` until `until` (ms). A day is written once its last block
 * is read and the balances of its miners are known.
 */
export async function extendRewards(r, head, until, { log = console.log, save = () => {} } = {}) {
  const index = new Map(r.miners.map((m, i) => [m, i]));
  let open = r.open && { ...r.open, rows: new Map(r.open.rows.map(([i, ...v]) => [i, v])) };
  const persist = () => { r.open = open && { ...open, rows: [...open.rows].map(([i, v]) => [i, ...v]) }; };
  const idOf = (address) => {
    if (!index.has(address)) { index.set(address, r.miners.length); r.miners.push(address); }
    return index.get(address);
  };
  // [blocks, uncles, earned, sent, sends]
  const row = (i) => {
    if (!open.rows.has(i)) open.rows.set(i, [0, 0, 0, 0, 0]);
    return open.rows.get(i);
  };

  const closeDay = async () => {
    const ids = [...open.rows.keys()];
    const balances = await patiently(() => balancesAt(ids.map((i) => r.miners[i]), open.last), `miner balances ${open.date}`, until, log);
    if (!balances) return false;
    const rows = ids.map((i, k) => [i, ...open.rows.get(i), balances[k]]).sort((a, b) => b[1] - a[1] || b[3] - a[3]);
    r.days.push([open.date, open.first, open.last, rows]);
    open = null;
    return true;
  };

  while (r.to < head && Date.now() < until) {
    const from = r.to + 1;
    const to = Math.min(head, from + CHUNK - 1);
    const blocks = await patiently(() => readChunk(from, to), `reward blocks ${from}-${to}`, until, log);
    if (!blocks) break;
    for (const b of blocks) {
      const date = utcDate(b.timestamp);
      if (open && open.date !== date && !(await closeDay())) {
        persist();
        return r;
      }
      if (!open) open = { date, first: b.number, last: b.number, rows: new Map() };
      const mined = row(idOf(b.miner));
      mined[0] += 1;
      mined[2] += BLOCK_REWARD + NEPHEW_REWARD * b.uncles.length;
      for (const u of b.uncles) {
        const uncle = row(idOf(u.miner));
        uncle[1] += 1;
        uncle[2] += uncleReward(u.depth);
      }
      for (const [sender, micro] of b.sends) {
        if (!index.has(sender)) continue;
        const sent = row(index.get(sender));
        sent[3] += micro;
        sent[4] += 1;
      }
      open.last = b.number;
      r.to = b.number;
    }
    persist();
    save();
    log(`rewards: to block ${r.to} (${open?.date ?? r.days.at(-1)?.[0]}), ${r.days.length} days, ${r.miners.length} miners`);
  }
  persist();
  return r;
}
