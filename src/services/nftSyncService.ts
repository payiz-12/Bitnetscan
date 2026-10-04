import { ethers } from 'ethers';
import { rpcService } from './rpc';
import { 
  BITNET_NFT_COLLECTIONS, 
  NftCollection, 
  NftItem, 
  NftHolder, 
  NftTransfer 
} from '../data/nftCollections';

export interface AddressNftTransfer {
  hash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  tokenId: number;
  tokenName: string;
  collectionId: string;
  collectionName: string;
  collectionContract: string;
  collectionIcon: string;
  imageUrl: string;
  type: 'MINT' | 'IN' | 'OUT';
  priceBtn?: number;
}

export interface AddressNftHolding {
  tokenId: number;
  name: string;
  image: string;
  collectionId: string;
  collectionName: string;
  collectionContract: string;
  collectionSymbol: string;
  standard: string;
  rarity?: 'Legendary' | 'Epic' | 'Rare' | 'Common' | string;
  rarityColor?: string;
  traits: { trait_type: string; value: string }[];
  mintDate?: string;
  priceBtn?: number;
}


// Top reliable and fast IPFS Gateways
export const PUBLIC_IPFS_GATEWAYS = [
  'https://ipfs.filebase.io/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://w3s.link/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://dweb.link/ipfs/',
  'https://nftstorage.link/ipfs/',
  'https://ipfs.orbitor.dev/ipfs/'
];

export const KNOWN_COLLECTION_MINT_DATES: Record<string, string> = {
  '0xd03b179692303741393ee9a26e34e5ef4593741f': '2024-08-04', // BitnetPunks
  '0x155fe91ce99862df12906eaf199b48872ca5b709': '2024-09-15', // Milestone
  '0x2142c6ddbfa7ae9e283d0fbffffbe14e502d6265': '2024-09-20', // TheVillage
  '0x34f75c8cbe518bbbd6363e4f840c26bb54c9c5ee': '2024-08-02', // Xenwave
  '0xa0a92050d3082ee4cf97a5f167f3dcee1184f8db': '2024-08-28', // BabyChimpGang
  'bitnet-punks': '2024-08-04',
  'milestone': '2024-09-15',
  'the-village': '2024-09-20',
  'xenwave': '2024-08-02',
  'baby-chimp-gang': '2024-08-28',
};

export function getAuthenticMintDate(contractOrId: string, existingDate?: string): string {
  if (existingDate && existingDate.trim().length >= 4) {
    return existingDate.trim();
  }
  const key = (contractOrId || '').toLowerCase();
  return KNOWN_COLLECTION_MINT_DATES[key] || '';
}

const LOCAL_STORAGE_COLLECTIONS_KEY = 'bitnet_dynamic_nft_collections_v3';
const LOCAL_STORAGE_IMAGE_CACHE_KEY = 'bitnet_nft_img_cache_v3';

/**
 * Intelligent IPFS Gateway Manager and Fast Image Cache
 */
class IpfsGatewayManager {
  private cache: Map<string, string> = new Map();
  private preferredGateway: string = PUBLIC_IPFS_GATEWAYS[0];

  constructor() {
    this.loadCacheFromStorage();
  }

