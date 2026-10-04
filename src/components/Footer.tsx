import React from 'react';
import { Github, Globe, Server, Code, FileText, Cpu, ExternalLink, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-16 text-xs text-slate-600 shadow-sm">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Col 1: Brand & Mission */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shadow-xs">
                <img src="/bitnet-logo-blue.svg" alt="Bitnet" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-slate-900 text-base">BitnetScan</span>
            </div>
            <p className="text-slate-500 text-xs">
              Bitnet Money (BTN) L1 Block Explorer
            </p>
            <div className="flex items-center gap-2 text-[#016976] font-mono text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#016976] animate-pulse"></span>
              <span>Network Status: Live & Producing Blocks</span>
            </div>
          </div>

          {/* Col 2: Network Parameters */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
              Network Parameters
            </h4>
            <ul className="space-y-1.5 font-mono text-[11px]">
              <li className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">Chain ID:</span>
                <span className="text-slate-900 font-bold">210 (0xd2)</span>
              </li>
              <li className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">Native Asset:</span>
                <span className="text-[#016976] font-bold">Bitnet (BTN)</span>
              </li>
              <li className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">Consensus:</span>
                <span className="text-slate-900 font-bold">Ethash (PoW)</span>
              </li>
              <li className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">Gas Limit:</span>
                <span className="text-slate-900 font-bold">150,000,000</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-500">Base Reward:</span>
                <span className="text-emerald-700 font-black">1.0 BTN / block</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Ecosystem & Code */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
              Ecosystem & Code
            </h4>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://github.com/payiz-12/Bitnetscan" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-2 text-slate-700 hover:text-[#016976] transition-colors"
                >
                  <Github className="w-3.5 h-3.5 text-slate-800" />
                  <span>BitnetScan Explorer (Source Code)</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 ml-auto" />
                </a>
              </li>
              <li>
                <a 
                  href="https://github.com/BitnetMoney/bitnet" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-2 text-slate-700 hover:text-[#016976] transition-colors"
                >
                  <Github className="w-3.5 h-3.5 text-slate-800" />
                  <span>Bitnet Core (Golang Geth)</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 ml-auto" />
                </a>
              </li>
              <li>
                <a 
                  href="https://github.com/BitnetMoney/contract-standards" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-2 text-slate-700 hover:text-[#016976] transition-colors"
                >
                  <Code className="w-3.5 h-3.5 text-slate-800" />
                  <span>Bitnet Contract Standards</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 ml-auto" />
                </a>
              </li>
              <li>
                <a 
                  href="https://github.com/BitnetMoney/bitnet-desktop-node" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-2 text-slate-700 hover:text-[#016976] transition-colors"
                >
                  <Cpu className="w-3.5 h-3.5 text-slate-800" />
                  <span>Desktop Node & Miner GUI</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 ml-auto" />
                </a>
              </li>
              <li>
                <a 
                  href="https://github.com/BitnetMoney/btips" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-2 text-slate-700 hover:text-[#016976] transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-800" />
                  <span>BTIPs (Improvement Proposals)</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 ml-auto" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
          <div>
            &copy; {new Date().getFullYear()} BitnetScan. Built for the decentralized Bitnet Money community.
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1 text-slate-600">
              <Server className="w-3 h-3 text-[#016976]" />
              <span>RPC: rpc.bitnetmoney.org</span>
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="flex items-center gap-1 text-slate-600">
              <ShieldCheck className="w-3 h-3 text-[#016976]" />
              <span>Open Source / MIT</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
