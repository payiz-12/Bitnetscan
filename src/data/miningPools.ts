export interface MiningEntityInfo {
  address: string;
  name: string;
  tag: string;
  url?: string;
  category: 'known' | 'unknown'; // 'known' = Bilinen Madencilik, 'unknown' = Bilinmeyen Madencilik
  categoryLabel: string;
  badge: string;
  description: string;
  minersCount: number; // Madenci / worker sayısı
  totalBlocksMinedApprox?: number;
}

export const KNOWN_MINING_POOLS: Record<string, MiningEntityInfo> = {
  // 1. Bilinen Madencilik: GTPool
  '0xfad4a236c87880035497043f24ea58d73c3e50de': {
    address: '0xfad4a236c87880035497043f24ea58d73c3e50de',
    name: 'GTPool',
    tag: 'GTPool.io',
    url: 'https://gtpool.io',
    category: 'known',
    categoryLabel: 'Bilinen Madencilik',
    badge: 'Bilinen Havuz',
    description: 'Bitnet genesis & birincil madencilik havuzu. 4.35M+ blok kazdı.',
    minersCount: 4,
    totalBlocksMinedApprox: 4354589,
  },
  // 2. Bilinen Madencilik: CoolPool
  '0x6c0db3ea9eed7ed145f36da461d84a8d02596b08': {
    address: '0x6c0db3ea9eed7ed145f36da461d84a8d02596b08',
    name: 'CoolPool',
    tag: 'CoolPool.Top',
    url: 'https://coolpool.top',
    category: 'known',
    categoryLabel: 'Bilinen Madencilik',
    badge: 'Bilinen Havuz',
    description: 'Bitnet Ethash PoW için aktif genel madencilik havuzu.',
    minersCount: 4,
    totalBlocksMinedApprox: 493335,
  },
  // 3. Bilinmeyen Madencilik: Solo Miner / Node
  '0x6afcdfec8066a7fbf1295f10c4907924e99e72a4': {
    address: '0x6afcdfec8066a7fbf1295f10c4907924e99e72a4',
    name: 'Bilinmeyen Madenci (Solo Node)',
    tag: 'Geth Linux Node',
    category: 'unknown',
    categoryLabel: 'Bilinmeyen Madencilik',
    badge: 'Bilinmeyen Solo',
    description: 'Topluluk tam düğümü / Linux Geth üzerinde doğrudan madencilik yapan bağımsız madenci.',
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
        categoryLabel: 'Bilinen Madencilik',
        badge: 'Bilinen Havuz',
        description: 'Bilinen madencilik havuzu (GTPool)',
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
        categoryLabel: 'Bilinen Madencilik',
        badge: 'Bilinen Havuz',
        description: 'Bilinen madencilik havuzu (CoolPool)',
        minersCount: 4,
      };
    }
    if (lower.includes('geth')) {
      return {
        address: clean,
        name: 'Bilinmeyen Madenci (Solo)',
        tag: 'Geth Node',
        category: 'unknown',
        categoryLabel: 'Bilinmeyen Madencilik',
        badge: 'Bilinmeyen Solo',
        description: 'Bilinmeyen bağımsız solo madenci',
        minersCount: 1,
      };
    }
  }

  return {
    address: clean,
    name: address ? `Bilinmeyen Madenci (${address.slice(0, 6)}...${address.slice(-4)})` : 'Bilinmeyen Madenci',
    tag: 'Bilinmeyen Adres',
    category: 'unknown',
    categoryLabel: 'Bilinmeyen Madencilik',
    badge: 'Bilinmeyen',
    description: 'Kimliği doğrulanmamış bağımsız madenci',
    minersCount: 1,
  };
}
