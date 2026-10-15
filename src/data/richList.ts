import officialData from './official_rich_list.json';
import { ethers } from 'ethers';
import { rpcService } from '../services/rpc';
import { fetchSupplySnapshot } from '../services/supply';

export interface RichAccount {
  rank: number;
  address: string;
  balance: number;
  balanceFormatted: string;
  percentage: string;
  /** Outgoing transactions (account nonce); null when the RPC did not answer. */
  txCount: number | null;
  balanceLive?: boolean;
  isContract?: boolean;
  name?: string;
}

export interface TopAccountsResult {
  accounts: RichAccount[];
  /** 'indexer': chain-wide ranking from the explorer indexer; 'snapshot': fallback address list. */
  source: 'indexer' | 'snapshot';
  updatedAt: number;
  /** What percentages are relative to: the hourly circulating-supply snapshot, or base issuance (block height × 1 BTN). */
  percentageBasis: 'supply' | 'issuance';
}

// Previously known large holders; used only when the indexer ranking is unavailable.
export const VERIFIED_HODL_WALLETS: RichAccount[] = officialData as RichAccount[];

const INDEXER_BASES = ['/api/explorer', '/api/bitnet-explorer', 'https://explorer.bitnetmoney.com'];

const formatBalance = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

async function fetchIndexerTopAccounts(): Promise<{ address: string; balanceWei: string; isContract: boolean; name?: string }[]> {
  for (const base of INDEXER_BASES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(`${base}/api/v2/addresses`, { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data?.items) || data.items.length === 0) continue;
      return data.items
        .filter((item: any) => /^0x[0-9a-fA-F]{40}$/.test(item?.hash || ''))
        .map((item: any) => ({
          address: item.hash,
          balanceWei: String(item.coin_balance ?? '0'),
          isContract: item.is_contract === true,
          name: item.name || undefined,
        }));
    } catch {
      // try the next indexer
    } finally {
      clearTimeout(timer);
    }
  }
  return [];
}

let cached: TopAccountsResult | null = null;
let pending: Promise<TopAccountsResult> | null = null;

/**
 * Top accounts by balance. The ranking comes from the explorer indexer (whole chain);
 * every balance and nonce is then read from the Bitnet RPC in one batch request, and
 * the list is re-sorted by those live balances.
 */
export function fetchTopAccounts(latestBlock?: number, maxAgeMs = 60000): Promise<TopAccountsResult> {
  if (cached && Date.now() - cached.updatedAt < maxAgeMs) return Promise.resolve(cached);
  if (pending) return pending;

  pending = (async () => {
    const indexed = await fetchIndexerTopAccounts();
    const source: TopAccountsResult['source'] = indexed.length > 0 ? 'indexer' : 'snapshot';
    const candidates = indexed.length > 0
      ? indexed
      : VERIFIED_HODL_WALLETS.map((w) => ({ address: w.address, balanceWei: '', isContract: false, name: undefined as string | undefined }));

    const [height, supply] = await Promise.all([
      latestBlock ? Promise.resolve(latestBlock) : rpcService.getBlockNumber().catch(() => 0),
      fetchSupplySnapshot(),
    ]);
    const supplyBtn = supply ? Number(supply.circulatingSupply) : NaN;
    const basis: TopAccountsResult['percentageBasis'] = Number.isFinite(supplyBtn) && supplyBtn > 0 ? 'supply' : 'issuance';
    const issued = basis === 'supply' ? supplyBtn : height;
    const results = await rpcService.batch(candidates.flatMap((c) => [
      { method: 'eth_getBalance', params: [c.address.toLowerCase(), 'latest'] },
      { method: 'eth_getTransactionCount', params: [c.address.toLowerCase(), 'latest'] },
    ]));

    const accounts: RichAccount[] = [];
    candidates.forEach((c, i) => {
      const balHex = results[i * 2];
      const nonceHex = results[i * 2 + 1];
      let wei: bigint | null = null;
      let live = false;
      if (typeof balHex === 'string') {
        wei = BigInt(balHex);
        live = true;
      } else if (c.balanceWei) {
        wei = BigInt(c.balanceWei);
      }
      if (wei === null) {
        // Snapshot fallback with no RPC answer: keep the last known figure, marked as such.
        const snap = VERIFIED_HODL_WALLETS.find((w) => w.address.toLowerCase() === c.address.toLowerCase());
        if (!snap) return;
        wei = ethers.parseEther(String(snap.balance));
      }
      const balance = Number(ethers.formatEther(wei));
      accounts.push({
        rank: 0,
        address: c.address,
        balance,
        balanceFormatted: formatBalance(balance),
        percentage: issued > 0 ? `${((balance / issued) * 100).toFixed(4)}%` : 'Unknown',
        txCount: typeof nonceHex === 'string' ? parseInt(nonceHex, 16) : null,
        balanceLive: live,
        isContract: c.isContract,
        name: c.name,
      });
    });

    accounts.sort((a, b) => b.balance - a.balance);
    accounts.forEach((a, idx) => { a.rank = idx + 1; });
    cached = { accounts, source, updatedAt: Date.now(), percentageBasis: basis };
    return cached;
  })().finally(() => { pending = null; });

  return pending;
}
