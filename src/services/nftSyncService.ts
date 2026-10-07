import { ethers } from 'ethers';
import { rpcService } from './rpc';
import { BITNET_NFT_COLLECTIONS, NftCollection, NftItem, NftTransfer } from '../data/nftCollections';
import { SEEDED_NFT_COLLECTIONS } from '../data/nftSeeds';
import {
  ZERO_ADDRESS, PUBLIC_IPFS_GATEWAYS, resourceUrls, metadataFields, decodeInlineMetadata,
  tokenIdString, compareTokenIds, addressString, mapInstance, mapTransfer, transferKey,
  buildHolders, applyMintDates, fetchAllPages,
} from './nftData';
import { canonicalIpfsUri, fetchVerifiedIpfs, IpfsFetch } from './ipfsResources';
export { PUBLIC_IPFS_GATEWAYS } from './nftData';

export interface AddressNftTransfer {
  hash: string;
  logIndex: number;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  tokenId: string;
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
  tokenId: string;
  name: string;
  image: string;
  collectionId: string;
  collectionName: string;
  collectionContract: string;
  collectionSymbol: string;
  standard: string;
  rarity?: string;
  rarityColor?: string;
  traits: { trait_type: string; value: string }[];
  mintDate?: string;
  priceBtn?: number;
}

export interface NftSyncResult {
  collections: NftCollection[];
  status: 'live' | 'partial' | 'cached' | 'error';
  syncedAt: string | null;
  message: string;
}

const STORAGE_KEY = 'bitnet_nft_indexed_collections_v4';
const EXPLORER_ENDPOINTS = [
  '/api/bitnet-explorer/api/v2', 'https://explorer.bitnetmoney.org/api/v2',
  '/api/explorer/api/v2', 'https://explorer.bitnetmoney.com/api/v2',
];

class IpfsGatewayManager {
  private cache = new Map<string, string>();
  public getCandidateUrls(uri: string): string[] {
    const urls = resourceUrls(uri, true);
    const cached = this.cache.get(uri);
    return cached && urls.includes(cached) ? [cached, ...urls.filter(url => url !== cached)] : urls;
  }
  public getCachedWorkingUrl(uri: string): string | null { return this.cache.get(uri) || null; }
  public markWorkingUrl(uri: string, workingUrl: string) {
    if (resourceUrls(uri, true).includes(workingUrl)) this.cache.set(uri, workingUrl);
  }
  public prefetchImages(uris: string[]) {
    if (typeof window === 'undefined') return;
    for (const uri of uris.slice(0, 12)) {
      const url = this.getCandidateUrls(uri)[0];
      if (url) { const image = new window.Image(); image.src = url; }
    }
  }
}
export const ipfsGatewayManager = new IpfsGatewayManager();

export function decodeStringOrBytes32(hex: string): string {
  if (!hex || hex === '0x') return '';
  try { return String(ethers.AbiCoder.defaultAbiCoder().decode(['string'], hex)[0]).trim(); } catch {}
  try { return ethers.decodeBytes32String(hex).trim(); } catch { return ''; }
}

async function mapConcurrent<T, R>(rows: T[], concurrency: number, task: (row: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(rows.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, async () => {
    while (cursor < rows.length) {
      const index = cursor++;
      results[index] = await task(rows[index]);
    }
  }));
  return results;
}

type NftRpc = Pick<typeof rpcService, 'getCode' | 'call' | 'getBlockNumber'>;

// Promise.any without raising the app's ES2020 browser requirement.
function firstSuccessful<T>(promises: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => {
    let pending = promises.length;
    if (!pending) { reject(new Error('No metadata endpoints')); return; }
    for (const promise of promises) promise.then(resolve, () => {
      if (--pending === 0) reject(new Error('Metadata endpoints unavailable'));
    });
  });
}

export class NftSyncService {
  private inFlight: Promise<NftSyncResult> | null = null;
  private lastResult: NftSyncResult | null = null;
  private lastAttempt = 0;
  constructor(
    private endpoints = EXPLORER_ENDPOINTS,
    private rpc: NftRpc = rpcService,
    private fetcher: typeof fetch = (input, init) => fetch(input, init),
    private storage: Storage | null = typeof localStorage === 'undefined' ? null : localStorage,
    private ipfsFetch: IpfsFetch = fetchVerifiedIpfs,
  ) {}

