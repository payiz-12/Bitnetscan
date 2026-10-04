import React, { useEffect, useState } from 'react';
import { 
  Trophy, TrendingUp, Copy, ExternalLink, ArrowUpRight, 
  Search, Coins, RefreshCw, Zap, CheckCircle2, Shield
} from 'lucide-react';
import { rpcService } from '../services/rpc';
import { explorerApiService } from '../services/explorerApi';
import { VERIFIED_HODL_WALLETS, RichAccount, fetchLiveRichList } from '../data/richList';
import { priceService, BtnPriceData } from '../services/priceService';

interface RichListViewProps {
  onSelectAddress: (address: string) => void;
  latestBlock: number;
}

export const RichListView: React.FC<RichListViewProps> = ({ onSelectAddress, latestBlock }) => {
  const [accounts, setAccounts] = useState<RichAccount[]>(VERIFIED_HODL_WALLETS);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [priceData, setPriceData] = useState<BtnPriceData>(priceService.getCachedPrice());

  useEffect(() => {
    return priceService.subscribe((data) => {
      setPriceData(data);
    });
  }, []);
  
  // Custom wallet checker
  const [customAddress, setCustomAddress] = useState('');
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  // Est on-chain circulating supply = current block * 1.0 BTN (Whitepaper PoW subsidy)
  const estimatedTotalSupply = (latestBlock > 0 ? latestBlock : 7721500) * 1.0;

  const loadBalances = async () => {
    setLoading(true);
    try {
      const liveList = await fetchLiveRichList(latestBlock);
      if (liveList && liveList.length > 0) {
        setAccounts(liveList);
      }
    } catch (err) {
      console.error('Error loading rich list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalances();
  }, []);

  const copyAddress = (addr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(addr);
    setCopiedKey(addr);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCheckCustomWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAddress.trim() || !customAddress.startsWith('0x') || customAddress.length !== 42) {
      setCustomError('Please enter a valid 42-character 0x Bitnet wallet address.');
      return;
    }

    setCustomLoading(true);
    setCustomError(null);

    try {
      const cleanAddr = customAddress.trim().toLowerCase();
      const balStr = await rpcService.getBalance(cleanAddr);
      const txCount = await rpcService.getTransactionCount(cleanAddr);
      const balNum = parseFloat(balStr) || 0;
      const pct = ((balNum / estimatedTotalSupply) * 100).toFixed(4);

      const newAccount: RichAccount = {
        rank: 0,
        address: cleanAddr,
        balance: balNum,
        balanceFormatted: balNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
        percentage: `${pct}%`,
        txCount,
      };

      setAccounts((prev) => {
        const without = prev.filter((a) => a.address !== cleanAddr);
        const combined = [...without, newAccount];
        combined.sort((a, b) => b.balance - a.balance);
        combined.forEach((a, idx) => {
          a.rank = idx + 1;
        });
        return combined;
      });

      setCustomAddress('');
    } catch (err: any) {
      setCustomError(err.message || 'Failed to query wallet');
    } finally {
      setCustomLoading(false);
    }
  };

  const filteredAccounts = accounts.filter((acc) =>
    acc.address.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-8 w-full animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-6 md:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
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
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-[#D97706] border border-amber-200 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>Top 50 Monitored Whale Accounts</span>
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                Bitnet <span className="text-[#016976]">Rich List</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Top 50 monitored and verified HODL balances (Queried live via Bitnet JSON-RPC).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 text-[#016976] border border-teal-200 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5 text-[#016976]" />
              <span>50 Monitored Accounts • Live RPC Balances</span>
            </div>

            <button
              onClick={loadBalances}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#016976] hover:bg-[#015661] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <div className="p-1 rounded-lg bg-[#015661]">
                <RefreshCw className={`w-3.5 h-3.5 text-white ${loading ? 'animate-spin' : ''}`} />
              </div>
              <span>Live Refresh (RPC)</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 font-semibold block mb-1">Circulating Total Supply (Est.)</span>
            <div className="text-xl font-bold font-mono text-slate-900 flex items-center gap-1.5">
              <img src="/bitnet-logo-blue.svg" alt="BTN" className="w-4 h-4" />
              <span>{(estimatedTotalSupply / 1e6).toFixed(2)}M BTN</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              ≈ ${(estimatedTotalSupply * priceData.priceUsd).toLocaleString('en-US', { maximumFractionDigits: 0 })} USD (NestEx Spot)
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 font-semibold block mb-1">#1 Whale Account Balance</span>
            <div className="text-xl font-bold font-mono text-slate-900 flex items-center gap-1.5">
              <img src="/bitnet-logo-blue.svg" alt="BTN" className="w-4 h-4" />
              <span>{accounts[0]?.balanceFormatted || '1,042,986.96'} BTN</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              ≈ ${((accounts[0]?.balance || 1042986.96) * priceData.priceUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </span>
          </div>

          <a
            href="https://trade.nestex.one/spot/BTN"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-600 hover:shadow-xs transition-all shadow-2xs group cursor-pointer block"
            title="NestEx BTN/USDT Live Order Book"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold block mb-1">BTN Price (NestEx Spot)</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                priceData.change24h >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {priceData.change24hFormatted}
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 group-hover:text-emerald-600 transition-colors">
              {priceData.priceFormatted}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>24h Vol: ${priceData.volumeUsd.toFixed(2)} USD</span>
              <span className="text-[10px] text-slate-400">trade.nestex.one ↗</span>
            </span>
          </a>
        </div>
      </div>

      {/* Check Any Address Rank Tool */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#016976]" />
          <span>Query Any Wallet Ranking & Balance</span>
        </h3>
        <form onSubmit={handleCheckCustomWallet} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={customAddress}
            onChange={(e) => setCustomAddress(e.target.value)}
            placeholder="Enter wallet address (0x...)"
            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#016976]"
          />
          <button
            type="submit"
            disabled={customLoading}
            className="px-5 py-2.5 rounded-xl bg-[#016976] hover:bg-[#015661] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            {customLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Check & Add</span>
          </button>
        </form>
        {customError && (
          <p className="text-xs text-rose-600 font-mono font-medium">{customError}</p>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter by address..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#016976] shadow-2xs"
          />
        </div>

        <div className="text-xs text-slate-600 font-mono font-medium">
          Monitored Wallets: <span className="text-[#016976] font-bold">{filteredAccounts.length}</span> (Verified Top 50 Watchlist)
        </div>
      </div>

      {/* Rich List Container */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Mobile View (sm:hidden): Dedicated responsive touch cards - Zero horizontal scrolling */}
        <div className="sm:hidden divide-y divide-slate-100 font-mono">
          {loading && accounts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-sans flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-[#016976]" />
              <span className="text-xs">Fetching live balance ranking from Bitnet blockchain...</span>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="py-10 text-center text-slate-500 font-sans text-xs">
              No matching wallets found.
            </div>
          ) : (
            filteredAccounts.map((acc) => (
              <div
                key={acc.address}
                onClick={() => onSelectAddress(acc.address)}
                onMouseEnter={() => explorerApiService.prefetchAddress(acc.address)}
                className="p-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer space-y-2.5"
              >
                {/* Top Row: Rank Badge + Truncated Address + Copy Button + View Link */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        acc.rank === 1
                          ? 'bg-[#D97706] text-white shadow-2xs'
                          : acc.rank === 2
                          ? 'bg-slate-600 text-white shadow-2xs'
                          : acc.rank === 3
                          ? 'bg-[#D68142] text-white shadow-2xs'
                          : 'bg-slate-100 border border-slate-200 text-slate-800'
                      }`}
                    >
                      #{acc.rank}
                    </span>
                    <span 
                      title={acc.address}
                      className="text-xs font-bold text-slate-900 truncate"
                    >
                      {acc.address.slice(0, 6)}...{acc.address.slice(-4)}
                    </span>
                    <button
                      onClick={(e) => copyAddress(acc.address, e)}
                      className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                      title="Copy Address"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {copiedKey === acc.address && (
                      <span className="text-[10px] text-[#016976] font-bold">Copied</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[#016976] text-xs font-bold shrink-0">
                    <span>View</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Bottom Row: Balance & USD (Left) + % of Supply & Txns (Right) */}
                <div className="flex items-end justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-0.5">
                      Balance
                    </span>
                    <div className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 truncate">
                      <img src="/bitnet-logo-blue.svg" alt="BTN" className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{acc.balanceFormatted} BTN</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-sans font-medium mt-0.5 truncate">
                      ≈ ${(acc.balance * priceData.priceUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-teal-50 text-[#016976] text-[10px] font-bold border border-teal-200/60">
                      {acc.percentage} of Supply
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans font-medium mt-1">
                      {acc.txCount.toLocaleString()} txns
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
                <th className="py-4 px-4 sm:px-6">Rank</th>
                <th className="py-4 px-4">Address</th>
                <th className="py-4 px-4 text-right">Balance (BTN)</th>
                <th className="py-4 px-4 text-right hidden md:table-cell">% of Supply</th>
                <th className="py-4 px-4 text-right">Txn Count</th>
                <th className="py-4 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading && accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500 font-sans">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#016976]" />
                      <span>Fetching live balance ranking from Bitnet blockchain...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                    No matching wallets found.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr
                    key={acc.address}
                    onClick={() => onSelectAddress(acc.address)}
                    onMouseEnter={() => explorerApiService.prefetchAddress(acc.address)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    {/* Rank */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                            acc.rank === 1
                              ? 'bg-[#D97706] text-white shadow-2xs'
                              : acc.rank === 2
                              ? 'bg-slate-600 text-white shadow-2xs'
                              : acc.rank === 3
                              ? 'bg-[#D68142] text-white shadow-2xs'
                              : 'bg-slate-100 border border-slate-200 text-slate-800'
                          }`}
                        >
                          #{acc.rank}
                        </span>
                      </div>
                    </td>

                    {/* Address without arbitrary labels */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span 
                          title={acc.address}
                          className="text-slate-900 group-hover:text-[#016976] transition-colors font-semibold whitespace-nowrap"
                        >
                          {acc.address}
                        </span>
                        <button
                          onClick={(e) => copyAddress(acc.address, e)}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0"
                          title="Copy Address"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {copiedKey === acc.address && (
                          <span className="text-[10px] text-[#016976] font-bold">Copied</span>
                        )}
                      </div>
                    </td>

                    {/* Balance */}
                    <td className="py-4 px-4 text-right">
                      <div className="font-bold text-slate-900 flex items-center justify-end gap-1.5">
                        <img src="/bitnet-logo-blue.svg" alt="BTN" className="w-3.5 h-3.5" />
                        <span>{acc.balanceFormatted} BTN</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-sans font-medium mt-0.5">
                        ≈ ${(acc.balance * priceData.priceUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </div>
                    </td>

                    {/* % Supply */}
                    <td className="py-4 px-4 text-right hidden md:table-cell text-slate-600 font-medium">
                      {acc.percentage}
                    </td>

                    {/* Tx count */}
                    <td className="py-4 px-4 text-right text-slate-800 font-semibold">
                      {acc.txCount.toLocaleString()} txns
                    </td>

                    {/* Action */}
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-[#016976] group-hover:underline font-bold">
                        <span>View</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
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
