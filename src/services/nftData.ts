import { NftHolder, NftItem, NftTransfer } from '../data/nftCollections';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const PUBLIC_IPFS_GATEWAYS = [
  'https://ipfs.filebase.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
];

// These public gateways now return a service-worker page/HTTP 429 to hotlinked
// images and JSON. An <img> cannot install their service worker.
export function isRetiredIpfsGateway(uri: string): boolean {
  try {
    const host = new URL(uri).hostname;
    return ['w3s.link', 'ipfs.io', 'dweb.link', 'nftstorage.link', 'storacha.link']
      .some(domain => host === domain || host.endsWith('.' + domain));
  } catch { return false; }
}

export function tokenIdString(value: unknown): string {
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 0)) throw new Error('Unsafe NFT token ID');
  const text = String(value ?? '');
  if (!/^\d+$/.test(text)) throw new Error('Invalid NFT token ID');
  const id = BigInt(text);
  if (id >= 2n ** 256n) throw new Error('NFT token ID exceeds uint256');
  return id.toString();
}

export function compareTokenIds(a: string, b: string): number {
  return BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0;
}

export function addressString(value: any): string {
  const address = typeof value === 'string' ? value : value?.hash;
  return typeof address === 'string' && /^0x[0-9a-f]{40}$/i.test(address) ? address : '';
}

// Preserve the original CID and path when changing gateways. Never invent image paths.
export function ipfsPath(value: string): string {
  if (/^ipfs:\/\//i.test(value)) return value.replace(/^ipfs:\/\/(?:ipfs\/)?/i, '');
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    const subdomain = url.hostname.match(/^([^.]+)\.ipfs\./i);
    if (subdomain) return subdomain[1] + url.pathname + url.search;
    if (url.pathname.startsWith('/ipfs/')) return url.pathname.slice(6) + url.search;
  } catch {}
  return '';
}

