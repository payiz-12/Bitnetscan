import React, { useEffect, useMemo, useState } from 'react';
import { Block } from '../types/blockchain';
import { loadMinerSample, getCachedMinerSample } from '../services/minerSample';

const BARS = 24;
const PAST = '#A7D9DF';
const CURRENT = '#016976';
const OVERDUE = '#D68142';

interface NextBlockRhythmProps {
  recentBlocks: Block[];
  latestBlock: number;
  nowSec: number;
  avgBlockTime: number | null;
  onSelectBlock: (n: number) => void;
}

/**
 * The next block as part of the chain's rhythm: the time each of the last 24 blocks took,
 * with the block being mined now growing live at the end against the average block time.
 */
export const NextBlockRhythm: React.FC<NextBlockRhythmProps> = ({ recentBlocks, latestBlock, nowSec, avgBlockTime, onSelectBlock }) => {
  const [sample, setSample] = useState<Block[]>(() => getCachedMinerSample());

  useEffect(() => {
    let active = true;
    loadMinerSample().then((b) => { if (active) setSample(b); }).catch(() => {});
    return () => { active = false; };
  }, [latestBlock]);

  // Block times (seconds) of the newest blocks, from consecutive headers.
  const past = useMemo(() => {
    const ts = new Map<number, number>();
    for (const b of sample) ts.set(b.number, b.timestamp);
    for (const b of recentBlocks) ts.set(b.number, b.timestamp);
    const head = Math.max(0, ...ts.keys());
    const out: { number: number; seconds: number }[] = [];
    for (let n = head; n > head - 200 && out.length < BARS; n--) {
      const a = ts.get(n);
      const b = ts.get(n - 1);
      if (a === undefined || b === undefined) break;
      out.unshift({ number: n, seconds: Math.max(0, a - b) });
    }
    return { head, bars: out };
  }, [sample, recentBlocks]);

  const lastTs = recentBlocks[0]?.timestamp ?? null;
  const elapsed = lastTs !== null ? Math.max(0, nowSec - lastTs) : 0;
  const next = (recentBlocks[0]?.number || latestBlock || past.head) + 1;
  const avg = avgBlockTime ?? (past.bars.length ? past.bars.reduce((s, b) => s + b.seconds, 0) / past.bars.length : null);
  const overdue = avg !== null && elapsed > avg;
  const longer = past.bars.length ? Math.round((past.bars.filter((b) => b.seconds < elapsed).length / past.bars.length) * 100) : null;
  const top = Math.max(avg ? avg * 2 : 1, elapsed, ...past.bars.map((b) => b.seconds));
  const pct = (s: number) => `${Math.max(4, (s / top) * 100)}%`;

  return (
    <div className="p-3 bg-petrol-50/20 border-b border-slate-100">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="relative flex w-2 h-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping motion-reduce:animate-none" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-mono font-bold text-sm text-slate-900 tracking-tight">#{next.toLocaleString()}</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-petrol-50 text-petrol border border-petrol-200">Next block</span>
          </div>
          <span className={`text-[11px] font-mono font-semibold ${overdue ? 'text-terracotta-700' : 'text-slate-500'}`}>
            {elapsed}s{longer !== null && ` · longer than ${longer}% of the last ${past.bars.length} blocks`}
          </span>
        </div>

        <div className="relative h-14 sm:h-16 mt-2.5" role="img" aria-label={`Block times of the last ${past.bars.length} blocks; the next block has taken ${elapsed} seconds so far`}>
          <div className="absolute inset-0 flex items-end gap-[3px]">
            {past.bars.map((b) => (
              <button
                key={b.number}
                type="button"
                title={`#${b.number.toLocaleString()} · ${b.seconds}s`}
                onClick={() => onSelectBlock(b.number)}
                className="flex-1 max-w-[24px] rounded-t-[4px] cursor-pointer hover:opacity-80 transition-[height] duration-500"
                style={{ height: pct(b.seconds), background: PAST }}
              />
            ))}
            <div
              title={`#${next.toLocaleString()} · ${elapsed}s so far`}
              className="flex-1 max-w-[24px] rounded-t-[4px] transition-[height] duration-1000 ease-linear animate-pulse motion-reduce:animate-none"
              style={{ height: pct(elapsed), background: overdue ? OVERDUE : CURRENT }}
            />
          </div>
          {avg !== null && (
            <>
              <div className="absolute left-0 right-0 h-px bg-slate-400 pointer-events-none" style={{ bottom: `${(avg / top) * 100}%` }} />
              <span className="absolute right-0 text-[10px] font-mono text-slate-500 bg-white/90 px-1 pointer-events-none" style={{ bottom: `calc(${(avg / top) * 100}% + 2px)` }}>
                avg {avg.toFixed(1)}s
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
