import React, { useEffect, useState } from 'react';
import { GitMerge, AlertTriangle, CornerDownRight } from 'lucide-react';
import { ethers } from 'ethers';
import { rpcService } from '../services/rpc';
import { decodeTransactionInput } from '../services/decoder';
import { AddressTag } from './AddressTag';

interface CallFrame {
  type: string;
  from: string;
  to?: string;
  value?: string;
  gasUsed?: string;
  input?: string;
  error?: string;
  calls?: CallFrame[];
}

interface Row {
  depth: number;
  frame: CallFrame;
}

const flatten = (frame: CallFrame, depth = 0, out: Row[] = []): Row[] => {
  out.push({ depth, frame });
  for (const c of frame.calls ?? []) flatten(c, depth + 1, out);
  return out;
};

const short = (a?: string) => (a ? `${a.slice(0, 8)}…${a.slice(-6)}` : '—');
const valueOf = (f: CallFrame) => {
  try { return f.value ? BigInt(f.value) : 0n; } catch { return 0n; }
};
const method = (input?: string) => {
  if (!input || input === '0x' || input.length < 10) return null;
  const name = decodeTransactionInput(input)?.methodName;
  return name && !name.startsWith('Unknown') ? name : input.slice(0, 10);
};

const TYPE_STYLE: Record<string, string> = {
  CALL: 'bg-petrol-50 text-petrol border-petrol-200',
  STATICCALL: 'bg-slate-50 text-slate-600 border-slate-200',
  DELEGATECALL: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  CREATE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CREATE2: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SELFDESTRUCT: 'bg-rose-50 text-rose-700 border-rose-200',
};

/**
 * Internal transactions: the call tree of a mined transaction from the node's callTracer
 * (debug_traceTransaction), with every BTN transfer made by contracts along the way.
 */
export const TxTrace: React.FC<{ hash: string; onSelectAddress: (a: string) => void }> = ({ hash, onSelectAddress }) => {
  const [trace, setTrace] = useState<CallFrame | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    setTrace(undefined);
    rpcService
      .batch([{ method: 'debug_traceTransaction', params: [hash, { tracer: 'callTracer' }] }], 20000)
      .then(([res]) => { if (active) setTrace(res && res.type ? res : null); })
      .catch(() => { if (active) setTrace(null); });
    return () => { active = false; };
  }, [hash]);

  const rows = trace ? flatten(trace) : [];
  const internal = rows.slice(1);
  const moved = internal.reduce((s, r) => s + valueOf(r.frame), 0n);
  const transfers = internal.filter((r) => valueOf(r.frame) > 0n).length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-petrol-50 border border-petrol-100 flex items-center justify-center text-petrol shrink-0">
            <GitMerge className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Internal Transactions</h3>
            <p className="text-xs text-slate-500">Calls made during execution, traced by the node (callTracer).</p>
          </div>
        </div>
        {trace && (
          <span className="text-xs font-semibold text-slate-600">
            {internal.length} internal {internal.length === 1 ? 'call' : 'calls'}
            {transfers > 0 && ` · ${transfers} BTN ${transfers === 1 ? 'transfer' : 'transfers'} · ${ethers.formatEther(moved)} BTN`}
          </span>
        )}
      </div>

      {trace === undefined ? (
        <div className="space-y-2" role="status" aria-label="Tracing transaction">
          {[0, 1].map((i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
        </div>
      ) : trace === null ? (
        <p className="text-xs text-slate-500">The node did not return a trace for this transaction.</p>
      ) : internal.length === 0 ? (
        <p className="text-xs text-slate-600">No internal calls: the transaction did not call other contracts or move BTN beyond its own value.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map(({ depth, frame }, i) => {
            const value = valueOf(frame);
            const m = method(frame.input);
            return (
              <div
                key={i}
                className={`rounded-xl border p-2.5 sm:p-3 text-xs ${depth === 0 ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'}`}
                style={{ marginLeft: `${Math.min(depth, 6) * 14}px` }}
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {depth > 0 && <CornerDownRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                  <span className={`px-1.5 py-px rounded border font-mono text-[10px] font-bold ${TYPE_STYLE[frame.type] || TYPE_STYLE.STATICCALL}`}>{frame.type}</span>
                  {m && <span className="font-mono font-bold text-slate-800">{m}</span>}
                  {value > 0n && (
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700">
                      <img src="/bitnet-logo-blue.svg" alt="" className="w-3.5 h-3.5" />
                      {ethers.formatEther(value)} BTN
                    </span>
                  )}
                  {frame.error && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-px rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold">
                      <AlertTriangle className="w-3 h-3" /> {frame.error}
                    </span>
                  )}
                  {depth === 0 && <span className="text-[10px] text-slate-500">transaction</span>}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[11px] text-slate-600">
                  <button onClick={() => onSelectAddress(frame.from)} className="text-petrol hover:underline cursor-pointer">{short(frame.from)}</button>
                  <AddressTag address={frame.from} />
                  <span className="text-slate-400">→</span>
                  {frame.to ? (
                    <>
                      <button onClick={() => onSelectAddress(frame.to!)} className="text-petrol hover:underline cursor-pointer">{short(frame.to)}</button>
                      <AddressTag address={frame.to} />
                    </>
                  ) : <span>new contract</span>}
                  {frame.gasUsed && <span className="text-slate-400 font-sans">· {parseInt(frame.gasUsed, 16).toLocaleString()} gas</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
