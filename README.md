<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/bitnetscan-logo-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="public/bitnetscan-logo.png">
    <img src="public/bitnetscan-logo.png" alt="BitnetScan Logo" width="480">
  </picture>

  <p align="center">
    <strong>Next-Generation Blockchain Explorer & Web3 Analytics Suite for Bitnet Money (BTN)</strong>
  </p>

  <p align="center">
    <a href="https://trade.nestex.one/spot/BTN"><img src="https://img.shields.io/badge/Chain_ID-210-015866?style=flat-square" alt="Chain ID 210" /></a>
    <a href="https://bitnetmoney.org"><img src="https://img.shields.io/badge/Consensus-Ethash_PoW-162334?style=flat-square" alt="PoW Ethash" /></a>
    <img src="https://img.shields.io/badge/Network-Bitnet_Mainnet-016976?style=flat-square" alt="Mainnet" />
  </p>
</div>

<br />

# BitnetScan — Next-Generation Bitnet (BTN) Blockchain Explorer

BitnetScan is a state-of-the-art, feature-complete Block Explorer and Web3 Analytics Suite engineered specifically for the **Bitnet Money** Layer-1 Proof-of-Work (PoW) EVM blockchain.

---

## 🚀 Key Features

### 1. Live Network Metrics & Dashboard
- **Real-Time Block & Transaction Feed:** Auto-polls Bitnet RPC every 20 seconds with animated visual updates.
- **PoW Hashrate & Difficulty Analytics:** Dynamic hashrate estimation calculated directly from current block difficulty and block times.
- **Gas Tracker:** Live gas fee tracking in Gwei (RPC recommendation; unavailable data is marked unknown).
- **Network Status Ticker:** Peer counts, chain ID 210, client version, and node synchronization status.

### 2. Universal Omni-Search
- Search by **Block Number** (e.g. `7721294`)
- Search by **Block Hash** (`0x...`)
- Search by **Transaction Hash** (`0x...`)
- Search by **Wallet / Contract Address** (`0x...`)

### 3. Comprehensive Block Inspection
- Block height, timestamp, PoW nonce, mixHash, parent hash navigation.
- Miner address with balance preview and direct account navigation.
- Block reward calculation (1.0 BTN base subsidy; uncle rewards and fees are additional).
- Gas Used vs Gas Limit percentage progress visualization.
- **Node ExtraData Decoding:** Automatically converts raw hex into ASCII client identification (e.g., `geth go1.22.2 linux`).
- Full list of all transactions within the block.

### 4. Advanced Transaction & Execution Inspection
- Success/revert status badge with gas fee calculations.
- Value transferred in BTN with precise unit formatting.
- **Smart Contract Input Data Decoder:**
  - Decodes standard ERC-20 / BTS-20, BTS-721, BTS-1155, BTS-21, and BTS-HCE method calls.
  - View modes: Decoded Arguments, Raw Hex, and UTF-8 string text.
- Event Log decoder for `Transfer` and custom contract events.

### 5. Address & Smart Contract Suite
- EOA vs Smart Contract auto-detection using `eth_getCode`.
- QR Code generator for mobile wallet transfers.
- **Live Read Contract Interface:** Directly execute `name()`, `symbol()`, `totalSupply()`, `decimals()`, `owner()`, and `balanceOf()` queries via JSON-RPC.
- Full EVM deployed bytecode viewer.

### 6. Bitnet Token Standards & NFT Explorers
- **BTS-20 Explorer:** Inspect any token contract on Bitnet.
- **BTS-721 NFT Explorer:** Load every ERC-721 collection, instance and transfer page from the Bitnet indexer. Holder balances use the complete instance list. Token details check ERC-721 support, `ownerOf` and `tokenURI` at a single RPC block; images and attributes come from creator metadata, with explicit indexer fallback when gateways are unavailable.
- Documentation for official standards: `BTS-20`, `BTS-721`, `BTS-1155`, `BTS-21`, `BTS-HCE`.

