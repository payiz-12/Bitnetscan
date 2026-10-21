// Data for share cards: the link preview (title, description) and the image rendered by
// /api/og. Everything is read from the Bitnet JSON-RPC when the card is requested.

const RPC_URLS = ['https://rpc.bitnetmoney.org', 'https://rpc.bitnetmoney.com'];
const WEI = 10n ** 18n;

export const LABELS = {
  '0xfad4a236c87880035497043f24ea58d73c3e50de': 'GTPool',
  '0x6c0db3ea9eed7ed145f36da461d84a8d02596b08': 'CoolPool',
  '0x6afcdfec8066a7fbf1295f10c4907924e99e72a4': 'Solo miner',
  '0x0000000000000000000000000000000000000000': 'Burn address',
  '0x000000000000000000000000000000000000dead': 'Burn address',
};

// BTS-20 tokens whose transfers are shown with their own amount and symbol.
const TOKENS = {
  '0xcf2a260d542ea809e0044369aa0cc11d0c14c715': { symbol: 'BPEPE', decimals: 18 },
  '0x738f255b9d3386e49e1c4392a9c7d850c6c7c86d': { symbol: 'STRAT', decimals: 18 },
  '0xd9b4225b1872a008870bae4797ec6ebabf5e2e2f': { symbol: 'reUSDT', decimals: 6 },
  '0x8148b71232162ea7a0b1c8bfe2b8f023934bfb58': { symbol: 'WBTN', decimals: 18 },
  '0xac351d0e22aa06cd99051d4d84cfba7a7dbf487a': { symbol: 'croc', decimals: 18 },
  '0x66562574f9ae380a530757a7703061b11bccda94': { symbol: 'NICK', decimals: 18 },
  '0x9da212dd295ba072517cd4f769b675fb4e8fb49a': { symbol: 'Bbz', decimals: 18 },
};
for (const a of Object.keys(TOKENS)) LABELS[a] ||= TOKENS[a].symbol;

export async function rpc(calls) {
  const body = JSON.stringify(calls.map(([method, params], id) => ({ jsonrpc: '2.0', id, method, params })));
  for (const url of RPC_URLS) {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data)) continue;
      const byId = new Map(data.map((d) => [d.id, d.result ?? null]));
      return calls.map((_, i) => byId.get(i) ?? null);
    } catch {
      // try the next node
    }
  }
  throw new Error('RPC unavailable');
}

export const short = (a) => (a && a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || '');
const who = (a) => {
  const label = LABELS[(a || '').toLowerCase()];
  return label ? `${label} (${short(a)})` : short(a);
};

/** Exact decimal string for a wei amount, without separators (for JSON APIs): 1500000000000000000n -> "1.5". */
export function btnPlain(wei) {
  const s = wei.toString().padStart(19, '0');
  const whole = s.slice(0, -18).replace(/^0+(?=\d)/, '');
  const frac = s.slice(-18).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
}

/** Formats a base-unit amount with thousands separators and at most `max` decimals. */
export function formatUnits(value, decimals = 18, max = 4) {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  let frac = (value % base).toString().padStart(decimals, '0').slice(0, max).replace(/0+$/, '');
  if (whole === 0n && value > 0n && !frac) frac = (value % base).toString().padStart(decimals, '0').replace(/0+$/, '').slice(0, 8);
  return `${whole.toLocaleString('en-US')}${frac ? `.${frac}` : ''}`;
}

// Contract methods shown by name on transaction cards.
const METHODS = {
  '0xa9059cbb': 'transfer',
  '0x095ea7b3': 'approve',
  '0x23b872dd': 'transferFrom',
  '0x40c10f19': 'mint',
  '0x42842e0e': 'safeTransferFrom',
  '0xb88d4fde': 'safeTransferFrom',
  '0xa22cb463': 'setApprovalForAll',
  '0xd0e30db0': 'deposit',
  '0x2e1a7d4d': 'withdraw',
};
const WBTN = '0x8148b71232162ea7a0b1c8bfe2b8f023934bfb58';

const day = (ts) => new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const when = (ts) =>
  new Date(ts * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) + ' UTC';

/**
 * Returns { kind, title, description, headline, subline, rows: [{label, value}], badge, path, maxAge }
 * or null when the id is not found on chain.
 */
