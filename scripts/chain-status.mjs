// Hourly availability check of the services Bitnet users rely on, run at the start of every
// scripts/chain-daily.mjs run (GitHub Actions) and kept for 30 days in chain-daily.json under
// `status`. Each check records whether the service answered, the block it reported (RPC head, or
// the explorer's latest indexed block) and how long it took.

const TARGETS = [
  { id: 'rpc-org', kind: 'rpc', url: 'https://rpc.bitnetmoney.org/' },
  { id: 'rpc-com', kind: 'rpc', url: 'https://rpc.bitnetmoney.com/' },
  { id: 'bitnetscan-rpc', kind: 'rpc', url: 'https://bitnetscan.vercel.app/api/rpc' },
  { id: 'explorer-com', kind: 'explorer', url: 'https://explorer.bitnetmoney.com/api/v2/main-page/blocks' },
  { id: 'explorer-org', kind: 'explorer', url: 'https://explorer.bitnetmoney.org/api/v2/main-page/blocks' },
  { id: 'gtpool', kind: 'web', url: 'https://gtpool.io/' },
  { id: 'coolpool', kind: 'web', url: 'https://coolpool.top/api/coin/btnsolo' },
];
const KEEP_SECONDS = 30 * 86400;

/** [answered (1/0), block or null, milliseconds or null]. */
async function probe(t) {
  const start = Date.now();
  try {
    let block = null;
    if (t.kind === 'rpc') {
      const r = await fetch(t.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
        signal: AbortSignal.timeout(15000),
      });
      block = parseInt((await r.json()).result, 16);
    } else if (t.kind === 'explorer') {
      const r = await fetch(t.url, { signal: AbortSignal.timeout(15000) });
      block = Number((await r.json())[0]?.height);
    } else {
      const r = await fetch(t.url, { signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await r.arrayBuffer();
    }
    if (block !== null && !Number.isFinite(block)) throw new Error('no block number');
    return [1, block, Date.now() - start];
  } catch {
    return [0, null, null];
  }
}

/** Adds one check of every service to `data.status`, dropping checks older than 30 days. */
export async function sampleStatus(data) {
  const results = await Promise.all(TARGETS.map(probe));
  const ids = TARGETS.map((t) => t.id);
  const now = Math.floor(Date.now() / 1000);
  if (!data.status || data.status.ids.join() !== ids.join()) data.status = { ids, samples: [] };
  data.status.samples.push([now, results]);
  data.status.samples = data.status.samples.filter(([at]) => at >= now - KEEP_SECONDS);
  return results;
}
