// /api/chain-daily: transactions, active addresses and new addresses per UTC day, computed from
// the chain. The history comes from chain-daily.json on the `chain-data` branch (kept hourly by
// .github/workflows/chain-daily.yml); the blocks mined since then are read here, so the current
// day is up to date. Cached at the edge for five minutes.
//
// The same function serves the other views of the dataset (the Hobby plan allows 12 functions):
// ?view=history (/api/chain-history), ?view=holding (/api/holding), ?view=transfers
// (/api/transfers), ?view=status (/api/network-status) and ?view=miner (/api/miner).
import { headBlock, extendForward } from './_lib/daily.js';
import { historyHandler, holdingHandler } from './_lib/history.js';
import { loadDataset } from './_lib/dataset.js';
import { transfersHandler } from './_lib/transfers.js';
import { statusHandler } from './_lib/status.js';
import { minerHandler } from './_lib/miners.js';

const VIEWS = { history: historyHandler, holding: holdingHandler, transfers: transfersHandler, status: statusHandler, miner: minerHandler };
// Blocks read live past the stored dataset: about two days, so the page stays current even if
// some hourly runs are missed. Beyond that it waits for the next run.
const MAX_TAIL = 12000;

export default async function handler(req, res) {
  const view = VIEWS[req.query?.view];
  if (view) return view(req, res);
  res.setHeader('Access-Control-Allow-Origin', '*');
  const data = await loadDataset(res, 8000);
  if (!data) return;

  let live = data;
  let liveTail = 0;
  try {
    const head = await headBlock();
    if (head > data.to && head - data.to <= MAX_TAIL) {
      live = await extendForward(data, head, { workers: 3 });
      liveTail = head - data.to;
    }
  } catch {
    // serve the stored dataset as it is
  }

  const p = live.partial;
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  res.status(200).json({
    source: 'Computed from Bitnet blocks and archive state',
    datasetGeneratedAt: data.generatedAt,
    fromBlock: live.from,
    toBlock: live.to,
    liveBlocks: liveTail,
    genesisReached: Boolean(live.genesisReached),
    // The genesis block carries timestamp 0, which would show as a day in 1970.
    days: live.days.filter((d) => !(d.first === 0 && d.last === 0)).map((d) => [d.date, d.txs, d.active, d.senders ?? null, d.new]),
    columns: ['date', 'transactions', 'activeAddresses', 'senders', 'newAddresses'],
    today: p ? { date: p.date, firstBlock: p.first, lastBlock: p.last, transactions: p.txs, activeAddresses: p.addresses.length, senders: p.senders?.length ?? null, newAddresses: p.newAddresses.length } : null,
  });
}
