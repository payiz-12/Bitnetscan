import React, { useState } from 'react';
import { Calculator, Server, Terminal, ExternalLink } from 'lucide-react';
import { Block, NetworkStats } from '../types/blockchain';
import { priceService, BtnPriceData, formatBtnInUsd } from '../services/priceService';
import { fetchLivePoolStats, getCachedPoolStats, LivePoolStats, computeLiveMiningSummary, ComputedMinerStats } from '../services/miningPoolStats';
import { KNOWN_MINING_POOLS } from '../data/miningPools';
import { isPageHidden } from '../services/pageVisibility';
import { loadMinerSample, getCachedMinerSample } from '../services/minerSample';
import { COOLPOOL_ADDR, GTPOOL_ADDR } from '../services/miningPoolStats';
import { loadRecentScan, getCachedRecentScan, RecentScan, issuancePerBlock, scanBlockTime } from '../services/chainScan';
import { ETHASH_EPOCH_LENGTH, ethashDagSize } from '../services/ethash';

// Typical tuned Ethash hashrate and power draw (full-hashrate, non-LHR cards). Real cards vary.
const GPU_PRESETS = [
  { name: 'NVIDIA RTX 4090', mhs: 130, watts: 300 },
  { name: 'NVIDIA RTX 3090', mhs: 120, watts: 290 },
  { name: 'NVIDIA RTX 3080', mhs: 97, watts: 230 },
  { name: 'NVIDIA RTX 3070', mhs: 61, watts: 120 },
  { name: 'NVIDIA RTX 3060 Ti', mhs: 60, watts: 120 },
  { name: 'NVIDIA RTX 2080 Ti', mhs: 57, watts: 200 },
  { name: 'NVIDIA GTX 1080 Ti', mhs: 45, watts: 200 },
  { name: 'NVIDIA GTX 1660 Super', mhs: 31, watts: 80 },
  { name: 'AMD RX 6900 XT', mhs: 64, watts: 150 },
  { name: 'AMD RX 6800 XT', mhs: 63, watts: 150 },
  { name: 'AMD RX 6800', mhs: 62, watts: 140 },
  { name: 'AMD RX 6700 XT', mhs: 47, watts: 110 },
  { name: 'AMD RX 6600 XT', mhs: 32, watts: 60 },
  { name: 'AMD RX 5700 XT', mhs: 54, watts: 130 },
  { name: 'AMD RX 580 8GB', mhs: 31, watts: 120 },
];

interface MiningViewProps {
  stats: NetworkStats | null;
  recentBlocks?: Block[];
  onSelectAddress?: (address: string) => void;
}

