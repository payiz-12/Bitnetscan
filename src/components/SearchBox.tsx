import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, X, Box, ArrowRightLeft, Wallet, FileCode, Coins, Image as ImageIcon, Cpu, Trophy,
  Layers, Terminal, Activity, Loader2, CornerDownLeft, SearchX, LineChart, GitBranch, PieChart, ShieldCheck, Wrench, Braces, Star,
} from 'lucide-react';
import { rpcService } from '../services/rpc';
import { KNOWN_BTS20_TOKENS } from '../services/explorerApi';
import { OFFICIAL_BITNET_VERIFIED_CONTRACTS } from '../data/verifiedContracts';
import { BITNET_NFT_COLLECTIONS } from '../data/nftCollections';
import { KNOWN_MINING_POOLS } from '../data/miningPools';
import { VERIFIED_HODL_WALLETS } from '../data/richList';

type IconType = React.ComponentType<{ className?: string }>;

interface Suggestion {
  key: string;
  icon: IconType;
  tone: string;
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: string;
  view: string;
  param?: string | number;
}

interface IndexEntry {
  address: string;
  name: string;
  symbol?: string;
  kind: string;
  icon: IconType;
  tone: string;
}

interface Preview {
  query: string;
  status: 'loading' | 'found' | 'notfound';
  suggestion?: Suggestion;
  message?: string;
}

const TONES = {
  block: 'bg-petrol-50 text-petrol border-petrol-200',
  tx: 'bg-sky-50 text-sky-600 border-sky-200',
  wallet: 'bg-slate-100 text-slate-700 border-slate-200',
  contract: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  token: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  nft: 'bg-purple-50 text-purple-600 border-purple-200',
  pool: 'bg-orange-50 text-orange-600 border-orange-200',
  rich: 'bg-amber-50 text-terracotta border-amber-200',
  page: 'bg-slate-50 text-slate-500 border-slate-200',
};

const PAGES: { view: string; label: string; keywords: string; icon: IconType }[] = [
  { view: 'dashboard', label: 'Dashboard', keywords: 'home overview stats', icon: Layers },
  { view: 'blocks', label: 'Blocks', keywords: 'latest blocks chain', icon: Box },
  { view: 'transactions', label: 'Transactions', keywords: 'txs transfers archive', icon: ArrowRightLeft },
  { view: 'rich-list', label: 'Rich List', keywords: 'top holders whales richlist', icon: Trophy },
  { view: 'tokens', label: 'BTS-20 Tokens', keywords: 'erc20 token', icon: Coins },
  { view: 'nfts', label: 'NFT Collections', keywords: 'bts-721 erc721 nft', icon: ImageIcon },
  { view: 'contracts', label: 'Verified Contracts', keywords: 'contract source code', icon: FileCode },
  { view: 'mining', label: 'Mining & Hashrate', keywords: 'miner pool hashrate difficulty', icon: Cpu },
  { view: 'console', label: 'JSON-RPC Console', keywords: 'rpc developer console', icon: Terminal },
  { view: 'nodes', label: 'Network & RPC', keywords: 'network node rpc status health chain id epoch dag pool api', icon: Activity },
  { view: 'charts', label: 'Network Charts', keywords: 'charts history hashrate difficulty block time uncle rate miner share', icon: LineChart },
  { view: 'uncles', label: 'Uncle Blocks', keywords: 'uncle uncles ommer stale orphan', icon: GitBranch },
  { view: 'watchlist', label: 'Watchlist', keywords: 'watchlist watch follow track favorites alerts notifications', icon: Star },
  { view: 'api', label: 'API', keywords: 'api endpoints json developers supply stats address blocks miners', icon: Braces },
  { view: 'tools', label: 'Developer Tools', keywords: 'tools unit converter wei gwei block by date timestamp signature verify selector checksum hex', icon: Wrench },
  { view: 'security', label: 'Chain Security', keywords: 'security 51% attack majority nakamoto decentralization reorg confirmations', icon: ShieldCheck },
  { view: 'supply', label: 'Supply & Market', keywords: 'supply market cap circulating inflation issuance price emission', icon: PieChart },
];

