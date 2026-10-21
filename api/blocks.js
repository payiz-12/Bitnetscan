// GET /api/blocks?limit=10 -> the newest blocks (1–50), read over JSON-RPC.
// `subsidy` is the newly created BTN for the block miner (1 BTN + 1/32 BTN per included uncle);
// transaction fees, which also go to the miner, are not included.
import { rpc, LABELS, btnPlain } from './_lib/card.js';

const WEI = 10n ** 18n;

export default async function handler(req, res) {
  const limit = Math.min(50, Math.max(1, parseInt(new URL(req.url, 'http://localhost').searchParams.get('limit') || '10', 10) || 10));
  try {
    const [head] = await rpc([['eth_blockNumber', []]]);
    if (!head) throw new Error('No head');
    const top = parseInt(head, 16);
    const numbers = Array.from({ length: limit }, (_, i) => top - i).filter((n) => n >= 0);
    const raw = await rpc(numbers.map((n) => ['eth_getBlockByNumber', ['0x' + n.toString(16), false]]));
    const blocks = raw.filter(Boolean).map((b) => {
      const number = parseInt(b.number, 16);
      const miner = String(b.miner).toLowerCase();
      const subsidy = number > 0 ? WEI + (BigInt(b.uncles.length) * WEI) / 32n : 0n;
      return {
        number,
        hash: b.hash,
        timestamp: parseInt(b.timestamp, 16),
        miner,
        minerLabel: LABELS[miner] || null,
        transactions: b.transactions.length,
        uncles: b.uncles.length,
        gasUsed: parseInt(b.gasUsed, 16),
        difficulty: BigInt(b.difficulty).toString(),
        subsidy: btnPlain(subsidy),
      };
    });
    res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
    res.status(200).json({ head: top, blocks });
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).json({ error: 'Bitnet RPC unavailable' });
  }
}
