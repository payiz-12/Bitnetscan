import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu, Layers, Coins, Image, Terminal,
  Activity, Menu, X, PlusCircle, CheckCircle2, Globe, Trophy,
  FileCode, LineChart, PieChart, Box, ArrowRightLeft, GitBranch, ChevronDown, ShieldCheck, Wrench, Braces
} from 'lucide-react';
import { NetworkStats } from '../types/blockchain';
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
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [rpcLatency, setRpcLatency] = useState<number | null>(null);

  useEffect(() => {
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

  type NavLink = { id: string; label: string; icon: React.ComponentType<{ className?: string }>; description?: string };
  type NavGroup = { label: string; icon: React.ComponentType<{ className?: string }>; children: NavLink[] };
  const navEntries: (NavLink | NavGroup)[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    {
      label: 'Blockchain',
      icon: Box,
      children: [
        { id: 'blocks', label: 'Blocks', icon: Box, description: 'Latest blocks, miners and rewards' },
        { id: 'transactions', label: 'Transactions', icon: ArrowRightLeft, description: 'The full transaction archive' },
        { id: 'uncles', label: 'Uncle Blocks', icon: GitBranch, description: 'Uncles and uncle rate by miner' },
        { id: 'rich-list', label: 'Rich List', icon: Trophy, description: 'Largest BTN balances' },
      ],
    },
    {
      label: 'Tokens',
      icon: Coins,
      children: [
        { id: 'tokens', label: 'BTS-20 Tokens', icon: Coins, description: 'Fungible tokens on Bitnet' },
        { id: 'nfts', label: 'NFT Collections', icon: Image, description: 'BTS-721 collections and items' },
        { id: 'contracts', label: 'Verified Contracts', icon: FileCode, description: 'Contracts with published source' },
      ],
    },
    { id: 'mining', label: 'Mining', icon: Cpu },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'charts', label: 'Charts', icon: LineChart },
    { id: 'supply', label: 'Supply', icon: PieChart },
    {
      label: 'Network',
      icon: Activity,
      children: [
        { id: 'nodes', label: 'Network & RPC', icon: Activity, description: 'Chain parameters, endpoints and API' },
        { id: 'console', label: 'RPC Console', icon: Terminal, description: 'Send RPC calls to a Bitnet node' },
        { id: 'tools', label: 'Developer Tools', icon: Wrench, description: 'Unit converter, block by date, signature check' },
        { id: 'api', label: 'API', icon: Braces, description: 'Free JSON endpoints for chain data' },
      ],
    },
  ];
  const allLinks = navEntries.flatMap((e) => ('children' in e ? e.children : [e]));
  const isActive = (id: string) =>
    currentView === id ||
    (id === 'blocks' && currentView === 'block-detail') ||
    (id === 'transactions' && currentView === 'tx-detail');

  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => setOpenGroup(null), [routeKey]);
  useEffect(() => {
    if (!openGroup) return;
    const onDown = (e: MouseEvent) => { if (!navRef.current?.contains(e.target as Node)) setOpenGroup(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenGroup(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [openGroup]);

  const tabClass = (active: boolean) =>
    `relative flex items-center gap-1.5 px-3 h-10 text-[13px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
      active
        ? 'text-petrol after:absolute after:left-2 after:right-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-petrol'
        : 'text-slate-600 hover:text-petrol'
    }`;

  return (
    <>
      {/* Top micro-ticker banner (scrolls away so the sticky nav stays compact on phones) */}
      <div className="bg-slate-900 border-b border-slate-800 py-1.5 px-3 sm:px-6 lg:px-8 text-xs text-slate-300">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3">
          
          {/* Left group: network status + latest block and gas price */}
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 w-full sm:w-auto min-w-0">
            {/* Bitnet Chain & Node Status Button */}
            <button
              onClick={() => setShowNetworkModal(true)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-2 py-0.5 sm:px-2.5 rounded-lg border border-slate-700 text-xs transition-colors cursor-pointer group shrink-0"
              title="View Bitnet RPC & Node Health Status"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${rpcLatency !== null ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
              <span className="text-white font-bold text-[11px] sm:text-xs">
                <span className="sm:hidden">Bitnet (210)</span>
                <span className="hidden sm:inline">Bitnet Mainnet (Chain 210)</span>
              </span>
              <span className="text-emerald-400 text-[10px] font-mono font-bold bg-slate-900/60 px-1.5 py-0.5 rounded group-hover:bg-slate-900 text-center inline-flex items-center justify-center tabular-nums">
                {rpcLatency !== null ? `${rpcLatency}ms` : '…'}
              </span>
            </button>

            {/* Desktop Ticker Items */}
            <div className="flex items-center gap-1 text-[11px] sm:text-xs">
              <span className="text-slate-400 font-medium">Block:</span>
              <span className="text-sky-400 font-mono font-bold">
                {stats ? `#${stats.latestBlock.toLocaleString()}` : '…'}
              </span>
            </div>
            <div className="hidden md:flex items-center gap-1">
              <span className="text-slate-400 font-medium">Gas:</span>
              <span className="text-amber-400 font-mono font-bold">
                {stats?.gasPriceGwei !== null && stats?.gasPriceGwei !== undefined ? `${stats.gasPriceGwei} Gwei` : 'Unknown'}
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
          <div className="hidden md:flex flex-1 min-w-0 max-w-xl lg:max-w-2xl mx-2 lg:mr-0">
            <SearchBox
              size="md"
              routeKey={routeKey}
              onNavigate={(view, param) => onNavigate(view, param)}
              onSearch={onSearch}
              onOpenPalette={() => setShowSearchModal(true)}
            />
          </div>

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

        {/* Desktop navigation: every page named, related pages grouped in menus */}
        <nav ref={navRef} className="hidden lg:flex items-center gap-0.5 -mb-2 mt-1.5 border-t border-slate-100" aria-label="Main">
          {navEntries.map((entry) => {
            const Icon = entry.icon;
            if (!('children' in entry)) {
              const active = isActive(entry.id);
              return (
                <button key={entry.id} onClick={() => onNavigate(entry.id)} aria-current={active ? 'page' : undefined} className={tabClass(active)}>
                  <Icon className={`w-4 h-4 ${active ? 'text-petrol' : 'text-slate-400'}`} />
                  {entry.label}
                </button>
              );
            }
            const active = entry.children.some((c) => isActive(c.id));
            const open = openGroup === entry.label;
            return (
              <div key={entry.label} className="relative" onMouseLeave={() => open && setOpenGroup(null)}>
                <button
                  onClick={() => setOpenGroup(entry.label)}
                  onMouseEnter={() => setOpenGroup(entry.label)}
                  aria-haspopup="menu"
                  aria-expanded={open}
                  className={tabClass(active)}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-petrol' : 'text-slate-400'}`} />
                  {entry.label}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <div className="absolute left-0 top-full pt-1 z-50">
                    <div role="menu" className="w-72 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg animate-fade-in">
                      {entry.children.map((child) => {
                        const ChildIcon = child.icon;
                        const childActive = isActive(child.id);
                        return (
                          <button
                            key={child.id}
                            role="menuitem"
                            onClick={() => { setOpenGroup(null); onNavigate(child.id); }}
                            className={`w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-left cursor-pointer transition-colors ${childActive ? 'bg-petrol-50' : 'hover:bg-slate-50'}`}
                          >
                            <span className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${childActive ? 'bg-petrol text-white' : 'bg-petrol-50 text-petrol'}`}>
                              <ChildIcon className="w-4 h-4" />
                            </span>
                            <span className="min-w-0">
                              <span className={`block text-[13px] font-bold ${childActive ? 'text-petrol' : 'text-slate-900'}`}>{child.label}</span>
                              {child.description && <span className="block text-xs text-slate-500">{child.description}</span>}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

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
              {allLinks.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    aria-current={active ? 'page' : undefined}
                    className={`px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-all text-xs font-bold cursor-pointer border ${
                      active
                        ? 'bg-petrol text-white border-transparent shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-petrol-50 hover:text-petrol'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      active ? 'bg-white/20 text-white' : 'bg-petrol-50 text-petrol border border-petrol-100'
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
