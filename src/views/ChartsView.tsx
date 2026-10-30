import React, { useEffect, useMemo, useState } from 'react';
import { LineChart as LineChartIcon, RefreshCw, GitBranch } from 'lucide-react';
import { ChainHistory, HistoryRange, HISTORY_RANGES, MINER_GROUPS, SAMPLES_PER_BUCKET, getCachedHistory, loadHistory } from '../services/chainHistory';
import { LineChart, StackedShareChart, Legend } from '../components/charts/ChartPrimitives';
import { formatHashrate } from '../services/hashrate';
import { SkeletonChart } from '../components/Skeleton';
import { NetworkUsageCharts } from '../components/NetworkUsageCharts';
import { ExactHistoryCharts } from '../components/ExactHistoryCharts';
import { SectionNav, SECTION_ANCHOR } from '../components/PageNav';

interface ChartsViewProps {
  onNavigate: (view: string) => void;
}

const compact = (v: number) => {
  for (const [unit, scale] of [['T', 1e12], ['G', 1e9], ['M', 1e6], ['k', 1e3]] as const) {
    if (Math.abs(v) >= scale) return `${(v / scale).toFixed(v / scale >= 100 ? 0 : 1)}${unit}`;
  }
  return v.toFixed(0);
};

const formatDate = (ts: number, range: HistoryRange) =>
  new Date(ts * 1000).toLocaleDateString('en-US', range === 'all' || range === '1y'
    ? { month: 'short', year: 'numeric', timeZone: 'UTC' }
    : { month: 'short', day: 'numeric', timeZone: 'UTC' });

const formatDateTime = (ts: number) =>
  new Date(ts * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });

const ChartCard: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <section className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm min-w-0">
    <h2 className="text-sm sm:text-base font-bold text-slate-900">{title}</h2>
    <p className="text-xs text-slate-500 mb-3">{subtitle}</p>
    {children}
  </section>
);

