import React, { useState, useEffect } from 'react';
import { 
  Activity, X, CheckCircle2, AlertCircle, RefreshCw, Zap, 
  Server, ShieldCheck, ArrowRight, Radio
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
  latencyMs: number;
  status: 'online' | 'checking' | 'error';
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
      latencyMs: rpcService.getLatency(url),
      status: 'online',
    }))
  );
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveRpc(rpcService.getActiveRpc());
      testAllEndpoints();
    }
  }, [isOpen]);

  const testAllEndpoints = async () => {
    setIsTesting(true);
    const updated: EndpointHealth[] = [];

    for (const ep of DEFAULT_RPC_ENDPOINTS) {
      const startTime = performance.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const lat = Math.round(performance.now() - startTime);
          updated.push({ url: ep, latencyMs: lat, status: 'online' });
        } else {
          updated.push({ url: ep, latencyMs: 999, status: 'error' });
        }
      } catch {
        updated.push({ url: ep, latencyMs: 999, status: 'error' });
      }
    }

    setEndpoints(updated);
    setIsTesting(false);
  };

  const handleSelectRpc = (url: string) => {
    rpcService.setActiveRpc(url);
    setActiveRpc(url);
  };

  if (!isOpen) return null;

  const currentLatency = rpcService.getLatency(activeRpc);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-7 shadow-2xl relative space-y-5 animate-scale-in"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#016976] shadow-xs">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Bitnet L1 Network & Node Status
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              EVM JSON-RPC endpoints, real-time latency, and connection health.
            </p>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Latency (Ping)</span>
            <span className={`text-base font-black font-mono mt-0.5 block ${
              currentLatency < 60 ? 'text-emerald-600' : currentLatency < 150 ? 'text-amber-600' : 'text-rose-600'
            }`}>
              {currentLatency} ms
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Latest Block</span>
            <span className="text-base font-black font-mono text-slate-900 mt-0.5 block">
              {latestBlock ? `#${latestBlock.toLocaleString()}` : 'Loading...'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gas Price</span>
            <span className="text-base font-black font-mono text-[#016976] mt-0.5 block">
              {gasPriceGwei != null ? `${gasPriceGwei} Gwei` : 'Unknown'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block" title="Connected RPC Node Peers (queried node connections, not whole network node count)">
              RPC Node Peers
            </span>
            <span className="text-base font-black font-mono text-indigo-700 mt-0.5 block">
              {peerCount !== null && peerCount !== undefined ? `${peerCount} Peers` : 'Unknown'}
            </span>
          </div>
        </div>

        {/* Endpoints List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">Active & Fallback RPC Endpoints:</span>
            <button
              onClick={testAllEndpoints}
              disabled={isTesting}
              className="text-xs text-[#016976] hover:text-[#01545e] font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing...' : 'Ping All'}</span>
            </button>
          </div>

          <div className="space-y-2">
            {endpoints.map((ep) => {
              const isSelected = ep.url === activeRpc;
              return (
                <div
                  key={ep.url}
                  onClick={() => handleSelectRpc(ep.url)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? 'bg-teal-50/70 border-[#016976] ring-2 ring-[#016976]/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      ep.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_#22C55E]' : 'bg-rose-500'
                    }`} />
                    <div className="min-w-0">
                      <div className="text-xs font-mono font-bold text-slate-900 truncate">
                        {ep.url}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {isSelected ? 'Currently Connected Node' : 'Backup Endpoint'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono font-bold text-slate-600">
                      {ep.status === 'online' ? `${ep.latencyMs} ms` : 'Timeout'}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Bitnet PoW Consensus</span>
          <span className="font-mono font-bold text-slate-900">Chain ID: 210</span>
        </div>
      </div>
    </div>
  );
};
