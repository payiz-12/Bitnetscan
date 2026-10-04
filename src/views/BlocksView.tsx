import React, { useEffect, useState } from 'react';
import { 
  Box, ArrowLeft, RefreshCw, ChevronLeft, ChevronRight, Clock, 
  Copy, Check, Layers, Cpu, Flame, ExternalLink, ArrowRight
} from 'lucide-react';
import { Block } from '../types/blockchain';
import { rpcService } from '../services/rpc';

interface BlocksViewProps {
  latestBlockNumber: number;
  onBack: () => void;
  onSelectBlock: (blockNumber: number) => void;
  onSelectAddress: (address: string) => void;
}

export const BlocksView: React.FC<BlocksViewProps> = ({
  latestBlockNumber,
  onBack,
  onSelectBlock,
  onSelectAddress,
}) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentHead, setCurrentHead] = useState<number>(latestBlockNumber || 0);
  const [page, setPage] = useState<number>(1);
  const [jumpBlockInput, setJumpBlockInput] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const pageSize = 25;

  const fetchBlocks = async (startBlock: number) => {
    setLoading(true);
    try {
      let head = startBlock;
      if (!head || head === 0) {
        head = await rpcService.getBlockNumber();
        setCurrentHead(head);
      }
      const fetched = await rpcService.getBlocksRange(head, pageSize);
      setBlocks(fetched);
    } catch (err) {
      console.error('Failed to fetch blocks list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks(currentHead);
  }, [currentHead]);

  // Synchronize new mined blocks in real-time when viewing page 1
  useEffect(() => {
    if (page === 1 && latestBlockNumber > currentHead && latestBlockNumber > 0) {
      setCurrentHead(latestBlockNumber);
    }
  }, [latestBlockNumber, page, currentHead]);

  const handleNextPage = () => {
    if (blocks.length === 0) return;
    const oldestInCurrent = blocks[blocks.length - 1].number;
    const nextStart = Math.max(0, oldestInCurrent - 1);
    setPage((prev) => prev + 1);
    setCurrentHead(nextStart);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevPage = () => {
    if (page <= 1) return;
    const newestInCurrent = blocks[0].number;
    const prevStart = newestInCurrent + pageSize;
    setPage((prev) => Math.max(1, prev - 1));
    setCurrentHead(prevStart);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRefresh = async () => {
    const latest = await rpcService.getBlockNumber();
    setPage(1);
    setCurrentHead(latest);
    fetchBlocks(latest);
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpBlockInput.trim(), 10);
    if (!isNaN(target) && target >= 0) {
      setPage(1);
      setCurrentHead(target);
      setJumpBlockInput('');
    }
  };

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const seconds = Math.max(0, now - timestamp);
    if (seconds < 2) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-xs transition-colors cursor-pointer"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Dashboard</span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-bold text-[#016976]">Blocks</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5 mt-0.5">
              <span>Bitnet L1 Blocks</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-50 text-[#016976] border border-teal-200/80">
                PoW Mainnet
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Jump to Block */}
          <form onSubmit={handleJumpSubmit} className="flex items-center">
            <input
              type="number"
              value={jumpBlockInput}
              onChange={(e) => setJumpBlockInput(e.target.value)}
              placeholder="Block Height (#)..."
              className="w-32 sm:w-36 px-3 py-1.5 bg-white border border-slate-300 rounded-l-xl text-xs font-mono font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#016976]"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-r-xl border border-l-0 border-slate-300 transition-colors cursor-pointer"
            >
              Go
            </button>
          </form>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold border border-slate-200 cursor-pointer shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#016976] ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Box className="w-3.5 h-3.5 text-[#016976]" />
            <span>Latest Block</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 font-mono">
            {blocks.length > 0 ? `#${blocks[0].number.toLocaleString()}` : 'Loading...'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Avg Block Time</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 font-mono">
            ~14.6s <span className="text-xs font-normal text-slate-400 font-sans">(Ethash PoW)</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Layers className="w-3.5 h-3.5 text-emerald-500" />
            <span>Block Reward</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-700 font-mono">
            1.0 BTN <span className="text-xs font-normal text-slate-400 font-sans">+ fees</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Cpu className="w-3.5 h-3.5 text-purple-500" />
            <span>Blocks on Page</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 font-mono">
            {blocks.length} Blocks <span className="text-xs font-normal text-slate-400 font-sans">(Page {page})</span>
          </div>
        </div>
      </div>

      {/* Blocks Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Blocks ({blocks.length > 0 ? `#${blocks[blocks.length - 1].number} - #${blocks[0].number}` : '...'})
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live on-chain block stream ordered by height descending
            </p>
          </div>

          {/* Pagination Controls in Header */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handlePrevPage}
              disabled={page <= 1 || loading}
              className={`p-2 rounded-lg border text-xs font-bold flex items-center gap-1 ${
                page <= 1 || loading
                  ? 'border-slate-200 text-slate-300 bg-slate-100/50 cursor-not-allowed'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100 bg-white cursor-pointer shadow-2xs'
              }`}
              title="Previous Page (Newer Blocks)"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Newer</span>
            </button>
            <span className="text-xs font-mono font-bold text-slate-600 px-2 py-1 bg-white border border-slate-200 rounded-lg">
              Page {page}
            </span>
            <button
              onClick={handleNextPage}
              disabled={loading || (blocks.length > 0 && blocks[blocks.length - 1].number <= 0)}
              className={`p-2 rounded-lg border text-xs font-bold flex items-center gap-1 ${
                loading
                  ? 'border-slate-200 text-slate-300 bg-slate-100/50 cursor-not-allowed'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100 bg-white cursor-pointer shadow-2xs'
              }`}
              title="Next Page (Older Blocks)"
            >
              <span className="hidden sm:inline">Older</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6">Block</th>
                <th className="py-3 px-4 sm:px-6">Age</th>
                <th className="py-3 px-4">Txn</th>
                <th className="py-3 px-4 sm:px-6">Fee Recipient</th>
                <th className="py-3 px-4 sm:px-6 text-right">Gas Used</th>
                <th className="py-3 px-4 sm:px-6 text-right">Gas Limit</th>
                <th className="py-3 px-4 sm:px-6 text-right">Reward</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 text-[#016976] animate-spin" />
                      <span className="font-semibold text-sm">Fetching blocks from Bitnet L1 RPC...</span>
                    </div>
                  </td>
                </tr>
              ) : blocks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No blocks found.
                  </td>
                </tr>
              ) : (
                blocks.map((block) => {
                  const gasPercent = block.gasLimit > 0
                    ? ((block.gasUsed / block.gasLimit) * 100).toFixed(1)
                    : '0';

                  return (
                    <tr
                      key={block.number}
                      onClick={() => onSelectBlock(block.number)}
                      className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                    >
                      {/* Block Number */}
                      <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-[#016976] group-hover:underline">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                            <Box className="w-3.5 h-3.5 text-[#016976]" />
                          </div>
                          <span>#{block.number.toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Age / Timestamp */}
                      <td className="py-3.5 px-4 sm:px-6 text-slate-500 font-mono text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formatTimeAgo(block.timestamp)}</span>
                        </div>
                      </td>

                      {/* Txns */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {block.transactions.length} txns
                        </span>
                      </td>

                      {/* Miner */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectAddress(block.miner);
                            }}
                            className="font-mono text-slate-800 hover:text-[#016976] hover:underline font-semibold"
                          >
                            {truncateAddress(block.miner)}
                          </span>
                          <button
                            onClick={(e) => copyToClipboard(block.miner, e)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            title="Copy Miner Address"
                          >
                            {copiedText === block.miner ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Gas Used & % */}
                      <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap font-mono text-xs">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-slate-700 font-semibold">
                            {block.gasUsed.toLocaleString()}
                          </span>
                          <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                parseFloat(gasPercent) > 75
                                  ? 'bg-rose-500'
                                  : parseFloat(gasPercent) > 40
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(10, parseFloat(gasPercent)))}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400">({gasPercent}%)</span>
                        </div>
                      </td>

                      {/* Gas Limit */}
                      <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap font-mono text-xs text-slate-500">
                        {block.gasLimit.toLocaleString()}
                      </td>

                      {/* Block Reward */}
                      <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          1.0 BTN
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            Page <span className="font-bold text-slate-900">{page}</span> • Showing 25 blocks per page
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={page <= 1 || loading}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 ${
                page <= 1 || loading
                  ? 'border-slate-200 text-slate-300 bg-slate-100/50 cursor-not-allowed'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100 bg-white cursor-pointer shadow-xs'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Newer Blocks</span>
            </button>
            <button
              onClick={handleNextPage}
              disabled={loading || (blocks.length > 0 && blocks[blocks.length - 1].number <= 0)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 ${
                loading
                  ? 'border-slate-200 text-slate-300 bg-slate-100/50 cursor-not-allowed'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100 bg-white cursor-pointer shadow-xs'
              }`}
            >
              <span>Older Blocks</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
