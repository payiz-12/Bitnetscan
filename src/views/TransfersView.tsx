import React, { useEffect, useState } from 'react';
import { Banknote, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';
import { AddressTag } from '../components/AddressTag';
import { SkeletonList } from '../components/Skeleton';
import { StaleDataNotice } from '../components/StaleDataNotice';
import { priceService, BtnPriceData, formatBtnInUsd } from '../services/priceService';

interface Transfer {
  hash: string;
  block: number;
  timestamp: number;
  from: string;
  to: string | null;
  btn: number;
}

interface TransfersData {
  datasetGeneratedAt?: string;
  toBlock: number;
  allTimeComplete: boolean;
  allTimeReadTo: number;
  recentFrom: number;
  last24h: Transfer[];
  last7d: Transfer[];
  last30d: Transfer[];
  allTime: Transfer[];
}

type Range = 'last24h' | 'last7d' | 'last30d' | 'allTime';
const RANGES: { id: Range; label: string }[] = [
  { id: 'last24h', label: '24H' },
  { id: 'last7d', label: '7D' },
  { id: 'last30d', label: '30D' },
  { id: 'allTime', label: 'All time' },
];

interface TransfersViewProps {
  onSelectTx: (hash: string) => void;
  onSelectAddress: (address: string) => void;
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const btn = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: v >= 1000 ? 0 : 2 });
const when = (ts: number) => new Date(ts * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
const ago = (ts: number) => {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - ts));
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} days ago`;
};

/** The largest BTN transfers by transaction value, read by BitnetScan from every block. */
export const TransfersView: React.FC<TransfersViewProps> = ({ onSelectTx, onSelectAddress }) => {
  const [range, setRange] = useState<Range>('last24h');
  const [data, setData] = useState<TransfersData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState<BtnPriceData>(priceService.getCachedPrice());

  useEffect(() => {
    let active = true;
    fetch('/api/transfers', { signal: AbortSignal.timeout(30000) })
      .then(async (r) => {
        if (r.ok) return r.json();
        const body = await r.json().catch(() => ({}));
        throw new Error(/not computed/.test(body.error ?? '') ? 'pending' : `HTTP ${r.status}`);
      })
      .then((d) => { if (active) setData(d); })
      .catch((e: Error) => { if (active) setError(e.message); });
    priceService.getPrice().then((p) => { if (active) setPrice(p); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const rows = data ? data[range] : [];
  const Party: React.FC<{ address: string | null }> = ({ address }) => (address ? (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <button type="button" onClick={() => onSelectAddress(address)} className="font-mono text-petrol hover:underline cursor-pointer">{short(address)}</button>
      <AddressTag address={address} hide={['solo']} />
    </span>
  ) : <span className="text-slate-500">Contract creation</span>);

  return (
    <div className="space-y-5 sm:space-y-6 w-full animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-petrol-50 border border-petrol-100 flex items-center justify-center text-petrol shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Large Transfers</h1>
              <p className="text-xs sm:text-sm text-slate-500">The largest BTN transfers, read by BitnetScan from every block.</p>
            </div>
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 self-start" role="group" aria-label="Time range">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                aria-pressed={range === r.id}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${range === r.id ? 'bg-petrol text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-slate-500">
          Transaction values, largest first{data ? <> · up to block #{data.toBlock.toLocaleString()}</> : null}. BTN moved inside contract calls (internal transfers) is not included.
          {data && range === 'allTime' && !data.allTimeComplete && (
            <> The all-time list is still being built: it covers blocks #0–#{data.allTimeReadTo.toLocaleString()} and from #{data.recentFrom.toLocaleString()} on, and grows with each hourly update.</>
          )}
        </p>
      </div>

      {data && <StaleDataNotice at={data.datasetGeneratedAt} what="the 7-day, 30-day and all-time lists" />}

      {error === 'pending' && (
        <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 text-xs">
          BitnetScan is reading the chain for this list. It appears after the next hourly update.
        </div>
      )}
      {error && error !== 'pending' && (
        <div role="alert" className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> The transfer list could not be loaded.
        </div>
      )}
      {!data && !error && (
        <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading transfers…</div>
          <SkeletonList rows={8} />
        </div>
      )}

      {data && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No BTN transfers in this period.</p>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Transaction</th>
                      <th className="py-3 px-4">Time (UTC)</th>
                      <th className="py-3 px-4">From</th>
                      <th className="py-3 px-1" aria-hidden="true" />
                      <th className="py-3 px-4">To</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((t, i) => (
                      <tr key={t.hash} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 text-slate-500">{i + 1}</td>
                        <td className="py-2.5 px-4">
                          <button type="button" onClick={() => onSelectTx(t.hash)} className="font-mono text-petrol hover:underline cursor-pointer">{t.hash.slice(0, 10)}…{t.hash.slice(-6)}</button>
                          <span className="block text-[11px] text-slate-500">Block #{t.block.toLocaleString()}</span>
                        </td>
                        <td className="py-2.5 px-4"><span className="text-slate-900">{when(t.timestamp)}</span><span className="block text-[11px] text-slate-500">{ago(t.timestamp)}</span></td>
                        <td className="py-2.5 px-4"><Party address={t.from} /></td>
                        <td className="py-2.5 px-1 text-slate-400"><ArrowRight className="w-3.5 h-3.5" /></td>
                        <td className="py-2.5 px-4"><Party address={t.to} /></td>
                        <td className="py-2.5 px-4 text-right">
                          <span className="font-bold text-slate-900">{btn(t.btn)} BTN</span>
                          {price.available && <span className="block text-[11px] text-slate-500">{formatBtnInUsd(t.btn, price, 0)}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="md:hidden divide-y divide-slate-100">
                {rows.map((t, i) => (
                  <li key={t.hash} className="p-4 space-y-1.5 text-xs">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-black text-slate-900 text-sm">{btn(t.btn)} BTN</span>
                      <span className="text-slate-500">#{i + 1} · {ago(t.timestamp)}</span>
                    </div>
                    {price.available && <div className="text-[11px] text-slate-500">{formatBtnInUsd(t.btn, price, 0)}</div>}
                    <div className="flex flex-wrap items-center gap-1.5"><span className="text-slate-500">From</span> <Party address={t.from} /></div>
                    <div className="flex flex-wrap items-center gap-1.5"><span className="text-slate-500">To</span> <Party address={t.to} /></div>
                    <button type="button" onClick={() => onSelectTx(t.hash)} className="font-mono text-petrol hover:underline cursor-pointer">{t.hash.slice(0, 14)}…{t.hash.slice(-8)}</button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
};
