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
- **BTS-721 NFT Explorer:** Query any NFT contract and Token ID to view owner and IPFS metadata pointers.
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

Run `npm test` and `npm run build`. Hashrate is an estimate from cumulative work divided by elapsed time. Daily/weekly/monthly/yearly/all charts use real block timestamps; transaction activity is the average of 12 sampled blocks per interval, not a full-chain total. Supply history is unavailable until a complete issuance index is provided. Watched wallets, transaction snapshots and partial NFT pages are labelled accordingly.

Vite `/api/*` proxies apply only to development. Production must configure equivalent HTTPS reverse proxies for `/api/rpc`, `/api/rpc2`, `/api/explorer`, `/api/bitnet-explorer`, `/api/nestex`, or allow the listed direct endpoints through CORS. No production deployment is performed by this change.
