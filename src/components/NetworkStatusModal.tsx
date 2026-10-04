import React, { useState, useEffect } from 'react';
import { 
  Activity, X, CheckCircle2, AlertCircle, RefreshCw, Zap, 
  Server, ShieldCheck, ArrowRight, Radio, Check
} from 'lucide-react';
import { rpcService, DEFAULT_RPC_ENDPOINTS } from '../services/rpc';

interface NetworkStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  latestBlock?: number;
  gasPriceGwei?: string | null;
  peerCount?: number | null;
}

interface EndpointHealth {
  url: string;
  name: string;
  latencyMs: number;
  status: 'online' | 'checking' | 'error';
}

function getEndpointLabel(url: string): string {
  if (url === '/api/rpc') return 'Primary Proxy (rpc.bitnetmoney.org)';
  if (url === '/api/rpc2') return 'Backup Proxy (rpc.bitnetmoney.com)';
  if (url.includes('rpc.bitnetmoney.org')) return 'Direct Node (rpc.bitnetmoney.org)';
  if (url.includes('rpc.bitnetmoney.com')) return 'Direct Node (rpc.bitnetmoney.com)';
  return url;
}

export const NetworkStatusModal: React.FC<NetworkStatusModalProps> = ({
  isOpen,
  onClose,
  latestBlock,
  gasPriceGwei,
  peerCount,
}) => {
  const [activeRpc, setActiveRpc] = useState<string>(rpcService.getActiveRpc());
  const [endpoints, setEndpoints] = useState<EndpointHealth[]>(
    DEFAULT_RPC_ENDPOINTS.map((url) => ({
      url,
      name: getEndpointLabel(url),
      latencyMs: rpcService.getLatency(url),
      status: 'online',
    }))
  );
  const [isTesting, setIsTesting] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<string | null>(null);

  // Close on Escape & Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      setActiveRpc(rpcService.getActiveRpc());
      testAllEndpoints();
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  const testAllEndpoints = async () => {
    setIsTesting(true);
    const updated: EndpointHealth[] = [];

    for (const ep of DEFAULT_RPC_ENDPOINTS) {
      const startTime = performance.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const lat = Math.round(performance.now() - startTime);
          updated.push({ url: ep, name: getEndpointLabel(ep), latencyMs: lat, status: 'online' });
        } else {
          updated.push({ url: ep, name: getEndpointLabel(ep), latencyMs: 999, status: 'error' });
        }
      } catch {
        updated.push({ url: ep, name: getEndpointLabel(ep), latencyMs: 999, status: 'error' });
      }
    }

    setEndpoints(updated);
    setIsTesting(false);
  };

  const handleSelectRpc = (url: string) => {
    rpcService.setActiveRpc(url);
    setActiveRpc(url);
    setSelectedNotice(`Switched to ${getEndpointLabel(url)}`);
    setTimeout(() => setSelectedNotice(null), 2500);
  };

  if (!isOpen) return null;

  const currentLatency = rpcService.getLatency(activeRpc);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 shadow-2xl relative flex flex-col max-h-[92vh] animate-scale-in"
      >
        {/* Top Close Button (Highly touch-friendly) */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-500 hover:text-slate-900 transition-colors flex items-center justify-center cursor-pointer z-10 shadow-2xs"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pr-10 pb-4 border-b border-slate-100">
          <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#016976] shadow-xs shrink-0">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              Bitnet L1 Network & Node Health
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live JSON-RPC endpoints, latency, and connection status.
            </p>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto pr-1 py-4 space-y-4 flex-1">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Latency</span>
              <span className={`text-sm sm:text-base font-black font-mono mt-0.5 block ${
                currentLatency < 60 ? 'text-emerald-600' : currentLatency < 150 ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {currentLatency} ms
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Latest Block</span>
              <span className="text-sm sm:text-base font-black font-mono text-slate-900 mt-0.5 block truncate">
                {latestBlock ? `#${latestBlock.toLocaleString()}` : 'Loading...'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gas Price</span>
              <span className="text-sm sm:text-base font-black font-mono text-[#016976] mt-0.5 block truncate">
                {gasPriceGwei != null ? `${gasPriceGwei} Gwei` : 'Unknown'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Node Peers</span>
              <span className="text-sm sm:text-base font-black font-mono text-indigo-700 mt-0.5 block truncate">
                {peerCount !== null && peerCount !== undefined ? `${peerCount} Peers` : 'Active'}
              </span>
            </div>
          </div>

          {/* Endpoints List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">Select Active RPC Node:</span>
              <button
                onClick={testAllEndpoints}
                disabled={isTesting}
                className="text-xs text-[#016976] hover:text-[#01545e] font-bold flex items-center gap-1 cursor-pointer bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200/60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Pinging...' : 'Ping All'}</span>
              </button>
            </div>

            {selectedNotice && (
              <div className="mb-2 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{selectedNotice}</span>
              </div>
            )}

            <div className="space-y-2">
              {endpoints.map((ep) => {
                const isSelected = ep.url === activeRpc;
                return (
                  <div
                    key={ep.url}
                    onClick={() => handleSelectRpc(ep.url)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                      isSelected
                        ? 'bg-teal-50/80 border-[#016976] ring-2 ring-[#016976]/25 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        ep.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_#22C55E]' : 'bg-rose-500'
                      }`} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {ep.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {ep.url}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        {ep.status === 'online' ? `${ep.latencyMs} ms` : 'Offline'}
                      </span>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-[#016976] shrink-0" />
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold group-hover:text-slate-600">Switch</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Info & Prominent Done/Close Button */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-mono">
            Chain ID: <strong className="text-slate-900">210</strong> • PoW
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-[#016976] hover:bg-[#015661] active:bg-[#01454e] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
};
