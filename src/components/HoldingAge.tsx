import React, { useEffect, useState } from 'react';
import { Hourglass } from 'lucide-react';
import { Legend } from './charts/ChartPrimitives';
import { loadAddressHolding, AddressHolding, HOLD_BANDS } from '../services/exactHistory';

const longDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const btn = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: v >= 100 ? 0 : 4 });
const pct = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(part / whole >= 0.1 ? 0 : 1)}%` : '—');
const age = (days: number) => (days >= 365 ? `${(days / 365).toFixed(1)} years` : days >= 60 ? `${Math.round(days / 30)} months` : `${days} days`);

/**
 * How long the BTN at an address has stayed there, from BitnetScan's history of every block:
 * the balance split by holding time, at the end of the last complete UTC day.
 */
export const HoldingAge: React.FC<{ address: string }> = ({ address }) => {
  const [holding, setHolding] = useState<AddressHolding | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [showLayers, setShowLayers] = useState(false);

  useEffect(() => {
    let active = true;
    setHolding(null);
    setShowLayers(false);
    loadAddressHolding(address).then((h) => { if (active) setHolding(h); });
    return () => { active = false; };
  }, [address]);

  if (!holding || !holding.followed || holding.balance <= 0) return null;

  const total = holding.balance;
  const yearPlus = holding.holdingBands.slice(4).reduce((a, b) => a + b, 0);
  const oldest = holding.layers[0];
  const shown = holding.holdingBands.map((v, b) => ({ v, b })).filter((x) => x.v > 0);
  const focus = hover ?? shown.reduce((best, x) => (x.v > holding.holdingBands[best] ? x.b : best), shown[0]?.b ?? 0);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-petrol-50 border border-petrol-100 flex items-center justify-center text-petrol shrink-0">
          <Hourglass className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-bold text-slate-900">How long this BTN has stayed here</h3>
          <p className="text-xs text-slate-500">
            {pct(yearPlus, total)} has not left this address for a year or more{oldest ? <> · the oldest {btn(oldest.btn)} BTN since {longDate(oldest.since)}</> : null}
          </p>
        </div>
      </div>

      <div className="flex h-4 gap-[2px]" role="img" aria-label={`BTN at this address by holding time: ${shown.map((x) => `${HOLD_BANDS[x.b]} ${pct(x.v, total)}`).join(', ')}`} onPointerLeave={() => setHover(null)}>
        {shown.map((x, i) => (
          <span
            key={x.b}
            className={`h-full ${i === 0 ? 'rounded-l-md' : ''} ${i === shown.length - 1 ? 'rounded-r-md' : ''}`}
            style={{ width: `${(x.v / total) * 100}%`, minWidth: 3, background: `var(--hold-${x.b + 1})`, opacity: hover === null || hover === x.b ? 1 : 0.45 }}
            onPointerEnter={() => setHover(x.b)}
            onPointerDown={() => setHover(x.b)}
          />
        ))}
      </div>
      <p className="text-xs text-slate-700">
        <span className="font-bold text-slate-900">{HOLD_BANDS[focus]}:</span> {btn(holding.holdingBands[focus])} BTN ({pct(holding.holdingBands[focus], total)})
      </p>
      <Legend items={shown.map((x) => ({ name: HOLD_BANDS[x.b], color: `var(--hold-${x.b + 1})`, value: pct(x.v, total) }))} />

      <div className="text-[11px] text-slate-500 space-y-1.5">
        <p>
          Balance {btn(total)} BTN at the end of {longDate(holding.asOf)} UTC (block #{holding.block.toLocaleString()}). BTN counts as unmoved for as long as the balance never fell below it at the end of a day; dates are rounded towards today, to the week and past a year to 30 days.
        </p>
        {holding.layers.length > 1 && (
          <button type="button" onClick={() => setShowLayers((v) => !v)} className="font-bold text-petrol hover:underline cursor-pointer">
            {showLayers ? 'Hide' : 'Show'} the {holding.layers.length} layers
          </button>
        )}
      </div>
      {showLayers && (
        <div className="overflow-x-auto max-h-72 overflow-y-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs font-mono whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold sticky top-0">
              <tr>
                <th className="py-2 px-3">Here since</th>
                <th className="py-2 px-3 text-right">BTN</th>
                <th className="py-2 px-3 text-right">Held for</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {holding.layers.map((l) => (
                <tr key={l.since}>
                  <td className="py-1.5 px-3">{longDate(l.since)}</td>
                  <td className="py-1.5 px-3 text-right">{btn(l.btn)}</td>
                  <td className="py-1.5 px-3 text-right">{age(l.days)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
