// /api/chain-history: exact mining, supply and holding history computed from every block (see
// scripts/chain-history.mjs). Served from the `history` part of chain-daily.json on the
// `chain-data` branch, without the per-address state. Amounts are converted from µBTN to BTN.
const DATA_URL = 'https://raw.githubusercontent.com/payiz-12/Bitnetscan/chain-data/chain-daily.json';
const BTN = (micro) => micro / 1e6;

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  let data;
  try {
    const r = await fetch(DATA_URL, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    data = await r.json();
  } catch {
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    res.status(503).json({ error: 'The history dataset is not available' });
    return;
  }
  const h = data.history;
  if (!h) {
    res.setHeader('Cache-Control', 'public, s-maxage=300');
    res.status(503).json({ error: 'The history is not computed yet' });
    return;
  }

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
    holdBandDays: [30, 90, 180, 365, 730, 1095],
    miners: h.miners,
    columns: ['date', 'firstBlock', 'lastBlock', 'blocks', 'uncles', 'issuedBtn', 'blocksByMiner'],
    days: h.days.map(([date, first, last, blocks, uncles, issued, miners]) => [date, first, last, blocks, uncles, BTN(issued), miners]),
    monthEnds: h.months.map(snapshot),
    latest: snapshot(h.latest),
  });
}
