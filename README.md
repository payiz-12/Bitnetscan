<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/bitnetscan-logo-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="public/bitnetscan-logo.png">
    <img src="public/bitnetscan-logo.png" alt="BitnetScan Logo" width="480">
  </picture>

  <p align="center">
    <strong>Block explorer for Bitnet Money (BTN)</strong>
  </p>

  <p align="center">
    <a href="https://trade.nestex.one/spot/BTN"><img src="https://img.shields.io/badge/Chain_ID-210-015866?style=flat-square" alt="Chain ID 210" /></a>
    <a href="https://bitnetmoney.org"><img src="https://img.shields.io/badge/Consensus-Ethash_PoW-162334?style=flat-square" alt="PoW Ethash" /></a>
    <img src="https://img.shields.io/badge/Network-Bitnet_Mainnet-016976?style=flat-square" alt="Mainnet" />
  </p>
</div>

<br />

# BitnetScan

BitnetScan is a block explorer for the Bitnet Money proof-of-work EVM chain (chain ID 210). Live site: https://bitnetscan.vercel.app

## Features

- **Dashboard** – latest blocks and transactions, block time, gas price, hashrate, BTN price from NestEx and today's transaction count.
- **Search** – block numbers, transaction hashes and addresses, with a preview of the result while you type. Known tokens, contracts and pools can be found by name.
- **Blocks and transactions** – the full transaction archive (newest first, back to block 1), block details with the exact miner reward, transaction details with decoded input data, event logs, a live confirmation count with the recommended number, and internal transactions (the call tree from the node's `callTracer`, including BTN moved by contracts).
- **Contracts** – read and write every function of a contract verified on the Bitnet explorer (tuples, arrays and custom errors included); unverified contracts that answer like BTS-20 tokens use the standard token interface (WETH9 for Wrapped Bitnet), marked as unverified. Writes go through the user's wallet after switching it to Bitnet, and every write is first run as a test call so a failing transaction shows its revert reason before anything is sent.
- **Addresses** – balance, balance history over 30 days, a year or all time (read from the archive node), nonce, transaction history with CSV download (newest 5,000, exact BTN amounts, UTC dates), BTS-20 tokens, NFTs, mined blocks, contract bytecode and Read / Write Contract.
- **Top accounts** – ranking by balance from the Bitnet explorer, with each balance read live from the RPC.
- **Tokens, NFTs and contracts** – BTS-20 tokens, NFT collections (IPFS content verified against its CID) and verified contracts.
- **Mining** – miner share of the last 200 blocks, Nakamoto coefficient, worker counts published by pools, pool servers and a profitability calculator (GPU presets, power cost, pool fee, break-even price).
- **Charts** – hashrate, difficulty, block time, uncle rate and miner share over 7 days, 30 days, 1 year or all time, computed from block headers.
- **Uncles** – uncles in the last 2,000 blocks with depth and reward, and the uncle share of each miner. Uncles are read over RPC because the explorer indexer lists only some of them.
- **Chain security** – share of the largest miners over the last 100 to 2,000 blocks and 30 days, Nakamoto coefficient, the largest miner's share over time, confirmations to wait against a given hashrate share (Bitcoin paper, section 11), uncle depth, reorganizations recorded by the explorer and a live reorganization watch, and hashrate against its 30-day average.
- **Supply & market** – total, circulating and burned supply, issuance measured from recent blocks, annual inflation, a projection, top-holder concentration and NestEx market data.
- **Address labels** – pools, solo miners, burn addresses, tokens and verified contracts, plus addresses that received recent payouts from a pool.
- **Watchlist** – up to 50 addresses saved in the browser (no account), with names, backup and restore. While the site is open, even in a background tab, balances and nonces are checked every 30–60 s; changes are logged, shown in the page and, with permission, sent as notifications (at most one per address every 10 minutes).
- **Share cards** – transaction, block and address pages have a Share button (X, Telegram, WhatsApp, copy link). Links use the `/tx/…`, `/block/…` and `/address/…` form; those paths return the page with its own link-preview tags and a 1200×630 card image rendered from the chain by `/api/og`.
- **Dark theme** – a sun/moon switch in the header. Until a visitor picks one, the site follows the device's light or dark setting; the choice is kept in the browser and applied before the first paint.
- **Installable** – a web app manifest and a service worker, so the site can be added to a phone's home screen.
- **Network** – chain parameters, Ethash epoch and DAG size, reward rules, endpoints and wallet config for pool and node operators.
- **Developer tools** – JSON-RPC console, RPC endpoint status, a public API, and a tools page: exact wei/Gwei/BTN converter, block by date (binary search over headers), signed-message verification (EIP-191), function selector and event topic, EIP-55 checksum and hex/decimal.

## Data sources

| Data | Source |
| --- | --- |
| Blocks, transactions, balances, receipts | Bitnet JSON-RPC (`rpc.bitnetmoney.org`, `rpc.bitnetmoney.com`) |
| Transaction archive, address history, top accounts, counters | Bitnet explorer indexer (`explorer.bitnetmoney.com`) |
| Daily statistics | `stats.explorer.bitnetmoney.com` |
| BTN price | NestEx (`api.nestex.one`) |
| Pool workers and servers | CoolPool API (`coolpool.top`), GTPool (`gtpool.io`) |

The browser reaches these services through `/api/*` paths. They are proxied by Vite during development (`vite.config.ts`) and by Vercel rewrites in production (`vercel.json`).

Values that cannot be read are shown as unknown rather than estimated.

## API

All endpoints are free, need no key and allow cross-origin requests. The site's API page (`#/api`) documents them with live examples.

| Endpoint | Returns |
| --- | --- |
| [`/api/stats`](https://bitnetscan.vercel.app/api/stats) | Live chain stats as JSON: height, average block time, difficulty, hashrate, gas price, peers, Ethash epoch and DAG size (cached 15 s) |
| [`/api/supply`](https://bitnetscan.vercel.app/api/supply) | Circulating supply in BTN as plain text |
| [`/api/supply?q=total`](https://bitnetscan.vercel.app/api/supply?q=total) | Total supply in BTN as plain text |
| [`/api/supply?format=json`](https://bitnetscan.vercel.app/api/supply?format=json) | The supply snapshot with block range and method |
| [`/api/address?address=0x…`](https://bitnetscan.vercel.app/api/address?address=0xfad4a236c87880035497043f24ea58d73c3e50de) | Balance (exact BTN and wei), nonce, contract flag and label (cached 15 s) |
| [`/api/blocks?limit=10`](https://bitnetscan.vercel.app/api/blocks?limit=10) | Newest 1–50 blocks with miner, transactions, uncles and subsidy (cached 10 s) |
| [`/api/miners?blocks=1000`](https://bitnetscan.vercel.app/api/miners?blocks=1000) | Miner shares over the newest 100–2,000 blocks, Nakamoto coefficient and uncle rate (cached 2 min) |
| [`/api/reorgs`](https://bitnetscan.vercel.app/api/reorgs) | Blocks the explorer indexer saw replaced by a chain reorganization (cached 15 min) |
| `/api/og?type=tx\|block\|address&id=…` | 1200×630 PNG share card for a transaction, block or address |

Supply is the sum of all account balances indexed by the explorer, recomputed every hour by `.github/workflows/supply-snapshot.yml` (`scripts/supply-snapshot.mjs`) and stored on the `data` branch. Block height alone undercounts supply because Bitnet pays uncle rewards ((8 − depth) / 8 BTN to the uncle miner, 1/32 BTN to the including miner). Circulating supply excludes the balances of `0x0…0` and `0x…dEaD`.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

Checks:

```bash
npm run test:explorer
npm run test:nfts
node scripts/check-hashrate.mjs
node scripts/check-supply-history.mjs
node scripts/check-transaction-history.mjs
node scripts/verify-all-system-checks.mjs
```

`node scripts/check-nfts.mjs --live` also compares indexed NFT holders and sample owners/tokenURIs against the RPC (needs network access, Node.js 22.19+).

## Tech stack

React 18, TypeScript, Vite 5, Tailwind CSS, ethers v6, lucide-react, `@helia/verified-fetch` for IPFS.

## Notes

- IPFS images and metadata are fetched with `@helia/verified-fetch`, which is loaded only when an NFT page needs it. HTTP gateways are tried in parallel; migrated public gateways (`w3s.link`, `ipfs.io`, `dweb.link`, `nftstorage.link`, `storacha.link`) are skipped because they no longer serve raw content. If no provider serves a CID, the UI shows `IPFS image unavailable`.
- `.npmrc` disables automatic peer installation because Helia's transport dependencies declare React Native peers that this app does not use.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
