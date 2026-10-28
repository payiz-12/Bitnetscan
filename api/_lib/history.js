// /api/chain-history (rewritten to /api/chain-daily?view=history, as the Hobby plan allows 12
// functions): exact mining, supply and holding history computed from every block (see
// scripts/chain-history.mjs). Served from the `history` part of chain-daily.json on the
// `chain-data` branch, without the per-address state. Amounts are converted from µBTN to BTN.
import { loadDataset, notReady } from './dataset.js';

const BTN = (micro) => micro / 1e6;
const HOLD_BAND_DAYS = [30, 90, 180, 365, 730, 1095];
const dateOfDay = (day) => new Date(day * 86400000).toISOString().slice(0, 10);

const snapshot = (s) => s && ({
  date: s.date,
  block: s.block,
  supply: BTN(s.supply),
  tracked: BTN(s.tracked),
  burned: BTN(s.burned),
  holders: s.holders,
  holdersWithOneBtn: s.holders1,
  top1: BTN(s.top1),
  top10: BTN(s.top10),
  top100: BTN(s.top100),
  holdingBands: s.bands.map(BTN),
  movedByContracts: s.movedByContracts ?? null,
});

export async function historyHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const data = await loadDataset(res);
  if (!data) return;
  const h = data.history;
  if (!h) return notReady(res, 'history');

  const lastDay = h.days.at(-1);
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
  res.status(200).json({
    source: 'Computed from every Bitnet block and the archive state',
    datasetGeneratedAt: data.generatedAt,
    toBlock: h.to,
    chainBlock: data.to,
    // Supply at the end of the last complete day (the history's current day is still open).
    supply: BTN(h.supply - (h.open?.issued ?? 0)),
    supplyBlock: lastDay ? lastDay[2] : 0,
    addresses: h.known.length,
    holdBandDays: HOLD_BAND_DAYS,
    miners: h.miners,
    columns: ['date', 'firstBlock', 'lastBlock', 'blocks', 'uncles', 'issuedBtn', 'blocksByMiner'],
    days: h.days.map(([date, first, last, blocks, uncles, issued, miners]) => [date, first, last, blocks, uncles, BTN(issued), miners]),
    monthEnds: h.months.map(snapshot),
    latest: snapshot(h.latest),
  });
}

/**
 * /api/holding?address=0x… (rewritten to /api/chain-daily?view=holding): how long the BTN at one
 * address has stayed there, at the end of the last complete UTC day. Each layer is an amount that
 * has not left the address since a day; days are kept per week past a week and per 30 days past a
 * year, always rounded towards the present, so a holding time is never overstated.
 */
export async function holdingHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const address = String(req.query?.address || '').toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(address)) {
    res.status(400).json({ error: 'Pass ?address=0x… (40 hex characters)' });
    return;
  }
  const data = await loadDataset(res);
  if (!data) return;
  const h = data.history;
  if (!h || !h.days.length) return notReady(res, 'history');

  const [date, , block] = h.days.at(-1);
  const today = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
  const record = h.held[address] ?? [];
  const bands = new Array(HOLD_BAND_DAYS.length + 1).fill(0);
  let below = 0;
  const layers = record.map(([since, amount]) => {
    const age = today - since;
    const band = HOLD_BAND_DAYS.findIndex((limit) => age < limit);
    bands[band < 0 ? HOLD_BAND_DAYS.length : band] += amount - below;
    const layer = { since: dateOfDay(since), days: age, btn: BTN(amount - below) };
    below = amount;
    return layer;
  });

  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
  res.status(200).json({
    address,
    asOf: date,
    block,
    // Whether BitnetScan follows the address: it sent or received a transaction, mined, or was created.
    followed: h.known.includes(address),
    balance: BTN(below),
    holdBandDays: HOLD_BAND_DAYS,
    holdingBands: bands.map(BTN),
    layers,
  });
}
