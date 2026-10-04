import React, { useState, useMemo, useEffect } from 'react';
import { Image } from 'lucide-react';
import { ipfsGatewayManager } from '../services/nftSyncService';

interface NftImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
}

export const NftImage: React.FC<NftImageProps> = ({
  src,
  alt,
  className = '',
  fallbackIcon,
}) => {
  const candidates = useMemo(() => ipfsGatewayManager.getCandidateUrls(src), [src]);
  const [candidateIdx, setCandidateIdx] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const currentSrc = candidates[candidateIdx] || src;

  useEffect(() => {
    setCandidateIdx(0);
    setHasError(false);
    setIsLoaded(false);
  }, [src]);

  // Fast failover timer: If the current gateway doesn't load within 2.5 seconds, advance immediately!
  useEffect(() => {
    if (isLoaded || hasError) return;
    const timer = setTimeout(() => {
      if (!isLoaded && candidateIdx + 1 < candidates.length) {
        setCandidateIdx((prev) => prev + 1);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [candidateIdx, isLoaded, hasError, candidates.length]);

  const handleSuccess = () => {
    setIsLoaded(true);
    ipfsGatewayManager.markWorkingUrl(src, currentSrc);
  };

  const handleError = () => {
    if (candidateIdx + 1 < candidates.length) {
      setCandidateIdx((prev) => prev + 1);
    } else {
      setHasError(true);
    }
  };

  if (hasError || !src) {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-2 ${className}`}>
        {fallbackIcon || <Image className="w-6 h-6 text-slate-500 mb-1 opacity-60" />}
        <span className="text-[10px] font-mono text-center text-slate-400 font-semibold px-1 line-clamp-1">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-slate-950 flex items-center justify-center ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-800/80 animate-pulse flex items-center justify-center z-0">
          <Image className="w-5 h-5 text-slate-500 animate-pulse" />
        </div>
      )}
      <img
        src={currentSrc}
        alt={alt}
        loading="lazy"
        onLoad={handleSuccess}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-200 relative z-10 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};
