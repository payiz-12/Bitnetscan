# Contributing to BitnetScan

Thank you for your interest in contributing to **BitnetScan**! As the next-generation blockchain explorer and Web3 analytics suite for the [Bitnet Money (BTN)](https://bitnetmoney.org) network, community contributions, bug reports, and feedback are warmly welcomed.

Please take a moment to review this document before submitting issues or pull requests.

---

## 📋 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [How Can I Contribute?](#-how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Submitting Pull Requests](#submitting-pull-requests)
- [Development Setup](#-development-setup)
  - [Prerequisites](#prerequisites)
  - [Installation & Running Locally](#installation--running-locally)
- [Project Architecture](#-project-architecture)
- [Coding & Engineering Standards](#-coding--engineering-standards)
  - [UI & Language Policy](#ui--language-policy)
  - [Blockchain & Data Integrity](#blockchain--data-integrity)
  - [TypeScript & Code Style](#typescript--code-style)
- [Testing & Quality Verification](#-testing--quality-verification)
- [Commit & Git Conventions](#-commit--git-conventions)
- [License](#-license)

---

## 🤝 Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment for everyone. Please be respectful, constructive, and collaborative in all issues, discussions, and pull requests.

---

## 💡 How Can I Contribute?

### Reporting Bugs

If you find a bug, inaccurate blockchain data display, or rendering issue:
1. **Search existing issues** to make sure the problem hasn't already been reported.
2. Open a new issue with a clear, descriptive title.
3. Include:
   - Steps to reproduce the issue.
   - Expected behavior vs. actual behavior.
   - Context: transaction hash, block number, or wallet address involved (if applicable).
   - Browser name, version, and device type (desktop/mobile).
   - Screenshots or console logs if applicable.

### Suggesting Enhancements

Have an idea for a new feature, metric, or chart?
1. Open an issue with the tag `enhancement` or `feature request`.
2. Clearly describe the problem your feature solves or the value it brings to Bitnet users and miners.
3. Provide mockups, references, or API examples if available.

### Submitting Pull Requests

1. **Fork** the repository and create your branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Keep changes focused. Avoid bundling unrelated fixes or style changes into one PR.
3. Test your changes locally (see [Testing & Quality Verification](#-testing--quality-verification)).
4. Open a Pull Request against the `main` branch with a clear description of the change.

---

## 🛠️ Development Setup

### Prerequisites

- **Node.js**: v20.x, v22.x or later. (Node.js 22.19+ recommended for live IPFS Helia client tests).
- **npm**: v10.x or later.
- **Git**

### Installation & Running Locally

1. Clone your fork:
   ```bash
   git clone https://github.com/payiz-12/Bitnetscan.git
   cd Bitnetscan
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

4. Test production build locally:
   ```bash
   npm run build
   npm run preview
   ```

---

## 📁 Project Architecture

```
src/
├── components/          # Reusable UI components & analytics charts
│   ├── Header.tsx       # Omni-search, quick navigation, wallet integration
│   ├── Footer.tsx       # Links, network status, version info
│   └── NetworkActivityCharts.tsx # Interactive charts (mining, blocks, volume)
├── views/               # Primary explorer page views
│   ├── DashboardView.tsx     # Hero analytics banner, latest blocks & txs
│   ├── BlocksView.tsx        # Paginated block ledger
│   ├── BlockDetailView.tsx   # Detailed block inspector (miner, extraData, txs)
│   ├── TransactionsView.tsx  # Paginated transaction feed
│   ├── TxDetailView.tsx      # Comprehensive transaction & input data decoder
│   ├── AddressDetailView.tsx # EOA & Smart Contract inspector, balances, history
│   ├── MiningView.tsx        # PoW mining calculator & active pool statistics
│   ├── RichListView.tsx      # Top coin holders & whale tracker
│   ├── TokensView.tsx        # BTS-20 token directory
│   ├── NftsView.tsx          # BTS-721 NFT explorer with IPFS resolver
│   └── ContractsView.tsx     # Verified contracts & read/call interface
├── services/            # Blockchain, RPC & API integration services
│   ├── rpc.ts               # Primary JSON-RPC service (multi-endpoint fallback)
│   ├── explorerApi.ts       # Blockscout v2 indexer integration & ledger queries
│   ├── miningPoolStats.ts   # Real-time mining pool & worker calculations
│   ├── priceService.ts      # Live NestEx spot price & market ticker
│   └── ipfs.ts              # IPFS metadata & media verification resolver
├── types/               # TypeScript definitions
│   └── blockchain.ts        # Block, Transaction, NetworkStats, Token interfaces
└── data/                # Static data, pool registries & verified constants
```

---

## 📐 Coding & Engineering Standards

### UI & Language Policy
- **English UI Only:** All user-facing explorer copy, labels, tooltips, error messages, and table headers must strictly be written in English.
- **Styling:** Use Tailwind CSS utility classes following the existing clean, cyber-modern design theme.
- **Responsive Design:** Ensure all layouts look great on both mobile screens (`< 640px`) and widescreen displays.

### Blockchain & Data Integrity
- **Truthful On-Chain Data:** Never hardcode artificial balances, fake transaction counts, or fabricated numbers. If data is pending or unavailable from RPC/indexer, display loading states or explicit "Unavailable" badges.
- **RPC Resiliency:** Multi-endpoint fallbacks are configured in `rpc.ts`. Handle timeouts, rate limits, and network errors gracefully without crashing the UI.
- **Genesis Block Normalization:** Block #0 has an epoch timestamp that is properly normalized to the Bitnet Genesis launch timestamp (`1689317647`). Do not revert this normalization.
- **Token IDs & Large Integers:** Always treat EVM `uint256` token IDs and large numbers as strings or `BigInt` to avoid 64-bit float precision loss.

### TypeScript & Code Style
- Write clean, strongly typed TypeScript code. Avoid `any` whenever specific interfaces can be defined in `types/`.
- Preserve existing comments, docstrings, and architectural rationale unless directly refactoring.
- Keep components modular and extract complex logic into custom hooks or services.

---

## 🧪 Testing & Quality Verification

Before submitting any Pull Request, ensure that all automated checks and builds pass cleanly:

1. **Typecheck & Production Build:**
   ```bash
   npm run build
   ```
   *Must complete without TypeScript or Vite bundle errors.*

2. **NFT & Fixture Regression Suite:**
   ```bash
   npm run test:nfts
   ```
   *Validates token pagination, holder calculations, 714 NFT fixtures, and cache handling.*

3. *(Optional) Live On-Chain NFT Verification:*
   ```bash
   node scripts/check-nfts.mjs --live
   ```

---

## 🔀 Commit & Git Conventions

- Write clear, concise commit messages in English.
- Recommended prefix conventions:
  - `feat:` A new feature or view
  - `fix:` A bug fix or data accuracy correction
  - `refactor:` Code improvements without behavioral changes
  - `docs:` Documentation updates
  - `style:` Formatting or UI polish
  - `test:` Adding or updating tests
- Keep commit history clean and avoid merging extraneous files (e.g., `.DS_Store`, build artifacts in `dist/`).

---

## 📄 License

By contributing to BitnetScan, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
