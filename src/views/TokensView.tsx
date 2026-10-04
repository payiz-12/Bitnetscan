import React, { useState } from 'react';
import { Coins, Search, ExternalLink, ShieldCheck, Code, ArrowUpRight } from 'lucide-react';
import { ethers } from 'ethers';
import { rpcService } from '../services/rpc';
import { decodeStringOrBytes32 } from '../services/nftSyncService';

interface TokensViewProps {
  onSelectAddress: (addr: string) => void;
}

interface TokenInspectionResult {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  bytecodeLength: number;
}

export const TokensView: React.FC<TokensViewProps> = ({ onSelectAddress }) => {
  const [contractQuery, setContractQuery] = useState('');
  const [tokenResult, setTokenResult] = useState<TokenInspectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const standardsInfo = [
    {
      name: 'BTS-20',
      type: 'Fungible Token Standard',
      desc: 'Bitnet’s enhanced counterpart to ERC-20, powering decentralized tokens, payments, and utilities on the Bitnet L1 chain.',
      spec: 'BitnetMoney/contract-standards/blob/main/BTS-20/BTS-20.sol',
    },
    {
      name: 'BTS-21',
      type: 'Oracle & Managed Standard',
      desc: 'Token standard equipped with native oracle price feeds and security freeze controls for institutional compliance.',
      spec: 'BitnetMoney/contract-standards/blob/main/BTS-21/BTS-21.sol',
    },
    {
      name: 'BTS-HCE',
      type: 'High Compliance Environment',
      desc: 'Token standard engineered for strict financial transparency, customizable taxation, role-based controls, and whitelisting.',
      spec: 'BitnetMoney/contract-standards/blob/main/BTS-HCE/BTS-HCE.sol',
    },
  ];

  const handleInspectContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractQuery.trim() || !contractQuery.startsWith('0x')) {
      setError('Please enter a valid 0x contract address');
      return;
    }

    setLoading(true);
    setError(null);
    setTokenResult(null);

    try {
      const code = await rpcService.getCode(contractQuery.trim());
      if (!code || code === '0x') {
        setError('No bytecode found at this address. It is a normal wallet address, not a token contract.');
        setLoading(false);
        return;
      }

      // Query name, symbol, decimals, totalSupply via standard ERC-20/BTS-20 calls
      let name = 'Unknown';
      let symbol = 'TOKEN';
      let decimals = 18;
      let totalSupplyFormatted = '0';

      // 1. name() -> 0x06fdde03
      try {
        const nameHex = await rpcService.call(contractQuery.trim(), '0x06fdde03');
        const decoded = decodeStringOrBytes32(nameHex);
        if (decoded) name = decoded;
      } catch {}

      // 2. symbol() -> 0x95d89b41
      try {
        const symHex = await rpcService.call(contractQuery.trim(), '0x95d89b41');
        const decoded = decodeStringOrBytes32(symHex);
        if (decoded) symbol = decoded;
      } catch {}

      // 3. decimals() -> 0x313ce567
      try {
        const decHex = await rpcService.call(contractQuery.trim(), '0x313ce567');
        if (decHex && decHex !== '0x') {
          const val = Number(BigInt(decHex));
          if (!isNaN(val) && val >= 0 && val <= 36) {
            decimals = val;
          }
        }
      } catch {}

      // 4. totalSupply() -> 0x18160ddd
      try {
        const supHex = await rpcService.call(contractQuery.trim(), '0x18160ddd');
        if (supHex && supHex !== '0x') {
          const rawBig = BigInt(supHex);
          totalSupplyFormatted = ethers.formatUnits(rawBig, decimals);
        }
      } catch {}

      setTokenResult({
        address: contractQuery.trim(),
        name,
        symbol,
        decimals,
        totalSupply: totalSupplyFormatted,
        bytecodeLength: Math.max(0, Math.floor(code.length / 2) - 1),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to inspect token contract');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 w-full animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#016976] shadow-xs">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">BTS-20 Token Explorer</h1>
          </div>
        </div>

        {/* Contract Search / Inspect Box */}
        <form onSubmit={handleInspectContract} className="mt-6 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={contractQuery}
            onChange={(e) => setContractQuery(e.target.value)}
            placeholder="Paste Token Contract Address (0x...)"
            className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#016976] focus:ring-1 focus:ring-[#016976] shadow-xs"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-[#016976] hover:bg-[#01545e] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <Search className="w-4 h-4" />
            <span>{loading ? 'Inspecting...' : 'Inspect Contract'}</span>
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {tokenResult && (
          <div className="mt-6 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-[#016976] font-bold text-sm">Contract Verified On-Chain</span>
              <button
                onClick={() => onSelectAddress(tokenResult.address)}
                className="text-xs text-slate-700 hover:text-[#016976] font-semibold flex items-center gap-1"
              >
                <span>View Full Details</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div>
                <span className="text-slate-500 text-[11px] block font-sans">Name:</span>
                <span className="text-slate-900 font-bold">{tokenResult.name}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block font-sans">Symbol:</span>
                <span className="text-[#016976] font-bold">{tokenResult.symbol}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block font-sans">Decimals:</span>
                <span className="text-slate-900 font-bold">{tokenResult.decimals}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block font-sans">Total Supply:</span>
                <span className="text-slate-900 font-bold">{tokenResult.totalSupply} {tokenResult.symbol}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block font-sans">Code Size:</span>
                <span className="text-slate-900 font-bold">{tokenResult.bytecodeLength} bytes</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bitnet Token Standards Showcase */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Official Bitnet Token Standards</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {standardsInfo.map((std) => (
            <div
              key={std.name}
              className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between hover:border-slate-300 transition-all space-y-4 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-black text-lg text-[#D68142]">{std.name}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">Official</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-2">{std.type}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{std.desc}</p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <a
                  href={`https://github.com/${std.spec}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#016976] hover:text-[#01545e] font-bold"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>View Solidity Source</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
