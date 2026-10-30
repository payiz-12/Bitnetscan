import React, { useEffect, useState } from 'react';
import { History, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { StaleDataNotice } from './StaleDataNotice';

type Check = [number, number | null, number | null];
interface StatusData {
  services: string[];
  samples: [number, Check[]][];
}

const SERVICES: Record<string, { name: string; host: string }> = {
  'rpc-org': { name: 'Bitnet RPC', host: 'rpc.bitnetmoney.org' },
  'rpc-com': { name: 'Bitnet RPC', host: 'rpc.bitnetmoney.com' },
  'bitnetscan-rpc': { name: 'BitnetScan RPC proxy', host: 'bitnetscan.vercel.app/api/rpc' },
  'explorer-com': { name: 'Bitnet explorer', host: 'explorer.bitnetmoney.com' },
  'explorer-org': { name: 'Bitnet explorer', host: 'explorer.bitnetmoney.org' },
  gtpool: { name: 'GTPool', host: 'gtpool.io' },
  coolpool: { name: 'CoolPool', host: 'coolpool.top' },
};
/** More blocks than this behind the highest RPC head of the same check counts as behind. */
const BEHIND = 20;
const HOURS = 168;
// Status colors (reserved for state; always shown with an icon and a label).
const COLORS = { up: '#0ca30c', behind: '#fab219', down: '#d03b3b' } as const;
type State = keyof typeof COLORS;
const LABEL: Record<State, string> = { up: 'Up', behind: 'Behind', down: 'Down' };

const hourLabel = (ts: number) => new Date(ts * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });

/** State of service `i` in one check: down when it did not answer, behind when far from the RPC head. */
function stateOf(checks: Check[], ids: string[], i: number): State {
  const [ok, block] = checks[i];
  if (!ok) return 'down';
  if (block === null) return 'up';
  const head = Math.max(0, ...ids.map((id, j) => (id.includes('rpc') && checks[j][0] ? checks[j][1] ?? 0 : 0)));
  return head - block > BEHIND ? 'behind' : 'up';
}

const StateBadge: React.FC<{ state: State }> = ({ state }) => {
  const Icon = state === 'up' ? CheckCircle2 : state === 'behind' ? AlertTriangle : XCircle;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
      <Icon className="w-3.5 h-3.5" style={{ color: COLORS[state] }} /> {LABEL[state]}
    </span>
  );
};

/**
 * Hourly checks of the RPC nodes, explorers and pools over the last 7 days (uptime over 30 days),
 * made by BitnetScan's hourly job; complements the live check above, which runs from the browser.
 */
export const StatusHistory: React.FC = () => {
  const [data, setData] = useState<StatusData | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/network-status', { signal: AbortSignal.timeout(20000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active && d?.samples?.length) setData(d); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (!data) return null;

  const now = Math.floor(Date.now() / 1000);
  const firstHour = Math.floor(now / 3600) * 3600 - (HOURS - 1) * 3600;
  const last = data.samples[data.samples.length - 1];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-1">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><History className="w-4 h-4 text-petrol" /> Last 7 days</h3>
        <p className="text-xs text-slate-500">
          Checked every hour by BitnetScan from GitHub Actions servers (last check {hourLabel(last[0])} UTC). A service is behind when it reports a block more than {BEHIND} blocks below the highest RPC head of the same check. Uptime counts the checks of the last 30 days.
        </p>
        <StaleDataNotice at={last[0]} what="these checks" />
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
          {(Object.keys(COLORS) as State[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[s] }} /> {LABEL[s]}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-xs text-slate-600"><span className="w-2.5 h-2.5 rounded-sm bg-slate-200" /> No check</span>
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {data.services.map((id, i) => {
          const meta = SERVICES[id] ?? { name: id, host: '' };
          const states = data.samples.map(([at, checks]) => ({ at, checks, state: stateOf(checks, data.services, i) }));
          const uptime = states.filter((s) => s.state === 'up').length / states.length;
          const week = states.filter((s) => s.at >= firstHour);
          const times = week.map((s) => s.checks[i][2]).filter((v): v is number => v !== null).sort((a, b) => a - b);
          const median = times.length ? times[Math.floor(times.length / 2)] : null;
          const slots: (typeof states[number] | null)[] = new Array(HOURS).fill(null);
          for (const s of week) slots[Math.min(HOURS - 1, Math.floor((s.at - firstHour) / 3600))] = s;
          return (
            <div key={id} className="p-4 space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="min-w-0">
                  <span className="font-bold text-slate-900 text-sm">{meta.name}</span>
                  <span className="ml-2 font-mono text-[11px] text-slate-500">{meta.host}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <span>{(uptime * 100).toFixed(uptime === 1 ? 0 : 1)}% up</span>
                  {median !== null && <span>median {median} ms</span>}
                  <StateBadge state={states[states.length - 1].state} />
                </div>
              </div>
              {/* One unit per hour, no gaps, so 168 hours fit a phone. */}
              <svg viewBox={`0 0 ${HOURS} 1`} preserveAspectRatio="none" className="w-full h-6 rounded-sm" role="img" aria-label={`${meta.name} ${meta.host}: hourly checks over the last 7 days, ${(uptime * 100).toFixed(1)}% up over 30 days`}>
                {slots.map((s, h) => (
                  <rect key={h} x={h} y={0} width={1} height={1} fill={s ? COLORS[s.state] : 'var(--chart-grid)'} shapeRendering="crispEdges">
                    <title>{s ? `${hourLabel(s.at)} UTC · ${LABEL[s.state]}${s.checks[i][1] !== null ? ` · block #${s.checks[i][1]!.toLocaleString()}` : ''}${s.checks[i][2] !== null ? ` · ${s.checks[i][2]} ms` : ''}` : `${hourLabel(firstHour + h * 3600)} UTC · no check`}</title>
                  </rect>
                ))}
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
};
