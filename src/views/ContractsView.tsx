import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileCode, CheckCircle2, Search, RefreshCw, Copy, ExternalLink, 
  ArrowUpRight, ShieldCheck, Code, Layers, Zap, Check, ArrowLeft,
  Sparkles, Filter, Terminal, CheckCircle, XCircle, Shield
} from 'lucide-react';
import { 
  VerifiedContractItem, OFFICIAL_BITNET_VERIFIED_CONTRACTS, 
  fetchLiveVerifiedContracts, inspectAndVerifyContract 
} from '../data/verifiedContracts';

interface ContractsViewProps {
  onSelectAddress: (address: string) => void;
  onBack?: () => void;
}

export const ContractsView: React.FC<ContractsViewProps> = ({ onSelectAddress, onBack }) => {
  const [contracts, setContracts] = useState<VerifiedContractItem[]>(OFFICIAL_BITNET_VERIFIED_CONTRACTS);
  const [loading, setLoading] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpt, setFilterOpt] = useState<'all' | 'optimized' | 'withArgs'>('all');

  // Interactive Live Verify Form
  const [inputAddress, setInputAddress] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<VerifiedContractItem | null>(null);

  const loadLiveContracts = async () => {
    setLoading(true);
    try {
      const live = await fetchLiveVerifiedContracts();
      setContracts(live);
    } catch (err) {
      console.error('Failed to fetch verified contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveContracts();
  }, []);

  const handleCopy = (addr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(addr);
    setCopiedAddress(addr);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleVerifyNewContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputAddress.trim() || !inputAddress.startsWith('0x') || inputAddress.length !== 42) {
      setVerifyError('Please enter a valid 42-character 0x contract address.');
      return;
    }

    setVerifyLoading(true);
    setVerifyError(null);
    setVerifySuccess(null);

    try {
      const inspected = await inspectAndVerifyContract(inputAddress.trim());
      setVerifySuccess(inspected);
      setContracts((prev) => {
        const without = prev.filter((c) => c.address.toLowerCase() !== inspected.address.toLowerCase());
        return [inspected, ...without];
      });
      setInputAddress('');
    } catch (err: any) {
      setVerifyError(err.message || 'Contract could not be verified on-chain.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const past = new Date(dateStr).getTime();
      const diff = Math.max(0, Math.floor((Date.now() - past) / 1000));
      if (diff < 60) return `${diff}s ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      const days = Math.floor(diff / 86400);
      if (days < 30) return `${days}d ago`;
      if (days < 365) return `${Math.floor(days / 30)}mo ago`;
      return `${Math.floor(days / 365)}y ago`;
    } catch {
      return dateStr;
    }
  };

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.compilerVersion.toLowerCase().includes(q) ||
        c.license.toLowerCase().includes(q);

      const matchesOpt = 
        filterOpt === 'all' ? true :
        filterOpt === 'optimized' ? c.optimization :
        filterOpt === 'withArgs' ? c.hasConstructorArgs : true;

      return matchesSearch && matchesOpt;
    });
  }, [contracts, searchQuery, filterOpt]);

  const totalBalanceBtn = useMemo(() => {
    return contracts.reduce((acc, c) => acc + (parseFloat(c.coinBalance) || 0), 0);
  }, [contracts]);

  const totalTxns = useMemo(() => {
    return contracts.reduce((acc, c) => acc + (c.txCount || 0), 0);
  }, [contracts]);

  return (
    <div className="space-y-6 w-full animate-fade-in pb-16">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all shadow-2xs cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back</span>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-indigo-600" />
                <span>Verified Contracts</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-[#016976] border border-teal-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#016976]" />
                <span>Bitnet JSON-RPC Verified</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Verified Contracts
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              List of smart contracts on Bitnet L1 with verified source code and bytecode
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadLiveContracts}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all shadow-2xs cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0 border border-indigo-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Verified Contracts
            </span>
            <div className="text-xl font-extrabold font-mono text-slate-900 truncate">
              {contracts.length} Contracts
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              On-Chain Bytecode Verified
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center text-[#016976] flex-shrink-0 border border-teal-100">
            <Layers className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Contract Balance
            </span>
            <div className="text-xl font-extrabold font-mono text-slate-900 truncate">
              {totalBalanceBtn.toFixed(4)} BTN
            </div>
            <div className="text-[10px] text-slate-500">
              Live JSON-RPC Balances
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0 border border-amber-100">
            <Zap className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Transactions
            </span>
            <div className="text-xl font-extrabold font-mono text-slate-900 truncate">
              {totalTxns.toLocaleString()} Calls
            </div>
            <div className="text-[10px] text-slate-500">
              Contract Interactions
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Live Verify Form Box */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#016976]" />
            <span>Verify Contract On-Chain (EVM Bytecode Check)</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-500">JSON-RPC eth_getCode</span>
        </div>

        <form onSubmit={handleVerifyNewContract} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={inputAddress}
            onChange={(e) => setInputAddress(e.target.value)}
            placeholder="Enter contract address to verify (0x...)"
            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#016976]"
          />
          <button
            type="submit"
            disabled={verifyLoading}
            className="px-5 py-2.5 rounded-xl bg-[#016976] hover:bg-[#015661] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs whitespace-nowrap"
          >
            {verifyLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCode className="w-4 h-4" />}
            <span>Verify On-Chain</span>
          </button>
        </form>

        {verifyError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono font-medium">
            {verifyError}
          </div>
        )}

        {verifySuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Contract Successfully Verified On-Chain!
              </span>
              <button
                onClick={() => onSelectAddress(verifySuccess.address)}
                className="text-xs text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Inspect Contract</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono pt-1 text-[11px]">
              <div>Name: <strong>{verifySuccess.name}</strong></div>
              <div>Compiler: <strong>{verifySuccess.compilerVersion.split('+')[0]}</strong></div>
              <div>Balance: <strong>{verifySuccess.coinBalance} BTN</strong></div>
              <div>Tx Count: <strong>{verifySuccess.txCount}</strong></div>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="grid grid-cols-3 md:flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setFilterOpt('all')}
            className={`px-2 md:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center truncate ${
              filterOpt === 'all' ? 'bg-white text-[#016976] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({contracts.length})
          </button>
          <button
            onClick={() => setFilterOpt('optimized')}
            className={`px-2 md:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center truncate ${
              filterOpt === 'optimized' ? 'bg-[#016976] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Optimized
          </button>
          <button
            onClick={() => setFilterOpt('withArgs')}
            className={`px-2 md:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center truncate ${
              filterOpt === 'withArgs' ? 'bg-[#016976] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="sm:hidden">Args</span>
            <span className="hidden sm:inline">With Constructor Args</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by contract name, address, or compiler..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#016976]"
          />
        </div>
      </div>

      {/* Verified Contracts Container */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Mobile View (sm:hidden): Dedicated responsive touch cards - Zero horizontal scrolling */}
        <div className="sm:hidden divide-y divide-slate-100 font-mono">
          {filteredContracts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-sans text-xs">
              No matching verified contracts found.
            </div>
          ) : (
            filteredContracts.map((c) => (
              <div
                key={c.address}
                onClick={() => onSelectAddress(c.address)}
                className="p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer space-y-2.5"
              >
                {/* Top Row: Icon + Contract Name + Verified Badge + View Arrow */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                      <FileCode className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 truncate">
                        <span className="truncate">{c.name}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-normal">
                        <span title={c.address}>{c.address.slice(0, 6)}...{c.address.slice(-4)}</span>
                        <button
                          onClick={(e) => handleCopy(c.address, e)}
                          className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                          title="Copy Address"
                        >
                          {copiedAddress === c.address ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[#016976] text-xs font-bold shrink-0">
                    <span>View</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Bottom Row: Balance & Calls (Left) + Compiler & Optimization (Right) */}
                <div className="flex items-end justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-0.5">
                      Contract Balance
                    </span>
                    <div className="font-extrabold text-sm text-slate-900 truncate">
                      {parseFloat(c.coinBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} BTN
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans mt-0.5 truncate">
                      {c.txCount.toLocaleString()} calls • {formatTimeAgo(c.verifiedAt)}
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <div className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">
                      {c.compilerVersion.split('+')[0]}
                    </div>
                    <div>
                      {c.optimization ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Check className="w-2.5 h-2.5 text-emerald-600" />
                          <span>Optimized</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Non-optimized</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View (hidden sm:block): Full Wide Data Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-mono text-[11px] uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3.5 px-4">Contract</th>
                <th className="py-3.5 px-4 text-right">Balance</th>
                <th className="py-3.5 px-4 text-right">Txns</th>
                <th className="py-3.5 px-4 text-center">Compiler</th>
                <th className="py-3.5 px-4 text-center">Version / Opt</th>
                <th className="py-3.5 px-4 text-center hidden md:table-cell">Setting</th>
                <th className="py-3.5 px-4 text-right">Verified At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                    No matching verified contracts found.
                  </td>
                </tr>
              ) : (
                filteredContracts.map((c) => (
                  <tr
                    key={c.address}
                    onClick={() => onSelectAddress(c.address)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Contract (Name + Address with verified check) */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 flex-shrink-0">
                          <FileCode className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900 group-hover:text-[#016976] transition-colors">
                            <span>{c.name}</span>
                            <span title="Verified Source Code">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-normal">
                            <span title={c.address}>{c.address.slice(0, 6)}...{c.address.slice(-4)}</span>
                            <button
                              onClick={(e) => handleCopy(c.address, e)}
                              className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Copy Address"
                            >
                              {copiedAddress === c.address ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Balance */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {parseFloat(c.coinBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} BTN
                    </td>

                    {/* Txns */}
                    <td className="py-3.5 px-4 text-right text-slate-700 font-semibold whitespace-nowrap">
                      {c.txCount.toLocaleString()}
                    </td>

                    {/* Compiler */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {c.compilerVersion.split('+')[0]}
                      </span>
                    </td>

                    {/* Optimization */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {c.optimization ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Optimized</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>

                    {/* Setting / License */}
                    <td className="py-3.5 px-4 text-center hidden md:table-cell whitespace-nowrap">
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 uppercase">
                        {c.license === 'none' ? 'None' : c.license}
                      </span>
                    </td>

                    {/* Verified At */}
                    <td className="py-3.5 px-4 text-right text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {formatTimeAgo(c.verifiedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
