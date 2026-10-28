// /api/transfers (rewritten to /api/chain-daily?view=transfers): the largest BTN transfers
// (transaction values) in the last 24 hours, 7 days and 30 days, and of all time. The stored lists
// come from scripts/chain-transfers.mjs; the blocks mined since the last hourly run are read here.
import { rpcBatch, headBlock } from './daily.js';
import { loadDataset, notReady } from './dataset.js';

const hex = (n) => '0x' + n.toString(16);
const WEI_PER_MICRO = 10n ** 12n;
// Blocks read live past the stored lists (about half a day); older gaps wait for the next run.
const MAX_TAIL = 3000;

const largest = (list, n) => [...list].sort((a, b) => b[5] - a[5] || a[1] - b[1]).slice(0, n);
const toJson = ([hash, block, timestamp, from, to, micro]) => ({ hash, block, timestamp, from, to, btn: micro / 1e6 });

async function liveTransfers(from, to) {
  const out = [];
  const starts = [];
  for (let s = from; s <= to; s += 200) starts.push(s);
  const worker = async () => {
    while (starts.length) {
      const s = starts.shift();
      const e = Math.min(to, s + 199);
      const blocks = await rpcBatch(Array.from({ length: e - s + 1 }, (_, k) => ({ method: 'eth_getBlockByNumber', params: [hex(s + k), true] })), { timeoutMs: 15000, attempts: 2 });
      for (const b of blocks) {
        for (const tx of b.transactions || []) {
          const micro = Number(BigInt(tx.value) / WEI_PER_MICRO);
          if (micro > 0) out.push([tx.hash, parseInt(b.number, 16), parseInt(b.timestamp, 16), tx.from.toLowerCase(), tx.to ? tx.to.toLowerCase() : null, micro]);
        }
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return out;
}

export async function transfersHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const data = await loadDataset(res);
  if (!data) return;
  const t = data.transfers;
  if (!t) return notReady(res, 'transfer list');

  let live = [];
  let toBlock = t.to;
  try {
    const head = await headBlock();
    if (head > t.to) {
      const from = Math.max(t.to + 1, head - MAX_TAIL + 1);
      live = await liveTransfers(from, head);
      if (from === t.to + 1) toBlock = head;
    }
  } catch {
    // serve the stored lists as they are
  }

  const recent = [...Object.values(t.days).flat(), ...live];
  const now = Math.floor(Date.now() / 1000);
  const within = (seconds) => largest(recent.filter((e) => e[2] >= now - seconds), 25).map(toJson);
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
  res.status(200).json({
    source: 'Transaction values read from every block (BTN moved inside contract calls is not included)',
    datasetGeneratedAt: data.generatedAt,
    toBlock,
    allTimeComplete: t.backTo >= t.start - 1,
    // While the all-time list is being built, it covers blocks 0..allTimeReadTo and recentFrom onwards.
    allTimeReadTo: t.backTo,
    recentFrom: t.start,
    last24h: within(86400),
    last7d: within(7 * 86400),
    last30d: within(30 * 86400),
    allTime: largest([...t.allTime, ...live], 50).map(toJson),
  });
}
