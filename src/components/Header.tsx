import React, { useState, useEffect } from 'react';
import { 
  Search, Shield, Cpu, Layers, ArrowRightLeft, Coins, Image, Terminal, 
  Activity, Menu, X, PlusCircle, CheckCircle2, Globe, Trophy, Radio, Command,
  FileCode
} from 'lucide-react';
import { NetworkStats } from '../types/blockchain';
import { priceService, BtnPriceData } from '../services/priceService';
import { rpcService } from '../services/rpc';
import { QuickSearchModal } from './QuickSearchModal';
import { NetworkStatusModal } from './NetworkStatusModal';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
  stats: NetworkStats | null;
  onSearch: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, stats, onSearch }) => {
  const [searchInput, setSearchInput] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addedToWallet, setAddedToWallet] = useState(false);
  const [priceData, setPriceData] = useState<BtnPriceData>(priceService.getCachedPrice());
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [rpcLatency, setRpcLatency] = useState<number>(24);

  useEffect(() => {
    const unsubPrice = priceService.subscribe((data) => {
      setPriceData(data);
    });

    const unsubHealth = rpcService.subscribeHealth((st) => {
      setRpcLatency(st.latencyMs);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      unsubPrice();
      unsubHealth();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    onSearch(searchInput.trim());
  };


  const handleAddToMetaMask = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        await (window as any).ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xd2', // 210 in hex
            chainName: 'Bitnet Mainnet',
            nativeCurrency: {
              name: 'Bitnet',
              symbol: 'BTN',
              decimals: 18,
            },
            rpcUrls: ['https://rpc.bitnetmoney.org/', 'https://rpc.bitnetmoney.com/'],
            blockExplorerUrls: [window.location.origin],
          }],
        });
        setAddedToWallet(true);
        setTimeout(() => setAddedToWallet(false), 4000);
      } catch (err) {
        console.error('Failed to add Bitnet to wallet:', err);
      }
    } else {
      alert('MetaMask or Web3 wallet is not detected. Please install MetaMask to add Bitnet.');
    }
  };

  const navItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: Layers,
      iconBg: 'bg-teal-50 text-[#016976] border border-teal-200/60',
      activeClass: 'bg-[#016976] text-white shadow-xs',
      hoverClass: 'hover:bg-teal-50/70 hover:text-[#016976] text-slate-700'
    },
    { 
      id: 'rich-list', 
      label: 'Rich List', 
      icon: Trophy,
      iconBg: 'bg-amber-50 text-[#D68142] border border-amber-200/60',
      activeClass: 'bg-[#D68142] text-white shadow-xs',
      hoverClass: 'hover:bg-amber-50/70 hover:text-amber-700 text-slate-700'
    },
    { 
      id: 'tokens', 
      label: 'BTS-20', 
      icon: Coins,
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-200/60',
      activeClass: 'bg-emerald-600 text-white shadow-xs',
      hoverClass: 'hover:bg-emerald-50/70 hover:text-emerald-700 text-slate-700'
    },
    { 
      id: 'nfts', 
      label: 'NFTs', 
      icon: Image,
      iconBg: 'bg-purple-50 text-purple-600 border border-purple-200/60',
      activeClass: 'bg-purple-600 text-white shadow-xs',
      hoverClass: 'hover:bg-purple-50/70 hover:text-purple-700 text-slate-700'
    },
    { 
      id: 'contracts', 
      label: 'Contracts', 
      icon: FileCode,
      iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-200/60',
      activeClass: 'bg-indigo-600 text-white shadow-xs',
      hoverClass: 'hover:bg-indigo-50/70 hover:text-indigo-700 text-slate-700'
    },
    { 
      id: 'mining', 
      label: 'Mining', 
      icon: Cpu,
      iconBg: 'bg-orange-50 text-orange-600 border border-orange-200/60',
      activeClass: 'bg-orange-600 text-white shadow-xs',
      hoverClass: 'hover:bg-orange-50/70 hover:text-orange-700 text-slate-700'
    },
    { 
      id: 'console', 
      label: 'Console', 
      icon: Terminal,
      iconBg: 'bg-sky-50 text-sky-600 border border-sky-200/60',
      activeClass: 'bg-sky-600 text-white shadow-xs',
      hoverClass: 'hover:bg-sky-50/70 hover:text-sky-700 text-slate-700'
    },
    { 
      id: 'nodes', 
      label: 'Nodes', 
      icon: Activity,
      iconBg: 'bg-rose-50 text-rose-600 border border-rose-200/60',
      activeClass: 'bg-rose-600 text-white shadow-xs',
      hoverClass: 'hover:bg-rose-50/70 hover:text-rose-700 text-slate-700'
    },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-xs">
      {/* Top micro-ticker banner with sharp high-contrast background */}
      <div className="bg-slate-900 border-b border-slate-800 py-1.5 px-3 sm:px-6 lg:px-8 text-xs text-slate-300">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => setShowNetworkModal(true)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-700 text-xs transition-colors cursor-pointer group"
              title="View Bitnet RPC & Node Health Status"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#22C55E] animate-pulse"></span>
              <span className="text-white font-bold">Bitnet Mainnet (Chain 210)</span>
              <span className="text-emerald-400 text-[10px] font-mono font-bold bg-slate-900/60 px-1.5 py-0.5 rounded group-hover:bg-slate-900 min-w-[58px] text-center inline-flex items-center justify-center tabular-nums">
                {rpcLatency}ms
              </span>
            </button>
            <div className="hidden sm:flex items-center gap-1">
              <span className="text-slate-400 font-medium">Block:</span>
              <span className="text-sky-400 font-mono font-bold">
                #{stats ? stats.latestBlock.toLocaleString() : 'Loading...'}
              </span>
            </div>
            <div className="hidden md:flex items-center gap-1">
              <span className="text-slate-400 font-medium">Gas:</span>
              <span className="text-amber-400 font-mono font-bold">
                {stats?.gasPriceGwei !== null && stats?.gasPriceGwei !== undefined ? `${stats.gasPriceGwei} Gwei` : 'Unknown'}
              </span>
            </div>
            <div className="hidden lg:flex items-center gap-1">
              <span className="text-slate-400 font-medium">Reward:</span>
              <span className="text-emerald-400 font-mono font-bold">
                1.0 BTN / block
              </span>
            </div>
            <div className="hidden xl:flex items-center gap-1">
              <span className="text-slate-400 font-medium">Hashrate:</span>
              <span className="text-orange-400 font-mono font-bold">
                {stats?.hashrateEstimate || 'Active'}
              </span>
            </div>

            {/* Live NestEx BTN/USDT Spot Price */}
            <a
              href="https://trade.nestex.one/spot/BTN"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700/80 text-xs transition-colors group cursor-pointer"
              title="NestEx BTN/USDT Live Spot Exchange"
            >
              <span className="text-slate-400 font-medium">BTN:</span>
              <span className="text-white font-mono font-bold group-hover:text-sky-300 transition-colors">
                {priceData.priceFormatted}
              </span>
              <span className={`text-[11px] font-bold ${priceData.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {priceData.change24hFormatted}
              </span>
              <span className="text-[9px] text-slate-300 font-medium bg-slate-700 px-1 py-0.2 rounded">
                NestEx
              </span>
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAddToMetaMask}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold border border-slate-700 text-xs transition-all cursor-pointer shadow-xs"
              title="Add Bitnet Network to MetaMask"
            >
              {addedToWallet ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Bitnet Added</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5 text-sky-400" />
                  <span>Add Bitnet to Wallet</span>
                </>
              )}
            </button>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <div className="hidden sm:flex items-center gap-1 text-slate-300 text-xs font-semibold">
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>Ethash PoW</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main navigation header */}
      <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-2">
        <div className="flex items-center justify-between gap-2 lg:gap-3">
          {/* Logo with official Blue Bitnet icon */}
          <div 
            onClick={() => onNavigate('dashboard')} 
            className="flex items-center gap-2.5 cursor-pointer group flex-shrink-0"
          >
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white border border-slate-200 p-1.5 shadow-sm group-hover:border-[#016976] group-hover:shadow-md transition-all flex items-center justify-center">
              <img 
                src="/bitnet-logo-blue.svg" 
                alt="Bitnet" 
                className="w-full h-full object-contain group-hover:scale-105 transition-transform" 
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 group-hover:text-[#016976] transition-colors">
                  Bitnet<span className="text-[#016976]">Scan</span>
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium -mt-0.5 hidden sm:block">Bitnet Money Block Explorer</p>
            </div>
          </div>

          {/* Search bar in header (wide & spacious with full address visibility, fluid) */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 min-w-0 max-w-xs md:max-w-sm lg:max-w-md xl:max-w-xl mx-2">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by Address / Txn Hash / Block # (0x...)"
                className="w-full pl-9 pr-28 py-1.5 xl:py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-[#016976] rounded-xl text-xs xl:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#016976]/20 transition-all font-mono shadow-2xs"
              />
              <div className="absolute inset-y-0 right-20 hidden xl:flex items-center">
                <button
                  type="button"
                  onClick={() => setShowSearchModal(true)}
                  className="px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-[10px] font-mono font-bold text-slate-600 transition-colors cursor-pointer"
                  title="Command Palette (⌘K)"
                >
                  ⌘K
                </button>
              </div>
              <button
                type="submit"
                className="absolute inset-y-1 right-1 px-3 bg-[#016976] hover:bg-[#015661] text-white font-bold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                Search
              </button>
            </div>
          </form>

          {/* Desktop Nav menu */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 text-xs font-semibold flex-shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`px-2 xl:px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all text-xs font-bold cursor-pointer whitespace-nowrap ${
                    isActive
                      ? item.activeClass
                      : `${item.hoverClass} hover:bg-slate-50`
                  }`}
                >
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors ${
                    isActive ? 'bg-white/20 text-white' : item.iconBg
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Mobile hamburger button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 shadow-sm cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search input */}
        <form onSubmit={handleSearchSubmit} className="mt-3 md:hidden">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search Address / Tx / Block..."
              className="w-full pl-9 pr-16 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 font-mono"
            />
            <button
              type="submit"
              className="absolute right-1 top-1 bottom-1 px-3 bg-[#016976] text-white font-bold text-xs rounded-lg cursor-pointer"
            >
              Go
            </button>
          </div>
        </form>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-slate-200 flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2 rounded-xl flex items-center gap-2.5 transition-all text-xs font-bold cursor-pointer ${
                    isActive
                      ? item.activeClass
                      : `${item.hoverClass} hover:bg-slate-50`
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    isActive ? 'bg-white/20 text-white' : item.iconBg
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Search Command Palette (Cmd+K) */}
      <QuickSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSearch={onSearch}
        onNavigate={onNavigate}
      />

      {/* Network Status & Live RPC Health Modal */}
      <NetworkStatusModal
        isOpen={showNetworkModal}
        onClose={() => setShowNetworkModal(false)}
        latestBlock={stats?.latestBlock}
        gasPriceGwei={stats?.gasPriceGwei}
        peerCount={stats?.peerCount}
      />
    </header>
  );
};