  private loadCacheFromStorage() {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_IMAGE_CACHE_KEY);
      if (saved) {
        const obj = JSON.parse(saved);
        Object.entries(obj).forEach(([k, v]) => {
          this.cache.set(k, v as string);
        });
      }
    } catch {}
  }

  private saveCacheToStorage() {
    try {
      const obj: Record<string, string> = {};
      let count = 0;
      // Store up to 400 most recent image URLs
      for (const [k, v] of this.cache.entries()) {
        obj[k] = v;
        if (++count > 400) break;
      }
      localStorage.setItem(LOCAL_STORAGE_IMAGE_CACHE_KEY, JSON.stringify(obj));
    } catch {}
  }

  public getCachedWorkingUrl(originalUrl: string): string | null {
    if (!originalUrl) return null;
    return this.cache.get(originalUrl) || null;
  }

  public markWorkingUrl(originalUrl: string, workingUrl: string) {
    if (!originalUrl || !workingUrl) return;
    this.cache.set(originalUrl, workingUrl);
    
    // Remember the gateway that worked
    for (const gw of PUBLIC_IPFS_GATEWAYS) {
      if (workingUrl.startsWith(gw)) {
        this.preferredGateway = gw;
        break;
      }
    }

    this.saveCacheToStorage();
  }

  /**
   * Generates prioritized gateway URLs for any IPFS link
   */
  public getCandidateUrls(url: string): string[] {
    if (!url) return [];

    const cached = this.cache.get(url);
    const candidates: string[] = [];

    if (cached) {
      candidates.push(cached);
    }

    // Extract CID and path from various IPFS URL patterns
    let ipfsPath = '';

    if (url.startsWith('ipfs://')) {
      ipfsPath = url.replace('ipfs://', '');
    } else if (url.includes('.ipfs.w3s.link/')) {
      const match = url.match(/https:\/\/([^.]+)\.ipfs\.w3s\.link\/(.+)/);
      if (match) {
        ipfsPath = `${match[1]}/${match[2]}`;
      }
    } else if (url.includes('/ipfs/')) {
      ipfsPath = url.substring(url.indexOf('/ipfs/') + 6);
    }

    if (ipfsPath) {
      // Put preferred gateway first
      candidates.push(`${this.preferredGateway}${ipfsPath}`);
      for (const gw of PUBLIC_IPFS_GATEWAYS) {
        const full = `${gw}${ipfsPath}`;
        if (!candidates.includes(full)) {
          candidates.push(full);
        }
      }
    } else {
      // Standard HTTP(S) url
      if (!candidates.includes(url)) {
        candidates.push(url);
      }
    }

    return candidates;
  }

  /**
   * Pre-fetches high-priority images into browser cache in parallel
   */
  public prefetchImages(urls: string[]) {
    if (typeof window === 'undefined') return;
    urls.slice(0, 15).forEach((url) => {
      const candidates = this.getCandidateUrls(url);
      if (candidates.length > 0) {
        const img = new window.Image();
        img.src = candidates[0];
      }
    });
  }
}

export const ipfsGatewayManager = new IpfsGatewayManager();

/**
 * Robust EVM String/Bytes32 Decoder
 */
export function decodeStringOrBytes32(hex: string): string {
  if (!hex || hex === '0x' || hex.length < 4) return '';
  try {
    const coder = ethers.AbiCoder.defaultAbiCoder();
    const [res] = coder.decode(['string'], hex);
    if (typeof res === 'string' && res.trim()) return res.trim();
  } catch {}

  try {
    const res = ethers.decodeBytes32String(hex);
    if (res && res.trim()) return res.trim();
  } catch {}

  // Fallback: direct printable ASCII byte scanning
  try {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    let str = '';
    for (let i = 0; i < clean.length; i += 2) {
      const code = parseInt(clean.substr(i, 2), 16);
      if (code >= 32 && code <= 126) str += String.fromCharCode(code);
    }
    return str.trim();
  } catch {
    return '';
  }
}

/**
 * On-Chain NFT Sync & Live Minting Service
 */
class NftSyncService {
  private explorerEndpoints = [
    '/api/bitnet-explorer/api/v2',
    'https://explorer.bitnetmoney.org/api/v2',
    '/api/explorer/api/v2',
    'https://explorer.bitnetmoney.com/api/v2'
  ];

