import React, { useCallback, useEffect, useRef, useState } from 'react';
import { 
  Image as ImageIcon, Search, RefreshCw, X, Layers, 
  ArrowRightLeft, Loader2, AlertCircle, ChevronLeft, ChevronRight,
  CheckCircle2, Shield, Sparkles, Copy, Check, Users
} from 'lucide-react';
import { BITNET_NFT_COLLECTIONS, NftCollection, NftItem } from '../data/nftCollections';
import { NftImage } from '../components/NftImage';
import { nftSyncService, NftSyncResult } from '../services/nftSyncService';
import { ZERO_ADDRESS } from '../services/nftData';

interface NftsViewProps { 
  onSelectAddress: (address: string) => void; 
  onSelectTx?: (txHash: string) => void;
}
const shortAddress = (address: string) => address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Unknown';
const count = (value: number | null) => value == null ? '0' : value.toLocaleString();
const date = (value?: string) => value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unavailable';
const statusLabel = (status: NftCollection['dataStatus']) => ({
  unloaded: 'Awaiting indexer', indexed: 'Live Indexed', cached: 'Cached', partial: 'Partial data', error: 'Offline',
}[status]);
const PAGE_SIZE = 24;

export const NftsView: React.FC<NftsViewProps> = ({ onSelectAddress, onSelectTx }) => {
  const [collections, setCollections] = useState(() => nftSyncService.getInitialCollections());
  const [selectedId, setSelectedId] = useState('bitnet-punks');
  const [tab, setTab] = useState<'gallery' | 'holders' | 'activity'>('gallery');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const [sync, setSync] = useState<NftSyncResult | null>(null);
  const [modal, setModal] = useState<{ contract: string; collectionName: string; item: NftItem } | null>(null);
  const [checking, setChecking] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [customContract, setCustomContract] = useState('');
  const [customTokenId, setCustomTokenId] = useState('1');
  const [customError, setCustomError] = useState('');
  const [customLoading, setCustomLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const mounted = useRef(false), busy = useRef(false), inspection = useRef(0);

  const copyToClipboard = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setSyncing(true);
    try {
      const result = await nftSyncService.syncOnChainCollections();
      if (mounted.current) { setCollections(result.collections); setSync(result); }
    } catch {
      if (mounted.current) setSync({ collections: [], status: 'error', syncedAt: null, message: 'NFT refresh failed. Displayed cached records may be outdated.' });
    } finally {
      busy.current = false;
      if (mounted.current) setSyncing(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => { mounted.current = false; inspection.current++; clearInterval(interval); };
  }, [refresh]);

  useEffect(() => { setPage(1); }, [selectedId, query, tab]);

  const active = collections.find(collection => collection.id === selectedId) || collections[0];
  
  // Aggregate stats across all collections
  const totalSupply = collections.reduce((sum, collection) => sum + (collection.totalSupply ?? collection.items.length ?? 0), 0);
  const totalMints = collections.reduce((sum, collection) => sum + (collection.minted ?? collection.recentTransfers.length ?? collection.items.length ?? 0), 0);
  const totalHolders = new Set(collections.flatMap(collection => collection.holders.map(holder => holder.address.toLowerCase()))).size;

  const filtered = active?.items.filter(item => {
    const search = query.trim().toLowerCase();
    return !search || item.name.toLowerCase().includes(search) || item.id === search.replace(/^#/, '') || item.owner.toLowerCase().includes(search);
  }) || [];

  const pageCount = Math.max(1, Math.ceil((tab === 'gallery' ? filtered.length : tab === 'activity' ? active?.recentTransfers.length || 0 : active?.holders.length || 0) / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const inspect = async (collection: NftCollection, item: NftItem) => {
    const request = ++inspection.current;
    setModal({ contract: collection.contract, collectionName: collection.name, item });
    setChecking(true); setDetailError('');
    try {
      const checked = await nftSyncService.getNftDetails(collection.contract, item.id, item);
      if (mounted.current && request === inspection.current) setModal({ contract: collection.contract, collectionName: collection.name, item: checked });
    } catch (error) {
      if (mounted.current && request === inspection.current) setDetailError(error instanceof Error ? error.message : 'RPC verification unavailable.');
    } finally { if (mounted.current && request === inspection.current) setChecking(false); }
  };

  const inspectCustom = async (event: React.FormEvent) => {
    event.preventDefault();
    const request = ++inspection.current;
    setCustomLoading(true); setCustomError('');
    try {
      const item = await nftSyncService.getNftDetails(customContract, customTokenId);
      if (mounted.current && request === inspection.current) {
        setModal({ contract: customContract.trim().toLowerCase(), collectionName: 'ERC-721 token', item });
        setDetailError(''); setChecking(false);
      }
    } catch (error) {
      if (mounted.current && request === inspection.current) setCustomError(error instanceof Error ? error.message : 'NFT inspection failed.');
    } finally { if (mounted.current) setCustomLoading(false); }
  };

  const closeModal = () => { inspection.current++; setModal(null); setChecking(false); };

  const knownAddresses = new Set(BITNET_NFT_COLLECTIONS.map(collection => collection.contract.toLowerCase()));
  const knownCollections = collections.filter(collection => knownAddresses.has(collection.contract.toLowerCase()));
  const additionalCollections = collections.filter(collection => !knownAddresses.has(collection.contract.toLowerCase()));

  const collectionCards = (rows: NftCollection[]) => rows.map(collection => {
    const isSelected = active?.id === collection.id;
    return (
      <button 
        key={collection.id} 
        onClick={() => { setSelectedId(collection.id); setQuery(''); }} 
        className={`text-left p-4 rounded-2xl border transition-all relative flex flex-col justify-between ${
          isSelected 
            ? 'bg-teal-50/70 border-[#016976] ring-2 ring-[#016976]/30 shadow-xs' 
            : 'bg-white border-slate-200 hover:border-teal-300 hover:shadow-xs'
        }`}
      >
        <div className="flex items-center gap-3 w-full">
          <div className="relative flex-shrink-0">
            <NftImage 
              refreshKey={collection.syncedAt} 
              src={collection.iconImage} 
              alt={collection.name} 
              className="w-12 h-12 rounded-xl object-cover shadow-2xs border border-slate-100" 
            />
            {collection.verified && (
              <span className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#016976]" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                {collection.symbol || 'NFT'}
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                collection.dataStatus === 'indexed' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-500'
              }`}>
                {statusLabel(collection.dataStatus)}
              </span>
            </div>
            <h3 className="font-bold text-sm text-slate-900 truncate mt-1">{collection.name}</h3>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 w-full">
          <div className="text-[10px] font-mono text-slate-400 truncate mb-2">
            {shortAddress(collection.contract)}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
              <Users className="w-3 h-3 text-[#016976] flex-shrink-0" />
              <span className="truncate font-semibold">{count(collection.holdersCount ?? collection.holders.length)} Hodl</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
              <ArrowRightLeft className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span className="truncate font-semibold">{count(collection.recentTransfers.length || collection.minted)} Txs</span>
            </div>
          </div>
        </div>
      </button>
    );
  });

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600 shadow-xs flex-shrink-0">
              <ImageIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider text-purple-600 uppercase">BITNET L1</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">BTS-721 / ERC-721</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">NFT & Digital Asset Explorer</h1>
            </div>
          </div>
          <button 
            onClick={refresh} 
            disabled={syncing} 
            className="self-start sm:self-center flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#016976] border border-teal-200 text-xs font-bold transition-colors disabled:opacity-60 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing On-Chain…' : 'Refresh Live Data'}</span>
          </button>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-bold uppercase">Collections</span>
              <div className="w-6 h-6 rounded-lg bg-teal-100 text-[#016976] flex items-center justify-center">
                <Layers className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-900 mt-2">{collections.length} Active</div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Verified contracts</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-bold uppercase">Total Supply</span>
              <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                <ImageIcon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-900 mt-2">{count(totalSupply)}</div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Minted digital items</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-bold uppercase">Hodl Sayısı</span>
              <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-900 mt-2">{count(totalHolders)} Hodlers</div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Unique asset holders</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-bold uppercase">Transactions</span>
              <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-900 mt-2">{count(totalMints)} Txs</div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Mints & transfers</div>
          </div>
        </div>
      </div>

      {/* Featured Collections Selector */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#016976]" />
            Featured Collections ({knownCollections.length})
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {collectionCards(knownCollections)}
        </div>
        {additionalCollections.length > 0 && (
          <details className="mt-4">
            <summary className="text-sm font-bold text-slate-600 cursor-pointer hover:text-slate-900">
              Additional indexed contracts ({additionalCollections.length})
            </summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mt-3">
              {collectionCards(additionalCollections)}
            </div>
          </details>
        )}
      </section>

      {/* Active Collection Showcase */}
      {active && (
        <section className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          {/* Collection Hero Header */}
          <div className="p-5 sm:p-7 bg-slate-50/70 border-b border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="relative flex-shrink-0">
                  <NftImage 
                    refreshKey={active.syncedAt} 
                    src={active.iconImage} 
                    alt={active.name} 
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white shadow-sm" 
                  />
                  {active.verified && (
                    <span className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-2xs">
                      <CheckCircle2 className="w-4 h-4 text-[#016976]" />
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{active.name}</h2>
                    {active.symbol && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 font-mono text-xs font-bold">
                        {active.symbol}
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-[#016976]">
                      {active.standard}
                    </span>
                  </div>

                  {/* Contract Address with Copy & Link */}
                  <div className="flex items-center gap-2 mt-2">
                    <button 
                      onClick={() => onSelectAddress(active.contract)} 
                      className="text-xs font-mono text-[#016976] hover:underline font-medium break-all text-left"
                    >
                      {active.contract}
                    </button>
                    <button 
                      onClick={(e) => copyToClipboard(active.contract, e)}
                      title="Copy contract address"
                      className="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors"
                    >
                      {copiedText === active.contract ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {active.description && (
                    <p className="text-xs text-slate-600 mt-2 max-w-2xl leading-relaxed">
                      {active.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Badges / Stats Pill Group */}
              <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  active.dataStatus === 'indexed' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-700'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${active.dataStatus === 'indexed' ? 'bg-teal-500' : 'bg-slate-400'}`}></span>
                  {statusLabel(active.dataStatus)}
                </span>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
                    <Users className="w-3.5 h-3.5 text-[#016976]" />
                    <strong>{count(active.holdersCount ?? active.holders.length)}</strong> Hodlers
                  </span>
                  <span className="flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                    <strong>{count(active.recentTransfers.length || active.minted)}</strong> Txs
                  </span>
                </div>
              </div>
            </div>

            {/* Tabs & Search Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6 pt-5 border-t border-slate-200">
              {/* Tab Switcher */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-xl overflow-x-auto">
                <button 
                  onClick={() => setTab('gallery')} 
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    tab === 'gallery' ? 'bg-[#016976] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Gallery</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${tab === 'gallery' ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-700'}`}>
                    {filtered.length}
                  </span>
                </button>

                <button 
                  onClick={() => setTab('holders')} 
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    tab === 'holders' ? 'bg-[#016976] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Hodl / Holders</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${tab === 'holders' ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-700'}`}>
                    {active.holders.length || active.holdersCount || 0}
                  </span>
                </button>

                <button 
                  onClick={() => setTab('activity')} 
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    tab === 'activity' ? 'bg-[#016976] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Transactions</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${tab === 'activity' ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-700'}`}>
                    {active.recentTransfers.length || 0}
                  </span>
                </button>
              </div>

              {/* Search Bar */}
              {tab === 'gallery' && (
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input 
                    value={query} 
                    onChange={event => setQuery(event.target.value)} 
                    placeholder="Search by ID (#714) or Owner…" 
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 bg-white placeholder-slate-400 text-slate-900 focus:outline-none focus:border-[#016976] focus:ring-1 focus:ring-[#016976] shadow-2xs" 
                  />
                  {query && (
                    <button 
                      onClick={() => setQuery('')} 
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* TAB 1: GALLERY */}
          {tab === 'gallery' && (
            <div className="p-4 sm:p-6">
              {!filtered.length && (
                <div className="py-12 text-center text-slate-500">
                  <ImageIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold">No NFTs found matching "{query}"</p>
                  <button 
                    onClick={() => setQuery('')} 
                    className="mt-2 text-xs text-[#016976] font-bold hover:underline"
                  >
                    Clear search filter
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {filtered.slice(offset, offset + PAGE_SIZE).map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => inspect(active, item)}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-[#016976] hover:shadow-md transition-all cursor-pointer group flex flex-col"
                  >
                    <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
                      <NftImage 
                        refreshKey={active.syncedAt} 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                      <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded-lg font-bold shadow-xs">
                        #{item.id}
                      </div>
                      {item.rarity && (
                        <div className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-lg font-bold shadow-xs ${item.rarityColor || 'bg-amber-500 text-white'}`}>
                          {item.rarity}
                        </div>
                      )}
                    </div>

                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-[#016976] transition-colors">
                          {item.name || `Token #${item.id}`}
                        </h3>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {item.traits.length > 0 ? `${item.traits.length} attributes` : 'Standard token'}
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                        <span className="font-mono truncate block">
                          {item.owner && item.owner.toLowerCase() !== ZERO_ADDRESS ? shortAddress(item.owner) : 'Genesis'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: HOLDERS (HODL SAYISI) */}
          {tab === 'holders' && (
            <div className="p-4 sm:p-6">
              <div className="mb-4 p-4 rounded-2xl bg-teal-50/60 border border-teal-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-teal-200 flex items-center justify-center text-[#016976] shadow-2xs">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Hodl Distribution</h3>
                    <p className="text-xs text-slate-600">
                      Total <strong>{count(active.holders.length || active.holdersCount)}</strong> wallets holding {count(active.totalSupply)} NFTs.
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5 w-16 text-center">Rank</th>
                      <th className="p-3.5">Hodl Wallet Address</th>
                      <th className="p-3.5 text-right">NFTs Held</th>
                      <th className="p-3.5 text-right">Share of Supply</th>
                      <th className="p-3.5">Token IDs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {active.holders.slice(offset, offset + PAGE_SIZE).map((holder, idx) => (
                      <tr key={holder.address.toLowerCase()} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5 text-center font-bold text-slate-500">
                          #{holder.rank || offset + idx + 1}
                        </td>
                        <td className="p-3.5 font-mono">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => onSelectAddress(holder.address)} 
                              className="text-[#016976] hover:underline font-bold"
                            >
                              {holder.address}
                            </button>
                            <button 
                              onClick={(e) => copyToClipboard(holder.address, e)}
                              className="text-slate-400 hover:text-slate-700 p-0.5"
                            >
                              {copiedText === holder.address ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                        <td className="p-3.5 text-right font-black text-slate-900">
                          {holder.quantity.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right font-bold text-teal-700">
                          {holder.percentage}
                        </td>
                        <td className="p-3.5 max-w-xs text-slate-600 font-mono text-[11px] truncate">
                          {holder.tokenIds.slice(0, 10).map(id => `#${id}`).join(', ')}
                          {holder.tokenIds.length > 10 && ` · +${holder.tokenIds.length - 10} more`}
                        </td>
                      </tr>
                    ))}
                    {!active.holders.length && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          No current holders in the indexed records.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: TRANSACTIONS / ACTIVITY */}
          {tab === 'activity' && (
            <div className="p-4 sm:p-6">
              <div className="mb-4 p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">On-Chain Transactions</h3>
                    <p className="text-xs text-slate-600">
                      Total <strong>{count(active.recentTransfers.length || active.minted)}</strong> recorded transfer and mint events.
                    </p>
                  </div>
                </div>
              </div>

              {active.recentTransfers.length ? (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">Tx Hash</th>
                        <th className="p-3.5">Event</th>
                        <th className="p-3.5">Token ID</th>
                        <th className="p-3.5">From</th>
                        <th className="p-3.5">To</th>
                        <th className="p-3.5 text-right">Block</th>
                        <th className="p-3.5 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {active.recentTransfers.slice(offset, offset + PAGE_SIZE).map((transfer, idx) => (
                        <tr key={`${transfer.hash}:${transfer.logIndex}:${transfer.tokenId}:${idx}`} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3.5 font-mono">
                            {onSelectTx ? (
                              <button 
                                onClick={() => onSelectTx(transfer.hash)} 
                                className="text-[#016976] font-bold hover:underline text-left cursor-pointer"
                              >
                                {shortAddress(transfer.hash)}
                              </button>
                            ) : (
                              <span className="text-slate-700 font-medium">
                                {shortAddress(transfer.hash)}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              transfer.type === 'MINT' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : transfer.type === 'BURN'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {transfer.type}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono font-bold text-slate-900">
                            #{transfer.tokenId}
                          </td>
                          <td className="p-3.5 font-mono">
                            {transfer.from.toLowerCase() === ZERO_ADDRESS ? (
                              <span className="text-slate-400 italic">Genesis (0x0)</span>
                            ) : (
                              <button onClick={() => onSelectAddress(transfer.from)} className="text-[#016976] hover:underline">
                                {shortAddress(transfer.from)}
                              </button>
                            )}
                          </td>
                          <td className="p-3.5 font-mono">
                            {transfer.to.toLowerCase() === ZERO_ADDRESS ? (
                              <span className="text-slate-400 italic">Burn (0x0)</span>
                            ) : (
                              <button onClick={() => onSelectAddress(transfer.to)} className="text-[#016976] hover:underline">
                                {shortAddress(transfer.to)}
                              </button>
                            )}
                          </td>
                          <td className="p-3.5 text-right font-mono text-slate-600">
                            {transfer.blockNumber.toLocaleString()}
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap text-slate-500">
                            {date(new Date(transfer.timestamp * 1000).toISOString())}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500">
                  <ArrowRightLeft className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm">No transaction events recorded yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination Controls */}
          {pageCount > 1 && (
            <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs bg-slate-50/50">
              <span className="text-slate-500 font-medium">Page {currentPage} of {pageCount}</span>
              <div className="flex gap-2">
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => setPage(currentPage - 1)} 
                  aria-label="Previous page" 
                  className="p-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-30 cursor-pointer shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  disabled={currentPage === pageCount} 
                  onClick={() => setPage(currentPage + 1)} 
                  aria-label="Next page" 
                  className="p-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-30 cursor-pointer shadow-2xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Inspect an ERC-721 NFT Tool */}
      <section className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#016976] shadow-xs">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Inspect Any ERC-721 NFT</h2>
            <p className="text-xs text-slate-500">Read live owner and original tokenURI metadata directly from the contract via Bitnet RPC.</p>
          </div>
        </div>

        <form onSubmit={inspectCustom} className="flex flex-col sm:flex-row gap-3 mt-5">
          <input 
            value={customContract} 
            onChange={event => setCustomContract(event.target.value)} 
            placeholder="Contract address (0x…)" 
            aria-label="NFT contract address" 
            className="flex-1 min-w-0 rounded-xl border border-slate-300 p-3 text-xs font-mono bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#016976] focus:ring-1 focus:ring-[#016976] shadow-2xs" 
            required 
          />
          <input 
            type="text" 
            inputMode="numeric" 
            pattern="[0-9]+" 
            value={customTokenId} 
            onChange={event => setCustomTokenId(event.target.value)} 
            placeholder="Token ID"
            aria-label="NFT token ID" 
            className="sm:w-36 rounded-xl border border-slate-300 p-3 text-xs font-mono bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#016976] focus:ring-1 focus:ring-[#016976] shadow-2xs" 
            required 
          />
          <button 
            type="submit"
            disabled={customLoading} 
            className="rounded-xl bg-[#016976] hover:bg-[#015661] px-5 py-3 text-xs font-bold text-white transition-colors disabled:opacity-60 cursor-pointer shadow-xs flex items-center justify-center gap-2"
          >
            {customLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>{customLoading ? 'Inspecting…' : 'Inspect NFT'}</span>
          </button>
        </form>
        {customError && (
          <p className="text-xs text-rose-700 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200" role="alert">
            {customError}
          </p>
        )}
      </section>

      {/* Detail Modal */}
      {modal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6" 
          onClick={closeModal}
        >
          <div 
            role="dialog" 
            aria-modal="true" 
            aria-label={modal.item.name} 
            className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100" 
            onClick={event => event.stopPropagation()}
          >
            <div className="flex justify-between items-start p-5 border-b border-slate-200">
              <div className="min-w-0">
                <h2 className="text-lg font-black text-slate-900 break-words">{modal.item.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{modal.collectionName} · Token #{modal.item.id}</p>
              </div>
              <button 
                onClick={closeModal} 
                aria-label="Close NFT details" 
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 grid md:grid-cols-2 gap-5">
              <div className="w-full">
                <NftImage 
                  src={modal.item.image} 
                  alt={modal.item.name} 
                  className="aspect-square w-full rounded-2xl object-cover shadow-sm border border-slate-100" 
                />
              </div>

              <div className="space-y-4 min-w-0">
                {checking && (
                  <p role="status" className="text-xs text-[#016976] flex gap-2 items-center p-2.5 rounded-xl bg-teal-50 border border-teal-100">
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    <span>Verifying live owner & metadata via RPC…</span>
                  </p>
                )}
                {detailError && (
                  <p role="alert" className="text-xs text-amber-800 flex gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{detailError}</span>
                  </p>
                )}
                {modal.item.metadataError && (
                  <p className="text-xs text-amber-800 p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    {modal.item.metadataError}
                  </p>
                )}

                <div className="text-xs space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <div>
                    <span className="text-slate-500 block text-[11px] font-medium">Current Owner</span>
                    {modal.item.owner ? (
                      <div className="flex items-center gap-2 mt-1">
                        <button 
                          onClick={() => { closeModal(); onSelectAddress(modal.item.owner); }} 
                          className="font-mono text-[#016976] font-bold break-all text-left hover:underline"
                        >
                          {modal.item.owner}
                        </button>
                        <button 
                          onClick={(e) => copyToClipboard(modal.item.owner, e)}
                          className="text-slate-400 hover:text-slate-700 p-0.5"
                        >
                          {copiedText === modal.item.owner ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400">Unavailable</span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] font-medium">Contract Address</span>
                    <span className="font-mono break-all text-slate-800 block mt-1">{modal.contract}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] font-medium">Mint Date</span>
                    <span className="text-slate-800 font-medium block mt-1">{date(modal.item.mintDate)}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-900 mb-2">Metadata Attributes</h3>
                  {modal.item.traits.length ? (
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                      {modal.item.traits.map((trait, index) => (
                        <div key={index} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs min-w-0">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold truncate">{trait.trait_type}</span>
                          <span className="text-slate-900 font-bold block truncate mt-0.5">{trait.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No attributes found in token metadata.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
