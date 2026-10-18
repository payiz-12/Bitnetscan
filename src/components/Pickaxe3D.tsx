import React, { useId } from 'react';

interface Pickaxe3DProps {
  className?: string;
  size?: number;
  title?: string;
}

/**
 * Shaded pickaxe: steel head, wooden handle, petrol grip. Drawn upright in a
 * 64-unit box and turned 45° so the head sits top-right like the usual icon.
 * Light comes from above, so the head's upper bevel and the handle's left
 * side are the bright ones.
 */
export const Pickaxe3D: React.FC<Pickaxe3DProps> = ({ className = '', size = 24, title }) => {
  const id = useId().replace(/:/g, '');
  const ref = (name: string) => `url(#${id}-${name})`;
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={`${id}-wood`}>
          <stop offset="0" stopColor="#7A4C24" />
          <stop offset=".25" stopColor="#D8A465" />
          <stop offset=".55" stopColor="#A86F3A" />
          <stop offset="1" stopColor="#4E3016" />
        </linearGradient>
        <linearGradient id={`${id}-grip`}>
          <stop offset="0" stopColor="#014A53" />
          <stop offset=".25" stopColor="#2AA2AE" />
          <stop offset=".55" stopColor="#016976" />
          <stop offset="1" stopColor="#01292E" />
        </linearGradient>
        <linearGradient id={`${id}-top`}>
          <stop offset="0" stopColor="#9DB0B4" />
          <stop offset=".3" stopColor="#F2F7F7" />
          <stop offset=".55" stopColor="#C9D7D9" />
          <stop offset=".78" stopColor="#F5F9F9" />
          <stop offset="1" stopColor="#8EA2A6" />
        </linearGradient>
        <linearGradient id={`${id}-bottom`}>
          <stop offset="0" stopColor="#3B5155" />
          <stop offset=".45" stopColor="#6F878B" />
          <stop offset=".7" stopColor="#506669" />
          <stop offset="1" stopColor="#2C3D40" />
        </linearGradient>
        <linearGradient id={`${id}-collar`}>
          <stop offset="0" stopColor="#5D7276" />
          <stop offset=".25" stopColor="#EAF1F2" />
          <stop offset=".55" stopColor="#9DB0B3" />
          <stop offset="1" stopColor="#34474A" />
        </linearGradient>
        <linearGradient id={`${id}-ao`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1B1208" stopOpacity=".45" />
          <stop offset="1" stopColor="#1B1208" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g transform="rotate(45 32 32)">
        <rect x="29" y="12" width="6" height="47" rx="3" fill={ref('wood')} stroke="#2A1A0C" strokeOpacity=".55" strokeWidth="1" />
        <path d="M31.2 28v12M33.2 31v8" stroke="#5A3818" strokeOpacity=".35" strokeWidth=".5" strokeLinecap="round" />
        <rect x="29" y="23" width="6" height="5" fill={ref('ao')} />
        <rect x="28.3" y="44" width="7.4" height="15.6" rx="3.2" fill={ref('grip')} stroke="#01262B" strokeOpacity=".6" strokeWidth=".9" />
        <path d="M28.7 47.4l6.6-1.6M28.7 50.6l6.6-1.6M28.7 53.8l6.6-1.6M28.7 57l6.6-1.6" stroke="#01262B" strokeOpacity=".55" strokeWidth=".9" />
        <path d="M3 25Q32-3 61 25Q32 7 3 25Z" fill={ref('top')} />
        <path d="M3 25Q32 7 61 25Q32 15 3 25Z" fill={ref('bottom')} />
        <path d="M3 25Q32-3 61 25Q32 15 3 25Z" fill="none" stroke="#16262A" strokeOpacity=".75" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M9 21.5Q32 1.5 55 21.5" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth=".8" strokeLinecap="round" />
        <rect x="25.5" y="6" width="13" height="17" rx="2.6" fill={ref('collar')} stroke="#16262A" strokeOpacity=".65" strokeWidth="1" />
        <path d="M25.9 9h12.2M25.9 20h12.2" stroke="#1E3034" strokeOpacity=".4" strokeWidth=".7" />
        <rect x="29" y="3.6" width="6" height="3.6" rx="1.6" fill="#C9965A" stroke="#2A1A0C" strokeOpacity=".35" strokeWidth=".7" />
      </g>
    </svg>
  );
};

export default Pickaxe3D;