  /**
   * Load stored collections, merging base curated collections with any dynamically discovered ones
   */
  public getStoredCollections(): NftCollection[] {
    const baseMap = new Map<string, NftCollection>();
    BITNET_NFT_COLLECTIONS.forEach((col) => {
      // Ensure base items have clean authentic dates
      col.items.forEach(it => {
        it.mintDate = getAuthenticMintDate(col.contract, it.mintDate);
      });
      baseMap.set(col.contract.toLowerCase(), col);
    });

    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_COLLECTIONS_KEY);
      if (saved) {
        const dynamicCols: NftCollection[] = JSON.parse(saved);
        dynamicCols.forEach((col) => {
          const key = col.contract.toLowerCase();
          if (baseMap.has(key)) {
            // Merge newly discovered items, protecting authentic mint dates
            const existing = baseMap.get(key)!;
            const itemMap = new Map<number, NftItem>();
            existing.items.forEach(it => {
              it.mintDate = getAuthenticMintDate(col.contract, it.mintDate);
              itemMap.set(it.id, it);
            });
            col.items.forEach(it => {
              const prev = itemMap.get(it.id);
              const authenticDate = getAuthenticMintDate(col.contract, prev?.mintDate || it.mintDate);
              itemMap.set(it.id, {
                ...it,
                mintDate: authenticDate
              });
            });
            existing.items = Array.from(itemMap.values()).sort((a,b) => b.id - a.id);
            existing.holdersCount = Math.max(existing.holdersCount, col.holdersCount || 0);
            existing.minted = Math.max(existing.minted, existing.items.length, col.minted || 0);
          } else {
            if (Array.isArray(col.items)) {
              col.items.forEach(it => {
                it.mintDate = getAuthenticMintDate(col.contract, it.mintDate);
              });
            }
            baseMap.set(key, col);
          }
        });
      }
    } catch (e) {
      console.warn('Could not read dynamic collections from storage', e);
    }

    return Array.from(baseMap.values());
  }

  /**
   * Save dynamic collections to persistent storage
   */
  public saveCollectionsToStorage(collections: NftCollection[]) {
    try {
      localStorage.setItem(LOCAL_STORAGE_COLLECTIONS_KEY, JSON.stringify(collections));
    } catch (e) {
      console.warn('Could not save dynamic collections to storage', e);
    }
  }

  /**
   * Fetch all ERC-721 collections directly from the on-chain indexer
   */
  public async syncOnChainCollections(): Promise<NftCollection[]> {
    let rawTokens: any[] = [];
    let usedEndpoint = '';

    for (const ep of this.explorerEndpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);

        const res = await fetch(`${ep}/tokens?type=ERC-721`, {
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.items) && data.items.length > 0) {
            rawTokens = data.items;
            usedEndpoint = ep;
            break;
          }
        }
      } catch {
        continue;
      }
    }

    if (rawTokens.length === 0) {
      return this.getStoredCollections();
    }

    const currentCollections = this.getStoredCollections();
    const collectionMap = new Map<string, NftCollection>();
    currentCollections.forEach((c) => collectionMap.set(c.contract.toLowerCase(), c));

    // For each token discovered on chain:
    for (const token of rawTokens) {
      const address = (token.address_hash || token.address || '').toLowerCase();
      if (!address || !address.startsWith('0x')) continue;

      let existing = collectionMap.get(address);

      // If not yet present or needs sync, fetch instances
      try {
        const instancesRes = await fetch(`${usedEndpoint}/tokens/${address}/instances`);
        if (instancesRes.ok) {
          const instData = await instancesRes.json();
          const items: NftItem[] = (instData.items || []).map((inst: any) => {
            const id = Number(inst.id);
            const rawAttrs = inst.metadata?.attributes || [];
            const traits = rawAttrs.map((a: any) => ({
              trait_type: a.trait_type || 'Property',
              value: String(a.value || '')
            }));

            let rarity: any = 'Common';
            let rarityColor = 'bg-slate-600 text-white';
            if (traits.length >= 5 || id === 1) {
              rarity = 'Legendary';
              rarityColor = 'bg-amber-500 text-white';
            } else if (traits.length >= 3) {
              rarity = 'Epic';
              rarityColor = 'bg-purple-600 text-white';
            } else if (traits.length >= 2) {
              rarity = 'Rare';
              rarityColor = 'bg-sky-600 text-white';
            }

            const img = inst.image_url || inst.metadata?.image || '';

            const existingItem = existing?.items.find(it => it.id === id);
            const authenticMintDate = getAuthenticMintDate(address, existingItem?.mintDate);

            return {
              id,
              name: inst.metadata?.name || `${token.name || 'Token'} #${id}`,
              image: img,
              rarity,
              rarityColor,
              owner: inst.owner?.hash || '0x0000000000000000000000000000000000000000',
              mintDate: authenticMintDate,
              traits: traits.length > 0 ? traits : [{ trait_type: 'Type', value: 'Standard NFT' }],
              priceBtn: undefined
            };
          });

          // Calculate holders list
          const holderMap: Record<string, number[]> = {};
          items.forEach(it => {
            if (!holderMap[it.owner]) holderMap[it.owner] = [];
            holderMap[it.owner].push(it.id);
          });
          const holders: NftHolder[] = Object.keys(holderMap).map((addr, idx) => ({
            rank: idx + 1,
            address: addr,
            quantity: holderMap[addr].length,
            percentage: ((holderMap[addr].length / Math.max(1, items.length)) * 100).toFixed(1) + '%',
            tokenIds: holderMap[addr].sort((a,b) => a - b)
          })).sort((a,b) => b.quantity - a.quantity).map((h, i) => ({ ...h, rank: i + 1 }));

          if (existing) {
            existing.holdersCount = Number(token.holders_count || holders.length || existing.holdersCount);
            existing.minted = Math.max(existing.minted, items.length);
            if (items.length > 0) {
              // Merge items
              const im = new Map<number, NftItem>();
              existing.items.forEach(it => im.set(it.id, it));
              items.forEach(it => im.set(it.id, it));
              existing.items = Array.from(im.values()).sort((a,b) => b.id - a.id);
            }
            if (holders.length > 0) existing.holders = holders;
          } else {
            // Newly discovered on-chain collection!
            const newCol: NftCollection = {
              id: `onchain-${address.slice(2, 10)}`,
              name: token.name || `BTS-721 (${address.slice(0, 8)}...)`,
              symbol: token.symbol || 'NFT',
              contract: address,
              standard: 'BTS-721 / ERC-721',
              description: `Verified on-chain NFT collection discovered on Bitnet L1. Contains ${token.holders_count || holders.length} HODL wallets.`,
              bannerImage: items[0]?.image || '/bitnet-logo-blue.svg',
              iconImage: items[0]?.image || '/bitnet-logo-blue.svg',
              totalSupply: Number(token.total_supply || items.length || 0),
              minted: items.length || Number(token.total_supply || 0),
              holdersCount: Number(token.holders_count || holders.length || 1),
              floorPriceBtn: undefined,
              volume24hBtn: undefined,
              verified: false,
              category: 'Community & On-Chain',
              items,
              holders,
              recentTransfers: []
            };
            collectionMap.set(address, newCol);
          }
        }
      } catch (err) {
        console.warn(`Could not sync instances for ${address}:`, err);
      }
    }

    const updated = Array.from(collectionMap.values());
    this.saveCollectionsToStorage(updated);
    return updated;
  }

  /**
   * Introspects ANY contract directly on Bitnet RPC (EVM calls)
   */
  public async importCollectionFromRpc(contractAddress: string, tokenIdSample = 1): Promise<NftCollection> {
    const addr = contractAddress.trim();
    if (!addr.startsWith('0x') || addr.length !== 42) {
      throw new Error('Please enter a valid 0x format Bitnet contract address.');
    }

    const code = await rpcService.getCode(addr);
    if (!code || code === '0x') {
      throw new Error('No smart contract bytecode found at this address. Please check the address.');
    }

    // Call ERC-721 name() -> 0x06fdde03
    let name = 'Unknown Collection';
    try {
      const nameHex = await rpcService.call(addr, '0x06fdde03');
      name = decodeStringOrBytes32(nameHex) || name;
    } catch {}

    // Call ERC-721 symbol() -> 0x95d89b41
    let symbol = 'BTS-721';
    try {
      const symHex = await rpcService.call(addr, '0x95d89b41');
      symbol = decodeStringOrBytes32(symHex) || symbol;
    } catch {}

    // Call ERC-721 totalSupply() -> 0x18160ddd
    let totalSupply = 100;
    try {
      const supplyHex = await rpcService.call(addr, '0x18160ddd');
      if (supplyHex && supplyHex !== '0x') {
        totalSupply = parseInt(supplyHex, 16);
      }
    } catch {}

    // Call ownerOf(sampleId) -> 0x6352211e + pad64(id)
    const idHex = BigInt(tokenIdSample).toString(16).padStart(64, '0');
    let owner = '0x0000000000000000000000000000000000000000';
    try {
      const ownerHex = await rpcService.call(addr, '0x6352211e' + idHex);
      if (ownerHex && ownerHex.length >= 66) {
        owner = '0x' + ownerHex.slice(26);
      }
    } catch {}

    // Call tokenURI(sampleId) -> 0xc87b56dd + pad64(id)
    let tokenUri = '';
    try {
      const uriHex = await rpcService.call(addr, '0xc87b56dd' + idHex);
      tokenUri = decodeStringOrBytes32(uriHex);
    } catch {}

    let imageUrl = '';
    let nftName = `${name} #${tokenIdSample}`;
    let traits: { trait_type: string; value: string }[] = [];

    // If tokenUri resolved, fetch metadata
    if (tokenUri) {
      try {
        const candidateUrls = ipfsGatewayManager.getCandidateUrls(tokenUri);
        for (const metaUrl of candidateUrls.slice(0, 3)) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3500);
            const r = await fetch(metaUrl, { signal: controller.signal });
            clearTimeout(timeout);
            if (r.ok) {
              const meta = await r.json();
              if (meta.name) nftName = meta.name;
              if (meta.image) imageUrl = meta.image;
              if (Array.isArray(meta.attributes)) {
                traits = meta.attributes.map((a: any) => ({
                  trait_type: a.trait_type || 'Property',
                  value: String(a.value || '')
                }));
              }
              break;
            }
          } catch {}
        }
      } catch {}
    }

    const item: NftItem = {
      id: tokenIdSample,
      name: nftName,
      image: imageUrl || '/bitnet-logo-blue.svg',
      rarity: 'Legendary' as any,
      rarityColor: 'bg-amber-500 text-white',
      owner,
      mintDate: getAuthenticMintDate(addr),
      traits: traits.length > 0 ? traits : [{ trait_type: 'On-Chain', value: 'Direct RPC' }],
    };

    const newCollection: NftCollection = {
      id: `imported-${addr.slice(2, 10)}`,
      name,
      symbol,
      contract: addr,
      standard: 'BTS-721 / ERC-721',
      description: `${name} collection imported directly from on-chain Bitnet L1 via RPC calls.`,
      bannerImage: imageUrl || '/bitnet-logo-blue.svg',
      iconImage: imageUrl || '/bitnet-logo-blue.svg',
      totalSupply: Math.max(totalSupply, 1),
      minted: 1,
      holdersCount: 1,
      floorPriceBtn: undefined,
      volume24hBtn: undefined,
      verified: false,
      category: 'Custom / RPC Import',
      items: [item],
      holders: [
        {
          rank: 1,
          address: owner,
          quantity: 1,
          percentage: '100%',
          tokenIds: [tokenIdSample]
        }
      ],
      recentTransfers: []
    };

    // Save to stored collections
    const collections = this.getStoredCollections();
    const existingIdx = collections.findIndex(c => c.contract.toLowerCase() === addr.toLowerCase());
    if (existingIdx >= 0) {
      collections[existingIdx] = newCollection;
    } else {
      collections.unshift(newCollection);
    }
    this.saveCollectionsToStorage(collections);

    return newCollection;
  }

  /**
   * Fetches on-chain BTS-721 NFT transfers and owned NFT holdings for any address.
   */
  public async getAddressNftOverview(address: string): Promise<{
    transfers: AddressNftTransfer[];
    holdings: AddressNftHolding[];
  }> {
    const cleanAddr = address.trim().toLowerCase();
    if (!cleanAddr || !cleanAddr.startsWith('0x')) {
      return { transfers: [], holdings: [] };
    }

    const collections = this.getStoredCollections();
    const holdingsMap = new Map<string, AddressNftHolding>();
    const transfersList: AddressNftTransfer[] = [];
    const seenTxHashes = new Set<string>();

    // 1. First attempt to fetch live ERC-721 token transfers from Bitnet Indexer APIs
    const indexerEndpoints = [
      `/api/bitnet-explorer/api/v2/addresses/${cleanAddr}/token-transfers?type=ERC-721`,
      `/api/explorer/api?module=account&action=tokennfttx&address=${cleanAddr}&page=1&offset=50&sort=desc`,
      `https://explorer.bitnetmoney.org/api/v2/addresses/${cleanAddr}/token-transfers?type=ERC-721`,
      `https://explorer.bitnetmoney.com/api?module=account&action=tokennfttx&address=${cleanAddr}&page=1&offset=50&sort=desc`
    ];

    for (const ep of indexerEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(ep, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          // Support Blockscout v2 format
          if (Array.isArray(data.items) && data.items.length > 0) {
            for (const item of data.items) {
              const txHash = item.transaction_hash || item.hash || '';
              if (!txHash || seenTxHashes.has(txHash.toLowerCase())) continue;
              seenTxHashes.add(txHash.toLowerCase());

              const fromAddr = (item.from?.hash || item.from || '').toLowerCase();
              const toAddr = (item.to?.hash || item.to || '').toLowerCase();
              const tokenId = Number(item.total?.token_id || item.token_id || 1);
              const isMint = fromAddr === '0x0000000000000000000000000000000000000000' || !fromAddr;
              const type: 'MINT' | 'IN' | 'OUT' = isMint ? 'MINT' : (toAddr === cleanAddr ? 'IN' : 'OUT');
              const colName = item.token?.name || 'Bitnet BTS-721 NFT';
              const colContract = item.token?.address || '';
              const img = item.token_instance?.image_url || item.token?.icon_url || '';

              transfersList.push({
                hash: txHash,
                blockNumber: Number(item.block_number || 7000000),
                timestamp: item.timestamp ? Math.floor(new Date(item.timestamp).getTime() / 1000) : Math.floor(Date.now() / 1000 - 3600),
                from: fromAddr || '0x0000000000000000000000000000000000000000',
                to: toAddr,
                tokenId,
                tokenName: `${colName} #${tokenId}`,
                collectionId: `col-${colContract.slice(2, 8)}`,
                collectionName: colName,
                collectionContract: colContract,
                collectionIcon: img || '/bitnet-logo-blue.svg',
                imageUrl: img || '/bitnet-logo-blue.svg',
                type,
              });
            }
            break;
          }
          // Support Etherscan format
          if (data.status === '1' && Array.isArray(data.result) && data.result.length > 0) {
            for (const item of data.result) {
              const txHash = item.hash || '';
              if (!txHash || seenTxHashes.has(txHash.toLowerCase())) continue;
              seenTxHashes.add(txHash.toLowerCase());

              const fromAddr = (item.from || '').toLowerCase();
              const toAddr = (item.to || '').toLowerCase();
              const tokenId = Number(item.tokenID || 1);
              const isMint = fromAddr === '0x0000000000000000000000000000000000000000' || !fromAddr;
              const type: 'MINT' | 'IN' | 'OUT' = isMint ? 'MINT' : (toAddr === cleanAddr ? 'IN' : 'OUT');
              const colName = item.tokenName || 'BTS-721 NFT';

              transfersList.push({
                hash: txHash,
                blockNumber: Number(item.blockNumber || 7000000),
                timestamp: Number(item.timeStamp || Math.floor(Date.now() / 1000)),
                from: fromAddr,
                to: toAddr,
                tokenId,
                tokenName: `${colName} #${tokenId}`,
                collectionId: `col-${item.contractAddress.slice(2, 8)}`,
                collectionName: colName,
                collectionContract: item.contractAddress,
                collectionIcon: '/bitnet-logo-blue.svg',
                imageUrl: '/bitnet-logo-blue.svg',
                type,
              });
            }
            break;
          }
        }
      } catch {}
    }

    // 2. Scan on-chain Bitnet collections & verified ledgers
    for (const col of collections) {
      const colContract = col.contract.toLowerCase();

      // Check items owned by this wallet
      for (const it of col.items) {
        if (it.owner.toLowerCase() === cleanAddr) {
          const key = `${colContract}_${it.id}`;
          if (!holdingsMap.has(key)) {
            holdingsMap.set(key, {
              tokenId: it.id,
              name: it.name || `${col.name} #${it.id}`,
              image: it.image,
              collectionId: col.id,
              collectionName: col.name,
              collectionContract: col.contract,
              collectionSymbol: col.symbol,
              standard: col.standard,
              rarity: it.rarity,
              rarityColor: it.rarityColor,
              traits: it.traits || [],
              mintDate: it.mintDate,
              priceBtn: it.priceBtn || col.floorPriceBtn
            });
          }
        }
      }

      // Check verified holders ledger
      for (const h of col.holders) {
        if (h.address.toLowerCase() === cleanAddr) {
          for (const tid of h.tokenIds) {
            const key = `${colContract}_${tid}`;
            if (!holdingsMap.has(key)) {
              // Try to find matching item in col.items
              const match = col.items.find(x => x.id === tid);
              let itemImg = match?.image;
              if (!itemImg) {
                // If col has item pattern (like .../714.png), derive from first item
                if (col.items.length > 0 && col.items[0].image.includes('/')) {
                  const base = col.items[0].image.substring(0, col.items[0].image.lastIndexOf('/'));
                  itemImg = `${base}/${tid}.png`;
                } else {
                  itemImg = col.iconImage;
                }
              }

              holdingsMap.set(key, {
                tokenId: tid,
                name: match?.name || `${col.name} #${tid}`,
                image: itemImg,
                collectionId: col.id,
                collectionName: col.name,
                collectionContract: col.contract,
                collectionSymbol: col.symbol,
                standard: col.standard,
                rarity: (match?.rarity as any) || (tid <= 10 ? 'Legendary' : tid <= 100 ? 'Epic' : 'Common'),
                rarityColor: match?.rarityColor || (tid <= 10 ? 'bg-amber-500 text-white' : tid <= 100 ? 'bg-purple-600 text-white' : 'bg-slate-600 text-white'),
                traits: match?.traits || [{ trait_type: 'Token ID', value: String(tid) }],
                mintDate: match?.mintDate || getAuthenticMintDate(col.contract),
                priceBtn: match?.priceBtn
              });
            }
          }
        }
      }

      // Check recentTransfers involving this wallet
      for (const tx of col.recentTransfers) {
        const fromA = tx.from.toLowerCase();
        const toA = tx.to.toLowerCase();
        if (fromA === cleanAddr || toA === cleanAddr) {
          if (!seenTxHashes.has(tx.hash.toLowerCase())) {
            seenTxHashes.add(tx.hash.toLowerCase());
            const itm = col.items.find(x => x.id === tx.tokenId);
            const isMint = fromA === '0x0000000000000000000000000000000000000000' || !fromA;
            const type: 'MINT' | 'IN' | 'OUT' = isMint ? 'MINT' : (toA === cleanAddr ? 'IN' : 'OUT');

            const approxBlock = tx.blockNumber || Math.max(1, Math.round((tx.timestamp - 1689317647) / 14.6));
            transfersList.push({
              hash: tx.hash,
              blockNumber: approxBlock,
              timestamp: tx.timestamp,
              from: tx.from,
              to: tx.to,
              tokenId: tx.tokenId,
              tokenName: itm?.name || `${col.name} #${tx.tokenId}`,
              collectionId: col.id,
              collectionName: col.name,
              collectionContract: col.contract,
              collectionIcon: col.iconImage,
              imageUrl: itm?.image || col.iconImage,
              type,
              priceBtn: tx.priceBtn
            });
          }
        }
      }
    }

    const holdings = Array.from(holdingsMap.values());

    // Prefetch images into browser cache so they appear instantaneously
    const urlsToPrefetch = [
      ...holdings.map(h => h.image),
      ...transfersList.map(t => t.imageUrl)
    ].filter(Boolean);
    ipfsGatewayManager.prefetchImages(urlsToPrefetch);

    // Sort transfers newest first
    transfersList.sort((a, b) => b.timestamp - a.timestamp || b.blockNumber - a.blockNumber);

    return {
      transfers: transfersList,
      holdings
    };
  }
}

export const nftSyncService = new NftSyncService();

