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
];
// Wrapped Bitnet follows the WETH9 interface.
const WETH = [...ERC20, 'function deposit() payable', 'function withdraw(uint256 wad)'];

const cache = new Map<string, AbiSource>();

/**
 * ABI for a contract: the verified source on the Bitnet explorer, or, for an unverified
 * contract that answers name(), symbol(), decimals() and totalSupply() like a BTS-20 token,
 * the standard token interface (WETH9 for Wrapped Bitnet).
 */
export async function loadContractAbi(address: string): Promise<AbiSource> {
  const key = address.toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;

  for (const base of INDEXER_BASES) {
    try {
      const res = await fetch(`${base}/api/v2/smart-contracts/${address}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.is_verified && Array.isArray(data.abi) && data.abi.length > 0) {
        const source: AbiSource = { kind: 'verified', name: String(data.name || 'Contract'), abi: data.abi };
        cache.set(key, source);
        return source;
      }
      break;
    } catch {
      // try the next base
    }
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
