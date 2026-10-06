import React, { useState, useMemo, useEffect } from 'react';
import { 
  Activity, BarChart3, TrendingUp, Cpu, Flame, Layers, 
  ShieldCheck, Zap, ArrowUpRight, Clock, Calendar, Check, Coins, ExternalLink
} from 'lucide-react';
import { Block, NetworkStats } from '../types/blockchain';
import { loadHashrateHistory, getCachedHashrateHistory, HashratePoint } from '../services/hashrate';
import { rpcService } from '../services/rpc';
import { identifyMinerPool } from '../data/miningPools';
import { loadTransactionHistory, loadSupplyHistory, TransactionHistory, TransactionHistoryPoint, activityBuckets } from '../services/transactionHistory';
import { loadWhitepaperSupplyHistory, getCachedWhitepaperSupply } from '../services/whitepaperSupply';
import { formatEther } from 'ethers';

interface NetworkActivityChartsProps {
  recentBlocks: Block[];
  stats: NetworkStats | null;
  onSelectBlock: (blockNumber: number) => void;
  onSelectAddress: (address: string) => void;
}

type TimeframeType = '1d' | '7d' | '30d' | '90d' | '1y' | 'all';
type MetricType = 'volume' | 'txs' | 'hashrate' | 'supply';

export const NetworkActivityCharts: React.FC<NetworkActivityChartsProps> = ({
  recentBlocks,
  stats,
  onSelectBlock,
  onSelectAddress,
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeType>('30d');
  const [metric, setMetric] = useState<MetricType>('volume');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [activity, setActivity] = useState<Record<string, TransactionHistory>>({});
  const [activityState, setActivityState] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 640);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // 60-second periodic refresh for active chart view without resetting long scans
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshTick((t) => t + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const activityKey = `${metric}:${timeframe}`;
  const activeHistory = activity[activityKey];
  useEffect(() => {
    setHoveredPointIndex(null);
    if (metric !== 'volume' && metric !== 'txs') return;
    const controller = new AbortController();
    setActivityState('Loading on-chain records…');
    const update = (result: TransactionHistory) => {
      if (!controller.signal.aborted) setActivity(previous => ({ ...previous, [activityKey]: result }));
    };
    loadTransactionHistory(metric, timeframe, controller.signal, update)
      .then(result => { update(result); if (!controller.signal.aborted) setActivityState(''); })
      .catch(() => { if (!controller.signal.aborted) setActivityState('Data refresh timed out. Retaining last verified records.'); });
    return () => controller.abort();
  }, [metric, timeframe, refreshTick]);

  // 1. Process recent blocks data for live bar & area charts (take up to last 24 blocks, chronologically L to R)
  const blocksData = useMemo(() => {
    const list = [...recentBlocks].slice(0, 24).reverse();
    return list.map((b) => {
      const gasPercent = b.gasLimit > 0 ? (b.gasUsed / b.gasLimit) * 100 : 0;
      const txCount = Array.isArray(b.transactions) ? b.transactions.length : 0;
      const volumeBtn = Array.isArray(b.transactions)
        ? b.transactions.reduce((acc: number, tx: any) => acc + (typeof tx === 'object' && tx.value ? parseFloat(tx.value) || 0 : 0), 0)
        : 0;

      return {
        number: b.number,
        txCount,
        volumeBtn,
        gasUsed: b.gasUsed || 0,
        gasLimit: b.gasLimit || 150000000,
        gasPercent: Math.min(gasPercent, 100),
        miner: b.miner,
        extraDataAscii: b.extraDataAscii,
        timestamp: b.timestamp,
      };
    });
  }, [recentBlocks]);

  // Derived metrics from recent blocks
  const maxTxCount = useMemo(() => {
    const max = Math.max(...blocksData.map((b) => b.txCount), 0);
    return max;
  }, [blocksData]);

  const avgTxCount = useMemo(() => {
    if (blocksData.length === 0) return 0;
    const total = blocksData.reduce((acc, b) => acc + b.txCount, 0);
    return (total / blocksData.length).toFixed(1);
  }, [blocksData]);

  const avgGasPercent = useMemo(() => {
    if (blocksData.length === 0) return '0.0';
    const total = blocksData.reduce((acc, b) => acc + b.gasPercent, 0);
    return (total / blocksData.length).toFixed(1);
  }, [blocksData]);

  // Total active miners / pools detected in the blocks sample (defaults to 3 known on-chain pools)
  const totalActiveMiners = useMemo(() => {
    if (blocksData.length === 0) return 3;
    const set = new Set(blocksData.map((b) => b.miner.toLowerCase()));
    return Math.max(set.size, 3);
  }, [blocksData]);

  // 2. Miner & pool distribution across recent blocks
  const minerDistribution = useMemo(() => {
    if (blocksData.length === 0) return [];
    const counts: Record<string, { count: number; extraDataAscii?: string }> = {};
    blocksData.forEach((b) => {
      const m = b.miner.toLowerCase();
      if (!counts[m]) {
        counts[m] = { count: 0, extraDataAscii: b.extraDataAscii };
      }
      counts[m].count += 1;
    });

    const total = blocksData.length;
    const sorted = Object.entries(counts)
      .map(([miner, data]) => {
        const poolInfo = identifyMinerPool(miner, data.extraDataAscii);
        return {
          miner,
          poolName: poolInfo.name,
          poolTag: poolInfo.tag,
          poolUrl: poolInfo.url,
          badge: poolInfo.badge,
          count: data.count,
          percent: ((data.count / total) * 100).toFixed(1),
        };
      })
      .sort((a, b) => b.count - a.count);

    return sorted;
  }, [blocksData]);

  const [hashHistories, setHashHistories] = useState<Record<string, HashratePoint[]>>({});
  const hashHistory = hashHistories[timeframe] || getCachedHashrateHistory(timeframe);
  const [hashState, setHashState] = useState('');
  const latestForHash = recentBlocks.reduce<Block | null>((best, b) => !best || b.number > best.number ? b : best, null);
  const hashRefresh = latestForHash ? Math.floor(latestForHash.timestamp / 300) : 0;

  useEffect(() => {
    const controller = new AbortController();
    setHoveredPointIndex(null);

    const cached = getCachedHashrateHistory(timeframe);
    if (cached.length > 0) {
      setHashHistories((prev) => (prev[timeframe] ? prev : { ...prev, [timeframe]: cached }));
    }
    setHashState(cached.length ? 'Showing cached curve; refreshing on-chain…' : 'Scanning on-chain blocks…');

    (async () => {
      const latest = latestForHash || (await rpcService.getBlock('latest', false));
      if (!latest) throw new Error('Block data could not be fetched');
      return loadHashrateHistory(timeframe, latest, (n) => rpcService.getBlock(n, false), controller.signal);
    })()
      .then((data) => {
        if (!controller.signal.aborted && data.length > 0) {
          setHashHistories((prev) => ({ ...prev, [timeframe]: data }));
          setHashState('');
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.warn('Hashrate fetch:', err);
          const hasCached = getCachedHashrateHistory(timeframe).length > 0;
          setHashState(hasCached ? '' : 'Failed to query historical on-chain block data.');
        }
      });

    return () => controller.abort();
  }, [timeframe, hashRefresh, !!latestForHash]);

  const [supplyHistories, setSupplyHistories] = useState<Record<string, TransactionHistoryPoint[]>>({});
  const [supplyState, setSupplyState] = useState('');

  useEffect(() => {
    if (metric !== 'supply') return;
    const controller = new AbortController();

    const cached = getCachedWhitepaperSupply(timeframe);
    if (cached.length > 0) {
      setSupplyHistories((prev) => (prev[timeframe]?.length ? prev : { ...prev, [timeframe]: cached }));
    }
    setSupplyState(cached.length ? 'Showing cached on-chain curve; refreshing…' : 'Pulling on-chain supply data from RPC…');

    (async () => {
      // 1. Try official indexer first if available
      try {
        const indexerPoints = await loadSupplyHistory(timeframe, controller.signal);
        if (indexerPoints.some(p => p.supply !== null)) {
          return { points: indexerPoints, source: 'indexer' };
        }
      } catch {}

      // 2. Pull directly on-chain from blockchain RPC nodes
      const latest = latestForHash || (await rpcService.getBlock('latest', false));
      const onChainPoints = await loadWhitepaperSupplyHistory(
        timeframe,
        latest || { number: stats?.latestBlock || 7721500, timestamp: Math.floor(Date.now() / 1000) },
        (n) => rpcService.getBlock(n, false),
        controller.signal
      );
      return { points: onChainPoints, source: 'onchain' };
    })()
      .then(({ points, source }) => {
        if (!controller.signal.aborted && points.length > 0) {
          setSupplyHistories((prev) => ({ ...prev, [timeframe]: points }));
          setSupplyState(source === 'onchain' ? 'On-Chain PoW Issuance (1.0 BTN/block subsidy, 0 premine)' : '');
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.warn('Supply fetch error:', err);
          const hasCached = getCachedWhitepaperSupply(timeframe).length > 0;
          if (!hasCached) {
            setSupplyState('Failed to query on-chain supply data.');
          }
        }
      });

    return () => controller.abort();
  }, [metric, timeframe, refreshTick, latestForHash?.number]);

  const supplyData = supplyHistories[timeframe] || [];
  const latestSupply = [...supplyData].reverse().find(p => p.supply !== null && Number.isFinite(p.supply));

  const timeframeData = metric === 'hashrate'
    ? hashHistory.map((p) => ({ ...p, volume: 0, txs: 0, supply: 0 }))
    : metric === 'supply'
    ? supplyData
    : metric === 'txs' || metric === 'volume' ? activeHistory?.points || [] : [];

  const timeframeSummary = useMemo(() => {
    const known = timeframeData.filter(d => metric === 'volume' ? d.volume != null : d.txs != null);
    const totalWei = known.reduce((sum, d) => sum + BigInt(String(('volumeWei' in d ? d.volumeWei : undefined) || '0')), 0n);
    return {
      txs: known.reduce((sum, d) => sum + (d.txs ?? 0), 0),
      volFormatted: known.length ? `${formatEther(totalWei)} BTN` : 'Unavailable',
      covered: known.length,
    };
  }, [timeframeData, metric]);

  // 4. SVG Dimensions & Grid Scale (Clear Left & Bottom Axes)
  const svgWidth = isMobile ? 360 : 740;
  const svgHeight = isMobile ? 240 : 320;
  const paddingLeft = isMobile ? 62 : 85;  // Space for left Y-axis labels - ample breathing room
  const paddingRight = isMobile ? 12 : 25;
  const paddingTop = isMobile ? 10 : 20;
  const paddingBottom = isMobile ? 26 : 40; // Space for bottom X-axis labels

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  // Adaptive label step for bottom X-axis to keep date labels perfectly legible
  const labelStep = useMemo(() => {
    const len = timeframeData.length;
    if (len <= 8) return 1;
    if (len <= 15) return 2;
    if (len <= 30) return 4;
    if (len <= 45) return 5;
    return Math.max(1, Math.round(len / 7));
  }, [timeframeData.length]);

  // Extract values and min/max bounds
  const { minVal, maxVal, valRange, yTicks } = useMemo(() => {
    const rawValues = timeframeData.map((d) =>
      metric === 'volume'
        ? d.volume
        : metric === 'txs'
        ? d.txs
        : metric === 'hashrate'
        ? d.hashrate
        : d.supply
    ).filter((v): v is number => v != null && Number.isFinite(v));

    let rawMin = rawValues.length ? Math.min(...rawValues) : 0;
    let rawMax = rawValues.length ? Math.max(...rawValues) : 0;

    if (rawMin === rawMax) {
      if (rawMin === 0) {
        rawMax = 5;
      } else {
        rawMin *= 0.9;
        rawMax *= 1.1;
      }
    }

    // Add 8% headroom
    const range = rawMax - rawMin;
    const min = Math.max(0, rawMin - range * 0.05);
    const max = rawMax + range * 0.08;
    const totalRange = max - min || 1;

    // 5 horizontal grid ticks
    const ticksCount = 5;
    const ticks = [];
    for (let i = 0; i < ticksCount; i++) {
      const val = min + (i / (ticksCount - 1)) * (max - min);
      const y = paddingTop + plotHeight - (i / (ticksCount - 1)) * plotHeight;
      ticks.push({ val, y });
    }

    return { minVal: min, maxVal: max, valRange: totalRange, yTicks: ticks };
  }, [timeframeData, metric, plotHeight, paddingTop]);

  // Format Y-axis value based on metric
  const formatYAxis = (val: number) => {
    if (metric === 'volume') {
      if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M${isMobile ? '' : ' BTN'}`;
      if (val >= 1e3) return `${(val / 1e3).toFixed(val >= 10000 ? 0 : 1)}K${isMobile ? '' : ' BTN'}`;
      return `${Math.round(val)}${isMobile ? '' : ' BTN'}`;
    }
    if (metric === 'txs') {
      if (val >= 1000) return `${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}K${isMobile ? '' : ' tx'}`;
      return `${Math.round(val)}${isMobile ? '' : ' tx'}`;
    }
    if (metric === 'hashrate') {
      if (val >= 1000) return `${(val / 1000).toFixed(1)}${isMobile ? ' TH' : ' TH/s'}`;
      if (val < 1 && val > 0) return `${(val * 1000).toFixed(0)}${isMobile ? ' MH' : ' MH/s'}`;
      return `${val >= 10 ? val.toFixed(0) : val.toFixed(1)}${isMobile ? ' GH' : ' GH/s'}`;
    }
    if (metric === 'supply') {
      if (valRange < 100000) {
        return `${(val / 1e6).toFixed(3)}M`;
      }
      if (val >= 1e6) {
        return `${(val / 1e6).toFixed(2)}M`;
      }
      if (val >= 1e3) {
        return `${(val / 1e3).toFixed(1)}K`;
      }
      return `${Math.round(val)}`;
    }
    return String(Math.round(val));
  };

  // Calculate coordinates for data points
  const points = useMemo(() => {
    return timeframeData.map((d, idx) => {
      const val =
        metric === 'volume'
          ? d.volume
          : metric === 'txs'
          ? d.txs
          : metric === 'hashrate'
          ? d.hashrate
          : d.supply;
      const firstTime = timeframeData[0].timestamp;
      const lastTime = timeframeData[timeframeData.length - 1].timestamp;
      const x = paddingLeft + (lastTime > firstTime ? (d.timestamp - firstTime) / (lastTime - firstTime) : 0) * plotWidth;
      const y = paddingTop + plotHeight - (((val ?? minVal) - minVal) / valRange) * plotHeight;
      return { x, y, val, valid: val != null && Number.isFinite(val), date: d.date, fullDate: d.fullDate, item: d };
    });
  }, [timeframeData, metric, minVal, valRange, plotWidth, plotHeight, paddingLeft, paddingTop]);

  const polylinePoints = useMemo(() => {
    return points.map((p,i) => p.valid ? `${i===0 || !points[i-1].valid ? 'M' : 'L'}${p.x},${p.y}` : '').join(' ');
  }, [points]);

  const areaPathD = useMemo(() => {
    if (points.length === 0 || points.some(p => !p.valid)) return '';
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const bottomY = paddingTop + plotHeight;

    let path = `M ${firstX},${bottomY} `;
    points.forEach((p) => {
      path += `L ${p.x},${p.y} `;
    });
    path += `L ${lastX},${bottomY} Z`;
    return path;
  }, [points, paddingTop, plotHeight]);

  const themeColor =
    metric === 'volume'
      ? '#016976'
      : metric === 'txs'
      ? '#0D9488'
      : metric === 'hashrate'
      ? '#D68142'
      : '#0284C7';

  return (
    <div className="space-y-6">
      {/* Header section with live badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#016976] shadow-xs">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>Bitnet Network Activity & Performance Analytics</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-[#016976] border border-teal-200">
                Live RPC
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono">
          <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#016976]" />
            <span>{blocksData.length}-Block Rolling Window</span>
          </span>
        </div>
      </div>

      {/* Grid: 2 Micro Live Charts + Miner Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Transactions per Block (Live Tx Bar Chart) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#016976]" />
                <h3 className="text-sm font-bold text-slate-900">Transactions per Block</h3>
              </div>
              <span className="text-[11px] font-mono font-bold text-[#016976] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                Avg. {avgTxCount} tx
              </span>
            </div>
          </div>

          {/* Dynamic SVG / HTML Bar Chart */}
          <div className="pt-2">
            <div className="h-56 sm:h-60 flex items-end gap-1.5 px-1 pb-1 border-b border-slate-200 relative">
              {blocksData.map((b, idx) => {
                // Height scaled by actual tx count: 0 tx is 6%, 1 tx is 22%, 2 tx is 36%, 5+ tx is 65-100%
                const heightPct = b.txCount === 0 
                  ? 6 
                  : Math.min(100, 18 + Math.min(b.txCount * 12, 82));
                const isHovered = hoveredBarIndex === idx;

                const barBg = isHovered
                  ? 'bg-[#016976] shadow-md scale-y-105'
                  : b.txCount === 0
                  ? 'bg-slate-200'
                  : b.txCount === 1
                  ? 'bg-teal-500 hover:bg-teal-600'
                  : b.txCount <= 4
                  ? 'bg-[#016976] hover:bg-[#01525d]'
                  : 'bg-[#014E58] hover:bg-[#01383e]';

                return (
                  <div
                    key={b.number}
                    onMouseEnter={() => setHoveredBarIndex(idx)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                    onClick={() => onSelectBlock(b.number)}
                    className="flex-1 h-full flex items-end justify-center cursor-pointer relative group"
                  >
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-sm transition-all duration-200 ${barBg}`}
                    />

                    {/* Tooltip on Hover */}
                    {isHovered && (
                      <div className="absolute bottom-full mb-2 z-30 pointer-events-none transform -translate-x-1/2 left-1/2 min-w-[130px] p-2 bg-[#0F172A] text-white rounded-xl text-[10px] font-mono shadow-xl border border-slate-700 space-y-0.5">
                        <div className="text-teal-300 font-bold">Block #{b.number}</div>
                        <div>Transactions: <span className="font-bold text-white">{b.txCount} txns</span></div>
                        <div className="text-slate-400 truncate">Miner: {b.miner.slice(0, 8)}...</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1.5">
              <span>#{blocksData[0]?.number || '...'}</span>
              <span className="text-slate-500 font-sans">Recent Blocks (Past → Present)</span>
              <span>#{blocksData[blocksData.length - 1]?.number || '...'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Peak Block Volume</span>
              <span className="font-black font-mono text-slate-900">{maxTxCount} tx</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Sampled Blocks</span>
              <span className="font-black font-mono text-slate-900">{blocksData.length} blocks</span>
            </div>
          </div>
        </div>

        {/* Chart 2: Block Gas Utilization % */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#D97706]" />
                <h3 className="text-sm font-bold text-slate-900">Block Capacity & Gas Load</h3>
              </div>
              <span className="text-[11px] font-mono font-bold text-[#D97706] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                {blocksData.some(b => b.txCount > 0 || b.gasUsed > 0)
                  ? `${blocksData.reduce((acc, b) => acc + (b.gasUsed || b.txCount * 21000), 0).toLocaleString()} Gas (${avgGasPercent}%)`
                  : `${avgGasPercent}% Utilization`}
              </span>
            </div>
          </div>

          {/* Utilization Bars */}
          <div className="pt-2">
            <div className="h-56 sm:h-60 flex items-end gap-1.5 px-1 pb-1 border-b border-slate-200 relative">
              {blocksData.map((b, idx) => {
                const effectiveGas = Math.max(b.gasUsed, b.txCount * 21000);
                const hasTx = b.txCount > 0 || effectiveGas > 0;
                const displayHeight = !hasTx 
                  ? 6 
                  : Math.min(100, Math.max(24, Math.min(b.gasPercent * 6 + b.txCount * 14, 100)));
                const isHovered = hoveredBarIndex === idx;

                const barBg = isHovered
                  ? 'bg-[#D97706] shadow-md scale-y-105'
                  : !hasTx
                  ? 'bg-slate-200'
                  : b.txCount === 1
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'bg-[#D97706] hover:bg-amber-700';

                return (
                  <div
                    key={b.number}
                    onMouseEnter={() => setHoveredBarIndex(idx)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                    onClick={() => onSelectBlock(b.number)}
                    className="flex-1 h-full flex items-end justify-center cursor-pointer relative group"
                  >
                    <div
                      style={{ height: `${displayHeight}%` }}
                      className={`w-full rounded-t-sm transition-all duration-200 ${barBg}`}
                    />

                    {/* Tooltip on Hover */}
                    {isHovered && (
                      <div className="absolute bottom-full mb-2 z-30 pointer-events-none transform -translate-x-1/2 left-1/2 min-w-[140px] p-2 bg-[#0F172A] text-white rounded-xl text-[10px] font-mono shadow-xl border border-slate-700 space-y-0.5">
                        <div className="text-amber-300 font-bold">Block #{b.number}</div>
                        <div>Gas Used: <span className="font-bold text-white">{effectiveGas.toLocaleString()} gas</span></div>
                        <div className="text-slate-400">Transactions: {b.txCount} tx</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1.5">
              <span>0% Load</span>
              <span className="text-slate-500 font-sans">Target: 150M Gas</span>
              <span>100% Limit</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Network Congestion</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Fluid / Low Gas</span>
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Base Gas Price</span>
              <span className="font-black font-mono text-slate-900">
                {stats?.gasPriceGwei != null ? `${stats.gasPriceGwei} Gwei` : 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Chart 3: Mining Pool Distribution */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#016976]" />
                <h3 className="text-sm font-bold text-slate-900">Mining Pool Distribution</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#016976] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                  {totalActiveMiners} Active Pools
                </span>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 hidden sm:inline">
                  Decentralized PoW
                </span>
              </div>
            </div>

            {/* Total miners & sample sub-bar */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 px-0.5">
              <span>Active Entities: <strong className="text-slate-900 font-semibold">{totalActiveMiners} Pools / Nodes</strong></span>
              <span>Sample: <strong className="text-slate-900 font-semibold">{blocksData.length || 15} Blocks</strong></span>
            </div>
          </div>

          {/* Breakdown progress rows */}
          <div className="space-y-3 py-1">
            {minerDistribution.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">Scanning miner distribution...</div>
            ) : (
              minerDistribution.map((item, idx) => {
                const colors = [
                  'bg-[#016976]',
                  'bg-[#D97706]',
                  'bg-[#059669]',
                  'bg-[#0284C7]',
                ];
                const barColor = colors[idx % colors.length];

                return (
                  <div key={item.miner} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${barColor}`} />
                        <button
                          onClick={() => onSelectAddress(item.miner)}
                          className="text-slate-900 hover:text-[#016976] hover:underline font-bold text-xs truncate flex items-center gap-1"
                          title={`${item.poolName} - ${item.miner}`}
                        >
                          <span>{item.poolName}</span>
                        </button>
                        {item.poolUrl && (
                          <a
                            href={item.poolUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-400 hover:text-[#016976] inline-flex items-center transition-colors"
                            title={`Open ${item.poolName} (${item.poolUrl})`}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <span className="text-[10px] font-mono text-slate-400 hidden min-[400px]:inline">
                          ({item.miner.slice(0, 6)}...{item.miner.slice(-4)})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 text-xs font-mono">
                        <span className="font-bold text-slate-900">
                          {item.percent}%
                        </span>
                        <span className="text-slate-400 text-[11px] font-sans">
                          ({item.count} blk)
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${item.percent}%` }}
                        className={`h-full rounded-full ${barColor} transition-all duration-500`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Panel 4: Multi-Timeframe Trend Analytics */}
      <div className="bg-white rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-sm space-y-4 sm:space-y-6">
        {/* Top Controls: Title, Metric Tabs, and Timeframe Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#016976]" />
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Network Activity & History
              </h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-[#016976] border border-teal-200">
                {timeframe === '1d'
                  ? 'Last 24 Hours'
                  : timeframe === '7d'
                  ? 'Last 7 Days'
                  : timeframe === '30d'
                  ? 'Last 30 Days'
                  : timeframe === '90d'
                  ? 'Last 90 Days'
                  : timeframe === '1y'
                  ? 'Last 1 Year'
                  : 'All-Time'}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-[#D68142] border border-amber-200 font-mono">
                {metric === 'volume' ? `${timeframeSummary.volFormatted}` : metric === 'txs' ? (timeframeSummary.covered ? `${timeframeSummary.txs.toLocaleString()} tx` : 'Transactions') : metric === 'supply' ? (latestSupply ? `${latestSupply.supplyText} BTN` : 'Circulating Supply') : 'PoW Hashrate'}
              </span>
              {(metric === 'volume' || metric === 'txs') && activityState && <span
                className="text-[11px] text-slate-500 font-medium" role="status" title={activityState}
              >{activityState}</span>}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            {/* Metric Switcher - 2x2 grid on mobile, inline flex on desktop */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 w-full sm:w-auto">
              <button
                onClick={() => setMetric('volume')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center sm:justify-start gap-1.5 text-center ${
                  metric === 'volume'
                    ? 'bg-[#016976] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Coins className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate"><span className="hidden sm:inline">Transfer </span>Volume</span>
              </button>
              <button
                onClick={() => setMetric('txs')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center sm:justify-start gap-1.5 text-center ${
                  metric === 'txs'
                    ? 'bg-[#0D9488] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Transactions<span className="hidden sm:inline"> (Tx)</span></span>
              </button>
              <button
                onClick={() => setMetric('hashrate')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center sm:justify-start gap-1.5 text-center ${
                  metric === 'hashrate'
                    ? 'bg-[#D68142] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate"><span className="hidden sm:inline">Mining </span>Hashrate</span>
              </button>
              <button
                onClick={() => setMetric('supply')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center sm:justify-start gap-1.5 text-center ${
                  metric === 'supply'
                    ? 'bg-[#0284C7] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate"><span className="hidden sm:inline">Circulating </span>Supply</span>
              </button>
            </div>

            {/* Timeframe Switcher - 6-col grid on mobile, inline flex on desktop */}
            <div className="grid grid-cols-6 sm:flex sm:items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 w-full sm:w-auto">
              {[
                { id: '1d', label: '24H' },
                { id: '7d', label: '7D' },
                { id: '30d', label: '30D' },
                { id: '90d', label: '90D' },
                { id: '1y', label: '1Y' },
                { id: 'all', label: 'ALL' },
              ].map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setTimeframe(tf.id as TimeframeType)}
                  className={`px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer text-center ${
                    timeframe === tf.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {metric === 'hashrate' && (
          <p className="text-xs text-slate-500">
            On-chain estimated network hashrate: work delta / time elapsed. Each data point is the average for its period.{' '}
            {hashState && <span className="font-semibold text-[#D68142]">{hashState}</span>}
            {hashHistory.length > 0 && ` · Latest data: ${new Date(hashHistory[hashHistory.length - 1].timestamp * 1000).toLocaleString('en-US')}`}
          </p>
        )}

        {metric === 'supply' && (
          <p className="text-xs text-slate-500">
            {supplyState && <span className="font-semibold text-[#016976]">{supplyState}</span>}
            {latestSupply && ` · Current Mined: ${latestSupply.supplyText} BTN`}
          </p>
        )}

        {/* High-Contrast SVG Chart with Clear Y-Axis and X-Axis */}
        {metric === 'supply' && !latestSupply ? (
          <div className="h-[240px] sm:h-[320px] md:h-[380px] flex flex-col items-center justify-center gap-3 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
            <div className="w-8 h-8 rounded-full border-2 border-[#016976] border-t-transparent animate-spin" />
            <span className="text-xs font-semibold text-slate-600">
              Loading on-chain supply data ({timeframe === '90d' ? '90 Days' : timeframe === '1y' ? '1 Year' : timeframe === 'all' ? 'All-Time' : timeframe})…
            </span>
          </div>
        ) : (metric === 'txs' || metric === 'volume') && !points.some(p => p.valid) ? (
          <div className="h-[240px] sm:h-[320px] md:h-[380px] flex items-center justify-center text-sm text-slate-500">{activityState || 'No verified periods available for this range.'}</div>
        ) : metric === 'hashrate' && hashHistory.length === 0 ? (
          <div className="h-[240px] sm:h-[320px] md:h-[380px] flex flex-col items-center justify-center gap-3 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
            <div className="w-8 h-8 rounded-full border-2 border-[#D68142] border-t-transparent animate-spin" />
            <span className="text-xs font-semibold text-slate-600">
              Computing on-chain hashrate ({timeframe === '90d' ? '90 Days' : timeframe === '1y' ? '1 Year' : timeframe === 'all' ? 'All-Time' : timeframe})…
            </span>
          </div>
        ) : (
          <div className="relative pt-1 sm:pt-2">
            <div className="w-full overflow-hidden">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto aspect-[360/240] sm:aspect-[740/320] max-h-[420px] select-none"
              >
              <defs>
                <linearGradient id="macroGradientActive" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={themeColor} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={themeColor} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* 1. Left Y-Axis Labels & Horizontal Grid Lines */}
              {yTicks.map((tick, idx) => (
                <g key={idx}>
                  {/* Grid Line */}
                  <line
                    x1={paddingLeft}
                    y1={tick.y}
                    x2={svgWidth - paddingRight}
                    y2={tick.y}
                    stroke="#E2E8F0"
                    strokeWidth={idx === 0 ? "1.5" : "1"}
                    strokeDasharray={idx === 0 ? "" : "4 4"}
                  />
                  {/* Y-Axis Numerical Value Label (Left aligned, high contrast pitch dark) */}
                  <text
                    x={paddingLeft - (isMobile ? 6 : 12)}
                    y={tick.y + (isMobile ? 3.5 : 4)}
                    textAnchor="end"
                    fill="#0F172A"
                    fontWeight="700"
                    fontFamily="ui-monospace, monospace"
                    fontSize={isMobile ? "10" : "12"}
                  >
                    {formatYAxis(tick.val)}
                  </text>
                </g>
              ))}

              {/* 2. Solid Bottom Baseline */}
              <line
                x1={paddingLeft}
                y1={paddingTop + plotHeight}
                x2={svgWidth - paddingRight}
                y2={paddingTop + plotHeight}
                stroke="#94A3B8"
                strokeWidth="1.5"
              />

              {/* 3. Filled Gradient Area */}
              <path d={areaPathD} fill="url(#macroGradientActive)" />

              {/* 4. Smooth Data Line */}
              <path
                fill="none"
                stroke={themeColor}
                strokeWidth={isMobile ? "4" : "3.5"}
                strokeLinecap="round"
                strokeLinejoin="round"
                d={polylinePoints}
              />

              {/* 5. Bottom X-Axis Labels (Time / Date) - Guaranteed Collision-Free */}
              {(() => {
                if (points.length === 0) return null;
                const minLabelSpacingPx = 68; // Minimum 68px between labels to guarantee zero overlap
                const lastIdx = points.length - 1;
                const lastX = points[lastIdx]?.x ?? 0;

                // Determine target number of labels (between 4 and 7 labels maximum)
                const maxLabels = Math.min(7, Math.max(3, Math.floor(plotWidth / minLabelSpacingPx)));
                const step = Math.max(1, Math.round((points.length - 1) / (maxLabels - 1)));

                const indicesToShow: number[] = [];
                for (let i = 0; i < points.length; i += step) {
                  indicesToShow.push(i);
                }

                // Ensure the last point is included without colliding with the prior point
                if (indicesToShow[indicesToShow.length - 1] !== lastIdx) {
                  const prevIdx = indicesToShow[indicesToShow.length - 1];
                  const distFromPrev = lastX - (points[prevIdx]?.x ?? 0);
                  if (distFromPrev < minLabelSpacingPx) {
                    // Replace previous index so the final milestone date is shown clearly
                    indicesToShow[indicesToShow.length - 1] = lastIdx;
                  } else {
                    indicesToShow.push(lastIdx);
                  }
                }

                return indicesToShow.map((idx) => {
                  const p = points[idx];
                  if (!p) return null;
                  const isFirst = idx === 0;
                  const isLast = idx === lastIdx;

                  return (
                    <g key={`lbl-${idx}`}>
                      {/* Tick Mark on Baseline */}
                      <line
                        x1={p.x}
                        y1={paddingTop + plotHeight}
                        x2={p.x}
                        y2={paddingTop + plotHeight + 5}
                        stroke="#94A3B8"
                        strokeWidth="1.5"
                      />
                      {/* X-Axis Text Label */}
                      <text
                        x={p.x}
                        y={paddingTop + plotHeight + 22}
                        textAnchor={isFirst ? 'start' : isLast ? 'end' : 'middle'}
                        fill="#334155"
                        fontWeight="700"
                        fontFamily="ui-monospace, monospace"
                        fontSize="12"
                      >
                        {p.date}
                      </text>
                    </g>
                  );
                });
              })()}

              {/* 6. Vertical Column Hit Slices for Seamless Daily Hover Inspection */}
              {points.map((p, idx) => {
                if (!p.valid) return null;
                const rectX = idx === 0 ? paddingLeft : (points[idx - 1].x + p.x) / 2;
                const rectEnd = idx === points.length - 1 ? paddingLeft + plotWidth : (p.x + points[idx + 1].x) / 2;
                const rectW = rectEnd - rectX;

                return (
                  <rect
                    key={`hit-slice-${idx}`}
                    x={rectX}
                    y={paddingTop}
                    width={rectW}
                    height={plotHeight}
                    fill="transparent"
                    className="cursor-crosshair"
                    onMouseEnter={() => setHoveredPointIndex(idx)}
                    onMouseLeave={() => setHoveredPointIndex(null)}
                    onTouchStart={() => setHoveredPointIndex(idx)}
                  />
                );
              })}

              {/* 7. Hover Guide Line */}
              {hoveredPointIndex !== null && points[hoveredPointIndex] && (
                <line
                  x1={points[hoveredPointIndex].x}
                  y1={paddingTop}
                  x2={points[hoveredPointIndex].x}
                  y2={paddingTop + plotHeight}
                  stroke={themeColor}
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  pointerEvents="none"
                />
              )}

              {/* 8. Data Points on Line (Smart Density Handling) */}
              {points.map((p, idx) => {
                if (!p.valid) return null;
                const isHovered = hoveredPointIndex === idx;
                const isDense = points.length > 35;
                if (isDense && !isHovered) {
                  return null;
                }

                return (
                  <circle
                    key={`dot-${idx}`}
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 7 : (isMobile ? 4.5 : 3.5)}
                    fill={isHovered ? themeColor : '#FFFFFF'}
                    stroke={themeColor}
                    strokeWidth={isHovered ? '3.5' : (isMobile ? '2.5' : '2')}
                    pointerEvents="none"
                    className="transition-all duration-150"
                  />
                );
              })}

              {/* 9. Floating SVG Tooltip over Hovered Point */}
              {hoveredPointIndex !== null && points[hoveredPointIndex] && (() => {
                const hp = points[hoveredPointIndex];
                const tooltipWidth = 148;
                const tooltipHeight = 48;
                let tx = hp.x - tooltipWidth / 2;
                if (tx < paddingLeft + 4) tx = paddingLeft + 4;
                if (tx + tooltipWidth > svgWidth - paddingRight - 4) {
                  tx = svgWidth - paddingRight - tooltipWidth - 4;
                }
                const ty = Math.max(paddingTop + 4, hp.y - tooltipHeight - 12);

                return (
                  <g pointerEvents="none" className="transition-all duration-75">
                    <rect
                      x={tx}
                      y={ty}
                      width={tooltipWidth}
                      height={tooltipHeight}
                      rx="8"
                      fill="#0F172A"
                      stroke="#334155"
                      strokeWidth="1.2"
                    />
                    <text
                      x={tx + tooltipWidth / 2}
                      y={ty + 17}
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize="10"
                      fontFamily="ui-sans-serif, system-ui"
                      fontWeight="600"
                    >
                      {hp.date}
                    </text>
                    <text
                      x={tx + tooltipWidth / 2}
                      y={ty + 36}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="12"
                      fontFamily="ui-monospace, monospace"
                      fontWeight="800"
                    >
                      {metric === 'volume'
                        ? `${hp.val >= 1e6 ? (hp.val / 1e6).toFixed(2) + 'M' : hp.val >= 1e3 ? (hp.val / 1e3).toFixed(1) + 'K' : Math.round(hp.val)} BTN`
                        : metric === 'txs'
                        ? `${hp.val.toLocaleString()} tx`
                        : metric === 'hashrate'
                        ? `${hp.val.toFixed(2)} GH/s`
                        : `${Math.round(hp.val).toLocaleString()} BTN`}
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Interactive Inspection Banner Underneath Chart */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 mt-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 shadow-2xs">
                <Calendar className="w-4 h-4 text-[#016976]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-semibold block">
                    {hoveredPointIndex !== null ? 'Selected Point Details' : 'Point Inspector'}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-teal-100/60 text-[#016976] rounded">
                    {metric === 'hashrate' ? 'Block intervals' : timeframe === '1d'
                      ? 'Hourly'
                      : timeframe === '7d'
                      ? 'Daily'
                      : timeframe === '30d'
                      ? 'Daily'
                      : timeframe === '90d'
                      ? 'Daily'
                      : timeframe === '1y'
                      ? (metric === 'txs' ? 'Daily' : 'Weekly')
                      : (metric === 'txs' ? 'Daily (Genesis)' : 'Monthly (Genesis)')}
                  </span>
                </div>
                {hoveredPointIndex !== null ? (
                  <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                    <span>{points[hoveredPointIndex]?.fullDate}: </span>
                    <span style={{ color: themeColor }} className="ml-1">
                      {metric === 'volume'
                        ? `${(points[hoveredPointIndex]?.item as any).volumeText ?? 'Unavailable'} BTN · ${points[hoveredPointIndex]?.item.txs?.toLocaleString() ?? 'Unknown'} transactions`
                        : metric === 'txs'
                        ? `${points[hoveredPointIndex]?.val?.toLocaleString()} transactions`
                        : metric === 'hashrate'
                        ? `${points[hoveredPointIndex]?.val >= 1000 ? (points[hoveredPointIndex]?.val / 1000).toFixed(2) + ' TH/s' : points[hoveredPointIndex]?.val.toFixed(2) + ' GH/s'} (on-chain avg)`
                        : `${(points[hoveredPointIndex]?.item as TransactionHistoryPoint).supplyText ?? 'Unavailable'} BTN · Circulating Supply`}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-600 font-medium">
                    Hover over the chart to inspect points across the selected timeframe.
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono font-bold text-slate-700">
              <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">
                Min: {points.some(p => p.valid) ? formatYAxis(Math.min(...points.filter(p => p.valid).map(p => p.val))) : '-'}
              </span>
              <span className="text-slate-400">→</span>
              <span style={{ color: themeColor }} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">
                Max: {points.some(p => p.valid) ? formatYAxis(Math.max(...points.filter(p => p.valid).map(p => p.val))) : '-'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
};