export const MiningView: React.FC<MiningViewProps> = ({ stats, recentBlocks, onSelectAddress }) => {
  const [userHashrate, setUserHashrate] = useState('100'); // in MH/s
  const [unit, setUnit] = useState<'MH' | 'GH'>('MH');
  const [gpuPreset, setGpuPreset] = useState('');
  const [gpuCount, setGpuCount] = useState('1');
  const [powerWatts, setPowerWatts] = useState('');
  const [electricityPrice, setElectricityPrice] = useState('0.10');
  const [poolFee, setPoolFee] = useState('0');
  const [scan, setScan] = useState<RecentScan | null>(() => getCachedRecentScan());

  React.useEffect(() => {
    let active = true;
    loadRecentScan().then((s) => { if (active) setScan(s); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const applyPreset = (name: string, count: string) => {
    setGpuPreset(name);
    setGpuCount(count);
    const gpu = GPU_PRESETS.find((g) => g.name === name);
    const n = Math.max(1, Math.floor(Number(count) || 1));
    if (!gpu) return;
    setUnit('MH');
    setUserHashrate(String(gpu.mhs * n));
    setPowerWatts(String(gpu.watts * n));
  };
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

  // Miner distribution over the last MINER_SAMPLE_SIZE blocks (falls back to the recent feed while loading)
  const [sampleBlocks, setSampleBlocks] = useState<Block[]>(() => getCachedMinerSample());
  React.useEffect(() => {
    let active = true;
    const load = () => loadMinerSample().then((b) => { if (active) setSampleBlocks(b); }).catch(() => {});
    load();
    const interval = setInterval(() => { if (!isPageHidden()) load(); }, 60000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  const miningSummary = React.useMemo(() => {
    const blocks = sampleBlocks.length > 0 ? sampleBlocks : recentBlocks || [];
    return computeLiveMiningSummary(blocks, stats?.hashrateHps, poolStats);
  }, [sampleBlocks, recentBlocks, stats?.hashrateHps, poolStats]);
  const coolPool = poolStats[COOLPOOL_ADDR];
  const poolGuides = [
    { name: 'CoolPool', site: 'coolpool.top', stats: coolPool },
    { name: 'GTPool', site: 'gtpool.io', stats: poolStats[GTPOOL_ADDR] },
  ].filter((p): p is { name: string; site: string; stats: LivePoolStats } => !!p.stats?.servers?.length);

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
        poolHashrateGh: poolStats[p.address]?.hashrateGh,
        count: 0,
        percent: '0.0',
        estimatedHashrateGh: null,
      }));
    return [...miningSummary.miners, ...idle];
  }, [miningSummary, poolStats]);

  // Block time and BTN created per block over the last 2,000 blocks (subsidy + uncle rewards);
  // until that scan is in, the 120-block average and the 1 BTN subsidy alone.
  const scanTime = scan ? scanBlockTime(scan) : null;
  const avgBlockTime = scanTime ?? (stats?.avgBlockTimeSeconds && stats.avgBlockTimeSeconds > 0 ? stats.avgBlockTimeSeconds : null);
  const blocksPerDay = avgBlockTime ? Math.round(86400 / avgBlockTime) : null;
  const rewardPerBlock = scan ? issuancePerBlock(scan) : 1.0;
  const dailyTotalReward = (blocksPerDay ?? 0) * rewardPerBlock;
  const epoch = stats?.latestBlock ? Math.floor(stats.latestBlock / ETHASH_EPOCH_LENGTH) : null;
  const dagGiB = epoch !== null ? ethashDagSize(epoch) / 2 ** 30 : null;

  // Estimate user share:
  const numericHashrate = Math.max(0, parseFloat(userHashrate) || 0);
  const userRateInH = numericHashrate * (unit === 'GH' ? 1e9 : 1e6);

  // Network hashrate in H/s (Difficulty / BlockTime):
  const netRateInH = stats?.hashrateHps ?? 0;
  const userShare = netRateInH > 0 ? userRateInH / (netRateInH + userRateInH) : 0;
  const canEstimate = netRateInH > 0 && blocksPerDay !== null;
  const feeFactor = 1 - Math.min(100, Math.max(0, Number(poolFee) || 0)) / 100;
  const dailyBtn = canEstimate ? userShare * dailyTotalReward * feeFactor : null;
  const estimatedDailyBtn = dailyBtn !== null ? dailyBtn.toFixed(2) : '—';
  const estimatedWeeklyBtn = dailyBtn !== null ? (dailyBtn * 7).toFixed(2) : '—';
  const estimatedMonthlyBtn = dailyBtn !== null ? (dailyBtn * 30).toFixed(2) : '—';
  const watts = Math.max(0, Number(powerWatts) || 0);
  const dailyPowerCost = (watts * 24 / 1000) * Math.max(0, Number(electricityPrice) || 0);
  const dailyRevenueUsd = dailyBtn !== null && priceData.available ? dailyBtn * priceData.priceUsd : null;
  const dailyProfitUsd = dailyRevenueUsd !== null ? dailyRevenueUsd - dailyPowerCost : null;
  const breakEvenPrice = dailyBtn && dailyBtn > 0 && dailyPowerCost > 0 ? dailyPowerCost / dailyBtn : null;
  const money = (v: number) => `${v < 0 ? '−' : ''}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
          <div
            className="p-4 rounded-2xl bg-slate-50 border border-slate-200"
            title="The fewest miners that together produced more than half of the sampled blocks. 1 means a single miner holds a majority of the hashrate."
          >
            <span className="text-xs text-slate-500 block mb-1 font-medium">Nakamoto Coefficient</span>
            <span className={`text-xl font-black font-mono ${
              miningSummary.nakamotoCoefficient === null ? 'text-slate-900'
                : miningSummary.nakamotoCoefficient <= 1 ? 'text-rose-700'
                : miningSummary.nakamotoCoefficient === 2 ? 'text-amber-700' : 'text-emerald-700'
            }`}>
              {miningSummary.nakamotoCoefficient ?? '…'}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {miningSummary.topSharePercent !== null
                ? `Largest miner ${miningSummary.topSharePercent.toFixed(1)}% of last ${miningSummary.totalBlocksSampled} blocks`
                : 'Loading blocks…'}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Mining Profitability Calculator */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Calculator className="w-5 h-5 text-[#016976]" />
          <h3 className="text-lg font-bold text-slate-900">Mining Profitability Calculator</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <label htmlFor="gpu-preset" className="block text-xs font-semibold text-slate-700">GPU (optional)</label>
            <select
              id="gpu-preset"
              value={gpuPreset}
              onChange={(e) => applyPreset(e.target.value, gpuCount)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 text-sm font-semibold shadow-xs cursor-pointer"
            >
              <option value="">Enter hashrate and power yourself</option>
              {GPU_PRESETS.map((g) => (
                <option key={g.name} value={g.name}>{g.name} · {g.mhs} MH/s · {g.watts} W</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="gpu-count" className="block text-xs font-semibold text-slate-700">Number of GPUs</label>
            <input
              id="gpu-count"
              type="number"
              min={1}
              value={gpuCount}
              onChange={(e) => applyPreset(gpuPreset, e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-slate-900 text-sm focus:outline-none focus:border-[#016976] shadow-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <label htmlFor="calc-hashrate" className="block text-xs font-semibold text-slate-700">Hashrate</label>
            <div className="flex gap-2">
              <input
                id="calc-hashrate"
                type="number"
                min={0}
                value={userHashrate}
                onChange={(e) => { setUserHashrate(e.target.value); setGpuPreset(''); }}
                placeholder="100"
                className="flex-1 min-w-0 bg-white border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-slate-900 text-sm focus:outline-none focus:border-[#016976] shadow-xs"
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as 'MH' | 'GH')}
                aria-label="Hashrate unit"
                className="bg-white border border-slate-300 rounded-xl px-2 py-2.5 font-mono text-slate-900 text-sm font-bold shadow-xs cursor-pointer"
              >
                <option value="MH">MH/s</option>
                <option value="GH">GH/s</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="calc-power" className="block text-xs font-semibold text-slate-700">Power draw (W)</label>
            <input
              id="calc-power"
              type="number"
              min={0}
              value={powerWatts}
              onChange={(e) => { setPowerWatts(e.target.value); setGpuPreset(''); }}
              placeholder="0"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-slate-900 text-sm focus:outline-none focus:border-[#016976] shadow-xs"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="calc-electricity" className="block text-xs font-semibold text-slate-700">Electricity ($ per kWh)</label>
            <input
              id="calc-electricity"
              type="number"
              min={0}
              step="0.01"
              value={electricityPrice}
              onChange={(e) => setElectricityPrice(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-slate-900 text-sm focus:outline-none focus:border-[#016976] shadow-xs"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="calc-fee" className="block text-xs font-semibold text-slate-700">Pool fee (%)</label>
            <input
              id="calc-fee"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={poolFee}
              onChange={(e) => setPoolFee(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-slate-900 text-sm focus:outline-none focus:border-[#016976] shadow-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
          <span>Network share: <span className="font-bold text-slate-900">{(userShare * 100).toFixed(3)}%</span></span>
          <span>
            Reward per block: <span className="font-bold text-slate-900">{rewardPerBlock.toFixed(4)} BTN</span>
            {scan ? ` (subsidy + uncle rewards, last ${(scan.to - scan.from + 1).toLocaleString()} blocks)` : ' (subsidy only, loading uncle data)'}
          </span>
          {coolPool?.feePercent !== undefined && <span>CoolPool fee: {coolPool.feePercent}%</span>}
          {dagGiB !== null && <span>DAG: {dagGiB.toFixed(2)} GiB (epoch {epoch}); the GPU needs more memory than this</span>}
        </div>

        {/* Reward Outcomes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

        {/* Costs and profit */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block font-semibold">Electricity per day</span>
            <span className="text-xl font-black font-mono text-slate-900">{watts > 0 ? money(dailyPowerCost) : '—'}</span>
            <span className="text-[11px] text-slate-500 block">{watts > 0 ? `${((watts * 24) / 1000).toFixed(2)} kWh` : 'Enter the power draw'}</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block font-semibold">Profit per day</span>
            <span className="text-xl font-black font-mono text-slate-900">{dailyProfitUsd !== null ? money(dailyProfitUsd) : '—'}</span>
            <span className={`text-[11px] font-semibold block ${dailyProfitUsd === null ? 'text-slate-500' : dailyProfitUsd >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {dailyProfitUsd === null ? (priceData.available ? 'Waiting for network data' : 'No NestEx price') : dailyProfitUsd >= 0 ? '▲ Rewards exceed electricity' : '▼ Electricity costs more than the rewards'}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block font-semibold">Break-even BTN price</span>
            <span className="text-xl font-black font-mono text-slate-900">{breakEvenPrice !== null ? `$${breakEvenPrice.toPrecision(3)}` : '—'}</span>
            <span className="text-[11px] text-slate-500 block">{priceData.available ? `NestEx now: ${priceData.priceFormatted}` : 'Price at which profit is zero'}</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-500">
          Estimates assume the current network hashrate, block time and uncle rate stay the same. GPU figures are typical tuned Ethash values; your card may differ.
        </p>
      </div>

      {/* How to Mine Quickstart Guide */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 md:p-8 space-y-4 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-[#D68142]" />
          <span>How to Mine Bitnet (BTN)</span>
        </h3>

        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            Bitnet uses Ethash, so standard GPU miners (lolMiner, T-Rex, Gminer, TeamRedMiner) work. You can join a pool or mine solo with the{' '}
            <a href="https://github.com/BitnetMoney/bitnet-desktop-node" target="_blank" rel="noopener noreferrer" className="text-[#016976] font-bold hover:underline">Bitnet Desktop Node</a>.
          </p>

          {poolGuides.length > 0 ? (
            <>
              {poolGuides.map(({ name, site, stats: pool }) => (
                <div key={name} className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">{name} servers</span>
                    <span className="text-[11px] text-slate-500">
                      {pool.feePercent !== undefined && `Fee ${pool.feePercent}% · `}
                      {pool.minPayoutBtn !== undefined && `Min payout ${pool.minPayoutBtn} BTN · `}
                      from {site}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 font-mono">
                    {pool.servers!.map((srv) => (
                      <div key={srv.host} className="px-4 py-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 select-all break-all">{srv.host}</span>
                        <span className="text-[11px] text-slate-500 font-sans">{srv.region}{srv.note ? ` · ${srv.note}` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {coolPool?.servers && coolPool.servers.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#0B132B] border border-slate-700 font-mono space-y-2">
                  <div className="text-slate-400 font-semibold"># lolMiner (CoolPool)</div>
                  <div className="text-emerald-400 font-bold select-all break-all">
                    lolMiner --algo ETHASH --pool {coolPool.servers[0].host} --user YOUR_BTN_ADDRESS
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-500">Pool server lists could not be loaded.</p>
          )}
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
            Share of last {miningSummary.totalBlocksSampled} blocks{sampleBlocks.length === 0 ? ' (loading…)' : ''}
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
                      {m.minersCount} {m.minersCount === 1 ? 'Worker' : 'Workers'}
                      {m.poolHashrateGh !== undefined && ` · ${m.poolHashrateGh.toFixed(2)} GH/s`}
                      {' · '}{m.workersSource}
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1.5 text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md"
                      title="A solo miner is not part of a pool, so no service publishes its workers. The hashrate is estimated from its share of recent blocks."
                    >
                      {m.category === 'known' ? 'Pool data unavailable' : 'Solo miner'}
                      {m.estimatedHashrateGh !== null && m.count > 0 ? ` · ≈ ${m.estimatedHashrateGh} GH/s` : ''}
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
          Workers and pool hashrate come from coolpool.top and gtpool.io. Solo miners do not publish workers; their hashrate is estimated from block share.
        </p>
      </div>
    </div>
  );
};
