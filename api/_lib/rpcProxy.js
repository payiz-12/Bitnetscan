// JSON-RPC proxy for the browser (the Bitnet RPC nodes send no CORS headers). It forwards only
// the read methods BitnetScan uses, so this site is never a gateway to node methods that change
// or damage a node (debug_setHead, profiling to disk, runtime settings). Calls outside the list get
// a JSON-RPC error in their slot; the rest of a batch still goes through.

const ALLOWED = new Set([
  'eth_blockNumber', 'eth_chainId', 'eth_gasPrice', 'eth_maxPriorityFeePerGas', 'eth_feeHistory', 'eth_syncing',
  'eth_getBalance', 'eth_getCode', 'eth_getStorageAt', 'eth_getTransactionCount', 'eth_call', 'eth_estimateGas',
  'eth_getBlockByNumber', 'eth_getBlockByHash',
  'eth_getBlockTransactionCountByNumber', 'eth_getBlockTransactionCountByHash',
  'eth_getUncleByBlockNumberAndIndex', 'eth_getUncleByBlockHashAndIndex',
  'eth_getUncleCountByBlockNumber', 'eth_getUncleCountByBlockHash',
  'eth_getTransactionByHash', 'eth_getTransactionByBlockNumberAndIndex', 'eth_getTransactionByBlockHashAndIndex',
  'eth_getTransactionReceipt', 'eth_getLogs',
  'net_version', 'net_peerCount', 'net_listening',
  'web3_clientVersion',
  'txpool_status',
  'debug_traceTransaction',
]);
const MAX_BATCH = 200;

/** Why a call is refused, or null when it may go through. */
function refusal(call) {
  if (!call || typeof call !== 'object' || typeof call.method !== 'string') return 'Invalid request';
  if (!ALLOWED.has(call.method)) return `Method ${call.method} is not available through BitnetScan`;
  const params = Array.isArray(call.params) ? call.params : [];
  if (call.method === 'debug_traceTransaction') {
    // Only the built-in call tracer: custom JavaScript tracers can keep a node busy for minutes.
    const tracer = params[1]?.tracer;
    if (tracer !== 'callTracer') return 'Only debug_traceTransaction with { tracer: "callTracer" } is available';
  }
  if (call.method === 'eth_getLogs') {
    const f = params[0] || {};
    const topics = Array.isArray(f.topics) ? f.topics.filter((t) => t !== null) : [];
    if (!f.address && topics.length === 0 && !f.blockHash) return 'eth_getLogs needs an address or a topic filter';
  }
  return null;
}

const errorFor = (call, message) => ({ jsonrpc: '2.0', id: call && call.id !== undefined ? call.id : null, error: { code: -32601, message } });

export function rpcProxy(upstream) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ error: 'Send JSON-RPC requests with POST' });
      return;
    }
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = null; }
    }
    if (!body || (Array.isArray(body) && body.length === 0)) {
      res.status(400).json(errorFor(null, 'Invalid JSON-RPC request'));
      return;
    }
    const batch = Array.isArray(body);
    const calls = batch ? body : [body];
    if (calls.length > MAX_BATCH) {
      res.status(413).json(errorFor(null, `At most ${MAX_BATCH} calls per batch`));
      return;
    }

    const refused = calls.map(refusal);
    const allowed = calls.filter((_, i) => refused[i] === null);
    let answers = [];
    if (allowed.length) {
      try {
        const r = await fetch(upstream, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch ? allowed : allowed[0]),
          signal: AbortSignal.timeout(25000),
        });
        const data = await r.json();
        answers = Array.isArray(data) ? data : [data];
      } catch {
        res.status(502).json(errorFor(batch ? null : calls[0], 'The Bitnet RPC node did not answer'));
        return;
      }
    }

    // Put each answer back in its call's place, with refusals where the call was not sent.
    const byId = new Map(answers.map((a) => [JSON.stringify(a?.id ?? null), a]));
    const out = calls.map((call, i) => (refused[i] !== null
      ? errorFor(call, refused[i])
      : byId.get(JSON.stringify(call.id ?? null)) ?? errorFor(call, 'No answer from the Bitnet RPC node')));
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(batch ? out : out[0]);
  };
}
