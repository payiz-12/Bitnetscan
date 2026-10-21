import React, { useEffect, useMemo, useState } from 'react';
import { Users, ArrowRightLeft, UserPlus, AlertTriangle } from 'lucide-react';
import { BarChart } from './charts/ChartPrimitives';
import { SkeletonChart } from './Skeleton';
import { loadDailyUsage, toPeriods, DailyUsage, UsagePeriod } from '../services/dailyUsage';
import type { HistoryRange } from '../services/chainHistory';

const GROUPING: Record<HistoryRange, { grouping: 'day' | 'week' | 'month'; lastDays?: number; unit: string }> = {
  '7d': { grouping: 'day', lastDays: 8, unit: 'per day' },
  '30d': { grouping: 'day', lastDays: 31, unit: 'per day' },
  '1y': { grouping: 'week', lastDays: 366, unit: 'per week' },
  all: { grouping: 'month', unit: 'per month' },
};

const fmtDate = (date: string, opts: Intl.DateTimeFormatOptions) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });
const count = (v: number) => (v >= 100 || Number.isInteger(v) ? Math.round(v).toLocaleString('en-US') : v.toFixed(1));
const axis = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : count(v));

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

/**
 * Transactions, active addresses and new addresses per day (or week / month for long ranges),
 * computed by BitnetScan from every block of the chain and its archive state.
 */
export const NetworkUsageCharts: React.FC<{ range: HistoryRange }> = ({ range }) => {
  const [usage, setUsage] = useState<DailyUsage | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    loadDailyUsage().then((u) => { if (active) setUsage(u); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);

  const cfg = GROUPING[range];
  const periods = useMemo(() => (usage ? toPeriods(usage.rows, cfg.grouping, cfg.lastDays) : []), [usage, range]);
  const label = (p: UsagePeriod) => (cfg.grouping === 'month' ? fmtDate(p.start, { month: 'short', year: 'numeric' }) : fmtDate(p.start, { month: 'short', day: 'numeric' }));
  const span = (p: UsagePeriod) => (p.days === 1 ? fmtDate(p.start, { month: 'short', day: 'numeric', year: 'numeric' }) : `${fmtDate(p.start, { month: 'short', day: 'numeric', year: 'numeric' })} – ${fmtDate(p.end, { month: 'short', day: 'numeric', year: 'numeric' })} (${p.days} days)`);
  const head = (p: UsagePeriod) => (
    <div className="text-slate-500 mb-1">{span(p)} UTC{p.partial ? ' · so far' : ''}</div>
  );

  if (error && !usage) {
    return (
      <div role="alert" className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" /> The daily usage dataset could not be loaded.
      </div>
    );
  }
  if (!usage) {
    return <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">{[0, 1, 2].map((i) => <SkeletonChart key={i} />)}</div>;
  }

  const complete = usage.rows.filter((r) => !r.partial);
  const yesterday = complete[complete.length - 1];
  const today = usage.rows.find((r) => r.partial);
  const first = usage.rows[0];
  const tiles = [
    { label: 'Transactions', value: yesterday?.txs, today: today?.txs },
    { label: 'Active addresses', value: yesterday?.active, today: today?.active },
    { label: 'New addresses', value: yesterday?.new, today: today?.new },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900">Network usage</h2>
          <p className="text-xs text-slate-500">
            Computed by BitnetScan from every block of the chain (#{usage.fromBlock.toLocaleString()}–#{usage.toBlock.toLocaleString()}) and its archive state.
            {!usage.genesisReached && first && <> History is still being read back to the first block; it currently starts on {fmtDate(first.date, { month: 'short', day: 'numeric', year: 'numeric' })}.</>}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {tiles.map((t) => (
            <div key={t.label} className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold block">{t.label} · {yesterday ? fmtDate(yesterday.date, { month: 'short', day: 'numeric' }) : '—'}</span>
              <span className="text-lg sm:text-xl font-black text-slate-900">{t.value === undefined ? '—' : t.value.toLocaleString('en-US')}</span>
              {t.today !== undefined && <span className="text-[11px] text-slate-500 block">Today so far: {t.today.toLocaleString('en-US')}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        <Card title={`Transactions ${cfg.unit}`} subtitle="Transactions included in blocks, by UTC day." icon={<ArrowRightLeft className="w-4 h-4" />}>
          <BarChart
            values={periods.map((p) => p.txs)}
            partial={periods.map((p) => p.partial)}
            color="var(--chart-primary)"
            formatY={axis}
            formatX={(i) => label(periods[i])}
            describe={(i) => <>{head(periods[i])}<div className="font-bold text-slate-900">{periods[i].txs.toLocaleString('en-US')} transactions</div></>}
            ariaLabel={`Transactions ${cfg.unit}`}
          />
        </Card>
        <Card
          title={cfg.grouping === 'day' ? 'Active addresses per day' : `Active addresses (daily average ${cfg.unit.replace('per ', 'by ')})`}
          subtitle="Unique senders and recipients of the day's transactions."
          icon={<Users className="w-4 h-4" />}
        >
          <BarChart
            values={periods.map((p) => p.active)}
            partial={periods.map((p) => p.partial)}
            color="var(--chart-primary)"
            formatY={axis}
            formatX={(i) => label(periods[i])}
            describe={(i) => {
              const p = periods[i];
              return (
                <>
                  {head(p)}
                  <div className="font-bold text-slate-900">{count(p.active)} active {p.days > 1 ? 'per day on average' : 'addresses'}</div>
                  {p.senders !== null && <div className="text-slate-600">{count(p.senders)} of them sent transactions</div>}
                </>
              );
            }}
            ariaLabel="Active addresses"
          />
        </Card>
        <Card title={`New addresses ${cfg.unit}`} subtitle="Active addresses the chain had never seen: no balance, nonce or code before that day." icon={<UserPlus className="w-4 h-4" />}>
          <BarChart
            values={periods.map((p) => p.newAddresses)}
            partial={periods.map((p) => p.partial)}
            color="var(--chart-primary)"
            formatY={axis}
            formatX={(i) => label(periods[i])}
            describe={(i) => <>{head(periods[i])}<div className="font-bold text-slate-900">{periods[i].newAddresses.toLocaleString('en-US')} new addresses</div></>}
            ariaLabel={`New addresses ${cfg.unit}`}
          />
        </Card>
      </div>
    </div>
  );
};
