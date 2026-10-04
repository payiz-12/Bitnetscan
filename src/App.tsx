import React, { useEffect, useState, useCallback } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { DashboardView } from './views/DashboardView';
import { BlockDetailView } from './views/BlockDetailView';
import { BlocksView } from './views/BlocksView';
import { TransactionsView } from './views/TransactionsView';
import { TxDetailView } from './views/TxDetailView';
import { AddressDetailView } from './views/AddressDetailView';
import { TokensView } from './views/TokensView';
import { NftsView } from './views/NftsView';
import { MiningView } from './views/MiningView';
import { ConsoleView } from './views/ConsoleView';
import { RpcStatusView } from './views/RpcStatusView';
import { RichListView } from './views/RichListView';
import { ContractsView } from './views/ContractsView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Block, NetworkStats, Transaction } from './types/blockchain';
import { rpcService } from './services/rpc';
import { explorerApiService } from './services/explorerApi';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedBlock, setSelectedBlock] = useState<number | string>(0);
  const [selectedTx, setSelectedTx] = useState<string>('');
  const [selectedAddress, setSelectedAddress] = useState<string>('');

  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [recentBlocks, setRecentBlocks] = useState<Block[]>([]);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentSeconds, setCurrentSeconds] = useState<number>(Math.floor(Date.now() / 1000));

  const latestKnownBlockRef = React.useRef<number>(0);
  const isPollingRef = React.useRef<boolean>(false);

  // 1-second live clock ticker so block timeagos change dynamically every second
  useEffect(() => {
    const clock = setInterval(() => {
      setCurrentSeconds(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(clock);
  }, []);

  // Fetch latest blocks, transactions, and stats
  const refreshData = useCallback(async () => {
    try {
      const [netStats, blocks, liveLedgerTxs] = await Promise.all([
        rpcService.getNetworkStats().catch(() => null),
        rpcService.getRecentBlocks(15).catch(() => []),
        explorerApiService.fetchLiveLedgerTransactions().catch(() => []),
      ]);

      if (netStats) setStats(netStats);
      if (blocks.length > 0) {
        setRecentBlocks(blocks);
        latestKnownBlockRef.current = Math.max(latestKnownBlockRef.current, blocks[0].number);

        // Collect all transactions from these blocks
        const rpcTxs: Transaction[] = [];
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

      // Merge and sort real transactions from both live blocks and ledger indexer!
      setRecentTxs((prev) => {
        const seen = new Set<string>();
        const ledgerConverted: Transaction[] = (liveLedgerTxs || []).map((t) => ({
          hash: t.hash,
          blockHash: '',
          blockNumber: t.blockNumber,
          from: t.from,
          to: t.to,
          value: t.valueNum.toString(),
          timestamp: t.timestamp,
          status: t.status === 'success' ? 1 : 0,
          gasPrice: '2',
          fee: t.fee,
        }));

        const combined = [...prev, ...ledgerConverted].filter((t) => {
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
      setLoading(false);
    }
  }, []);

  // Initial full load + general stats refresh every 2.5 seconds (ultra-fast live refresh)
  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 2500);
    return () => clearInterval(interval);
  }, [refreshData]);

  // 150ms ultra-fast block detection interval (new block mined detection)
  useEffect(() => {
    let isMounted = true;

    const fastPoll = async () => {
      if (isPollingRef.current) return;
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
        // Silently tolerate single network hiccups during 150ms polling
      } finally {
        isPollingRef.current = false;
      }
    };

    const poller = setInterval(fastPoll, 150);
    return () => {
      isMounted = false;
      clearInterval(poller);
    };
  }, [refreshData]);

  // Universal omni-search handler
  const handleSearch = async (query: string) => {
    const clean = query.trim();
    if (!clean) return;

    // Check if numeric (Block number)
    if (/^\d+$/.test(clean)) {
      setSelectedBlock(parseInt(clean, 10));
      setCurrentView('block-detail');
      return;
    }

    // Check if Ethereum Address (42 chars, starts with 0x)
    if (/^0x[a-fA-F0-9]{40}$/.test(clean)) {
      setSelectedAddress(clean);
      setCurrentView('address-detail');
      return;
    }

    // Check if 32-byte Hash (66 chars, starts with 0x) -> can be Tx hash or Block hash
    if (/^0x[a-fA-F0-9]{64}$/.test(clean)) {
      try {
        // Try tx first
        const tx = await rpcService.getTransaction(clean);
        if (tx) {
          setSelectedTx(clean);
          setCurrentView('tx-detail');
          return;
        }

        // Try block hash
        const blk = await rpcService.getBlock(clean, false);
        if (blk) {
          setSelectedBlock(clean);
          setCurrentView('block-detail');
          return;
        }

        alert('No block or transaction with this hash was found on Bitnet.');
      } catch {
        // Default to tx view
        setSelectedTx(clean);
        setCurrentView('tx-detail');
      }
      return;
    }

    alert('Invalid search format. Enter a block number, transaction hash (0x...), or wallet address (0x...).');
  };

  const handleSelectBlock = (numOrHash: number | string) => {
    setSelectedBlock(numOrHash);
    setCurrentView('block-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectTx = (hash: string) => {
    setSelectedTx(hash);
    setCurrentView('tx-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectAddress = (addr: string) => {
    setSelectedAddress(addr);
    setCurrentView('address-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas-warm text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900">
      <Header
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        stats={stats}
        onSearch={handleSearch}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorBoundary fallbackTitle="An error occurred while loading this page">
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
              onViewRichList={() => {
                setCurrentView('rich-list');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onViewAllBlocks={() => {
                setCurrentView('blocks');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onViewAllTransactions={() => {
                setCurrentView('transactions');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {currentView === 'blocks' && (
            <BlocksView
              latestBlockNumber={stats?.latestBlock || 0}
              onBack={() => {
                setCurrentView('dashboard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSelectBlock={handleSelectBlock}
              onSelectAddress={handleSelectAddress}
            />
          )}

          {currentView === 'transactions' && (
            <TransactionsView
              onBack={() => {
                setCurrentView('dashboard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSelectTx={handleSelectTx}
              onSelectBlock={handleSelectBlock}
              onSelectAddress={handleSelectAddress}
            />
          )}

          {currentView === 'block-detail' && (
            <BlockDetailView
              blockNumberOrHash={selectedBlock}
              onBack={() => setCurrentView('dashboard')}
              onSelectBlock={handleSelectBlock}
              onSelectTx={handleSelectTx}
              onSelectAddress={handleSelectAddress}
            />
          )}

          {currentView === 'tx-detail' && (
            <TxDetailView
              txHash={selectedTx}
              onBack={() => setCurrentView('dashboard')}
              onSelectBlock={handleSelectBlock}
              onSelectAddress={handleSelectAddress}
            />
          )}

          {currentView === 'address-detail' && (
            <AddressDetailView
              address={selectedAddress}
              recentBlocks={recentBlocks}
              onBack={() => setCurrentView('dashboard')}
              onSelectTx={handleSelectTx}
              onSelectBlock={handleSelectBlock}
              onSelectAddress={handleSelectAddress}
              onNavigate={(view) => {
                setCurrentView(view);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {currentView === 'rich-list' && (
            <RichListView
              onSelectAddress={handleSelectAddress}
              latestBlock={stats?.latestBlock || 0}
            />
          )}

          {currentView === 'tokens' && (
            <TokensView onSelectAddress={handleSelectAddress} />
          )}

          {currentView === 'nfts' && (
            <NftsView onSelectAddress={handleSelectAddress} />
          )}

          {currentView === 'contracts' && (
            <ContractsView
              onSelectAddress={handleSelectAddress}
              onBack={() => {
                setCurrentView('dashboard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {currentView === 'mining' && (
            <MiningView stats={stats} />
          )}

          {currentView === 'console' && (
            <ConsoleView />
          )}

          {currentView === 'nodes' && (
            <RpcStatusView />
          )}
        </ErrorBoundary>
      </main>

      <Footer />
    </div>
  );
};

export default App;
