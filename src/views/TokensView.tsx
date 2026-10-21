import React, { useEffect, useMemo, useState } from 'react';
import { Coins, Search, ExternalLink, Code, AlertTriangle } from 'lucide-react';
import { ethers } from 'ethers';
import { listAllTokens, formatTokenAmount, TokenSummary } from '../services/tokens';

interface TokensViewProps {
  onSelectToken: (address: string) => void;
}

export const TokensView: React.FC<TokensViewProps> = ({ onSelectToken }) => {
  const [query, setQuery] = useState('');
  const [tokens, setTokens] = useState<{ items: TokenSummary[]; complete: boolean } | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const standardsInfo = [
    {
      name: 'BTS-20',
      type: 'Fungible Token Standard',
      desc: 'Bitnet’s enhanced counterpart to ERC-20, powering decentralized tokens, payments, and utilities on the Bitnet L1 chain.',
      spec: 'BitnetMoney/contract-standards/blob/main/BTS-20/BTS-20.sol',
    },
    {
      name: 'BTS-21',
      type: 'Oracle & Managed Standard',
      desc: 'Token standard equipped with native oracle price feeds and security freeze controls for institutional compliance.',
      spec: 'BitnetMoney/contract-standards/blob/main/BTS-21/BTS-21.sol',
    },
    {
      name: 'BTS-HCE',
      type: 'High Compliance Environment',
      desc: 'Token standard engineered for strict financial transparency, customizable taxation, role-based controls, and whitelisting.',
      spec: 'BitnetMoney/contract-standards/blob/main/BTS-HCE/BTS-HCE.sol',
    },
  ];

  const load = () => {
    setState('loading');
    listAllTokens().then((r) => { setTokens(r); setState('ready'); }).catch(() => setState('error'));
  };
  useEffect(load, []);

  // Filters as you type (name, symbol or address); a full token address opens its page.
  const search = query.trim().toLowerCase();
  const items = useMemo(
    () => (tokens?.items ?? []).filter((t) => !search || t.name.toLowerCase().includes(search) || t.symbol.toLowerCase().includes(search) || t.address.toLowerCase().includes(search)),
    [tokens, search],
  );
  const rank = useMemo(() => new Map((tokens?.items ?? []).map((t, i) => [t.address, i + 1])), [tokens]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (ethers.isAddress(q)) onSelectToken(q);
    else if (items.length === 1) onSelectToken(items[0].address);
  };

  return (
    <div className="space-y-8 w-full animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 space-y-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-petrol-50 border border-petrol-100 flex items-center justify-center text-petrol shadow-xs">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">BTS-20 Tokens</h1>
              <p className="text-xs text-slate-500">Tokens on Bitnet with the most holders first, from the Bitnet explorer index.</p>
            </div>
          </div>
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Token name, symbol or contract address"
              aria-label="Search tokens"
              className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-petrol focus:ring-1 focus:ring-petrol"
            />
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-petrol hover:bg-petrol-600 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer">
              <Search className="w-4 h-4" /> Open
            </button>
          </form>
        </div>

        {state === 'loading' ? (
          <div className="p-4 space-y-2">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-11 rounded-lg" />)}</div>
        ) : state === 'error' ? (
          <div className="p-6 text-xs text-slate-600 flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> The Bitnet explorer did not answer.
            <button type="button" onClick={load} className="text-petrol font-bold hover:underline cursor-pointer">Try again</button>
          </div>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-xs text-slate-500">No token matches “{query.trim()}”. A contract address that is not in the index can still be opened with Open.</p>
        ) : (
          <div className="text-xs">
            <div className="hidden sm:grid grid-cols-[3rem_minmax(0,1fr)_14rem_7rem] gap-3 px-4 py-2.5 text-[11px] font-semibold text-slate-500 border-b border-slate-100">
              <span>#</span><span>Token</span><span className="text-right">Total supply</span><span className="text-right">Holders</span>
            </div>
            <div className="divide-y divide-slate-100">
              {items.map((t) => (
                <button
                  key={t.address}
                  type="button"
                  onClick={() => onSelectToken(t.address)}
                  className="w-full text-left grid grid-cols-[1.75rem_minmax(0,1fr)] sm:grid-cols-[3rem_minmax(0,1fr)_14rem_7rem] gap-x-3 gap-y-1 px-4 py-3 items-center hover:bg-slate-50 cursor-pointer"
                >
                  <span className="text-slate-500 font-mono">{rank.get(t.address)}</span>
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-xl bg-petrol-50 border border-petrol-100 text-petrol flex items-center justify-center font-black shrink-0">
                      {t.symbol.replace(/[^A-Za-z0-9]/g, '').slice(0, 1).toUpperCase() || '?'}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold text-slate-900 truncate">{t.name} <span className="text-slate-500 font-semibold">({t.symbol})</span></span>
                      <span className="block font-mono text-[11px] text-slate-500 truncate">{t.address}</span>
                    </span>
                  </span>
                  <span className="col-start-2 sm:col-start-auto sm:text-right font-mono text-slate-800 break-all">
                    <span className="sm:hidden text-slate-500 font-sans">Supply </span>{formatTokenAmount(t.totalSupply, t.decimals, 2)}
                    <span className="sm:hidden text-slate-500 font-sans"> · {t.holders === null ? '—' : t.holders.toLocaleString()} holders</span>
                  </span>
                  <span className="hidden sm:block text-right font-mono font-bold text-slate-900">{t.holders === null ? '—' : t.holders.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {tokens && !tokens.complete && (
          <p className="p-3 text-center text-[11px] text-slate-500 border-t border-slate-100">Showing the {tokens.items.length} tokens with the most holders.</p>
        )}
      </div>

      {/* Bitnet Token Standards Showcase */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Bitnet Token Standards</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {standardsInfo.map((std) => (
            <div
              key={std.name}
              className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between hover:border-slate-300 transition-all space-y-4 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-black text-lg text-terracotta">{std.name}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">Standard</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-2">{std.type}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{std.desc}</p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <a
                  href={`https://github.com/${std.spec}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-petrol hover:text-petrol-600 font-bold"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>View Solidity Source</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
