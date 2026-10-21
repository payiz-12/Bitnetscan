import React, { useEffect, useState } from 'react';
import { ShieldCheck, BookOpen, Database, ChevronDown, HelpCircle } from 'lucide-react';
import { ethers } from 'ethers';
import { decodeCall, decodeLogs, DecodedCall, DecodedLog, DecodeSource } from '../services/txDecode';
import { AbiValue } from './AbiValue';
import { AddressTag } from './AddressTag';

const SOURCE_BADGE: Record<DecodeSource, { label: string; title: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  verified: { label: 'Verified ABI', title: 'Decoded with the source code verified on the Bitnet explorer', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: ShieldCheck },
  standard: { label: 'BTS-20 standard', title: 'Unverified token, decoded with the standard BTS-20 interface', cls: 'bg-sky-50 text-sky-700 border-sky-200', icon: BookOpen },
  signature: { label: 'Signature database', title: 'Unverified contract: the function name comes from the public signature database and was checked against the data; parameter names are not known', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Database },
};

const SourceBadge: React.FC<{ source: DecodeSource }> = ({ source }) => {
  const b = SOURCE_BADGE[source];
  const Icon = b.icon;
  return (
    <span title={b.title} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold font-sans whitespace-nowrap ${b.cls}`}>
      <Icon className="w-3 h-3" /> {b.label}
    </span>
  );
};

const amountLike = (p: ethers.ParamType) => /^u?int/.test(p.type) && /amount|value|wad|balance|supply/i.test(p.name || 'amount');

const Args: React.FC<{ args: (DecodedCall['args'][number] & { indexed?: boolean })[]; onSelectAddress: (a: string) => void; token?: DecodedCall['token'] }> = ({ args, onSelectAddress, token }) => (
  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
    {args.map((a, i) => (
      <div key={i} className="px-3 py-2.5 grid grid-cols-1 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] gap-1 sm:gap-3 font-mono text-xs">
        <div className="text-slate-500 min-w-0">
          <span className="text-petrol font-bold">{a.param.name || `arg${i}`}</span>{' '}
          <span className="text-slate-400">{a.param.type}</span>
          {a.indexed && <span className="ml-1.5 px-1 py-px rounded bg-slate-100 text-slate-500 text-[10px] font-sans font-semibold">indexed</span>}
        </div>
        <div className="text-slate-900 font-semibold min-w-0">
          <AbiValue p={a.param} v={a.value} onSelectAddress={onSelectAddress} token={token && amountLike(a.param) ? token : null} />
        </div>
      </div>
    ))}
  </div>
);

/** The called function and its arguments, decoded from the transaction input. */
export const DecodedInput: React.FC<{ to: string | null | undefined; input: string; onSelectAddress: (a: string) => void }> = ({ to, input, onSelectAddress }) => {
  const [decoded, setDecoded] = useState<DecodedCall | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    setDecoded(undefined);
    decodeCall(to, input).then((d) => { if (active) setDecoded(d); }).catch(() => { if (active) setDecoded(null); });
    return () => { active = false; };
  }, [to, input]);

  if (decoded === undefined) return <div className="skeleton rounded-2xl h-20" aria-hidden="true" />;
  if (!decoded) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-start gap-2">
        <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-px" />
        <span>
          Function <strong className="font-mono text-slate-900">{input.slice(0, 10)}</strong> is not in a verified ABI or the public signature database, so its arguments cannot be named. The calldata is in the Raw Hex tab.
        </span>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-slate-500">Function{decoded.contractName ? ` on ${decoded.contractName}` : ''}</div>
          <div className="font-mono text-sm font-bold text-petrol break-all">{decoded.name}</div>
          <div className="font-mono text-[11px] text-slate-500 break-all">{decoded.signature} · {decoded.selector}</div>
        </div>
        <SourceBadge source={decoded.source} />
      </div>
      {decoded.args.length > 0
        ? <Args args={decoded.args} onSelectAddress={onSelectAddress} token={decoded.token} />
        : <p className="text-xs text-slate-500 px-1">This function takes no arguments.</p>}
    </div>
  );
};

type Log = { address: string; topics: string[]; data: string };

const RawLog: React.FC<{ log: Log }> = ({ log }) => (
  <div className="font-mono text-[11px] space-y-1 break-all">
    {log.topics.map((t, i) => (
      <div key={i}><span className="text-slate-400">topic{i}</span> <span className="text-slate-700">{t}</span></div>
    ))}
    <div><span className="text-slate-400">data</span> <span className="text-slate-700">{log.data && log.data !== '0x' ? log.data : '0x (empty)'}</span></div>
  </div>
);

/** Event logs of a transaction, each decoded with the emitting contract's ABI when possible. */
export const EventLogs: React.FC<{ logs: Log[]; onSelectAddress: (a: string) => void }> = ({ logs, onSelectAddress }) => {
  const [decoded, setDecoded] = useState<(DecodedLog | null)[] | null>(null);
  const [raw, setRaw] = useState<Set<number>>(new Set());
  // The receipt is re-read while confirmations grow; decode again only when the logs change.
  const key = logs.map((l) => `${l.address}:${l.topics.join(',')}:${l.data}`).join('|');
  useEffect(() => {
    let active = true;
    setDecoded(null);
    decodeLogs(logs).then((d) => { if (active) setDecoded(d); }).catch(() => { if (active) setDecoded(logs.map(() => null)); });
    return () => { active = false; };
  }, [key]);

  return (
    <div className="space-y-3">
      {logs.map((log, i) => {
        const d = decoded?.[i];
        const showRaw = d === null || raw.has(i);
        return (
          <div key={i} className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="min-w-0 flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-slate-400">#{i}</span>
                <span className="font-mono text-sm font-bold text-petrol">{decoded === null ? '…' : d ? d.name : 'Unknown event'}</span>
                {d && <SourceBadge source={d.source} />}
              </div>
              <div className="flex items-center gap-1.5 min-w-0 text-xs">
                <span className="text-slate-500 shrink-0">from</span>
                <button type="button" onClick={() => onSelectAddress(log.address)} className="font-mono text-petrol hover:underline cursor-pointer truncate">{log.address}</button>
                <AddressTag address={log.address} />
              </div>
            </div>
            {d && <div className="font-mono text-[11px] text-slate-500 break-all">{d.signature}</div>}
            {d && d.args.length > 0 && <Args args={d.args} onSelectAddress={onSelectAddress} token={d.token} />}
            {d && (
              <button type="button" onClick={() => setRaw((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; })} className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${raw.has(i) ? 'rotate-180' : ''}`} /> Topics and data
              </button>
            )}
            {decoded !== null && showRaw && <RawLog log={log} />}
          </div>
        );
      })}
    </div>
  );
};
