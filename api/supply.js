// GET /api/supply              -> circulating supply as plain text (e.g. for CoinGecko / CoinMarketCap)
// GET /api/supply?q=total      -> total supply as plain text
// GET /api/supply?format=json  -> full snapshot with block range and method
//
// The snapshot is the sum of all account balances, recomputed hourly by
// .github/workflows/supply-snapshot.yml and stored on this repository's `data` branch.

const SNAPSHOT_URL = 'https://raw.githubusercontent.com/payiz-12/Bitnetscan/data/supply.json';

export default async function handler(req, res) {
  const params = new URL(req.url, 'http://localhost').searchParams;
  try {
    const response = await fetch(SNAPSHOT_URL, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const snapshot = await response.json();

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    if (params.get('format') === 'json') {
      res.status(200).json(snapshot);
      return;
    }
    const value = params.get('q') === 'total' ? snapshot.totalSupply : snapshot.circulatingSupply;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(String(value));
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).send('Supply snapshot unavailable');
  }
}
