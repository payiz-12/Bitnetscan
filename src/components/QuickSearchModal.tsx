import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, X, Layers, Trophy, Coins, Image as ImageIcon, Cpu, 
  Terminal, Activity, ArrowRight, CornerDownLeft, Hash, Wallet
} from 'lucide-react';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  onNavigate: (view: string) => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  onSearch,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or state
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch(query.trim());
    onClose();
  };

  const clean = query.trim();
  const isAddress = /^0x[a-fA-F0-9]{40}$/.test(clean);
  const isTx = /^0x[a-fA-F0-9]{64}$/.test(clean);
  const isBlockNum = /^\d+$/.test(clean);

  const quickLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers, desc: 'Latest blocks, transactions and price' },
    { id: 'nfts', label: 'NFT Collections', icon: ImageIcon, desc: 'BTS-721 collections on Bitnet' },
    { id: 'tokens', label: 'Tokens', icon: Coins, desc: 'BTS-20 tokens by holders' },
    { id: 'rich-list', label: 'Rich List', icon: Trophy, desc: 'Largest BTN balances' },
    { id: 'blocks', label: 'Blocks', icon: Hash, desc: 'Latest blocks, miners and rewards' },
    { id: 'mining', label: 'Mining', icon: Cpu, desc: 'Hashrate, pools and the mining calculator' },
    { id: 'nodes', label: 'Network & RPC', icon: Activity, desc: 'Chain parameters, Ethash epoch and DAG, pools, API and RPC status' },
    { id: 'console', label: 'RPC Console', icon: Terminal, desc: 'Send RPC calls to a Bitnet node' },
  ];

  const filteredLinks = quickLinks.filter(
    (item) => item.label.toLowerCase().includes(query.toLowerCase()) || item.desc.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-start justify-center p-4 pt-16 sm:pt-24 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl border border-slate-200 max-w-xl w-full shadow-2xl overflow-hidden relative animate-scale-in"
      >
        {/* Search input bar */}
        <form onSubmit={handleSubmit} className="relative border-b border-slate-200">
          <Search className="w-5 h-5 text-slate-400 absolute left-5 top-1/2 -translate-y-1/2" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Block, Txn Hash, Address (0x...), or Page..."
            className="w-full bg-transparent pl-13 pr-12 py-4 text-sm sm:text-base font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block absolute right-4 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold text-slate-500 shadow-2xs">
              ESC
            </kbd>
          )}
        </form>

        {/* Content list */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-2">
          {/* Direct search interpretation pill if matches */}
          {(isAddress || isTx || isBlockNum) && (
            <div
              onClick={handleSubmit}
              className="p-3 rounded-2xl bg-petrol-50 border border-petrol-200 flex items-center justify-between cursor-pointer hover:bg-petrol-100/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-petrol text-white flex items-center justify-center">
                  {isAddress ? <Wallet className="w-4 h-4" /> : isTx ? <ArrowRight className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-petrol">
                    {isAddress ? 'Go to Address' : isTx ? 'Go to Transaction' : 'Go to Block'}
                  </span>
                  <div className="text-xs font-mono font-bold text-slate-900 truncate max-w-sm">
                    {clean}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-petrol font-bold">
                <span>Go</span>
                <CornerDownLeft className="w-3.5 h-3.5" />
              </div>
            </div>
          )}

          {/* Quick navigation links */}
          <div className="px-2 pt-2 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Quick Navigation & Pages
          </div>

          {filteredLinks.map((link) => {
            const Icon = link.icon;
            return (
              <div
                key={link.id}
                onClick={() => {
                  onNavigate(link.id);
                  onClose();
                }}
                className="p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-petrol/10 text-slate-600 group-hover:text-petrol flex items-center justify-center transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-petrol transition-colors">
                      {link.label}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {link.desc}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-petrol group-hover:translate-x-0.5 transition-all" />
              </div>
            );
          })}
        </div>

        {/* Footer shortcuts hint */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono font-bold text-slate-700">⌘K</kbd>
            <span>or</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono font-bold text-slate-700">Ctrl+K</kbd>
          </div>
          <span>Bitnet · Chain ID 210</span>
        </div>
      </div>
    </div>
  );
};
