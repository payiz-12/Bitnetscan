export interface SupplySnapshot {
  updatedAt: string;
  blockRange: [number, number];
  totalSupply: string;
  circulatingSupply: string;
  burned: string;
  baseIssuance: string;
  accounts: number;
}

// Written hourly by .github/workflows/supply-snapshot.yml (sum of all account balances).
// raw.githubusercontent.com allows cross-origin reads, so this works in development too.
const SNAPSHOT_URL = 'https://raw.githubusercontent.com/payiz-12/Bitnetscan/data/supply.json';

let cached: { at: number; value: SupplySnapshot | null } | null = null;
let pending: Promise<SupplySnapshot | null> | null = null;

export function fetchSupplySnapshot(): Promise<SupplySnapshot | null> {
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return Promise.resolve(cached.value);
  if (pending) return pending;
  pending = fetch(SNAPSHOT_URL, { signal: AbortSignal.timeout(8000) })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => (data && typeof data.totalSupply === 'string' ? (data as SupplySnapshot) : null))
    .catch(() => null)
    .then((value) => {
      cached = { at: Date.now(), value };
      return value;
    })
    .finally(() => { pending = null; });
  return pending;
}
