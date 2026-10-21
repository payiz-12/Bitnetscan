import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, RefreshCw, AlertTriangle, GitMerge, Coins, Image as ImageIcon, Info } from 'lucide-react';
import { ethers } from 'ethers';
import { getAddressTokenTransfers, getAddressInternalTransactions, tokenMeta, ChainTokenTransfer, TokenMeta, InternalScan } from '../services/addressActivity';
import { formatTokenAmount } from '../services/tokens';
import { AddressTag } from './AddressTag';

interface TabProps {
  address: string;
  onSelectAddress: (a: string) => void;
  onSelectTx: (hash: string) => void;
  onSelectToken?: (a: string) => void;
}

const PAGE = 50;
const short = (a: string, head = 8, tail = 6) => (a.length > head + tail + 1 ? `${a.slice(0, head)}…${a.slice(-tail)}` : a);
const ago = (ts: number | null) => {
  if (!ts) return '';
  const s = Math.max(0, Math.floor(Date.now() / 1000) - ts);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 365) return `${Math.floor(s / 86400)}d ago`;
  return `${(s / (86400 * 365)).toFixed(1)}y ago`;
};

const Direction: React.FC<{ from: string; to: string; me: string }> = ({ from, to, me }) => {
  const m = me.toLowerCase();
  const out = from.toLowerCase() === m;
  const inn = to.toLowerCase() === m;
  if (out && inn) return <span className="w-10 text-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">SELF</span>;
  return out
    ? <span className="w-10 text-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center justify-center gap-0.5"><ArrowUpRight className="w-3 h-3" />OUT</span>
    : <span className="w-10 text-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center justify-center gap-0.5"><ArrowDownLeft className="w-3 h-3" />IN</span>;
};

const Counterparty: React.FC<{ from: string; to: string; me: string; onSelectAddress: (a: string) => void }> = ({ from, to, me, onSelectAddress }) => {
  const other = from.toLowerCase() === me.toLowerCase() ? to : from;
  const mint = /^0x0{40}$/i.test(from);
  const burn = /^0x0{40}$/i.test(to);
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span className="text-[11px] text-slate-500 shrink-0">{from.toLowerCase() === me.toLowerCase() ? 'to' : 'from'}</span>
      {mint ? <span className="text-[11px] font-bold text-emerald-700">Mint</span>
        : burn && from.toLowerCase() === me.toLowerCase() ? <span className="text-[11px] font-bold text-rose-700">Burn</span>
        : (
          <>
            <button type="button" onClick={() => onSelectAddress(other)} className="font-mono text-xs text-petrol hover:underline cursor-pointer truncate" title={other}>{short(other)}</button>
            <AddressTag address={other} />
          </>
        )}
    </span>
  );
};

const Notice: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="px-4 py-3 text-[11px] text-slate-500 flex items-start gap-1.5 border-t border-slate-100"><Info className="w-3.5 h-3.5 shrink-0 mt-px" /> <span>{children}</span></p>
);

