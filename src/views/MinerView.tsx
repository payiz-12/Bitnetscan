import React, { useEffect, useMemo, useState } from 'react';
import { Pickaxe, Coins, GitBranch, Wallet, Download, AlertTriangle, ArrowUpRight, Percent } from 'lucide-react';
import { BarChart, LineChart } from '../components/charts/ChartPrimitives';
import { SkeletonChart } from '../components/Skeleton';
import { AddressTag } from '../components/AddressTag';
import { getAddressLabel } from '../services/addressLabels';
import { loadMinerReport, minerPeriods, MinerReport, MinerPeriod, MINERS_PENDING } from '../services/miners';
import { loadExactHistory, ExactHistory } from '../services/exactHistory';

type Range = '30d' | '1y' | 'all';
const RANGES: { id: Range; label: string; grouping: 'day' | 'week' | 'month'; days?: number; unit: string }[] = [
  { id: '30d', label: '30D', grouping: 'day', days: 30, unit: 'per day' },
  { id: '1y', label: '1Y', grouping: 'week', days: 365, unit: 'per week' },
  { id: 'all', label: 'All', grouping: 'month', unit: 'per month' },
];

interface MinerViewProps {
  address: string;
  onSelectAddress: (address: string) => void;
}

const fmtDate = (date: string, opts: Intl.DateTimeFormatOptions) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });
const longDate = (date: string) => fmtDate(date, { month: 'short', day: 'numeric', year: 'numeric' });
const btn = (v: number, digits = 2) => v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const axis = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `${Math.round(v)}`);
const pct = (part: number, whole: number, digits = 1) => (whole > 0 ? `${((part / whole) * 100).toFixed(digits)}%` : '—');
const daysAgo = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) - (n - 1) * 86400000).toISOString().slice(0, 10);

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

