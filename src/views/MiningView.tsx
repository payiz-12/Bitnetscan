import React, { useState } from 'react';
import { Cpu, Calculator, Zap, Server, ShieldCheck, Download, Terminal, Flame, TrendingUp, ExternalLink } from 'lucide-react';
import { NetworkStats } from '../types/blockchain';
import { priceService, BtnPriceData } from '../services/priceService';

interface MiningViewProps {
  stats: NetworkStats | null;
}

export const MiningView: React.FC<MiningViewProps> = ({ stats }) => {
  const [userHashrate, setUserHashrate] = useState('100'); // in MH/s
  const [unit, setUnit] = useState<'MH' | 'GH'>('MH');
  const [priceData, setPriceData] = useState<BtnPriceData>(priceService.getCachedPrice());

  React.useEffect(() => {
    return priceService.subscribe((data) => {
      setPriceData(data);
    });
  }, []);

  // PoW calculations:
  // Blocks per day = 86400 / 14.6 ≈ 5,918 blocks
  // Daily BTN rewards = 5,918 * 1.0 ≈ 5,918 BTN
  const blocksPerDay = Math.round(86400 / (stats?.avgBlockTimeSeconds || 14.6));
  const dailyTotalReward = blocksPerDay * 1.0;

  // Estimate user share:
  const numericHashrate = Math.max(0, parseFloat(userHashrate) || 0);
  const userRateInH = numericHashrate * (unit === 'GH' ? 1e9 : 1e6);

  // Network hashrate in H/s (Difficulty / BlockTime):
  const netRateInH = stats?.hashrateHps ?? 0;
  const userShare = netRateInH > 0 ? userRateInH / (netRateInH + userRateInH) : 0;
  const estimatedDailyBtn = netRateInH > 0 ? (userShare * dailyTotalReward).toFixed(2) : '—';
  const estimatedWeeklyBtn = netRateInH > 0 ? (userShare * dailyTotalReward * 7).toFixed(2) : '—';
  const estimatedMonthlyBtn = netRateInH > 0 ? (userShare * dailyTotalReward * 30).toFixed(2) : '—';

  return (
    <div className="space-y-8 w-full animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 p-2 flex items-center justify-center text-[#016976] shadow-xs">
            <img src="/bitnet-logo-blue.svg" alt="BTN" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Bitnet PoW & Mining Analytics</h1>
          </div>
        </div>

        {/* 5 Mining Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1 font-medium">Estimated Hashrate</span>
            <span className="text-xl font-black font-mono text-[#D68142]">
              {stats?.hashrateEstimate || 'Active'}
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
            <span className="text-xs text-slate-500 block mb-1 font-medium">Daily Emission</span>
            <span className="text-xl font-black font-mono text-slate-900">~5,918 BTN</span>
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
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-sm">
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
              ≈ ${(parseFloat(estimatedDailyBtn) * priceData.priceUsd).toFixed(2)} USD
            </span>
          </div>
          <div className="p-5 rounded-2xl bg-sky-50/70 border border-sky-200 text-center">
            <span className="text-xs text-sky-800 block mb-1 font-semibold uppercase tracking-wider">Estimated Weekly Rewards</span>
            <span className="text-2xl font-black font-mono text-sky-700">
              {estimatedWeeklyBtn} <span className="text-xs font-bold text-sky-800">BTN / week</span>
            </span>
            <span className="text-xs text-sky-600 block mt-1 font-medium font-sans">
              ≈ ${(parseFloat(estimatedWeeklyBtn) * priceData.priceUsd).toFixed(2)} USD
            </span>
          </div>
          <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 text-center">
            <span className="text-xs text-amber-900 block mb-1 font-semibold uppercase tracking-wider">Estimated Monthly Rewards</span>
            <span className="text-2xl font-black font-mono text-amber-800">
              {estimatedMonthlyBtn} <span className="text-xs font-bold text-amber-900">BTN / month</span>
            </span>
            <span className="text-xs text-amber-700 block mt-1 font-medium font-sans">
              ≈ ${(parseFloat(estimatedMonthlyBtn) * priceData.priceUsd).toFixed(2)} USD
            </span>
          </div>
        </div>
      </div>

      {/* How to Mine Quickstart Guide */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-4 shadow-sm">
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
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-[#016976]" />
            <h3 className="text-lg font-bold text-slate-900">Active Bitnet Mining Pools & Nodes</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#016976] bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
              ~9 Active Workers
            </span>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 hidden sm:inline">
              Known & Unknown
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* GTPool */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">GTPool</span>
                <span className="text-[10px] font-extrabold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Known Mining
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Bitnet genesis & primary mining pool with over 4.35M blocks mined historically.
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#016976] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                <span>~4 Workers</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">0xfad4...50de</span>
              <a
                href="https://gtpool.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-[#016976] hover:underline flex items-center gap-1"
              >
                <span>gtpool.io</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* CoolPool */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">CoolPool</span>
                <span className="text-[10px] font-extrabold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Known Mining
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Active public mining pool producing ~30% of current Bitnet blocks.
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#016976] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                <span>4 Workers</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">0x6c0d...6b08</span>
              <a
                href="https://coolpool.top"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-[#016976] hover:underline flex items-center gap-1"
              >
                <span>coolpool.top</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Unknown Miner (Solo Node) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">Unknown Miner (Solo Node)</span>
                <span className="text-[10px] font-extrabold uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300">
                  Unknown Mining
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Community Geth node mining directly on-chain producing ~55-60% of blocks.
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#016976] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                <span>1 Worker (Solo)</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">0x6afc...72a4</span>
              <span className="text-[11px] font-bold text-slate-600">Geth Linux Node</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
