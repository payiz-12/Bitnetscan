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
- **Blocks and transactions** – the full transaction archive (newest first, back to block 1), block details with the exact miner reward, transaction details with decoded input data and event logs.
- **Addresses** – balance, nonce, transaction history, BTS-20 tokens, NFTs, mined blocks, contract bytecode and a read-only contract caller.
- **Top accounts** – ranking by balance from the Bitnet explorer, with each balance read live from the RPC.
- **Tokens, NFTs and contracts** – BTS-20 tokens, NFT collections (IPFS content verified against its CID) and verified contracts.
- **Mining** – miner share of the last 200 blocks, worker counts published by pools, pool servers and a reward calculator.
- **Developer tools** – JSON-RPC console and RPC endpoint status.

## Data sources

| Data | Source |
| --- | --- |
| Blocks, transactions, balances, receipts | Bitnet JSON-RPC (`rpc.bitnetmoney.org`, `rpc.bitnetmoney.com`) |
| Transaction archive, address history, top accounts, counters | Bitnet explorer indexer (`explorer.bitnetmoney.com`) |
| Daily statistics | `stats.explorer.bitnetmoney.com` |
| BTN price | NestEx (`api.nestex.one`) |
| Pool workers and servers | CoolPool API (`coolpool.top`) |

The browser reaches these services through `/api/*` paths. They are proxied by Vite during development (`vite.config.ts`) and by Vercel rewrites in production (`vercel.json`).

Values that cannot be read are shown as unknown rather than estimated. The supply chart uses the explorer's circulating supply series when available; otherwise it shows base issuance (block height × 1 BTN) and labels it as an estimate.

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