### 7. PoW Mining Calculator & Guide
- Interactive reward estimation tool based on user hash power (MH/s or GH/s).
- Configuration guides for Ethash miners (lolMiner, T-Rex, Bitnet Desktop Node).

### 8. Developer JSON-RPC Console & Node Health Ping
- Interactive JSON-RPC 2.0 playground with pre-filled method templates and live latency timing.
- Real-time multi-node health checker pinging `rpc.bitnetmoney.org`, `rpc.bitnetmoney.com`, etc.

### 9. 1-Click MetaMask Integration
- "Add Bitnet to Wallet" button in the header pre-populating Chain ID `210`, RPC URL, and `BTN` currency symbol.

---

## 🛠️ Tech Stack
- **Framework:** React 18, Vite 5, TypeScript
- **Styling:** Tailwind CSS (Dark Cyber Glassmorphism)
- **Web3 / Crypto:** Ethers.js v6
- **Icons:** Lucide React

---

## ⚡ Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Data coverage and validation

Run `npm run test:nfts` and `npm run build` for NFT regression checks. `node scripts/check-nfts.mjs --live` additionally checks current indexed holder quantities and sample NFT owners/tokenURIs against Bitnet RPC; it needs network access. Hashrate is an estimate from cumulative work divided by elapsed time. Daily/weekly/monthly/yearly/all charts use real block timestamps; transaction activity is the average of 12 sampled blocks per interval, not a full-chain total. Supply history is unavailable until a complete issuance index is provided. Watched wallets and transaction snapshots are labelled accordingly.

NFT collection hints contain addresses and labels only. Legacy NFT snapshots are not loaded. Partial scans, unavailable metadata and cached records are labelled; missing prices and mint timestamps are not estimated. Collection names can be reused by different contracts: the five known addresses are grouped separately from additional indexed contracts. Indexer inclusion is not an authenticity badge. Wallet holdings exclude cached ownership records, and transfer events are keyed by transaction, log index and token ID. ERC-721 IDs remain decimal strings to preserve all 256 bits.

IPFS images and tokenURI metadata use a lazily loaded `@helia/verified-fetch` client to discover providers and verify content against its CID. Images also try HTTP gateways in parallel, share in-flight IPFS requests and use a bounded memory cache. Migrated public gateways (`w3s.link`, `ipfs.io`, `dweb.link`, `nftstorage.link`, `storacha.link`) are excluded from hotlink fallbacks because their service-worker pages cannot load as an image or JSON response. Original creator URIs and CID paths are preserved. See the [IPFS gateway migration notice](https://gatewaychanges.ipfs.io/).

Use Node.js 22.19+ (or Node.js 24) when running live IPFS checks. The project `.npmrc` disables automatic peer installation because Helia's transport dependencies declare React Native peers that this browser app does not use.

The SDK is a separate lazy chunk (about 494 KB gzip). Its transitive Node-only `node-forge`/`braces` dependencies currently have npm security advisories; neither package nor `acme-client` is present in the emitted browser code. Recheck those advisories before using this dependency tree in a Node server.

BitnetPunks' indexed image directory is `bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem`; its sampled contract tokenURI points to metadata directory `bafybeigid6ra5ehwariynf5fxpytq7t2unuszul6m5hz76et4p2plya4sm`. Retrieval improvements cannot restore content if no reachable provider serves it. In that case the UI reports `IPFS image unavailable`. Recovery requires the original directory/CAR to be re-pinned under the same CID by its creator or another holder of the files; changing gateways or generating replacement artwork would not recover the original NFT images.

Vite `/api/*` proxies apply only to development. Production must configure equivalent HTTPS reverse proxies for `/api/rpc`, `/api/rpc2`, `/api/explorer`, `/api/bitnet-explorer`, `/api/nestex`, or allow the listed direct endpoints through CORS. No production deployment is performed by this change.
