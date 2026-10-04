import React, { useState } from 'react';
import { Terminal, Play, RefreshCw, CheckCircle2, AlertCircle, Copy } from 'lucide-react';
import { rpcService } from '../services/rpc';

export const ConsoleView: React.FC = () => {
  const [method, setMethod] = useState('eth_blockNumber');
  const [paramsInput, setParamsInput] = useState('[]');
  const [responseJson, setResponseJson] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const presets = [
    { name: 'eth_blockNumber', method: 'eth_blockNumber', params: '[]' },
    { name: 'eth_gasPrice', method: 'eth_gasPrice', params: '[]' },
    { name: 'eth_chainId', method: 'eth_chainId', params: '[]' },
    { name: 'net_peerCount', method: 'net_peerCount', params: '[]' },
    { name: 'eth_getBlock (Latest)', method: 'eth_getBlockByNumber', params: '["latest", false]' },
    { name: 'eth_getBalance (Miner)', method: 'eth_getBalance', params: '["0x6afcdfec8066a7fbf1295f10c4907924e99e72a4", "latest"]' },
  ];

  const handleRunRpc = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setResponseJson(null);

    let parsedParams: any[] = [];
    try {
      parsedParams = JSON.parse(paramsInput);
      if (!Array.isArray(parsedParams)) {
        throw new Error('Params must be a JSON array, e.g. ["latest", true]');
      }
    } catch (err: any) {
      setError(`Invalid JSON params: ${err.message}`);
      setLoading(false);
      return;
    }

    const start = performance.now();
    try {
      const activeEndpoint = rpcService.getActiveRpc();
      const res = await fetch(activeEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method,
          params: parsedParams,
        }),
      });

      const took = Math.round(performance.now() - start);
      setLatency(took);

      const json = await res.json();
      setResponseJson(JSON.stringify(json, null, 2));
    } catch (err: any) {
      setError(err.message || 'RPC Call Failed');
    } finally {
      setLoading(false);
    }
  };

  const loadPreset = (p: typeof presets[0]) => {
    setMethod(p.method);
    setParamsInput(p.params);
  };

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#016976] shadow-xs">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Interactive JSON-RPC Console</h1>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 mr-1">Presets:</span>
          {presets.map((p) => (
            <button
              key={p.name}
              onClick={() => loadPreset(p)}
              className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono font-medium text-slate-700 hover:text-[#016976] hover:border-slate-300 transition-colors shadow-2xs cursor-pointer"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Editor & Execution Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input parameters */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Request Parameters</h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              JSON-RPC Method
            </label>
            <input
              type="text"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono text-xs text-[#016976] font-bold focus:outline-none focus:border-[#016976] focus:ring-1 focus:ring-[#016976] shadow-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Params (Array Format)
            </label>
            <textarea
              rows={5}
              value={paramsInput}
              onChange={(e) => setParamsInput(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl p-3 font-mono text-xs text-slate-900 focus:outline-none focus:border-[#016976] focus:ring-1 focus:ring-[#016976] shadow-xs"
            />
          </div>

          <button
            onClick={() => handleRunRpc()}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[#016976] hover:bg-[#01545e] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>Execute RPC Request</span>
          </button>
        </div>

        {/* Right: Response output */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">Response Output</span>
              {latency !== null && (
                <span className="text-[11px] font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {latency}ms
                </span>
              )}
            </div>

            {responseJson && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(responseJson);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">
              {error}
            </div>
          )}

          <div className="flex-1 bg-[#0B132B] rounded-2xl border border-slate-700 p-4 font-mono text-xs text-emerald-400 overflow-y-auto max-h-[320px] whitespace-pre-wrap break-all shadow-inner">
            {responseJson || '// Output will be displayed here after execution.'}
          </div>
        </div>
      </div>
    </div>
  );
};
