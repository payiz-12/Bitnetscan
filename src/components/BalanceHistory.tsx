import React, { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { ethers } from 'ethers';
import { rpcService } from '../services/rpc';
import { blockAtTime } from '../services/chainHistory';
import { LineChart } from './charts/ChartPrimitives';

type Range = '30d' | '1y' | 'all';
const RANGES: { id: Range; label: string; seconds: number | null }[] = [
  { id: '30d', label: '30D', seconds: 30 * 86400 },
  { id: '1y', label: '1Y', seconds: 365 * 86400 },
  { id: 'all', label: 'All', seconds: null },
];
const POINTS = 48;

interface Point {
  block: number;
  timestamp: number;
  wei: bigint;
}

const cache = new Map<string, { at: number; points: Point[] }>();

/** Balance of `address` at POINTS evenly spaced blocks, read from the archive node. */
async function loadBalanceHistory(address: string, range: Range): Promise<Point[]> {
  const key = `${address.toLowerCase()}:${range}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 5 * 60 * 1000) return hit.points;

  const headNumber = await rpcService.getBlockNumber();
  const [first, head] = await rpcService.getBlockHeadersByNumbers([1, headNumber], { cache: false });
  if (!first || !head) throw new Error('Chain head unavailable');
  const seconds = RANGES.find((r) => r.id === range)?.seconds ?? null;
  const start = seconds === null || head.timestamp - seconds <= first.timestamp ? 1 : await blockAtTime(head.timestamp - seconds, first, head);

  const numbers = [...new Set(Array.from({ length: POINTS }, (_, i) => Math.round(start + (i * (head.number - start)) / (POINTS - 1))))];
  const headers = await rpcService.getBlockHeadersByNumbers(numbers, { cache: false });
  const byNumber = new Map(headers.map((h) => [h.number, h]));
  const balances: (string | null)[] = [];
  for (let i = 0; i < numbers.length; i += 100) {
    const chunk = numbers.slice(i, i + 100);
    balances.push(...(await rpcService.batch(chunk.map((n) => ({ method: 'eth_getBalance', params: [address, '0x' + n.toString(16)] })), 15000)));
  }
  const points: Point[] = [];
  numbers.forEach((n, i) => {
    const h = byNumber.get(n);
    const b = balances[i];
    if (h && typeof b === 'string') points.push({ block: n, timestamp: h.timestamp, wei: BigInt(b) });
  });
  if (points.length < 2) throw new Error('Balance history unavailable');
  cache.set(key, { at: Date.now(), points });
  return points;
}

const btn = (wei: bigint) => Number(ethers.formatEther(wei));
const fmt = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: v >= 100 ? 2 : 6 });
const compact = (v: number) =>
  v === 0 ? '0' : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)}k` : v >= 1 ? v.toFixed(0) : v.toFixed(2);

/** Line chart of an address's BTN balance over 30 days, a year or all time. */
export const BalanceHistory: React.FC<{ address: string }> = ({ address }) => {
  const [range, setRange] = useState<Range>('30d');
  const [points, setPoints] = useState<Point[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setPoints(null);
    setError(false);
    loadBalanceHistory(address, range)
      .then((p) => { if (active) setPoints(p); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [address, range]);

  const first = points?.[0];
  const last = points?.[points.length - 1];
  const change = first && last ? btn(last.wei) - btn(first.wei) : null;
  const dateFmt: Intl.DateTimeFormatOptions = range === '30d'
    ? { month: 'short', day: 'numeric', timeZone: 'UTC' }
    : { month: 'short', year: 'numeric', timeZone: 'UTC' };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-petrol-50 border border-petrol-100 flex items-center justify-center text-petrol shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Balance History</h3>
            <p className="text-xs text-slate-500">
              {change !== null && first
                ? <>{change === 0 ? 'No change' : `${change > 0 ? '▲' : '▼'} ${fmt(Math.abs(change))} BTN`} since {new Date(first.timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} · read from the archive node</>
                : 'BTN balance at past blocks, read from the archive node.'}
            </p>
          </div>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 self-start sm:self-auto" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button key={r.id} onClick={() => setRange(r.id)} aria-pressed={range === r.id}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${range === r.id ? 'bg-petrol text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="text-xs text-slate-500 py-6 text-center">Could not read past balances from the RPC.</p>
      ) : !points ? (
        <div className="skeleton rounded-xl w-full h-[200px]" role="status" aria-label="Loading balance history" />
      ) : (
        <LineChart
          points={points.map((p) => ({ x: p.timestamp, y: btn(p.wei) }))}
          color="var(--chart-primary)"
          formatY={(v) => `${fmt(v)} BTN`}
          formatAxisY={compact}
          formatX={(ts) => new Date(ts * 1000).toLocaleDateString('en-US', dateFmt)}
          describe={(i) => (
            <>
              {new Date(points[i].timestamp * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })} UTC
              <br />Block #{points[i].block.toLocaleString()}
            </>
          )}
          ariaLabel="BTN balance over time"
        />
      )}
    </div>
  );
};
