import React, { useEffect, useRef, useState } from 'react';

const GRID = '#E2E8F0';
const AXIS_TEXT = '#64748B';
const SURFACE = '#FFFFFF';

/** Width of a container element, kept in sync with layout changes. */
function useWidth(fallback = 600) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(240, Math.round(el.clientWidth)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Rounds `max` up to a clean axis maximum split into four equal steps (1, 2, 2.5 or 5 × 10^k). */
export function niceScale(max: number): { top: number; step: number } {
  if (!(max > 0)) return { top: 1, step: 0.25 };
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  return { top: step * 4, step };
}

const xTickIndices = (count: number, width: number) => {
  const ticks = width < 420 ? 3 : 5;
  if (count <= ticks) return Array.from({ length: count }, (_, i) => i);
  return Array.from({ length: ticks }, (_, i) => Math.round((i * (count - 1)) / (ticks - 1)));
};

interface TooltipProps {
  left: number;
  width: number;
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ left, width, children }) => {
  const boxWidth = 176;
  const x = Math.min(Math.max(left - boxWidth / 2, 0), Math.max(0, width - boxWidth));
  return (
    <div
      className="pointer-events-none absolute top-0 z-10 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-[11px] shadow-md"
      style={{ left: x, width: boxWidth }}
    >
      {children}
    </div>
  );
};

export interface LinePoint {
  x: number;
  y: number;
}

interface LineChartProps {
  points: LinePoint[];
  color: string;
  formatY: (v: number) => string;
  formatAxisY?: (v: number) => string;
  formatX: (x: number) => string;
  /** Tooltip heading for point i (e.g. date range and block range). */
  describe: (i: number) => React.ReactNode;
  ariaLabel: string;
  height?: number;
}

/** Single-series line with a 10% area wash, hairline grid, crosshair and tooltip. */
export const LineChart: React.FC<LineChartProps> = ({ points, color, formatY, formatAxisY, formatX, describe, ariaLabel, height = 200 }) => {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { left: 52, right: 10, top: 10, bottom: 24 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  if (points.length < 2) return <div ref={ref} style={{ height }} />;

  const minX = points[0].x;
  const maxX = points[points.length - 1].x;
  const { top, step } = niceScale(Math.max(...points.map((p) => p.y)));
  const sx = (x: number) => pad.left + (maxX > minX ? ((x - minX) / (maxX - minX)) * plotW : plotW / 2);
  const sy = (y: number) => pad.top + plotH - (y / top) * plotH;
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const area = `${line} L${sx(maxX).toFixed(1)},${sy(0)} L${sx(minX).toFixed(1)},${sy(0)} Z`;
  const yTicks = [0, 1, 2, 3, 4].map((i) => i * step);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    let best = 0;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(sx(points[i].x) - px) < Math.abs(sx(points[best].x) - px)) best = i;
    }
    setHover(best);
  };

  const last = points[points.length - 1];
  return (
    <div ref={ref} className="relative w-full select-none">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        className="block touch-pan-y"
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={sy(t)} y2={sy(t)} stroke={GRID} strokeWidth={1} />
            <text x={pad.left - 6} y={sy(t) + 3} textAnchor="end" fontSize={10} fill={AXIS_TEXT} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {(formatAxisY || formatY)(t)}
            </text>
          </g>
        ))}
        {xTickIndices(points.length, width).map((i) => (
          <text key={i} x={sx(points[i].x)} y={height - 6} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} fontSize={10} fill={AXIS_TEXT}>
            {formatX(points[i].x)}
          </text>
        ))}
        <path d={area} fill={color} opacity={0.1} />
        <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover === null && <circle cx={sx(last.x)} cy={sy(last.y)} r={4} fill={color} stroke={SURFACE} strokeWidth={2} />}
        {hover !== null && (
          <g>
            <line x1={sx(points[hover].x)} x2={sx(points[hover].x)} y1={pad.top} y2={pad.top + plotH} stroke="#94A3B8" strokeWidth={1} />
            <circle cx={sx(points[hover].x)} cy={sy(points[hover].y)} r={4.5} fill={color} stroke={SURFACE} strokeWidth={2} />
          </g>
        )}
      </svg>
      {hover !== null && (
        <Tooltip left={sx(points[hover].x)} width={width}>
          <div className="text-slate-500">{describe(hover)}</div>
          <div className="mt-0.5 font-bold text-slate-900">{formatY(points[hover].y)}</div>
        </Tooltip>
      )}
    </div>
  );
};