/** BTS-20 and NFT transfers of the address, from the chain's Transfer events. */
export const TokenTransfersTab: React.FC<TabProps> = ({ address, onSelectAddress, onSelectTx, onSelectToken }) => {
  const [items, setItems] = useState<ChainTokenTransfer[] | null>(null);
  const [meta, setMeta] = useState<Map<string, TokenMeta>>(new Map());
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<'all' | 'BTS-20' | 'BTS-721'>('all');
  const [shown, setShown] = useState(PAGE);

  const load = () => {
    setItems(null); setError(false); setShown(PAGE);
    getAddressTokenTransfers(address)
      .then(async (list) => { setMeta(await tokenMeta(list.map((t) => t.token))); setItems(list); })
      .catch(() => setError(true));
  };
  useEffect(load, [address]);

  const filtered = useMemo(() => (items ?? []).filter((t) => filter === 'all' || t.standard === filter), [items, filter]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-petrol-50 border border-petrol-100 flex items-center justify-center text-petrol shrink-0"><ArrowRightLeft className="w-5 h-5" /></div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Token Transfers</h3>
            <p className="text-xs text-slate-500">Every BTS-20 and NFT transfer event that names this address, read from the chain.</p>
          </div>
        </div>
        {items && items.length > 0 && (
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 self-start">
            {([['all', `All (${items.length})`], ['BTS-20', 'BTS-20'], ['BTS-721', 'NFT']] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => { setFilter(id); setShown(PAGE); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${filter === id ? 'bg-petrol text-white' : 'text-slate-600 hover:text-slate-900'}`}>{label}</button>
            ))}
          </div>
        )}
      </div>

      {error ? (
        <div className="p-6 text-xs text-slate-600 flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" /> The Bitnet RPC did not answer the log query.
          <button type="button" onClick={load} className="text-petrol font-bold hover:underline cursor-pointer">Try again</button>
        </div>
      ) : items === null ? (
        <div className="p-4 space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="p-6 text-center text-xs text-slate-500">No token transfers to or from this address.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {filtered.slice(0, shown).map((t) => {
            const m = meta.get(t.token.toLowerCase());
            const nft = t.standard === 'BTS-721';
            return (
              <div key={`${t.txHash}-${t.logIndex}`} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 hover:bg-slate-50">
                <div className="sm:w-44 shrink-0">
                  <button type="button" onClick={() => onSelectTx(t.txHash)} className="font-mono text-xs text-petrol hover:underline cursor-pointer">{short(t.txHash, 10, 6)}</button>
                  <div className="text-[11px] text-slate-500">{ago(t.timestamp)} · #{t.blockNumber.toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Direction from={t.from} to={t.to} me={address} />
                  <Counterparty from={t.from} to={t.to} me={address} onSelectAddress={onSelectAddress} />
                </div>
                <div className="flex items-center gap-2 sm:justify-end min-w-0">
                  <span className="font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                    {nft ? `#${t.value.toString().length > 12 ? short(t.value.toString(), 6, 4) : t.value.toString()}` : m?.decimals != null ? formatTokenAmount(t.value, m.decimals) : t.value.toString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => (nft || !onSelectToken ? onSelectAddress(t.token) : onSelectToken(t.token))}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-petrol-50 border border-petrol-100 text-petrol text-[11px] font-bold hover:border-petrol cursor-pointer max-w-[10rem] truncate"
                    title={`${m?.name ?? 'Token'} · ${t.token}`}
                  >
                    {nft ? <ImageIcon className="w-3 h-3 shrink-0" /> : <Coins className="w-3 h-3 shrink-0" />}
                    <span className="truncate">{m?.symbol ?? short(t.token, 6, 4)}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {items && filtered.length > shown && (
        <div className="p-3 flex justify-center border-t border-slate-100">
          <button type="button" onClick={() => setShown((n) => n + PAGE)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:border-petrol hover:text-petrol cursor-pointer">Show more</button>
        </div>
      )}
      {items && <Notice>Read with eth_getLogs over all blocks of the chain. Amounts use the decimals the token contract reports.</Notice>}
    </div>
  );
};

/** BTN moved to or from the address inside other transactions, found and traced on the chain. */
export const InternalTxsTab: React.FC<TabProps> = ({ address, onSelectAddress, onSelectTx }) => {
  const [scan, setScan] = useState<InternalScan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ p: number; label: string }>({ p: 0, label: 'Starting' });
  const [shown, setShown] = useState(PAGE);

  const load = () => {
    let active = true;
    setScan(null); setError(null); setShown(PAGE); setProgress({ p: 0, label: 'Starting' });
    getAddressInternalTransactions(address, (p, label) => { if (active) setProgress({ p, label }); })
      .then((r) => { if (active) setScan(r); })
      .catch((e) => { if (active) setError(e?.message || 'The scan failed'); });
    return () => { active = false; };
  };
  useEffect(load, [address]);

  const total = useMemo(() => {
    if (!scan) return { in: 0n, out: 0n };
    const me = address.toLowerCase();
    return scan.items.filter((t) => !t.failed).reduce((s, t) => ({
      in: s.in + (t.to.toLowerCase() === me ? t.value : 0n),
      out: s.out + (t.from.toLowerCase() === me ? t.value : 0n),
    }), { in: 0n, out: 0n });
  }, [scan, address]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-petrol-50 border border-petrol-100 flex items-center justify-center text-petrol shrink-0"><GitMerge className="w-5 h-5" /></div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Internal Transactions</h3>
            <p className="text-xs text-slate-500">BTN moved to or from this address by contracts, found in the chain's call traces.</p>
          </div>
        </div>
        {scan && scan.items.length > 0 && (
          <div className="text-xs font-mono text-slate-600 sm:text-right">
            {(total.in > 0n || total.out === 0n) && <div><span className="text-emerald-700 font-bold">+{ethers.formatEther(total.in)}</span> BTN in</div>}
            {total.out > 0n && <div><span className="text-amber-700 font-bold">-{ethers.formatEther(total.out)}</span> BTN out</div>}
          </div>
        )}
      </div>

      {error ? (
        <div className="p-6 text-xs text-slate-600 flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" /> {error}.
          <button type="button" onClick={load} className="text-petrol font-bold hover:underline cursor-pointer">Try again</button>
        </div>
      ) : !scan ? (
        <div className="p-5 space-y-2" role="status">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 animate-spin text-petrol" /> {progress.label}</span>
            <span className="font-mono">{Math.round(progress.p * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-petrol rounded-full transition-[width] duration-300" style={{ width: `${Math.max(3, progress.p * 100)}%` }} /></div>
        </div>
      ) : scan.items.length === 0 ? (
        <p className="p-6 text-center text-xs text-slate-500">No internal BTN transfers to or from this address.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {scan.items.slice(0, shown).map((t, i) => (
            <div key={`${t.txHash}-${i}`} className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 hover:bg-slate-50 ${t.failed ? 'opacity-60' : ''}`}>
              <div className="sm:w-44 shrink-0">
                <button type="button" onClick={() => onSelectTx(t.txHash)} className="font-mono text-xs text-petrol hover:underline cursor-pointer">{short(t.txHash, 10, 6)}</button>
                <div className="text-[11px] text-slate-500">{ago(t.timestamp)} · #{t.blockNumber.toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                <Direction from={t.from} to={t.to} me={address} />
                <Counterparty from={t.from} to={t.to} me={address} onSelectAddress={onSelectAddress} />
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{t.type}</span>
                {t.failed && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">Reverted</span>}
              </div>
              <div className="font-mono text-xs font-bold text-slate-900 sm:text-right whitespace-nowrap">{ethers.formatEther(t.value)} BTN</div>
            </div>
          ))}
        </div>
      )}
      {scan && scan.items.length > shown && (
        <div className="p-3 flex justify-center border-t border-slate-100">
          <button type="button" onClick={() => setShown((n) => n + PAGE)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:border-petrol hover:text-petrol cursor-pointer">Show more</button>
        </div>
      )}
      {scan && (
        <Notice>
          {scan.method === 'state'
            ? <>Found by comparing this wallet's balance and nonce across all blocks on the archive node, then tracing the {scan.checkedTransactions.toLocaleString()} contract {scan.checkedTransactions === 1 ? 'call' : 'calls'} in the blocks where they changed. {scan.complete ? 'Every change in the wallet’s history was checked.' : 'This wallet changes too often for a full scan in the browser; the most recent changes were checked.'}</>
            : <>Found through the events this contract emitted or that name it: the newest {scan.checkedTransactions.toLocaleString()} such transactions were traced{scan.complete ? '' : ' (older ones are not listed)'}. A transfer inside a transaction without such an event is not listed.</>}
        </Notice>
      )}
    </div>
  );
};
