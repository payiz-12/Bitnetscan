export interface MiningEntityInfo {
  address: string;
  name: string;
  tag: string;
  url?: string;
  category: 'known' | 'unknown'; // 'known' = Known Mining Pool, 'unknown' = Unknown Miner
  categoryLabel: string;
  badge: string;
  description: string;
  /** Solo-mode pool: each miner gets the whole reward of the blocks it finds, nothing is shared. */
  soloMode?: boolean;
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
    description: 'Bitnet genesis & primary mining pool.',
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
    soloMode: true, // coolpool.top/api/coin/btnsolo reports type "solo"
  },
  // 3. A large mining address that is not a known pool (named by its address, not guessed)
  '0x6afcdfec8066a7fbf1295f10c4907924e99e72a4': {
    address: '0x6afcdfec8066a7fbf1295f10c4907924e99e72a4',
    name: 'Unknown (0x6afc...72a4)',
    tag: 'Geth Linux Node',
    category: 'unknown',
    categoryLabel: 'Unknown Mining',
    badge: 'Unknown',
    description: 'Mining address that is not a known pool; its blocks name a Geth node on Linux.',
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
      };
    }
    if (lower.includes('geth')) {
      return {
        address: clean,
        name: `Unknown (${clean.slice(0, 6)}...${clean.slice(-4)})`,
        tag: 'Geth Node',
        category: 'unknown',
        categoryLabel: 'Unknown Mining',
        badge: 'Unknown',
        description: 'Mining address that is not a known pool; its blocks name a Geth node.',
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
  };
}
