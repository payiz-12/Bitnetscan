export interface MiningEntityInfo {
  address: string;
  name: string;
  tag: string;
  url?: string;
  category: 'known' | 'unknown'; // 'known' = Known Mining Pool, 'unknown' = Unknown Miner
  categoryLabel: string;
  badge: string;
  description: string;
  minersCount: number; // Worker / Miner count
  totalBlocksMinedApprox?: number;
}

export const KNOWN_MINING_POOLS: Record<string, MiningEntityInfo> = {
  // 1. Known Mining: GTPool
  '0xfad4a236c87880035497043f24ea58d73c3e50de': {
    address: '0xfad4a236c87880035497043f24ea58d73c3e50de',
    name: 'GTPool',
    tag: 'GTPool.io',
    url: 'https://gtpool.io',
    category: 'known',
    categoryLabel: 'Known Mining',
    badge: 'Known Pool',
    description: 'Bitnet genesis & primary mining pool. Over 4.35M blocks mined.',
    minersCount: 4,
    totalBlocksMinedApprox: 4354589,
  },
  // 2. Known Mining: CoolPool
  '0x6c0db3ea9eed7ed145f36da461d84a8d02596b08': {
    address: '0x6c0db3ea9eed7ed145f36da461d84a8d02596b08',
    name: 'CoolPool',
    tag: 'CoolPool.Top',
    url: 'https://coolpool.top',
    category: 'known',
    categoryLabel: 'Known Mining',
    badge: 'Known Pool',
    description: 'Active public mining pool for Bitnet Ethash PoW.',
    minersCount: 4,
    totalBlocksMinedApprox: 493335,
  },
  // 3. Unknown Mining: Solo Miner / Node
  '0x6afcdfec8066a7fbf1295f10c4907924e99e72a4': {
    address: '0x6afcdfec8066a7fbf1295f10c4907924e99e72a4',
    name: 'Unknown Solo Node',
    tag: 'Geth Linux Node',
    category: 'unknown',
    categoryLabel: 'Unknown Mining',
    badge: 'Unknown Solo',
    description: 'Community full node / solo miner running Geth on Linux directly on-chain.',
    minersCount: 1,
    totalBlocksMinedApprox: 441101,
  },
};

export function identifyMinerPool(address: string, extraDataAscii?: string): MiningEntityInfo {
  const clean = (address || '').toLowerCase();
  if (KNOWN_MINING_POOLS[clean]) {
    return KNOWN_MINING_POOLS[clean];
  }

  if (extraDataAscii) {
    const lower = extraDataAscii.toLowerCase();
    if (lower.includes('gtpool')) {
      return {
        address: clean,
        name: 'GTPool',
        tag: 'GTPool.io',
        url: 'https://gtpool.io',
        category: 'known',
        categoryLabel: 'Known Mining',
        badge: 'Known Pool',
        description: 'Known mining pool (GTPool)',
        minersCount: 4,
      };
    }
    if (lower.includes('coolpool')) {
      return {
        address: clean,
        name: 'CoolPool',
        tag: 'CoolPool.Top',
        url: 'https://coolpool.top',
        category: 'known',
        categoryLabel: 'Known Mining',
        badge: 'Known Pool',
        description: 'Known mining pool (CoolPool)',
        minersCount: 4,
      };
    }
    if (lower.includes('geth')) {
      return {
        address: clean,
        name: 'Unknown Solo Node',
        tag: 'Geth Node',
        category: 'unknown',
        categoryLabel: 'Unknown Mining',
        badge: 'Unknown Solo',
        description: 'Unknown independent solo miner',
        minersCount: 1,
      };
    }
  }

  return {
    address: clean,
    name: address ? `Unknown (${address.slice(0, 6)}...${address.slice(-4)})` : 'Unknown Miner',
    tag: 'Unknown Address',
    category: 'unknown',
    categoryLabel: 'Unknown Mining',
    badge: 'Unknown',
    description: 'Unverified independent miner',
    minersCount: 1,
  };
}
