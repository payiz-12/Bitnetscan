import React, { useMemo } from 'react';
import { Pickaxe3D } from './Pickaxe3D';

/** One strike every 5 seconds; the keyframes in index.css are built on this period. */
export const STRIKE_PERIOD_MS = 5000;

// Where the five Bitnet logos fly to after the strike, relative to the pick's tip,
// in percent of the tile width (cqw) so the burst scales with the tile.
const SPARKS = [
  { dx: -44, dy: -42, r: -40, w: 25 },
  { dx: -8, dy: -61, r: 25, w: 22 },
  { dx: 33, dy: -50, r: 55, w: 25 },
  { dx: 42, dy: -14, r: -30, w: 19 },
  { dx: -53, dy: -3, r: 40, w: 22 },
];

/**
 * Animated pickaxe that fills its tile: it strikes every 5 seconds and five Bitnet logos
 * scatter from the tip and fade. The animation phase comes from the wall clock, so every
 * pickaxe on the page strikes at the same moment no matter when it was mounted.
 */
export const MiningPickaxe: React.FC = () => {
  const phase = useMemo(() => `-${Date.now() % STRIKE_PERIOD_MS}ms`, []);
  return (
    <div className="mining-stage" style={{ '--mining-phase': phase } as React.CSSProperties} aria-hidden="true">
      <span className="mining-shadow">
        <Pickaxe3D className="mining-pick" />
      </span>
      <span className="mining-flash" />
      {SPARKS.map((s, i) => (
        <img
          key={i}
          src="/bitnet-logo-blue.svg"
          alt=""
          className="mining-spark"
          style={{ width: `${s.w}cqw`, height: `${s.w}cqw`, '--dx': `${s.dx}cqw`, '--dy': `${s.dy}cqw`, '--r': `${s.r}deg` } as React.CSSProperties}
        />
      ))}
    </div>
  );
};
