import { useEffect, useState } from 'react';
import { KNOWN_MINING_POOLS } from '../data/miningPools';
import { OFFICIAL_BITNET_VERIFIED_CONTRACTS } from '../data/verifiedContracts';
import { KNOWN_BTS20_TOKENS } from './explorerApi';

export type AddressLabelKind = 'pool' | 'solo' | 'miner' | 'burn' | 'token' | 'contract';

export interface AddressLabel {
  name: string;
  kind: AddressLabelKind;
  /** How the label was established. */
  detail: string;
}

const staticLabels = new Map<string, AddressLabel>();

for (const c of OFFICIAL_BITNET_VERIFIED_CONTRACTS) {
  staticLabels.set(c.address.toLowerCase(), { name: c.name, kind: 'contract', detail: 'Verified contract source on the Bitnet explorer' });
}
for (const t of KNOWN_BTS20_TOKENS) {
  staticLabels.set(t.address.toLowerCase(), { name: `${t.name} (${t.symbol})`, kind: 'token', detail: 'BTS-20 token contract' });
}
for (const p of Object.values(KNOWN_MINING_POOLS)) {
  staticLabels.set(p.address.toLowerCase(), p.category === 'known'
    ? { name: p.name, kind: 'pool', detail: `Mining pool address: mines blocks and pays miners${p.url ? ` (${p.url.replace('https://', '')})` : ''}` }
    : { name: 'Solo miner', kind: 'solo', detail: 'Mines blocks directly; not a pool address' });
}
staticLabels.set('0x0000000000000000000000000000000000000000', { name: 'Burn address', kind: 'burn', detail: 'Zero address; coins sent here cannot be spent' });
staticLabels.set('0x000000000000000000000000000000000000dead', { name: 'Burn address', kind: 'burn', detail: '0x…dEaD; coins sent here cannot be spent' });

const PAYOUT_POOLS = Object.values(KNOWN_MINING_POOLS).filter((p) => p.category === 'known');
const INDEXER_BASES = ['/api/explorer', 'https://explorer.bitnetmoney.com'];
const PAGES_PER_POOL = 3;
const MIN_PAYOUTS = 2;

let payoutLabels: Map<string, AddressLabel> | null = null;
let payoutJob: Promise<Map<string, AddressLabel>> | null = null;

async function fetchJson(path: string): Promise<any> {
  for (const base of INDEXER_BASES) {
    try {
      const res = await fetch(`${base}${path}`, { headers: { Accept: 'application/json' } });
      if (res.ok) return await res.json();
    } catch {
      // try the next base
    }
  }
  return null;
}

/**
 * Addresses that received at least MIN_PAYOUTS transfers from a known pool address in the pool's
 * recent outgoing transactions (up to 150 per pool, from the explorer indexer).
 */
export function loadPoolPayoutLabels(): Promise<Map<string, AddressLabel>> {
  if (payoutLabels) return Promise.resolve(payoutLabels);
  if (payoutJob) return payoutJob;
  payoutJob = (async () => {
    const labels = new Map<string, AddressLabel>();
    await Promise.all(PAYOUT_POOLS.map(async (pool) => {
      const counts = new Map<string, number>();
      let query = '';
      for (let page = 0; page < PAGES_PER_POOL; page++) {
        const data = await fetchJson(`/api/v2/addresses/${pool.address}/transactions?filter=from${query}`);
        if (!Array.isArray(data?.items)) break;
        for (const tx of data.items) {
          const to = String(tx?.to?.hash || '').toLowerCase();
          if (!to || tx?.to?.is_contract || to === pool.address || BigInt(tx.value || '0') === 0n) continue;
          counts.set(to, (counts.get(to) || 0) + 1);
        }
        if (!data.next_page_params) break;
        query = '&' + new URLSearchParams(Object.entries(data.next_page_params).map(([k, v]) => [k, String(v)])).toString();
      }
      for (const [addr, n] of counts) {
        if (n >= MIN_PAYOUTS && !staticLabels.has(addr) && !labels.has(addr)) {
          labels.set(addr, { name: `${pool.name} miner`, kind: 'miner', detail: `Received ${n} payouts from the ${pool.name} pool address in its recent transactions` });
        }
      }
    }));
    payoutLabels = labels;
    return labels;
  })().finally(() => { payoutJob = null; });
  return payoutJob;
}

export function getAddressLabel(address: string | null | undefined): AddressLabel | null {
  const key = (address || '').toLowerCase();
  return staticLabels.get(key) ?? payoutLabels?.get(key) ?? null;
}

/** Label for an address; pool payout labels arrive after the first indexer lookup. */
export function useAddressLabel(address: string | null | undefined): AddressLabel | null {
  const [, setVersion] = useState(0);
  useEffect(() => {
    if (!address || payoutLabels) return;
    let active = true;
    loadPoolPayoutLabels().then(() => { if (active) setVersion((v) => v + 1); }).catch(() => {});
    return () => { active = false; };
  }, [address]);
  return getAddressLabel(address);
}