// Named, locally known addresses that can be found by name, symbol or address prefix.
const SEARCH_INDEX: IndexEntry[] = (() => {
  const entries: IndexEntry[] = [];
  const seen = new Set<string>();
  const add = (entry: IndexEntry) => {
    const key = entry.address.toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(key) || seen.has(key)) return;
    seen.add(key);
    entries.push(entry);
  };
  KNOWN_BTS20_TOKENS.forEach((t) => add({ address: t.address, name: t.name, symbol: t.symbol, kind: 'BTS-20 Token', icon: Coins, tone: TONES.token }));
  BITNET_NFT_COLLECTIONS.forEach((c) => add({ address: c.contract, name: c.name, symbol: c.symbol || undefined, kind: 'NFT Collection', icon: ImageIcon, tone: TONES.nft }));
  Object.values(KNOWN_MINING_POOLS).forEach((p) => add({ address: p.address, name: p.name, kind: 'Miner', icon: Cpu, tone: TONES.pool }));
  OFFICIAL_BITNET_VERIFIED_CONTRACTS.forEach((c) => add({ address: c.address, name: c.name, kind: 'Verified Contract', icon: FileCode, tone: TONES.contract }));
  VERIFIED_HODL_WALLETS.forEach((w) => add({ address: w.address, name: 'Large holder', kind: 'Wallet', icon: Trophy, tone: TONES.rich }));
  return entries;
})();

const findIndexEntry = (address: string) =>
  SEARCH_INDEX.find((e) => e.address.toLowerCase() === address.toLowerCase());

const short = (value: string, lead = 6, trail = 4) =>
  value && value.length > lead + trail + 3 ? `${value.slice(0, lead)}…${value.slice(-trail)}` : value;

const timeAgo = (timestamp: number) => {
  const s = Math.max(0, Math.floor(Date.now() / 1000) - timestamp);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const formatBtn = (value: string | number) => {
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(n)) return `${value} BTN`;
  if (n > 0 && n < 0.0001) return '< 0.0001 BTN';
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 4 })} BTN`;
};

type QueryKind = 'block' | 'address' | 'hash' | null;

/** Accepts "#7,799,000", bare 40/64-char hex without 0x, and surrounding whitespace. */
const normalizeQuery = (raw: string): { value: string; kind: QueryKind } => {
  const q = raw.trim();
  const digits = q.replace(/^#/, '').replace(/[,\s_]/g, '');
  if (/^\d{1,12}$/.test(digits)) return { value: String(parseInt(digits, 10)), kind: 'block' };
  const hex = /^0x/i.test(q) ? q.slice(2) : q;
  if (/^[0-9a-fA-F]{40}$/.test(hex)) return { value: `0x${hex}`, kind: 'address' };
  if (/^[0-9a-fA-F]{64}$/.test(hex)) return { value: `0x${hex.toLowerCase()}`, kind: 'hash' };
  return { value: q, kind: null };
};

const blockSuggestion = (blk: { number: number; timestamp: number; transactions: unknown[]; miner: string }): Suggestion => {
  const pool = KNOWN_MINING_POOLS[(blk.miner || '').toLowerCase()];
  return {
    key: `block:${blk.number}`,
    icon: Box,
    tone: TONES.block,
    title: `Block #${blk.number.toLocaleString()}`,
    subtitle: `${timeAgo(blk.timestamp)} · ${blk.transactions.length} txns · Miner ${pool ? pool.name : short(blk.miner)}`,
    badge: 'Block',
    view: 'block-detail',
    param: blk.number,
  };
};

