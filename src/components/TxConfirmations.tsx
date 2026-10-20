import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { rpcService } from '../services/rpc';
import { isPageHidden } from '../services/pageVisibility';
import { loadMinerSample } from '../services/minerSample';
import { concentration, confirmationsFor } from '../services/security';
import { getAddressLabel } from '../services/addressLabels';

interface Guidance {
  recommended: number;
  guardShare: number;
  topShare: number;
  topName: string;
}

/**
 * Confirmation count for a mined transaction, refreshed every 15 s, compared with the
 * number of blocks after which a reversal by any miner except a majority miner is below 0.1%
 * (from the miner shares of the last 200 blocks).
 */
export const TxConfirmations: React.FC<{ blockNumber: number; onNavigate?: (view: string) => void }> = ({ blockNumber, onNavigate }) => {
  const [head, setHead] = useState<number | null>(null);
  const [guide, setGuide] = useState<Guidance | null>(null);

  useEffect(() => {
    let active = true;
    const tick = () => {
      if (isPageHidden()) return;
      rpcService.getBlockNumber().then((n) => { if (active) setHead(n); }).catch(() => {});
    };
    tick();
    const timer = setInterval(tick, 15000);
    loadMinerSample()
      .then((blocks) => {
        const counts: Record<string, number> = {};
        for (const b of blocks) counts[b.miner.toLowerCase()] = (counts[b.miner.toLowerCase()] || 0) + 1;
        const c = concentration(counts);
        const top = c.miners[0];
        if (!top) return;
        // A majority miner cannot be guarded against; protect against everyone else.
        const guardShare = top.share > 0.5 ? (c.miners[1]?.share ?? 0) : top.share;
        const recommended = Math.max(1, confirmationsFor(guardShare) ?? 1);
        if (active) setGuide({ recommended, guardShare, topShare: top.share, topName: getAddressLabel(top.address)?.name || 'the largest miner' });
      })
      .catch(() => {});
    return () => { active = false; clearInterval(timer); };
  }, []);

  if (head === null) return <span className="text-xs text-slate-500">…</span>;
  const confirmations = Math.max(0, head - blockNumber + 1);
  const enough = guide ? confirmations >= guide.recommended : null;

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
          enough === false ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {enough === false ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          {confirmations.toLocaleString()} {confirmations === 1 ? 'confirmation' : 'confirmations'}
        </span>
        {guide && enough === false && (
          <span className="text-xs text-slate-600">{guide.recommended - confirmations} more for the recommended {guide.recommended}</span>
        )}
      </div>
      {guide && enough === false && (
        <div className="h-1.5 w-full max-w-xs rounded-full bg-amber-100 overflow-hidden">
          <div className="h-full rounded-full bg-amber-500" style={{ width: `${(confirmations / guide.recommended) * 100}%` }} />
        </div>
      )}
      {guide && (
        <p className="text-[11px] text-slate-500 leading-relaxed">
          After {guide.recommended} blocks a miner with {(guide.guardShare * 100).toFixed(1)}% of the hashrate has under a 0.1% chance of reversing it.
          {guide.topShare > 0.5 && (
            <>
              {' '}
              <span className="inline-flex items-center gap-1 text-amber-800"><AlertTriangle className="w-3 h-3" />{guide.topName} mines {(guide.topShare * 100).toFixed(0)}% of blocks and is not covered by any count.</span>
            </>
          )}
          {onNavigate && (
            <>
              {' '}
              <button onClick={() => onNavigate('security')} className="text-petrol font-semibold hover:underline cursor-pointer">Chain security</button>
            </>
          )}
        </p>
      )}
    </div>
  );
};
