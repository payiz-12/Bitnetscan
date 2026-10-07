import { ipfsPath } from './nftData';

export function canonicalIpfsUri(uri: string): string {
  const path = ipfsPath(uri.trim());
  return path ? 'ipfs://' + path : '';
}

export type IpfsFetch = (uri: string, signal: AbortSignal) => Promise<Response>;

// Load the IPFS client only when an IPFS image or tokenURI is actually requested.
// Unlike a public HTTP gateway, this discovers providers and verifies CID bytes.
type IpfsClient = Awaited<ReturnType<typeof import('@helia/verified-fetch').createVerifiedFetch>>;
let client: Promise<IpfsClient> | undefined;
export const fetchVerifiedIpfs: IpfsFetch = async (uri, signal) => {
  // Share initialization too: several visible NFTs may request files at once.
  client ||= import('@helia/verified-fetch').then(({ createVerifiedFetch }) => createVerifiedFetch())
    .catch(error => { client = undefined; throw error; });
  const verifiedFetch = await client;
  if (signal.aborted) throw new Error('IPFS request cancelled');
  const response = await verifiedFetch(uri, { signal });
  if (!response.ok) throw new Error(`IPFS content unavailable (HTTP ${response.status})`);
  return response;
};

function imageType(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  const text = new TextDecoder().decode(bytes);
  if (/^GIF8[79]a/.test(text)) return 'image/gif';
  if (text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP') return 'image/webp';
  if (text.slice(4, 8) === 'ftyp' && /avif|avis/.test(text.slice(8, 32))) return 'image/avif';
  if (/^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(text)) return 'image/svg+xml';
  throw new Error('IPFS file is not a supported image');
}

// Icons, gallery cards and token details can request the same immutable file at
// once. Share retrieval and keep a bounded blob cache; components own/revoke URLs.
export class IpfsImageStore {
  private pending = new Map<string, Promise<Blob>>();
  private blobs = new Map<string, Blob>();
  private cacheBytes = 0;
  constructor(private fetcher: IpfsFetch = fetchVerifiedIpfs, private timeout = 40000) {}

  public get(uri: string): Promise<Blob> {
    const key = canonicalIpfsUri(uri);
    if (!key) return Promise.reject(new Error('Not an IPFS resource'));
    const cached = this.blobs.get(key);
    if (cached) {
      this.blobs.delete(key); this.blobs.set(key, cached);
      return Promise.resolve(cached);
    }
    const pending = this.pending.get(key);
    if (pending) return pending;
    const request = this.retrieve(key).finally(() => this.pending.delete(key));
    this.pending.set(key, request);
    return request;
  }

  private async retrieve(key: string): Promise<Blob> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await this.fetcher(key, controller.signal);
      if (!response.ok) throw new Error(`IPFS image unavailable (HTTP ${response.status})`);
      if (!response.body) throw new Error('IPFS image is empty');
      const reader = response.body.getReader(), chunks: BlobPart[] = [];
      let size = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 10 * 1024 * 1024) {
            controller.abort();
            await reader.cancel();
            throw new Error('IPFS image is too large');
          }
          chunks.push(new Uint8Array(value));
        }
      } finally { reader.releaseLock(); }
      if (!size) throw new Error('IPFS image is empty');
      const body = new Blob(chunks);
      // Verified Fetch may return application/octet-stream for UnixFS files.
      // Sniff actual bytes rather than treating HTML/error bodies as images.
      const type = imageType(new Uint8Array(await body.slice(0, 1024).arrayBuffer()));
      const blob = body.slice(0, body.size, type);
      while (this.blobs.size && (this.blobs.size >= 64 || this.cacheBytes + blob.size > 20 * 1024 * 1024)) {
        const oldest = this.blobs.keys().next().value!;
        this.cacheBytes -= this.blobs.get(oldest)!.size;
        this.blobs.delete(oldest);
      }
      this.blobs.set(key, blob); this.cacheBytes += blob.size;
      return blob;
    } finally { clearTimeout(timer); controller.abort(); }
  }
}

export const ipfsImages = new IpfsImageStore();
