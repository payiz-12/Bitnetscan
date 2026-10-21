import React, { useEffect, useState } from 'react';
import { ArrowLeft, Coins, Users, ArrowRightLeft, Copy, Check, FileCode, Search, RefreshCw, AlertTriangle, ArrowRight } from 'lucide-react';
import { ethers } from 'ethers';
import {
  getToken, getTokenHolders, getTokenTransfers, getTokenBalance, formatTokenAmount,
  TokenInfo, TokenHolder, TokenTransfer, PageParams,
} from '../services/tokens';
import { AddressTag } from '../components/AddressTag';
import { lookupSignatures } from '../services/signatures';

interface TokenViewProps {
  address: string;
  onBack: () => void;
  onSelectAddress: (a: string) => void;
  onSelectTx: (hash: string) => void;
}

const short = (a: string, head = 8, tail = 6) => (a.length > head + tail + 1 ? `${a.slice(0, head)}…${a.slice(-tail)}` : a);
const ago = (ts: number) => {
  const s = Math.max(0, Math.floor(Date.now() / 1000) - ts);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 365) return `${Math.floor(s / 86400)}d ago`;
  return `${(s / (86400 * 365)).toFixed(1)}y ago`;
};
const share = (value: bigint, supply: bigint | null) => {
  if (!supply || supply <= 0n) return null;
  const p = Number((value * 1000000n) / supply) / 10000;
  return p === 0 && value > 0n ? 1e-6 : p;
};
const pct = (p: number | null) => (p === null ? '—' : p >= 0.01 ? `${p.toFixed(2)}%` : p > 0 ? '<0.01%' : '0%');

const Addr: React.FC<{ address: string; name?: string | null; onSelectAddress: (a: string) => void }> = ({ address, name, onSelectAddress }) => (
  <span className="inline-flex items-center gap-1.5 min-w-0">
    <button type="button" onClick={() => onSelectAddress(address)} className="font-mono text-xs text-petrol hover:underline cursor-pointer truncate" title={address}>
      {short(address)}
    </button>
    <AddressTag address={address} />
    {name && <span className="text-[11px] text-slate-500 truncate hidden sm:inline">{name}</span>}
  </span>
);

// Pages can overlap when balances change between requests, so appended rows are de-duplicated.
function usePaged<T>(load: (page: PageParams) => Promise<{ items: T[]; next: PageParams }>, keyOf: (item: T) => string, deps: unknown[]) {
  const [items, setItems] = useState<T[]>([]);
  const [next, setNext] = useState<PageParams>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'more' | 'error'>('loading');
  const fetchPage = (page: PageParams, append: boolean) => {
    setState(append ? 'more' : 'loading');
    return load(page)
      .then((r) => {
        setItems((x) => {
          if (!append) return r.items;
          const seen = new Set(x.map(keyOf));
          return [...x, ...r.items.filter((i) => !seen.has(keyOf(i)))];
        });
        setNext(r.next);
        setState('ready');
      })
      .catch(() => setState('error'));
  };
  useEffect(() => { setItems([]); setNext(null); fetchPage(null, false); }, deps);
  return { items, next, state, more: () => next && fetchPage(next, true), retry: () => fetchPage(null, false) };
}

const LoadMore: React.FC<{ state: string; next: PageParams; onMore: () => void; onRetry: () => void }> = ({ state, next, onMore, onRetry }) => {
  if (state === 'error') {
    return (
      <div className="p-4 text-xs text-slate-600 flex items-center justify-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" /> The Bitnet explorer did not answer.
        <button type="button" onClick={onRetry} className="text-petrol font-bold hover:underline cursor-pointer">Try again</button>
      </div>
    );
  }
  if (!next) return null;
  return (
    <div className="p-3 flex justify-center">
      <button type="button" onClick={onMore} disabled={state === 'more'} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:border-petrol hover:text-petrol cursor-pointer disabled:opacity-60">
        {state === 'more' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />} Load more
      </button>
    </div>
  );
};