export function resourceUrls(value: unknown, image = false): string[] {
  if (typeof value !== 'string' || !value.trim()) return [];
  const uri = value.trim();
  if (image && /^data:image\/(?:png|jpeg|gif|webp|avif|svg\+xml)[;,]/i.test(uri)) return [uri];
  const path = ipfsPath(uri);
  if (path) {
    const gateways = PUBLIC_IPFS_GATEWAYS.map(gateway => gateway + path);
    // Preserve the creator's CID/path, but do not retry retired hotlink gateways.
    return /^https?:\/\//i.test(uri) && !isRetiredIpfsGateway(uri) ? [...new Set([uri, ...gateways])] : gateways;
  }
  if (/^ipns:\/\//i.test(uri)) return ['https://ipfs.io/ipns/' + uri.slice(7)];
  try {
    const url = new URL(uri);
    return ['http:', 'https:'].includes(url.protocol) ? [url.href] : [];
  } catch { return []; }
}

export function metadataFields(metadata: any, fallbackName: string) {
  const object = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {};
  const image = typeof object.image === 'string' ? object.image : typeof object.image_url === 'string' ? object.image_url : '';
  return {
    name: typeof object.name === 'string' && object.name.trim() ? object.name.trim() : fallbackName,
    image: resourceUrls(image, true).length ? image : '',
    traits: (Array.isArray(object.attributes) ? object.attributes : [])
      .filter((a: any) => a && typeof a === 'object' && a.value !== null && a.value !== undefined)
      .map((a: any) => ({
        trait_type: String(a.trait_type ?? 'Property'),
        value: typeof a.value === 'object' ? JSON.stringify(a.value) : String(a.value),
      })),
  };
}

export function decodeInlineMetadata(uri: string): any {
  const match = uri.match(/^data:application\/json(?:;charset=[^;,]+)?(;base64)?,([\s\S]*)$/i);
  if (!match) throw new Error('Unsupported metadata data URI');
  const text = match[1]
    ? new TextDecoder().decode(Uint8Array.from(atob(match[2]), char => char.charCodeAt(0)))
    : decodeURIComponent(match[2]);
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid metadata JSON');
  return data;
}

export function mapInstance(instance: any, collectionName: string): NftItem {
  const id = tokenIdString(instance.id);
  const owner = addressString(instance.owner);
  const metadata = metadataFields(instance.metadata, `${collectionName} #${id}`);
  return {
    id, ...metadata, owner, mintDate: '',
    metadataSource: instance.metadata && typeof instance.metadata === 'object' ? 'indexer' : 'unavailable',
    ownerSource: owner ? 'indexer' : 'unknown',
  };
}

export function mapTransfer(raw: any): NftTransfer {
  const hash = raw.transaction_hash || raw.hash;
  const from = addressString(raw.from), to = addressString(raw.to);
  const tokenId = tokenIdString(raw.total?.token_id ?? raw.token_id);
  const timestamp = Date.parse(raw.timestamp) / 1000;
  const blockNumber = Number(raw.block_number), logIndex = Number(raw.log_index);
  if (!/^0x[0-9a-f]{64}$/i.test(hash || '') || !from || !to || !Number.isFinite(timestamp)
    || !Number.isSafeInteger(blockNumber) || blockNumber < 0 || raw.log_index == null
    || !Number.isSafeInteger(logIndex) || logIndex < 0) throw new Error('Incomplete NFT transfer record');
  return {
    hash, from, to, tokenId, timestamp, blockNumber, logIndex,
    type: from.toLowerCase() === ZERO_ADDRESS ? 'MINT' : to.toLowerCase() === ZERO_ADDRESS ? 'BURN' : 'TRANSFER',
  };
}

export function transferKey(transfer: NftTransfer): string {
  return `${transfer.hash.toLowerCase()}:${transfer.logIndex}:${transfer.tokenId}`;
}

export function buildHolders(items: NftItem[]): NftHolder[] {
  const owners = new Map<string, { address: string; ids: string[] }>();
  const active = items.filter(item => item.owner && item.owner.toLowerCase() !== ZERO_ADDRESS);
  for (const item of active) {
    const key = item.owner.toLowerCase();
    const holder = owners.get(key) || { address: item.owner, ids: [] };
    holder.ids.push(item.id);
    owners.set(key, holder);
  }
  return [...owners.values()].sort((a, b) => b.ids.length - a.ids.length || a.address.localeCompare(b.address))
    .map((holder, index) => ({
      rank: index + 1, address: holder.address, quantity: holder.ids.length,
      percentage: (holder.ids.length / active.length * 100).toFixed(2) + '%',
      tokenIds: holder.ids.sort(compareTokenIds),
    }));
}

export function applyMintDates(items: NftItem[], transfers: NftTransfer[]) {
  const mints = new Map<string, NftTransfer>();
  for (const transfer of transfers) {
    if (transfer.type !== 'MINT') continue;
    const previous = mints.get(transfer.tokenId);
    if (!previous || transfer.blockNumber < previous.blockNumber
      || (transfer.blockNumber === previous.blockNumber && transfer.logIndex < previous.logIndex)) mints.set(transfer.tokenId, transfer);
  }
  return items.map(item => ({ ...item, mintDate: mints.has(item.id) ? new Date(mints.get(item.id)!.timestamp * 1000).toISOString() : '' }));
}

export async function fetchAllPages(
  endpoint: string, path: string,
  fetchJson: (url: string) => Promise<any>,
): Promise<any[]> {
  const rows: any[] = [];
  const seen = new Set<string>();
  let query: Record<string, any> | null = null;
  do {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query || {})) {
      if (value !== null && value !== undefined) params.set(key, String(value));
    }
    const url = endpoint + path + (params.size ? (path.includes('?') ? '&' : '?') + params : '');
    if (seen.has(url)) throw new Error('NFT pagination repeated a cursor');
    seen.add(url);
    const page = await fetchJson(url);
    if (!page || !Array.isArray(page.items) || !Object.prototype.hasOwnProperty.call(page, 'next_page_params')) throw new Error('Invalid NFT indexer page');
    rows.push(...page.items);
    query = page.next_page_params;
    if (query !== null && (typeof query !== 'object' || Array.isArray(query) || !Object.keys(query).length)) throw new Error('Invalid NFT pagination cursor');
  } while (query !== null);
  return rows;
}
