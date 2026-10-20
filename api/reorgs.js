// GET /api/reorgs -> blocks the Bitnet explorer indexer stored and later saw replaced by
// another chain (chain reorganizations), newest first.
//
// The indexer takes about 20 s to answer this query, so the result is cached at the edge
// for 15 minutes and served stale while it refreshes.

const INDEXER_URL = 'https://explorer.bitnetmoney.com/api/v2/blocks?type=reorg';

export default async function handler(req, res) {
  try {
    const response = await fetch(INDEXER_URL, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(50000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const items = (Array.isArray(data?.items) ? data.items : []).map((b) => ({
      height: Number(b.height),
      hash: b.hash,
      timestamp: b.timestamp,
      miner: String(b.miner?.hash || '').toLowerCase(),
    }));
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=86400');
    res.status(200).json({ updatedAt: new Date().toISOString(), source: 'explorer.bitnetmoney.com', items });
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).json({ error: 'Explorer did not answer' });
  }
}
