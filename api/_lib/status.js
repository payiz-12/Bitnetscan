// /api/network-status (rewritten to /api/chain-daily?view=status): hourly availability checks of
// the Bitnet RPC nodes, explorers and mining pools over the last 30 days, made from GitHub Actions
// by scripts/chain-status.mjs. Each check is [answered (1/0), block or null, milliseconds or null].
import { loadDataset, notReady } from './dataset.js';

export async function statusHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const data = await loadDataset(res);
  if (!data) return;
  const s = data.status;
  if (!s || !s.samples.length) return notReady(res, 'status history');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
  res.status(200).json({
    source: 'Checked hourly from GitHub Actions',
    services: s.ids,
    columns: ['checkedAt', 'checks: [answered, block, milliseconds] per service'],
    samples: s.samples,
  });
}
