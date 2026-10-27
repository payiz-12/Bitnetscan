import { rpcService } from '../services/rpc';
import { loadVerifiedContract } from '../services/contractAbi';
import { ethers } from 'ethers';

export interface VerifiedContractItem {
  address: string;
  name: string;
  coinBalance: string;
  txCount: number;
  compilerVersion: string;
  optimization: boolean;
  hasConstructorArgs: boolean;
  verifiedAt: string;
  license: string;
  language: string;
  isVerified: boolean;
  bytecodeLength?: number;
}

// Verified contracts stored with the site, shown until the current list loads from the Bitnet
// explorer (and when the explorer cannot be reached).
export const OFFICIAL_BITNET_VERIFIED_CONTRACTS: VerifiedContractItem[] = [
  {
    address: '0x637A1EFde216e372cF308A1e88337C03541c7D1a',
    name: 'Faucet',
    coinBalance: '0.0900',
    txCount: 2,
    compilerVersion: 'v0.4.26+commit.4563c3fc',
    optimization: false,
    hasConstructorArgs: false,
    verifiedAt: '2026-09-16T21:09:44.535557Z',
    license: 'none',
    language: 'solidity',
    isVerified: true,
  },
  {
    address: '0xa9b7E9725c625B4DC9964c488A8e19D622a5A65d',
    name: 'ZK_HTLC',
    coinBalance: '0.0000',
    txCount: 0,
    compilerVersion: 'v0.8.28+commit.7893614a',
    optimization: true,
    hasConstructorArgs: true,
    verifiedAt: '2026-04-18T01:56:58.053418Z',
    license: 'none',
    language: 'solidity',
    isVerified: true,
  },
  {
    address: '0xa39af914C577d02024A33aDa6470EcC6064516d1',
    name: 'STARKVerifier',
    coinBalance: '0.0000',
    txCount: 0,
    compilerVersion: 'v0.8.28+commit.7893614a',
    optimization: true,
    hasConstructorArgs: false,
    verifiedAt: '2026-04-18T01:56:42.347142Z',
    license: 'none',
    language: 'solidity',
    isVerified: true,
  },
  {
    address: '0x87ba9daC8e1F654691F1040a062B556762D75D7f',
    name: 'BTNEscrow',
    coinBalance: '0.5300',
    txCount: 18,
    compilerVersion: 'v0.8.28+commit.7893614a',
    optimization: true,
    hasConstructorArgs: false,
    verifiedAt: '2026-04-18T01:56:31.789457Z',
    license: 'none',
    language: 'solidity',
    isVerified: true,
  },
  {
    address: '0xD2436Cc32605760752767B890268C1BdA7011928',
    name: 'ZK_HTLC',
    coinBalance: '3.0370',
    txCount: 19,
    compilerVersion: 'v0.8.28+commit.7893614a',
    optimization: true,
    hasConstructorArgs: true,
    verifiedAt: '2026-04-17T12:48:27.510867Z',
    license: 'none',
    language: 'solidity',
    isVerified: true,
  },
  {
    address: '0x7897aCe72d55b3698c3e39a06B3880f599242Fd7',
    name: 'STARKVerifier',
    coinBalance: '0.0000',
    txCount: 0,
    compilerVersion: 'v0.8.28+commit.7893614a',
    optimization: true,
    hasConstructorArgs: false,
    verifiedAt: '2026-04-17T12:47:39.881085Z',
    license: 'none',
    language: 'solidity',
    isVerified: true,
  },
  {
    address: '0x941443615154B4aB07367f766BC9b885CC837fa1',
    name: 'ZK_HTLC',
    coinBalance: '0.0000',
    txCount: 3,
    compilerVersion: 'v0.8.28+commit.7893614a',
    optimization: true,
    hasConstructorArgs: true,
    verifiedAt: '2026-04-17T11:26:47.315884Z',
    license: 'none',
    language: 'solidity',
    isVerified: true,
  },
  {
    address: '0xb0343F9e800d9EF5072285fC1333cC23827dA0A8',
    name: 'STARKVerifier',
    coinBalance: '0.0000',
    txCount: 0,
    compilerVersion: 'v0.8.28+commit.7893614a',
    optimization: true,
    hasConstructorArgs: false,
    verifiedAt: '2026-04-17T11:26:23.304042Z',
    license: 'none',
    language: 'solidity',
    isVerified: true,
  },
  {
    address: '0xCc9576C4B362E3659f8eC5f341084705A6aC7628',
    name: 'ZK_HTLC',
    coinBalance: '0.4795',
    txCount: 18,
    compilerVersion: 'v0.8.28+commit.7893614a',
    optimization: true,
    hasConstructorArgs: true,
    verifiedAt: '2026-04-14T13:27:17.767785Z',
    license: 'none',
    language: 'solidity',
    isVerified: true,
  },
  {
    address: '0x3CfE1eE3933Ed01Fe063Fe782A77f423B61b3Eae',
    name: 'STARKVerifier',
    coinBalance: '0.0000',
    txCount: 0,
    compilerVersion: 'v0.8.28+commit.7893614a',
    optimization: true,
    hasConstructorArgs: false,
    verifiedAt: '2026-04-14T13:24:56.057478Z',
    license: 'none',
    language: 'solidity',
    isVerified: true,
  },
  {
    address: '0x3D51cd9033A2D46A6133B74034d3BcE9da831D4c',
    name: 'MonolithM31Registry',
    coinBalance: '0.0000',
    txCount: 0,
    compilerVersion: 'v0.8.28+commit.7893614a',
    optimization: true,
    hasConstructorArgs: false,
    verifiedAt: '2026-04-14T01:06:47.839408Z',
    license: 'none',
    language: 'solidity',
    isVerified: true,
  },
  {
    address: '0x50B6C7BA412e222725ec31aC1Fb1171E64fAF069',
    name: 'AssetRegistry',
    coinBalance: '0.0000',
    txCount: 0,
    compilerVersion: 'v0.8.28+commit.7893614a',
    optimization: true,
    hasConstructorArgs: false,
    verifiedAt: '2026-04-13T07:26:17.585457Z',
    license: 'none',
    language: 'solidity',
    isVerified: true,
  },
  {
    address: '0x66Ae7808765Bf30e52CE58921518Ba2b7D798E09',
    name: 'BTNRegistry',
    coinBalance: '0.0000',
    txCount: 1,
    compilerVersion: 'v0.8.28+commit.7893614a',
    optimization: true,
    hasConstructorArgs: false,
    verifiedAt: '2026-03-25T17:04:12.096498Z',
    license: 'none',
    language: 'solidity',
    isVerified: true,
  },
  {
    address: '0xED8F80C1dc1193f9DeAe55a0D8e3F6A3AfDb3CfB',
    name: 'ZK_HTLC',
    coinBalance: '0.0000',
    txCount: 5,
    compilerVersion: 'v0.8.20+commit.a1b79de6',
    optimization: true,
    hasConstructorArgs: true,
    verifiedAt: '2026-03-16T11:50:56.912106Z',
    license: 'none',
    language: 'solidity',
    isVerified: true,
  },
  {
    address: '0xBB7780ED7A1A4BB3c6B5B07B06b35b2d65067C03',
    name: 'MockVerifier',
    coinBalance: '0.0000',
    txCount: 0,
    compilerVersion: 'v0.8.20+commit.a1b79de6',
    optimization: true,
    hasConstructorArgs: false,
    verifiedAt: '2026-03-16T11:49:38.846912Z',
    license: 'none',
    language: 'solidity',
    isVerified: true,
  },
  {
    address: '0x3e5f06A0F1B3Bbc226352e3fefab5BfDE1915586',
    name: 'MockUSD1',
    coinBalance: '0.0000',
    txCount: 4,
    compilerVersion: 'v0.8.20+commit.a1b79de6',
    optimization: true,
    hasConstructorArgs: true,
    verifiedAt: '2026-03-16T11:49:12.559298Z',
    license: 'none',
    language: 'solidity',
    isVerified: true,
  },
  {
    address: '0x6f13F63632ec9B9A8A9edcaE26477C781c9dFa11',
    name: 'MockUSDC',
    coinBalance: '0.0000',
    txCount: 0,
    compilerVersion: 'v0.8.20+commit.a1b79de6',
    optimization: true,
    hasConstructorArgs: false,
    verifiedAt: '2026-03-16T11:48:42.388390Z',
    license: 'none',
    language: 'solidity',
    isVerified: true,
  },
  {
    address: '0x0535C4d806d50eCBe6e269B1c7B648084C3D3e0A',
    name: 'MockUSDT',
    coinBalance: '0.0000',
    txCount: 7,
    compilerVersion: 'v0.8.20+commit.a1b79de6',
    optimization: true,
    hasConstructorArgs: false,
    verifiedAt: '2026-03-16T11:47:43.981716Z',
    license: 'none',
    language: 'solidity',
    isVerified: true,
  },
  {
    address: '0x8dfD08496c4ed34F23246D3a2a065aD6605340b8',
    name: 'ZK_HTLC',
    coinBalance: '0.0000',
    txCount: 2,
    compilerVersion: 'v0.8.20+commit.a1b79de6',
    optimization: true,
    hasConstructorArgs: true,
    verifiedAt: '2026-03-16T11:16:49.990132Z',
    license: 'none',
    language: 'solidity',
    isVerified: true,
  },
  {
    address: '0xa257bAC4757B3ff647540FbCac2c105c91EBabd8',
    name: 'MockVerifier',
    coinBalance: '0.0000',
    txCount: 0,
    compilerVersion: 'v0.8.20+commit.a1b79de6',
    optimization: true,
    hasConstructorArgs: false,
    verifiedAt: '2026-03-16T11:16:13.255999Z',
    license: 'none',
    language: 'solidity',
    isVerified: true,
  },
  {
    address: '0xAF3cb3C466d95E1d6E373155bA0D9847753E6adb',
    name: 'MockUSD1',
    coinBalance: '0.0000',
    txCount: 0,
    compilerVersion: 'v0.8.20+commit.a1b79de6',
    optimization: true,
    hasConstructorArgs: true,
    verifiedAt: '2026-03-16T11:15:42.394512Z',
    license: 'none',
    language: 'solidity',
    isVerified: true,
  },
  {
    address: '0x579214a8dD3e81956F8a52392473a16557d05e28',
    name: 'MockUSDC',
    coinBalance: '0.0000',
    txCount: 0,
    compilerVersion: 'v0.8.20+commit.a1b79de6',
    optimization: true,
    hasConstructorArgs: false,
    verifiedAt: '2026-03-16T11:15:08.042996Z',
    license: 'none',
    language: 'solidity',
    isVerified: true,
  },
  {
    address: '0x9516b00D37259326590c83D8ecA65a635b674134',
    name: 'MockUSDT',
    coinBalance: '0.0000',
    txCount: 1,
    compilerVersion: 'v0.8.20+commit.a1b79de6',
    optimization: true,
    hasConstructorArgs: false,
    verifiedAt: '2026-03-16T11:13:20.732035Z',
    license: 'none',
    language: 'solidity',
    isVerified: true,
  },
];

