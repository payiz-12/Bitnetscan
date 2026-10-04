import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, CheckCircle2, XCircle, Clock, Copy, ArrowRightLeft, 
  Layers, Shield, Flame, Code, FileText, ChevronRight, Hash, User, FileCode 
} from 'lucide-react';
import { Transaction } from '../types/blockchain';
import { rpcService } from '../services/rpc';
import { explorerApiService } from '../services/explorerApi';
import { decodeTransactionInput, decodeEventLog } from '../services/decoder';
import { ethers } from 'ethers';

interface TxDetailViewProps {
  txHash: string;
  onBack: () => void;
  onSelectBlock: (num: number) => void;
  onSelectAddress: (addr: string) => void;
}

export const TxDetailView: React.FC<TxDetailViewProps> = ({
  txHash,
  onBack,
  onSelectBlock,
  onSelectAddress,
}) => {
  const [tx, setTx] = useState<Transaction | null>(null);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [blockTimestamp, setBlockTimestamp] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [inputViewMode, setInputViewMode] = useState<'decoded' | 'hex' | 'utf8'>('decoded');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      rpcService.getTransaction(txHash),
      rpcService.getTransactionReceipt(txHash).catch(() => null)
    ])
      .then(async ([txData, receiptData]) => {
        if (!isMounted) return;
        if (!txData) {
          const fallbackTx = explorerApiService.getTransaction(txHash);
          if (fallbackTx) {
            setTx({
              hash: fallbackTx.hash,
              blockHash: '',
              blockNumber: fallbackTx.blockNumber,
              from: fallbackTx.from,
              to: fallbackTx.to,
              value: fallbackTx.valueNum.toString(),
              fee: fallbackTx.fee && fallbackTx.fee !== 'Unknown' ? fallbackTx.fee : undefined,
              nonce: fallbackTx.nonce,
              status: fallbackTx.status === 'success' ? 1 : fallbackTx.status === 'failed' ? 0 : undefined,
              dataSource: 'snapshot',
            });
            setBlockTimestamp(fallbackTx.timestamp || null);
            setReceipt(null);
            setLoading(false);
            return;
          }
          setError('Transaction could not be found on the Bitnet network.');
        } else {
          setTx(txData);
          setReceipt(receiptData);

          // Query block timestamp
          if (txData.blockNumber != null) {
            try {
              const blk = await rpcService.getBlock(txData.blockNumber, false);
              if (isMounted && blk && blk.timestamp) {
                setBlockTimestamp(blk.timestamp);
              }
            } catch {}
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        if (isMounted) {
          const fallbackTx = explorerApiService.getTransaction(txHash);
          if (fallbackTx) {
            setTx({
              hash: fallbackTx.hash,
              blockHash: '',
              blockNumber: fallbackTx.blockNumber,
              from: fallbackTx.from,
              to: fallbackTx.to,
              value: fallbackTx.valueNum.toString(),
              fee: fallbackTx.fee && fallbackTx.fee !== 'Unknown' ? fallbackTx.fee : undefined,
              nonce: fallbackTx.nonce,
              status: fallbackTx.status === 'success' ? 1 : fallbackTx.status === 'failed' ? 0 : undefined,
              dataSource: 'snapshot',
            });
            setBlockTimestamp(fallbackTx.timestamp || null);
            setReceipt(null);
            setLoading(false);
            return;
          }
          setError(err.message || 'Failed to retrieve transaction details via RPC.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [txHash]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.max(0, Math.floor(Date.now() / 1000 - timestamp));
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    const days = Math.floor(seconds / 86400);
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  const formatExactDate = (timestamp: number) => {
    try {
      const d = new Date(timestamp * 1000);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      return '';
    }
  };

  const hexToUtf8 = (hex: string) => {
    if (!hex || hex === '0x') return '';
    try {
      const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
      let str = '';
      for (let i = 0; i < cleanHex.length; i += 2) {
        const code = parseInt(cleanHex.substr(i, 2), 16);
        if (code >= 32 && code <= 126) str += String.fromCharCode(code);
        else str += '.';
      }
      return str;
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#016976]/20 border-t-[#016976] rounded-full animate-spin mx-auto"></div>
        <p className="text-slate-600 font-medium text-sm">Decoding Bitnet transaction details...</p>
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
          <ArrowRightLeft className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Transaction Not Found</h2>
        <p className="text-sm text-slate-500">{error || 'Could not locate transaction on the Bitnet network.'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-[#016976] hover:bg-[#01545e] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Status verification:
  // EVM receipt.status === 1 (or '0x1') is Success; 0 (or '0x0') is Reverted/Failed.
  type TxStatus = 'pending' | 'success' | 'failed' | 'unknown';
  let txStatus: TxStatus = 'unknown';

  if (tx.blockNumber == null) {
    txStatus = 'pending';
  } else if (receipt && receipt.status !== undefined && receipt.status !== null) {
    const s = String(receipt.status).toLowerCase();
    txStatus = (s === '1' || s === '0x1' || s === 'true') ? 'success' : 'failed';
  } else if (tx.status !== undefined && tx.status !== null) {
    const s = String(tx.status).toLowerCase();
    txStatus = (s === '1' || s === '0x1' || s === 'true') ? 'success' : 'failed';
  }
  const isSuccess = txStatus === 'success';

  // Parse exact gasUsed - NEVER use gasLimit (tx.gas) as fallback!
  const rawGasUsed = receipt?.gasUsed !== undefined && receipt?.gasUsed !== null
    ? receipt.gasUsed
    : (tx.gasUsed !== undefined && tx.gasUsed !== null ? tx.gasUsed : null);
  const gasUsed: number | null = rawGasUsed !== null
    ? (typeof rawGasUsed === 'number'
        ? rawGasUsed
        : parseInt(String(rawGasUsed), String(rawGasUsed).startsWith('0x') ? 16 : 10))
    : null;

  // Effective gas price in Wei (BigInt) - prioritize receipt.effectiveGasPrice
  let effectiveGasPriceWei: bigint | null = null;
  if (receipt?.effectiveGasPrice) {
    try {
      const eff = receipt.effectiveGasPrice;
      effectiveGasPriceWei = typeof eff === 'string' && eff.startsWith('0x') ? BigInt(eff) : BigInt(eff);
    } catch {}
  }
  if (effectiveGasPriceWei === null) {
    if (tx.effectiveGasPriceWei) {
      try { effectiveGasPriceWei = BigInt(tx.effectiveGasPriceWei); } catch {}
    } else if (tx.gasPriceWei) {
      try { effectiveGasPriceWei = BigInt(tx.gasPriceWei); } catch {}
    } else if (tx.gasPrice) {
      try {
        if (typeof tx.gasPrice === 'string' && (tx.gasPrice.startsWith('0x') || /^\d+$/.test(tx.gasPrice))) {
          effectiveGasPriceWei = BigInt(tx.gasPrice);
        } else {
          effectiveGasPriceWei = ethers.parseUnits(String(tx.gasPrice), 'gwei');
        }
      } catch {}
    }
  }

  // Calculate fee: receipt.gasUsed * effectiveGasPriceWei (Wei BigInt)
  let totalFeeBtn: string | null = null;
  let totalFeeWei: bigint | null = null;
  if (gasUsed !== null && effectiveGasPriceWei !== null) {
    totalFeeWei = BigInt(gasUsed) * effectiveGasPriceWei;
    totalFeeBtn = ethers.formatEther(totalFeeWei);
  } else if (tx.feeWei) {
    try {
      totalFeeWei = BigInt(tx.feeWei);
      totalFeeBtn = ethers.formatEther(totalFeeWei);
    } catch {}
  } else if (tx.fee && tx.fee !== 'Unknown') {
    totalFeeBtn = tx.fee.replace(' BTN', '').trim();
  }

  const gasPriceGwei = effectiveGasPriceWei !== null
    ? ethers.formatUnits(effectiveGasPriceWei, 'gwei')
    : null;

  // Format exact transfer value in Wei and BTN (never round to zero)
  let valueWeiStr = '0';
  if (tx.valueWei) {
    valueWeiStr = tx.valueWei;
  } else if (tx.value) {
    try {
      valueWeiStr = typeof tx.value === 'string' && tx.value.startsWith('0x')
        ? BigInt(tx.value).toString()
        : (/^\d+$/.test(tx.value) ? tx.value : ethers.parseEther(tx.value.replace(' BTN', '').trim() || '0').toString());
    } catch {
      valueWeiStr = '0';
    }
  }
  const exactValueBtn = ethers.formatEther(valueWeiStr);

  const decodedInput = tx.input ? decodeTransactionInput(tx.input) : null;

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* Top back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all cursor-pointer shadow-xs"
      >
        <ArrowLeft className="w-4 h-4 text-[#016976]" />
        <span>Back</span>
      </button>

      {/* Main Tx Specs Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#016976] shadow-xs">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Transaction Details
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs text-slate-600 break-all font-semibold">
                  {tx.hash}
                </span>
                <button
                  onClick={() => copyToClipboard(tx.hash, 'txhash')}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {copiedKey === 'txhash' && <span className="text-[10px] text-[#016976] font-bold">Copied!</span>}
              </div>
            </div>
          </div>

          <div>
            {txStatus === 'pending' ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                <span>Pending</span>
              </span>
            ) : txStatus === 'success' ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Success</span>
              </span>
            ) : txStatus === 'failed' ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Failed (Reverted)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Status Unknown</span>
              </span>
            )}
          </div>
        </div>

        {/* Detailed Rows */}
        <div className="divide-y divide-slate-100 text-xs sm:text-sm">
          {/* Block Number */}
          <div className="py-3.5 sm:grid sm:grid-cols-3 sm:gap-4 items-center">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#016976]" />
              Block Height:
            </span>
            <div className="sm:col-span-2 mt-1 sm:mt-0 flex items-center gap-2">
              {tx.blockNumber != null ? (
                <>
                  <span
                    onClick={() => onSelectBlock(tx.blockNumber!)}
                    className="font-mono text-[#016976] hover:underline cursor-pointer font-bold text-sm"
                  >
                    #{tx.blockNumber.toLocaleString()}
                  </span>
                  {tx.transactionIndex != null && (
                    <span className="text-slate-400 text-xs font-mono font-medium">
                      (Position in block: #{tx.transactionIndex})
                    </span>
                  )}
                </>
              ) : (
                <span className="text-amber-600 font-semibold text-xs font-mono">
                  Pending (Not yet mined into a block)
                </span>
              )}
            </div>
          </div>

          {/* Timestamp */}
          {blockTimestamp != null && (
            <div className="py-3.5 sm:grid sm:grid-cols-3 sm:gap-4 items-center">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#016976]" />
                Timestamp:
              </span>
              <div className="sm:col-span-2 mt-1 sm:mt-0 flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-800">
                <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {formatTimeAgo(blockTimestamp)}
                </span>
                <span className="text-slate-500 font-mono">
                  ({formatExactDate(blockTimestamp)})
                </span>
              </div>
            </div>
          )}

          {/* From Address */}
          <div className="py-3.5 sm:grid sm:grid-cols-3 sm:gap-4 items-center">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400" />
              From:
            </span>
            <div className="sm:col-span-2 mt-1 sm:mt-0 flex items-center gap-2">
              <span
                onClick={() => onSelectAddress(tx.from)}
                className="font-mono text-slate-900 hover:text-[#016976] hover:underline cursor-pointer break-all font-semibold"
              >
                {tx.from}
              </span>
              <button
                onClick={() => copyToClipboard(tx.from, 'from')}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              {copiedKey === 'from' && <span className="text-[10px] text-[#016976] font-bold">Copied!</span>}
            </div>
          </div>

          {/* To Address */}
          <div className="py-3.5 sm:grid sm:grid-cols-3 sm:gap-4 items-center">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400" />
              Interacted With (To):
            </span>
            <div className="sm:col-span-2 mt-1 sm:mt-0 flex items-center gap-2">
              {tx.to ? (
                <>
                  <span
                    onClick={() => onSelectAddress(tx.to!)}
                    className="font-mono text-slate-900 hover:text-[#016976] hover:underline cursor-pointer break-all font-semibold"
                  >
                    {tx.to}
                  </span>
                  <button
                    onClick={() => copyToClipboard(tx.to!, 'to')}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {copiedKey === 'to' && <span className="text-[10px] text-[#016976] font-bold">Copied!</span>}
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-[#D97706] border border-amber-200 text-xs font-bold w-fit">
                    <FileCode className="w-4 h-4 text-[#D97706]" />
                    <span>Contract Deployment</span>
                  </span>
                  {receipt?.contractAddress && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 font-semibold">Created Contract Address:</span>
                      <span
                        onClick={() => onSelectAddress(receipt.contractAddress!)}
                        className="font-mono text-[#016976] hover:underline cursor-pointer font-bold text-xs"
                      >
                        {receipt.contractAddress}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Value Transferred */}
          <div className="py-3.5 sm:grid sm:grid-cols-3 sm:gap-4 items-center">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-slate-400" />
              Value:
            </span>
            <div className="sm:col-span-2 mt-1 sm:mt-0 font-mono font-extrabold text-slate-900 text-base flex flex-wrap items-center gap-2">
              <img src="/bitnet-logo-blue.svg" alt="BTN" className="w-4 h-4 flex-shrink-0" />
              <span>{exactValueBtn} BTN</span>
              <span className="text-xs text-slate-500 font-normal font-mono">
                ({valueWeiStr} Wei)
              </span>
              <button
                onClick={() => copyToClipboard(exactValueBtn, 'value')}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                title="Copy exact amount"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              {copiedKey === 'value' && <span className="text-[10px] text-[#016976] font-bold">Copied!</span>}
            </div>
          </div>

          {/* Transaction Fee */}
          <div className="py-3.5 sm:grid sm:grid-cols-3 sm:gap-4 items-center">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-[#D97706]" />
              Transaction Fee:
            </span>
            <div className="sm:col-span-2 mt-1 sm:mt-0 font-mono text-slate-900 font-bold">
              {totalFeeBtn ? (
                <>
                  {totalFeeBtn} BTN{' '}
                  <span className="text-slate-500 text-xs font-normal">
                    ({gasUsed != null ? `${gasUsed.toLocaleString()} gas used` : 'Gas used unknown'}
                    {gasPriceGwei ? ` @ ${gasPriceGwei} Gwei` : ''})
                  </span>
                </>
              ) : (
                <span className="text-slate-500 text-xs font-normal">Unknown</span>
              )}
            </div>
          </div>

          {/* Gas Specs */}
          <div className="py-3.5 sm:grid sm:grid-cols-3 sm:gap-4 items-center">
            <span className="text-slate-500 font-semibold">Gas Limit & Usage:</span>
            <div className="sm:col-span-2 mt-1 sm:mt-0 font-mono text-xs text-slate-800 font-semibold">
              {gasUsed != null && tx.gas != null ? (
                <>
                  {gasUsed.toLocaleString()} gas used / {tx.gas.toLocaleString()} gas limit ({((gasUsed / tx.gas) * 100).toFixed(1)}%)
                </>
              ) : gasUsed != null ? (
                <>{gasUsed.toLocaleString()} gas used</>
              ) : tx.gas != null ? (
                <>{tx.gas.toLocaleString()} gas limit</>
              ) : (
                <span className="text-slate-400">Unknown</span>
              )}
            </div>
          </div>

          {/* Nonce */}
          <div className="py-3.5 sm:grid sm:grid-cols-3 sm:gap-4 items-center">
            <span className="text-slate-500 font-semibold">Nonce:</span>
            <div className="sm:col-span-2 mt-1 sm:mt-0 font-mono text-xs text-slate-900 font-bold">
              {tx.nonce ?? 'Unknown'}
            </div>
          </div>
        </div>
      </div>

      {/* Input Data & Smart Contract Execution */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#016976]">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Input Data</h3>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
            <button
              onClick={() => setInputViewMode('decoded')}
              className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center truncate ${
                inputViewMode === 'decoded' ? 'bg-[#016976] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="sm:hidden">Decoded</span>
              <span className="hidden sm:inline">Decoded Execution</span>
            </button>
            <button
              onClick={() => setInputViewMode('hex')}
              className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center truncate ${
                inputViewMode === 'hex' ? 'bg-[#016976] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="sm:hidden">Raw Hex</span>
              <span className="hidden sm:inline">Raw Hex (Calldata)</span>
            </button>
            <button
              onClick={() => setInputViewMode('utf8')}
              className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center truncate ${
                inputViewMode === 'utf8' ? 'bg-[#016976] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="sm:hidden">UTF-8</span>
              <span className="hidden sm:inline">UTF-8 String</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Execution Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-500 font-semibold block">EVM Call Type</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 mt-0.5 block truncate">
              {!tx.input || tx.input === '0x' ? 'CALL (Native Value)' : tx.to ? 'CALL (Contract)' : 'CREATE (Deploy)'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Opcode: 0xF1 (Depth: 0)</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-500 font-semibold block">Payload Size</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 mt-0.5 block">
              {!tx.input || tx.input === '0x' ? '0 Bytes (No Data)' : `${Math.floor((tx.input.length - 2) / 2)} Bytes`}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {!tx.input || tx.input === '0x' ? 'Direct transfer' : `${(tx.input.length - 2) / 64} EVM Words`}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-500 font-semibold block">Gas Efficiency</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 mt-0.5 block">
              {gasUsed != null ? (gasUsed === 21000 ? '21,000 (Standard)' : `${gasUsed.toLocaleString()} Gas`) : 'Unknown'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Standard EVM Base</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-500 font-semibold block">State Transition</span>
            <span className={`text-xs sm:text-sm font-bold font-mono mt-0.5 block ${txStatus === 'success' ? 'text-emerald-700' : txStatus === 'pending' ? 'text-amber-600' : txStatus === 'failed' ? 'text-rose-700' : 'text-slate-600'}`}>
              {txStatus === 'success' ? 'Status 1: Success' : txStatus === 'pending' ? 'Status: Pending' : txStatus === 'failed' ? 'Status 0: Reverted' : 'Status: Unknown'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {tx.blockNumber != null ? `Block #${tx.blockNumber} Confirmed` : 'Pending Confirmation'}
            </span>
          </div>
        </div>

        {/* Decoder Content */}
        {inputViewMode === 'decoded' ? (
          !tx.input || tx.input === '0x' ? (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#016976]"></span>
                    EVM State Transition & Value Flow Trace
                  </span>
                  <span className="text-[11px] font-mono text-[#016976] font-bold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                    Direct BTN Transfer
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs pt-1">
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                    <span className="text-slate-500 text-[10px] font-semibold block">1. Sender Account Debited:</span>
                    <div className="font-extrabold text-rose-700 text-sm">-{exactValueBtn} BTN</div>
                    <div className="text-[11px] text-slate-600 truncate font-semibold">{tx.from}</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                    <span className="text-slate-500 text-[10px] font-semibold block">2. Recipient Account Credited:</span>
                    <div className="font-extrabold text-emerald-700 text-sm">+{exactValueBtn} BTN</div>
                    <div className="text-[11px] text-slate-600 truncate font-semibold">{tx.to || 'New Contract'}</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                    <span className="text-slate-500 text-[10px] font-semibold block">3. Miner Gas Fee:</span>
                    <div className="font-extrabold text-slate-900 text-sm">
                      {totalFeeBtn ? `+${totalFeeBtn} BTN` : 'Unknown'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {gasUsed != null && gasPriceGwei ? `${gasUsed.toLocaleString()} gas @ ${gasPriceGwei} Gwei` : 'Fee details unknown'}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 flex items-center justify-between font-mono shadow-2xs">
                  <span>EVM Execution: <strong className="text-slate-900">0x (No Calldata - Native Value Transfer)</strong></span>
                  <span className={`font-bold ${isSuccess ? 'text-emerald-700' : txStatus === 'pending' ? 'text-amber-600' : 'text-rose-700'}`}>
                    {isSuccess ? '100% Finalized • No Revert Risk' : txStatus === 'pending' ? 'Pending Confirmation' : 'Transaction Failed'}
                  </span>
                </div>
              </div>
            </div>
          ) : decodedInput ? (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 font-medium">Invoked Contract Method: </span>
                  <span className="text-[#016976] font-bold text-sm ml-1">{decodedInput.methodName}</span>
                  <span className="text-slate-400 ml-2">({decodedInput.methodId})</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-[#016976] border border-teal-200">
                  Decoded
                </span>
              </div>

              {decodedInput.parameters.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-slate-900 font-bold text-xs">Decoded ABI Parameters:</span>
                  <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    {decodedInput.parameters.map((param, i) => (
                      <div key={i} className="p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="text-slate-500 font-medium">
                          <span className="text-[#016976] font-bold">{param.name}</span>{' '}
                          <span className="text-slate-400">({param.type})</span>
                        </div>
                        <div className="sm:col-span-2 text-slate-900 break-all font-bold">
                          {param.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-center font-medium">
                  This function was executed with no arguments.
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 font-mono text-xs">
              Function Signature: <strong className="text-slate-900 font-bold">{tx.input.slice(0, 10)}</strong> (Unknown ABI / Custom Execution). Calldata can be inspected in the Raw Hex tab.
            </div>
          )
        ) : inputViewMode === 'hex' ? (
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-500 pb-1">
              <span>Raw Calldata Hex ({tx.input && tx.input !== '0x' ? `${(tx.input.length - 2) / 2} Bytes` : '0 Bytes'}):</span>
              <button
                onClick={() => copyToClipboard(tx.input || '0x', 'input-hex')}
                className="inline-flex items-center gap-1.5 text-[#016976] hover:underline font-bold cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedKey === 'input-hex' ? 'Copied!' : 'Copy Hex'}</span>
              </button>
            </div>
            <div className="bg-[#0B132B] rounded-2xl border border-slate-800 p-4 text-emerald-400 break-all max-h-60 overflow-y-auto shadow-inner select-all">
              {tx.input || '0x'}
            </div>
          </div>
        ) : (
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-500 pb-1">
              <span>UTF-8 / ASCII Text Representation:</span>
              {tx.input && tx.input !== '0x' && hexToUtf8(tx.input) && (
                <button
                  onClick={() => copyToClipboard(hexToUtf8(tx.input), 'input-utf8')}
                  className="inline-flex items-center gap-1.5 text-[#016976] hover:underline font-bold cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedKey === 'input-utf8' ? 'Copied!' : 'Copy Text'}</span>
                </button>
              )}
            </div>
            <div className="bg-[#0B132B] rounded-2xl border border-slate-800 p-4 text-emerald-400 whitespace-pre-wrap break-all max-h-60 overflow-y-auto shadow-inner">
              {!tx.input || tx.input === '0x'
                ? '(Standard native BTN transfer with no calldata payload - 0x)'
                : hexToUtf8(tx.input) || 'No printable ASCII / UTF-8 characters found.'}
            </div>
          </div>
        )}
      </div>

      {/* Event Logs Section if logs exist */}
      {receipt?.logs && receipt.logs.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <FileText className="w-5 h-5 text-[#016976]" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Event Logs ({receipt.logs.length})
            </h3>
          </div>

          <div className="space-y-3">
            {receipt.logs.map((log: any, idx: number) => {
              const decoded = decodeEventLog(log);
              return (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-slate-500 border-b border-slate-200 pb-2">
                    <span className="text-[#016976] font-bold">Log #{idx}: {decoded?.name || 'Raw Event'}</span>
                    <span className="text-slate-600 font-semibold">Contract: {log.address}</span>
                  </div>
                  {decoded?.params && Object.keys(decoded.params).length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {Object.entries(decoded.params).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-4">
                          <span className="text-slate-500 font-medium">{k}:</span>
                          <span className="text-slate-900 font-bold break-all">{v as string}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
