import React, { useEffect, useState } from 'react';
import { 
  Trophy, TrendingUp, Copy, ExternalLink, ArrowUpRight, 
  Search, Coins, RefreshCw, Zap, CheckCircle2, ArrowLeft
} from 'lucide-react';
import { rpcService } from '../services/rpc';
import { explorerApiService } from '../services/explorerApi';
import { RichAccount, TopAccountsResult, fetchTopAccounts } from '../data/richList';
import { fetchSupplySnapshot, SupplySnapshot } from '../services/supply';
import { priceService, BtnPriceData, formatBtnInUsd } from '../services/priceService';
import { AddressTag } from '../components/AddressTag';
import { getAddressLabel } from '../services/addressLabels';
import { SkeletonList } from '../components/Skeleton';

interface RichListViewProps {
  onSelectAddress: (address: string) => void;
  latestBlock: number;
  onBack?: () => void;
}

export const RichListView: React.FC<RichListViewProps> = ({ onSelectAddress, latestBlock, onBack }) => {
  const [accounts, setAccounts] = useState<RichAccount[]>([]);
  const [listSource, setListSource] = useState<TopAccountsResult['source'] | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [percentageBasis, setPercentageBasis] = useState<TopAccountsResult['percentageBasis']>('issuance');
  const [supply, setSupply] = useState<SupplySnapshot | null>(null);
  useEffect(() => {
    fetchSupplySnapshot().then(setSupply);
  }, []);
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

  // Circulating supply from the hourly balance-sum snapshot; base issuance (1 BTN × blocks) as fallback
  const estimatedTotalSupply = supply ? Number(supply.circulatingSupply) : latestBlock > 0 ? latestBlock : 0;

  const loadBalances = async (force = false) => {
    setLoading(true);
    try {
      const result = await fetchTopAccounts(latestBlock, force ? 0 : 60000);
      setAccounts(result.accounts);
      setListSource(result.source);
      setUpdatedAt(result.updatedAt);
      setPercentageBasis(result.percentageBasis);
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
      const pct = estimatedTotalSupply > 0 ? ((balNum / estimatedTotalSupply) * 100).toFixed(4) : null;

      const newAccount: RichAccount = {
        rank: 0,
        address: cleanAddr,
        balance: balNum,
        balanceFormatted: balNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
        percentage: pct !== null ? `${pct}%` : 'Unknown',
        txCount,
        balanceLive: true,
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
    <div className="space-y-6 md:space-y-8 w-full animate-fade-in">
      {onBack && (
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      )}

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
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-600" />
                  <span>Top accounts by balance</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Bitnet <span className="text-petrol">Rich List</span>
              </h1>
            </div>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 font-semibold block mb-1">
              {supply ? 'Circulating supply' : 'Base issuance (1 BTN × blocks)'}
            </span>
            <div className="text-xl font-bold font-mono text-slate-900 flex items-center gap-1.5">
              <img src="/bitnet-logo-blue.svg" alt="BTN" className="w-4 h-4" />
              <span>{estimatedTotalSupply > 0 ? `${(estimatedTotalSupply / 1e6).toFixed(2)}M BTN` : '…'}</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {supply
                ? `Sum of all balances · block #${supply.blockRange[1].toLocaleString()} · updated hourly`
                : `≈ ${formatBtnInUsd(estimatedTotalSupply, priceData, 0)} USD (NestEx Spot)`}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 font-semibold block mb-1">Largest balance</span>
            <div className="text-xl font-bold font-mono text-slate-900 flex items-center gap-1.5">
              <img src="/bitnet-logo-blue.svg" alt="BTN" className="w-4 h-4" />
              <span>{accounts[0] ? `${accounts[0].balanceFormatted} BTN` : '…'}</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              ≈ {formatBtnInUsd(accounts[0]?.balance ?? NaN, priceData)} USD
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
                !priceData.available ? 'bg-slate-100 text-slate-500' : priceData.change24h >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {priceData.change24hFormatted}
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 group-hover:text-emerald-600 transition-colors">
              {priceData.priceFormatted}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>24h Vol: {priceData.available ? `$${priceData.volumeUsd.toFixed(2)}` : '—'} USD</span>
              <span className="text-[10px] text-slate-400">trade.nestex.one ↗</span>
            </span>
          </a>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <p>
          {listSource === 'snapshot'
            ? 'The explorer ranking is unavailable, so this lists previously known large holders with live balances.'
            : 'Top 50 accounts from the Bitnet explorer, with balances read live from the RPC.'}
          {updatedAt && ` Updated ${new Date(updatedAt).toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' })} UTC.`}
        </p>
        <button
          onClick={() => loadBalances(true)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      {/* Check Any Address Rank Tool */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Zap className="w-4 h-4 text-petrol" />
          <span>Check any address</span>
        </h3>
        <form onSubmit={handleCheckCustomWallet} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={customAddress}
            onChange={(e) => setCustomAddress(e.target.value)}
            placeholder="Enter wallet address (0x...)"
            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-petrol"
          />
          <button
            type="submit"
            disabled={customLoading}
            className="px-5 py-2.5 rounded-xl bg-petrol hover:bg-[#015661] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            {customLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Check</span>
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
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-petrol shadow-2xs"
          />
        </div>

        <div className="text-xs text-slate-600 font-mono font-medium">
          Accounts: <span className="text-petrol font-bold">{filteredAccounts.length}</span>
        </div>
      </div>

      {/* Rich List Container */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Mobile View (sm:hidden): Dedicated responsive touch cards - Zero horizontal scrolling */}
        <div className="sm:hidden divide-y divide-slate-100 font-mono">
          {loading && accounts.length === 0 ? (
            <SkeletonList rows={8} label="Loading top accounts" />
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
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : acc.rank === 2
                          ? 'bg-slate-600 text-white shadow-2xs'
                          : acc.rank === 3
                          ? 'bg-terracotta text-white shadow-2xs'
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
                    <AddressTag address={acc.address} hide={['solo']} />
                    {!getAddressLabel(acc.address) && (acc.name || acc.isContract) && (
                      <span className="shrink-0 px-1.5 py-px rounded-md bg-indigo-50 border border-indigo-200 text-[10px] font-bold text-indigo-700 font-sans truncate max-w-[8rem]">
                        {acc.name || 'Contract'}
                      </span>
                    )}
                    <button
                      onClick={(e) => copyAddress(acc.address, e)}
                      className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                      title="Copy Address"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {copiedKey === acc.address && (
                      <span className="text-[10px] text-petrol font-bold">Copied</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-petrol text-xs font-bold shrink-0">
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
                      <span className="truncate">{acc.balanceFormatted} BTN{!acc.balanceLive && ' (not live)'}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-sans font-medium mt-0.5 truncate">
                      ≈ {formatBtnInUsd(acc.balance, priceData)} USD
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-petrol-50 text-petrol text-[10px] font-bold border border-petrol-200/60">
                      {acc.percentage} of {percentageBasis === 'supply' ? 'supply' : 'issuance'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans font-medium mt-1">
                      {acc.txCount !== null ? `${acc.txCount.toLocaleString()} sent` : '—'}
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
                <th className="py-4 px-4 text-right hidden md:table-cell">{percentageBasis === 'supply' ? '% of Supply' : '% of Issuance'}</th>
                <th className="py-4 px-4 text-right">Sent Txns</th>
                <th className="py-4 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading && accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <SkeletonList rows={10} label="Loading top accounts" />
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
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : acc.rank === 2
                              ? 'bg-slate-600 text-white shadow-2xs'
                              : acc.rank === 3
                              ? 'bg-terracotta text-white shadow-2xs'
                              : 'bg-slate-100 border border-slate-200 text-slate-800'
                          }`}
                        >
                          #{acc.rank}
                        </span>
                      </div>
                    </td>

                    {/* Address with its label when the address is known */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span 
                          title={acc.address}
                          className="text-slate-900 group-hover:text-petrol transition-colors font-semibold whitespace-nowrap"
                        >
                          {acc.address}
                        </span>
                        <AddressTag address={acc.address} hide={['solo']} />
                        {!getAddressLabel(acc.address) && (acc.name || acc.isContract) && (
                          <span className="shrink-0 px-1.5 py-px rounded-md bg-indigo-50 border border-indigo-200 text-[10px] font-bold text-indigo-700 font-sans truncate max-w-[8rem]">
                            {acc.name || 'Contract'}
                          </span>
                        )}
                        <button
                          onClick={(e) => copyAddress(acc.address, e)}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0"
                          title="Copy Address"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {copiedKey === acc.address && (
                          <span className="text-[10px] text-petrol font-bold">Copied</span>
                        )}
                      </div>
                    </td>

                    {/* Balance */}
                    <td className="py-4 px-4 text-right">
                      <div className="font-bold text-slate-900 flex items-center justify-end gap-1.5">
                        <img src="/bitnet-logo-blue.svg" alt="BTN" className="w-3.5 h-3.5" />
                        <span>{acc.balanceFormatted} BTN{!acc.balanceLive && ' (not live)'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-sans font-medium mt-0.5">
                        ≈ {formatBtnInUsd(acc.balance, priceData)} USD
                      </div>
                    </td>

                    {/* % Supply */}
                    <td className="py-4 px-4 text-right hidden md:table-cell text-slate-600 font-medium">
                      {acc.percentage}
                    </td>

                    {/* Tx count */}
                    <td className="py-4 px-4 text-right text-slate-800 font-semibold">
                      {acc.txCount !== null ? `${acc.txCount.toLocaleString()} sent` : '—'}
                    </td>

                    {/* Action */}
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-petrol group-hover:underline font-bold">
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