async function resolvePreview(value: string, kind: Exclude<QueryKind, null>): Promise<Preview> {
  if (kind === 'block') {
    const num = parseInt(value, 10);
    const blk = await rpcService.getBlock(num, false);
    if (blk) return { query: value, status: 'found', suggestion: blockSuggestion(blk) };
    const latest = await rpcService.getBlockNumber().catch(() => 0);
    return {
      query: value,
      status: 'notfound',
      message: latest && num > latest
        ? `Block #${num.toLocaleString()} has not been mined yet (latest #${latest.toLocaleString()}).`
        : `Block #${num.toLocaleString()} was not found.`,
    };
  }

  if (kind === 'address') {
    const known = findIndexEntry(value);
    const [balance, code, nonce] = await Promise.allSettled([
      rpcService.getBalance(value),
      rpcService.getCode(value),
      rpcService.getTransactionCount(value),
    ]);
    const isContract = code.status === 'fulfilled' && !!code.value && code.value !== '0x';
    const parts = [short(value, 8, 6)];
    if (nonce.status === 'fulfilled' && !isContract) parts.push(`${nonce.value.toLocaleString()} sent`);
    return {
      query: value,
      status: 'found',
      suggestion: {
        key: `address:${value.toLowerCase()}`,
        icon: known?.icon || (isContract ? FileCode : Wallet),
        tone: known?.tone || (isContract ? TONES.contract : TONES.wallet),
        title: known?.name || (isContract ? 'Contract' : 'Address'),
        subtitle: parts.join(' · '),
        meta: balance.status === 'fulfilled' ? formatBtn(balance.value) : 'Balance unavailable',
        badge: known?.kind || (code.status === 'fulfilled' ? (isContract ? 'Contract' : 'Wallet') : 'Address'),
        view: 'address-detail',
        param: value,
      },
    };
  }

  const tx = await rpcService.getTransaction(value);
  if (tx) {
    const status = tx.status === 1 ? 'Success' : tx.status === 0 ? 'Failed' : 'Pending';
    return {
      query: value,
      status: 'found',
      suggestion: {
        key: `tx:${value}`,
        icon: ArrowRightLeft,
        tone: TONES.tx,
        title: `Transaction ${short(value, 10, 6)}`,
        subtitle: `${short(tx.from)} → ${tx.to ? short(tx.to) : 'Contract creation'}${tx.blockNumber ? ` · Block #${tx.blockNumber.toLocaleString()}` : ''}`,
        meta: formatBtn(tx.value),
        badge: status,
        view: 'tx-detail',
        param: value,
      },
    };
  }
  const blk = await rpcService.getBlock(value, false);
  if (blk) return { query: value, status: 'found', suggestion: blockSuggestion(blk) };
  return { query: value, status: 'notfound', message: 'No transaction or block with this hash was found on Bitnet.' };
}

interface SearchBoxProps {
  onNavigate: (view: string, param?: string | number) => void;
  /** Resolves a raw query (used when Enter is pressed before a preview has loaded). */
  onSearch: (query: string) => void;
  /** Changes whenever the visible page changes; the box clears itself on change. */
  routeKey: string;
  size?: 'md' | 'sm';
  placeholder?: string;
  submitLabel?: string;
  onOpenPalette?: () => void;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  onNavigate,
  onSearch,
  routeKey,
  size = 'md',
  placeholder = 'Search by Address / Txn Hash / Block # (0x...)',
  submitLabel = 'Search',
  onOpenPalette,
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [preview, setPreview] = useState<Preview | null>(null);
  const rootRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useMemo(() => `search-results-${size}`, [size]);

  const { value: normalized, kind } = normalizeQuery(query);

  // Leaving a page (tab, link or a completed search) resets the box.
  useEffect(() => {
    setQuery('');
    setOpen(false);
    setPreview(null);
  }, [routeKey]);

