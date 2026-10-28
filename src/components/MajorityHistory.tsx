import React, { useEffect, useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
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

// Status colors (reserved for state; always shown with a label).
const LEVELS = [
  { id: 'majority', label: 'One miner over 50%', color: '#d03b3b' },
  { id: 'close', label: 'Largest miner 40–50%', color: '#fab219' },
  { id: 'spread', label: 'Largest miner under 40%', color: 'var(--chart-grid)' },
] as const;
const levelOf = (share: number) => (share > 0.5 ? LEVELS[0] : share >= 0.4 ? LEVELS[1] : LEVELS[2]);

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

  if (days.length === 0) return null;

  const majorityDays = days.filter((d) => d.share > 0.5).length;
  const recent = (n: number) => days.slice(-n).filter((d) => d.share > 0.5).length;
  const longest = runs.reduce<Run | null>((best, r) => (!best || r.days > best.days ? r : best), null);
  const latest = days[days.length - 1];
  const years = [...new Set(days.map((d) => d.date.slice(0, 4)))];
  const byDate = new Map(days.map((d) => [d.date, d]));
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 min-w-0">
            <span className="text-[11px] text-slate-500 font-semibold block">{t.label}</span>
            <span className="text-lg sm:text-xl font-black text-slate-900 block">{t.value}</span>
            <span className="text-[11px] text-slate-500 block">{t.note}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {LEVELS.map((l) => (
            <span key={l.id} className="flex items-center gap-1.5 text-xs text-slate-600"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} /> {l.label}</span>
          ))}
        </div>
        {years.map((year) => {
          const start = Date.UTC(Number(year), 0, 1);
          const count = (Date.UTC(Number(year) + 1, 0, 1) - start) / 86400000;
          return (
            <div key={year} className="flex items-center gap-2">
              <span className="w-9 shrink-0 text-[11px] text-slate-500 tabular-nums">{year}</span>
              <div className="flex flex-1 h-5 gap-px min-w-0" role="img" aria-label={`${year}: ${days.filter((d) => d.date.startsWith(year) && d.share > 0.5).length} days with a majority miner`}>
                {Array.from({ length: count }, (_, k) => {
                  const date = new Date(start + k * 86400000).toISOString().slice(0, 10);
                  const d = byDate.get(date);
                  return (
                    <span
                      key={date}
                      className="flex-1 min-w-0 rounded-[1px]"
                      style={{ background: d ? levelOf(d.share).color : 'transparent' }}
                      title={d ? `${longDate(date)}: ${minerName(d.miner)} mined ${pct(d.share)} of ${d.blocks.toLocaleString()} blocks` : `${longDate(date)}: no data`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
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
