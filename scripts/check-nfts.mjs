import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ethers } from 'ethers';

const temp = await mkdtemp(join(tmpdir(), 'bitnet-nfts-'));
try {
  await build({
    entryPoints: ['src/services/nftSyncService.ts', 'src/services/nftData.ts', 'src/services/ipfsResources.ts', 'src/data/nftCollections.ts'],
    bundle: true, platform: 'node', format: 'esm', outdir: temp,
    external: ['@helia/verified-fetch'],
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    plugins: [{ name: 'isolated-rpc', setup(build) {
      build.onResolve({ filter: /^\.\/rpc$/ }, () => ({ path: 'rpc', namespace: 'mock' }));
      build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: 'export const rpcService = {};', loader: 'js' }));
    } }],
  });
  const { NftSyncService, ipfsGatewayManager } = await import(pathToFileURL(join(temp, 'services/nftSyncService.js')));
  const data = await import(pathToFileURL(join(temp, 'services/nftData.js')));
  const { IpfsImageStore, canonicalIpfsUri } = await import(pathToFileURL(join(temp, 'services/ipfsResources.js')));
  const { BITNET_NFT_COLLECTIONS } = await import(pathToFileURL(join(temp, 'data/nftCollections.js')));
  const { tokenIdString, resourceUrls, decodeInlineMetadata, metadataFields, buildHolders, fetchAllPages, ZERO_ADDRESS } = data;
  const coder = ethers.AbiCoder.defaultAbiCoder();
  const owner = '0x' + '1'.repeat(40), other = '0x' + '2'.repeat(40);
  const contract = BITNET_NFT_COLLECTIONS[0].contract.toLowerCase();
  const maxId = (2n ** 256n - 1n).toString();
  assert.equal(tokenIdString(maxId), maxId);
  assert.equal(tokenIdString(0), '0');
  assert.throws(() => tokenIdString(Number.MAX_SAFE_INTEGER + 1));
  assert.throws(() => tokenIdString(2n ** 256n));
  assert.throws(() => tokenIdString('-1'));
  assert.equal(metadataFields({ attributes: [{ value: 0 }, { value: false }] }, 'NFT').traits[1].value, 'false');
  assert.equal(metadataFields({ attributes: [{ value: 0 }] }, 'NFT').traits[0].value, '0');
  const inline = { name: 'Çığ NFT', image: 'ipfs://bafyexample/art/0.png' };
  assert.equal(decodeInlineMetadata('data:application/json;base64,' + Buffer.from(JSON.stringify(inline)).toString('base64')).name, inline.name);
  assert.equal(decodeInlineMetadata('data:application/json,' + encodeURIComponent(JSON.stringify(inline))).name, inline.name);
  for (const uri of ['ipfs://ipfs/bafyexample/art/0.png', 'ipfs://bafyexample/art/0.png', 'https://bafyexample.ipfs.w3s.link/art/0.png']) {
    assert.ok(resourceUrls(uri).includes('https://ipfs.filebase.io/ipfs/bafyexample/art/0.png'));
    assert.equal(canonicalIpfsUri(uri), 'ipfs://bafyexample/art/0.png');
    assert.ok(resourceUrls(uri).every(url => !/w3s\.link|ipfs\.io|dweb\.link/.test(url)), 'retired gateways must not receive hotlink requests');
  }
  assert.equal(resourceUrls('https://creator.test/ipfs/bafyexample/art/0.png')[0], 'https://creator.test/ipfs/bafyexample/art/0.png');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/HvsAAAAASUVORK5CYII=', 'base64');
  let imageRequests = 0;
  const images = new IpfsImageStore(async uri => {
    imageRequests++;
    assert.equal(uri, 'ipfs://bafyexample/art/0.png');
    return new Response(png, { headers: { 'Content-Type': 'application/octet-stream' } });
  });
  const [imageA, imageB] = await Promise.all([images.get('https://bafyexample.ipfs.w3s.link/art/0.png'), images.get('ipfs://bafyexample/art/0.png')]);
  assert.equal(imageRequests, 1, 'icon and gallery requests must share the same CID/path retrieval');
  assert.equal(imageA, imageB);
  assert.equal(imageA.type, 'image/png');
  assert.equal(await images.get('ipfs://bafyexample/art/0.png'), imageA);
  assert.equal(imageRequests, 1, 'immutable image bytes must remain cached across index refreshes');
  const invalidImage = new IpfsImageStore(async () => new Response('<html>Service worker gateway</html>'));
  await assert.rejects(invalidImage.get('ipfs://bafyexample/error.png'), /supported image/);
  const offlineImage = new IpfsImageStore(async () => new Response(png, { status: 429 }));
  await assert.rejects(offlineImage.get('ipfs://bafyexample/429.png'), /HTTP 429/);
  let cancelledLargeImage = false;
  const oversizedImage = new IpfsImageStore(async () => new Response(new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(1024 * 1024)); },
    cancel() { cancelledLargeImage = true; },
  })));
  await assert.rejects(oversizedImage.get('ipfs://bafyexample/large.png'), /too large/);
  assert.ok(cancelledLargeImage, 'oversized downloads must stop before reading the entire response');
  assert.deepEqual(resourceUrls('javascript:alert(1)', true), []);
  assert.deepEqual(resourceUrls('data:text/html;base64,AAA', true), []);
  ipfsGatewayManager.markWorkingUrl('ipfs://bafyexample/0.png', 'https://evil.test/wrong.png');
  assert.equal(ipfsGatewayManager.getCachedWorkingUrl('ipfs://bafyexample/0.png'), null);
  assert.equal(buildHolders([{ id: '0', owner }, { id: maxId, owner: owner.toUpperCase().replace('0X', '0x') }, { id: '1', owner: ZERO_ADDRESS }])[0].quantity, 2);
  await assert.rejects(fetchAllPages('https://test', '/instances', async () => ({ items: [], next_page_params: { cursor: 1 } })), /repeated/);
  await assert.rejects(fetchAllPages('https://test', '/instances', async () => ({ items: [] })), /Invalid/);

  const memory = new Map([['bitnet_dynamic_nft_collections_v3', JSON.stringify([{ owner: 'fake', verified: true }])]]);
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const tokens = BITNET_NFT_COLLECTIONS.map(collection => ({ address_hash: collection.contract, name: collection.name, symbol: 'NFT', type: 'ERC-721', holders_count: collection.id === 'bitnet-punks' ? '4' : '1' }));
  tokens.push({ address_hash: '0x' + 'a'.repeat(40), name: 'Discovered collection', type: 'ERC-721', holders_count: '1' });
  const instance = id => ({ id: String(id), owner: { hash: id <= 9 ? '0x' + String(Math.ceil(id / 3) + 2).repeat(40) : owner }, metadata: { name: `Original #${id}`, image: `ipfs://bafyexample/${id}.png`, attributes: Array.from({ length: 6 }, (_, i) => ({ trait_type: `Trait ${i}`, value: i })) } });
  const transfer = (id, tokenAddress = contract, logIndex = id) => ({
    transaction_hash: '0x' + 'b'.repeat(64), block_number: 100 + id, log_index: logIndex,
    timestamp: '2024-08-04T14:30:44.000Z', from: { hash: ZERO_ADDRESS }, to: { hash: owner },
    total: { token_id: String(id) }, token: { address_hash: tokenAddress, name: 'NFT' },
  });
  let requests = 0, failInstances = false, failTransfers = false;
  const fetcher = async input => {
    requests++;
    const url = new URL(input), path = url.pathname;
    if (path === '/tokens') return { ok: true, json: async () => url.searchParams.has('cursor') ? { items: tokens.slice(2), next_page_params: null } : { items: tokens.slice(0, 2), next_page_params: { cursor: 2 } } };
    if (path.includes('/addresses/')) return { ok: true, json: async () => ({ items: [transfer(0), transfer(1)], next_page_params: null }) };
    const address = path.split('/')[2];
    const punk = address === contract;
    const after = Number(url.searchParams.get('unique_token') || (punk ? 715 : 2));
    if (failInstances && punk && after < 715 && path.endsWith('/instances')) throw new Error('Second instance page failed');
    if (failTransfers && punk && after < 715 && path.endsWith('/transfers')) throw new Error('Second transfer page failed');
    const ids = punk ? Array.from({ length: Math.min(50, after - 1) }, (_, i) => after - 1 - i) : [1];
    const rows = path.endsWith('/instances') ? ids.map(id => punk ? instance(id) : { ...instance(id), owner: { hash: owner } }) : ids.map(id => transfer(id, address));
    return { ok: true, json: async () => ({ items: rows, next_page_params: punk && ids.at(-1) > 1 ? { unique_token: ids.at(-1) } : null }) };
  };
  const rpc = {
    getCode: async () => '0x6000', getBlockNumber: async () => 123,
    call: async (_address, input, block) => {
      assert.equal(block, '0x7b', 'all contract reads must use the same block');
      if (input.startsWith('0x01ffc9a7')) return coder.encode(['bool'], [true]);
      if (input.startsWith('0x6352211e')) return coder.encode(['address'], [owner]);
      if (input === '0x06fdde03') return coder.encode(['string'], ['RPC collection']);
      if (input.startsWith('0xc87b56dd')) return coder.encode(['string'], ['data:application/json;base64,' + Buffer.from(JSON.stringify(inline)).toString('base64')]);
      throw new Error('Unexpected RPC call');
    },
  };
  const service = new NftSyncService(['https://index.test'], rpc, fetcher, storage);
  assert.ok(service.getStoredCollections().every(collection => !collection.items.length && collection.totalSupply === null));
  const [result, joined] = await Promise.all([service.syncOnChainCollections(), service.syncOnChainCollections()]);
  assert.equal(result, joined, 'overlapping refreshes must share a scan');
  assert.equal(result.status, 'live');
  assert.equal(result.collections.length, 6, 'collection discovery must load the second page and address_hash');
  const punk = result.collections.find(collection => collection.contract === contract);
  assert.equal(punk.items.length, 714);
  assert.equal(punk.totalSupply, 714);
  assert.equal(punk.holders[0].quantity, 705);
  assert.equal(punk.holders[0].percentage, '98.74%');
  assert.equal(punk.minted, 714);
  assert.equal(punk.recentTransfers.length, 714, 'events in one transaction must not be collapsed by hash');
  assert.equal(punk.items[0].mintDate, '2024-08-04T14:30:44.000Z');
  assert.ok(punk.items.every(item => !item.rarity && !item.priceBtn));
  const details = await service.getNftDetails(contract, maxId, punk.items[0]);
  assert.equal(details.id, maxId);
  assert.equal(details.ownerSource, 'rpc');
  assert.equal(details.name, inline.name);
  assert.equal(details.image, inline.image);
  assert.equal(details.metadataSource, 'tokenURI');
  const overview = await service.getAddressNftOverview(owner);
  assert.equal(overview.transfers.length, 2);
  assert.equal(overview.transfers[0].tokenId, '1');
  assert.equal(overview.transfers[1].tokenId, '0');
  assert.equal(overview.holdings.length, 710);
  assert.equal(overview.complete, true);
  failInstances = true;
  const failed = await service.syncOnChainCollections();
  assert.equal(failed.status, 'partial');
  assert.equal(failed.collections.find(collection => collection.contract === contract).dataStatus, 'cached');
  const partialWallet = await service.getAddressNftOverview(owner);
  assert.equal(partialWallet.holdings.length, 5, 'cached owners must not become current wallet holdings');
  failInstances = false; failTransfers = true;
  const missingHistory = await service.syncOnChainCollections();
  const incomplete = missingHistory.collections.find(collection => collection.contract === contract);
  assert.equal(incomplete.dataStatus, 'partial');
  assert.equal(incomplete.minted, null);
  assert.ok(incomplete.items.every(item => item.mintDate === ''));
  const offline = new NftSyncService(['https://offline.test'], rpc, async () => { throw new Error('offline'); }, storage);
  assert.equal((await offline.syncOnChainCollections()).status, 'cached');
  assert.equal((await offline.syncOnChainCollections()).syncedAt, null);
  const noMetadata = new NftSyncService([], { ...rpc, call: async (address, input, block) => {
    if (input.startsWith('0xc87b56dd')) throw new Error('no metadata');
    return rpc.call(address, input, block);
  } }, fetcher, null);
  assert.equal((await noMetadata.getNftDetails(contract, '0')).image, '', 'unavailable tokenURI must not borrow another NFT image');
  const nonexistent = new NftSyncService([], { ...rpc, call: async (address, input, block) => {
    if (input.startsWith('0x6352211e')) throw new Error('reverted');
    return rpc.call(address, input, block);
  } }, fetcher, null);
  await assert.rejects(nonexistent.getNftDetails(contract, '0'), /does not exist/);
  const unsupported = new NftSyncService([], { ...rpc, call: async () => coder.encode(['bool'], [false]) }, fetcher, null);
  await assert.rejects(unsupported.getNftDetails(contract, '0'), /does not support ERC-721/);
  const staleMetadata = new NftSyncService([], { ...rpc, call: async (address, input, block) => {
    if (input.startsWith('0xc87b56dd')) return coder.encode(['string'], ['ipfs://bafyexample/unreachable.json']);
    return rpc.call(address, input, block);
  } }, async () => { throw new Error('gateway unavailable'); }, null, async () => { throw new Error('IPFS provider unavailable'); });
  const fallback = await staleMetadata.getNftDetails(contract, punk.items[0].id, punk.items[0]);
  assert.equal(fallback.image, punk.items[0].image);
  assert.equal(fallback.metadataSource, 'indexer');
  assert.ok(fallback.metadataError);
  const differentId = await staleMetadata.getNftDetails(contract, '0', punk.items[0]);
  assert.equal(differentId.image, '');
  assert.equal(differentId.mintDate, '', 'dates and images must not cross token IDs');
  let verifiedMetadataUri;
  const verifiedMetadata = new NftSyncService([], { ...rpc, call: async (address, input, block) => {
    if (input.startsWith('0xc87b56dd')) return coder.encode(['string'], ['https://bafyexample.ipfs.w3s.link/metadata/714.json']);
    return rpc.call(address, input, block);
  } }, async () => ({ ok: false, status: 429 }), null, async uri => {
    verifiedMetadataUri = uri;
    return Response.json({ name: 'Verified original #714', image: '../images/714.png' });
  });
  const resolved = await verifiedMetadata.getNftDetails(contract, '714');
  assert.equal(verifiedMetadataUri, 'ipfs://bafyexample/metadata/714.json');
  assert.equal(resolved.image, 'ipfs://bafyexample/images/714.png');
  assert.equal(resolved.metadataSource, 'tokenURI', 'verified retrieval must work when HTTP gateways return 429');
  console.log(`PASS: IPFS image deduplication/cache/content types, metadata with HTTP 429, retired gateway exclusion, complete collection/instance/transfer pagination, 714 NFTs and 705-holder regression, exact uint256 IDs, metadata URIs, zero/false traits, multi-event transactions, RPC block consistency, cache failures and wallet coverage (${requests} fixture requests).`);

  if (process.argv.includes('--live')) {
    const endpoint = 'https://explorer.bitnetmoney.org/api/v2';
    const liveRpc = {
      async request(method, params) {
        let failure;
        for (const endpoint of ['https://rpc.bitnetmoney.org/', 'https://rpc.bitnetmoney.com/']) {
          try {
            const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(15000) });
            assert.ok(response.ok, 'RPC HTTP status');
            const json = await response.json();
            if (json.error) throw new Error(json.error.message);
            return json.result;
          } catch (error) { failure = error; }
        }
        throw failure;
      },
      getCode(address) { return this.request('eth_getCode', [address, 'latest']); },
      async getBlockNumber() { return Number(BigInt(await this.request('eth_blockNumber', []))); },
      call(address, input, block) { return this.request('eth_call', [{ to: address, data: input }, block]); },
    };
    // The service bundles live in a temp directory; resolve the SDK from this project.
    const { createVerifiedFetch } = await import('@helia/verified-fetch');
    const verifiedFetch = await createVerifiedFetch();
    const live = new NftSyncService([endpoint], liveRpc, fetch, null, (uri, signal) => verifiedFetch(uri, { signal }));
    try {
      const indexed = await live.syncOnChainCollections();
      console.log('LIVE coverage:', JSON.stringify(indexed.collections.map(collection => ({ name: collection.name, supply: collection.totalSupply, holders: collection.holdersCount, mints: collection.minted, status: collection.dataStatus }))));
      assert.equal(indexed.status, 'live', JSON.stringify(indexed.collections.map(collection => ({ name: collection.name, status: collection.dataStatus, error: collection.error }))));
      for (const collection of indexed.collections) {
        const response = await fetch(`${endpoint}/tokens/${collection.contract}/holders`, { signal: AbortSignal.timeout(15000) });
        const holders = await response.json();
        if (holders.next_page_params === null) {
          assert.equal(collection.totalSupply, holders.items.reduce((sum, holder) => sum + Number(holder.value), 0));
          assert.equal(collection.holdersCount, holders.items.length);
          for (const holder of holders.items) assert.equal(collection.holders.find(item => item.address.toLowerCase() === holder.address.hash.toLowerCase())?.quantity, Number(holder.value));
        }
        if (collection.items.length) {
          const item = collection.items[0];
          const checked = await live.getNftDetails(collection.contract, item.id, item);
          assert.equal(checked.owner.toLowerCase(), item.owner.toLowerCase(), 'indexed and RPC owner must match');
          assert.ok(checked.tokenUri, `${collection.name}: contract tokenURI unavailable`);
          if (checked.metadataSource !== 'tokenURI') {
            assert.ok(checked.metadataError, 'gateway failure must be disclosed');
            assert.equal(checked.image, item.metadataSource === 'indexer' ? item.image : '', 'fallback must belong to the same NFT');
          }
          console.log(`LIVE ${collection.name} (${collection.contract}): ${collection.totalSupply} NFTs, ${collection.holdersCount} holders, ${collection.minted} mint events; #${item.id} RPC owner matched, tokenURI read; metadata source: ${checked.metadataSource}.`);
        }
      }
      console.log('PASS: live NFT collection coverage, full holder quantities and one RPC/metadata verification per collection.');
    } finally { await verifiedFetch.stop(); }
  }
} finally { await rm(temp, { recursive: true, force: true }); }
