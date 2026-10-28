import React, { useEffect, useState } from 'react';
import { Scale, ArrowRight } from 'lucide-react';
import { KNOWN_MINING_POOLS } from '../data/miningPools';
import { loadMinerReport, MinerReport, MINERS_PENDING } from '../services/miners';

const POOLS = Object.values(KNOWN_MINING_POOLS).filter((p) => p.category === 'known');
const btn = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 0 });
const pct = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : '—');
const longDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** Sums of a report's days on or after `since`. */
const sums = (report: MinerReport, since?: string) => report.days
  .filter((d) => !since || d.date >= since)
  .reduce((t, d) => ({ earned: t.earned + d.earned, sent: t.sent + d.sent, sends: t.sends + d.sends, blocks: t.blocks + d.blocks }), { earned: 0, sent: 0, sends: 0, blocks: 0 });

/**
 * What each known pool earned from its blocks against what it paid out, from every block: a pool
 * that keeps its miners' rewards shows a low share and a growing balance.
 */
export const PoolPayouts: React.FC<{ onSelectMiner: (address: string) => void }> = ({ onSelectMiner }) => {
  const [reports, setReports] = useState<Record<string, MinerReport | null>>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    for (const p of POOLS) {
      loadMinerReport(p.address)
        .then((r) => { if (active) setReports((m) => ({ ...m, [p.address]: r })); })
        .catch((e: Error) => { if (active) { setReports((m) => ({ ...m, [p.address]: null })); if (e.message === MINERS_PENDING) setPending(true); } });
    }
    return () => { active = false; };
  }, []);

  const loaded = POOLS.map((p) => ({ pool: p, report: reports[p.address] })).filter((x) => x.report?.mined);
  if (!pending && loaded.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 md:p-8 space-y-4 shadow-sm">
      <div className="pb-3 border-b border-slate-100 space-y-1">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-petrol" />
          <h3 className="text-lg font-bold text-slate-900">Pool payouts, from every block</h3>
        </div>
        <p className="text-xs text-slate-500">
          What each pool earned from its blocks (block and uncle rewards, exact) against the BTN its transactions sent, which is how a pool pays its miners. Read by BitnetScan from every block; balances from the archive state.
        </p>
      </div>
      {pending && loaded.length === 0 ? (
        <p className="text-xs text-slate-600">BitnetScan is reading every block for the pool history. It appears after the next hourly updates.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loaded.map(({ pool, report }) => {
            const r = report!;
            const since = new Date(Date.parse(`${r.lastDay}T00:00:00Z`) - 29 * 86400000).toISOString().slice(0, 10);
            const month = sums(r, since);
            const all = sums(r);
            const last = r.days[r.days.length - 1];
            return (
              <div key={pool.address} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">{pool.name}</span>
                  <button type="button" onClick={() => onSelectMiner(pool.address)} className="inline-flex items-center gap-1 text-xs font-bold text-petrol hover:underline cursor-pointer">
                    Full history <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                {month.earned > 0 ? (
                  <p className="text-sm text-slate-700">
                    Paid out <span className="font-black text-slate-900">{pct(month.sent, month.earned)}</span> of what it earned in the last 30 days.
                  </p>
                ) : (
                  <p className="text-sm text-slate-700">No blocks in the last 30 days.</p>
                )}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div><dt className="text-slate-500">Earned, 30 days</dt><dd className="font-bold text-slate-900">{btn(month.earned)} BTN · {month.blocks.toLocaleString()} blocks</dd></div>
                  <div><dt className="text-slate-500">Sent, 30 days</dt><dd className="font-bold text-slate-900">{btn(month.sent)} BTN · {month.sends.toLocaleString()} payments</dd></div>
                  <div><dt className="text-slate-500">Earned, all time</dt><dd className="font-bold text-slate-900">{btn(all.earned)} BTN</dd></div>
                  <div><dt className="text-slate-500">Sent, all time</dt><dd className="font-bold text-slate-900">{btn(all.sent)} BTN ({pct(all.sent, all.earned)})</dd></div>
                  <div className="col-span-2"><dt className="text-slate-500">Balance</dt><dd className="font-bold text-slate-900">{last ? `${btn(last.balance)} BTN at the end of ${longDate(last.date)}` : '—'}</dd></div>
                </dl>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
