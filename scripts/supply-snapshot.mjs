#!/usr/bin/env node
// Computes the BTN supply as the sum of every account balance known to the Bitnet explorer
// indexer and writes it as JSON. Run hourly by .github/workflows/supply-snapshot.yml.
//
// Why a balance sum: supply is 1 BTN per block plus uncle rewards ((8 - depth) / 8 BTN to the
// uncle miner and 1/32 BTN to the including miner), and Bitnet produces uncles regularly, so
// block height alone undercounts. Fees go to miners and are not burned.
//
// Usage: node scripts/supply-snapshot.mjs [output.json]

import { writeFileSync } from 'node:fs';

const INDEXER = 'https://explorer.bitnetmoney.com/api/v2/addresses';
const RPC = ['https://rpc.bitnetmoney.org', 'https://rpc.bitnetmoney.com'];
const BURN_ADDRESSES = [
  '0x0000000000000000000000000000000000000000',
  '0x000000000000000000000000000000000000dead',
];
const WEI = 10n ** 18n;

async function getJson(url, init, attempts = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i >= attempts) throw new Error(`${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
}

async function rpc(method, params) {
  let lastError;
  for (const url of RPC) {
    try {
      const data = await getJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      }, 2);
      if (data.error) throw new Error(data.error.message);
      return data.result;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

const formatBtn = (wei) => {
  const whole = wei / WEI;
  const frac = (wei % WEI).toString().padStart(18, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : `${whole}`;
};

const startBlock = parseInt(await rpc('eth_blockNumber', []), 16);

let total = 0n;
let accounts = 0;
let pages = 0;
let params = null;
const seen = new Set();
do {
  const url = params ? `${INDEXER}?${new URLSearchParams(params)}` : INDEXER;
  const page = await getJson(url, { headers: { Accept: 'application/json' } });
  if (!Array.isArray(page.items)) throw new Error('Unexpected indexer response');
  for (const item of page.items) {
    const address = String(item.hash || '').toLowerCase();
    if (!address || seen.has(address)) continue;
    seen.add(address);
    total += BigInt(item.coin_balance || 0);
    accounts++;
  }
  pages++;
  params = page.next_page_params;
} while (params);

const endBlock = parseInt(await rpc('eth_blockNumber', []), 16);
let burned = 0n;
for (const address of BURN_ADDRESSES) burned += BigInt(await rpc('eth_getBalance', [address, 'latest']));

// Sanity check: every block pays at least 1 BTN, so the sum can never be below the block height.
if (total < BigInt(startBlock) * WEI) {
  throw new Error(`Balance sum ${formatBtn(total)} BTN is below the base issuance at block ${startBlock}; not publishing.`);
}

const snapshot = {
  updatedAt: new Date().toISOString(),
  blockRange: [startBlock, endBlock],
  totalSupply: formatBtn(total),
  circulatingSupply: formatBtn(total - burned),
  burned: formatBtn(burned),
  baseIssuance: String(endBlock),
  accounts,
  pages,
  method: 'Sum of all account balances indexed by explorer.bitnetmoney.com; burned = balance of 0x0…0 and 0x…dEaD.',
};

const output = process.argv[2];
const json = `${JSON.stringify(snapshot, null, 2)}\n`;
if (output) writeFileSync(output, json);
process.stdout.write(json);
