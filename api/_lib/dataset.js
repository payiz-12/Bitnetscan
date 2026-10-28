// chain-daily.json on the `chain-data` branch: the dataset kept hourly by
// .github/workflows/chain-daily.yml (scripts/chain-daily.mjs), read by every view of
// /api/chain-daily.
export const DATA_URL = 'https://raw.githubusercontent.com/payiz-12/Bitnetscan/chain-data/chain-daily.json';

/** The stored dataset, or null when it cannot be read; answers 503 in that case. */
export async function loadDataset(res, timeoutMs = 10000) {
  try {
    const r = await fetch(DATA_URL, { signal: AbortSignal.timeout(timeoutMs) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch {
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    res.status(503).json({ error: 'The dataset is not available' });
    return null;
  }
}

export const notReady = (res, what) => {
  res.setHeader('Cache-Control', 'public, s-maxage=300');
  res.status(503).json({ error: `The ${what} is not computed yet` });
};
