#!/usr/bin/env node
// Keeps the daily network usage dataset (transactions, active addresses, new addresses per UTC
// day), computed from the chain's blocks and archive state. Run hourly by
// .github/workflows/chain-daily.yml: it adds the blocks mined since the last run, then spends the
// rest of its time budget going further back in history until it reaches the genesis block.
// Whatever time is left goes to the exact mining, supply and holding history
// (scripts/chain-history.mjs), which reads forward from the genesis block, and then to the largest
// transfers (scripts/chain-transfers.mjs). Each run starts with an availability check of the RPC
// nodes, explorers and pools (scripts/chain-status.mjs).
//
// Usage: node scripts/chain-daily.mjs <previous.json|none> <output.json> [--backfill-seconds N]

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { rpcBatch, headBlock, fetchBlocks, groupByDay, finishDay, extendForward } from '../api/_lib/daily.js';
import { emptyHistory, extendHistory } from './chain-history.mjs';
import { emptyTransfers, extendTransfers } from './chain-transfers.mjs';
import { sampleStatus } from './chain-status.mjs';

const [input = 'none', output = 'chain-daily.json', ...rest] = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = rest.indexOf(name);
  return i >= 0 ? Number(rest[i + 1]) : fallback;
};
const BACKFILL_SECONDS = flag('--backfill-seconds', 1800);
const CHUNK = 20_000; // blocks per backfill step, about 100 s at the public RPC's pace
const SAFETY = 6; // stay a few blocks behind the head

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const startedAt = Date.now();

/**
 * Runs `fn` until it succeeds, waiting a minute after each failure, so a dropped connection or a
 * sleeping laptop pauses the work instead of ending it. Gives up (returns null) after `until`.
 */
async function patiently(fn, label, until) {
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

const save = (data) => writeFileSync(output, JSON.stringify({ ...data, generatedAt: new Date().toISOString() }));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function timestampOf(n) {
  const [b] = await rpcBatch([{ method: 'eth_getBlockByNumber', params: ['0x' + n.toString(16), false] }]);
  return parseInt(b.timestamp, 16);
}

/** First block whose timestamp is on or after `ts` (binary search over headers). */
async function firstBlockAtOrAfter(ts, hi) {
  let lo = 0;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if ((await timestampOf(mid)) < ts) lo = mid + 1; else hi = mid;
  }
  return lo;
}

async function backfill(data, seconds) {
  const stopAt = Date.now() + seconds * 1000;
  const pending = new Map();
  let low = data.from;
  while (!data.genesisReached && Date.now() < stopAt) {
    const end = low - 1;
    if (end < 0) { data.genesisReached = true; break; }
    const start = Math.max(0, end - CHUNK + 1);
    const blocks = await patiently(() => fetchBlocks(start, end), `blocks ${start}-${end}`, stopAt);
    if (!blocks) break;
    groupByDay(blocks, pending);
    low = start;
    // Everything above the earliest day seen so far is complete; that day may continue below.
    const dates = [...pending.keys()].sort();
    const complete = start === 0 ? dates : dates.slice(1);
    const finished = [];
    for (const date of complete) {
      const day = await patiently(() => finishDay(pending.get(date)), `day ${date}`, stopAt);
      if (!day) return data;
      finished.push(day);
      pending.delete(date);
    }
    if (finished.length) {
      data.days = [...finished, ...data.days].sort((a, b) => a.date.localeCompare(b.date));
      data.from = Math.min(...finished.map((d) => d.first));
    }
    if (start === 0) data.genesisReached = true;
    save(data);
    log(`backfill: ${data.days.length} days, from block ${data.from} (${data.days[0]?.date ?? '—'})`);
  }
  return data;
}

let data = input !== 'none' && existsSync(input) ? JSON.parse(readFileSync(input, 'utf8')) : null;
const head = (await patiently(headBlock, 'head', Date.now() + BACKFILL_SECONDS * 1000)) - SAFETY;

if (!data) {
  // Start at the first block of the current UTC day, so every stored day is whole.
  const now = await timestampOf(head);
  const dayStart = Math.floor(now / 86400) * 86400;
  const first = await firstBlockAtOrAfter(dayStart, head);
  data = { version: 1, from: first, to: first - 1, days: [], partial: null, genesisReached: first === 0 };
  log(`new dataset from block ${first}`);
}

const checks = await sampleStatus(data);
log(`status: ${checks.filter((c) => c[0]).length} of ${checks.length} services answered`);

data = (await patiently(() => extendForward(data, head), 'forward', Date.now() + BACKFILL_SECONDS * 1000)) ?? data;
save(data);
log(`forward: to block ${data.to}, ${data.days.length} days, today ${data.partial?.txs ?? 0} txs`);

data = await backfill(data, BACKFILL_SECONDS);
save(data);
log(`done: ${data.days.length} days (${data.days[0]?.date ?? '—'} – ${data.days.at(-1)?.date ?? '—'}), genesis reached: ${data.genesisReached}`);

data.history ??= emptyHistory();
await extendHistory(data.history, head, startedAt + BACKFILL_SECONDS * 1000, { log: (...a) => log(...a), save: () => save(data) });
save(data);
log(`history: to block ${data.history.to} of ${head}, ${data.history.days.length} days, ${data.history.months.length} month ends`);

data.transfers ??= emptyTransfers(data);
await extendTransfers(data.transfers, head, startedAt + BACKFILL_SECONDS * 1000, { log: (...a) => log(...a), save: () => save(data) });
save(data);
log(`transfers: to block ${data.transfers.to}, all-time list read to ${data.transfers.backTo} of ${data.transfers.start - 1}`);
