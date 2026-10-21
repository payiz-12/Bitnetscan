import { ethers } from 'ethers';
import { rpcService } from './rpc';

export type AbiSource =
  | { kind: 'verified'; name: string; abi: ethers.InterfaceAbi }
  | { kind: 'standard'; name: string; abi: ethers.InterfaceAbi; symbol: string; decimals: number }
  | { kind: 'none' };

const INDEXER_BASES = ['/api/explorer', 'https://explorer.bitnetmoney.com'];
const WBTN = '0x8148b71232162ea7a0b1c8bfe2b8f023934bfb58';

const ERC20 = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
];
// Wrapped Bitnet follows the WETH9 interface.
const WETH = [...ERC20, 'function deposit() payable', 'function withdraw(uint256 wad)', 'event Deposit(address indexed dst, uint256 wad)', 'event Withdrawal(address indexed src, uint256 wad)'];

export interface VerifiedContract {
  name: string;
  abi: ethers.InterfaceAbi;
  language: string;
  compilerVersion: string;
  optimization: { enabled: boolean; runs: number | null };
  evmVersion: string | null;
  license: string | null;
  verifiedAt: string | null;
  files: { path: string; source: string }[];
  constructorArgs: string | null;
  /** Implementation contracts when this is a proxy. */
  implementations: { address: string; name: string | null }[];
}

const verifiedCache = new Map<string, VerifiedContract | null>();
const cache = new Map<string, AbiSource>();

/**
 * Verified source of a contract from the Bitnet explorer (Blockscout), or null when the explorer
 * has no verified source for it. Throws when the explorer cannot be reached.
 */
export async function loadVerifiedContract(address: string): Promise<VerifiedContract | null> {
  const key = address.toLowerCase();
  if (verifiedCache.has(key)) return verifiedCache.get(key)!;
  for (const base of INDEXER_BASES) {
    try {
      const res = await fetch(`${base}/api/v2/smart-contracts/${address}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
      if (res.status === 404) { verifiedCache.set(key, null); return null; }
      if (!res.ok) continue;
      const d = await res.json();
      const verified: VerifiedContract | null = d?.is_verified && Array.isArray(d.abi) && d.abi.length > 0
        ? {
            name: String(d.name || 'Contract'),
            abi: d.abi,
            language: String(d.language || 'solidity'),
            compilerVersion: String(d.compiler_version || ''),
            optimization: { enabled: Boolean(d.optimization_enabled), runs: d.optimization_runs ?? null },
            evmVersion: d.evm_version || null,
            license: d.license_type && d.license_type !== 'none' ? String(d.license_type) : null,
            verifiedAt: d.verified_at || null,
            files: [
              ...(d.source_code ? [{ path: String(d.file_path || `${d.name || 'Contract'}.sol`), source: String(d.source_code) }] : []),
              ...(Array.isArray(d.additional_sources) ? d.additional_sources.map((f: any) => ({ path: String(f.file_path), source: String(f.source_code ?? '') })) : []),
            ],
            constructorArgs: d.constructor_args || null,
            implementations: Array.isArray(d.implementations) ? d.implementations.map((i: any) => ({ address: String(i.address_hash || i.address), name: i.name ?? null })) : [],
          }
        : null;
      verifiedCache.set(key, verified);
      return verified;
    } catch {
      // try the next base
    }
  }
  throw new Error('The Bitnet explorer could not be reached');
}

/**
 * ABI for a contract: the verified source on the Bitnet explorer, or, for an unverified
 * contract that answers name(), symbol(), decimals() and totalSupply() like a BTS-20 token,
 * the standard token interface (WETH9 for Wrapped Bitnet).
 */
export async function loadContractAbi(address: string): Promise<AbiSource> {
  const key = address.toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;

  try {
    const verified = await loadVerifiedContract(address);
    if (verified) {
      const source: AbiSource = { kind: 'verified', name: verified.name, abi: verified.abi };
      cache.set(key, source);
      return source;
    }
  } catch {
    // explorer unreachable: still try the standard token interface
  }

  const iface = new ethers.Interface(ERC20);
  const calls = ['name', 'symbol', 'decimals', 'totalSupply'].map((fn) => rpcService.simulateCall({ to: address, data: iface.encodeFunctionData(fn) }));
  const [name, symbol, decimals, supply] = await Promise.all(calls);
  try {
    if (name.ok && symbol.ok && decimals.ok && supply.ok) {
      const source: AbiSource = {
        kind: 'standard',
        name: String(iface.decodeFunctionResult('name', name.result)[0]),
        symbol: String(iface.decodeFunctionResult('symbol', symbol.result)[0]),
        decimals: Number(iface.decodeFunctionResult('decimals', decimals.result)[0]),
        abi: key === WBTN ? WETH : ERC20,
      };
      iface.decodeFunctionResult('totalSupply', supply.result);
      cache.set(key, source);
      return source;
    }
  } catch {
    // answers that do not decode as a token
  }
  const none: AbiSource = { kind: 'none' };
  cache.set(key, none);
  return none;
}
