import React, { useState, useEffect } from 'react';
import { 
  Cpu, Layers, Coins, Image, Terminal, 
  Activity, Menu, X, PlusCircle, CheckCircle2, Globe, Trophy,
  FileCode
} from 'lucide-react';
import { NetworkStats } from '../types/blockchain';
import { priceService, BtnPriceData } from '../services/priceService';
import { rpcService } from '../services/rpc';
import { QuickSearchModal } from './QuickSearchModal';
import { NetworkStatusModal } from './NetworkStatusModal';
import { BitnetScanIcon } from './BitnetScanIcon';
import { SearchBox } from './SearchBox';

interface HeaderProps {
  currentView: string;
  /** Identifies the visible page including its parameter; the search box clears when it changes. */
  routeKey: string;
  onNavigate: (view: string, param?: string | number) => void;
  stats: NetworkStats | null;
  onSearch: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, routeKey, onNavigate, stats, onSearch }) => {
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
    <>
      {/* Top micro-ticker banner (scrolls away so the sticky nav stays compact on phones) */}
      <div className="bg-slate-900 border-b border-slate-800 py-1.5 px-3 sm:px-6 lg:px-8 text-xs text-slate-300">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3">
          
          {/* Left group: Bitnet Chain Node Button + BTN Price */}
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 w-full sm:w-auto min-w-0">
            {/* Bitnet Chain & Node Status Button */}
            <button
              onClick={() => setShowNetworkModal(true)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-2 py-0.5 sm:px-2.5 rounded-lg border border-slate-700 text-xs transition-colors cursor-pointer group shrink-0"
              title="View Bitnet RPC & Node Health Status"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#22C55E] animate-pulse shrink-0"></span>
              <span className="text-white font-bold text-[11px] sm:text-xs">
                <span className="sm:hidden">Bitnet (210)</span>
                <span className="hidden sm:inline">Bitnet Mainnet (Chain 210)</span>
              </span>
              <span className="text-emerald-400 text-[10px] font-mono font-bold bg-slate-900/60 px-1.5 py-0.5 rounded group-hover:bg-slate-900 text-center inline-flex items-center justify-center tabular-nums">
                {rpcLatency}ms
              </span>
            </button>

            {/* Live NestEx BTN/USDT Spot Price */}
            <a
              href="https://trade.nestex.one/spot/BTN"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 sm:gap-1.5 bg-slate-800/90 hover:bg-slate-800 px-2 py-0.5 sm:px-2.5 rounded-lg border border-slate-700/80 text-xs transition-colors group cursor-pointer shrink-0"
              title="NestEx BTN/USDT Live Spot Exchange"
            >
              <span className="text-slate-400 font-medium text-[11px] sm:text-xs">BTN:</span>
              <span className="text-white font-mono font-bold text-[11px] sm:text-xs group-hover:text-sky-300 transition-colors">
                {priceData.priceFormatted}
              </span>
              <span className={`text-[10px] sm:text-[11px] font-bold ${!priceData.available ? 'text-slate-400' : priceData.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {priceData.change24hFormatted}
              </span>
              <span className="text-[9px] text-slate-300 font-medium bg-slate-700 px-1 py-px rounded hidden sm:inline">
                NestEx
              </span>
            </a>

            {/* Desktop Ticker Items */}
            <div className="hidden md:flex items-center gap-1">
              <span className="text-slate-400 font-medium">Block:</span>
              <span className="text-sky-400 font-mono font-bold">
                #{stats ? stats.latestBlock.toLocaleString() : 'Loading...'}
              </span>
            </div>
            <div className="hidden lg:flex items-center gap-1">
              <span className="text-slate-400 font-medium">Gas:</span>
              <span className="text-amber-400 font-mono font-bold">
                {stats?.gasPriceGwei !== null && stats?.gasPriceGwei !== undefined ? `${stats.gasPriceGwei} Gwei` : 'Unknown'}
              </span>
            </div>
            <div className="hidden xl:flex items-center gap-1">
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
          </div>

          {/* Right group (tablet & desktop): Add Wallet + PoW Badge. On phones the wallet button lives in the menu. */}
          <div className="hidden sm:flex items-center justify-end gap-3 shrink-0">
            <button
              onClick={handleAddToMetaMask}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold border border-slate-700 text-xs transition-all cursor-pointer"
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
            <div className="hidden lg:flex items-center gap-1.5 text-slate-400 text-xs font-mono shrink-0">
              <span className="text-slate-700">|</span>
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>Ethash PoW</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main navigation header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-2">
        <div className="flex items-center justify-between gap-2 lg:gap-3">
          {/* Logo with BitnetScan brand icon & rotating inner block */}
          <button
            type="button"
            onClick={() => { onNavigate('dashboard'); setMobileMenuOpen(false); }}
            className="flex items-center gap-2.5 cursor-pointer group flex-shrink-0 text-left"
            aria-label="BitnetScan home"
          >
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white border border-slate-200 p-1.5 shadow-sm group-hover:border-[#015866] group-hover:shadow-md transition-all flex items-center justify-center overflow-hidden">
              <BitnetScanIcon 
                animated={true}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform" 
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#162334] group-hover:text-[#015866] transition-colors">
                  Bitnet<span className="text-[#015866]">Scan</span>
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium -mt-0.5 hidden sm:block">Bitnet Money Block Explorer</p>
            </div>
          </button>

          {/* Search bar in header with live previews */}
          <div className="hidden md:flex flex-1 min-w-0 max-w-xs md:max-w-sm lg:max-w-md xl:max-w-xl mx-2">
            <SearchBox
              size="md"
              routeKey={routeKey}
              onNavigate={(view, param) => onNavigate(view, param)}
              onSearch={onSearch}
              onOpenPalette={() => setShowSearchModal(true)}
            />
          </div>

          {/* Desktop Nav menu */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 text-xs font-semibold flex-shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-1.5 xl:px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all text-xs font-bold cursor-pointer whitespace-nowrap ${
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
                  <span className="hidden xl:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Mobile hamburger button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 shadow-sm cursor-pointer"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search input with live previews */}
        <div className="mt-2 md:hidden">
          <SearchBox
            size="sm"
            routeKey={routeKey}
            onNavigate={(view, param) => { setMobileMenuOpen(false); onNavigate(view, param); }}
            onSearch={(query) => { setMobileMenuOpen(false); onSearch(query); }}
            placeholder="Address, tx hash or block #"
            submitLabel="Go"
          />
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <nav className="lg:hidden mt-2 pt-2 border-t border-slate-200 max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain" aria-label="Main">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
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
                    aria-current={isActive ? 'page' : undefined}
                    className={`px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-all text-xs font-bold cursor-pointer border ${
                      isActive
                        ? `${item.activeClass} border-transparent`
                        : `${item.hoverClass} bg-white border-slate-200 hover:bg-slate-50`
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : item.iconBg
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleAddToMetaMask}
              className="sm:hidden mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all cursor-pointer"
            >
              {addedToWallet ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Bitnet Added</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4 text-sky-400" />
                  <span>Add Bitnet to Wallet</span>
                </>
              )}
            </button>
          </nav>
        )}
      </div>
      </header>

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
    </>
  );
};
