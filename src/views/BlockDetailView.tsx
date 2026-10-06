import React, { useEffect, useState } from 'react';
import { 
  Box, ArrowLeft, ArrowRight, Clock, Shield, CheckCircle2, 
  Copy, Layers, Cpu, Flame, Database, FileText, ChevronLeft, ChevronRight, User, FileCode 
} from 'lucide-react';
import { Block, Transaction } from '../types/blockchain';
import { rpcService } from '../services/rpc';
import { explorerApiService } from '../services/explorerApi';

interface BlockDetailViewProps {
  blockNumberOrHash: number | string;
  onBack: () => void;
  onSelectBlock: (num: number) => void;
  onSelectTx: (txHash: string) => void;
  onSelectAddress: (addr: string) => void;
}

export const BITNET_GENESIS_TIMESTAMP = 1689317647; // July 14, 2023 06:54:07 UTC

const getEffectiveBlockTimestamp = (block: Block): number => {
  if (block.number <= 0 && (!block.timestamp || block.timestamp <= 0)) {
    return BITNET_GENESIS_TIMESTAMP;
  }
  return block.timestamp;
};

const formatTimeAgo = (timestampSec: number): string => {
  const diff = Math.max(0, Math.floor(Date.now() / 1000 - timestampSec));
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff} secs ago`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 365) return `${days} day${days > 1 ? 's' : ''} ago`;
  const years = (days / 365.25).toFixed(1);
  return `${days} days ago (~${years} yrs ago)`;
};

const formatExactDate = (timestampSec: number): string => {
  return new Date(timestampSec * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
};

export const BlockDetailView: React.FC<BlockDetailViewProps> = ({
  blockNumberOrHash,
  onBack,
  onSelectBlock,
  onSelectTx,
  onSelectAddress,
}) => {
  const [block, setBlock] = useState<Block | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    rpcService.getBlock(blockNumberOrHash, true)
      .then((res) => {
        if (isMounted) {
          if (!res) {
            setError('The specified block was not found on Bitnet.');
          } else {
            setBlock(res);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to fetch block data from RPC.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [blockNumberOrHash]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
        <p className="text-slate-400 font-mono text-sm">Querying Bitnet block details...</p>
      </div>
    );
  }

  if (error || !block) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
          <Box className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Block Not Found</h2>
        <p className="text-sm text-slate-400">{error || 'No block matching this identifier was found.'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const gasPercentage = block.gasLimit > 0 
    ? ((block.gasUsed / block.gasLimit) * 100).toFixed(2) 
    : '0';

  const txList = block.transactions as Transaction[];

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* Navigation header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-[#016976]" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectBlock(block.number - 1)}
            disabled={block.number <= 0}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40 shadow-xs cursor-pointer"
            title="Previous Block"
          >
            <ChevronLeft className="w-4 h-4 text-[#016976]" />
          </button>
          <span className="font-mono text-xs font-bold text-[#016976] bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
            Block #{block.number}
          </span>
          <button
            onClick={() => onSelectBlock(block.number + 1)}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs cursor-pointer"
            title="Next Block"
          >
            <ChevronRight className="w-4 h-4 text-[#016976]" />
          </button>
        </div>
      </div>

      {/* Main Block Specs Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3.5 pb-5 border-b border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#016976] shadow-xs">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              Block <span className="font-mono text-[#016976]">#{block.number}</span>
              {block.number === 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Genesis Block
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 font-mono break-all mt-0.5 font-medium">
              Hash: {block.hash}
            </p>
          </div>
        </div>

        {/* Key Attributes Grid */}
        <div className="divide-y divide-slate-100 text-xs sm:text-sm">
          {/* Timestamp */}
          <div className="py-3.5 sm:grid sm:grid-cols-3 sm:gap-4 items-center">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#016976]" />
              Timestamp:
            </span>
            <div className="sm:col-span-2 text-slate-900 mt-1 sm:mt-0 font-mono text-xs font-semibold flex items-center gap-2 flex-wrap">
              <span>{formatTimeAgo(getEffectiveBlockTimestamp(block))} ({formatExactDate(getEffectiveBlockTimestamp(block))})</span>
              {block.number === 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-[#016976] border border-teal-200">
                  Bitnet Genesis Launch
                </span>
              )}
            </div>
          </div>

          {/* Transactions count */}
          <div className="py-3.5 sm:grid sm:grid-cols-3 sm:gap-4 items-center">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#016976]" />
              Transactions:
            </span>
            <div className="sm:col-span-2 text-slate-900 mt-1 sm:mt-0 flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-[#016976] font-bold border border-teal-200 text-xs">
                {block.transactions.length} transaction{block.transactions.length === 1 ? '' : 's'}
              </span>
              <span className="text-slate-500 text-xs font-medium">in this block</span>
            </div>
          </div>

          {/* Miner */}
          <div className="py-3.5 sm:grid sm:grid-cols-3 sm:gap-4 items-center">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400" />
              Fee Recipient / Miner:
            </span>
            <div className="sm:col-span-2 mt-1 sm:mt-0 flex items-center gap-2">
              <span
                onClick={() => onSelectAddress(block.miner)}
                className="font-mono text-slate-900 hover:text-[#016976] hover:underline cursor-pointer break-all font-semibold"
              >
                {block.miner}
              </span>
              <button
                onClick={() => copyToClipboard(block.miner, 'miner')}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 cursor-pointer"
                title="Copy Address"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              {copiedKey === 'miner' && <span className="text-[10px] text-[#016976] font-bold">Copied!</span>}
            </div>
          </div>

          {/* Block Reward */}
          <div className="py-3.5 sm:grid sm:grid-cols-3 sm:gap-4 items-center">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-slate-400" />
              Block Reward:
            </span>
            <div className="sm:col-span-2 text-slate-900 mt-1 sm:mt-0 font-mono font-extrabold flex items-center gap-1.5">
              <img src="/bitnet-logo-blue.svg" alt="BTN" className="w-4 h-4" />
              <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">1.0 BTN</span>
              <span className="text-slate-400 font-normal text-xs">(PoW Block Subsidy + Transaction Fees)</span>
            </div>
          </div>

          {/* Difficulty & Hashrate */}
          <div className="py-3.5 sm:grid sm:grid-cols-3 sm:gap-4 items-center">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#D68142]" />
              Difficulty:
            </span>
            <div className="sm:col-span-2 text-slate-900 mt-1 sm:mt-0 font-mono text-xs font-bold">
              {block.difficulty} <span className="text-slate-500 font-normal">(Total Difficulty: {block.totalDifficulty})</span>
            </div>
          </div>

          {/* Size */}
          <div className="py-3.5 sm:grid sm:grid-cols-3 sm:gap-4 items-center">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <Database className="w-4 h-4 text-slate-400" />
              Size:
            </span>
            <div className="sm:col-span-2 text-slate-900 mt-1 sm:mt-0 font-mono text-xs font-semibold">
              {block.size.toLocaleString()} bytes
            </div>
          </div>

          {/* Gas Used / Limit */}
          <div className="py-3.5 sm:grid sm:grid-cols-3 sm:gap-4 items-center">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-[#D97706]" />
              Gas Used / Limit:
            </span>
            <div className="sm:col-span-2 mt-1 sm:mt-0 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-900 font-bold">
                  {block.gasUsed.toLocaleString()} / {block.gasLimit.toLocaleString()}
                </span>
                <span className="text-[#016976] font-bold">{gasPercentage}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div 
                  className="bg-[#016976] h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(parseFloat(gasPercentage), 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Extra Data */}
          <div className="py-3.5 sm:grid sm:grid-cols-3 sm:gap-4 items-center">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-400" />
              Extra Data (Node ID):
            </span>
            <div className="sm:col-span-2 mt-1 sm:mt-0 font-mono text-xs break-all">
              {block.extraDataAscii ? (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-50 text-slate-900 border border-slate-200 font-bold">
                  <span>{block.extraDataAscii}</span>
                  <span className="text-slate-400 text-[10px] font-normal">({block.extraData})</span>
                </div>
              ) : (
                <span className="text-slate-600 font-semibold">{block.extraData}</span>
              )}
            </div>
          </div>

          {/* Parent Hash */}
          <div className="py-3.5 sm:grid sm:grid-cols-3 sm:gap-4 items-center">
            <span className="text-slate-500 font-semibold">Parent Hash:</span>
            <div className="sm:col-span-2 mt-1 sm:mt-0">
              <span
                onClick={() => onSelectBlock(block.number - 1)}
                className="font-mono text-xs text-[#016976] hover:underline cursor-pointer break-all font-semibold"
              >
                {block.parentHash}
              </span>
            </div>
          </div>

          {/* Nonce */}
          <div className="py-3.5 sm:grid sm:grid-cols-3 sm:gap-4 items-center">
            <span className="text-slate-500 font-semibold">PoW Nonce:</span>
            <div className="sm:col-span-2 mt-1 sm:mt-0 font-mono text-xs text-slate-900 font-bold">
              {block.nonce}
            </div>
          </div>
        </div>
      </div>

      {/* Block Transactions List */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Transactions in Block</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-[#016976] font-bold border border-teal-200">
              {block.transactions.length}
            </span>
          </h3>
        </div>

        {block.transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm font-medium">
            No user transactions in this block (coinbase reward only).
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {txList.map((tx: any, idx: number) => {
              const hash = typeof tx === 'string' ? tx : tx.hash;
              const from = typeof tx === 'object' ? tx.from : '';
              const to = typeof tx === 'object' ? tx.to : '';
              const value = typeof tx === 'object' ? tx.value : '0';

              return (
                <div
                  key={hash || idx}
                  onClick={() => onSelectTx(hash)}
                  className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#0284C7] font-bold hover:underline">
                        {hash}
                      </span>
                    </div>
                    {from && (
                      <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                        <span className="text-slate-400">From:</span>
                        <span 
                          onClick={(e) => { e.stopPropagation(); onSelectAddress(from); }}
                          className="hover:text-[#016976] hover:underline text-slate-800 font-semibold"
                        >
                          {from.slice(0, 8)}...{from.slice(-6)}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className="text-slate-400">To:</span>
                        <span 
                          onClick={(e) => { e.stopPropagation(); if (to) onSelectAddress(to); }}
                          className={to ? 'hover:text-[#016976] hover:underline text-slate-800 font-semibold cursor-pointer' : 'inline-flex items-center gap-1 text-[#D97706] font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]'}
                        >
                          {to ? (
                            `${to.slice(0, 8)}...${to.slice(-6)}`
                          ) : (
                            <>
                              <FileCode className="w-3 h-3 text-[#D97706]" />
                              <span>Contract Creation</span>
                            </>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                    <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                      {parseFloat(value || '0').toFixed(4)} BTN
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Tx Index #{idx}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
