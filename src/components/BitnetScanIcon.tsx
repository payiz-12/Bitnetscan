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
      {/* Base B Mark with filled teal bottom loop */}
      <image href="/bitnetscan-icon-filled.png" width="512" height="512" />

      {/* 360° Rotating White Square inside bottom loop */}
      <g
        className={animated ? "animate-spin-slow" : ""}
        style={{
          transformBox: 'fill-box',
          transformOrigin: '309.5px 376.5px',
        }}
      >
        <rect 
          x="265.5" 
          y="332.5" 
          width="88" 
          height="88" 
          rx="4" 
          ry="4" 
          fill="#ffffff" 
        />
      </g>
    </svg>
  );
};
