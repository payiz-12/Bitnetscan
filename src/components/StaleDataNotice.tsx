import React from 'react';
import { AlertTriangle } from 'lucide-react';

/** Hours after which the hourly dataset counts as late (scheduled runs are often delayed by up to an hour). */
export const STALE_HOURS = 4;

/** Hours since `at` (an ISO date or a Unix time in seconds), or null when unknown. */
export function hoursSince(at: string | number | null | undefined): number | null {
  if (at === null || at === undefined || at === '') return null;
  const ms = typeof at === 'number' ? at * 1000 : Date.parse(at);
  return Number.isFinite(ms) ? (Date.now() - ms) / 3600000 : null;
}

const age = (hours: number) => (hours < 48 ? `${Math.floor(hours)} hours` : `${Math.floor(hours / 24)} days`);

/**
 * A warning shown when BitnetScan's hourly update (GitHub Actions) has not run for a while, so the
 * figures that come from it may be behind. Renders nothing while the data is fresh.
 */
export const StaleDataNotice: React.FC<{ at: string | number | null | undefined; what?: string }> = ({ at, what = 'these figures' }) => {
  const hours = hoursSince(at);
  if (hours === null || hours <= STALE_HOURS) return null;
  return (
    <div role="status" className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>BitnetScan's hourly update last ran {age(hours)} ago, so {what} may be behind. They catch up on their own when the update runs again.</span>
    </div>
  );
};
