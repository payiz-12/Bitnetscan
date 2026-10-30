import React, { useEffect, useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { BarChart } from './charts/ChartPrimitives';
import { StaleDataNotice } from './StaleDataNotice';
import { loadExactHistory, ExactHistory } from '../services/exactHistory';
import { getAddressLabel } from '../services/addressLabels';

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
/** Pools by name; other miners by address (solo-miner labels stay hidden, as in the rich list). */
const minerName = (a: string) => {
  const label = getAddressLabel(a);
  return label?.kind === 'pool' ? label.name : short(a);
};
const longDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;

const weekStart = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};
/** Miners that held a majority get the categorical colors in order of their majority days. */
const SERIES = 8;
const OTHER_COLOR = 'var(--chart-baseline)';

interface Week {
  start: string;
  end: string;
  blocks: number;
  /** The miner with the most blocks in the week. */
  leader: string;
  share: number;
  days: number;
}

interface Day {
  date: string;
  blocks: number;
  miner: string;
  share: number;
  /** Fewest miners that together mined more than half of the day's blocks. */
  nakamoto: number;
}

interface Run {
  miner: string;
  from: string;
  to: string;
  days: number;
  average: number;
  highest: number;
}

/**
 * Days on which a single miner mined more than half of the blocks, over the whole chain, from
 * BitnetScan's history of every block; runs of such days by the same miner are listed.
 */
