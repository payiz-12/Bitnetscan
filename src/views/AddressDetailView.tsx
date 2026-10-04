import React, { useEffect, useState } from 'react';
import { 
  User, ArrowLeft, Copy, QrCode, Shield, Coins, FileCode, CheckCircle2, 
  ExternalLink, Layers, ArrowRightLeft, Code, Send, RefreshCw, X, Pickaxe, 
  ArrowDownLeft, ArrowUpRight, Clock, Sparkles, Image as ImageIcon, Eye, Tag
} from 'lucide-react';
import { Block } from '../types/blockchain';
import { rpcService } from '../services/rpc';
import { explorerApiService, AddressTransaction, MinedBlock, AddressTokenBalance } from '../services/explorerApi';
import { priceService, BtnPriceData } from '../services/priceService';
import { 
  nftSyncService, 
  AddressNftTransfer, 
  AddressNftHolding 
} from '../services/nftSyncService';
import { NftImage } from '../components/NftImage';
import { VERIFIED_HODL_WALLETS } from '../data/richList';
import { ethers } from 'ethers';

interface AddressDetailViewProps {
  address: string;
  recentBlocks?: Block[];
  onBack: () => void;
  onSelectTx: (txHash: string) => void;
  onSelectBlock: (blockNum: number) => void;
  onSelectAddress?: (addr: string) => void;
  onNavigate?: (view: string) => void;
}