export const ChartsView: React.FC<ChartsViewProps> = ({ onNavigate }) => {
  const [range, setRange] = useState<HistoryRange>('30d');
  const [history, setHistory] = useState<ChainHistory | null>(() => getCachedHistory('30d'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setHistory(getCachedHistory(range));
    setError(null);
    setLoading(true);
    loadHistory(range)
      .then((h) => { if (active) setHistory(h); })
      .catch(() => { if (active) setError('Could not read the block headers from the RPC. Showing the last saved data if available.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range]);

  const buckets = history?.range === range ? history.buckets : [];
  const describe = (i: number) => {
    const b = buckets[i];
    return (
      <>
        {formatDateTime(b.startTs)} – {formatDateTime(b.endTs)} UTC
        <br />
        Blocks #{b.fromBlock.toLocaleString()}–#{b.toBlock.toLocaleString()}
      </>
    );
  };

  const latest = buckets[buckets.length - 1];
  const minerTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    let all = 0;
    for (const b of buckets) for (const [k, v] of Object.entries(b.miners)) { totals[k] = (totals[k] || 0) + v; all += v; }
    return { totals, all };
  }, [buckets]);

  // The tiles show the latest column of the chart, so they say which stretch of time it covers
  // (1/30 of the range: hours for 7D and 30D, weeks for 1Y and All).
  const span = latest ? latest.endTs - latest.startTs : 0;
  const spanLabel = span < 36 * 3600 ? `${(span / 3600).toFixed(span < 10 * 3600 ? 1 : 0)} hours` : `${Math.round(span / 86400)} days`;
  const tiles = latest ? [
    { label: 'Hashrate', value: formatHashrate(latest.hashrate), note: `Average over the last ${spanLabel}` },
    { label: 'Difficulty', value: compact(latest.difficulty), note: `Average per block, last ${spanLabel}` },
    { label: 'Block time', value: `${latest.blockTime.toFixed(2)} s`, note: `Average over the last ${spanLabel}` },
    { label: 'Uncle rate', value: `${(latest.uncleRate * 100).toFixed(1)}%`, note: `${SAMPLES_PER_BUCKET} sampled blocks, last ${spanLabel}` },
  ] : [];

  const xFormat = (ts: number) => formatDate(ts, range);

  return (
    <div className="space-y-5 sm:space-y-6 w-full animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-petrol-50 border border-petrol-100 flex items-center justify-center text-petrol shrink-0">
              <LineChartIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Network Charts</h1>
              <p className="text-xs sm:text-sm text-slate-500">Hashrate, difficulty, block time, uncles, miners, daily usage, supply and holdings, computed from the chain.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loading && <RefreshCw className="w-4 h-4 animate-spin text-petrol" aria-label="Loading" />}
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5" role="group" aria-label="Time range">
              {HISTORY_RANGES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRange(r.id)}
                  aria-pressed={range === r.id}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    range === r.id ? 'bg-petrol text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {tiles.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {tiles.map((t) => (
              <div key={t.label} className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 font-semibold block">{t.label}</span>
                <span className="text-lg sm:text-xl font-black text-slate-900 block">{t.value}</span>
                <span className="text-[11px] text-slate-500 block">{t.note}</span>
              </div>
            ))}
          </div>
        )}
        {latest && (
          <p className="text-[11px] text-slate-500">
            Latest point: blocks #{latest.fromBlock.toLocaleString()}–#{latest.toBlock.toLocaleString()} ({formatDateTime(latest.startTs)} – {formatDateTime(latest.endTs)} UTC).
          </p>
        )}
        {error && <div role="alert" className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">{error}</div>}
      </div>

      <SectionNav items={[{ id: 'usage', label: 'Network usage' }, { id: 'mining-supply', label: 'Mining and supply' }, { id: 'holdings', label: 'Who holds BTN' }, { id: 'hashrate', label: 'Hashrate and difficulty' }]} />

      <div id="usage" className={SECTION_ANCHOR}>
        <NetworkUsageCharts range={range} />
      </div>

      <ExactHistoryCharts range={range} />

      <div id="hashrate" className={`space-y-5 sm:space-y-6 ${SECTION_ANCHOR}`}>
      {buckets.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          {[0, 1, 2, 3].map((i) => <SkeletonChart key={i} />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            <ChartCard title="Hashrate" subtitle="Work done (total difficulty) divided by elapsed time.">
              <LineChart
                points={buckets.map((b) => ({ x: b.endTs, y: b.hashrate }))}
                color="var(--chart-primary)"
                formatY={(v) => formatHashrate(v)}
                formatAxisY={(v) => `${compact(v)}H/s`}
                formatX={xFormat}
                describe={describe}
                ariaLabel="Network hashrate over time"
              />
            </ChartCard>
            <ChartCard title="Difficulty" subtitle="Average difficulty per block.">
              <LineChart
                points={buckets.map((b) => ({ x: b.endTs, y: b.difficulty }))}
                color="var(--chart-primary)"
                formatY={(v) => compact(v)}
                formatX={xFormat}
                describe={describe}
                ariaLabel="Average block difficulty over time"
              />
            </ChartCard>
            <ChartCard title="Block time" subtitle="Average seconds between blocks.">
              <LineChart
                points={buckets.map((b) => ({ x: b.endTs, y: b.blockTime }))}
                color="var(--chart-primary)"
                formatY={(v) => `${v.toFixed(2)} s`}
                formatAxisY={(v) => `${v.toFixed(v < 10 ? 1 : 0)} s`}
                formatX={xFormat}
                describe={describe}
                ariaLabel="Average block time over time"
              />
            </ChartCard>
            <ChartCard title="Uncle rate" subtitle={`Uncles per block, from ${SAMPLES_PER_BUCKET} sampled blocks per point.`}>
              <LineChart
                points={buckets.map((b) => ({ x: b.endTs, y: b.uncleRate * 100 }))}
                color="var(--chart-primary)"
                formatY={(v) => `${v.toFixed(1)}%`}
                formatAxisY={(v) => `${v.toFixed(0)}%`}
                formatX={xFormat}
                describe={describe}
                ariaLabel="Uncle rate over time"
              />
              <button onClick={() => onNavigate('uncles')} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-petrol hover:underline cursor-pointer">
                <GitBranch className="w-3.5 h-3.5" /> Recent uncles and uncle rate by miner
              </button>
            </ChartCard>
          </div>

          <ChartCard title="Miner share" subtitle={`Share of sampled blocks per period (${SAMPLES_PER_BUCKET} per column, ${history?.sampledBlocks.toLocaleString()} in total).`}>
            <div className="mb-3">
              <Legend
                items={MINER_GROUPS.map((g) => ({
                  name: g.name,
                  color: g.color,
                  value: minerTotals.all > 0 ? `${(((minerTotals.totals[g.id] || 0) / minerTotals.all) * 100).toFixed(1)}%` : undefined,
                }))}
              />
            </div>
            <StackedShareChart
              columns={buckets.map((b) => b.miners)}
              groups={MINER_GROUPS}
              formatX={(i) => formatDate(buckets[i].endTs, range)}
              describe={describe}
              ariaLabel="Share of blocks by miner over time"
            />
          </ChartCard>

          <details className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm group">
            <summary className="text-sm font-bold text-slate-900 cursor-pointer">Data table</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs font-mono whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2 px-2">Period end (UTC)</th>
                    <th className="py-2 px-2">Blocks</th>
                    <th className="py-2 px-2 text-right">Hashrate</th>
                    <th className="py-2 px-2 text-right">Difficulty</th>
                    <th className="py-2 px-2 text-right">Block time</th>
                    <th className="py-2 px-2 text-right">Uncle rate</th>
                    {MINER_GROUPS.map((g) => <th key={g.id} className="py-2 px-2 text-right">{g.name}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...buckets].reverse().map((b) => (
                    <tr key={b.toBlock}>
                      <td className="py-2 px-2">{formatDateTime(b.endTs)}</td>
                      <td className="py-2 px-2">#{b.fromBlock.toLocaleString()}–#{b.toBlock.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right">{formatHashrate(b.hashrate)}</td>
                      <td className="py-2 px-2 text-right">{compact(b.difficulty)}</td>
                      <td className="py-2 px-2 text-right">{b.blockTime.toFixed(2)} s</td>
                      <td className="py-2 px-2 text-right">{(b.uncleRate * 100).toFixed(1)}%</td>
                      {MINER_GROUPS.map((g) => (
                        <td key={g.id} className="py-2 px-2 text-right">{(((b.miners[g.id] || 0) / b.sampleSize) * 100).toFixed(0)}%</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
      </div>
    </div>
  );
};