const Holders: React.FC<{ token: TokenInfo; onSelectAddress: (a: string) => void; onTop10: (p: number | null) => void }> = ({ token, onSelectAddress, onTop10 }) => {
  const { items, next, state, more, retry } = usePaged<TokenHolder>((p) => getTokenHolders(token.address, p), (h) => h.address.toLowerCase(), [token.address]);
  useEffect(() => {
    if (items.length === 0 || !token.totalSupply) return;
    onTop10(share(items.slice(0, 10).reduce((s, h) => s + h.value, 0n), token.totalSupply));
  }, [items.length > 0]);

  if (state === 'loading') return <div className="p-4 space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-9 rounded-lg" />)}</div>;
  if (items.length === 0 && state !== 'error') return <p className="p-6 text-center text-xs text-slate-500">No holders recorded yet.</p>;
  return (
    <>
      <div className="text-xs">
        <div className="hidden sm:grid grid-cols-[3rem_minmax(0,1fr)_12rem_10rem] gap-3 px-4 py-2.5 text-[11px] font-semibold text-slate-500 border-b border-slate-100">
          <span>#</span><span>Address</span><span className="text-right">Quantity</span><span className="text-right">Share</span>
        </div>
        <div className="divide-y divide-slate-100">
          {items.map((h, i) => {
            const p = share(h.value, token.totalSupply);
            return (
              <div key={h.address} className="grid grid-cols-[2rem_minmax(0,1fr)] sm:grid-cols-[3rem_minmax(0,1fr)_12rem_10rem] gap-x-3 gap-y-1 px-4 py-2.5 hover:bg-slate-50 items-center">
                <span className="text-slate-500 font-mono">{i + 1}</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  {h.isContract && <FileCode className="w-3.5 h-3.5 text-purple-600 shrink-0" aria-label="Contract" />}
                  <Addr address={h.address} name={h.name} onSelectAddress={onSelectAddress} />
                </div>
                <span className="col-start-2 sm:col-start-auto sm:text-right font-mono font-semibold text-slate-900 break-all">
                  {formatTokenAmount(h.value, token.decimals)} <span className="sm:hidden text-slate-500 font-normal">· {pct(p)}</span>
                </span>
                <div className="hidden sm:flex items-center justify-end gap-2">
                  <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-petrol rounded-full" style={{ width: `${Math.min(100, p ?? 0)}%` }} />
                  </div>
                  <span className="font-mono text-slate-700 w-16 text-right">{pct(p)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <LoadMore state={state} next={next} onMore={more} onRetry={retry} />
    </>
  );
};

const Transfers: React.FC<{ token: TokenInfo; onSelectAddress: (a: string) => void; onSelectTx: (h: string) => void }> = ({ token, onSelectAddress, onSelectTx }) => {
  const { items, next, state, more, retry } = usePaged<TokenTransfer>((p) => getTokenTransfers(token.address, p), (t) => `${t.txHash}-${t.logIndex}`, [token.address]);
  // The explorer gives selectors for unverified contracts; name them from the signature database.
  const [methodNames, setMethodNames] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    const selectors = [...new Set(items.map((t) => t.method).filter((m): m is string => !!m && /^0x[0-9a-f]{8}$/i.test(m) && !methodNames.has(m.toLowerCase())))];
    if (!selectors.length) return;
    lookupSignatures(selectors, []).then((found) => setMethodNames((m) => {
      const n = new Map(m);
      for (const [sel, sigs] of found) if (sigs[0]) n.set(sel, sigs[0].split('(')[0]);
      return n;
    })).catch(() => {});
  }, [items.length]);
  if (state === 'loading') return <div className="p-4 space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>;
  if (items.length === 0 && state !== 'error') return <p className="p-6 text-center text-xs text-slate-500">No transfers recorded yet.</p>;
  return (
    <>
      <div className="divide-y divide-slate-100">
        {items.map((t) => {
          const mint = /^0x0{40}$/i.test(t.from);
          const burn = /^0x0{40}$/i.test(t.to) || /^0x0{36}dead$/i.test(t.to);
          return (
            <div key={`${t.txHash}-${t.logIndex}`} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 hover:bg-slate-50">
              <div className="sm:w-44 shrink-0 min-w-0">
                <button type="button" onClick={() => onSelectTx(t.txHash)} className="font-mono text-xs text-petrol hover:underline cursor-pointer">{short(t.txHash, 10, 6)}</button>
                <div className="text-[11px] text-slate-500">{t.timestamp ? ago(t.timestamp) : ''}{t.blockNumber ? ` · #${t.blockNumber.toLocaleString()}` : ''}</div>
              </div>
              <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
                {mint ? <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Mint</span> : <Addr address={t.from} onSelectAddress={onSelectAddress} />}
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {burn ? <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">Burn</span> : <Addr address={t.to} onSelectAddress={onSelectAddress} />}
                {t.method && <span title={t.method} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{methodNames.get(t.method.toLowerCase()) ?? t.method}</span>}
              </div>
              <div className="font-mono text-xs font-bold text-slate-900 sm:text-right whitespace-nowrap">
                {formatTokenAmount(t.value, token.decimals)} <span className="text-slate-500 font-semibold">{token.symbol}</span>
              </div>
            </div>
          );
        })}
      </div>
      <LoadMore state={state} next={next} onMore={more} onRetry={retry} />
    </>
  );
};

const BalanceCheck: React.FC<{ token: TokenInfo }> = ({ token }) => {
  const [holder, setHolder] = useState('');
  const [result, setResult] = useState<{ value: bigint | null; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ethers.isAddress(holder.trim())) { setResult({ value: null, error: 'Enter a 0x address.' }); return; }
    setBusy(true);
    const value = await getTokenBalance(token.address, holder.trim()).catch(() => null);
    setResult(value === null ? { value: null, error: 'The token contract did not answer.' } : { value });
    setBusy(false);
  };
  return (
    <form onSubmit={check} className="space-y-2">
      <label className="block text-xs font-bold text-slate-900">Balance of an address</label>
      <div className="flex gap-2">
        <input value={holder} onChange={(e) => { setHolder(e.target.value); setResult(null); }} placeholder="0x address" aria-label="Address"
          className="flex-1 min-w-0 bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs text-slate-900 focus:outline-none focus:border-petrol" />
        <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-petrol hover:bg-petrol-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60">
          {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Check
        </button>
      </div>
      {result && (result.error
        ? <p className="text-xs text-rose-700">{result.error}</p>
        : <p className="text-xs text-slate-700"><span className="font-mono font-bold text-slate-900">{formatTokenAmount(result.value, token.decimals, 8)} {token.symbol}</span> · {pct(share(result.value!, token.totalSupply))} of the supply, read live from the contract</p>)}
    </form>
  );
};

/** A BTS-20 token: supply, holders with their share, transfers and a live balance lookup. */
export const TokenView: React.FC<TokenViewProps> = ({ address, onBack, onSelectAddress, onSelectTx }) => {
  const [token, setToken] = useState<TokenInfo | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<'holders' | 'transfers'>('holders');
  const [top10, setTop10] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setToken(undefined); setFailed(false); setTop10(null); setTab('holders');
    getToken(address).then((t) => { if (active) setToken(t); }).catch(() => { if (active) { setToken(null); setFailed(true); } });
    return () => { active = false; };
  }, [address]);

  const back = (
    <button onClick={onBack} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold cursor-pointer shadow-xs">
      <ArrowLeft className="w-4 h-4 text-petrol" /> Back
    </button>
  );

  if (token === undefined) {
    return (
      <div className="space-y-5 w-full">
        {back}
        <div className="skeleton h-40 rounded-3xl" />
        <div className="skeleton h-96 rounded-3xl" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="space-y-5 w-full animate-fade-in">
        {back}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm text-sm text-slate-700 space-y-3">
          <p>{failed ? 'The token could not be loaded: neither the Bitnet explorer nor the contract answered.' : 'This address is not a BTS-20 token.'}</p>
          <button type="button" onClick={() => onSelectAddress(address)} className="text-petrol font-bold text-xs hover:underline cursor-pointer">Open it as an address</button>
        </div>
      </div>
    );
  }

  const stats: [string, string, string?][] = [
    ['Total supply', `${formatTokenAmount(token.totalSupply, token.decimals, 2)} ${token.symbol}`],
    ['Holders', token.holders === null ? '—' : token.holders.toLocaleString()],
    ['Transfers', token.transfers === null ? '—' : token.transfers.toLocaleString()],
    ['Top 10 holders', top10 === null ? '…' : pct(top10), 'of the supply'],
  ];

  return (
    <div className="space-y-5 sm:space-y-6 w-full animate-fade-in">
      {back}

      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-petrol-50 border border-petrol-100 text-petrol flex items-center justify-center font-black text-lg shrink-0">
              {token.symbol.replace(/[^A-Za-z0-9]/g, '').slice(0, 1).toUpperCase() || <Coins className="w-6 h-6" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">{token.name}</h1>
                <span className="px-2 py-0.5 rounded-md bg-petrol-50 border border-petrol-200 text-petrol text-xs font-bold">{token.symbol}</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-bold">BTS-20</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 min-w-0">
                <span className="font-mono text-xs text-slate-600 truncate">{token.address}</span>
                <button type="button" aria-label="Copy token address" onClick={() => navigator.clipboard.writeText(token.address).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {})} className="p-1 rounded text-slate-400 hover:text-petrol cursor-pointer shrink-0">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
          <button type="button" onClick={() => onSelectAddress(token.address)} className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:border-petrol hover:text-petrol cursor-pointer shrink-0">
            <FileCode className="w-4 h-4" /> Contract, code and Read / Write
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {stats.map(([label, value, note]) => (
            <div key={label} className="rounded-2xl bg-slate-50 border border-slate-200 px-3.5 py-3 min-w-0">
              <div className="text-[11px] text-slate-500 font-semibold">{label}</div>
              <div className="font-mono text-sm sm:text-base font-bold text-slate-900 break-words" title={value}>{value}</div>
              {note && <div className="text-[10px] text-slate-400">{note}</div>}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
          <span>Decimals: <span className="font-mono text-slate-700">{token.decimals}</span></span>
          <span>Exact supply: <span className="font-mono text-slate-700 break-all">{token.totalSupply === null ? '—' : ethers.formatUnits(token.totalSupply, token.decimals)}</span></span>
          {token.source === 'rpc' && <span className="text-amber-700">Read from the contract; the explorer index is not available, so holders and transfers may be missing.</span>}
        </div>

        <BalanceCheck token={token} />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b border-slate-100">
          {([['holders', 'Holders', Users, token.holders], ['transfers', 'Transfers', ArrowRightLeft, token.transfers]] as const).map(([id, label, Icon, count]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${tab === id ? 'bg-petrol text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
              {count !== null && <span className={`px-1.5 rounded-full text-[10px] ${tab === id ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>{count.toLocaleString()}</span>}
            </button>
          ))}
        </div>
        {tab === 'holders'
          ? <Holders token={token} onSelectAddress={onSelectAddress} onTop10={setTop10} />
          : <Transfers token={token} onSelectAddress={onSelectAddress} onSelectTx={onSelectTx} />}
      </div>
    </div>
  );
};
