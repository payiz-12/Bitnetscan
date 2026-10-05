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

      {/* 360° Rotating White Cube (True Propeller centered at X: 309, Y: 377) */}
      <g transform="translate(309, 377)">
        <g className={animated ? "animate-spin-slow" : ""}>
          <rect 
            x="-44" 
            y="-44" 
            width="88" 
            height="88" 
            rx="4" 
            ry="4" 
            fill="#ffffff" 
          />
        </g>
      </g>
    </svg>
  );
};
