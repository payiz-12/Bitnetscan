// /api/miner (rewritten to /api/chain-daily?view=miner): what miners earned and sent, from
// scripts/chain-rewards.mjs. Without ?address, every miner's totals; with ?address=0x…, that
// miner's days. Earned is block rewards plus uncle rewards (transaction fees are left out); sent is
// the BTN its transactions carried.
import { loadDataset, notReady } from './dataset.js';

const BTN = (micro) => micro / 1e6;

export async function minerHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const address = req.query?.address ? String(req.query.address).toLowerCase() : null;
  if (address !== null && !/^0x[0-9a-f]{40}$/.test(address)) {
    res.status(400).json({ error: 'Pass ?address=0x… (40 hex characters), or no address for every miner' });
    return;
  }
  const data = await loadDataset(res);
  if (!data) return;
  const r = data.rewards;
  if (!r || !r.days.length) return notReady(res, 'miner history');

  const progress = { toBlock: r.days.at(-1)[2], chainBlock: data.to, firstDay: r.days[0][0], lastDay: r.days.at(-1)[0] };
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');

  if (address === null) {
    const totals = r.miners.map((m) => ({ address: m, blocks: 0, uncles: 0, earned: 0, sent: 0, sends: 0, firstDay: null, lastDay: null }));
    for (const [date, , , rows] of r.days) {
      for (const [i, blocks, uncles, earned, sent, sends] of rows) {
        const t = totals[i];
        t.blocks += blocks; t.uncles += uncles; t.earned += earned; t.sent += sent; t.sends += sends;
        if (blocks || uncles) { t.firstDay ??= date; t.lastDay = date; }
      }
    }
    res.status(200).json({
      ...progress,
      miners: totals.filter((t) => t.blocks || t.uncles).sort((a, b) => b.blocks - a.blocks || b.uncles - a.uncles)
        .map((t) => ({ ...t, earned: BTN(t.earned), sent: BTN(t.sent) })),
    });
    return;
  }

  const i = r.miners.indexOf(address);
  const days = [];
  if (i >= 0) {
    for (const [date, first, last, rows] of r.days) {
      const blocksThatDay = rows.reduce((s, x) => s + x[1], 0);
      const row = rows.find((x) => x[0] === i);
      if (row) days.push([date, row[1], row[2], BTN(row[3]), BTN(row[4]), row[5], BTN(row[6]), blocksThatDay, first, last]);
    }
  }
  res.status(200).json({
    ...progress,
    address,
    mined: i >= 0,
    columns: ['date', 'blocks', 'uncles', 'earnedBtn', 'sentBtn', 'sends', 'balanceBtn', 'blocksThatDay', 'firstBlock', 'lastBlock'],
    // Only the days on which the miner mined, had an uncle or sent BTN.
    days,
  });
}
