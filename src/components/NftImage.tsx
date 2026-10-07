import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'lucide-react';
import { ipfsGatewayManager } from '../services/nftSyncService';
import { canonicalIpfsUri, ipfsImages } from '../services/ipfsResources';

interface NftImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
  refreshKey?: string;
}

// Refresh retries failures; successful immutable IPFS files remain in the blob cache.
export const NftImage: React.FC<NftImageProps> = props => <NftImageSource key={`${canonicalIpfsUri(props.src) || props.src}:${props.refreshKey || ''}`} {...props} />;

const NftImageSource: React.FC<NftImageProps> = ({ src, alt, className = '', fallbackIcon }) => {
  const candidates = useMemo(() => ipfsGatewayManager.getCandidateUrls(src), [src]);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const ipfsUri = canonicalIpfsUri(src);
  const [ipfsPending, setIpfsPending] = useState(!!ipfsUri);
  const [verifiedUrl, setVerifiedUrl] = useState('');
  const container = useRef<HTMLDivElement>(null);
  // HTTP images can load immediately while verified IPFS retrieval runs in parallel.
  const currentSrc = verifiedUrl || candidates[index];

  useEffect(() => {
    if (!container.current) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !ipfsUri) return;
    let cancelled = false, objectUrl = '';
    ipfsImages.get(ipfsUri).then(blob => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setVerifiedUrl(objectUrl); setIpfsPending(false);
    }).catch(() => { if (!cancelled) setIpfsPending(false); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [visible, ipfsUri]);

  const failCurrent = () => {
    setLoaded(false);
    if (verifiedUrl) setVerifiedUrl('');
    else setIndex(previous => previous + 1);
  };

  // Start failover only for visible images, after lazy loading can actually begin.
  useEffect(() => {
    if (!visible || loaded || !currentSrc) return;
    const timer = setTimeout(failCurrent, 8000);
    return () => clearTimeout(timer);
  }, [visible, loaded, currentSrc]);

  if (!currentSrc && !ipfsPending) return <div className={`flex flex-col items-center justify-center bg-slate-100 text-slate-500 p-2 ${className}`} title={ipfsUri ? 'The original IPFS image could not be retrieved. Its provider may be offline.' : 'Image unavailable'}>
    {fallbackIcon || <Image className="w-6 h-6 mb-2" />}
    <span className="text-[10px] text-center">{ipfsUri ? 'IPFS image unavailable' : 'Image unavailable'}</span>
  </div>;

  return <div ref={container} className={`relative overflow-hidden bg-slate-100 flex items-center justify-center ${className}`}>
    {!loaded && <div className="absolute inset-0 animate-pulse flex items-center justify-center"><Image className="w-5 h-5 text-slate-400" /></div>}
    {currentSrc && <img key={currentSrc} src={currentSrc} alt={alt} loading="lazy" decoding="async"
      onLoad={() => { setLoaded(true); if (!verifiedUrl) ipfsGatewayManager.markWorkingUrl(src, currentSrc); }}
      onError={failCurrent}
      className={`w-full h-full object-contain relative ${loaded ? 'opacity-100' : 'opacity-0'}`} />}
  </div>;
};
