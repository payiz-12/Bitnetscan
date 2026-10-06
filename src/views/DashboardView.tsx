import React, { useState } from 'react';
import { 
  Box, Layers, ArrowRightLeft, Cpu, Activity, Clock, Flame, Shield, 
  ExternalLink, ArrowUpRight, Zap, CheckCircle2, ChevronRight, User, Trophy, Coins, TrendingUp, FileCode
} from 'lucide-react';
import { Block, NetworkStats, Transaction } from '../types/blockchain';
import { VERIFIED_HODL_WALLETS } from '../data/richList';
import { explorerApiService } from '../services/explorerApi';
import { NetworkActivityCharts } from '../components/NetworkActivityCharts';
import { priceService, BtnPriceData } from '../services/priceService';

interface DashboardViewProps {
  stats: NetworkStats | null;
  recentBlocks: Block[];
  recentTxs: Transaction[];
  loading: boolean;
  currentSeconds?: number;
  onSelectBlock: (blockNumber: number) => void;
  onSelectTx: (txHash: string) => void;
  onSelectAddress: (address: string) => void;
  onRefresh: () => void;
  onViewRichList?: () => void;
  onViewAllBlocks?: () => void;
  onViewAllTransactions?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  recentBlocks,
  recentTxs,
  loading,
  currentSeconds,
  onSelectBlock,
  onSelectTx,
  onSelectAddress,
  onRefresh,
  onViewRichList,
  onViewAllBlocks,
  onViewAllTransactions,
}) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [priceData, setPriceData] = useState<BtnPriceData>(priceService.getCachedPrice());
  const [txFeedTab, setTxFeedTab] = useState<'latest' | 'oldest'>('latest');

  React.useEffect(() => {
    return priceService.subscribe((data) => {
      setPriceData(data);
    });
  }, []);

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const nowSec = currentSeconds || Math.floor(Date.now() / 1000);

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.max(0, Math.floor(nowSec - timestamp));
    if (seconds < 2) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Analytics Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-6 md:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 p-2 shadow-xs flex items-center justify-center flex-shrink-0">
              <img 
                src="/bitnet-logo-blue.svg" 
                alt="Bitnet Logo" 
                className="w-full h-full object-contain" 
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-[#016976] border border-teal-200">
                  Ethash Layer-1 Blockchain
                </span>
                <span className="text-xs text-slate-600 flex items-center gap-1.5 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  PoW Consensus • 1.0 BTN / block reward
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                Bitnet Money <span className="text-[#016976]">Explorer</span>
              </h1>
            </div>
          </div>
        </div>

        {/* 6 Metric Cards: 3 on top, 3 on bottom on both mobile and desktop */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6 sm:mt-8">
          {/* Card 01: Latest Block */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-5 border border-slate-200 hover:border-[#016976] hover:shadow-md transition-all shadow-xs flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 group">
            <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-teal-50 border border-teal-100 text-[#016976] flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-110 group-hover:bg-[#016976] group-hover:text-white group-hover:rotate-6 transition-all duration-300">
              <Layers className="w-3.5 h-3.5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:scale-110" />
            </div>
            <div className="min-w-0 flex-1 w-full">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-tight sm:tracking-wider block truncate">
                Latest Block
              </span>
              <div className="text-xs min-[400px]:text-sm sm:text-2xl font-black font-mono text-slate-900 mt-0.5 truncate">
                {stats ? `#${stats.latestBlock.toLocaleString()}` : '...'}
              </div>
              <div className="text-[9px] sm:text-xs text-slate-500 font-medium mt-0.5 truncate">
                ~{stats?.avgBlockTimeSeconds != null ? Number(stats.avgBlockTimeSeconds).toFixed(2) : '14.60'}s block
              </div>
            </div>
          </div>

          {/* Card 02: Gas Price */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-5 border border-slate-200 hover:border-[#D97706] hover:shadow-md transition-all shadow-xs flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 group">
            <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-amber-50 border border-amber-100 text-[#D97706] flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-110 group-hover:bg-[#D97706] group-hover:text-white group-hover:-rotate-6 transition-all duration-300">
              <Flame className="w-3.5 h-3.5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:scale-110" />
            </div>
            <div className="min-w-0 flex-1 w-full">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-tight sm:tracking-wider block truncate">
                Gas Price<span className="hidden sm:inline"> & Fee</span>
              </span>
              <div className="text-xs min-[400px]:text-sm sm:text-2xl font-black font-mono text-slate-900 mt-0.5 truncate">
                {stats?.gasPriceGwei !== null && stats?.gasPriceGwei !== undefined ? `${stats.gasPriceGwei} Gwei` : 'Unknown'}
              </div>
              <div className="text-[9px] sm:text-xs text-slate-500 font-medium mt-0.5 truncate">
                {stats?.gasPriceGwei !== null && stats?.gasPriceGwei !== undefined ? `Base: ~${(Number(stats.gasPriceGwei) / 1e9).toFixed(9)}` : 'Live rate'}
              </div>
            </div>
          </div>

          {/* Card 03: BTN Price (NestEx Spot) */}
          <a
            href="https://trade.nestex.one/spot/BTN"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-5 border border-slate-200 hover:border-emerald-600 hover:shadow-md transition-all shadow-xs flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 group cursor-pointer"
            title="NestEx BTN/USDT Spot Market"
          >
            <div className="flex items-center justify-between w-full sm:w-auto">
              <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-emerald-50 border border-emerald-100 text-[#059669] flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-110 group-hover:bg-[#059669] group-hover:text-white group-hover:translate-x-1 transition-all duration-300">
                <TrendingUp className="w-3.5 h-3.5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <span className={`text-[9px] font-bold px-1 py-0.2 rounded-full sm:hidden ${
                priceData.change24h >= 0 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {priceData.change24hFormatted}
              </span>
            </div>
            <div className="min-w-0 flex-1 w-full">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-tight sm:tracking-wider block truncate">
                  BTN Price<span className="hidden sm:inline"> (Spot)</span>
                </span>
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full hidden sm:inline-block ${
                  priceData.change24h >= 0 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {priceData.change24hFormatted}
                </span>
              </div>
              <div className="text-xs min-[400px]:text-sm sm:text-2xl font-black font-mono text-slate-900 mt-0.5 truncate">
                {priceData.priceFormatted}
              </div>
              <div className="text-[9px] sm:text-xs text-slate-500 font-medium mt-0.5 flex items-center justify-between truncate">
                <span>High: ${priceData.high24h}</span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">NestEx ↗</span>
              </div>
            </div>
          </a>

          {/* Card 04: Mining Hashrate */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-5 border border-slate-200 hover:border-[#D68142] hover:shadow-md transition-all shadow-xs flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 group">
            <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-orange-50 border border-orange-100 text-[#D68142] flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-110 group-hover:bg-[#D68142] group-hover:text-white group-hover:rotate-6 transition-all duration-300">
              <Cpu className="w-3.5 h-3.5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:scale-110" />
            </div>
            <div className="min-w-0 flex-1 w-full">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-tight sm:tracking-wider block truncate">
                Hashrate<span className="hidden sm:inline"> (PoW)</span>
              </span>
              <div className="text-xs min-[400px]:text-sm sm:text-2xl font-black font-mono text-slate-900 mt-0.5 truncate">
                {stats?.hashrateEstimate || 'Active (PoW)'}
              </div>
              <div className="text-[9px] sm:text-xs text-slate-500 font-medium mt-0.5 truncate">
                Diff: {stats?.difficulty || 'N/A'}
              </div>
            </div>
          </div>

          {/* Card 05: Block Reward */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-5 border border-slate-200 hover:border-[#1A2B3F] hover:shadow-md transition-all shadow-xs flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 group">
            <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-slate-100 border border-slate-200 text-[#1A2B3F] flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-110 group-hover:bg-[#1A2B3F] group-hover:text-white group-hover:-translate-y-1 transition-all duration-300">
              <Coins className="w-3.5 h-3.5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:scale-110" />
            </div>
            <div className="min-w-0 flex-1 w-full">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-tight sm:tracking-wider block truncate">
                Reward<span className="hidden sm:inline"> & Emission</span>
              </span>
              <div className="text-xs min-[400px]:text-sm sm:text-2xl font-black font-mono text-slate-900 mt-0.5 flex items-center gap-1 sm:gap-1.5 truncate">
                <img src="/bitnet-logo-blue.svg" alt="BTN" className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                <span>1.0 BTN</span>
              </div>
              <div className="text-[9px] sm:text-xs text-slate-500 font-medium mt-0.5 truncate">
                {stats?.circulatingEstimate ? `~${stats.circulatingEstimate}` : 'Miner Subsidy'}
              </div>
            </div>
          </div>

          {/* Card 06: Rich List */}
          <div 
            onClick={onViewRichList}
            className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-5 border border-slate-200 hover:border-[#0284C7] hover:shadow-md transition-all shadow-xs flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 group cursor-pointer"
          >
            <div className="flex items-center justify-between w-full sm:w-auto">
              <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-sky-50 border border-sky-100 text-[#0284C7] flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-110 group-hover:bg-[#0284C7] group-hover:text-white group-hover:rotate-6 transition-all duration-300">
                <Trophy className="w-3.5 h-3.5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0284C7] sm:hidden" />
            </div>
            <div className="min-w-0 flex-1 w-full">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-tight sm:tracking-wider block truncate">
                  HODL Rich List
                </span>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#0284C7] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all hidden sm:block" />
              </div>
              <div className="text-xs min-[400px]:text-sm sm:text-2xl font-black font-mono text-slate-900 mt-0.5 truncate">
                Top 50
              </div>
              <div className="text-[9px] sm:text-xs text-slate-500 font-medium mt-0.5 truncate">
                Whale Wallets
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Network Activity & Live Analytics Charts */}
      <NetworkActivityCharts
        recentBlocks={recentBlocks}
        stats={stats}
        onSelectBlock={onSelectBlock}
        onSelectAddress={onSelectAddress}
      />

      {/* Main Two-Column Feed: Latest Blocks & Latest Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Latest Blocks */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#016976] shadow-xs relative">
                  <Box className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Latest Blocks</h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Live Feed
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Target: ~{stats?.avgBlockTimeSeconds != null ? Number(stats.avgBlockTimeSeconds).toFixed(2) : '14.60'}s block time
                  </p>
                </div>
              </div>
              <button
                onClick={onViewAllBlocks ? onViewAllBlocks : () => onSelectBlock(stats?.latestBlock || 0)}
                className="text-xs font-bold text-[#016976] hover:text-[#014E58] flex items-center gap-1 self-end sm:self-auto cursor-pointer bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
            {/* Upcoming Block Dashed Mining Slot */}
            {(recentBlocks[0]?.number || stats?.latestBlock) && (
              <div className="p-3 bg-teal-50/20 border-b border-slate-100">
                <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-[#016976]/40 bg-white/85 p-3 shadow-2xs transition-all animate-pulse-dashed">
                  {/* Background Progress Fill across ~15s */}
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500/10 via-emerald-500/15 to-teal-400/20 transition-all duration-1000 ease-linear pointer-events-none"
                    style={{
                      width: `${Math.min(100, Math.round(((recentBlocks[0] ? Math.max(0, nowSec - recentBlocks[0].timestamp) : 0) / (stats?.avgBlockTimeSeconds || 14.6)) * 100))}%`
                    }}
                  />

                  <div className="relative z-10 flex items-center justify-between gap-3">
                    {/* Left: Animated Icon & Next Block info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl border-2 border-dashed border-[#016976]/60 bg-teal-50/60 flex items-center justify-center text-[#016976] shadow-2xs flex-shrink-0 relative">
                        <Box className="w-5 h-5 text-[#016976] animate-pulse" />
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-slate-800 tracking-tight">
                            #{((recentBlocks[0]?.number || stats?.latestBlock || 0) + 1).toLocaleString()}
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/90">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Mining (PoW)
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                          <span>~{Math.round(stats?.avgBlockTimeSeconds || 14.6)}s target</span>
                          <span>•</span>
                          <span className="text-teal-700 font-semibold">{recentBlocks[0] ? Math.max(0, nowSec - recentBlocks[0].timestamp) : 0}s</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Block Progress Meter */}
                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
                      <span className="font-mono font-bold text-xs text-[#016976]">
                        %{Math.min(100, Math.round(((recentBlocks[0] ? Math.max(0, nowSec - recentBlocks[0].timestamp) : 0) / (stats?.avgBlockTimeSeconds || 14.6)) * 100))}
                      </span>
                      <div className="w-20 sm:w-28 bg-slate-200/80 rounded-full h-2 overflow-hidden border border-teal-200/50 shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-[#016976] via-teal-500 to-emerald-400 rounded-full transition-all duration-1000 ease-linear"
                          style={{
                            width: `${Math.min(100, Math.round(((recentBlocks[0] ? Math.max(0, nowSec - recentBlocks[0].timestamp) : 0) / (stats?.avgBlockTimeSeconds || 14.6)) * 100))}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {recentBlocks.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Fetching latest blocks from Bitnet RPC...
              </div>
            ) : (
              recentBlocks.map((block, index) => {
                const gasPercent = block.gasLimit > 0 
                  ? ((block.gasUsed / block.gasLimit) * 100).toFixed(1) 
                  : '0';
                const isNewest = index === 0;
                const isVeryRecent = (nowSec - block.timestamp) < 45;

                return (
                  <div
                    key={block.number}
                    onClick={() => onSelectBlock(block.number)}
                    className={`p-4 transition-all duration-300 cursor-pointer flex items-center justify-between gap-4 group ${
                      isNewest && isVeryRecent 
                        ? 'animate-new-block bg-teal-50/40 border-l-4 border-l-[#016976] hover:bg-teal-50/60' 
                        : 'hover:bg-slate-50/90'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2 group-hover:border-[#016976] group-hover:scale-105 transition-all duration-200 shadow-2xs shrink-0">
                        <img src="/bitnet-logo-blue.svg" alt="Block" className="w-full h-full object-contain" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                          <span className="font-mono font-bold text-sm text-[#016976] group-hover:underline shrink-0">
                            #{block.number.toLocaleString()}
                          </span>
                          {isNewest && isVeryRecent && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-100 text-[#016976] border border-teal-300 animate-pulse shrink-0">
                              <span className="w-1 h-1 rounded-full bg-[#016976]"></span>
                              New
                            </span>
                          )}
                          <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{formatTimeAgo(block.timestamp)}</span>
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5 truncate">
                          <span className="font-medium text-slate-400">Miner:</span>
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectAddress(block.miner);
                            }}
                            className="font-mono text-slate-700 hover:text-[#016976] hover:underline font-semibold truncate"
                          >
                            {truncateAddress(block.miner)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 space-y-1">
                      <div className="text-xs font-bold font-mono text-emerald-800 bg-emerald-50 group-hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 group-hover:border-emerald-300 flex items-center justify-end gap-1 shadow-2xs transition-colors">
                        <span>1.0 BTN</span>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-12 bg-slate-200/80 rounded-full h-1.5 overflow-hidden" title={`Gas Usage: ${gasPercent}%`}>
                          <div 
                            className={`h-full rounded-full transition-all ${
                              parseFloat(gasPercent) > 75 
                                ? 'bg-rose-500' 
                                : parseFloat(gasPercent) > 40 
                                ? 'bg-amber-500' 
                                : 'bg-emerald-500'
                            }`} 
                            style={{ width: `${Math.min(100, Math.max(10, parseFloat(gasPercent)))}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {block.transactions.length} tx • {gasPercent}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Latest Transactions */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#016976] shadow-xs">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Latest Transactions</h3>
                    <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-[10px] font-bold">
                      <button
                        onClick={() => setTxFeedTab('latest')}
                        className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                          txFeedTab === 'latest'
                            ? 'bg-white text-[#016976] shadow-2xs font-extrabold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Latest
                      </button>
                      <button
                        onClick={() => setTxFeedTab('oldest')}
                        className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                          txFeedTab === 'oldest'
                            ? 'bg-[#016976] text-white shadow-2xs font-extrabold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Oldest
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {txFeedTab === 'latest' ? 'Live on-chain transaction stream' : 'Historical verified genesis transactions'}
                  </p>
                </div>
              </div>
              <button
                onClick={onViewAllTransactions}
                className="text-xs font-bold text-[#016976] hover:text-[#014E58] flex items-center gap-1 self-end sm:self-auto cursor-pointer bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
            {(() => {
              const activeTxs = txFeedTab === 'oldest'
                ? explorerApiService.getOldestLedgerTransactions(15).map(t => ({
                    hash: t.hash,
                    blockNumber: t.blockNumber,
                    timestamp: t.timestamp,
                    from: t.from,
                    to: t.to,
                    value: t.value,
                    valueWei: t.valueWei,
                    fee: t.fee,
                  }))
                : (recentTxs.length > 0
                    ? recentTxs
                    : explorerApiService.getLatestLedgerTransactions(15).map(t => ({
                        hash: t.hash,
                        blockNumber: t.blockNumber,
                        timestamp: t.timestamp,
                        from: t.from,
                        to: t.to,
                        value: t.value,
                        valueWei: t.valueWei,
                        fee: t.fee,
                      }))
                  );

              if (activeTxs.length === 0) {
                return (
                  <div className="p-8 text-center space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-[#016976] mx-auto shadow-2xs">
                      <ArrowRightLeft className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-semibold text-slate-500">
                      No transactions found
                    </div>
                  </div>
                );
              }

              return activeTxs.map((tx) => (
                <div
                  key={tx.hash}
                  onClick={() => onSelectTx(tx.hash)}
                  className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-[#016976] group-hover:border-[#016976] transition-all shadow-2xs">
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-[#0284C7] group-hover:underline truncate max-w-[120px] sm:max-w-[160px]">
                          {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono font-medium">
                          Block #{tx.blockNumber.toLocaleString()}
                        </span>
                        {tx.timestamp && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            • {formatTimeAgo(tx.timestamp)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                        <span className="text-slate-400 font-medium">From</span>
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAddress(tx.from);
                          }}
                          className="font-mono text-slate-800 hover:text-[#016976] hover:underline font-semibold"
                        >
                          {tx.from === '0x0000000000000000000000000000000000000000' ? 'Null Address (0x00...)' : truncateAddress(tx.from)}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className="text-slate-400 font-medium">To</span>
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (tx.to) onSelectAddress(tx.to);
                          }}
                          className={`font-mono font-semibold ${
                            tx.to 
                              ? 'text-slate-800 hover:text-[#016976] hover:underline cursor-pointer' 
                              : 'inline-flex items-center gap-1 text-[#D97706] font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]'
                          }`}
                        >
                          {tx.to ? (
                            truncateAddress(tx.to)
                          ) : (
                            <>
                              <FileCode className="w-3 h-3 text-[#D97706]" />
                              <span>Contract Creation</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div
                      className="text-xs font-bold font-mono text-slate-900"
                      title={tx.valueWei ? `${tx.value} (${tx.valueWei} Wei)` : tx.value}
                    >
                      {(() => {
                        const valNum = parseFloat(tx.value) || 0;
                        if (valNum > 0 && valNum < 0.0001) return '< 0.0001 BTN';
                        return `${valNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} BTN`;
                      })()}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {tx.fee ? `Fee: ${tx.fee}` : tx.gasPrice ? `Gas: ${tx.gasPrice} Gwei` : 'Fee: Unknown'}
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Bitnet HODL Rich List Preview Section on Dashboard */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#D97706] shadow-2xs">
              <Trophy className="w-5 h-5 text-[#D97706]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Bitnet HODL Rich List</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-[#016976] border border-teal-200">
                  Top Balance Ranking
                </span>
              </div>
            </div>
          </div>

          {onViewRichList && (
            <button
              onClick={onViewRichList}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#016976] hover:bg-[#015661] text-white text-xs font-bold transition-all self-start sm:self-auto cursor-pointer shadow-xs"
            >
              <span>View Full Rich List ({VERIFIED_HODL_WALLETS.length} Wallets)</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mobile View: Dedicated cards with zero horizontal scroll (sm:hidden) */}
        <div className="sm:hidden divide-y divide-slate-100 font-mono">
          {VERIFIED_HODL_WALLETS.slice(0, 5).map((acc) => (
            <div
              key={acc.address}
              onClick={() => onSelectAddress(acc.address)}
              onMouseEnter={() => explorerApiService.prefetchAddress(acc.address)}
              className="py-3 px-1 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold shrink-0 ${
                    acc.rank === 1
                      ? 'bg-[#D97706] text-white shadow-2xs'
                      : acc.rank === 2
                      ? 'bg-slate-600 text-white shadow-2xs'
                      : acc.rank === 3
                      ? 'bg-[#D68142] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  #{acc.rank}
                </span>
                <div className="min-w-0">
                  <span 
                    title={acc.address}
                    className="font-semibold text-xs text-slate-900 truncate block"
                  >
                    {truncateAddress(acc.address)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-sans block mt-0.5">
                    {acc.percentage} share • {acc.txCount.toLocaleString()} txns
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="flex items-center justify-end gap-1 text-xs font-bold text-slate-900">
                  <img src="/bitnet-logo-blue.svg" alt="BTN" className="w-3.5 h-3.5" />
                  <span>{acc.balanceFormatted} BTN</span>
                </div>
                <div className="text-[10px] text-[#016976] font-bold mt-0.5 flex items-center justify-end gap-0.5">
                  <span>View</span>
                  <ArrowUpRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View of Top 5 Wallets (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm font-mono">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 text-[11px] uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3 px-3">Rank</th>
                <th className="py-3 px-3">Wallet Address</th>
                <th className="py-3 px-3 text-right">Balance (BTN)</th>
                <th className="py-3 px-3 text-right hidden md:table-cell">% Circulating Share</th>
                <th className="py-3 px-3 text-right">Transactions</th>
                <th className="py-3 px-3 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {VERIFIED_HODL_WALLETS.slice(0, 5).map((acc) => (
                <tr
                  key={acc.address}
                  onClick={() => onSelectAddress(acc.address)}
                  onMouseEnter={() => explorerApiService.prefetchAddress(acc.address)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                        acc.rank === 1
                          ? 'bg-[#D97706] text-white shadow-2xs'
                          : acc.rank === 2
                          ? 'bg-slate-600 text-white shadow-2xs'
                          : acc.rank === 3
                          ? 'bg-[#D68142] text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 border border-slate-200 font-bold'
                      }`}
                    >
                      #{acc.rank}
                    </span>
                  </td>
                  <td 
                    title={acc.address}
                    className="py-3 px-3 font-semibold text-slate-900 group-hover:text-[#016976] transition-colors whitespace-nowrap"
                  >
                    {truncateAddress(acc.address)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <img src="/bitnet-logo-blue.svg" alt="BTN" className="w-3.5 h-3.5" />
                      <span>{acc.balanceFormatted} BTN</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right hidden md:table-cell text-slate-600 font-medium">
                    {acc.percentage}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-800 font-semibold whitespace-nowrap">
                    {acc.txCount.toLocaleString()} txns
                  </td>
                  <td className="py-3 px-3 text-center text-[#016976]">
                    <span className="inline-flex items-center gap-1 group-hover:underline text-xs font-bold">
                      <span>View</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
