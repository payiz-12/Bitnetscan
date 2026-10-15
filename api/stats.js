// GET /api/stats — live Bitnet chain statistics, read from the JSON-RPC on every cache miss.
// Cached at the edge for 15 s.

const RPC = ['https://rpc.bitnetmoney.org', 'https://rpc.bitnetmoney.com'];
const SAMPLE_BLOCKS = 120;
const EPOCH_LENGTH = 30000; // consensus/ethash/algorithm.go in BitnetMoney/bitnet

async function batch(calls) {
  const body = JSON.stringify(calls.map((c, id) => ({ jsonrpc: '2.0', id, method: c[0], params: c[1] })));
  let lastError;
  for (const url of RPC) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Batch not supported');
      const byId = new Map(data.map((item) => [item.id, item]));
      return calls.map((_, id) => {
        const item = byId.get(id);
        if (!item || item.error) throw new Error(item?.error?.message || 'Missing result');
        return item.result;
      });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

function isPrime(n) {
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
  return true;
}

// Ethash dataset (DAG) size for an epoch, as in calcDatasetSize.
function dagSize(epoch) {
  const mixBytes = 128;
  let size = 2 ** 30 + 2 ** 23 * epoch - mixBytes;
  while (!isPrime(size / mixBytes)) size -= 2 * mixBytes;
  return size;
}

export default async function handler(req, res) {
  try {
    const [headHex, gasPriceHex, chainIdHex, peersHex] = await batch([
      ['eth_blockNumber', []],
      ['eth_gasPrice', []],
      ['eth_chainId', []],
      ['net_peerCount', []],
    ]);
    const head = parseInt(headHex, 16);
    const [latest, first] = await batch([
      ['eth_getBlockByNumber', ['0x' + head.toString(16), false]],
      ['eth_getBlockByNumber', ['0x' + (head - SAMPLE_BLOCKS).toString(16), false]],
    ]);
    const seconds = parseInt(latest.timestamp, 16) - parseInt(first.timestamp, 16);
    const work = BigInt(latest.totalDifficulty) - BigInt(first.totalDifficulty);
    const epoch = Math.floor(head / EPOCH_LENGTH);

    res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30');
    res.status(200).json({
      chainId: parseInt(chainIdHex, 16),
      blockHeight: head,
      blockTimestamp: parseInt(latest.timestamp, 16),
      averageBlockTime: Number((seconds / SAMPLE_BLOCKS).toFixed(3)),
      sampleBlocks: SAMPLE_BLOCKS,
      difficulty: BigInt(latest.difficulty).toString(),
      hashrate: seconds > 0 ? Number(work / BigInt(seconds)) : null,
      gasPriceGwei: Number(BigInt(gasPriceHex)) / 1e9,
      peers: parseInt(peersHex, 16),
      blockReward: '1',
      epoch,
      epochLength: EPOCH_LENGTH,
      nextEpochBlock: (epoch + 1) * EPOCH_LENGTH,
      dagSizeBytes: dagSize(epoch),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).json({ error: 'Bitnet RPC unavailable', detail: String(err?.message || err) });
  }
}
