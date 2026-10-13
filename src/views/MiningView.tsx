import React, { useState } from 'react';
import { Calculator, Server, Terminal, ExternalLink } from 'lucide-react';
import { Block, NetworkStats } from '../types/blockchain';
import { priceService, BtnPriceData, formatBtnInUsd } from '../services/priceService';
import { fetchLivePoolStats, getCachedPoolStats, LivePoolStats, computeLiveMiningSummary, ComputedMinerStats } from '../services/miningPoolStats';
import { KNOWN_MINING_POOLS } from '../data/miningPools';
import { isPageHidden } from '../services/pageVisibility';

interface MiningViewProps {
  stats: NetworkStats | null;
  recentBlocks?: Block[];
  onSelectAddress?: (address: string) => void;
}

export const MiningView: React.FC<MiningViewProps> = ({ stats, recentBlocks, onSelectAddress }) => {
  const [userHashrate, setUserHashrate] = useState('100'); // in MH/s
  const [unit, setUnit] = useState<'MH' | 'GH'>('MH');
  const [priceData, setPriceData] = useState<BtnPriceData>(priceService.getCachedPrice());

  React.useEffect(() => {
    return priceService.subscribe((data) => {
      setPriceData(data);
    });
  }, []);

  // Live pool stats fetched silently in background (no button)
  const [poolStats, setPoolStats] = useState<Record<string, LivePoolStats>>(() => getCachedPoolStats());

  React.useEffect(() => {
    let active = true;
    fetchLivePoolStats().then((res) => {
      if (active && res) setPoolStats({ ...res });
    });
    const interval = setInterval(() => {
      if (isPageHidden()) return;
      fetchLivePoolStats().then((res) => {
        if (active && res) setPoolStats({ ...res });
      });
    }, 30000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  // Compute live mining distribution and calibrated worker counts from real blocks & pool APIs
  const miningSummary = React.useMemo(() => {
    return computeLiveMiningSummary(recentBlocks || [], stats?.hashrateHps, poolStats);
  }, [recentBlocks, stats?.hashrateHps, poolStats]);

  const reportedWorkers = miningSummary.reportedWorkers;

  // Miners seen in the recent block sample, plus known pools that did not mine any of those blocks.
  const minerRows: ComputedMinerStats[] = React.useMemo(() => {
    const seen = new Set(miningSummary.miners.map((m) => m.miner));
    const idle = Object.values(KNOWN_MINING_POOLS)
      .filter((p) => !seen.has(p.address))
      .map((p): ComputedMinerStats => ({
        miner: p.address,
        poolName: p.name,
        poolTag: p.tag,
        poolUrl: p.url,
        category: p.category,
        categoryLabel: p.categoryLabel,
        badge: p.badge,
        minersCount: poolStats[p.address]?.workers ?? null,
        workersSource: poolStats[p.address]?.source,
        count: 0,
        percent: '0.0',
        estimatedHashrateGh: null,
      }));
    return [...miningSummary.miners, ...idle];
  }, [miningSummary, poolStats]);

  // PoW calculations from the measured average block time (1 BTN base subsidy per block).
  const avgBlockTime = stats?.avgBlockTimeSeconds && stats.avgBlockTimeSeconds > 0 ? stats.avgBlockTimeSeconds : null;
  const blocksPerDay = avgBlockTime ? Math.round(86400 / avgBlockTime) : null;
  const dailyTotalReward = (blocksPerDay ?? 0) * 1.0;

  // Estimate user share:
  const numericHashrate = Math.max(0, parseFloat(userHashrate) || 0);
  const userRateInH = numericHashrate * (unit === 'GH' ? 1e9 : 1e6);

  // Network hashrate in H/s (Difficulty / BlockTime):
  const netRateInH = stats?.hashrateHps ?? 0;
  const userShare = netRateInH > 0 ? userRateInH / (netRateInH + userRateInH) : 0;
  const canEstimate = netRateInH > 0 && blocksPerDay !== null;
  const estimatedDailyBtn = canEstimate ? (userShare * dailyTotalReward).toFixed(2) : '—';
  const estimatedWeeklyBtn = canEstimate ? (userShare * dailyTotalReward * 7).toFixed(2) : '—';
  const estimatedMonthlyBtn = canEstimate ? (userShare * dailyTotalReward * 30).toFixed(2) : '—';

  return (
    <div className="space-y-5 sm:space-y-8 w-full animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 p-2 flex items-center justify-center text-[#016976] shadow-xs">
            <img src="/bitnet-logo-blue.svg" alt="BTN" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Bitnet PoW & Mining Analytics</h1>
          </div>
        </div>

        {/* 6 Mining Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mt-5 sm:mt-6">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1 font-medium">Estimated Hashrate</span>
            <span className="text-xl font-black font-mono text-[#D68142]">
              {stats?.hashrateEstimate || 'Unknown'}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1 font-medium">Pool-Reported Workers</span>
            <span className="text-xl font-black font-mono text-slate-900">
              {reportedWorkers !== null ? reportedWorkers : 'Unknown'}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {reportedWorkers !== null ? miningSummary.reportedWorkerSources.join(', ') : 'No pool API reachable'}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1 font-medium">Block Subsidy</span>
            <div className="text-xl font-black font-mono text-[#016976] flex items-center gap-1.5">
              <img src="/bitnet-logo-blue.svg" alt="BTN" className="w-4 h-4" />
              <span>1.0 BTN</span>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1 font-medium">Daily Base Emission</span>
            <span className="text-xl font-black font-mono text-slate-900">
              {blocksPerDay !== null ? `~${blocksPerDay.toLocaleString()} BTN` : 'Unknown'}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {avgBlockTime ? `1 BTN × blocks at ${avgBlockTime.toFixed(2)}s` : 'Block time unavailable'}
            </span>
          </div>
          <a
            href="https://trade.nestex.one/spot/BTN"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors group cursor-pointer block"
            title="NestEx BTN/USDT Live Order Book"
          >
            <span className="text-xs text-slate-500 block mb-1 font-medium">Spot Price (NestEx)</span>
            <div className="text-xl font-black font-mono text-slate-900 group-hover:text-emerald-600 transition-colors">
              {priceData.priceFormatted}
            </div>
          </a>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1 font-medium">Consensus Algorithm</span>
            <span className="text-xl font-black font-mono text-[#016976]">Ethash (PoW)</span>
          </div>
        </div>
      </div>

      {/* Interactive Mining Profitability Calculator */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Calculator className="w-5 h-5 text-[#016976]" />
          <h3 className="text-lg font-bold text-slate-900">Mining Profitability Calculator</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="md:col-span-2 space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Your Mining Device Hashrate
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={userHashrate}
                onChange={(e) => setUserHashrate(e.target.value)}
                placeholder="100"
                className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 font-mono text-slate-900 text-sm focus:outline-none focus:border-[#016976] shadow-xs"
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="bg-white border border-slate-300 rounded-xl px-4 py-2.5 font-mono text-slate-900 text-sm font-bold shadow-xs cursor-pointer"
              >
                <option value="MH">MH/s</option>
                <option value="GH">GH/s</option>
              </select>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block font-medium">Estimated Network Share</span>
            <span className="text-xl font-black font-mono text-[#016976]">
              {(userShare * 100).toFixed(3)}%
            </span>
          </div>
        </div>

        {/* Reward Outcomes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center">
            <span className="text-xs text-emerald-800 block mb-1 font-semibold uppercase tracking-wider">Estimated Daily Rewards</span>
            <span className="text-2xl font-black font-mono text-emerald-700">
              {estimatedDailyBtn} <span className="text-xs font-bold text-emerald-800">BTN / day</span>
            </span>
            <span className="text-xs text-emerald-600 block mt-1 font-medium font-sans">
              ≈ {formatBtnInUsd(parseFloat(estimatedDailyBtn), priceData)} USD
            </span>
          </div>
          <div className="p-5 rounded-2xl bg-sky-50/70 border border-sky-200 text-center">
            <span className="text-xs text-sky-800 block mb-1 font-semibold uppercase tracking-wider">Estimated Weekly Rewards</span>
            <span className="text-2xl font-black font-mono text-sky-700">
              {estimatedWeeklyBtn} <span className="text-xs font-bold text-sky-800">BTN / week</span>
            </span>
            <span className="text-xs text-sky-600 block mt-1 font-medium font-sans">
              ≈ {formatBtnInUsd(parseFloat(estimatedWeeklyBtn), priceData)} USD
            </span>
          </div>
          <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 text-center">
            <span className="text-xs text-amber-900 block mb-1 font-semibold uppercase tracking-wider">Estimated Monthly Rewards</span>
            <span className="text-2xl font-black font-mono text-amber-800">
              {estimatedMonthlyBtn} <span className="text-xs font-bold text-amber-900">BTN / month</span>
            </span>
            <span className="text-xs text-amber-700 block mt-1 font-medium font-sans">
              ≈ {formatBtnInUsd(parseFloat(estimatedMonthlyBtn), priceData)} USD
            </span>
          </div>
        </div>
      </div>

      {/* How to Mine Quickstart Guide */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 md:p-8 space-y-4 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-[#D68142]" />
          <span>How to Mine Bitnet (BTN)</span>
        </h3>

        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            You can mine Bitnet directly using standard Ethash GPU mining software (lolMiner, T-Rex, Gminer, TeamRedMiner) or by running the official Bitnet Desktop Node.
          </p>

          <div className="p-4 rounded-2xl bg-[#0B132B] border border-slate-700 font-mono space-y-2 shadow-inner">
            <div className="text-slate-400 font-semibold">// Example lolMiner Configuration</div>
            <div className="text-emerald-400 font-bold select-all break-all">
              lolMiner --algo ETHASH --pool rpc.bitnetmoney.org:8545 --user YOUR_WALLET_ADDRESS --ethstratum ETHPROXY
            </div>
          </div>
        </div>
      </div>

      {/* Active Mining Pools Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 md:p-8 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-[#016976]" />
            <h3 className="text-lg font-bold text-slate-900">Bitnet Miners & Pools</h3>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            Share of last {miningSummary.totalBlocksSampled} blocks
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {minerRows.map((m) => (
            <div key={m.miner} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 text-sm truncate">{m.poolName}</span>
                  <span className={`shrink-0 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    m.category === 'known'
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : 'text-slate-600 bg-slate-100 border-slate-300'
                  }`}>
                    {m.categoryLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {m.count > 0
                    ? `Mined ${m.count} of the last ${miningSummary.totalBlocksSampled} blocks (${m.percent}%).`
                    : `No blocks in the last ${miningSummary.totalBlocksSampled} sampled blocks.`}
                  {m.estimatedHashrateGh !== null && m.count > 0 && ` ≈ ${m.estimatedHashrateGh} GH/s by block share.`}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-bold">
                  {m.minersCount !== null ? (
                    <span className="inline-flex items-center gap-1.5 text-[#016976] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md" title={`Reported by ${m.workersSource}`}>
                      {m.minersCount} {m.minersCount === 1 ? 'Worker' : 'Workers'} · {m.workersSource}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                      Worker count not published
                    </span>
                  )}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                <button
                  onClick={() => onSelectAddress?.(m.miner)}
                  className="text-[10px] font-mono text-slate-400 hover:text-[#016976] hover:underline cursor-pointer"
                  title={`View address ${m.miner}`}
                >
                  {m.miner.slice(0, 6)}...{m.miner.slice(-4)}
                </button>
                {m.poolUrl ? (
                  <a
                    href={m.poolUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-[#016976] hover:underline flex items-center gap-1"
                  >
                    <span>{m.poolUrl.replace(/^https?:\/\//, '')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-[11px] font-bold text-slate-600 truncate">{m.poolTag}</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500">
          Worker counts are shown only when a pool publishes them. Block share does not reveal how many machines a miner runs.
        </p>
      </div>
    </div>
  );
};
