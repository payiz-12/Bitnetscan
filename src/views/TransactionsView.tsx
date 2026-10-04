import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, ArrowRightLeft, Search, RefreshCw, ChevronLeft, ChevronRight, 
  Copy, Check, Clock, ShieldCheck, Flame, Filter, ExternalLink, Sparkles,
  Layers, Landmark, ArrowUpRight, CheckCircle2, FileCode
} from 'lucide-react';
import { AddressTransaction, explorerApiService } from '../services/explorerApi';

interface TransactionsViewProps {
  onBack: () => void;
  onSelectTx: (txHash: string) => void;
  onSelectBlock: (blockNumber: number) => void;
  onSelectAddress: (address: string) => void;
  initialSort?: 'latest' | 'oldest';
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  onBack,
  onSelectTx,
  onSelectBlock,
  onSelectAddress,
  initialSort = 'latest',
}) => {
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>(initialSort);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const pageSize = 25;

  const { transactions, total, totalPages } = useMemo(() => {
    return explorerApiService.getLedgerTransactions({
      sort: sortOrder,
      query: searchQuery,
      page: currentPage,
      pageSize,
    });
    // refreshTrigger is used to force re-render when refreshed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOrder, searchQuery, currentPage, refreshTrigger]);

  // Fetch live network transactions on mount and auto-refresh every 2.5 seconds
  useEffect(() => {
    explorerApiService.fetchLiveLedgerTransactions().then(() => {
      setRefreshTrigger((prev) => prev + 1);
    });
    const interval = setInterval(() => {
      explorerApiService.fetchLiveLedgerTransactions().then(() => {
        setRefreshTrigger((prev) => prev + 1);
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Reset page to 1 when search or sort order changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortOrder, searchQuery]);

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleRefresh = async () => {
    await explorerApiService.fetchLiveLedgerTransactions();
    setRefreshTrigger((prev) => prev + 1);
  };

  const formatTimestamp = (sec: number) => {
    try {
      return new Date(sec * 1000).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return `${sec}`;
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = Math.max(0, now - timestamp);
    if (diff < 5) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    const days = Math.floor(diff / 86400);
    if (days < 365) return `${days}d ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  const truncate = (str: string, lead = 8, trail = 6) => {
    if (!str || str.length <= lead + trail) return str;
    return `${str.slice(0, lead)}...${str.slice(-trail)}`;
  };

  return (
    <div className="space-y-6 w-full animate-fade-in pb-16">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all shadow-2xs cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
            <span>Home</span>
          </button>
          <div className="h-4 w-px bg-slate-300 hidden sm:block" />
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Bitnet Blockchain Transactions</span>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-teal-50 text-[#016976] border border-teal-200/80">
                {total.toLocaleString()} Indexed Transactions
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Live on-chain transactions and recent blocks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all shadow-2xs cursor-pointer"
            title="Refresh Transactions"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Genesis & Network Highlights Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-teal-900 via-slate-900 to-[#014E58] rounded-2xl p-4 text-white shadow-sm flex items-center gap-3.5 border border-teal-800/40">
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/20">
            <Landmark className="w-6 h-6 text-teal-300" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-teal-200 uppercase tracking-wider block">
              Bitnet Genesis
            </span>
            <div className="text-sm font-bold font-mono text-white truncate">
              July 14, 2023 06:54 UTC
            </div>
            <div className="text-[10px] text-teal-300/80">
              Block #1 Genesis Launch
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-50 flex items-center justify-center text-[#0284C7] flex-shrink-0 border border-sky-100">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Ledger Depth
            </span>
            <div className="text-sm font-bold font-mono text-slate-900 truncate">
              Block 1 → Current Block
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Live On-Chain Ledger
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0 border border-amber-100">
            <Flame className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Average Tx Fee
            </span>
            <div className="text-sm font-bold font-mono text-slate-900 truncate">
              0.000021 BTN
            </div>
            <div className="text-[10px] text-slate-500">
              ~2 Gwei Base Gas
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Tab Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Sort Tabs: Latest vs Oldest */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setSortOrder('latest')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              sortOrder === 'latest'
                ? 'bg-white text-[#016976] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Latest Transactions</span>
          </button>

          <button
            onClick={() => setSortOrder('oldest')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              sortOrder === 'oldest'
                ? 'bg-[#016976] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Oldest Verified Transactions</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Hash, Address or Block #..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#016976] rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold px-1 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sans">
                <th className="py-3.5 px-4">Transaction Hash</th>
                <th className="py-3.5 px-4">Block</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">From</th>
                <th className="py-3.5 px-4">To</th>
                <th className="py-3.5 px-4 text-right">Value (BTN)</th>
                <th className="py-3.5 px-4 text-right">Tx Fee</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                        <ArrowRightLeft className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-700">No transactions found</p>
                      <p className="text-xs text-slate-400">Try a different search query or reset filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  return (
                    <tr
                      key={tx.hash}
                      onClick={() => onSelectTx(tx.hash)}
                      className="hover:bg-teal-50/20 transition-colors cursor-pointer group"
                    >
                      {/* Hash with copy icon */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0284C7] group-hover:underline">
                            {truncate(tx.hash, 8, 6)}
                          </span>
                          <button
                            onClick={(e) => handleCopy(tx.hash, e)}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Copy Hash"
                          >
                            {copiedText === tx.hash ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Block Number */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectBlock(tx.blockNumber);
                            }}
                            className="font-bold text-slate-800 hover:text-[#016976] hover:underline"
                          >
                            #{tx.blockNumber.toLocaleString()}
                          </span>
                        </div>
                      </td>

                      {/* Timestamp & TimeAgo */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        <div className="font-medium text-slate-700">
                          {formatTimeAgo(tx.timestamp)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {formatTimestamp(tx.timestamp)}
                        </div>
                      </td>

                      {/* From Address */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectAddress(tx.from);
                            }}
                            className="font-semibold text-slate-700 hover:text-[#016976] hover:underline"
                          >
                            {tx.from === '0x0000000000000000000000000000000000000000'
                              ? 'Null Address (0x00...)'
                              : truncate(tx.from, 6, 4)}
                          </span>
                          <button
                            onClick={(e) => handleCopy(tx.from, e)}
                            className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                            title="Copy Address"
                          >
                            {copiedText === tx.from ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* To Address */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          {tx.to ? (
                            <>
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectAddress(tx.to);
                                }}
                                className="font-semibold text-slate-700 hover:text-[#016976] hover:underline cursor-pointer"
                              >
                                {truncate(tx.to, 6, 4)}
                              </span>
                              <button
                                onClick={(e) => handleCopy(tx.to, e)}
                                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                title="Copy Address"
                              >
                                {copiedText === tx.to ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-[#D97706] border border-amber-200">
                              <FileCode className="w-3 h-3 text-[#D97706]" />
                              <span>Contract Creation</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Value in BTN */}
                      <td className="py-3.5 px-4 font-mono font-bold text-right text-slate-900 whitespace-nowrap">
                        <span
                          className="text-emerald-700"
                          title={tx.valueWei ? `${tx.value} (${tx.valueWei} Wei)` : tx.value}
                        >
                          {tx.valueNum > 0 && tx.valueNum < 0.0001
                            ? '< 0.0001 BTN'
                            : `${tx.valueNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} BTN`}
                        </span>
                      </td>

                      {/* Fee */}
                      <td className="py-3.5 px-4 font-mono text-right text-slate-500 whitespace-nowrap">
                        {tx.fee}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {tx.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Success</span>
                          </span>
                        ) : tx.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                            <span>Pending</span>
                          </span>
                        ) : tx.status === 'failed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span>Failed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <span>Unknown</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div>
            Showing transactions <span className="font-bold text-slate-900">{total > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(total, currentPage * pageSize)}</span> of <span className="font-bold text-slate-900">{total.toLocaleString()}</span> (Page {currentPage} of {totalPages})
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCurrentPage(1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage <= 1}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-all cursor-pointer"
            >
              First
            </button>

            <button
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="px-3 py-1.5 bg-[#016976] text-white font-bold rounded-lg shadow-2xs">
              {currentPage}
            </span>

            <button
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-all cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setCurrentPage(totalPages);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-all cursor-pointer"
            >
              Last
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
