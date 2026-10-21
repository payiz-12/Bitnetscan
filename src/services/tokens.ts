import { ethers } from 'ethers';
import { rpcService } from './rpc';

/**
 * BTS-20 tokens from the Bitnet explorer (Blockscout v2): the token list, a token's details,
 * holders and transfers. Token details fall back to the token contract itself over RPC when
 * the explorer cannot be reached.
 */
const BASES = ['/api/explorer', 'https://explorer.bitnetmoney.com'];

async function explorerGet<T>(path: string): Promise<T> {
  let lastError: unknown = null;
  for (const base of BASES) {
    try {
      const res = await fetch(`${base}${path}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
      if (res.status === 404) throw Object.assign(new Error('Not found'), { notFound: true });
      if (!res.ok) { lastError = new Error(`HTTP ${res.status}`); continue; }
      return (await res.json()) as T;
    } catch (e: any) {
      if (e?.notFound) throw e;
      lastError = e;
    }
  }
  throw lastError ?? new Error('The Bitnet explorer could not be reached');
}

export type PageParams = Record<string, string | number> | null;

export interface TokenSummary {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint | null;
  holders: number | null;
}

export interface TokenInfo extends TokenSummary {
  transfers: number | null;
  /** 'explorer' when read from the indexer, 'rpc' when only the contract could be read. */
  source: 'explorer' | 'rpc';
}

export interface TokenHolder {
  address: string;
  name: string | null;
  isContract: boolean;
  value: bigint;
}

export interface TokenTransfer {
  txHash: string;
  logIndex: number;
  blockNumber: number;
  timestamp: number;
  method: string | null;
  from: string;
  to: string;
  value: bigint;
}

const big = (v: unknown): bigint | null => {
  try { return v === null || v === undefined || v === '' ? null : BigInt(String(v)); } catch { return null; }
};
const num = (v: unknown): number | null => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
const query = (params: PageParams, extra: Record<string, string> = {}) => {
  const q = new URLSearchParams(extra);
  for (const [k, v] of Object.entries(params ?? {})) q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
};

const summary = (t: any): TokenSummary => ({
  address: ethers.getAddress(String(t.address_hash || t.address).toLowerCase()),
  name: String(t.name || 'Unnamed token'),
  symbol: String(t.symbol || '—'),
  decimals: num(t.decimals) ?? 18,
  totalSupply: big(t.total_supply),
  holders: num(t.holders_count ?? t.holders),
});

/** All BTS-20 tokens, most holders first (up to `maxPages` pages of 50). */
export async function listAllTokens(maxPages = 10): Promise<{ items: TokenSummary[]; complete: boolean }> {
  const items: TokenSummary[] = [];
  let page: PageParams = null;
  for (let i = 0; i < maxPages; i++) {
    const d: { items: any[]; next_page_params: PageParams } = await explorerGet(`/api/v2/tokens${query(page, { type: 'ERC-20' })}`);
    items.push(...(d.items ?? []).map(summary));
    page = d.next_page_params ?? null;
    if (!page) return { items, complete: true };
  }
  return { items, complete: false };
}

const ERC20 = new ethers.Interface([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
]);

async function readFromContract(address: string): Promise<TokenInfo | null> {
  const call = async (fn: string) => {
    const r = await rpcService.simulateCall({ to: address, data: ERC20.encodeFunctionData(fn) });
    return r.ok ? ERC20.decodeFunctionResult(fn, (r as { result: string }).result)[0] : null;
  };
  const [name, symbol, decimals, supply] = await Promise.all(['name', 'symbol', 'decimals', 'totalSupply'].map((f) => call(f).catch(() => null)));
  if (decimals === null || supply === null) return null;
  return {
    address: ethers.getAddress(address.toLowerCase()),
    name: name ? String(name) : 'Unnamed token',
    symbol: symbol ? String(symbol) : '—',
    decimals: Number(decimals),
    totalSupply: BigInt(supply),
    holders: null,
    transfers: null,
    source: 'rpc',
  };
}

/** Token details, or null when the address is not a BTS-20 token. */
export async function getToken(address: string): Promise<TokenInfo | null> {
  try {
    const [t, counters] = await Promise.all([
      explorerGet<any>(`/api/v2/tokens/${address}`),
      explorerGet<any>(`/api/v2/tokens/${address}/counters`).catch(() => null),
    ]);
    if (t?.type && t.type !== 'ERC-20') return null;
    return {
      ...summary(t),
      holders: num(counters?.token_holders_count) ?? num(t.holders_count ?? t.holders),
      transfers: num(counters?.transfers_count),
      source: 'explorer',
    };
  } catch (e: any) {
    if (e?.notFound) return readFromContract(address).catch(() => null);
    const fromChain = await readFromContract(address).catch(() => null);
    if (fromChain) return fromChain;
    throw e;
  }
}

export async function getTokenHolders(address: string, page: PageParams): Promise<{ items: TokenHolder[]; next: PageParams }> {
  const d = await explorerGet<{ items: any[]; next_page_params: PageParams }>(`/api/v2/tokens/${address}/holders${query(page)}`);
  return {
    items: (d.items ?? []).map((h) => ({
      address: String(h.address?.hash),
      name: h.address?.name ?? null,
      isContract: Boolean(h.address?.is_contract),
      value: big(h.value) ?? 0n,
    })),
    next: d.next_page_params ?? null,
  };
}

export async function getTokenTransfers(address: string, page: PageParams): Promise<{ items: TokenTransfer[]; next: PageParams }> {
  const d = await explorerGet<{ items: any[]; next_page_params: PageParams }>(`/api/v2/tokens/${address}/transfers${query(page)}`);
  return {
    items: (d.items ?? []).map((t) => ({
      txHash: String(t.transaction_hash || t.tx_hash),
      logIndex: Number(t.log_index ?? 0),
      blockNumber: Number(t.block_number ?? 0),
      timestamp: t.timestamp ? Math.floor(new Date(t.timestamp).getTime() / 1000) : 0,
      method: t.method ?? null,
      from: String(t.from?.hash ?? ''),
      to: String(t.to?.hash ?? ''),
      value: big(t.total?.value) ?? 0n,
    })),
    next: d.next_page_params ?? null,
  };
}

const tokenCheck = new Map<string, Promise<boolean>>();

/** Whether the explorer indexes this address as a BTS-20 token. */
export function isToken(address: string): Promise<boolean> {
  const key = address.toLowerCase();
  let hit = tokenCheck.get(key);
  if (!hit) {
    hit = explorerGet<any>(`/api/v2/tokens/${address}`).then((t) => t?.type === 'ERC-20').catch(() => false);
    tokenCheck.set(key, hit);
  }
  return hit;
}

/** Live token balance of an address, read from the contract. */
export async function getTokenBalance(token: string, holder: string): Promise<bigint | null> {
  const r = await rpcService.simulateCall({ to: token, data: ERC20.encodeFunctionData('balanceOf', [holder]) });
  return r.ok ? BigInt(ERC20.decodeFunctionResult('balanceOf', (r as { result: string }).result)[0]) : null;
}

/** Token amount with thousands separators and up to `digits` decimals. */
export function formatTokenAmount(value: bigint | null, decimals: number, digits = 4): string {
  if (value === null) return '—';
  const [whole, frac = ''] = ethers.formatUnits(value, decimals).split('.');
  const trimmed = frac.slice(0, digits).replace(/0+$/, '');
  if (value > 0n && whole === '0' && !trimmed) return `<0.${'0'.repeat(Math.max(0, digits - 1))}1`;
  return `${BigInt(whole).toLocaleString('en-US')}${trimmed ? `.${trimmed}` : ''}`;
}