const INDEXER_BASES = ['/api/explorer', 'https://explorer.bitnetmoney.com'];

async function explorerList(path: string, maxPages: number): Promise<any[]> {
  for (const base of INDEXER_BASES) {
    try {
      const items: any[] = [];
      let next: Record<string, string> | null = null;
      for (let i = 0; i < maxPages; i++) {
        const qs = new URLSearchParams(next ?? {}).toString();
        const res = await fetch(`${base}${path}${qs ? `?${qs}` : ''}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = await res.json();
        items.push(...(d.items ?? []));
        next = d.next_page_params ?? null;
        if (!next) break;
      }
      return items;
    } catch {
      // try the next base
    }
  }
  throw new Error('The Bitnet explorer could not be reached');
}

/**
 * Contracts whose source code is verified on the Bitnet explorer (verification happens there), as
 * the explorer lists them, with the balance it has indexed. Throws when the explorer cannot be
 * reached; the page then keeps the list stored with the site.
 */
export async function fetchLiveVerifiedContracts(): Promise<VerifiedContractItem[]> {
  const items = await explorerList('/api/v2/smart-contracts', 10);
  return items.map((c) => ({
    address: String(c.address?.hash || ''),
    name: String(c.address?.name || 'Contract'),
    coinBalance: ethers.formatEther(BigInt(c.coin_balance || '0')),
    txCount: Number(c.transaction_count ?? c.transactions_count ?? 0),
    compilerVersion: String(c.compiler_version || ''),
    optimization: Boolean(c.optimization_enabled),
    hasConstructorArgs: Boolean(c.has_constructor_args),
    verifiedAt: String(c.verified_at || ''),
    license: String(c.license_type || 'none'),
    language: String(c.language || 'solidity'),
    isVerified: true,
  }));
}

/** The same contracts with balance and code size read from the chain. */
export async function withChainData(contracts: VerifiedContractItem[]): Promise<VerifiedContractItem[]> {
  return Promise.all(contracts.map(async (c) => {
    const [code, balance] = await Promise.all([
      rpcService.getCode(c.address).catch(() => null),
      rpcService.getBalance(c.address).catch(() => null),
    ]);
    const balNum = balance !== null ? parseFloat(balance) : NaN;
    return {
      ...c,
      coinBalance: !isNaN(balNum) ? balNum.toFixed(4) : c.coinBalance,
      bytecodeLength: code && code !== '0x' ? Math.floor((code.length - 2) / 2) : c.bytecodeLength,
    };
  }));
}

export type ContractCheck =
  | { kind: 'none' }
  | { kind: 'unverified'; bytecodeLength: number }
  | { kind: 'verified'; name: string; compilerVersion: string; optimization: boolean; verifiedAt: string | null; balance: string | null; bytecodeLength: number };

/**
 * Whether an address holds contract code (read from the chain) and whether its source code is
 * verified on the Bitnet explorer.
 */
export async function checkContract(rawAddress: string): Promise<ContractCheck> {
  const address = rawAddress.trim();
  const code = await rpcService.getCode(address);
  if (!code || code === '0x') return { kind: 'none' };
  const bytecodeLength = Math.floor((code.length - 2) / 2);
  const verified = await loadVerifiedContract(address);
  if (!verified) return { kind: 'unverified', bytecodeLength };
  const balance = await rpcService.getBalance(address).catch(() => null);
  return {
    kind: 'verified',
    name: verified.name,
    compilerVersion: verified.compilerVersion,
    optimization: verified.optimization.enabled,
    verifiedAt: verified.verifiedAt,
    balance: balance !== null ? parseFloat(balance).toFixed(4) : null,
    bytecodeLength,
  };
}
