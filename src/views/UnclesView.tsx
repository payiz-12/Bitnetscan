import React, { useEffect, useMemo, useState } from 'react';
import { GitBranch, RefreshCw, Clock, LineChart as LineChartIcon } from 'lucide-react';
import { loadRecentScan, getCachedRecentScan, RecentScan, weiToBtn, RECENT_SCAN_BLOCKS } from '../services/chainScan';
import { AddressTag } from '../components/AddressTag';
import { getAddressLabel } from '../services/addressLabels';
import { isPageHidden } from '../services/pageVisibility';

interface UnclesViewProps {
  onSelectBlock: (n: number) => void;
  onSelectAddress: (address: string) => void;
  onNavigate: (view: string) => void;
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const ago = (ts: number) => {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - ts));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ago`;
};
const btn = (v: number) => `${v.toLocaleString('en-US', { maximumFractionDigits: 5 })} BTN`;

export const UnclesView: React.FC<UnclesViewProps> = ({ onSelectBlock, onSelectAddress, onNavigate }) => {
  const [scan, setScan] = useState<RecentScan | null>(() => getCachedRecentScan());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(50);

  const refresh = (force = false) => {
    setLoading(true);
    setError(null);
    loadRecentScan(force ? 0 : 120000)
      .then(setScan)
      .catch(() => setError('Could not read the recent blocks from the RPC.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    const timer = setInterval(() => { if (!isPageHidden()) refresh(); }, 120000);
    return () => clearInterval(timer);
  }, []);

  const stats = useMemo(() => {
    if (!scan) return null;
    const blocks = scan.to - scan.from + 1;
    const hours = (scan.endTimestamp - scan.startTimestamp) / 3600;
    const byMiner = new Map<string, { blocks: number; uncles: number; rewardWei: bigint; included: number }>();
    const row = (m: string) => {
      let r = byMiner.get(m);
      if (!r) { r = { blocks: 0, uncles: 0, rewardWei: 0n, included: 0 }; byMiner.set(m, r); }
      return r;
    };
    for (const b of scan.blocks) {
      const r = row(b.miner.toLowerCase());
      r.blocks += 1;
      r.included += b.uncles.length;
    }
    for (const u of scan.uncles) {
      const r = row(u.miner);
      r.uncles += 1;
      r.rewardWei += u.rewardWei;
    }
    const depths = scan.uncles.reduce((s, u) => s + u.depth, 0);
    return {
      blocks,
      hours,
      uncleRate: scan.uncles.length / blocks,
      avgDepth: scan.uncles.length ? depths / scan.uncles.length : 0,
      miners: [...byMiner.entries()]
        .map(([miner, r]) => ({ miner, ...r, staleShare: r.uncles / (r.blocks + r.uncles) }))
        .sort((a, b) => b.blocks + b.uncles - (a.blocks + a.uncles)),
    };
  }, [scan]);

  const tiles = stats && scan ? [
    { label: 'Uncle rate', value: `${(stats.uncleRate * 100).toFixed(1)}%`, note: 'uncles per block' },
    { label: 'Uncles found', value: scan.uncles.length.toLocaleString(), note: `in ${stats.blocks.toLocaleString()} blocks` },
    { label: 'Paid to uncle miners', value: btn(weiToBtn(scan.uncleRewardsWei)), note: '(8 − depth) / 8 BTN each' },
    { label: 'Average depth', value: stats.avgDepth.toFixed(2), note: 'blocks behind the nephew' },
  ] : [];

  return (
    <div className="space-y-5 sm:space-y-6 w-full animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Uncle Blocks</h1>
              <p className="text-xs sm:text-sm text-slate-500">
                {scan && stats
                  ? `Last ${stats.blocks.toLocaleString()} blocks (#${scan.from.toLocaleString()}–#${scan.to.toLocaleString()}, ${stats.hours.toFixed(1)} h), read over RPC.`
                  : `Last ${RECENT_SCAN_BLOCKS.toLocaleString()} blocks, read over RPC.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onNavigate('charts')} className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
              <LineChartIcon className="w-3.5 h-3.5" /> History
            </button>
            <button onClick={() => refresh(true)} disabled={loading} className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#016976]' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          An uncle is a valid block that lost the race to another block at the same height. Bitnet still pays for it when a later
          block includes it: the uncle miner gets (8 − depth) / 8 BTN and the including miner gets 1/32 BTN extra. A high uncle
          rate means blocks are reaching miners late.
        </p>

        {tiles.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {tiles.map((t) => (
              <div key={t.label} className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 min-w-0">
                <span className="text-[11px] text-slate-500 font-semibold block">{t.label}</span>
                <span className="text-lg sm:text-xl font-black text-slate-900 block truncate">{t.value}</span>
                <span className="text-[11px] text-slate-500">{t.note}</span>
              </div>
            ))}
          </div>
        )}
        {error && <div role="alert" className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">{error}</div>}
      </div>

      {!scan ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 shadow-sm flex flex-col items-center gap-3 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin text-[#016976]" />
          <span className="text-xs font-semibold">Reading blocks and uncles…</span>
        </div>
      ) : (
        <>
          <section className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">By miner</h2>
            <p className="text-xs text-slate-500 mb-3">Uncle share = uncles ÷ (blocks + uncles) the miner produced in this window.</p>
            <div className="divide-y divide-slate-100 sm:hidden">
              {stats!.miners.map((m) => (
                <div key={m.miner} onClick={() => onSelectAddress(m.miner)} className="py-3 space-y-1.5 cursor-pointer hover:bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-xs font-bold text-[#016976]">{short(m.miner)}</span>
                      <AddressTag address={m.miner} />
                    </span>
                    <span className="text-xs font-bold text-slate-900 shrink-0">{(m.staleShare * 100).toFixed(1)}% uncles</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {m.blocks.toLocaleString()} blocks · {m.uncles.toLocaleString()} uncles · {btn(weiToBtn(m.rewardWei))}
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-3">Miner</th>
                    <th className="py-3 px-3 text-right">Blocks</th>
                    <th className="py-3 px-3 text-right">Uncles</th>
                    <th className="py-3 px-3 text-right">Uncle share</th>
                    <th className="py-3 px-3 text-right">Uncles included</th>
                    <th className="py-3 px-3 text-right">Uncle rewards</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats!.miners.map((m) => (
                    <tr key={m.miner} onClick={() => onSelectAddress(m.miner)} className="hover:bg-slate-50 cursor-pointer">
                      <td className="py-3 px-3">
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-[#016976]" title={m.miner}>{short(m.miner)}</span>
                          <AddressTag address={m.miner} />
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-900">{m.blocks.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right text-slate-900">{m.uncles.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">{(m.staleShare * 100).toFixed(1)}%</td>
                      <td className="py-3 px-3 text-right text-slate-600">{m.included.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right text-slate-900 whitespace-nowrap">{btn(weiToBtn(m.rewardWei))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Recent uncles</h2>
            <p className="text-xs text-slate-500 mb-3">{scan.uncles.length.toLocaleString()} uncles, newest first.</p>
            {scan.uncles.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">No uncles in this window.</p>
            ) : (
              <>
                <div className="divide-y divide-slate-100 sm:hidden">
                  {scan.uncles.slice(0, shown).map((u) => (
                    <div key={u.hash} className="py-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                        <GitBranch className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-sm text-slate-900">#{u.number.toLocaleString()}</span>
                          <span className="font-mono font-bold text-xs text-emerald-700 shrink-0">{btn(weiToBtn(u.rewardWei))}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
                          <button onClick={() => onSelectAddress(u.miner)} className="truncate text-[#016976] font-semibold cursor-pointer">
                            {getAddressLabel(u.miner)?.name || short(u.miner)}
                          </button>
                          <span className="shrink-0 flex items-center gap-1">
                            <button onClick={() => onSelectBlock(u.includedIn)} className="text-slate-700 font-semibold cursor-pointer hover:underline">
                              in #{u.includedIn.toLocaleString()}
                            </button>
                            <span className="text-slate-300">·</span>
                            <Clock className="w-3 h-3 text-slate-400" />
                            {ago(u.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-3 px-3">Uncle height</th>
                        <th className="py-3 px-3">Uncle hash</th>
                        <th className="py-3 px-3">Uncle miner</th>
                        <th className="py-3 px-3">Included in</th>
                        <th className="py-3 px-3 text-right">Depth</th>
                        <th className="py-3 px-3 text-right">Reward</th>
                        <th className="py-3 px-3 text-right">Age</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {scan.uncles.slice(0, shown).map((u) => (
                        <tr key={u.hash} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-bold text-slate-900">#{u.number.toLocaleString()}</td>
                          <td className="py-3 px-3 text-slate-500" title={u.hash}>{u.hash.slice(0, 10)}…{u.hash.slice(-6)}</td>
                          <td className="py-3 px-3">
                            <button onClick={() => onSelectAddress(u.miner)} className="flex items-center gap-2 cursor-pointer">
                              <span className="font-bold text-[#016976] hover:underline">{short(u.miner)}</span>
                              <AddressTag address={u.miner} />
                            </button>
                          </td>
                          <td className="py-3 px-3">
                            <button onClick={() => onSelectBlock(u.includedIn)} className="font-bold text-[#016976] hover:underline cursor-pointer">
                              #{u.includedIn.toLocaleString()}
                            </button>
                          </td>
                          <td className="py-3 px-3 text-right text-slate-900">{u.depth}</td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">{btn(weiToBtn(u.rewardWei))}</td>
                          <td className="py-3 px-3 text-right text-slate-500 whitespace-nowrap">{ago(u.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {shown < scan.uncles.length && (
                  <button onClick={() => setShown((n) => n + 50)} className="mt-3 w-full py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
                    Show more ({(scan.uncles.length - shown).toLocaleString()} left)
                  </button>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
};