/** Every day's rows as CSV, for the miner's own records. */
function downloadCsv(report: MinerReport) {
  const lines = [['date_utc', 'blocks', 'uncles', 'earned_btn', 'sent_btn', 'sending_transactions', 'balance_btn_end_of_day', 'first_block_of_day', 'last_block_of_day'].join(',')];
  for (const d of report.days) lines.push([d.date, d.blocks, d.uncles, d.earned.toFixed(6), d.sent.toFixed(6), d.sends, d.balance.toFixed(6), d.firstBlock, d.lastBlock].join(','));
  const url = URL.createObjectURL(new Blob([lines.join('\n') + '\n'], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `bitnet-miner-${report.address}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * One miner's record from every block: blocks, uncles, exact rewards, share of all blocks, the BTN
 * it sent (a pool's payouts) and its balance, with a yearly summary and a CSV of every day.
 */
export const MinerView: React.FC<MinerViewProps> = ({ address, onSelectAddress }) => {
  const [report, setReport] = useState<MinerReport | null>(null);
  const [history, setHistory] = useState<ExactHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>('1y');

  useEffect(() => {
    let active = true;
    setReport(null);
    setError(null);
    loadMinerReport(address).then((r) => { if (active) setReport(r); }).catch((e: Error) => { if (active) setError(e.message); });
    loadExactHistory().then((h) => { if (active) setHistory(h); }).catch(() => {});
    return () => { active = false; };
  }, [address]);

  const label = getAddressLabel(address);
  const name = label?.kind === 'pool' ? label.name : 'Miner';
  const cfg = RANGES.find((r) => r.id === range)!;
  // Every day the miner history covers, with everyone's blocks (for shares and empty days).
  const allDays = useMemo(() => (history && report ? history.days.filter((d) => d.date >= report.firstDay && d.date <= report.lastDay).map((d) => ({ date: d.date, blocks: d.blocks })) : []), [history, report]);
  const periods = useMemo<MinerPeriod[]>(() => (report && allDays.length ? minerPeriods(report.days, allDays, cfg.grouping, cfg.days ? daysAgo(report.lastDay, cfg.days) : undefined) : []), [report, allDays, range]);
  const years = useMemo(() => (report && allDays.length ? minerPeriods(report.days, allDays, 'month').reduce<Record<string, MinerPeriod[]>>((acc, p) => { (acc[p.start.slice(0, 4)] ??= []).push(p); return acc; }, {}) : {}), [report, allDays]);

  const header = (
    <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-petrol-50 border border-petrol-100 flex items-center justify-center text-petrol shrink-0">
            <Pickaxe className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">{name} {label?.kind !== 'pool' && <AddressTag address={address} hide={['solo']} />}</h1>
            <p className="font-mono text-xs text-slate-500 break-all">{address}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => onSelectAddress(address)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
            <ArrowUpRight className="w-3.5 h-3.5" /> Address page
          </button>
          {report && report.days.length > 0 && (
            <button type="button" onClick={() => downloadCsv(report)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-petrol hover:bg-petrol-600 text-white text-xs font-bold cursor-pointer">
              <Download className="w-3.5 h-3.5" /> Every day (CSV)
            </button>
          )}
        </div>
      </div>
      <p className="text-[11px] text-slate-500">
        Computed by BitnetScan from every block: 1 BTN per block, 1/32 BTN per uncle its blocks include and (8 − depth)/8 BTN per uncle it mined. Transaction fees (about 20 BTN over the whole chain) are left out. Sent is the BTN its own transactions carried, such as a pool's payouts.
      </p>
    </div>
  );

  if (error) {
    return (
      <div className="space-y-5 sm:space-y-6 w-full animate-fade-in">
        {header}
        <div className={`p-4 rounded-2xl text-xs flex items-center gap-2 ${error === MINERS_PENDING ? 'bg-white border border-slate-200 text-slate-600' : 'bg-amber-50 border border-amber-200 text-amber-900'}`}>
          {error === MINERS_PENDING
            ? 'BitnetScan is reading every block for the miner history. It appears after the next hourly updates.'
            : <><AlertTriangle className="w-4 h-4 shrink-0" /> The miner history could not be loaded.</>}
        </div>
      </div>
    );
  }
  if (!report || !history) {
    return (
      <div className="space-y-5 sm:space-y-6 w-full animate-fade-in">
        {header}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">{[0, 1].map((i) => <SkeletonChart key={i} />)}</div>
      </div>
    );
  }

  const catchingUp = report.chainBlock - report.toBlock > 20_000;
  const total = report.days.reduce((t, d) => ({ blocks: t.blocks + d.blocks, uncles: t.uncles + d.uncles, earned: t.earned + d.earned, sent: t.sent + d.sent, sends: t.sends + d.sends }), { blocks: 0, uncles: 0, earned: 0, sent: 0, sends: 0 });
  const allBlocks = allDays.reduce((s, d) => s + d.blocks, 0);
  const active = report.days.filter((d) => d.blocks > 0 || d.uncles > 0);
  const pays = total.sends > 0;
  const periodLabel = (p: MinerPeriod) => (cfg.grouping === 'month' ? fmtDate(p.start, { month: 'short', year: 'numeric' }) : fmtDate(p.start, { month: 'short', day: 'numeric' }));
  const periodHead = (p: MinerPeriod) => <div className="text-slate-500 mb-1">{p.days === 1 ? longDate(p.start) : `${longDate(p.start)} – ${longDate(p.end)}`} UTC</div>;

  return (
    <div className="space-y-5 sm:space-y-6 w-full animate-fade-in">
      {header}

      {catchingUp && (
        <div className="p-3 rounded-xl bg-petrol-50 border border-petrol-100 text-xs text-slate-700">
          The miner history is still being read from the first block: it reaches {longDate(report.lastDay)} (block #{report.toBlock.toLocaleString()} of #{report.chainBlock.toLocaleString()}) and grows with each hourly update.
        </div>
      )}

      {!report.mined ? (
        <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 text-xs">
          This address has not mined a block or an uncle up to {longDate(report.lastDay)}.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Blocks mined', value: total.blocks.toLocaleString(), note: `${pct(total.blocks, allBlocks)} of all blocks since ${fmtDate(report.firstDay, { month: 'short', year: 'numeric' })}` },
              { label: 'BTN earned', value: `${btn(total.earned, 0)} BTN`, note: 'Block and uncle rewards, exact' },
              { label: 'Uncles mined', value: total.uncles.toLocaleString(), note: `${pct(total.uncles, total.blocks + total.uncles)} of its blocks became uncles` },
              { label: 'Active', value: active.length ? `${active.length.toLocaleString()} days` : '—', note: active.length ? `${longDate(active[0].date)} – ${longDate(active[active.length - 1].date)}` : '' },
            ].map((t) => (
              <div key={t.label} className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-sm min-w-0">
                <span className="text-[11px] text-slate-500 font-semibold block">{t.label}</span>
                <span className="text-lg sm:text-xl font-black text-slate-900 block truncate">{t.value}</span>
                <span className="text-[11px] text-slate-500 block">{t.note}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5" role="group" aria-label="Time range">
              {RANGES.map((r) => (
                <button key={r.id} onClick={() => setRange(r.id)} aria-pressed={range === r.id}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${range === r.id ? 'bg-petrol text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            <Card title={`BTN earned ${cfg.unit}`} subtitle="Block and uncle rewards, by UTC day." icon={<Coins className="w-4 h-4" />}>
              <BarChart
                values={periods.map((p) => p.earned)}
                color="var(--chart-primary)"
                formatY={axis}
                formatX={(i) => periodLabel(periods[i])}
                describe={(i) => {
                  const p = periods[i];
                  return <>{periodHead(p)}<div className="font-bold text-slate-900">{btn(p.earned)} BTN</div><div className="text-slate-600">{p.blocks.toLocaleString()} blocks, {p.uncles.toLocaleString()} uncles</div></>;
                }}
                ariaLabel={`BTN earned ${cfg.unit}`}
              />
            </Card>
            <Card title="Share of all blocks" subtitle="Its blocks as a share of every block mined in the period." icon={<Percent className="w-4 h-4" />}>
              <LineChart
                points={periods.map((p, i) => ({ x: i, y: p.allBlocks ? (p.blocks / p.allBlocks) * 100 : 0 }))}
                color="var(--chart-primary)"
                yMax={100}
                reference={{ y: 50, label: '50% majority', color: 'var(--chart-alert)' }}
                formatY={(v) => `${v.toFixed(1)}%`}
                formatAxisY={(v) => `${v.toFixed(0)}%`}
                formatX={(i) => periodLabel(periods[i])}
                describe={(i) => <>{periodHead(periods[i])}{periods[i].blocks.toLocaleString()} of {periods[i].allBlocks.toLocaleString()} blocks</>}
                ariaLabel="Share of all blocks over time"
              />
            </Card>
            {pays && (
              <Card title="Paid out against earned" subtitle="BTN its transactions sent, as a share of what it earned in the period. Around 100% means it passes its rewards on, as a pool pays its miners." icon={<GitBranch className="w-4 h-4" />}>
                <LineChart
                  points={periods.map((p, i) => ({ x: i, y: p.earned > 0 ? (p.sent / p.earned) * 100 : 0 }))}
                  color="var(--chart-primary)"
                  reference={{ y: 100, label: '100%', color: 'var(--chart-baseline)' }}
                  formatY={(v) => `${v.toFixed(0)}%`}
                  formatX={(i) => periodLabel(periods[i])}
                  describe={(i) => {
                    const p = periods[i];
                    return <>{periodHead(p)}Sent {btn(p.sent)} BTN in {p.sends.toLocaleString()} transactions<br />Earned {btn(p.earned)} BTN</>;
                  }}
                  ariaLabel="BTN sent as a share of BTN earned over time"
                />
              </Card>
            )}
            <Card title="Balance" subtitle="At the end of each period: the end of the last day it mined or sent BTN, from the archive state." icon={<Wallet className="w-4 h-4" />}>
              <LineChart
                points={periods.map((p, i) => ({ x: i, y: p.balance ?? 0 }))}
                color="var(--chart-primary)"
                formatY={(v) => `${btn(v)} BTN`}
                formatAxisY={axis}
                formatX={(i) => periodLabel(periods[i])}
                describe={(i) => periodHead(periods[i])}
                ariaLabel="Balance over time"
              />
            </Card>
          </div>

          <section className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-3 min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">By year</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2 px-2">Year (UTC)</th>
                    <th className="py-2 px-2 text-right">Blocks</th>
                    <th className="py-2 px-2 text-right">Share</th>
                    <th className="py-2 px-2 text-right">Uncles</th>
                    <th className="py-2 px-2 text-right">Earned</th>
                    {pays && <th className="py-2 px-2 text-right">Sent</th>}
                    <th className="py-2 px-2 text-right">Balance at year end</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(years).reverse().map(([year, months]) => {
                    const y = months.reduce((t, p) => ({ blocks: t.blocks + p.blocks, all: t.all + p.allBlocks, uncles: t.uncles + p.uncles, earned: t.earned + p.earned, sent: t.sent + p.sent }), { blocks: 0, all: 0, uncles: 0, earned: 0, sent: 0 });
                    const end = months[months.length - 1];
                    return (
                      <tr key={year}>
                        <td className="py-2 px-2">{year}{end.end < `${year}-12-31` ? ' (to date)' : ''}</td>
                        <td className="py-2 px-2 text-right">{y.blocks.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right">{pct(y.blocks, y.all)}</td>
                        <td className="py-2 px-2 text-right">{y.uncles.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right">{btn(y.earned)} BTN</td>
                        {pays && <td className="py-2 px-2 text-right">{btn(y.sent)} BTN</td>}
                        <td className="py-2 px-2 text-right">{end.balance === null ? '—' : `${btn(end.balance)} BTN`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500">Up to the end of {longDate(report.lastDay)} UTC. The CSV has every day with its block range.</p>
          </section>
        </>
      )}
    </div>
  );
};
