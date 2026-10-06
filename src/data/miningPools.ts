export interface KnownMiningPool {
  address: string;
  name: string;
  tag: string;
  url?: string;
  badge: string;
  description: string;
  totalBlocksMinedApprox?: number;
}

export const KNOWN_MINING_POOLS: Record<string, KnownMiningPool> = {
  '0xfad4a236c87880035497043f24ea58d73c3e50de': {
    address: '0xfad4a236c87880035497043f24ea58d73c3e50de',
    name: 'GTPool',
    tag: 'GTPool.io',
    url: 'https://gtpool.io',
    badge: 'Mining Pool',
    description: 'Bitnet primary mining pool. Over 4.35M blocks mined.',
    totalBlocksMinedApprox: 4354589,
  },
  '0x6c0db3ea9eed7ed145f36da461d84a8d02596b08': {
    address: '0x6c0db3ea9eed7ed145f36da461d84a8d02596b08',
    name: 'CoolPool',
    tag: 'CoolPool.Top',
    url: 'https://coolpool.top',
    badge: 'Mining Pool',
    description: 'Active public mining pool for Bitnet Ethash PoW.',
    totalBlocksMinedApprox: 493335,
  },
  '0x6afcdfec8066a7fbf1295f10c4907924e99e72a4': {
    address: '0x6afcdfec8066a7fbf1295f10c4907924e99e72a4',
    name: 'Solo Miner / Node',
    tag: 'Geth Linux Node',
    badge: 'Solo Node',
    description: 'Community full node & solo miner running Geth on Linux.',
    totalBlocksMinedApprox: 441101,
  },
};

export function identifyMinerPool(address: string, extraDataAscii?: string): {
  name: string;
  tag: string;
  url?: string;
  badge: string;
  isKnownPool: boolean;
} {
  const clean = (address || '').toLowerCase();
  if (KNOWN_MINING_POOLS[clean]) {
    const p = KNOWN_MINING_POOLS[clean];
    return {
      name: p.name,
      tag: p.tag,
      url: p.url,
      badge: p.badge,
      isKnownPool: true,
    };
  }

  if (extraDataAscii) {
    const lower = extraDataAscii.toLowerCase();
    if (lower.includes('gtpool')) {
      return { name: 'GTPool', tag: 'GTPool.io', url: 'https://gtpool.io', badge: 'Mining Pool', isKnownPool: true };
    }
    if (lower.includes('coolpool')) {
      return { name: 'CoolPool', tag: 'CoolPool.Top', url: 'https://coolpool.top', badge: 'Mining Pool', isKnownPool: true };
    }
    if (lower.includes('geth')) {
      return { name: 'Solo Miner / Node', tag: 'Geth Node', badge: 'Solo Node', isKnownPool: true };
    }
    const cleanTag = extraDataAscii.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
    if (cleanTag.length > 0) {
      return { name: cleanTag, tag: cleanTag, badge: 'Miner', isKnownPool: false };
    }
  }

  return {
    name: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown Miner',
    tag: 'Miner Address',
    badge: 'Miner',
    isKnownPool: false,
  };
}
