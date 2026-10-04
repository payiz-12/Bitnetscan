export interface NftItem {
  // ERC-721 IDs are uint256, not JavaScript numbers.
  id: string;
  name: string;
  image: string;
  owner: string;
  mintDate: string;
  traits: { trait_type: string; value: string }[];
  tokenUri?: string;
  metadataSource?: 'indexer' | 'tokenURI' | 'unavailable';
  metadataError?: string;
  ownerSource?: 'indexer' | 'rpc' | 'unknown';
  checkedBlock?: number;
  rarity?: string;
  rarityColor?: string;
  priceBtn?: number;
}

export interface NftHolder {
  rank: number;
  address: string;
  quantity: number;
  percentage: string;
  tokenIds: string[];
}

export interface NftTransfer {
  hash: string;
  from: string;
  to: string;
  tokenId: string;
  timestamp: number;
  blockNumber: number;
  logIndex: number;
  type: 'MINT' | 'BURN' | 'TRANSFER';
  priceBtn?: number;
}

export interface NftCollection {
  id: string;
  name: string;
  symbol: string;
  contract: string;
  standard: string;
  description: string;
  bannerImage: string;
  iconImage: string;
  totalSupply: number | null;
  minted: number | null;
  holdersCount: number | null;
  floorPriceBtn?: number;
  volume24hBtn?: number;
  verified: boolean;
  category: string;
  items: NftItem[];
  holders: NftHolder[];
  recentTransfers: NftTransfer[];
  dataStatus: 'unloaded' | 'indexed' | 'cached' | 'partial' | 'error';
  ownershipComplete: boolean;
  transfersComplete: boolean;
  syncedAt?: string;
  source?: string;
  error?: string;
}

// Navigation hints only. Ownership, supply, metadata and dates are never seeded.
const COLLECTION_HINTS = [
  ['bitnet-punks', 'BitnetPunks', 'BPUNK', '0xd03B179692303741393ee9A26E34e5ef4593741f'],
  ['milestone', 'Milestone', '', '0x155fE91Ce99862DF12906EaF199B48872cA5B709'],
  ['the-village', 'TheVillage: Founders Edition', '', '0x2142c6dDBfa7ae9E283d0FbFFFfbe14E502D6265'],
  ['xenwave', 'Xenwave Community Collection', '', '0x34F75c8Cbe518BBBD6363E4f840C26bB54c9c5eE'],
  ['baby-chimp-gang', 'BabyChimpGang', '', '0xa0a92050d3082Ee4Cf97a5f167f3DCeE1184F8db'],
];

export const BITNET_NFT_COLLECTIONS: NftCollection[] = COLLECTION_HINTS.map(([id, name, symbol, contract]) => ({
  id, name, symbol, contract,
  standard: 'ERC-721',
  description: 'NFT collection on Bitnet. Live indexed records are loaded when available.',
  bannerImage: '', iconImage: '',
  totalSupply: null, minted: null, holdersCount: null,
  verified: false, category: 'NFT Collection',
  items: [], holders: [], recentTransfers: [],
  dataStatus: 'unloaded', ownershipComplete: false, transfersComplete: false,
}));