  // Live on-chain preview for complete block numbers, addresses and hashes (debounced).
  useEffect(() => {
    if (!kind) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreview({ query: normalized, status: 'loading' });
    const timer = setTimeout(() => {
      resolvePreview(normalized, kind)
        .then((result) => { if (!cancelled) setPreview(result); })
        .catch(() => {
          if (cancelled) return;
          // RPC failure: block numbers and addresses are still valid routes; hashes need a lookup.
          setPreview(kind === 'hash'
            ? { query: normalized, status: 'notfound', message: 'Lookup failed. Press Enter to try again.' }
            : {
                query: normalized,
                status: 'found',
                suggestion: kind === 'block'
                  ? { key: `block:${normalized}`, icon: Box, tone: TONES.block, title: `Block #${parseInt(normalized, 10).toLocaleString()}`, subtitle: 'Preview unavailable', view: 'block-detail', param: parseInt(normalized, 10) }
                  : { key: `address:${normalized}`, icon: Wallet, tone: TONES.wallet, title: findIndexEntry(normalized)?.name || 'Address', subtitle: `${short(normalized, 8, 6)} · Preview unavailable`, view: 'address-detail', param: normalized },
              });
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalized, kind]);

  // Close when tapping or clicking outside.
  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointer);
    return () => document.removeEventListener('pointerdown', handlePointer);
  }, [open]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const list: Suggestion[] = [];
    const q = query.trim().toLowerCase();
    if (!q) return list;

    if (preview?.status === 'found' && preview.suggestion && preview.query === normalized) {
      list.push(preview.suggestion);
    }
    if (kind) return list;

    const isHexPrefix = /^0x[0-9a-f]{2,}$/.test(q);
    if (q.length >= 2) {
      const matches = SEARCH_INDEX.filter((e) =>
        isHexPrefix
          ? e.address.toLowerCase().startsWith(q)
          : e.name.toLowerCase().includes(q) || (e.symbol || '').toLowerCase().includes(q)
      ).slice(0, 6);
      for (const e of matches) {
        list.push({
          key: `entry:${e.address.toLowerCase()}`,
          icon: e.icon,
          tone: e.tone,
          title: e.symbol && !e.name.toLowerCase().includes(e.symbol.toLowerCase()) ? `${e.name} (${e.symbol})` : e.name,
          subtitle: short(e.address, 8, 6),
          badge: e.kind,
          view: e.kind === 'BTS-20 Token' ? 'token-detail' : 'address-detail',
          param: e.address,
        });
      }
    }

    if (!isHexPrefix && !q.startsWith('0x')) {
      PAGES.filter((p) => p.label.toLowerCase().includes(q) || p.keywords.includes(q))
        .slice(0, 3)
        .forEach((p) => list.push({
          key: `page:${p.view}`,
          icon: p.icon,
          tone: TONES.page,
          title: p.label,
          subtitle: 'Go to page',
          view: p.view,
        }));
    }
    return list;
  }, [query, normalized, kind, preview]);

  useEffect(() => {
    setActiveIndex(suggestions.length > 0 ? 0 : -1);
  }, [suggestions.length, normalized]);

  const reset = () => {
    setQuery('');
    setOpen(false);
    setPreview(null);
    inputRef.current?.blur();
  };