export const MajorityHistory: React.FC<{ onSelectMiner: (address: string) => void }> = ({ onSelectMiner }) => {
  const [history, setHistory] = useState<ExactHistory | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;
    loadExactHistory().then((h) => { if (active) setHistory(h); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const days = useMemo<Day[]>(() => (history?.days ?? []).filter((d) => d.blocks > 0 && d.miners.length > 0).map((d) => {
    const sorted = [...d.miners].sort((a, b) => b[1] - a[1]);
    let sum = 0;
    let nakamoto = 0;
    for (const [, n] of sorted) { sum += n; nakamoto++; if (sum * 2 > d.blocks) break; }
    return { date: d.date, blocks: d.blocks, miner: history!.miners[sorted[0][0]], share: sorted[0][1] / d.blocks, nakamoto };
  }), [history]);

  const runs = useMemo<Run[]>(() => {
    const out: Run[] = [];
    let cur: (Run & { sum: number }) | null = null;
    for (const d of days) {
      if (d.share > 0.5 && cur && cur.miner === d.miner) {
        cur.to = d.date; cur.days++; cur.sum += d.share; cur.highest = Math.max(cur.highest, d.share);
      } else {
        if (cur) out.push({ ...cur, average: cur.sum / cur.days });
        cur = d.share > 0.5 ? { miner: d.miner, from: d.date, to: d.date, days: 1, sum: d.share, average: 0, highest: d.share } : null;
      }
    }
    if (cur) out.push({ ...cur, average: cur.sum / cur.days });
    return out.reverse();
  }, [days]);

  // Each week's leader, from all the blocks of the week.
  const weeks = useMemo<Week[]>(() => {
    if (!history) return [];
    const map = new Map<string, { start: string; end: string; blocks: number; days: number; miners: Map<number, number> }>();
    for (const d of history.days) {
      if (d.blocks === 0) continue;
      const key = weekStart(d.date);
      let w = map.get(key);
      if (!w) { w = { start: d.date, end: d.date, blocks: 0, days: 0, miners: new Map() }; map.set(key, w); }
      w.end = d.date;
      w.blocks += d.blocks;
      w.days += 1;
      for (const [i, n] of d.miners) w.miners.set(i, (w.miners.get(i) || 0) + n);
    }
    return [...map.values()].map((w) => {
      const [i, n] = [...w.miners].reduce((best, x) => (x[1] > best[1] ? x : best));
      return { start: w.start, end: w.end, blocks: w.blocks, days: w.days, leader: history.miners[i], share: n / w.blocks };
    });
  }, [history]);

  // Days on which each miner held a majority, most first; the order gives each miner its color.
  const holders = useMemo(() => {
    const count = new Map<string, number>();
    for (const d of days) if (d.share > 0.5) count.set(d.miner, (count.get(d.miner) || 0) + 1);
    return [...count].sort((a, b) => b[1] - a[1]);
  }, [days]);

  if (days.length === 0) return null;

  const colorOf = (miner: string) => {
    const slot = holders.findIndex(([m]) => m === miner);
    return slot >= 0 && slot < SERIES ? `var(--series-${slot + 1})` : OTHER_COLOR;
  };
  const leaders = [...new Set(weeks.map((w) => w.leader))].sort((a, b) => {
    const sa = holders.findIndex(([m]) => m === a);
    const sb = holders.findIndex(([m]) => m === b);
    return (sa < 0 ? 99 : sa) - (sb < 0 ? 99 : sb);
  });
  const legend = [
    ...leaders.filter((m) => colorOf(m) !== OTHER_COLOR).map((m) => ({ name: minerName(m), color: colorOf(m) })),
    ...(leaders.some((m) => colorOf(m) === OTHER_COLOR) ? [{ name: 'Other miners', color: OTHER_COLOR }] : []),
  ];
  const fmtWeek = (date: string, year: boolean) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', ...(year ? { year: 'numeric' } : { day: 'numeric' }), timeZone: 'UTC' });

  const majorityDays = days.filter((d) => d.share > 0.5).length;
  const recent = (n: number) => days.slice(-n).filter((d) => d.share > 0.5).length;
  const longest = runs.reduce<Run | null>((best, r) => (!best || r.days > best.days ? r : best), null);
  const latest = days[days.length - 1];
  const tiles = [
    { label: 'Days with a majority miner', value: majorityDays.toLocaleString(), note: `of ${days.length.toLocaleString()} days since the first block (${pct(majorityDays / days.length)})` },
    { label: 'In the last 30 days', value: `${recent(30)} days`, note: `${recent(365)} in the last 365 days` },
    { label: 'Longest run', value: longest ? `${longest.days} days` : 'None', note: longest ? `${minerName(longest.miner)}, ${longDate(longest.from)} – ${longDate(longest.to)}` : 'No miner ever had a majority for a day' },
    { label: `Largest miner · ${longDate(latest.date)}`, value: pct(latest.share), note: `${minerName(latest.miner)} · Nakamoto coefficient ${latest.nakamoto}` },
  ];

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4 min-w-0">
      <div className="flex items-start gap-2.5">
        <span className="w-8 h-8 rounded-xl bg-petrol-50 border border-petrol-100 text-petrol flex items-center justify-center shrink-0"><ShieldAlert className="w-4 h-4" /></span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900">Majority history, from every block</h2>
          <p className="text-xs text-slate-500">
            For every UTC day since the first block: whether a single miner mined more than half of the blocks. A miner with most of the hashrate can mine a longer chain in private and reverse recent payments (a 51% attack). Counted from every block, not a sample.
          </p>
        </div>
      </div>

      <StaleDataNotice at={history?.generatedAt} what="the majority history" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 min-w-0">
            <span className="text-[11px] text-slate-500 font-semibold block">{t.label}</span>
            <span className="text-lg sm:text-xl font-black text-slate-900 block">{t.value}</span>
            <span className="text-[11px] text-slate-500 block">{t.note}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 min-w-0 space-y-2">
          <h3 className="text-sm font-bold text-slate-900">Who held the lead each week, and how much of the blocks</h3>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {legend.map((l) => (
              <span key={l.name} className="flex items-center gap-1.5 text-xs text-slate-600"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} /> {l.name}</span>
            ))}
          </div>
          <BarChart
            values={weeks.map((w) => w.share * 100)}
            colors={weeks.map((w) => colorOf(w.leader))}
            partial={weeks.map((w, i) => i === weeks.length - 1 && w.days < 7)}
            color="var(--chart-primary)"
            yMax={100}
            reference={{ y: 50, label: '50% majority', color: 'var(--chart-alert)' }}
            formatY={(v) => `${v.toFixed(0)}%`}
            formatX={(i) => fmtWeek(weeks[i].start, true)}
            describe={(i) => {
              const w = weeks[i];
              return (
                <>
                  <div className="text-slate-500 mb-1">Week of {longDate(w.start)}{w.days < 7 ? ` (${w.days} days)` : ''}</div>
                  <div className="font-bold text-slate-900">{minerName(w.leader)}: {pct(w.share)}</div>
                  <div className="text-slate-600">of {w.blocks.toLocaleString()} blocks{w.share > 0.5 ? ' · a majority' : ''}</div>
                </>
              );
            }}
            ariaLabel="Share of blocks mined by each week's largest miner, colored by miner"
            height={220}
          />
        </div>
        <div className="min-w-0 space-y-2">
          <h3 className="text-sm font-bold text-slate-900">Days each miner held a majority</h3>
          <ul className="space-y-1.5">
            {holders.slice(0, SERIES).map(([miner, n]) => (
              <li key={miner} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-2 text-xs">
                <button type="button" onClick={() => onSelectMiner(miner)} className="font-mono text-petrol hover:underline cursor-pointer text-left truncate">{minerName(miner)}</button>
                <span className="h-3 rounded-r-sm" style={{ width: `${Math.max(2, (n / holders[0][1]) * 100)}%`, background: colorOf(miner) }} aria-hidden="true" />
                <span className="text-slate-900 font-bold tabular-nums text-right">{n.toLocaleString()} <span className="text-slate-500 font-normal">({pct(n / days.length)})</span></span>
              </li>
            ))}
          </ul>
          {holders.length > SERIES && (
            <p className="text-[11px] text-slate-500">{holders.length - SERIES} more miners: {holders.slice(SERIES).reduce((s, [, n]) => s + n, 0)} days together.</p>
          )}
          <p className="text-[11px] text-slate-500">Share of all {days.length.toLocaleString()} days in brackets. The colors match the weekly chart.</p>
        </div>
      </div>

      {runs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-900">Majority runs, newest first</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2 px-3">Days (UTC)</th>
                  <th className="py-2 px-3">Miner</th>
                  <th className="py-2 px-3 text-right">Length</th>
                  <th className="py-2 px-3 text-right">Average share</th>
                  <th className="py-2 px-3 text-right">Highest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(showAll ? runs : runs.slice(0, 8)).map((r) => (
                  <tr key={`${r.miner}-${r.from}`}>
                    <td className="py-2 px-3">{r.from === r.to ? longDate(r.from) : `${longDate(r.from)} – ${longDate(r.to)}`}</td>
                    <td className="py-2 px-3">
                      <button type="button" onClick={() => onSelectMiner(r.miner)} className="font-mono text-petrol hover:underline cursor-pointer">{minerName(r.miner)}</button>
                    </td>
                    <td className="py-2 px-3 text-right">{r.days} {r.days === 1 ? 'day' : 'days'}</td>
                    <td className="py-2 px-3 text-right">{pct(r.average)}</td>
                    <td className="py-2 px-3 text-right">{pct(r.highest)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {runs.length > 8 && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="text-xs font-bold text-petrol hover:underline cursor-pointer">
              {showAll ? 'Show fewer' : `Show all ${runs.length} runs`}
            </button>
          )}
        </div>
      )}
    </section>
  );
};
