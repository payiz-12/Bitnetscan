import React, { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { DashboardView } from './views/DashboardView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Analytics } from '@vercel/analytics/react';
import { WatchToasts } from './components/WatchToasts';
import { startWatchlistMonitor } from './services/watchlist';

// Secondary pages load on first visit so the dashboard bundle stays small.
const BlockDetailView = lazy(() => import('./views/BlockDetailView').then((m) => ({ default: m.BlockDetailView })));
const BlocksView = lazy(() => import('./views/BlocksView').then((m) => ({ default: m.BlocksView })));
const TransactionsView = lazy(() => import('./views/TransactionsView').then((m) => ({ default: m.TransactionsView })));
const TxDetailView = lazy(() => import('./views/TxDetailView').then((m) => ({ default: m.TxDetailView })));
const AddressDetailView = lazy(() => import('./views/AddressDetailView').then((m) => ({ default: m.AddressDetailView })));
const TokensView = lazy(() => import('./views/TokensView').then((m) => ({ default: m.TokensView })));
const NftsView = lazy(() => import('./views/NftsView').then((m) => ({ default: m.NftsView })));
const MiningView = lazy(() => import('./views/MiningView').then((m) => ({ default: m.MiningView })));
const ConsoleView = lazy(() => import('./views/ConsoleView').then((m) => ({ default: m.ConsoleView })));
const NetworkView = lazy(() => import('./views/NetworkView').then((m) => ({ default: m.NetworkView })));
const RichListView = lazy(() => import('./views/RichListView').then((m) => ({ default: m.RichListView })));
const ContractsView = lazy(() => import('./views/ContractsView').then((m) => ({ default: m.ContractsView })));
const ChartsView = lazy(() => import('./views/ChartsView').then((m) => ({ default: m.ChartsView })));
const UnclesView = lazy(() => import('./views/UnclesView').then((m) => ({ default: m.UnclesView })));
const SupplyView = lazy(() => import('./views/SupplyView').then((m) => ({ default: m.SupplyView })));
const SecurityView = lazy(() => import('./views/SecurityView').then((m) => ({ default: m.SecurityView })));
const ToolsView = lazy(() => import('./views/ToolsView').then((m) => ({ default: m.ToolsView })));
const ApiView = lazy(() => import('./views/ApiView').then((m) => ({ default: m.ApiView })));
const WatchlistView = lazy(() => import('./views/WatchlistView').then((m) => ({ default: m.WatchlistView })));

const PageFallback: React.FC = () => (
  <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500" role="status">
    <div className="w-8 h-8 rounded-full border-2 border-petrol border-t-transparent animate-spin" />
    <span className="text-xs font-semibold">Loading…</span>
  </div>
);
import { Block, NetworkStats, Transaction } from './types/blockchain';
import { rpcService } from './services/rpc';
import { explorerApiService } from './services/explorerApi';
import { isPageHidden, onPageVisible } from './services/pageVisibility';

// EIP-3091 explorer links (/tx/<hash>, /address/<address>, /block/<number|hash>, /token/<address>)
// arrive as paths, e.g. from wallets and chain registries. The app routes with hashes, so translate
// such a path once on load.
const translateEip3091Path = () => {
  if (typeof window === 'undefined') return;
  const match = window.location.pathname.match(/^\/(tx|address|block|token)\/([^/?#]+)\/?$/i);
  if (!match) return;
  const kind = match[1].toLowerCase();
  window.history.replaceState(null, '', `/#/${kind === 'token' ? 'address' : kind}/${match[2]}`);
};
translateEip3091Path();

// URL hash route parser for browser history & back/forward support
const parseHash = (): { view: string; param?: string | number } => {
  if (typeof window === 'undefined') return { view: 'dashboard' };
  const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
  if (!rawHash) {
    return { view: 'dashboard' };
  }
  const parts = rawHash.split('/');
  const route = parts[0].toLowerCase();
  const param = parts.slice(1).join('/');

  if ((route === 'block' || route === 'blocks') && param) {
    return { view: 'block-detail', param: /^\d+$/.test(param) ? parseInt(param, 10) : param };
  }
  if ((route === 'tx' || route === 'txs' || route === 'transaction' || route === 'transactions') && param) {
    return { view: 'tx-detail', param };
  }
  if ((route === 'address' || route === 'wallet') && param) {
    return { view: 'address-detail', param };
  }
  if (route === 'blocks') return { view: 'blocks' };
  if (route === 'transactions' || route === 'txs') return { view: 'transactions' };
  if (route === 'rich-list' || route === 'richlist') return { view: 'rich-list' };
  if (route === 'tokens' || route === 'token') return { view: 'tokens' };
  if (route === 'nfts' || route === 'nft') return { view: 'nfts' };
  if (route === 'contracts' || route === 'contract') return { view: 'contracts' };
  if (route === 'mining' || route === 'miner') return { view: 'mining' };
  if (route === 'console') return { view: 'console' };
  if (route === 'charts' || route === 'stats') return { view: 'charts' };
  if (route === 'uncles' || route === 'uncle') return { view: 'uncles' };
  if (route === 'supply' || route === 'market') return { view: 'supply' };
  if (route === 'security' || route === 'decentralization') return { view: 'security' };
  if (route === 'tools' || route === 'developer-tools') return { view: 'tools' };
  if (route === 'api' || route === 'docs') return { view: 'api' };
  if (route === 'watchlist' || route === 'watch') return { view: 'watchlist' };
  if (route === 'nodes' || route === 'network' || route === 'rpc' || route === 'rpc-status') return { view: 'nodes' };

  return { view: 'dashboard' };
};

const getHashForView = (view: string, param?: string | number): string => {
  if (view === 'dashboard') return '#/';
  if (view === 'block-detail' && param !== undefined) return `#/block/${param}`;
  if (view === 'tx-detail' && param) return `#/tx/${param}`;
  if (view === 'address-detail' && param) return `#/address/${param}`;
  if (view === 'transactions') return '#/transactions';
  return `#/${view}`;
};

export const App: React.FC = () => {
  const initialRoute = parseHash();
  const [currentView, setCurrentView] = useState<string>(initialRoute.view);
  const [selectedBlock, setSelectedBlock] = useState<number | string>(
    initialRoute.view === 'block-detail' && initialRoute.param !== undefined ? initialRoute.param : 0
  );
  const [selectedTx, setSelectedTx] = useState<string>(
    initialRoute.view === 'tx-detail' && initialRoute.param ? String(initialRoute.param) : ''
  );
  const [selectedAddress, setSelectedAddress] = useState<string>(
    initialRoute.view === 'address-detail' && initialRoute.param ? String(initialRoute.param) : ''
  );

  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [recentBlocks, setRecentBlocks] = useState<Block[]>([]);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentSeconds, setCurrentSeconds] = useState<number>(Math.floor(Date.now() / 1000));

  const latestKnownBlockRef = React.useRef<number>(0);
  const isPollingRef = React.useRef<boolean>(false);
  const refreshingRef = React.useRef(false);

  // 1-second clock for the dashboard's "time ago" labels. It re-renders the app, so it only
  // runs while the dashboard is shown and the tab is visible.
  // Watchlist checks run for the whole session, on every page.
  useEffect(() => { startWatchlistMonitor(); }, []);

  useEffect(() => {
    if (currentView !== 'dashboard') return;
    setCurrentSeconds(Math.floor(Date.now() / 1000));
    const clock = setInterval(() => {
      if (!isPageHidden()) setCurrentSeconds(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(clock);
  }, [currentView]);

  // Fetch latest blocks, transactions, and stats
  const refreshData = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const [netStats, blocks, liveLedgerTxs, dailyTxCount] = await Promise.all([
        rpcService.getNetworkStats().catch(() => null),
        rpcService.getRecentBlocks(15).catch(() => []),
        explorerApiService.fetchLiveLedgerTransactions().catch(() => []),
        explorerApiService.getDailyTransactionsCount().catch(() => null),
      ]);

      if (netStats) {
        netStats.transactionsToday = dailyTxCount;
        setStats(netStats);
      }
      // Collect all transactions from these blocks
      const rpcTxs: Transaction[] = [];
      if (blocks.length > 0) {
        setRecentBlocks(blocks);
        latestKnownBlockRef.current = Math.max(latestKnownBlockRef.current, blocks[0].number);

        for (const blk of blocks) {
          if (Array.isArray(blk.transactions)) {
            for (const tx of blk.transactions) {
              if (typeof tx === 'object' && tx.hash) {
                rpcTxs.push(tx as Transaction);
              }
            }
          }
        }

        if (rpcTxs.length > 0) {
          explorerApiService.registerLiveTransactions(rpcTxs);
        }
      }

      // Merge transactions from the latest blocks and the indexer's newest page
      setRecentTxs((prev) => {
        const seen = new Set<string>();
        const ledgerConverted: Transaction[] = (liveLedgerTxs || []).map((t) => ({
          hash: t.hash,
          blockHash: '',
          blockNumber: t.blockNumber,
          from: t.from,
          to: t.to,
          value: t.value,
          valueWei: t.valueWei,
          timestamp: t.timestamp,
          status: t.status === 'success' ? 1 : t.status === 'failed' ? 0 : undefined,
          fee: t.fee,
        }));

        const combined = [...rpcTxs, ...ledgerConverted, ...prev].filter((t) => {
          if (!t || !t.hash) return false;
          const h = t.hash.toLowerCase();
          if (seen.has(h)) return false;
          seen.add(h);
          return true;
        });

        combined.sort((a, b) => ((b.blockNumber || 0) - (a.blockNumber || 0)) || ((b.timestamp || 0) - (a.timestamp || 0)));
        return combined.slice(0, 20);
      });
    } catch (err) {
      console.error('Error refreshing blockchain data:', err);
    } finally {
      refreshingRef.current = false;
      setLoading(false);
    }
  }, []);

  // Initial full load. New blocks trigger refreshes; this interval is only a safety net
  // (e.g. gas price or indexer changes without a new block). Paused in background tabs.
  useEffect(() => {
    refreshData();
    const interval = setInterval(() => {
      if (!isPageHidden()) refreshData();
    }, 30000);
    const stopVisible = onPageVisible(refreshData);
    return () => {
      clearInterval(interval);
      stopVisible();
    };
  }, [refreshData]);

  // Poll for newly mined blocks every 3 seconds
  useEffect(() => {
    let isMounted = true;

    const fastPoll = async () => {
      if (isPollingRef.current || isPageHidden()) return;
      isPollingRef.current = true;
      try {
        const latestNum = await rpcService.getBlockNumber();
        if (isMounted && latestNum > latestKnownBlockRef.current) {
          latestKnownBlockRef.current = latestNum;
          // Immediately fetch the newly mined block
          const newBlock = await rpcService.getBlock(latestNum, true);
          if (isMounted && newBlock) {
            setRecentBlocks((prev) => {
              if (prev.some((b) => b.number === newBlock.number)) return prev;
              return [newBlock, ...prev.slice(0, 19)];
            });

            // Extract transactions if any
            if (Array.isArray(newBlock.transactions) && newBlock.transactions.length > 0) {
              const txs = newBlock.transactions.filter(
                (t): t is Transaction => typeof t === 'object' && !!t.hash
              );
              if (txs.length > 0) {
                setRecentTxs((prev) => {
                  const seen = new Set<string>();
                  const merged = [...txs, ...prev].filter((t) => {
                    const h = t.hash.toLowerCase();
                    if (seen.has(h)) return false;
                    seen.add(h);
                    return true;
                  });
                  return merged.slice(0, 20);
                });
                explorerApiService.registerLiveTransactions(txs);
              }
            }

            setStats((prev) =>
              prev ? { ...prev, latestBlock: latestNum } : prev
            );

            // Instant data refresh cascade across ledger indexer & stats
            refreshData();
          }
        }
      } catch {
        // Silently tolerate single network hiccups during block polling
      } finally {
        isPollingRef.current = false;
      }
    };

    const poller = setInterval(fastPoll, 3000);
    return () => {
      isMounted = false;
      clearInterval(poller);
    };
  }, [refreshData]);

  const navigateTo = useCallback((view: string, param?: string | number, replace: boolean = false) => {
    setCurrentView(view);
    if (view === 'block-detail' && param !== undefined) setSelectedBlock(param);
    if (view === 'tx-detail' && param !== undefined) setSelectedTx(String(param));
    if (view === 'address-detail' && param !== undefined) setSelectedAddress(String(param));

    const newHash = getHashForView(view, param);
    if (window.location.hash !== newHash) {
      if (replace) {
        window.history.replaceState({ view, param }, '', newHash);
      } else {
        window.history.pushState({ view, param }, '', newHash);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigateTo('dashboard', undefined, true);
    }
  }, [navigateTo]);

  // Synchronize browser history (Back / Forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseHash();
      setCurrentView(parsed.view);
      if (parsed.view === 'block-detail' && parsed.param !== undefined) {
        setSelectedBlock(parsed.param);
      } else if (parsed.view === 'tx-detail' && parsed.param) {
        setSelectedTx(String(parsed.param));
      } else if (parsed.view === 'address-detail' && parsed.param) {
        setSelectedAddress(String(parsed.param));
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);

    // Normalize initial URL if empty
    if (!window.location.hash) {
      window.history.replaceState({ view: 'dashboard' }, '', '#/');
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // Universal omni-search handler
  const handleSearch = async (query: string) => {
    const clean = query.trim();
    if (!clean) return;

    // Check if numeric (Block number)
    if (/^\d+$/.test(clean)) {
      navigateTo('block-detail', parseInt(clean, 10));
      return;
    }

    // Check if Ethereum Address (42 chars, starts with 0x)
    if (/^0x[a-fA-F0-9]{40}$/.test(clean)) {
      navigateTo('address-detail', clean);
      return;
    }

    // Check if 32-byte Hash (66 chars, starts with 0x) -> can be Tx hash or Block hash
    if (/^0x[a-fA-F0-9]{64}$/.test(clean)) {
      try {
        // Try tx first
        const tx = await rpcService.getTransaction(clean);
        if (tx) {
          navigateTo('tx-detail', clean);
          return;
        }

        // Try block hash
        const blk = await rpcService.getBlock(clean, false);
        if (blk) {
          navigateTo('block-detail', clean);
          return;
        }

        alert('No block or transaction with this hash was found on Bitnet.');
      } catch {
        // Default to tx view
        navigateTo('tx-detail', clean);
      }
      return;
    }

    alert('Invalid search format. Enter a block number, transaction hash (0x...), or wallet address (0x...).');
  };

  const handleSelectBlock = (numOrHash: number | string) => {
    navigateTo('block-detail', numOrHash);
  };

  const handleSelectTx = (hash: string) => {
    navigateTo('tx-detail', hash);
  };

  const handleSelectAddress = (addr: string) => {
    navigateTo('address-detail', addr);
  };

  const routeKey =
    currentView === 'block-detail' ? `block:${selectedBlock}`
    : currentView === 'tx-detail' ? `tx:${selectedTx}`
    : currentView === 'address-detail' ? `address:${selectedAddress}`
    : currentView;

  // Vercel Web Analytics: pages live in the URL hash, so each view is reported as its own path.
  const [analyticsRoute, analyticsPath] =
    currentView === 'dashboard' ? ['/', '/']
    : currentView === 'block-detail' ? ['/block/[id]', `/block/${selectedBlock}`]
    : currentView === 'tx-detail' ? ['/tx/[hash]', `/tx/${selectedTx}`]
    : currentView === 'address-detail' ? ['/address/[address]', `/address/${selectedAddress}`]
    : [`/${currentView}`, `/${currentView}`];

  return (
    <div className="min-h-screen flex flex-col bg-canvas-warm text-slate-900 font-sans selection:bg-petrol-100 selection:text-petrol-800">
      <Header
        currentView={currentView}
        routeKey={routeKey}
        onNavigate={(view, param) => navigateTo(view, param)}
        stats={stats}
        onSearch={handleSearch}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        {/* Keyed by route so an error on one page does not block navigating to another */}
        <ErrorBoundary key={routeKey} fallbackTitle="An error occurred while loading this page">
          <Suspense fallback={<PageFallback />}>
          {currentView === 'dashboard' && (
            <DashboardView
              stats={stats}
              recentBlocks={recentBlocks}
              recentTxs={recentTxs}
              loading={loading}
              currentSeconds={currentSeconds}
              onSelectBlock={handleSelectBlock}
              onSelectTx={handleSelectTx}
              onSelectAddress={handleSelectAddress}
              onRefresh={refreshData}
              onViewRichList={() => navigateTo('rich-list')}
              onViewAllBlocks={() => navigateTo('blocks')}
              onViewAllTransactions={() => navigateTo('transactions')}
            />
          )}

          {currentView === 'blocks' && (
            <BlocksView
              latestBlockNumber={stats?.latestBlock || 0}
              onBack={handleBack}
              onSelectBlock={handleSelectBlock}
              onSelectAddress={handleSelectAddress}
              onViewUncles={() => navigateTo('uncles')}
            />
          )}

          {currentView === 'transactions' && (
            <TransactionsView
              onBack={handleBack}
              onSelectTx={handleSelectTx}
              onSelectBlock={handleSelectBlock}
              onSelectAddress={handleSelectAddress}
            />
          )}

          {currentView === 'block-detail' && (
            <BlockDetailView
              blockNumberOrHash={selectedBlock}
              onBack={handleBack}
              onSelectBlock={handleSelectBlock}
              onSelectTx={handleSelectTx}
              onSelectAddress={handleSelectAddress}
            />
          )}

          {currentView === 'tx-detail' && (
            <TxDetailView
              txHash={selectedTx}
              onBack={handleBack}
              onSelectBlock={handleSelectBlock}
              onSelectAddress={handleSelectAddress}
              onNavigate={(view) => navigateTo(view)}
            />
          )}

          {currentView === 'address-detail' && (
            <AddressDetailView
              address={selectedAddress}
              recentBlocks={recentBlocks}
              onBack={handleBack}
              onSelectTx={handleSelectTx}
              onSelectBlock={handleSelectBlock}
              onSelectAddress={handleSelectAddress}
              onNavigate={(view) => navigateTo(view)}
            />
          )}

          {currentView === 'rich-list' && (
            <RichListView
              onSelectAddress={handleSelectAddress}
              latestBlock={stats?.latestBlock || 0}
              onBack={handleBack}
            />
          )}

          {currentView === 'tokens' && (
            <TokensView onSelectAddress={handleSelectAddress} />
          )}

          {currentView === 'nfts' && (
            <NftsView 
              onSelectAddress={handleSelectAddress} 
              onSelectTx={handleSelectTx}
            />
          )}

          {currentView === 'contracts' && (
            <ContractsView
              onSelectAddress={handleSelectAddress}
              onBack={handleBack}
            />
          )}

          {currentView === 'mining' && (
            <MiningView
              stats={stats}
              recentBlocks={recentBlocks}
              onSelectAddress={handleSelectAddress}
            />
          )}

          {currentView === 'console' && (
            <ConsoleView />
          )}

          {currentView === 'nodes' && (
            <NetworkView stats={stats} />
          )}

          {currentView === 'charts' && (
            <ChartsView onNavigate={(view) => navigateTo(view)} />
          )}

          {currentView === 'uncles' && (
            <UnclesView
              onSelectBlock={handleSelectBlock}
              onSelectAddress={handleSelectAddress}
              onNavigate={(view) => navigateTo(view)}
            />
          )}

          {currentView === 'api' && <ApiView />}

          {currentView === 'watchlist' && (
            <WatchlistView onSelectAddress={handleSelectAddress} onSelectBlock={handleSelectBlock} />
          )}

          {currentView === 'tools' && (
            <ToolsView onSelectBlock={handleSelectBlock} onSelectAddress={handleSelectAddress} />
          )}

          {currentView === 'security' && (
            <SecurityView
              onSelectAddress={handleSelectAddress}
              onSelectBlock={handleSelectBlock}
              onNavigate={(view) => navigateTo(view)}
            />
          )}

          {currentView === 'supply' && (
            <SupplyView stats={stats} onNavigate={(view) => navigateTo(view)} />
          )}
          </Suspense>
        </ErrorBoundary>
      </main>

      <Footer latestBlock={recentBlocks[0]} />
      <WatchToasts onSelectAddress={handleSelectAddress} />
      <Analytics route={analyticsRoute} path={analyticsPath} />
    </div>
  );
};

export default App;
