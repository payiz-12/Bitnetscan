import React from 'react';

/** Grey placeholder block with a soft shimmer. */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton rounded-md ${className}`} aria-hidden="true" />
);

/** Placeholder rows for block, transaction and account lists while they load. */
export const SkeletonList: React.FC<{ rows?: number; label?: string }> = ({ rows = 6, label = 'Loading' }) => (
  <div className="divide-y divide-slate-100" role="status" aria-label={label}>
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="flex items-center gap-3 px-3.5 py-3 sm:px-4 sm:py-3.5">
        <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-3 w-28 max-w-[40%]" />
          <Skeleton className="h-2.5 w-56 max-w-[75%]" />
        </div>
        <div className="space-y-2 flex flex-col items-end shrink-0">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-2.5 w-10" />
        </div>
      </div>
    ))}
  </div>
);

/** Placeholder for a chart card: title lines and a plot area. */
export const SkeletonChart: React.FC<{ height?: number }> = ({ height = 200 }) => (
  <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-3" role="status" aria-label="Loading chart">
    <Skeleton className="h-4 w-32" />
    <Skeleton className="h-3 w-56 max-w-[70%]" />
    <div className="skeleton rounded-xl w-full" style={{ height }} aria-hidden="true" />
  </div>
);
