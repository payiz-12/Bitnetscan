// Daily network usage computed from the chain itself: for every UTC day, the number of
// transactions, the active addresses (senders and recipients of those transactions) and the new
// addresses among them. An address counts as new on a day when the archive state at the end of
// the previous day has no balance, no nonce and no code for it: the chain had never seen it.
//
// Shared by scripts/chain-daily.mjs (hourly GitHub workflow that keeps the dataset) and
// api/chain-daily.js (adds the blocks mined since the last run).

export const RPC = ['https://rpc.bitnetmoney.org/', 'https://rpc.bitnetmoney.com/'];
const hex = (n) => '0x' + n.toString(16);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const utcDate = (ts) => new Date(ts * 1000).toISOString().slice(0, 10);

/** JSON-RPC batch with retries; every answer must be present. */
export async function rpcBatch(calls, { timeoutMs = 60000, attempts = 5 } = {}) {
  const body = JSON.stringify(calls.map((c, id) => ({ jsonrpc: '2.0', id, method: c.method, params: c.params })));
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    for (const url of RPC) {
      try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(timeoutMs) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const byId = new Map((Array.isArray(data) ? data : [data]).map((d) => [d.id, d]));
        const out = calls.map((_, id) => byId.get(id));
        const bad = out.find((d) => !d || d.error || d.result === undefined);
        if (bad) throw new Error(bad?.error?.message || 'missing answer');
        return out.map((d) => d.result);
      } catch (err) {
        lastError = err;
      }
    }
    await sleep(2000 * (attempt + 1));
  }
  throw new Error(`RPC batch failed: ${lastError?.message}`);
}

export async function headBlock() {
  const [h] = await rpcBatch([{ method: 'eth_blockNumber', params: [] }]);
  return parseInt(h, 16);
}

/** Blocks [from, to] as { number, timestamp, txs: [[from, to]] }, oldest first. */
export async function fetchBlocks(from, to, { size = 200, workers = 3, onProgress } = {}) {
  const ranges = [];
  for (let s = from; s <= to; s += size) ranges.push([s, Math.min(to, s + size - 1)]);
  const out = new Array(ranges.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < ranges.length) {
      const i = next++;
      const [a, b] = ranges[i];
      const res = await rpcBatch(Array.from({ length: b - a + 1 }, (_, k) => ({ method: 'eth_getBlockByNumber', params: [hex(a + k), true] })));
      out[i] = res.map((blk) => ({
        number: parseInt(blk.number, 16),
        timestamp: parseInt(blk.timestamp, 16),
        txs: (blk.transactions || []).map((tx) => [tx.from.toLowerCase(), tx.to ? tx.to.toLowerCase() : null]),
      }));
      done += b - a + 1;
      onProgress?.(done, to - from + 1);
    }
  };
  await Promise.all(Array.from({ length: Math.min(workers, ranges.length) }, worker));
  return out.flat();
}

/** Groups blocks by UTC day: { date: { date, first, last, txs, addresses: Set, senders: Set } }. */
export function groupByDay(blocks, into = new Map()) {
  for (const b of blocks) {
    const date = utcDate(b.timestamp);
    let d = into.get(date);
    if (!d) { d = { date, first: b.number, last: b.number, txs: 0, addresses: new Set(), senders: new Set() }; into.set(date, d); }
    d.first = Math.min(d.first, b.number);
    d.last = Math.max(d.last, b.number);
    d.txs += b.txs.length;
    for (const [from, to] of b.txs) { d.addresses.add(from); d.senders.add(from); if (to) d.addresses.add(to); }
  }
  return into;
}

/** Addresses with no balance, nonce or code at block `atBlock` (all of them before block 0). */
export async function unseenAt(addresses, atBlock) {
  const list = [...addresses];
  if (atBlock < 0) return list;
  const out = [];
  for (let i = 0; i < list.length; i += 60) {
    const chunk = list.slice(i, i + 60);
    const res = await rpcBatch(chunk.flatMap((a) => [
      { method: 'eth_getTransactionCount', params: [a, hex(atBlock)] },
      { method: 'eth_getBalance', params: [a, hex(atBlock)] },
      { method: 'eth_getCode', params: [a, hex(atBlock)] },
    ]));
    chunk.forEach((a, j) => {
      const [nonce, balance, code] = res.slice(j * 3, j * 3 + 3);
      if (BigInt(nonce) === 0n && BigInt(balance) === 0n && (!code || code === '0x')) out.push(a);
    });
  }
  return out;
}

/** A finished day for the dataset. */
export async function finishDay(d) {
  const fresh = await unseenAt(d.addresses, d.first - 1);
  return { date: d.date, first: d.first, last: d.last, txs: d.txs, active: d.addresses.size, senders: d.senders.size, new: fresh.length };
}

/**
 * Extends `data` with blocks after `data.to` up to `head`: finished days move into `days`, the
 * current day stays in `partial` with its address lists so later blocks can be merged.
 */
export async function extendForward(data, head, opts = {}) {
  if (head <= data.to) return data;
  const blocks = await fetchBlocks(data.to + 1, head, opts);
  const map = new Map();
  if (data.partial) {
    map.set(data.partial.date, { date: data.partial.date, first: data.partial.first, last: data.partial.last, txs: data.partial.txs, addresses: new Set(data.partial.addresses), senders: new Set(data.partial.senders ?? []), fresh: new Set(data.partial.newAddresses) });
  }
  groupByDay(blocks, map);
  const dates = [...map.keys()].sort();
  const today = dates.pop();
  const days = [...data.days];
  for (const date of dates) days.push(await finishDay(map.get(date)));
  const t = map.get(today);
  // New addresses of the current day: the ones already found stay, the rest are checked.
  const known = t.fresh ?? new Set();
  const checked = new Set(data.partial && data.partial.date === today ? data.partial.addresses : []);
  const unchecked = [...t.addresses].filter((a) => !checked.has(a));
  for (const a of await unseenAt(unchecked, t.first - 1)) known.add(a);
  return {
    ...data,
    days,
    to: head,
    partial: { date: today, first: t.first, last: t.last, txs: t.txs, addresses: [...t.addresses], senders: [...t.senders], newAddresses: [...known] },
  };
}