  const select = (s: Suggestion) => {
    onNavigate(s.view, s.param);
    reset();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const active = suggestions[activeIndex];
    if (active) return select(active);
    if (kind === 'block') return select({ key: 'b', icon: Box, tone: '', title: '', view: 'block-detail', param: parseInt(normalized, 10) });
    if (kind === 'address') return select({ key: 'a', icon: Wallet, tone: '', title: '', view: 'address-detail', param: normalized });
    if (kind === 'hash' && preview?.status === 'loading') {
      onSearch(normalized);
      reset();
      return;
    }
    if (kind === 'hash' && preview?.status === 'notfound') {
      // Retry the lookup
      setPreview({ query: normalized, status: 'loading' });
      resolvePreview(normalized, 'hash').then(setPreview).catch(() => setPreview({ query: normalized, status: 'notfound', message: 'Lookup failed. Check your connection and try again.' }));
    }
    setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Escape') {
      if (open) {
        e.stopPropagation();
        setOpen(false);
      } else {
        reset();
      }
    }
  };

  const showPanel = open && query.trim().length > 0;
  const isLoading = preview?.status === 'loading' && preview.query === normalized;
  const notFound = preview?.status === 'notfound' && preview.query === normalized ? preview.message : null;
  const md = size === 'md';

  return (
    <form ref={rootRef} onSubmit={handleSubmit} role="search" className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Search by address, transaction hash or block number"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showPanel && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        className={`w-full pl-9 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-petrol rounded-xl font-mono font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-sans placeholder:font-medium focus:outline-none focus:ring-2 focus:ring-petrol/20 transition-all [&::-webkit-search-cancel-button]:hidden ${
          md ? 'pr-28 py-1.5 xl:py-2 text-xs xl:text-sm' : 'pr-[5.5rem] py-2 text-sm'
        }`}
      />

      <div className="absolute inset-y-1 right-1 flex items-center gap-1">
        {query ? (
          <button
            type="button"
            onClick={() => { setQuery(''); setPreview(null); inputRef.current?.focus(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : onOpenPalette ? (
          <button
            type="button"
            onClick={onOpenPalette}
            className="hidden xl:inline-flex px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-[10px] font-mono font-bold text-slate-600 transition-colors cursor-pointer"
            title="Command Palette (⌘K)"
          >
            ⌘K
          </button>
        ) : null}
        <button
          type="submit"
          className="h-full px-3 bg-petrol hover:bg-[#015661] text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer"
        >
          {submitLabel}
        </button>
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[60] bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-900/10 overflow-hidden animate-fade-in">
          <ul id={listId} role="listbox" className="max-h-[min(65vh,26rem)] overflow-y-auto overscroll-contain p-1.5">
            {suggestions.map((s, i) => {
              const Icon = s.icon;
              const active = i === activeIndex;
              return (
                <li key={s.key} id={`${listId}-${i}`} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => select(s)}
                    className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center gap-3 cursor-pointer transition-colors ${
                      active ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${s.tone}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-bold text-slate-900 truncate">{s.title}</span>
                        {s.badge && (
                          <span className="shrink-0 px-1.5 py-px rounded-md bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600">
                            {s.badge}
                          </span>
                        )}
                      </span>
                      {s.subtitle && (
                        <span className="block text-xs text-slate-500 font-mono truncate mt-0.5">{s.subtitle}</span>
                      )}
                    </span>
                    {s.meta && (
                      <span className="shrink-0 text-xs font-mono font-bold text-slate-800 text-right max-w-[40%] truncate">
                        {s.meta}
                      </span>
                    )}
                    {active && <CornerDownLeft className="hidden sm:block w-3.5 h-3.5 text-slate-400 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>

          {isLoading && (
            <div className="px-4 py-3 flex items-center gap-2 text-xs text-slate-500 border-t border-slate-100 first:border-t-0">
              <Loader2 className="w-4 h-4 animate-spin text-petrol" />
              <span>
                {kind === 'block' ? `Looking up block #${parseInt(normalized, 10).toLocaleString()}…`
                  : kind === 'address' ? 'Loading address balance…' : 'Looking up transaction…'}
              </span>
            </div>
          )}

          {notFound && (
            <div className="px-4 py-3 flex items-start gap-2 text-xs text-slate-600 border-t border-slate-100">
              <SearchX className="w-4 h-4 text-slate-400 shrink-0 mt-px" />
              <span>{notFound}</span>
            </div>
          )}

          {!kind && suggestions.length === 0 && (
            <div className="px-4 py-3 flex items-start gap-2 text-xs text-slate-600">
              <SearchX className="w-4 h-4 text-slate-400 shrink-0 mt-px" />
              <span>
                No matches. Enter a block number, a transaction hash (0x + 64 hex) or an address (0x + 40 hex).
              </span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
            <span><kbd className="font-mono font-bold text-slate-500">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono font-bold text-slate-500">Enter</kbd> open</span>
            <span><kbd className="font-mono font-bold text-slate-500">Esc</kbd> close</span>
          </div>
        </div>
      )}
    </form>
  );
};