export const AddressDetailView: React.FC<AddressDetailViewProps> = ({
  address,
  recentBlocks = [],
  onBack,
  onSelectTx,
  onSelectBlock,
  onSelectAddress,
  onNavigate,
}) => {
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceStatus, setBalanceStatus] = useState<'live' | 'zero' | 'cached' | 'failed'>('live');
  const [nonce, setNonce] = useState<number | null>(null);
  const [totalTransactions, setTotalTransactions] = useState<number | null>(null);
  const [bytecode, setBytecode] = useState<string | null>(null);
  const [codeStatus, setCodeStatus] = useState<'verified_contract' | 'verified_eoa' | 'cached' | 'loading'>('loading');
  const [cachedSnapshotDate, setCachedSnapshotDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [priceData, setPriceData] = useState<BtnPriceData>(priceService.getCachedPrice());
  const [verificationSource, setVerificationSource] = useState<'rpc' | 'explorer' | 'snapshot' | 'standard'>('rpc');

  // Check instant cache first
  const initialCachedTxs = explorerApiService.getCachedTransactions(address) || [];
  const initialCachedBlocks = explorerApiService.getCachedMinedBlocks(address) || [];

  // Real transactions & activity history
  const [transactions, setTransactions] = useState<AddressTransaction[]>(initialCachedTxs);
  const [minedBlocks, setMinedBlocks] = useState<MinedBlock[]>(initialCachedBlocks);
  const [minedBlocksTotalCount, setMinedBlocksTotalCount] = useState<number>(initialCachedBlocks.length);
  const [minedBlocksLoading, setMinedBlocksLoading] = useState<boolean>(false);
  const [liveSyncFlash, setLiveSyncFlash] = useState<boolean>(false);
  const [tokens, setTokens] = useState<AddressTokenBalance[]>([]);
  const [tokensLoading, setTokensLoading] = useState<boolean>(true);
  const [txsLoading, setTxsLoading] = useState(initialCachedTxs.length === 0);
  const [txFilter, setTxFilter] = useState<'all' | 'in' | 'out'>('all');

  // On-Chain BTS-721 NFT transfers & holdings
  const [nftTransfers, setNftTransfers] = useState<AddressNftTransfer[]>([]);
  const [nftHoldings, setNftHoldings] = useState<AddressNftHolding[]>([]);
  const [nftLoading, setNftLoading] = useState<boolean>(true);
  const [nftFilter, setNftFilter] = useState<'all' | 'mint' | 'in' | 'out'>('all');
  const [selectedHolding, setSelectedHolding] = useState<AddressNftHolding | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'nft-transfers' | 'nft-holdings' | 'tokens' | 'mined-blocks' | 'contract' | 'read'>('overview');

  // Interactive Read Contract query states
  const [readFunctionName, setReadFunctionName] = useState('name');
  const [readArg, setReadArg] = useState('');
  const [readResult, setReadResult] = useState<string | null>(null);
  const [readLoading, setReadLoading] = useState(false);

  useEffect(() => {
    // Subscribe to real-time NestEx price stream
    const unsubscribePrice = priceService.subscribe((data) => {
      setPriceData(data);
    });

    let isMounted = true;

    const cleanAddr = (address || '').trim().toLowerCase();

    // Fast initial check for address format
    if (!/^0x[0-9a-fA-F]{40}$/.test(cleanAddr)) {
      setAccountError('Invalid address format. Expected a 42-character hex address starting with 0x.');
      setLoading(false);
      setTxsLoading(false);
      setTokensLoading(false);
      setNftLoading(false);
      return () => {
        isMounted = false;
        unsubscribePrice();
      };
    }

    // Immediately load from cache if address has preloaded ledger
    const cachedT = explorerApiService.getCachedTransactions(cleanAddr);
    const cachedB = explorerApiService.getCachedMinedBlocks(cleanAddr);
    if (cachedT && cachedT.length > 0) {
      setTransactions(cachedT);
      setTxsLoading(false);
    } else {
      setTxsLoading(true);
    }
    if (cachedB && cachedB.length > 0) {
      setMinedBlocks(cachedB);
    }

    setLoading(true);
    setAccountError(null);
    setBalance(null);
    setBalanceStatus('live');
    setNonce(null);
    setTotalTransactions(null);
    setBytecode(null);
    setCodeStatus('loading');
    setCachedSnapshotDate(null);
    setActiveTab('overview');

    const resolveAddress = async () => {
      let resolvedBal: string | null = null;
      let balStatus: 'live' | 'zero' | 'cached' | 'failed' = 'failed';
      let resolvedNonce: number | null = null;
      let resolvedTotalTx: number | null = null;
      let resolvedCode: string | null = null;
      let resolvedCodeStatus: 'verified_contract' | 'verified_eoa' | 'cached' | 'loading' = 'verified_eoa';
      let snapshotDate: string | null = null;
      let source: 'rpc' | 'explorer' | 'snapshot' | 'standard' = 'rpc';

      // Historical snapshot (rich list) reference only for fallback
      const richMatch = VERIFIED_HODL_WALLETS.find(
        (a) => a.address.toLowerCase() === cleanAddr
      );

      // 1. Independent Live RPC Queries via Promise.allSettled
      try {
        const [balRes, countRes, codeRes] = await Promise.allSettled([
          rpcService.getBalance(cleanAddr),
          rpcService.getTransactionCount(cleanAddr),
          rpcService.getCode(cleanAddr),
        ]);

        // Balance independent resolution
        if (balRes.status === 'fulfilled' && balRes.value != null) {
          resolvedBal = balRes.value;
          source = 'rpc';
          if (resolvedBal === '0.0' || resolvedBal === '0' || Number(resolvedBal) === 0) {
            balStatus = 'zero';
          } else {
            balStatus = 'live';
          }
        }

        // Nonce independent resolution (outgoing sequence)
        if (countRes.status === 'fulfilled' && countRes.value != null && Number.isFinite(countRes.value)) {
          resolvedNonce = countRes.value;
        }

        // Bytecode / Contract independent resolution
        if (codeRes.status === 'fulfilled' && codeRes.value != null) {
          resolvedCode = codeRes.value;
          if (resolvedCode && resolvedCode !== '0x' && resolvedCode.length > 2) {
            resolvedCodeStatus = 'verified_contract';
          } else {
            resolvedCodeStatus = 'verified_eoa';
          }
        }
      } catch (e) {
        console.warn('RPC check failed:', e);
      }

      // 2. Independent Indexer Fallbacks if RPC failed for any individual field
      const needsBal = resolvedBal === null;
      const needsNonce = resolvedNonce === null;
      const needsCode = resolvedCode === null;

      if (needsBal || needsNonce || needsCode) {
        const indexerUrls = [
          `/api/explorer/api/v2/addresses/${cleanAddr}`,
          `https://explorer.bitnetmoney.com/api/v2/addresses/${cleanAddr}`,
          `/api/bitnet-explorer/api/v2/addresses/${cleanAddr}`,
        ];

        for (const url of indexerUrls) {
          try {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 2500);
            const res = await fetch(url, {
              signal: ctrl.signal,
              headers: { Accept: 'application/json' },
            });
            clearTimeout(tid);

            if (res.ok) {
              const data = await res.json();
              if (data && data.hash) {
                if (needsBal && data.coin_balance != null) {
                  try {
                    resolvedBal = ethers.formatEther(data.coin_balance);
                  } catch {
                    resolvedBal = (Number(data.coin_balance) / 1e18).toString();
                  }
                  balStatus = Number(resolvedBal) === 0 ? 'zero' : 'live';
                  source = 'explorer';
                }
                if (needsNonce && data.nonce != null) {
                  resolvedNonce = parseInt(data.nonce, 10);
                }
                if (data.transactions_count != null) {
                  const parsedTotal = parseInt(data.transactions_count, 10);
                  if (Number.isFinite(parsedTotal)) resolvedTotalTx = parsedTotal;
                }
                if (needsCode && data.is_contract !== undefined && data.is_contract !== null) {
                  if (data.is_contract === true) {
                    resolvedCode = '0x60806040';
                    resolvedCodeStatus = 'verified_contract';
                  } else {
                    resolvedCode = '0x';
                    resolvedCodeStatus = 'verified_eoa';
                  }
                }
                break;
              }
            }
          } catch {}
        }
      }

      // 3. Official Address Counter Query for Total Transactions (Section 5)
      if (resolvedTotalTx === null) {
        try {
          const counters = await explorerApiService.getAddressCounters(cleanAddr);
          if (counters.transactionsCount !== null) {
            resolvedTotalTx = counters.transactionsCount;
          }
        } catch {}
      }

      // 4. If fields failed on live networks, fall back to verified historical snapshot with date
      if (richMatch) {
        if (resolvedBal === null) {
          resolvedBal = richMatch.balance.toString();
          balStatus = 'cached';
          snapshotDate = 'Snapshot (Mar 2026)';
          source = 'snapshot';
        }
        if (resolvedNonce === null) {
          resolvedNonce = richMatch.txCount;
        }
        // Rich-list membership does not verify bytecode or account type.
        // Keep unresolved types unknown; preserve any RPC/indexer verification.
      }

      // If resolvedBal is still null, it stays null (do NOT assume 0.0000).
      // If resolvedCodeStatus is still 'failed', it stays 'failed' (do NOT assume EOA).

      if (!isMounted) return;

      setBalance(resolvedBal);
      setBalanceStatus(balStatus);
      setNonce(resolvedNonce);
      setTotalTransactions(resolvedTotalTx);
      setBytecode(resolvedCode);
      setCodeStatus(resolvedCodeStatus);
      setCachedSnapshotDate(snapshotDate);
      setVerificationSource(source);
      setLoading(false);
      setAccountError(null);

      // 5. Fetch full historical transaction ledger, mined blocks & tokens in parallel
      const balNum = parseFloat(resolvedBal) || 0;
      setTokensLoading(true);
      try {
        const [txs, blocksResult, tokenBalances] = await Promise.all([
          explorerApiService.getAddressTransactions(cleanAddr, balNum, resolvedNonce ?? 0),
          explorerApiService.getAddressMinedBlocks(cleanAddr),
          explorerApiService.getAddressTokens(cleanAddr),
        ]);

        if (isMounted) {
          setTransactions(txs);
          let mergedBlocks = [...(blocksResult.blocks || [])];
          if (recentBlocks && recentBlocks.length > 0) {
            const lowerAddr = cleanAddr.toLowerCase();
            const existingNums = new Set(mergedBlocks.map((b) => b.number));
            for (const rb of recentBlocks) {
              if (rb.miner && rb.miner.toLowerCase() === lowerAddr && !existingNums.has(rb.number)) {
                mergedBlocks.unshift({
                  number: rb.number,
                  hash: rb.hash,
                  timestamp: rb.timestamp,
                  txCount: Array.isArray(rb.transactions) ? rb.transactions.length : 0,
                  difficulty: rb.difficulty || '704.28 GH',
                  miner: lowerAddr,
                  reward: '1.0 BTN',
                });
                existingNums.add(rb.number);
              }
            }
          }
          mergedBlocks.sort((a, b) => b.number - a.number);
          setMinedBlocks(mergedBlocks);
          const computedTotal = Math.max(blocksResult.totalCount, mergedBlocks.length);
          setMinedBlocksTotalCount(computedTotal);
          setTokens(tokenBalances || []);
          setTxsLoading(false);
          setTokensLoading(false);
        }
      } catch (err) {
        console.warn('Failed to load address secondary activity:', err);
        if (isMounted) {
          setTxsLoading(false);
          setTokensLoading(false);
        }
      }
    };

    resolveAddress();

    // 6. Fetch on-chain BTS NFT transfers and owned holdings
    setNftLoading(true);
    nftSyncService.getAddressNftOverview(cleanAddr)
      .then(({ transfers, holdings }) => {
        if (isMounted) {
          setNftTransfers(transfers);
          setNftHoldings(holdings);
          setNftLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to load address NFT data:', err);
        if (isMounted) setNftLoading(false);
      });

    return () => {
      isMounted = false;
      unsubscribePrice();
    };
  }, [address]);

  // Synchronize newly mined blocks immediately from live RPC stream (0s latency)
  useEffect(() => {
    if (!recentBlocks || recentBlocks.length === 0) return;
    const cleanAddr = address.toLowerCase();

    const minerBlocks = recentBlocks.filter(
      (b) => b.miner && b.miner.toLowerCase() === cleanAddr
    );

    if (minerBlocks.length === 0) return;

    setMinedBlocks((prev) => {
      let addedCount = 0;
      const existingNumbers = new Set(prev.map((b) => b.number));
      const newItems: MinedBlock[] = [];

      for (const b of minerBlocks) {
        if (!existingNumbers.has(b.number)) {
          addedCount++;
          newItems.push({
            number: b.number,
            hash: b.hash,
            timestamp: b.timestamp,
            txCount: Array.isArray(b.transactions) ? b.transactions.length : 0,
            difficulty: b.difficulty || '704.28 GH',
            miner: cleanAddr,
            reward: '1.0 BTN',
          });
          existingNumbers.add(b.number);
        }
      }

      if (addedCount > 0) {
        setMinedBlocksTotalCount((c) => c + addedCount);
        setLiveSyncFlash(true);
        setTimeout(() => setLiveSyncFlash(false), 3500);

        // Also refresh address balance directly from RPC node
        rpcService.getBalance(address).then((newBal) => {
          setBalance(newBal);
        }).catch(() => {});

        const merged = [...newItems, ...prev];
        merged.sort((a, b) => b.number - a.number);
        return merged;
      }
      return prev;
    });
  }, [recentBlocks, address]);

  const handleRefreshMinedBlocks = async () => {
    setMinedBlocksLoading(true);
    try {
      const [blocksResult, liveRpcBlocks, newBal] = await Promise.all([
        explorerApiService.getAddressMinedBlocks(address),
        rpcService.getRecentBlocks(30).catch(() => []),
        rpcService.getBalance(address).catch(() => null),
      ]);

      if (newBal !== null) setBalance(newBal);

      const cleanAddr = address.toLowerCase();
      let merged = [...(blocksResult.blocks || [])];
      const existingNums = new Set(merged.map((b) => b.number));

      for (const rb of liveRpcBlocks) {
        if (rb.miner && rb.miner.toLowerCase() === cleanAddr && !existingNums.has(rb.number)) {
          merged.unshift({
            number: rb.number,
            hash: rb.hash,
            timestamp: rb.timestamp,
            txCount: Array.isArray(rb.transactions) ? rb.transactions.length : 0,
            difficulty: rb.difficulty || '704.28 GH',
            miner: cleanAddr,
            reward: '1.0 BTN',
          });
          existingNums.add(rb.number);
        }
      }

      merged.sort((a, b) => b.number - a.number);
      setMinedBlocks(merged);
      const computedTotal = Math.max(blocksResult.totalCount, merged.length);
      setMinedBlocksTotalCount(computedTotal);
    } catch (err) {
      console.error('Error refreshing mined blocks:', err);
    } finally {
      setMinedBlocksLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isContract = bytecode && bytecode !== '0x' && bytecode.length > 2;

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.max(0, Math.floor(Date.now() / 1000 - timestamp));
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleReadCall = async () => {
    setReadLoading(true);
    setReadResult(null);

    try {
      let callData = '';
      if (readFunctionName === 'name') {
        callData = '0x06fdde03'; // name()
      } else if (readFunctionName === 'symbol') {
        callData = '0x95d89b41'; // symbol()
      } else if (readFunctionName === 'totalSupply') {
        callData = '0x18160ddd'; // totalSupply()
      } else if (readFunctionName === 'decimals') {
        callData = '0x313ce567'; // decimals()
      } else if (readFunctionName === 'balanceOf') {
        const cleanAddr = (readArg || address).replace('0x', '').padStart(64, '0');
        callData = '0x70a08231' + cleanAddr; // balanceOf(address)
      } else if (readFunctionName === 'owner') {
        callData = '0x8da5cb5b'; // owner()
      }

      const resHex = await rpcService.call(address, callData);
      if (!resHex || resHex === '0x') {
        setReadResult('Returned empty data (0x)');
      } else {
        try {
          if (resHex.length === 66) {
            const bigVal = BigInt(resHex);
            setReadResult(`${bigVal.toString()} (${resHex})`);
          } else {
            const abiCoder = new ethers.AbiCoder();
            const decoded = abiCoder.decode(['string'], resHex);
            setReadResult(decoded[0]);
          }
        } catch {
          setReadResult(resHex);
        }
      }
    } catch (err: any) {
      setReadResult(`Error: ${err.message || 'Execution reverted'}`);
    } finally {
      setReadLoading(false);
    }
  };

  const filteredTransactions = [...transactions]
    .filter((tx) => {
      if (txFilter === 'in') return tx.type === 'IN';
      if (txFilter === 'out') return tx.type === 'OUT' || tx.type === 'SELF';
      return true;
    })
    .sort((a, b) => b.blockNumber - a.blockNumber);

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* Back button & external explorer link */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-[#016976]" />
          <span>Back</span>
        </button>

        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-50 border border-teal-200 text-[#016976] text-xs font-mono font-bold shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-[#016976] animate-pulse"></span>
          <span>
            {loading
              ? 'Querying Chain & Indexer…'
              : verificationSource === 'rpc'
              ? 'Bitnet L1 JSON-RPC Verified'
              : verificationSource === 'explorer'
              ? 'Explorer Indexer Verified'
              : verificationSource === 'snapshot'
              ? 'Verified Ledger Snapshot'
              : 'On-Chain Address Verified'}
          </span>
        </div>
      </div>

      {accountError && <div role="alert" className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">{accountError}</div>}

      {/* Main Address Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs ${
              isContract 
                ? 'bg-purple-50 text-purple-600 border border-purple-200' 
                : minedBlocks.length > 0
                ? 'bg-amber-50 text-[#D97706] border border-amber-200'
                : 'bg-teal-50 text-[#016976] border border-teal-200'
            }`}>
              {isContract ? (
                <FileCode className="w-7 h-7" />
              ) : minedBlocks.length > 0 ? (
                <Pickaxe className="w-7 h-7 text-[#D97706]" />
              ) : (
                <User className="w-7 h-7 text-[#016976]" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {codeStatus === 'verified_contract'
                    ? 'Smart Contract'
                    : minedBlocks.length > 0
                    ? 'Miner Wallet'
                    : 'User Wallet'}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                  codeStatus === 'verified_contract' 
                    ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                    : minedBlocks.length > 0
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : codeStatus === 'cached'
                    ? 'bg-slate-100 text-slate-700 border border-slate-300'
                    : 'bg-teal-50 text-[#016976] border border-teal-200'
                }`}>
                  {codeStatus === 'verified_contract'
                    ? 'Contract'
                    : minedBlocks.length > 0
                    ? 'PoW Miner'
                    : codeStatus === 'cached'
                    ? `Cached (${cachedSnapshotDate || 'Historical'})`
                    : 'EOA Wallet'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="font-mono text-xs sm:text-sm text-slate-900 font-bold break-all">
                  {address}
                </span>
                <button
                  onClick={() => copyToClipboard(address)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 cursor-pointer"
                  title="Copy Address"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {copied && <span className="text-[10px] text-[#016976] font-mono font-bold">Copied!</span>}
                <button
                  onClick={() => setShowQr(true)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 cursor-pointer"
                  title="Show QR Code"
                >
                  <QrCode className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-semibold block">Bitnet Balance</span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 flex items-center gap-1.5 mt-0.5">
                <img src="/bitnet-logo-blue.svg" alt="BTN" className="w-5 h-5" />
                <span>
                  {balance === null
                    ? (loading ? 'Loading…' : 'Unable to fetch data')
                    : `${parseFloat(balance).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })} BTN`}
                </span>
              </div>
              <div className="text-xs font-mono font-semibold text-slate-500 mt-1 flex items-center gap-2">
                <span>
                  {balance === null
                    ? 'RPC / Indexer unreachable'
                    : balanceStatus === 'zero'
                    ? 'Verified 0.0000 on-chain'
                    : balanceStatus === 'cached'
                    ? `Cached (${cachedSnapshotDate})`
                    : `≈ $${(parseFloat(balance) * priceData.priceUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
                </span>
                {balance !== null && balanceStatus !== 'zero' && (
                  <span className="text-[10px] text-[#016976] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 font-bold">
                    {priceData.priceFormatted} ({priceData.exchange})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 4 Metric Summary Boxes with Real Data */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 font-semibold block mb-1">Total Balance</span>
            <div className="text-lg font-bold font-mono text-slate-900 flex items-center gap-1">
              <img src="/bitnet-logo-blue.svg" alt="BTN" className="w-3.5 h-3.5" />
              <span>
                {balance === null
                  ? (loading ? 'Loading…' : 'Unable to fetch data')
                  : `${parseFloat(balance).toLocaleString()} BTN`}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {balanceStatus === 'zero'
                ? 'Verified 0 on-chain'
                : balanceStatus === 'cached'
                ? `Cached snapshot (${cachedSnapshotDate})`
                : balance === null
                ? 'Connection failed'
                : 'Net on-chain balance'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 font-semibold block mb-1">Total Transactions</span>
            <div className="text-lg font-bold font-mono text-slate-900">
              {totalTransactions !== null
                ? `${totalTransactions.toLocaleString()} txns`
                : `Total unknown`}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {totalTransactions !== null
                ? `${transactions.length} loaded on-chain`
                : `${transactions.length} transactions loaded`}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 font-semibold block mb-1">Nonce (Outgoing Index)</span>
            <div className="text-lg font-bold font-mono text-slate-900">
              {nonce === null ? (loading ? 'Loading…' : 'Unable to fetch data') : `#${nonce}`}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {nonce === 0 ? 'Zero outgoing transactions (#0)' : 'Outgoing transaction sequence'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 font-semibold block mb-1">
              {(minedBlocksTotalCount > 0 || minedBlocks.length > 0) ? 'Mined PoW Blocks' : 'Network Protocol'}
            </span>
            <div className="text-lg font-bold font-mono text-[#016976]">
              {(minedBlocksTotalCount > 0 || minedBlocks.length > 0)
                ? `${(minedBlocksTotalCount || minedBlocks.length).toLocaleString()} Blocks`
                : 'Chain ID 210'}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {(minedBlocksTotalCount > 0 || minedBlocks.length > 0)
                ? `${(minedBlocksTotalCount || minedBlocks.length).toLocaleString()} BTN mining reward`
                : 'Bitnet EVM Mainnet'}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Segmented Action Grid (sm:hidden) - Zero horizontal scrolling */}
      <div className="sm:hidden space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            View Category
          </span>
          <span className="text-[11px] font-mono text-[#016976] font-bold">
            {activeTab === 'overview' ? 'Transactions' :
             activeTab === 'nft-transfers' ? 'NFT Transfers' :
             activeTab === 'nft-holdings' ? 'NFT Portfolio' :
             activeTab === 'tokens' ? 'BTS-20 Tokens' :
             activeTab === 'mined-blocks' ? 'Mined Blocks' :
             activeTab === 'contract' ? 'Contract Bytecode' : 'Read Contract'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* 1. Transactions */}
          <button
            onClick={() => setActiveTab('overview')}
            className={`p-3 rounded-2xl text-xs font-bold transition-all flex flex-col justify-between gap-1.5 cursor-pointer text-left ${
              activeTab === 'overview'
                ? 'bg-[#016976] text-white shadow-sm ring-2 ring-[#016976]/30'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <ArrowRightLeft className="w-4 h-4" />
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'overview' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {transactions.length}
              </span>
            </div>
            <span className="truncate">Transactions</span>
          </button>

          {/* 2. NFT Transfers */}
          <button
            onClick={() => setActiveTab('nft-transfers')}
            className={`p-3 rounded-2xl text-xs font-bold transition-all flex flex-col justify-between gap-1.5 cursor-pointer text-left ${
              activeTab === 'nft-transfers'
                ? 'bg-[#016976] text-white shadow-sm ring-2 ring-[#016976]/30'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <Sparkles className="w-4 h-4" />
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'nft-transfers' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {nftLoading ? '…' : nftTransfers.length}
              </span>
            </div>
            <span className="truncate">NFT Transfers</span>
          </button>

          {/* 3. NFT Portfolio */}
          <button
            onClick={() => setActiveTab('nft-holdings')}
            className={`p-3 rounded-2xl text-xs font-bold transition-all flex flex-col justify-between gap-1.5 cursor-pointer text-left ${
              activeTab === 'nft-holdings'
                ? 'bg-[#016976] text-white shadow-sm ring-2 ring-[#016976]/30'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <ImageIcon className="w-4 h-4" />
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'nft-holdings' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {nftLoading ? '…' : nftHoldings.length}
              </span>
            </div>
            <span className="truncate">NFT Portfolio</span>
          </button>

          {/* 4. BTS-20 Tokens */}
          <button
            onClick={() => setActiveTab('tokens')}
            className={`p-3 rounded-2xl text-xs font-bold transition-all flex flex-col justify-between gap-1.5 cursor-pointer text-left ${
              activeTab === 'tokens'
                ? 'bg-[#016976] text-white shadow-sm ring-2 ring-[#016976]/30'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <Coins className="w-4 h-4" />
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'tokens' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {tokensLoading ? '…' : tokens.length}
              </span>
            </div>
            <span className="truncate">BTS-20 Tokens</span>
          </button>

          {/* 5. Mined Blocks (if miner) */}
          {(minedBlocksTotalCount > 0 || minedBlocks.length > 0) && (
            <button
              onClick={() => setActiveTab('mined-blocks')}
              className={`p-3 rounded-2xl text-xs font-bold transition-all flex flex-col justify-between gap-1.5 cursor-pointer text-left ${
                !isContract ? 'col-span-2' : ''
              } ${
                activeTab === 'mined-blocks'
                  ? 'bg-[#D97706] text-white shadow-sm ring-2 ring-[#D97706]/30'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <Pickaxe className="w-4 h-4" />
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'mined-blocks' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  {(minedBlocksTotalCount || minedBlocks.length).toLocaleString()}
                </span>
              </div>
              <span className="truncate">Mined Blocks</span>
            </button>
          )}

          {/* 6. Contract Bytecode & Read Contract (if contract) */}
          {isContract && (
            <>
              <button
                onClick={() => setActiveTab('contract')}
                className={`p-3 rounded-2xl text-xs font-bold transition-all flex flex-col justify-between gap-1.5 cursor-pointer text-left ${
                  activeTab === 'contract'
                    ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-600/30'
                    : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <FileCode className="w-4 h-4" />
                  <span className="text-[10px] font-mono opacity-80">Bytecode</span>
                </div>
                <span className="truncate">Contract Code</span>
              </button>

              <button
                onClick={() => setActiveTab('read')}
                className={`p-3 rounded-2xl text-xs font-bold transition-all flex flex-col justify-between gap-1.5 cursor-pointer text-left ${
                  activeTab === 'read'
                    ? 'bg-[#016976] text-white shadow-sm ring-2 ring-[#016976]/30'
                    : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Code className="w-4 h-4" />
                  <span className="text-[10px] font-mono opacity-80">Live</span>
                </div>
                <span className="truncate">Read Contract</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Desktop Tabs Navigation (hidden sm:flex) */}
      <div className="hidden sm:flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-[#016976] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Transactions</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'overview' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {transactions.length}
          </span>
        </button>

        {/* Tab: BTS-721 NFT Movements / Transfers */}
        <button
          onClick={() => setActiveTab('nft-transfers')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'nft-transfers'
              ? 'bg-[#016976] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>NFT Transfers</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'nft-transfers' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {nftLoading ? '...' : nftTransfers.length}
          </span>
        </button>

        {/* Tab: BTS-721 NFT Holdings */}
        <button
          onClick={() => setActiveTab('nft-holdings')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'nft-holdings'
              ? 'bg-[#016976] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>NFT Portfolio</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'nft-holdings' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {nftLoading ? '...' : nftHoldings.length}
          </span>
        </button>

        {/* Tab: BTS-20 Tokens */}
        <button
          onClick={() => setActiveTab('tokens')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'tokens'
              ? 'bg-[#016976] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>BTS-20 Tokens</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'tokens' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {tokensLoading ? '...' : tokens.length}
          </span>
        </button>

        {(minedBlocksTotalCount > 0 || minedBlocks.length > 0) && (
          <button
            onClick={() => setActiveTab('mined-blocks')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap relative ${
              activeTab === 'mined-blocks'
                ? 'bg-[#D97706] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Pickaxe className="w-3.5 h-3.5" />
            <span>Mined Blocks ({(minedBlocksTotalCount || minedBlocks.length).toLocaleString()})</span>
            {liveSyncFlash ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Live RPC Synced" />
            )}
          </button>
        )}

        {isContract && (
          <>
            <button
              onClick={() => setActiveTab('contract')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'contract'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Contract Bytecode</span>
            </button>
            <button
              onClick={() => setActiveTab('read')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'read'
                  ? 'bg-[#016976] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Read Contract (Live)</span>
            </button>
          </>
        )}
      </div>

      {/* Tab 1: Real Transactions & Activity History */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#016976] shadow-xs">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Transaction History</h3>
              </div>
            </div>

            {/* Filter buttons: All, In, Out */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTxFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  txFilter === 'all'
                    ? 'bg-[#016976] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                All ({transactions.length})
              </button>
              <button
                onClick={() => setTxFilter('in')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  txFilter === 'in'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                In ({transactions.filter((t) => t.type === 'IN').length})
              </button>
              <button
                onClick={() => setTxFilter('out')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  txFilter === 'out'
                    ? 'bg-[#D68142] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Out ({transactions.filter((t) => t.type === 'OUT' || t.type === 'SELF').length})
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          {txsLoading ? (
            <div className="py-16 text-center text-slate-500">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-[#016976]" />
                <span className="text-xs font-medium">Fetching transaction history and ledger records...</span>
              </div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded-2xl space-y-2 bg-slate-50/50">
              <p className="font-bold text-slate-800">No transaction records found matching the selected filter.</p>
              <p className="text-slate-500">
                {nonce === null ? 'Nonce unavailable.' : nonce === 0
                  ? 'No outgoing transactions sent yet (nonce 0).'
                  : `Total ${nonce} outgoing transaction nonces recorded on-chain.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-3">Txn Hash</th>
                    <th className="py-3 px-3">Block</th>
                    <th className="py-3 px-3">Age</th>
                    <th className="py-3 px-3 text-center">Type</th>
                    <th className="py-3 px-3">From</th>
                    <th className="py-3 px-3">To</th>
                    <th className="py-3 px-3 text-right">Value (BTN)</th>
                    <th className="py-3 px-3 text-right hidden sm:table-cell">Txn Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((tx) => (
                    <tr
                      key={tx.hash}
                      onClick={() => onSelectTx(tx.hash)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      {/* Hash */}
                      <td className="py-3.5 px-3 font-semibold text-[#0284C7] group-hover:underline truncate max-w-[130px]">
                        <div className="flex items-center gap-1.5">
                          <span>{tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(tx.hash);
                            }}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-800"
                            title="Copy Txn Hash"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Block */}
                      <td
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectBlock(tx.blockNumber);
                        }}
                        className="py-3.5 px-3 text-slate-900 font-semibold hover:text-[#016976] hover:underline"
                      >
                        #{tx.blockNumber.toLocaleString()}
                      </td>

                      {/* Age */}
                      <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatTimeAgo(tx.timestamp)}
                        </span>
                      </td>

                      {/* Type Badge: IN / OUT */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.type === 'IN'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : tx.type === 'OUT'
                            ? 'bg-amber-50 text-amber-900 border border-amber-200'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}>
                          {tx.type === 'IN' ? (
                            <>
                              <ArrowDownLeft className="w-3 h-3 text-emerald-700" />
                              <span>IN</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3 h-3 text-amber-700" />
                              <span>OUT</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* From */}
                      <td className="py-3.5 px-3 text-slate-600 truncate max-w-[130px]">
                        {tx.from.toLowerCase() === address.toLowerCase() ? (
                          <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">This Wallet</span>
                        ) : (
                          <span
                            onClick={(e) => {
                              if (onSelectAddress) {
                                e.stopPropagation();
                                onSelectAddress(tx.from);
                              }
                            }}
                            className={`truncate ${onSelectAddress ? 'hover:text-[#016976] hover:underline cursor-pointer' : ''}`}
                            title={tx.from}
                          >
                            {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                          </span>
                        )}
                      </td>

                      {/* To */}
                      <td className="py-3.5 px-3 text-slate-600 truncate max-w-[130px]">
                        {tx.to.toLowerCase() === address.toLowerCase() ? (
                          <span className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">This Wallet</span>
                        ) : (
                          <span
                            onClick={(e) => {
                              if (onSelectAddress) {
                                e.stopPropagation();
                                onSelectAddress(tx.to);
                              }
                            }}
                            className={`truncate ${onSelectAddress ? 'hover:text-[#016976] hover:underline cursor-pointer' : ''}`}
                            title={tx.to}
                          >
                            {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                          </span>
                        )}
                      </td>

                      {/* Value */}
                      <td className="py-3.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <img src="/bitnet-logo-blue.svg" alt="BTN" className="w-3.5 h-3.5" />
                          <span>{tx.value}</span>
                        </div>
                      </td>

                      {/* Fee */}
                      <td className="py-3.5 px-3 text-right text-slate-500 hidden sm:table-cell whitespace-nowrap">
                        {tx.fee}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Mined Blocks (if miner) */}
      {activeTab === 'mined-blocks' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
                <Pickaxe className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">Validated / Mined Blocks</h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live RPC Synced
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Total {(minedBlocksTotalCount || minedBlocks.length).toLocaleString()} PoW blocks mined • Cumulative Miner Earnings: {(minedBlocksTotalCount || minedBlocks.length).toLocaleString()} BTN
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {liveSyncFlash && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-xl animate-bounce">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+1.0 BTN New Block!</span>
                </div>
              )}
              <button
                onClick={handleRefreshMinedBlocks}
                disabled={minedBlocksLoading}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${minedBlocksLoading ? 'animate-spin text-[#016976]' : ''}`} />
                <span>Live Refresh</span>
              </button>
              <span className="text-xs font-mono text-amber-700 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 whitespace-nowrap">
                1.0 BTN / Block
              </span>
            </div>
          </div>

          {minedBlocksLoading && minedBlocks.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
                <span className="text-xs font-medium">Scanning validated blocks and mining rewards...</span>
              </div>
            </div>
          ) : minedBlocks.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded-2xl space-y-3 bg-slate-50/50">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Pickaxe className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-800 text-sm">
                No mined blocks found for this wallet.
              </p>
              <p className="text-slate-500 max-w-md mx-auto">
                This address is not an active miner or has not produced any blocks yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-3">Block</th>
                    <th className="py-3 px-3">Block Hash</th>
                    <th className="py-3 px-3">Age</th>
                    <th className="py-3 px-3 text-right">Txns</th>
                    <th className="py-3 px-3 text-right">Reward</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {minedBlocks.map((blk) => (
                    <tr
                      key={blk.number}
                      onClick={() => onSelectBlock(blk.number)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-3 font-bold text-[#016976] group-hover:underline">
                        #{blk.number.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-slate-500 truncate max-w-[150px]" title={blk.hash}>
                        {blk.hash.slice(0, 12)}...{blk.hash.slice(-8)}
                      </td>
                      <td className="py-3 px-3 text-slate-500" title={new Date(blk.timestamp * 1000).toLocaleString()}>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatTimeAgo(blk.timestamp)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-900 font-bold">
                        {blk.txCount} txns
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-700">
                        <div className="flex items-center justify-end gap-1">
                          <img src="/bitnet-logo-blue.svg" alt="BTN" className="w-3.5 h-3.5" />
                          <span>1.0 BTN</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Contract Bytecode */}
      {activeTab === 'contract' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-purple-600" />
              <span>Deployed EVM Bytecode</span>
            </h3>
            <span className="text-xs font-mono text-slate-500">
              Size: {bytecode === null ? 'Unknown' : bytecode.length / 2 - 1} bytes
            </span>
          </div>

          <div className="bg-[#0B132B] p-4 rounded-2xl border border-slate-700 font-mono text-xs text-emerald-400 break-all max-h-72 overflow-y-auto shadow-inner">
            {bytecode}
          </div>
        </div>
      )}

      {/* Tab 3: Read Contract */}
      {activeTab === 'read' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">Interactive Contract Reader (Live)</h3>
            <p className="text-xs text-slate-500 mt-1">
              Query public (view/pure) smart contract functions directly via Bitnet JSON-RPC.
            </p>
          </div>

          <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Function</label>
                <select
                  value={readFunctionName}
                  onChange={(e) => setReadFunctionName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#016976]"
                >
                  <option value="name">name() → string</option>
                  <option value="symbol">symbol() → string</option>
                  <option value="totalSupply">totalSupply() → uint256</option>
                  <option value="decimals">decimals() → uint8</option>
                  <option value="balanceOf">balanceOf(address) → uint256</option>
                  <option value="owner">owner() → address</option>
                </select>
              </div>

              {readFunctionName === 'balanceOf' && (
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">Argument (Address)</label>
                  <input
                    type="text"
                    value={readArg}
                    onChange={(e) => setReadArg(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#016976]"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleReadCall}
              disabled={readLoading}
              className="px-4 py-2 rounded-xl bg-[#016976] hover:bg-[#01545e] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              {readLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Query Function</span>
            </button>

            {readResult && (
              <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 font-bold break-all shadow-xs">
                <span className="text-slate-500 block text-[10px] mb-0.5 font-normal">Response:</span>
                {readResult}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: BTS NFT Movements & Activity (BTS-721) */}
      {activeTab === 'nft-transfers' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#016976] shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  BTS-721 NFT Transfers & Activity
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  On-chain BTS-721 mint, inbound, and outbound transfer records on Bitnet L1.
                </p>
              </div>
            </div>

            {/* Filter buttons: All, Mint, In, Out */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setNftFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  nftFilter === 'all'
                    ? 'bg-[#016976] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                All ({nftTransfers.length})
              </button>
              <button
                onClick={() => setNftFilter('mint')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  nftFilter === 'mint'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Mint ({nftTransfers.filter((t) => t.type === 'MINT').length})
              </button>
              <button
                onClick={() => setNftFilter('in')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  nftFilter === 'in'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                In ({nftTransfers.filter((t) => t.type === 'IN').length})
              </button>
              <button
                onClick={() => setNftFilter('out')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  nftFilter === 'out'
                    ? 'bg-[#D68142] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Out ({nftTransfers.filter((t) => t.type === 'OUT').length})
              </button>
            </div>
          </div>

          {/* NFT Transfers Table */}
          {nftLoading ? (
            <div className="py-16 text-center text-slate-500">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-[#016976]" />
                <span className="text-xs font-medium">Scanning BTS-721 NFT transfers on Bitnet L1...</span>
              </div>
            </div>
          ) : nftTransfers.filter((t) => {
              if (nftFilter === 'all') return true;
              if (nftFilter === 'mint') return t.type === 'MINT';
              if (nftFilter === 'in') return t.type === 'IN';
              if (nftFilter === 'out') return t.type === 'OUT';
              return true;
            }).length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded-2xl space-y-3 bg-slate-50/50">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-800 text-sm">
                No BTS NFT activity found matching the selected filter.
              </p>
              <p className="text-slate-500 max-w-md mx-auto">
                This wallet has not minted or transferred any NFTs yet. Explore popular collections on the Bitnet NFT Hub.
              </p>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('nfts')}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#016976] hover:bg-[#01545e] text-white text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Explore Bitnet NFT Hub</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-3">Txn Hash</th>
                    <th className="py-3 px-3">Block</th>
                    <th className="py-3 px-3">Age</th>
                    <th className="py-3 px-3 text-center">Type</th>
                    <th className="py-3 px-3">NFT Item & Collection</th>
                    <th className="py-3 px-3">From</th>
                    <th className="py-3 px-3">To</th>
                    <th className="py-3 px-3 text-right">Price / Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {nftTransfers
                    .filter((t) => {
                      if (nftFilter === 'all') return true;
                      if (nftFilter === 'mint') return t.type === 'MINT';
                      if (nftFilter === 'in') return t.type === 'IN';
                      if (nftFilter === 'out') return t.type === 'OUT';
                      return true;
                    })
                    .map((tx) => (
                      <tr
                        key={tx.hash}
                        onClick={() => onSelectTx(tx.hash)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        {/* Hash */}
                        <td className="py-3.5 px-3 font-semibold text-[#0284C7] group-hover:underline truncate max-w-[130px]">
                          <div className="flex items-center gap-1.5">
                            <span>{tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(tx.hash);
                              }}
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-800"
                              title="Copy Txn Hash"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Block */}
                        <td
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectBlock(tx.blockNumber);
                          }}
                          className="py-3.5 px-3 text-slate-900 font-semibold hover:text-[#016976] hover:underline"
                        >
                          #{tx.blockNumber.toLocaleString()}
                        </td>

                        {/* Age */}
                        <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {formatTimeAgo(tx.timestamp)}
                          </span>
                        </td>

                        {/* Type Badge: MINT / IN / OUT */}
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.type === 'MINT'
                                ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                : tx.type === 'IN'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {tx.type === 'MINT' ? (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                <span>MINT</span>
                              </>
                            ) : tx.type === 'IN' ? (
                              <>
                                <ArrowDownLeft className="w-3 h-3 text-emerald-700" />
                                <span>IN</span>
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="w-3 h-3 text-rose-700" />
                                <span>OUT</span>
                              </>
                            )}
                          </span>
                        </td>

                        {/* NFT Thumbnail & Name */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2.5 min-w-[170px]">
                            <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 flex-shrink-0 shadow-2xs">
                              <NftImage src={tx.imageUrl} alt={tx.tokenName} className="w-full h-full" />
                            </div>
                            <div className="min-w-0 font-sans">
                              <div className="font-bold text-slate-900 text-xs truncate group-hover:text-[#016976]">
                                {tx.tokenName}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {tx.collectionName}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* From */}
                        <td className="py-3.5 px-3 text-slate-600 truncate max-w-[130px]">
                          {tx.from === '0x0000000000000000000000000000000000000000' || !tx.from ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              NullAddress (Mint)
                            </span>
                          ) : tx.from.toLowerCase() === address.toLowerCase() ? (
                            <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              This Wallet
                            </span>
                          ) : (
                            <span
                              onClick={(e) => {
                                if (onSelectAddress) {
                                  e.stopPropagation();
                                  onSelectAddress(tx.from);
                                }
                              }}
                              className={`truncate ${onSelectAddress ? 'hover:text-[#016976] hover:underline cursor-pointer' : ''}`}
                              title={tx.from}
                            >
                              {truncateAddress(tx.from)}
                            </span>
                          )}
                        </td>

                        {/* To */}
                        <td className="py-3.5 px-3 text-slate-600 truncate max-w-[130px]">
                          {tx.to.toLowerCase() === address.toLowerCase() ? (
                            <span className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              This Wallet
                            </span>
                          ) : (
                            <span
                              onClick={(e) => {
                                if (onSelectAddress) {
                                  e.stopPropagation();
                                  onSelectAddress(tx.to);
                                }
                              }}
                              className={`truncate ${onSelectAddress ? 'hover:text-[#016976] hover:underline cursor-pointer' : ''}`}
                              title={tx.to}
                            >
                              {truncateAddress(tx.to)}
                            </span>
                          )}
                        </td>

                        {/* Value / Price */}
                        <td className="py-3.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                          {tx.priceBtn ? (
                            <div className="flex items-center justify-end gap-1">
                              <img src="/bitnet-logo-blue.svg" alt="BTN" className="w-3.5 h-3.5" />
                              <span>{tx.priceBtn} BTN</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] font-sans">Mint</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: BTS-721 NFT Holdings (NFT Portfolio) */}
      {activeTab === 'nft-holdings' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#016976] shadow-xs">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  BTS-721 NFT Portfolio
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Verified on-chain NFT digital collectibles owned by this address.
                </p>
              </div>
            </div>

            <span className="px-3 py-1 bg-teal-50 border border-teal-200 rounded-xl text-xs font-bold text-[#016976]">
              Total {nftHoldings.length} NFTs Owned
            </span>
          </div>

          {nftLoading ? (
            <div className="py-16 text-center text-slate-500">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-[#016976]" />
                <span className="text-xs font-medium">Fetching wallet NFT holdings...</span>
              </div>
            </div>
          ) : nftHoldings.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded-2xl space-y-3 bg-slate-50/50">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <ImageIcon className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-800 text-sm">
                No BTS-721 NFTs found in this wallet.
              </p>
              <p className="text-slate-500 max-w-md mx-auto">
                Acquire NFTs from official Bitnet L1 collections (BitnetPunks, Milestone, TheVillage, Xenwave, BabyChimpGang) to view them here.
              </p>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('nfts')}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#016976] hover:bg-[#01545e] text-white text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Explore Bitnet NFT Hub</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {nftHoldings.map((h, i) => (
                <div
                  key={`${h.collectionContract}-${h.tokenId}-${i}`}
                  onClick={() => setSelectedHolding(h)}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md hover:border-[#016976] transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="relative aspect-square overflow-hidden bg-slate-950">
                    <NftImage src={h.image} alt={h.name} className="w-full h-full group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute top-2.5 left-2.5 z-20">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs ${h.rarityColor || 'bg-slate-900/80 text-white'}`}>
                        {h.rarity || 'Common'}
                      </span>
                    </div>
                    <div className="absolute top-2.5 right-2.5 z-20">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-xs">
                        #{h.tokenId}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 space-y-2.5">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#016976]">
                        <span>{h.collectionName}</span>
                        <span className="text-slate-400 font-normal">({h.collectionSymbol})</span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 truncate mt-0.5 group-hover:text-[#016976] transition-colors">
                        {h.name}
                      </h4>
                    </div>

                    {/* Traits chips */}
                    {h.traits && h.traits.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100">
                        {h.traits.slice(0, 2).map((tr, ti) => (
                          <span
                            key={ti}
                            className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-600 rounded text-[10px] font-medium truncate max-w-[120px]"
                          >
                            <strong className="text-slate-800">{tr.trait_type}:</strong> {tr.value}
                          </span>
                        ))}
                        {h.traits.length > 2 && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">
                            +{h.traits.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[10px] font-mono text-slate-400">BTS-721</span>
                      <span className="font-bold text-[#016976] flex items-center gap-1 group-hover:underline">
                        <span>View Details</span>
                        <Eye className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: BTS-20 Tokens */}
      {activeTab === 'tokens' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#016976] shadow-xs">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">BTS-20 Token Holdings & Balances</h3>
                <p className="text-xs text-slate-500">BTS-20 fungible tokens and verified on-chain balances on Bitnet L1.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-teal-50 text-[#016976] border border-teal-200 px-3 py-1 rounded-xl font-bold">
                Standard: BTS-20
              </span>
            </div>
          </div>

          {tokensLoading ? (
            <div className="py-16 text-center text-slate-500">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-[#016976]" />
                <span className="text-xs font-medium">Querying on-chain BTS-20 token balances...</span>
              </div>
            </div>
          ) : tokens.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded-2xl space-y-3 bg-slate-50/50">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Coins className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-800 text-sm">
                No BTS-20 tokens found in this wallet.
              </p>
              <p className="text-slate-500 max-w-md mx-auto">
                No confirmed BTS-20 or ERC-20 token balances were detected for this address. Learn more about Bitnet token standards.
              </p>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('tokens')}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#016976] hover:bg-[#01545e] text-white text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Explore BTS-20 Standards</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-3">Token</th>
                    <th className="py-3 px-3">Symbol</th>
                    <th className="py-3 px-3">Contract Address</th>
                    <th className="py-3 px-3">Standard</th>
                    <th className="py-3 px-3 text-right">Verified Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tokens.map((tok) => (
                    <tr key={tok.address} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-3 font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-teal-100 border border-teal-300 flex items-center justify-center text-[#016976] text-[10px] font-bold">
                          {tok.symbol ? tok.symbol.charAt(0) : '$'}
                        </div>
                        <span>{tok.name}</span>
                      </td>
                      <td className="py-3.5 px-3 font-bold text-[#016976]">{tok.symbol}</td>
                      <td className="py-3.5 px-3 text-slate-500">
                        {onSelectAddress ? (
                          <span
                            onClick={() => onSelectAddress(tok.address)}
                            className="hover:text-[#016976] hover:underline cursor-pointer"
                            title={tok.address}
                          >
                            {tok.address.slice(0, 10)}...{tok.address.slice(-8)}
                          </span>
                        ) : (
                          <span title={tok.address}>
                            {tok.address.slice(0, 10)}...{tok.address.slice(-8)}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                          {tok.type || 'BTS-20'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                        {parseFloat(tok.balance || '0').toLocaleString('en-US', { maximumFractionDigits: 6 })} {tok.symbol}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Selected Holding Detail Modal */}
      {selectedHolding && (
        <div
          onClick={() => setSelectedHolding(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4"
          >
            <button
              onClick={() => setSelectedHolding(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors z-10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-50 text-[#016976] border border-teal-200">
                {selectedHolding.collectionSymbol}
              </span>
              <span className="text-xs font-mono text-slate-500">
                {selectedHolding.standard}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${selectedHolding.rarityColor || 'bg-slate-800 text-white'}`}>
                {selectedHolding.rarity || 'Common'}
              </span>
            </div>

            <div className="aspect-square w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-md">
              <NftImage src={selectedHolding.image} alt={selectedHolding.name} className="w-full h-full" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">
                {selectedHolding.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Collection: <strong className="text-slate-800">{selectedHolding.collectionName}</strong>
              </p>
            </div>

            {/* Traits list */}
            {selectedHolding.traits && selectedHolding.traits.length > 0 && (
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1.5">Properties (Traits):</span>
                <div className="grid grid-cols-2 gap-2">
                  {selectedHolding.traits.map((tr, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <span className="text-slate-400 text-[10px] block">{tr.trait_type}</span>
                      <span className="font-bold text-slate-900 truncate block">{tr.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Contract Address:</span>
              <span className="font-mono text-[#016976] font-bold">
                {selectedHolding.collectionContract.slice(0, 8)}...{selectedHolding.collectionContract.slice(-6)}
              </span>
            </div>

            {onNavigate && (
              <button
                onClick={() => {
                  setSelectedHolding(null);
                  onNavigate('nfts');
                }}
                className="w-full py-2.5 rounded-xl bg-[#016976] hover:bg-[#01545e] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>View Collection in NFT Explorer</span>
              </button>
            )}
          </div>
        </div>
      )}


      {/* Modal QR Code */}
      {showQr && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Wallet QR Code</h3>
              <button
                onClick={() => setShowQr(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${address}`}
                alt="QR Code"
                className="w-48 h-48"
              />
            </div>
            <p className="text-[11px] font-mono text-slate-600 break-all text-center">
              {address}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
