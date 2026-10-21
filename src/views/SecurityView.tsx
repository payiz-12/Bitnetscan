import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, TrendingUp, TrendingDown, GitBranch, Radio, Clock } from 'lucide-react';
import { loadRecentScan, getCachedRecentScan, RecentScan, scanBlockTime } from '../services/chainScan';
import { ChainHistory, HistoryRange, getCachedHistory, loadHistory } from '../services/chainHistory';
import { concentration, Concentration, riskLevel, RiskLevel, confirmationsFor, loadIndexedReorgs, IndexedReorg, useReorgWatch } from '../services/security';
import { LineChart } from '../components/charts/ChartPrimitives';
import { AddressTag } from '../components/AddressTag';
import { getAddressLabel } from '../services/addressLabels';
import { formatHashrate } from '../services/hashrate';
import { SkeletonList } from '../components/Skeleton';

interface SecurityViewProps {
  onSelectAddress: (address: string) => void;
  onSelectBlock: (n: number) => void;
  onNavigate: (view: string) => void;
}

const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const minerName = (a: string) => getAddressLabel(a)?.name || short(a);
const duration = (seconds: number) => {
  if (seconds < 90) return `${Math.round(seconds)} s`;
  if (seconds < 5400) return `${Math.round(seconds / 60)} min`;
  if (seconds < 172800) return `${(seconds / 3600).toFixed(1)} h`;
  return `${(seconds / 86400).toFixed(1)} days`;
};

const RISK_STYLE: Record<RiskLevel, { box: string; icon: React.ComponentType<{ className?: string }>; iconColor: string; label: string }> = {
  critical: { box: 'bg-rose-50 border-rose-200', icon: AlertTriangle, iconColor: 'text-rose-600', label: 'Critical concentration' },
  elevated: { box: 'bg-amber-50 border-amber-200', icon: ShieldAlert, iconColor: 'text-amber-600', label: 'Elevated concentration' },
  moderate: { box: 'bg-sky-50 border-sky-200', icon: ShieldAlert, iconColor: 'text-sky-600', label: 'Moderate concentration' },
  healthy: { box: 'bg-emerald-50 border-emerald-200', icon: ShieldCheck, iconColor: 'text-emerald-600', label: 'Healthy distribution' },
};

const RISK_TEXT: Record<RiskLevel, (top: string, share: string) => string> = {
  critical: (top, share) =>
    `${top} produced ${share} of the recent blocks. A miner with more than half of the hashrate can outpace all other miners combined: it could leave transactions out of blocks or replace blocks it did not mine. Confirmations protect against other miners, not against this one.`,
  elevated: (top, share) =>
    `${top} produced ${share} of the recent blocks. Above one third of the hashrate a miner can gain from withholding blocks (selfish mining). Wait for more confirmations on large payments.`,
  moderate: (top, share) => `${top} produced ${share} of the recent blocks. No single miner is close to a majority.`,
  healthy: (top, share) => `The largest miner, ${top}, produced ${share} of the recent blocks. Mining is spread across many miners.`,
};

