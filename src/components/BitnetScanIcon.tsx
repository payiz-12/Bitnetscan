import React from 'react';

interface BitnetScanIconProps {
  className?: string;
  animated?: boolean;
}

export const BitnetScanIcon: React.FC<BitnetScanIconProps> = ({ 
  className = "w-full h-full", 
  animated = true 
}) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      className={className}
      aria-label="BitnetScan Logo"
    >
      <defs>
        <linearGradient id="btnBlockGradComp" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#016976" />
          <stop offset="100%" stopColor="#015866" />
        </linearGradient>
      </defs>

      {/* Static Base B Mark */}
      <image href="/bitnetscan-icon.png" width="512" height="512" />

      {/* 360° Rotating Inner Block inside the bottom loop */}
      <g
        className={animated ? "animate-spin-slow" : ""}
        style={{
          transformBox: 'fill-box',
          transformOrigin: '309.5px 376.5px',
        }}
      >
        <rect 
          x="282.5" 
          y="349.5" 
          width="54" 
          height="54" 
          rx="6" 
          ry="6" 
          fill="url(#btnBlockGradComp)"
          stroke="#028497"
          strokeWidth="1.5"
          strokeOpacity="0.6"
        />
      </g>
    </svg>
  );
};