export async function loadCard(type, id) {
  if (type === 'tx' && /^0x[0-9a-fA-F]{64}$/.test(id)) {
    const [tx, receipt] = await rpc([['eth_getTransactionByHash', [id]], ['eth_getTransactionReceipt', [id]]]);
    if (!tx) return null;
    const blockNumber = tx.blockNumber ? parseInt(tx.blockNumber, 16) : null;
    const [block] = blockNumber !== null ? await rpc([['eth_getBlockByNumber', [tx.blockNumber, false]]]) : [null];
    const value = BigInt(tx.value || '0x0');
    const fee = receipt ? BigInt(receipt.gasUsed) * BigInt(receipt.effectiveGasPrice || tx.gasPrice || '0x0') : null;
    const status = !receipt ? 'Pending' : receipt.status === '0x1' ? 'Success' : 'Failed';

    let headline = `${formatUnits(value)} BTN`;
    let subline = 'BTN transfer';
    let to = tx.to;
    const token = TOKENS[(tx.to || '').toLowerCase()];
    const input = tx.input || '0x';
    if (token && input.startsWith('0xa9059cbb') && input.length >= 138) {
      to = '0x' + input.slice(34, 74);
      headline = `${formatUnits(BigInt('0x' + input.slice(74, 138)), token.decimals)} ${token.symbol}`;
      subline = `BTS-20 transfer · ${token.symbol} token`;
    } else if (!tx.to) {
      headline = 'New contract';
      subline = 'Contract deployment';
    } else if ((tx.to || '').toLowerCase() === WBTN && input.startsWith('0x2e1a7d4d') && input.length >= 74) {
      headline = `${formatUnits(BigInt('0x' + input.slice(10, 74)))} WBTN`;
      subline = 'Unwrapped to BTN · withdraw';
    } else if ((tx.to || '').toLowerCase() === WBTN && input.startsWith('0xd0e30db0')) {
      subline = 'Wrapped into WBTN · deposit';
    } else if (input !== '0x') {
      const name = METHODS[input.slice(0, 10).toLowerCase()];
      if (value === 0n) headline = name ? `${name}()` : 'Contract call';
      subline = `${name ? `${name} on` : 'Contract call to'} ${who(tx.to)}`;
    }

    const rows = [
      { label: 'From', value: who(tx.from) },
      { label: 'To', value: to ? who(to) : 'New contract' },
      { label: 'Block', value: blockNumber !== null ? `#${blockNumber.toLocaleString('en-US')}${block ? ` · ${day(parseInt(block.timestamp, 16))}` : ''}` : 'Not mined yet' },
      { label: 'Fee', value: fee !== null ? `${formatUnits(fee, 18, 6)} BTN` : '—' },
    ];
    return {
      kind: 'Transaction',
      title: `${headline} · Bitnet transaction`,
      description: `${/transfer$|token$/.test(subline) ? `${subline} from ${who(tx.from)} to ${who(to)}` : `${subline}, sent by ${who(tx.from)}`}${blockNumber !== null ? ` in block #${blockNumber.toLocaleString('en-US')}` : ''}. ${status}.`,
      headline,
      subline,
      rows,
      badge: status,
      path: `/tx/${id}`,
      maxAge: blockNumber !== null ? 86400 : 30,
    };
  }

  if (type === 'block' && (/^\d+$/.test(id) || /^0x[0-9a-fA-F]{64}$/.test(id))) {
    const isHash = id.startsWith('0x');
    const [block, head] = await rpc([
      [isHash ? 'eth_getBlockByHash' : 'eth_getBlockByNumber', [isHash ? id : '0x' + BigInt(id).toString(16), false]],
      ['eth_blockNumber', []],
    ]);
    if (!block) return null;
    const number = parseInt(block.number, 16);
    const txs = block.transactions.length;
    const uncles = block.uncles.length;
    const subsidy = number > 0 ? WEI + (BigInt(uncles) * WEI) / 32n : 0n;
    const reward = `${formatUnits(subsidy, 18, 5)} BTN${txs > 0 ? ' + fees' : ''}`;
    const confirmations = head ? parseInt(head, 16) - number + 1 : null;
    return {
      kind: 'Block',
      title: `Bitnet block #${number.toLocaleString('en-US')}`,
      description: `Mined by ${who(block.miner)} on ${when(parseInt(block.timestamp, 16))} · ${txs} ${txs === 1 ? 'transaction' : 'transactions'} · reward ${reward}${uncles ? ` · ${uncles} ${uncles === 1 ? 'uncle' : 'uncles'}` : ''}.`,
      headline: `Block #${number.toLocaleString('en-US')}`,
      subline: when(parseInt(block.timestamp, 16)),
      rows: [
        { label: 'Miner', value: who(block.miner) },
        { label: 'Transactions', value: txs.toLocaleString('en-US') },
        { label: 'Reward', value: reward },
        { label: 'Uncles', value: String(uncles) },
      ],
      badge: confirmations !== null ? `${confirmations.toLocaleString('en-US')} confirmations` : null,
      path: `/block/${number}`,
      maxAge: confirmations !== null && confirmations > 100 ? 86400 : 60,
    };
  }

  if (type === 'address' && /^0x[0-9a-fA-F]{40}$/.test(id)) {
    const [balance, nonce, code, head] = await rpc([
      ['eth_getBalance', [id, 'latest']],
      ['eth_getTransactionCount', [id, 'latest']],
      ['eth_getCode', [id, 'latest']],
      ['eth_blockNumber', []],
    ]);
    if (balance === null) return null;
    const label = LABELS[id.toLowerCase()];
    const isContract = code && code !== '0x';
    const amount = `${formatUnits(BigInt(balance), 18, 4)} BTN`;
    return {
      kind: isContract ? 'Contract' : 'Address',
      title: `${label ? `${label} · ` : ''}Bitnet address ${short(id)}`,
      description: `Balance ${amount}${isContract ? ' · smart contract' : ` · ${parseInt(nonce, 16).toLocaleString('en-US')} transactions sent`}${label ? ` · ${label}` : ''}.`,
      headline: amount,
      subline: label ? `${label} · ${id}` : id,
      rows: [
        { label: 'Type', value: isContract ? 'Smart contract' : label === 'GTPool' || label === 'CoolPool' ? 'Mining pool' : label === 'Solo miner' ? 'Miner' : 'Wallet' },
        { label: isContract ? 'Nonce' : 'Sent', value: `${parseInt(nonce, 16).toLocaleString('en-US')}${isContract ? '' : ' transactions'}` },
        { label: 'At block', value: head ? `#${parseInt(head, 16).toLocaleString('en-US')}` : '—' },
      ],
      badge: label || null,
      path: `/address/${id}`,
      maxAge: 600,
    };
  }

  return null;
}
