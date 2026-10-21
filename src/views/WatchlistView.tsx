import React, { useEffect, useRef, useState } from 'react';
import { Star, Bell, BellOff, Trash2, Download, Upload, Plus } from 'lucide-react';
import { ethers } from 'ethers';
import {
  useWatchlist, addWatch, removeWatch, updateWatch, markEventsSeen, clearWatchEvents,
  exportWatchlist, importWatchlist, formatBtnDelta, checkWatchlist,
} from '../services/watchlist';
import { AddressTag } from '../components/AddressTag';

interface WatchlistViewProps {
  onSelectAddress: (a: string) => void;
  onSelectBlock: (n: number) => void;
}

const ago = (ms: number) => {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
const btn = (wei: string | null) => (wei === null ? '…' : `${Number(ethers.formatEther(BigInt(wei))).toLocaleString('en-US', { maximumFractionDigits: 4 })} BTN`);

const Permission: React.FC = () => {
  const supported = typeof Notification !== 'undefined';
  const [state, setState] = useState<NotificationPermission | 'unsupported'>(supported ? Notification.permission : 'unsupported');
  if (state === 'unsupported') return <p className="text-xs text-slate-500">This browser cannot show notifications; changes still appear here and as notices in the page.</p>;
  if (state === 'granted') return <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5"><Bell className="w-3.5 h-3.5" /> Notifications are on.</p>;
  if (state === 'denied') return <p className="text-xs text-slate-500 flex items-center gap-1.5"><BellOff className="w-3.5 h-3.5" /> Notifications are blocked for this site in your browser settings.</p>;
  return (
    <button
      type="button"
      onClick={() => Notification.requestPermission().then(setState).catch(() => {})}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-petrol hover:bg-petrol-600 text-white text-xs font-bold cursor-pointer"
    >
      <Bell className="w-3.5 h-3.5" /> Turn on notifications
    </button>
  );
};

export const WatchlistView: React.FC<WatchlistViewProps> = ({ onSelectAddress, onSelectBlock }) => {
  const { list, events } = useWatchlist();
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    markEventsSeen();
    checkWatchlist().catch(() => {});
  }, []);
  useEffect(() => { if (events.length) markEventsSeen(); }, [events.length]);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const a = address.trim();
    if (!ethers.isAddress(a)) { setMessage('Enter a valid 0x address.'); return; }
    if (list.length >= 50) { setMessage('The watchlist holds up to 50 addresses.'); return; }
    if (!addWatch(a, name)) { setMessage('This address is already on the watchlist.'); return; }
    setAddress(''); setName(''); setMessage(null);
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportWatchlist()], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bitnetscan-watchlist.json';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const added = importWatchlist(await file.text());
      setMessage(`Imported ${added} new ${added === 1 ? 'address' : 'addresses'}.`);
    } catch {
      setMessage('That file is not a BitnetScan watchlist backup.');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-5 sm:space-y-6 w-full animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Watchlist</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Saved in this browser only, no account. While BitnetScan is open, even in a background tab, watched addresses are checked every 30–60 s.
            </p>
          </div>
        </div>
        <Permission />
        <p className="text-[11px] text-slate-500">Notifications for one address come at most every 10 minutes, with the changes in between added up, so pool and miner addresses do not alert on every block.</p>

        <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-[1fr_200px_auto] gap-2">
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x address to watch" aria-label="Address to watch"
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:border-petrol" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" aria-label="Name" maxLength={40}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-petrol" />
          <button type="submit" className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-petrol hover:bg-petrol-600 text-white text-xs font-bold cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </form>
        {message && <p className="text-xs text-slate-700">{message}</p>}
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-base font-bold text-slate-900">Watched addresses <span className="text-slate-400 font-semibold">{list.length}/50</span></h2>
          <div className="flex items-center gap-2">
            <button type="button" onClick={download} disabled={list.length === 0} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:border-petrol hover:text-petrol cursor-pointer disabled:opacity-50">
              <Download className="w-3.5 h-3.5" /> Backup
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:border-petrol hover:text-petrol cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> Restore
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          </div>
        </div>
        {list.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">No addresses yet. Add one above, or press Watch on any address page.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {list.map((w) => (
              <div key={w.address} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <input
                    defaultValue={w.name}
                    placeholder="Add a name"
                    aria-label={`Name for ${w.address}`}
                    maxLength={40}
                    onBlur={(e) => e.target.value !== w.name && updateWatch(w.address, { name: e.target.value })}
                    className="w-full max-w-xs bg-transparent border-b border-transparent hover:border-slate-200 focus:border-petrol focus:outline-none text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
                  />
                  <div className="flex items-center gap-1.5 min-w-0">
                    <button type="button" onClick={() => onSelectAddress(w.address)} className="font-mono text-xs text-petrol hover:underline cursor-pointer truncate">{w.address}</button>
                    <AddressTag address={w.address} />
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="text-left sm:text-right">
                    <div className="font-mono text-sm font-bold text-slate-900">{btn(w.balanceWei)}</div>
                    <div className="text-[11px] text-slate-500">{w.nonce !== null ? `${w.nonce.toLocaleString()} sent · ` : ''}{w.checkedAt ? `checked ${ago(w.checkedAt)}` : 'checking…'}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => updateWatch(w.address, { notify: !w.notify })} aria-pressed={w.notify}
                      title={w.notify ? 'Notifications on for this address' : 'Notifications off for this address'}
                      className={`p-2 rounded-xl border cursor-pointer ${w.notify ? 'border-petrol-200 bg-petrol-50 text-petrol' : 'border-slate-200 text-slate-400'}`}>
                      {w.notify ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                    </button>
                    <button type="button" onClick={() => removeWatch(w.address)} title="Remove from watchlist"
                      className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-base font-bold text-slate-900">Recent changes</h2>
          {events.length > 0 && (
            <button type="button" onClick={clearWatchEvents} className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">Clear</button>
          )}
        </div>
        {events.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">Balance and nonce changes of watched addresses will appear here.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {events.slice(0, 50).map((e) => {
              const delta = BigInt(e.deltaWei);
              return (
                <div key={e.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <button type="button" onClick={() => onSelectAddress(e.address)} className="font-bold text-slate-900 hover:text-petrol cursor-pointer truncate block max-w-full text-left">
                      {e.name || `${e.address.slice(0, 6)}…${e.address.slice(-4)}`}
                    </button>
                    <span className="text-slate-500">
                      {ago(e.at)}{e.block ? <> · <button type="button" onClick={() => onSelectBlock(e.block!)} className="hover:underline cursor-pointer">block #{e.block.toLocaleString()}</button></> : null}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    {delta !== 0n && <div className={`font-mono font-bold ${delta > 0n ? 'text-emerald-700' : 'text-rose-700'}`}>{formatBtnDelta(delta)}</div>}
                    {e.sent > 0 && <div className="text-slate-500">{e.sent} sent {e.sent === 1 ? 'transaction' : 'transactions'}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