  private async fetchJson(url: string, signal?: AbortSignal): Promise<any> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await this.fetcher(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`NFT data request failed (HTTP ${response.status})`);
      return await response.json();
    } catch (error) {
      if (controller.signal.aborted) throw new Error('NFT data request timed out.');
      throw error;
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }

  private async fetchIndexerJson(url: string): Promise<any> {
    try { return await this.fetchJson(url); }
    catch { return await this.fetchJson(url); }
  }

  public getStoredCollections(): NftCollection[] {
    const collections = new Map(BITNET_NFT_COLLECTIONS.map(collection => [collection.contract.toLowerCase(), { ...collection }]));
    try {
      const cached = JSON.parse(this.storage?.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(cached)) for (const collection of cached) {
        if (!addressString(collection.contract) || !Array.isArray(collection.items) || !Array.isArray(collection.holders)
          || !Array.isArray(collection.recentTransfers) || !collection.syncedAt) continue;
        collections.set(collection.contract.toLowerCase(), { ...collection, verified: false, dataStatus: 'cached' });
      }
    } catch {}
    return [...collections.values()];
  }

  public getInitialCollections(): NftCollection[] {
    const stored = this.getStoredCollections();
    if (stored.some(c => c.items && c.items.length > 0)) {
      return stored;
    }
    return SEEDED_NFT_COLLECTIONS.map(c => ({ ...c }));
  }

  public saveCollectionsToStorage(collections: NftCollection[]) {
    try { this.storage?.setItem(STORAGE_KEY, JSON.stringify(collections)); } catch {}
  }

  public syncOnChainCollections(force = true): Promise<NftSyncResult> {
    if (this.inFlight) return this.inFlight;
    if (!force && this.lastResult && Date.now() - this.lastAttempt < 60000) return Promise.resolve(this.lastResult);
    this.lastAttempt = Date.now();
    this.inFlight = this.sync().finally(() => { this.inFlight = null; });
    return this.inFlight;
  }

  private async sync(): Promise<NftSyncResult> {
    const stored = this.getStoredCollections();
    let tokens: any[] = [], endpoint = '', discovered = false;
    for (const candidate of this.endpoints) {
      try {
        tokens = await fetchAllPages(candidate, '/tokens?type=ERC-721', url => this.fetchIndexerJson(url));
        endpoint = candidate;
        discovered = true;
        break;
      } catch {}
    }
    if (!discovered) {
      const result: NftSyncResult = {
        collections: stored, status: stored.some(collection => collection.syncedAt) ? 'cached' : 'error', syncedAt: null,
        message: 'Live NFT indexer unavailable. Previously indexed records, if any, are cached and may be outdated.',
      };
      this.lastResult = result;
      return result;
    }
    const byAddress = new Map<string, { token: any; previous?: NftCollection }>();
    for (const collection of stored) byAddress.set(collection.contract.toLowerCase(), { token: null, previous: collection });
    for (const token of tokens) {
      const address = addressString(token.address_hash ?? token.address).toLowerCase();
      if (address && token.type === 'ERC-721') byAddress.set(address, { token, previous: byAddress.get(address)?.previous });
    }
    const collections = await mapConcurrent([...byAddress.entries()], 3, async ([address, record]) => {
      const previous = record.previous;
      try {
        const token = record.token || await this.fetchIndexerJson(`${endpoint}/tokens/${address}`);
        if (token.type !== 'ERC-721' || addressString(token.address_hash ?? token.address).toLowerCase() !== address) throw new Error('Contract is not indexed as ERC-721');
        const rawInstances = await fetchAllPages(endpoint, `/tokens/${address}/instances`, url => this.fetchIndexerJson(url));
        const itemMap = new Map<string, NftItem>();
        for (const raw of rawInstances) {
          const item = mapInstance(raw, token.name || previous?.name || 'NFT');
          const duplicate = itemMap.get(item.id);
          if (duplicate && duplicate.owner.toLowerCase() !== item.owner.toLowerCase()) throw new Error('Ownership changed during pagination; refresh required');
          itemMap.set(item.id, item);
        }
        let items = [...itemMap.values()].sort((a, b) => compareTokenIds(b.id, a.id));
        const ownershipComplete = items.every(item => !!item.owner);
        const holders = buildHolders(items);
        const liveSupply = items.filter(item => item.owner && item.owner.toLowerCase() !== ZERO_ADDRESS).length;
        const indexedHolders = token.holders_count == null ? null : Number(token.holders_count);
        const consistent = indexedHolders === null || (Number.isSafeInteger(indexedHolders) && indexedHolders === holders.length);
        let transfers: NftTransfer[] = [], transfersComplete = false, error = '';
        try {
          const rawTransfers = await fetchAllPages(endpoint, `/tokens/${address}/transfers`, url => this.fetchIndexerJson(url));
          const unique = new Map<string, NftTransfer>();
          for (const raw of rawTransfers) {
            const transfer = mapTransfer(raw);
            unique.set(transferKey(transfer), transfer);
          }
          transfers = [...unique.values()].sort((a, b) => b.blockNumber - a.blockNumber || b.logIndex - a.logIndex);
          transfersComplete = true;
          items = applyMintDates(items, transfers);
        } catch (cause) { error = cause instanceof Error ? cause.message : 'Transfer history unavailable'; }
        const complete = ownershipComplete && consistent && transfersComplete;
        if (!ownershipComplete || !consistent) error = 'Indexer ownership records are incomplete or inconsistent; refresh required.';
        const image = items.find(item => item.image)?.image || '';
        return {
          id: previous?.id || `onchain-${address}`, name: token.name || previous?.name || address,
          symbol: token.symbol || '', contract: address, standard: 'ERC-721',
          description: 'ERC-721 collection on Bitnet. Ownership, mint events and metadata below are indexed blockchain records.',
          bannerImage: image, iconImage: image,
          totalSupply: ownershipComplete && consistent ? liveSupply : null,
          minted: transfersComplete ? transfers.filter(transfer => transfer.type === 'MINT').length : null,
          holdersCount: ownershipComplete && consistent ? holders.length : null,
          verified: false, category: 'NFT Collection', items, holders,
          recentTransfers: transfers, ownershipComplete: ownershipComplete && consistent, transfersComplete,
          dataStatus: complete ? 'indexed' : 'partial', source: endpoint, syncedAt: new Date().toISOString(), error,
        } as NftCollection;
      } catch (cause) {
        return {
          ...(previous || BITNET_NFT_COLLECTIONS[0]), id: previous?.id || `onchain-${address}`, contract: address,
          name: previous?.name || record.token?.name || address, symbol: previous?.symbol || record.token?.symbol || '',
          dataStatus: previous?.syncedAt ? 'cached' : 'error',
          error: cause instanceof Error ? cause.message : 'NFT collection unavailable',
        } as NftCollection;
      }
    });
    const allComplete = collections.length > 0 && collections.every(collection => collection.dataStatus === 'indexed');
    const fresh = collections.some(collection => ['indexed', 'partial'].includes(collection.dataStatus));
    const result: NftSyncResult = {
      collections, status: allComplete ? 'live' : fresh ? 'partial' : collections.some(collection => collection.syncedAt) ? 'cached' : 'error',
      syncedAt: fresh ? new Date().toISOString() : null,
      message: allComplete
        ? 'All ERC-721 collection and instance pages were loaded from the Bitnet indexer. Open a token to check its current owner and tokenURI via RPC.'
        : 'Some NFT records are incomplete, cached or unavailable. Collection status shows the available coverage.',
    };
    this.saveCollectionsToStorage(collections);
    this.lastResult = result;
    return result;
  }

  private async readMetadata(uri: string): Promise<any> {
    if (/^data:/i.test(uri)) return decodeInlineMetadata(uri);
    const urls = resourceUrls(uri);
    if (!urls.length) throw new Error('Unsupported tokenURI');
    const controller = new AbortController();
    try {
      const read = async (url: string, metadataPromise: Promise<any>) => {
        const metadata = await metadataPromise;
        if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error('Invalid metadata');
        // Resolve relative images against the metadata document, not another token's image.
        const image = metadata.image ?? metadata.image_url;
        if (typeof image === 'string' && image && !/^[a-z][a-z\d+.-]*:/i.test(image)) metadata.image = new URL(image, url).href;
        return metadata;
      };
      const requests = urls.map(url => read(url, this.fetchJson(url, controller.signal)));
      const ipfsUri = canonicalIpfsUri(uri);
      if (ipfsUri) requests.push(read(ipfsUri, (async () => {
        const timer = setTimeout(() => controller.abort(), 40000);
        try {
          const response = await this.ipfsFetch(ipfsUri, controller.signal);
          if (!response.ok) throw new Error('IPFS metadata unavailable');
          return await response.json();
        } finally { clearTimeout(timer); }
      })()));
      return await firstSuccessful(requests);
    } catch { throw new Error('Metadata could not be loaded from the contract tokenURI'); }
    finally { controller.abort(); }
  }

  public async getNftDetails(contractAddress: string, tokenId: string | number, indexedItem?: NftItem): Promise<NftItem> {
    const address = contractAddress.trim().toLowerCase();
    if (!ethers.isAddress(address)) throw new Error('Enter a valid contract address.');
    const id = tokenIdString(tokenId), padded = BigInt(id).toString(16).padStart(64, '0');
    let code: string;
    try { code = await this.rpc.getCode(address, 15000); }
    catch { throw new Error('RPC contract lookup unavailable. Refresh to retry verification.'); }
    if (!code || code === '0x') throw new Error('No contract exists at this address.');
    const block = await this.rpc.getBlockNumber(), blockTag = '0x' + block.toString(16);
    const coder = ethers.AbiCoder.defaultAbiCoder();
    const support = await this.rpc.call(address, '0x01ffc9a7' + '80ac58cd'.padEnd(64, '0'), blockTag, 15000);
    if (!coder.decode(['bool'], support)[0]) throw new Error('This contract does not support ERC-721.');
    let owner: string;
    try {
      const rawOwner = await this.rpc.call(address, '0x6352211e' + padded, blockTag, 15000);
      owner = String(coder.decode(['address'], rawOwner)[0]);
      if (owner.toLowerCase() === ZERO_ADDRESS) throw new Error('Invalid owner');
    } catch { throw new Error('The NFT does not exist at this block, or its owner could not be verified.'); }
    const [nameResult, uriResult] = await Promise.allSettled([
      this.rpc.call(address, '0x06fdde03', blockTag, 15000), this.rpc.call(address, '0xc87b56dd' + padded, blockTag, 15000),
    ]);
    const collectionName = nameResult.status === 'fulfilled' ? decodeStringOrBytes32(nameResult.value) : '';
    const tokenUri = uriResult.status === 'fulfilled' ? decodeStringOrBytes32(uriResult.value) : '';
    const matchingItem = indexedItem?.id === id ? indexedItem : undefined;
    let metadata: any = null, metadataError = '';
    if (tokenUri) {
      try { metadata = await this.readMetadata(tokenUri); }
      catch { metadataError = 'The contract metadata URI is currently unreachable. Any indexed metadata shown below is a snapshot.'; }
    } else { metadataError = 'The contract tokenURI could not be read. Any indexed metadata shown below is a snapshot.'; }
    let mintDate = matchingItem?.mintDate || '';
    if (!mintDate) for (const endpoint of this.endpoints) {
      try {
        const rows = await fetchAllPages(endpoint, `/tokens/${address}/instances/${id}/transfers`, url => this.fetchIndexerJson(url));
        mintDate = applyMintDates([{ id } as NftItem], rows.map(mapTransfer))[0].mintDate;
        break;
      } catch {}
    }
    return {
      id, ...(metadata ? metadataFields(metadata, `${collectionName || 'NFT'} #${id}`)
        : matchingItem?.metadataSource === 'indexer' ? { name: matchingItem.name, image: matchingItem.image, traits: matchingItem.traits }
          : metadataFields(null, `${collectionName || 'NFT'} #${id}`)),
      owner, mintDate, tokenUri, metadataError,
      ownerSource: 'rpc', checkedBlock: block,
      metadataSource: metadata ? 'tokenURI' : matchingItem?.metadataSource === 'indexer' ? 'indexer' : 'unavailable',
    };
  }

  public async importCollectionFromRpc(contractAddress: string, sampleId: string | number = '1'): Promise<NftCollection> {
    const item = await this.getNftDetails(contractAddress, sampleId);
    const contract = contractAddress.trim().toLowerCase();
    const collection: NftCollection = {
      id: `imported-${contract}`, contract, name: 'Imported ERC-721 collection', symbol: '', standard: 'ERC-721',
      description: 'Single NFT checked via RPC. Complete collection supply and holder distribution have not been indexed.',
      bannerImage: item.image, iconImage: item.image, totalSupply: null, minted: null, holdersCount: null,
      verified: false, category: 'RPC inspection', items: [item], holders: [], recentTransfers: [],
      dataStatus: 'partial', ownershipComplete: false, transfersComplete: false,
      syncedAt: new Date().toISOString(),
    };
    const collections = this.getStoredCollections().filter(existing => existing.contract.toLowerCase() !== contract);
    collections.push(collection);
    this.saveCollectionsToStorage(collections);
    return collection;
  }

  public async getAddressNftOverview(address: string): Promise<{
    transfers: AddressNftTransfer[]; holdings: AddressNftHolding[]; complete: boolean; message: string;
  }> {
    const cleanAddress = address.trim().toLowerCase();
    if (!ethers.isAddress(cleanAddress)) return { transfers: [], holdings: [], complete: false, message: 'Invalid address.' };
    const result = await this.syncOnChainCollections(false);
    const holdings: AddressNftHolding[] = [];
    // Cached owners must never be presented as current wallet holdings.
    for (const collection of result.collections) {
      if (!collection.ownershipComplete || !['indexed', 'partial'].includes(collection.dataStatus)) continue;
      for (const item of collection.items) if (item.owner.toLowerCase() === cleanAddress) holdings.push({
        tokenId: item.id, name: item.name, image: item.image,
        collectionId: collection.id, collectionName: collection.name, collectionContract: collection.contract,
        collectionSymbol: collection.symbol, standard: collection.standard, traits: item.traits, mintDate: item.mintDate,
      });
    }
    let transfers: AddressNftTransfer[] = [], historyComplete = false;
    for (const endpoint of this.endpoints) {
      try {
        const raw = await fetchAllPages(endpoint, `/addresses/${cleanAddress}/token-transfers?type=ERC-721`, url => this.fetchIndexerJson(url));
        const unique = new Map<string, AddressNftTransfer>();
        for (const row of raw) {
          const transfer = mapTransfer(row);
          const contract = addressString(row.token?.address_hash ?? row.token?.address);
          if (!contract) throw new Error('Missing NFT contract in transfer record');
          const collection = result.collections.find(candidate => candidate.contract.toLowerCase() === contract.toLowerCase());
          const item = collection?.items.find(candidate => candidate.id === transfer.tokenId);
          const mapped: AddressNftTransfer = {
            ...transfer, tokenName: item?.name || `${row.token.name || 'NFT'} #${transfer.tokenId}`,
            collectionId: collection?.id || `onchain-${contract.toLowerCase()}`,
            collectionName: collection?.name || row.token.name || contract, collectionContract: contract,
            collectionIcon: collection?.iconImage || '', imageUrl: item?.image || '',
            type: transfer.type === 'MINT' ? 'MINT' : transfer.to.toLowerCase() === cleanAddress ? 'IN' : 'OUT',
          };
          unique.set(contract.toLowerCase() + ':' + transferKey(transfer), mapped);
        }
        transfers = [...unique.values()].sort((a, b) => b.blockNumber - a.blockNumber || b.logIndex - a.logIndex);
        historyComplete = true;
        break;
      } catch {}
    }
    const complete = result.status === 'live' && historyComplete;
    return {
      transfers, holdings, complete,
      message: complete ? 'NFT holdings and transfers are indexed blockchain records.' : 'NFT coverage is incomplete or unavailable. Missing records do not mean this wallet owns no NFTs.',
    };
  }
}

export const nftSyncService = new NftSyncService();