export interface ShareGroup {
  id: string;
  name: string;
  color: string;
}

interface StackedShareChartProps {
  /** Counts per group id for each column. */
  columns: Record<string, number>[];
  groups: readonly ShareGroup[];
  formatX: (i: number) => string;
  describe: (i: number) => React.ReactNode;
  ariaLabel: string;
  height?: number;
}

const roundedTop = (x: number, y: number, w: number, h: number, r: number) => {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
};

/** 100% stacked columns with 2px surface gaps between segments and a per-column tooltip. */
export const StackedShareChart: React.FC<StackedShareChartProps> = ({ columns, groups, formatX, describe, ariaLabel, height = 220 }) => {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { left: 40, right: 6, top: 10, bottom: 24 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const slot = plotW / Math.max(1, columns.length);
  const barW = Math.max(3, Math.min(24, slot - 2));
  const sy = (share: number) => pad.top + plotH - share * plotH;

  return (
    <div ref={ref} className="relative w-full select-none">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} onPointerLeave={() => setHover(null)} className="block touch-pan-y">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={sy(t)} y2={sy(t)} stroke={GRID} strokeWidth={1} />
            <text x={pad.left - 6} y={sy(t) + 3} textAnchor="end" fontSize={10} fill={AXIS_TEXT}>{Math.round(t * 100)}%</text>
          </g>
        ))}
        {columns.map((col, i) => {
          const total = groups.reduce((s, g) => s + (col[g.id] || 0), 0);
          const x = pad.left + i * slot + (slot - barW) / 2;
          const segments = groups.filter((g) => (col[g.id] || 0) > 0);
          let cursor = 0;
          return (
            <g key={i} opacity={hover === null || hover === i ? 1 : 0.45}>
              {segments.map((g, j) => {
                const share = total > 0 ? (col[g.id] || 0) / total : 0;
                const y0 = sy(cursor);
                cursor += share;
                const y1 = sy(cursor);
                // 2px surface gap above every segment except the top one.
                const h = Math.max(0, y0 - y1 - (j < segments.length - 1 ? 2 : 0));
                const top = j < segments.length - 1 ? y1 + 2 : y1;
                return j === segments.length - 1
                  ? <path key={g.id} d={roundedTop(x, top, barW, h, 4)} fill={g.color} />
                  : <rect key={g.id} x={x} y={top} width={barW} height={h} fill={g.color} />;
              })}
              <rect x={pad.left + i * slot} y={pad.top} width={slot} height={plotH} fill="transparent" onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} />
            </g>
          );
        })}
        {xTickIndices(columns.length, width).map((i) => (
          <text key={i} x={pad.left + i * slot + slot / 2} y={height - 6} textAnchor={i === 0 ? 'start' : i === columns.length - 1 ? 'end' : 'middle'} fontSize={10} fill={AXIS_TEXT}>
            {formatX(i)}
          </text>
        ))}
      </svg>
      {hover !== null && (
        <Tooltip left={pad.left + hover * slot + slot / 2} width={width}>
          <div className="text-slate-500 mb-1">{describe(hover)}</div>
          {groups.map((g) => {
            const total = groups.reduce((s, x) => s + (columns[hover][x.id] || 0), 0);
            const count = columns[hover][g.id] || 0;
            return (
              <div key={g.id} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-slate-700 truncate">
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: g.color }} />
                  {g.name}
                </span>
                <span className="font-bold text-slate-900">{total > 0 ? `${((count / total) * 100).toFixed(0)}%` : '—'}</span>
              </div>
            );
          })}
        </Tooltip>
      )}
    </div>
  );
};

/** Legend row: swatch + name (+ optional value). Text stays in ink colors; the swatch carries identity. */
export const Legend: React.FC<{ items: { name: string; color: string; value?: string }[] }> = ({ items }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
    {items.map((item) => (
      <span key={item.name} className="flex items-center gap-1.5 text-slate-700">
        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.color }} />
        <span className="font-semibold">{item.name}</span>
        {item.value && <span className="text-slate-500">{item.value}</span>}
      </span>
    ))}
  </div>
);
