// The largest BTN transfers (transaction values), kept in chain-daily.json under `transfers` by
// scripts/chain-daily.mjs: for each of the last 31 UTC days its largest transfers, and the largest
// of all time. The recent days are read first, from 31 days back to the head; the rest of the
// chain is then read from the genesis block for the all-time list, over as many runs as it takes.
// Amounts are µBTN integers. BTN moved inside contract calls (internal transfers) is not included.

import { utcDate } from '../api/_lib/daily.js';
import { batched, patiently } from './chain-history.mjs';

const hex = (n) => '0x' + n.toString(16);
const WEI_PER_MICRO = 10n ** 12n;
const CHUNK = 20_000;
const KEEP_DAYS = 31;
const KEEP_PER_DAY = 30;
const KEEP_ALL_TIME = 100;

/** [hash, block, timestamp, from, to (null for a contract creation), µBTN] for every transfer in [from, to]. */
export async function readTransfers(from, to) {
  const blocks = await batched(Array.from({ length: to - from + 1 }, (_, k) => ({ method: 'eth_getBlockByNumber', params: [hex(from + k), true] })));
  return blocks.flatMap((b) => (b.transactions || []).flatMap((tx) => {
    const micro = Number(BigInt(tx.value) / WEI_PER_MICRO);
    return micro > 0 ? [[tx.hash, parseInt(b.number, 16), parseInt(b.timestamp, 16), tx.from.toLowerCase(), tx.to ? tx.to.toLowerCase() : null, micro]] : [];
  }));
}

export const largest = (list, n) => [...list].sort((a, b) => b[5] - a[5] || a[1] - b[1]).slice(0, n);

/** A new record starting at the first block of the day KEEP_DAYS days before the last stored day. */
export const emptyTransfers = (data) => {
  const start = data.days.at(-KEEP_DAYS)?.first ?? data.from;
  return { version: 1, start, to: start - 1, backTo: -1, days: {}, allTime: [] };
};

/**
 * Reads forward from `t.to` to `head`, then back-fills the all-time list from the genesis block,
 * until `until` (ms). Each step is written whole, so the record stays consistent.
 */
export async function extendTransfers(t, head, until, { log = console.log, save = () => {} } = {}) {
  while (t.to < head && Date.now() < until) {
    const from = t.to + 1;
    const to = Math.min(head, from + CHUNK - 1);
    const found = await patiently(() => readTransfers(from, to), `transfers ${from}-${to}`, until, log);
    if (!found) break;
    const touched = new Set();
    for (const e of found) {
      const date = utcDate(e[2]);
      (t.days[date] ??= []).push(e);
      touched.add(date);
    }
    for (const date of touched) t.days[date] = largest(t.days[date], KEEP_PER_DAY);
    t.allTime = largest([...t.allTime, ...found], KEEP_ALL_TIME);
    const dates = Object.keys(t.days).sort();
    const keepFrom = new Date(Date.parse(`${dates.at(-1)}T00:00:00Z`) - KEEP_DAYS * 86400000).toISOString().slice(0, 10);
    for (const date of dates) if (date < keepFrom) delete t.days[date];
    t.to = to;
    save();
    log(`transfers: to block ${to}, ${found.length} transfers in this step`);
  }
  while (t.backTo < t.start - 1 && Date.now() < until) {
    const from = t.backTo + 1;
    const to = Math.min(t.start - 1, from + CHUNK - 1);
    const found = await patiently(() => readTransfers(from, to), `all-time transfers ${from}-${to}`, until, log);
    if (!found) break;
    t.allTime = largest([...t.allTime, ...found], KEEP_ALL_TIME);
    t.backTo = to;
    save();
    if (to % 200_000 < CHUNK) log(`transfers: all-time list read to block ${to} of ${t.start - 1}`);
  }
  return t;
}
