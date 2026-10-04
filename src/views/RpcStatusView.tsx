import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Server, ShieldCheck, Zap } from 'lucide-react';
import { rpcService } from '../services/rpc';
import { RpcEndpointStatus } from '../types/blockchain';

export const RpcStatusView: React.FC = () => {
  const [endpoints, setEndpoints] = useState<RpcEndpointStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeUrl, setActiveUrl] = useState(rpcService.getActiveRpc());

  const checkHealth = async () => {
    setLoading(true);
    try {
      const results = await rpcService.checkAllEndpoints();
      setEndpoints(results);
      setActiveUrl(rpcService.getActiveRpc());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleSelectEndpoint = (url: string) => {
    rpcService.setActiveRpc(url);
    setActiveUrl(url);
    checkHealth();
  };

  const onlineEndpoints = endpoints.filter((e) => e.status === 'online');
  const avgLatency =
    onlineEndpoints.length > 0
      ? Math.round(
          onlineEndpoints.reduce((acc, curr) => acc + curr.latencyMs, 0) /
            onlineEndpoints.length
        )
      : 0;
  const maxBlock = Math.max(0, ...endpoints.map((e) => e.blockNumber));

  return (
    <div className="w-full space-y-6 animate-fade-in overflow-hidden">
      {/* Top Banner Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#016976] shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Bitnet RPC Node Health
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Monitor response latency, block synchronization, and node availability across Bitnet L1 RPC infrastructure.
          </p>
        </div>

        <button
          onClick={checkHealth}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-900 text-xs font-bold border border-slate-200 cursor-pointer self-start sm:self-auto shadow-xs transition-colors flex-shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#016976] ${loading ? 'animate-spin' : ''}`} />
          <span>Ping All Nodes</span>
        </button>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Server className="w-3.5 h-3.5 text-sky-500" />
            <span>Online Nodes</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900">
            {onlineEndpoints.length} <span className="text-xs text-slate-400 font-normal">/ {endpoints.length} Active</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Avg Response</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 font-mono">
            {avgLatency > 0 ? `${avgLatency} ms` : 'Probing...'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Chain ID</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 font-mono">
            210 <span className="text-xs text-emerald-600 font-sans font-bold">(Mainnet)</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Activity className="w-3.5 h-3.5 text-purple-500" />
            <span>Consensus Height</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 font-mono">
            {maxBlock > 0 ? `#${maxBlock.toLocaleString()}` : 'Syncing...'}
          </div>
        </div>
      </div>

      {/* Endpoints Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="text-sm font-bold text-slate-900">Monitored Endpoints ({endpoints.length})</h3>
          <span className="text-xs text-slate-600 font-mono font-semibold">Chain ID: 210</span>
        </div>

        <div className="divide-y divide-slate-100">
          {endpoints.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Probing Bitnet RPC nodes...
            </div>
          ) : (
            endpoints.map((ep) => {
              const isSelected = ep.url === activeUrl;
              return (
                <div
                  key={ep.url}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isSelected ? 'bg-teal-50/40 border-l-4 border-l-[#016976]' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{ep.name}</span>
                      {isSelected && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#016976] text-white flex-shrink-0">
                          Active Endpoint
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-xs text-slate-600 break-all font-medium">
                      {ep.url}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 flex-shrink-0">
                    <div className="text-left sm:text-right font-mono text-xs">
                      <div className="text-slate-900 font-bold">
                        {ep.blockNumber > 0 ? `#${ep.blockNumber.toLocaleString()}` : 'N/A'}
                      </div>
                      <div className="text-slate-500 text-[11px] font-medium">
                        Latency: {ep.latencyMs}ms
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {ep.status === 'online' ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Online</span>
                        </div>
                      ) : ep.status === 'degraded' ? (
                        <div className="flex items-center gap-1.5 text-xs text-amber-900 font-bold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Slow</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Offline</span>
                        </div>
                      )}

                      {!isSelected && ep.status === 'online' && (
                        <button
                          onClick={() => handleSelectEndpoint(ep.url)}
                          className="ml-1 sm:ml-2 px-3 py-1 rounded-lg bg-[#016976] hover:bg-[#01545e] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                        >
                          Switch
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