const Card: React.FC<{ title: string; subtitle?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }> = ({ title, subtitle, children, action }) => (
  <section className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm min-w-0">
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

export const SecurityView: React.FC<SecurityViewProps> = ({ onSelectAddress, onSelectBlock, onNavigate }) => {
  const [scan, setScan] = useState<RecentScan | null>(() => getCachedRecentScan());
  const [range, setRange] = useState<HistoryRange>('30d');
  const [history, setHistory] = useState<ChainHistory | null>(() => getCachedHistory('30d'));
  const [history30, setHistory30] = useState<ChainHistory | null>(() => getCachedHistory('30d'));
  const [reorgs, setReorgs] = useState<IndexedReorg[] | null | undefined>(undefined);
  const [scanError, setScanError] = useState(false);
  const live = useReorgWatch();

  useEffect(() => {
    let active = true;
    loadRecentScan().then((s) => { if (active) setScan(s); }).catch(() => { if (active) setScanError(true); });
    loadHistory('30d').then((h) => { if (active) setHistory30(h); }).catch(() => {});
    loadIndexedReorgs().then((r) => { if (active) setReorgs(r); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setHistory(getCachedHistory(range));
    loadHistory(range).then((h) => { if (active) setHistory(h); }).catch(() => {});
    return () => { active = false; };
  }, [range]);

  // Exact shares over the newest 100, 1,000 and 2,000 blocks, sampled shares over 30 days.
  const windows = useMemo(() => {
    const rows: { label: string; note: string; c: Concentration }[] = [];
    if (scan) {
      for (const n of [100, 1000, scan.blocks.length]) {
        const counts: Record<string, number> = {};
        for (const b of scan.blocks.slice(0, n)) counts[b.miner.toLowerCase()] = (counts[b.miner.toLowerCase()] || 0) + 1;
        const span = scan.blocks[0].timestamp - scan.blocks[Math.min(n, scan.blocks.length) - 1].timestamp;
        rows.push({ label: `Last ${n.toLocaleString()} blocks`, note: `≈ ${duration(span)} · exact`, c: concentration(counts) });
      }
    }
    if (history30) {
      const counts: Record<string, number> = {};
      for (const b of history30.buckets) for (const [a, n] of Object.entries(b.addresses || {})) counts[a] = (counts[a] || 0) + n;
      if (Object.keys(counts).length > 0) rows.push({ label: 'Last 30 days', note: `${history30.sampledBlocks.toLocaleString()} sampled blocks`, c: concentration(counts) });
    }
    return rows;
  }, [scan, history30]);

  const current = windows.find((w) => w.label === `Last ${(scan?.blocks.length ?? 0).toLocaleString()} blocks`) ?? windows[0];
  const top = current?.c.miners[0];
  const second = current?.c.miners[1];
  const level = top ? riskLevel(top.share) : null;
  const blockTime = scan ? scanBlockTime(scan) : null;

  const chartPoints = useMemo(() => (history?.range === range ? history.buckets : [])
    .filter((b) => b.addresses && b.sampleSize > 0)
    .map((b) => ({ x: b.endTs, y: (Math.max(...Object.values(b.addresses)) / b.sampleSize) * 100, b })), [history, range]);

  // Hashrate over the scan window vs the 30-day average.
  const hashrateNow = useMemo(() => {
    if (!scan || scan.blocks.length < 2) return null;
    const newest = scan.blocks[0];
    const oldest = scan.blocks[scan.blocks.length - 1];
    if (!newest.totalDifficulty || !oldest.totalDifficulty || newest.timestamp <= oldest.timestamp) return null;
    return Number(BigInt(newest.totalDifficulty) - BigInt(oldest.totalDifficulty)) / (newest.timestamp - oldest.timestamp);
  }, [scan]);
  const hashrate30 = history30 && history30.buckets.length > 0
    ? history30.buckets.reduce((s, b) => s + b.hashrate * (b.endTs - b.startTs), 0) / history30.buckets.reduce((s, b) => s + (b.endTs - b.startTs), 0)
    : null;
  const hashrateChange = hashrateNow !== null && hashrate30 ? hashrateNow / hashrate30 - 1 : null;

  const depthCounts = useMemo(() => {
    const m = new Map<number, number>();
    for (const u of scan?.uncles ?? []) m.set(u.depth, (m.get(u.depth) || 0) + 1);
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [scan]);

  const attackerRows = useMemo(() => {
    const rows: { label: React.ReactNode; q: number }[] = [];
    if (top) rows.push({ label: <>Largest miner · {minerName(top.address)}</>, q: top.share });
    if (second) rows.push({ label: <>Second largest · {minerName(second.address)}</>, q: second.share });
    for (const q of [0.1, 0.25, 0.4]) rows.push({ label: `Any miner with ${pct(q, 0)}`, q });
    return rows;
  }, [top, second]);

  const Risk = level ? RISK_STYLE[level] : null;

  return (
    <div className="space-y-5 sm:space-y-6 w-full animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-petrol-50 border border-petrol-100 flex items-center justify-center text-petrol shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Chain Security</h1>
            <p className="text-xs sm:text-sm text-slate-500">How concentrated mining is, how often the chain forks, and how many confirmations to wait. Read from the chain.</p>
          </div>
        </div>

        {scanError && !scan && <div role="alert" className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">Could not read the recent blocks from the RPC.</div>}

        {!scan || !top || !Risk || !level ? (
          !scanError && <SkeletonList rows={2} label="Reading recent blocks" />
        ) : (
          <div className={`rounded-2xl border p-4 flex gap-3 ${Risk.box}`}>
            <Risk.icon className={`w-6 h-6 shrink-0 mt-0.5 ${Risk.iconColor}`} />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-black text-slate-900">{Risk.label}</span>
                <span className="text-xs font-semibold text-slate-600">Nakamoto coefficient {current.c.nakamoto}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{RISK_TEXT[level](minerName(top.address), pct(top.share))}</p>
              <p className="text-[11px] text-slate-500">Based on the last {scan.blocks.length.toLocaleString()} blocks (#{scan.from.toLocaleString()}–#{scan.to.toLocaleString()}).</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <Card title="Mining concentration" subtitle="Share of blocks by the largest miners. The Nakamoto coefficient is the fewest miners that together produce more than half of the blocks.">
          {windows.length === 0 ? <SkeletonList rows={4} /> : (
            <div className="divide-y divide-slate-100">
              {windows.map((w) => {
                const [m1, m2] = w.c.miners;
                return (
                  <div key={w.label} className="py-3 space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">{w.label}</span>
                      <span className="text-[11px] text-slate-500 text-right">{w.note} · {w.c.miners.length} miners · Nakamoto {w.c.nakamoto}</span>
                    </div>
                    {[m1, m2].filter(Boolean).map((m) => (
                      <button key={m.address} onClick={() => onSelectAddress(m.address)} className="w-full text-left cursor-pointer group">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono text-petrol group-hover:underline">{short(m.address)}</span>
                            <AddressTag address={m.address} />
                          </span>
                          <span className="font-bold text-slate-900 font-mono">{pct(m.share)}</span>
                        </div>
                        <div className="relative h-1.5 mt-1 rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full rounded-full ${m.share > 0.5 ? 'bg-rose-500' : 'bg-petrol'}`} style={{ width: `${Math.min(100, m.share * 100)}%` }} />
                          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-400" aria-hidden="true" />
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
              <p className="pt-2 text-[11px] text-slate-500">The grey mark on each bar is 50%.</p>
            </div>
          )}
        </Card>

        <Card
          title="Largest miner's share over time"
          subtitle={`Share of the single largest miner in each period, from sampled blocks.`}
          action={
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 shrink-0" role="group" aria-label="Time range">
              {(['7d', '30d', '1y'] as HistoryRange[]).map((r) => (
                <button key={r} onClick={() => setRange(r)} aria-pressed={range === r}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${range === r ? 'bg-petrol text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          }
        >
          {chartPoints.length < 2 ? <div className="skeleton rounded-xl w-full h-[200px]" aria-hidden="true" /> : (
            <LineChart
              points={chartPoints.map((p) => ({ x: p.x, y: p.y }))}
              color="var(--chart-primary)"
              yMax={100}
              reference={{ y: 50, label: '50% majority', color: 'var(--chart-alert)' }}
              formatY={(v) => `${v.toFixed(0)}%`}
              formatX={(ts) => new Date(ts * 1000).toLocaleDateString('en-US', range === '1y' ? { month: 'short', year: 'numeric', timeZone: 'UTC' } : { month: 'short', day: 'numeric', timeZone: 'UTC' })}
              describe={(i) => {
                const b = chartPoints[i].b;
                const [addr] = Object.entries(b.addresses).sort((x, y) => y[1] - x[1])[0];
                return <>{new Date(b.startTs * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} – {new Date(b.endTs * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}<br />Largest: {minerName(addr)}</>;
              }}
              ariaLabel="Largest miner's share of blocks over time"
            />
          )}
        </Card>
      </div>

      <Card
        title="How many confirmations to wait"
        subtitle={<>Blocks to wait so that a miner with the given share of the hashrate has less than a 0.1% chance of reversing a payment (Nakamoto, Bitcoin paper, section 11).{blockTime ? ` Times use the current ${blockTime.toFixed(1)} s block time.` : ''}</>}
      >
        <div className="divide-y divide-slate-100">
          {attackerRows.map((r, i) => {
            const z = confirmationsFor(r.q);
            return (
              <div key={i} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800 truncate">{r.label}</div>
                  <div className="text-[11px] text-slate-500">{pct(r.q)} of the hashrate</div>
                </div>
                <div className="text-right shrink-0">
                  {z === null ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold">
                      <AlertTriangle className="w-3 h-3" /> No number is safe
                    </span>
                  ) : (
                    <>
                      <div className="text-sm font-black font-mono text-slate-900">{z} blocks</div>
                      {blockTime && <div className="text-[11px] text-slate-500">≈ {duration(z * blockTime)}</div>}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {top && top.share > 0.5 && (
          <p className="mt-3 text-[11px] text-slate-600 leading-relaxed">
            Against a miner above 50% no confirmation count is enough, because it finds blocks faster than everyone else together. Exchanges and services then rely on that miner behaving honestly; the counts above still protect against all other miners.
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <Card
          title="Forks and reorganizations"
          subtitle="Uncles are blocks that lost a race at the same height. A reorganization replaces blocks that were already on the chain."
          action={
            <button onClick={() => onNavigate('uncles')} className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-petrol hover:underline cursor-pointer">
              <GitBranch className="w-3.5 h-3.5" /> Uncles
            </button>
          }
        >
          {!scan ? <SkeletonList rows={3} /> : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-semibold block">Uncle rate</span>
                  <span className="text-lg font-black text-slate-900">{pct(scan.uncles.length / (scan.to - scan.from + 1))}</span>
                  <span className="text-[11px] text-slate-500 block">last {(scan.to - scan.from + 1).toLocaleString()} blocks</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-semibold block">Uncle depth</span>
                  <span className="text-xs font-mono text-slate-900 block mt-1">
                    {depthCounts.length === 0 ? '—' : depthCounts.map(([d, n]) => `${d}: ${n}`).join(' · ')}
                  </span>
                  <span className="text-[11px] text-slate-500 block">blocks behind the including block</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 mb-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-600" /> Live reorganization watch
                </div>
                {live.blocksWatched === 0 ? (
                  <p className="text-xs text-slate-500">Starting…</p>
                ) : live.events.length === 0 ? (
                  <p className="text-xs text-slate-600">
                    No reorganization seen since you opened this page ({duration((Date.now() - live.watchedSince) / 1000)} ago, newest {live.blocksWatched} block hashes compared every 15 s).
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {live.events.map((e) => (
                      <li key={e.detectedAt} className="text-xs text-slate-700 flex items-center gap-2">
                        <span className="px-1.5 py-px rounded bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[10px]">depth {e.depth}</span>
                        <button onClick={() => onSelectBlock(e.from)} className="font-mono text-petrol hover:underline cursor-pointer">#{e.from.toLocaleString()}{e.depth > 1 ? `–#${e.to.toLocaleString()}` : ''}</button>
                        <span className="text-slate-500">{new Date(e.detectedAt).toLocaleTimeString('en-US', { hour12: false })}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <div className="text-xs font-bold text-slate-900 mb-1.5">Reorganizations recorded by the explorer</div>
                {reorgs === undefined ? <p className="text-xs text-slate-500">Loading…</p> : reorgs === null ? (
                  <p className="text-xs text-slate-500">The explorer did not answer.</p>
                ) : (
                  <>
                    <ul className="space-y-1">
                      {reorgs.slice(0, 6).map((r) => (
                        <li key={r.from} className="text-xs text-slate-700 flex flex-wrap items-center gap-x-2">
                          <span className={`px-1.5 py-px rounded border font-bold text-[10px] ${r.depth > 1 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>depth {r.depth}</span>
                          <span className="font-mono">#{r.from.toLocaleString()}{r.depth > 1 ? `–#${r.to.toLocaleString()}` : ''}</span>
                          <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(r.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      {reorgs.filter((r) => r.depth > 1).length} of the last {reorgs.length} recorded reorganizations replaced more than one block. The explorer only records blocks it had already stored, so the real number is higher.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </Card>

        <Card title="Hashrate stability" subtitle="A sudden drop in hashrate makes the chain cheaper to overpower.">
          {hashrateNow === null || hashrate30 === null ? <SkeletonList rows={2} /> : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-semibold block">Now</span>
                  <span className="text-lg font-black text-slate-900">{formatHashrate(hashrateNow)}</span>
                  <span className="text-[11px] text-slate-500 block">last {scan!.blocks.length.toLocaleString()} blocks</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-semibold block">30-day average</span>
                  <span className="text-lg font-black text-slate-900">{formatHashrate(hashrate30)}</span>
                  <span className="text-[11px] text-slate-500 block">from total difficulty</span>
                </div>
              </div>
              {hashrateChange !== null && (
                <p className={`text-xs font-semibold flex items-center gap-1.5 ${hashrateChange < -0.25 ? 'text-rose-700' : 'text-slate-700'}`}>
                  {hashrateChange < -0.25 ? <AlertTriangle className="w-3.5 h-3.5" /> : hashrateChange >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-slate-400" /> : <TrendingDown className="w-3.5 h-3.5 text-slate-400" />}
                  {hashrateChange >= 0 ? '▲' : '▼'} {pct(Math.abs(hashrateChange))} vs the 30-day average
                  {hashrateChange < -0.25 ? ': a large drop' : ''}
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
