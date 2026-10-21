// GET /api/address?address=0x… -> balance, nonce and type of a Bitnet address, read over JSON-RPC.
import { rpc, LABELS, btnPlain } from './_lib/card.js';

export default async function handler(req, res) {
  const address = String(new URL(req.url, 'http://localhost').searchParams.get('address') || '').trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(400).json({ error: 'Pass ?address= with a 0x address (40 hex characters).' });
    return;
  }
  try {
    const [balance, nonce, code, head] = await rpc([
      ['eth_getBalance', [address, 'latest']],
      ['eth_getTransactionCount', [address, 'latest']],
      ['eth_getCode', [address, 'latest']],
      ['eth_blockNumber', []],
    ]);
    if (balance === null || head === null) throw new Error('RPC returned no data');
    const wei = BigInt(balance);
    res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60');
    res.status(200).json({
      address: address.toLowerCase(),
      block: parseInt(head, 16),
      balance: btnPlain(wei),
      balanceWei: wei.toString(),
      nonce: parseInt(nonce, 16),
      isContract: Boolean(code && code !== '0x'),
      label: LABELS[address.toLowerCase()] || null,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).json({ error: 'Bitnet RPC unavailable' });
  }
}
