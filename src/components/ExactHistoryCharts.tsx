import React, { useEffect, useMemo, useState } from 'react';
import { Coins, Pickaxe, GitBranch, Layers, Hourglass, PieChart, AlertTriangle, Cpu } from 'lucide-react';
import { BarChart, LineChart, StackedShareChart, HeatmapChart, HeatScale, Legend, ShareGroup } from './charts/ChartPrimitives';
import { SkeletonChart } from './Skeleton';
import { StaleDataNotice } from './StaleDataNotice';
import { SECTION_ANCHOR } from './PageNav';
import { loadExactHistory, miningPeriods, ExactHistory, MiningPeriod, HoldingSnapshot, PENDING, HOLD_BANDS, btnPerGhDay } from '../services/exactHistory';
import { priceService, BtnPriceData } from '../services/priceService';
import { getAddressLabel } from '../services/addressLabels';
import type { HistoryRange } from '../services/chainHistory';

const GROUPING: Record<HistoryRange, { grouping: 'day' | 'week' | 'month'; lastDays?: number; unit: string }> = {
  '7d': { grouping: 'day', lastDays: 7, unit: 'per day' },
  '30d': { grouping: 'day', lastDays: 30, unit: 'per day' },
  '1y': { grouping: 'week', lastDays: 365, unit: 'per week' },
  all: { grouping: 'month', unit: 'per month' },
};

/** The same bands as heatmap row labels, oldest at the top. */
const HOLD_ROWS = ['3+ yr', '2–3 yr', '1–2 yr', '6–12 mo', '3–6 mo', '1–3 mo', '< 1 mo'];
/** Share of BTN at which a heatmap cell reaches full color. */
const HEAT_MAX = 60;
const SERIES = 8;
const MINER_SERIES = 5;

