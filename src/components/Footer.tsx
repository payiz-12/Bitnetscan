import React, { useState, useEffect } from 'react';
import { 
  Github, Globe, Server, Code, FileText, Cpu, ExternalLink, ShieldCheck,
  Heart, Copy, Check, X, QrCode
} from 'lucide-react';

const DONATION_ADDRESS = '0x4251F40A6e3CbD1CA01669DAd35E157CeEa7Be48';

export const Footer: React.FC = () => {
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDonateModal(false);
    };
    if (showDonateModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDonateModal]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(DONATION_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <footer className="bg-white border-t border-slate-200 mt-16 text-xs text-slate-600 shadow-sm">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Col 1: Brand & Mission */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shadow-xs">
                <img src="/bitnetscan-icon.svg" alt="BitnetScan" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-[#162334] text-base">
                Bitnet<span className="text-[#015866]">Scan</span>
              </span>
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
            {/* Red Heart Donate Button (Address hidden, opens QR modal on click) */}
            <button
              onClick={() => setShowDonateModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100/90 border border-rose-200 text-slate-800 transition-all cursor-pointer shadow-2xs group"
              title="Donate to BitnetScan"
            >
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-slate-800 text-xs">Donate</span>
            </button>
            <span className="text-slate-300 hidden sm:inline">•</span>
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

      {/* Donate Modal (QR Code & Address) */}
      {showDonateModal && (
        <div 
          onClick={() => setShowDonateModal(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-left"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Donate</h3>
                  <span className="text-[11px] text-slate-500 font-medium">Bitnet (BTN)</span>
                </div>
              </div>
              <button
                onClick={() => setShowDonateModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Code (Barkod) */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-2">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${DONATION_ADDRESS}`}
                alt="Donation QR Code"
                className="w-48 h-48 rounded-xl bg-white p-2 shadow-xs border border-slate-100"
              />
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <QrCode className="w-3 h-3 text-slate-400" />
                Scan QR Code with Wallet
              </span>
            </div>

            {/* Address with One-Click Copy */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Wallet Address
              </span>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold text-slate-900 break-all select-all">
                  {DONATION_ADDRESS}
                </span>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-[#016976] hover:bg-[#015661] text-white text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-white" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
