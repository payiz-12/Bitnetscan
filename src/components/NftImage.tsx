import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'lucide-react';
import { ipfsGatewayManager } from '../services/nftSyncService';

interface NftImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
  refreshKey?: string;
}

// Remount on a URI change so failures/late loads cannot leak between different NFTs.
export const NftImage: React.FC<NftImageProps> = props => <NftImageSource key={`${props.src}:${props.refreshKey || ''}`} {...props} />;

const NftImageSource: React.FC<NftImageProps> = ({ src, alt, className = '', fallbackIcon }) => {
  const candidates = useMemo(() => ipfsGatewayManager.getCandidateUrls(src), [src]);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const currentSrc = candidates[index];

  useEffect(() => {
    if (!container.current) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  // Start failover only for visible images, after lazy loading can actually begin.
  useEffect(() => {
    if (!visible || loaded || !currentSrc) return;
    const timer = setTimeout(() => { setLoaded(false); setIndex(previous => previous + 1); }, 10000);
    return () => clearTimeout(timer);
  }, [visible, loaded, currentSrc]);

  if (!currentSrc) return <div className={`flex flex-col items-center justify-center bg-slate-100 text-slate-500 p-2 ${className}`}>
    {fallbackIcon || <Image className="w-6 h-6 mb-2" />}
    <span className="text-[10px] text-center">Image unavailable</span>
  </div>;

  return <div ref={container} className={`relative overflow-hidden bg-slate-100 flex items-center justify-center ${className}`}>
    {!loaded && <div className="absolute inset-0 animate-pulse flex items-center justify-center"><Image className="w-5 h-5 text-slate-400" /></div>}
    <img key={currentSrc} src={currentSrc} alt={alt} loading="lazy" decoding="async"
      onLoad={() => { setLoaded(true); ipfsGatewayManager.markWorkingUrl(src, currentSrc); }}
      onError={() => { setLoaded(false); setIndex(previous => previous + 1); }}
      className={`w-full h-full object-contain relative ${loaded ? 'opacity-100' : 'opacity-0'}`} />
  </div>;
};
