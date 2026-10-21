// GET /api/miners?blocks=1000 -> who mined the newest 100–2,000 blocks: share per miner,
// Nakamoto coefficient (fewest miners with more than half of the blocks) and uncle rate.
import { rpc, LABELS } from './_lib/card.js';

export default async function handler(req, res) {
  const count = Math.min(2000, Math.max(100, parseInt(new URL(req.url, 'http://localhost').searchParams.get('blocks') || '1000', 10) || 1000));
  try {
    const [head] = await rpc([['eth_blockNumber', []]]);
    if (!head) throw new Error('No head');
    const top = parseInt(head, 16);
    const numbers = Array.from({ length: count }, (_, i) => top - i).filter((n) => n > 0);
    const chunks = [];
    for (let i = 0; i < numbers.length; i += 200) chunks.push(numbers.slice(i, i + 200));
    const headers = (await Promise.all(chunks.map((c) => rpc(c.map((n) => ['eth_getBlockByNumber', ['0x' + n.toString(16), false]]))))).flat().filter(Boolean);
    if (headers.length < numbers.length) throw new Error('Missing headers');

    const counts = new Map();
    let uncles = 0;
    for (const b of headers) {
      const m = String(b.miner).toLowerCase();
      counts.set(m, (counts.get(m) || 0) + 1);
      uncles += b.uncles.length;
    }
    const miners = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([address, n]) => ({ address, label: LABELS[address] || null, blocks: n, share: Number((n / headers.length).toFixed(4)) }));
    let sum = 0;
    let nakamoto = 0;
    for (const m of miners) { sum += m.blocks; nakamoto += 1; if (sum * 2 > headers.length) break; }
    const times = headers.map((b) => parseInt(b.timestamp, 16));

    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    res.status(200).json({
      fromBlock: top - headers.length + 1,
      toBlock: top,
      blocks: headers.length,
      seconds: Math.max(...times) - Math.min(...times),
      nakamotoCoefficient: nakamoto,
      uncleRate: Number((uncles / headers.length).toFixed(4)),
      miners,
    });
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).json({ error: 'Bitnet RPC unavailable' });
  }
}