const fmtDate = (date: string, opts: Intl.DateTimeFormatOptions) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });
const longDate = (date: string) => fmtDate(date, { month: 'short', day: 'numeric', year: 'numeric' });
const btn = (v: number, digits = 0) => v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const axis = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M` : v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `${Math.round(v)}`);
const pct = (part: number, whole: number, digits = 1) => (whole > 0 ? `${((part / whole) * 100).toFixed(digits)}%` : '—');
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const minerName = (a: string) => {
  const label = getAddressLabel(a);
  return label?.kind === 'pool' ? label.name : short(a);
};

const Card: React.FC<{ title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, subtitle, icon, children }) => (
  <section className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm min-w-0">
    <div className="flex items-start gap-2.5 mb-3">
      <span className="w-8 h-8 rounded-xl bg-petrol-50 border border-petrol-100 text-petrol flex items-center justify-center shrink-0">{icon}</span>
      <div className="min-w-0">
        <h2 className="text-sm sm:text-base font-bold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
    {children}
  </section>
);

const Tile: React.FC<{ label: string; value: string; note?: string }> = ({ label, value, note }) => (
  <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 min-w-0">
    <span className="text-[11px] text-slate-500 font-semibold block">{label}</span>
    <span className="text-lg sm:text-xl font-black text-slate-900 block truncate">{value}</span>
    {note && <span className="text-[11px] text-slate-500 block">{note}</span>}
  </div>
);

/**
 * Mining, supply and holdings computed by BitnetScan from every block since genesis and the
 * archive state: exact issuance, blocks by miner, uncles, holding times and concentration.
 */
export const ExactHistoryCharts: React.FC<{ range: HistoryRange }> = ({ range }) => {
  const [history, setHistory] = useState<ExactHistory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadExactHistory().then((h) => { if (active) setHistory(h); }).catch((e: Error) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);

  const [price, setPrice] = useState<BtnPriceData>(priceService.getCachedPrice());
  useEffect(() => priceService.subscribe(setPrice), []);

  const cfg = GROUPING[range];
  const periods = useMemo(() => (history ? miningPeriods(history, cfg.grouping, cfg.lastDays) : []), [history, range]);

  // BTN per GH/s per day for the periods whose work is known.
  const earnings = useMemo(() => periods
    .map((period) => ({ period, value: btnPerGhDay(period.workIssued, period.work) }))
    .filter((e): e is { period: MiningPeriod; value: number } => e.value !== null), [periods]);
  const latestEarning = earnings[earnings.length - 1];

  // Each of the eight miners with the most blocks overall keeps one color in every range.
  const slots = useMemo(() => {
    const totals = new Map<number, number>();
    for (const d of history?.days ?? []) for (const [i, n] of d.miners) totals.set(i, (totals.get(i) || 0) + n);
    const ranked = [...totals].sort((a, b) => b[1] - a[1]).slice(0, SERIES);
    return new Map(ranked.map(([i], slot) => [history!.miners[i], slot]));
  }, [history]);

  const minerGroups = useMemo<ShareGroup[]>(() => {
    const inRange = new Map<string, number>();
    for (const p of periods) for (const [m, n] of p.miners) inRange.set(m, (inRange.get(m) || 0) + n);
    const shown = [...inRange].filter(([m]) => slots.has(m)).sort((a, b) => b[1] - a[1]).slice(0, MINER_SERIES).map(([m]) => m);
    shown.sort((a, b) => slots.get(a)! - slots.get(b)!);
    return [
      ...shown.map((m) => ({ id: m, name: minerName(m), color: `var(--series-${slots.get(m)! + 1})` })),
      { id: 'other', name: 'Other miners', color: 'var(--chart-baseline)' },
    ];
  }, [periods, slots]);

  const minerColumns = useMemo(() => periods.map((p) => {
    const col: Record<string, number> = {};
    for (const [m, n] of p.miners) {
      const id = minerGroups.some((g) => g.id === m) ? m : 'other';
      col[id] = (col[id] || 0) + n;
    }
    return col;
  }), [periods, minerGroups]);

  const snapshots = useMemo(() => {
    if (!history) return [];
    const list = [...history.monthEnds];
    if (history.latest && history.latest.date !== list[list.length - 1]?.date) list.push(history.latest);
    return list;
  }, [history]);

  if (error === PENDING && !history) {
    return (
      <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 text-xs">
        Mining, supply and holdings from every block: BitnetScan is reading the chain from its first block. This section appears after the next hourly update.
      </div>
    );
  }
  if (error && !history) {
    return (
      <div role="alert" className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" /> The mining and holdings history could not be loaded.
      </div>
    );
  }
  if (!history) {
    return <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">{[0, 1, 2, 3].map((i) => <SkeletonChart key={i} />)}</div>;
  }

  const catchingUp = history.chainBlock - history.toBlock > 20_000;
  const lastDay = history.days[history.days.length - 1];
  const label = (p: MiningPeriod) => (cfg.grouping === 'month' ? fmtDate(p.start, { month: 'short', year: 'numeric' }) : fmtDate(p.start, { month: 'short', day: 'numeric' }));
  const span = (p: MiningPeriod) => (p.days === 1 ? longDate(p.start) : `${longDate(p.start)} – ${longDate(p.end)} (${p.days} days${p.partial ? ' so far' : ''})`);
  const head = (p: MiningPeriod) => (
    <div className="text-slate-500 mb-1">{span(p)} UTC<br />Blocks #{p.firstBlock.toLocaleString()}–#{p.lastBlock.toLocaleString()}</div>
  );

  const latest = history.latest;
  const circulating = (s: HoldingSnapshot) => s.tracked - s.burned;
  const yearPlus = (s: HoldingSnapshot) => s.holdingBands.slice(4).reduce((a, b) => a + b, 0);
  const snapLabel = (i: number) => fmtDate(snapshots[i].date, { month: 'short', year: snapshots.length > 14 ? '2-digit' : undefined });
  const snapHead = (s: HoldingSnapshot) => (
    <>End of {longDate(s.date)} UTC<br />Block #{s.block.toLocaleString()}</>
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <div id="mining-supply" className={`bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-3 ${SECTION_ANCHOR}`}>
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900">Mining and supply, from every block</h2>
          <p className="text-xs text-slate-500">
            BitnetScan reads every block from #1 and adds up what it created: 1 BTN per block, 1/32 BTN per uncle the block includes and (8 − depth)/8 BTN to the uncle's miner. Fees only move coins, so this is the exact supply.
          </p>
        </div>
        <StaleDataNotice at={history.generatedAt} what="the mining, supply and holdings figures" />
        {catchingUp && (
          <div className="p-3 rounded-xl bg-petrol-50 border border-petrol-100 text-xs text-slate-700">
            Reading the chain from the first block: {pct(history.toBlock, history.chainBlock, 0)} done (block #{history.toBlock.toLocaleString()} of #{history.chainBlock.toLocaleString()}). The charts below grow as the hourly job continues.
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile label="Supply" value={`${btn(history.supply)} BTN`} note={`At block #${history.supplyBlock.toLocaleString()}${lastDay ? `, end of ${fmtDate(lastDay.date, { month: 'short', day: 'numeric' })}` : ''}`} />
          <Tile label={`Issued · ${lastDay ? fmtDate(lastDay.date, { month: 'short', day: 'numeric' }) : '—'}`} value={lastDay ? `${btn(lastDay.issued, 2)} BTN` : '—'} note={lastDay ? `${lastDay.blocks.toLocaleString()} blocks` : undefined} />
          <Tile label="Uncles" value={lastDay ? lastDay.uncles.toLocaleString() : '—'} note={lastDay ? `${pct(lastDay.uncles, lastDay.blocks)} of blocks` : undefined} />
          <Tile label="Miners" value={lastDay ? String(lastDay.miners.length) : '—'} note={lastDay ? `Top: ${minerName(history.miners[lastDay.miners[0][0]])} ${pct(lastDay.miners[0][1], lastDay.blocks, 0)}` : undefined} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <Card title={`BTN issued ${cfg.unit}`} subtitle="Block rewards plus uncle rewards, by UTC day." icon={<Coins className="w-4 h-4" />}>
          <BarChart
            values={periods.map((p) => p.issued)}
            partial={periods.map((p) => p.partial)}
            color="var(--chart-primary)"
            formatY={axis}
            formatX={(i) => label(periods[i])}
            describe={(i) => {
              const p = periods[i];
              return (
                <>
                  {head(p)}
                  <div className="font-bold text-slate-900">{btn(p.issued, 2)} BTN</div>
                  <div className="text-slate-600">{p.blocks.toLocaleString()} blocks, {p.uncles.toLocaleString()} uncles</div>
                </>
              );
            }}
            ariaLabel={`BTN issued ${cfg.unit}`}
          />
        </Card>
        <Card title="Total supply" subtitle="All BTN created up to the end of each period." icon={<Layers className="w-4 h-4" />}>
          <LineChart
            points={periods.map((p, i) => ({ x: i, y: p.supply }))}
            color="var(--chart-primary)"
            formatY={(v) => `${btn(v)} BTN`}
            formatAxisY={axis}
            formatX={(i) => label(periods[i])}
            describe={(i) => head(periods[i])}
            ariaLabel="Total BTN supply over time"
          />
        </Card>
        <Card title="Blocks by miner" subtitle="Share of every block mined in each period, by the address that mined it." icon={<Pickaxe className="w-4 h-4" />}>
          <div className="mb-3">
            <Legend
              items={minerGroups.map((g) => {
                const total = minerColumns.reduce((s, c) => s + Object.values(c).reduce((a, b) => a + b, 0), 0);
                const mine = minerColumns.reduce((s, c) => s + (c[g.id] || 0), 0);
                return { name: g.name, color: g.color, value: pct(mine, total) };
              })}
            />
          </div>
          <StackedShareChart
            columns={minerColumns}
            groups={minerGroups}
            formatX={(i) => label(periods[i])}
            describe={(i) => <>{span(periods[i])} UTC<br />{periods[i].blocks.toLocaleString()} blocks · {periods[i].miners.size} miners</>}
            ariaLabel="Share of blocks by miner over time"
          />
        </Card>
        <Card title={`Uncle rate ${cfg.unit}`} subtitle="Uncles included per 100 blocks, counted in every block." icon={<GitBranch className="w-4 h-4" />}>
          <BarChart
            values={periods.map((p) => (p.blocks ? (p.uncles / p.blocks) * 100 : 0))}
            color="var(--chart-primary)"
            formatY={(v) => `${v.toFixed(0)}%`}
            formatX={(i) => label(periods[i])}
            describe={(i) => {
              const p = periods[i];
              return (
                <>
                  {head(p)}
                  <div className="font-bold text-slate-900">{pct(p.uncles, p.blocks)}</div>
                  <div className="text-slate-600">{p.uncles.toLocaleString()} uncles in {p.blocks.toLocaleString()} blocks</div>
                </>
              );
            }}
            ariaLabel={`Uncle rate ${cfg.unit}`}
          />
        </Card>
        {earnings.length > 1 && (
          <div className="lg:col-span-2 min-w-0">
            <Card
              title={`What 1 GH/s earned, ${cfg.unit}`}
              subtitle="BTN a miner with 1 GH/s would have earned per day, block and uncle rewards included: each period's new BTN times 86,400 × 10⁹, divided by the hashes behind its blocks (the total difficulty they added)."
              icon={<Cpu className="w-4 h-4" />}
            >
              {latestEarning && (
                <p className="text-xs text-slate-600 mb-3">
                  Latest: <span className="font-bold text-slate-900">{btn(latestEarning.value, 2)} BTN per GH/s per day</span>
                  {price.available && <> (≈ ${(latestEarning.value * price.priceUsd).toFixed(2)} at the NestEx price)</>} for {label(latestEarning.period)}.
                </p>
              )}
              <LineChart
                points={earnings.map((e, i) => ({ x: i, y: e.value }))}
                color="var(--chart-primary)"
                formatY={(v) => `${btn(v, 2)} BTN`}
                formatAxisY={axis}
                formatX={(i) => label(earnings[i].period)}
                describe={(i) => {
                  const e = earnings[i];
                  return <>{head(e.period)}Network ≈ {btn(e.period.work / (e.period.days * 86400) / 1e9, 1)} GH/s</>;
                }}
                ariaLabel="BTN earned per GH/s per day over time"
              />
            </Card>
          </div>
        )}
      </div>

      {latest && snapshots.length > 0 && (
        <>
          <div id="holdings" className={`bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-3 ${SECTION_ANCHOR}`}>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">Who holds BTN</h2>
              <p className="text-xs text-slate-500">
                Balances of the {history.addresses.toLocaleString()} addresses the chain has paid or seen sending (transaction senders and recipients, miners, created contracts), read from the archive state at the end of every day they were involved in, and all of them again at each month's end. They hold {pct(latest.tracked, latest.supply, 2)} of the supply; burned coins ({btn(latest.burned)} BTN) are left out of the shares below.
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Tile label="Addresses with BTN" value={latest.holders.toLocaleString()} note={`${latest.holdersWithOneBtn.toLocaleString()} with 1 BTN or more`} />
              <Tile label="Largest 10 addresses" value={pct(latest.top10, circulating(latest))} note={`Largest: ${pct(latest.top1, circulating(latest))}`} />
              <Tile label="Largest 100 addresses" value={pct(latest.top100, circulating(latest))} note="Share of BTN held" />
              <Tile label="Unmoved for a year or more" value={pct(yearPlus(latest), circulating(latest))} note={`${btn(yearPlus(latest))} BTN`} />
            </div>
            <p className="text-[11px] text-slate-500">As of the end of {longDate(latest.date)} UTC (block #{latest.block.toLocaleString()}).</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            <Card
              title="How long BTN has stayed put"
              subtitle="Share of BTN by the time it has stayed at its address, at each month's end: the darker a cell, the more BTN in that band. BTN counts as unmoved for as long as the address's balance never fell below it at the end of a day."
              icon={<Hourglass className="w-4 h-4" />}
            >
              <div className="mb-3">
                <HeatScale color="var(--chart-primary)" max={HEAT_MAX} format={(v) => `${v}%`} />
              </div>
              <HeatmapChart
                rows={HOLD_ROWS}
                values={snapshots.map((s) => [...s.holdingBands].reverse().map((v) => (circulating(s) > 0 ? (v / circulating(s)) * 100 : 0)))}
                color="var(--chart-primary)"
                max={HEAT_MAX}
                formatX={snapLabel}
                describe={(i, row) => {
                  const s = snapshots[i];
                  const band = HOLD_BANDS.length - 1 - row;
                  return (
                    <>
                      <div className="text-slate-500 mb-1">{snapHead(s)}</div>
                      <div className="font-bold text-slate-900">{HOLD_BANDS[band]}: {pct(s.holdingBands[band], circulating(s))}</div>
                      <div className="text-slate-600">{btn(s.holdingBands[band])} BTN</div>
                    </>
                  );
                }}
                ariaLabel="Share of BTN by holding time at each month's end, as a heatmap"
              />
            </Card>
            <Card title="Share held by the largest addresses" subtitle="BTN held by the 10 and the 100 largest addresses, at each month's end." icon={<PieChart className="w-4 h-4" />}>
              <div className="mb-3">
                <Legend
                  items={[
                    { name: 'Largest 10', color: 'var(--hold-6)', value: pct(latest.top10, circulating(latest), 0) },
                    { name: 'Next 90', color: 'var(--hold-4)', value: pct(latest.top100 - latest.top10, circulating(latest), 0) },
                    { name: 'All others', color: 'var(--hold-2)', value: pct(circulating(latest) - latest.top100, circulating(latest), 0) },
                  ]}
                />
              </div>
              <StackedShareChart
                columns={snapshots.map((s) => ({ top10: s.top10, next90: s.top100 - s.top10, rest: circulating(s) - s.top100 }))}
                groups={[
                  { id: 'top10', name: 'Largest 10', color: 'var(--hold-6)' },
                  { id: 'next90', name: 'Next 90', color: 'var(--hold-4)' },
                  { id: 'rest', name: 'All others', color: 'var(--hold-2)' },
                ]}
                formatX={snapLabel}
                describe={(i) => <>{snapHead(snapshots[i])}<br />{snapshots[i].holders.toLocaleString()} addresses with BTN</>}
                ariaLabel="Share of BTN held by the largest addresses at each month's end"
              />
            </Card>
          </div>

          <details className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
            <summary className="text-sm font-bold text-slate-900 cursor-pointer">Data table: holdings at each month's end</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs font-mono whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2 px-2">Date (UTC)</th>
                    <th className="py-2 px-2">Block</th>
                    <th className="py-2 px-2 text-right">Supply</th>
                    <th className="py-2 px-2 text-right">Addresses</th>
                    <th className="py-2 px-2 text-right">Largest 10</th>
                    <th className="py-2 px-2 text-right">Largest 100</th>
                    <th className="py-2 px-2 text-right">Unmoved 1y+</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...snapshots].reverse().map((s) => (
                    <tr key={s.block}>
                      <td className="py-2 px-2">{s.date}</td>
                      <td className="py-2 px-2">#{s.block.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right">{btn(s.supply)} BTN</td>
                      <td className="py-2 px-2 text-right">{s.holders.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right">{pct(s.top10, circulating(s))}</td>
                      <td className="py-2 px-2 text-right">{pct(s.top100, circulating(s))}</td>
                      <td className="py-2 px-2 text-right">{pct(yearPlus(s), circulating(s))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
};
