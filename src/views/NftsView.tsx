import React, { useState, useEffect, useMemo } from 'react';
import { 
  Image, Search, ExternalLink, Code, Sparkles, CheckCircle2, 
  User, Globe, Trophy, Shield, Tag, ArrowRightLeft, Copy, Check, 
  X, Eye, Layers, Filter, ChevronRight, Coins, Plus, RefreshCw,
  Zap, Clock, ShieldCheck, AlertCircle, Loader2
} from 'lucide-react';
import { rpcService } from '../services/rpc';
import { 
  BITNET_NFT_COLLECTIONS, 
  NftCollection, 
  NftItem, 
  NftHolder, 
  NftTransfer 
} from '../data/nftCollections';
import { ipfsGatewayManager, nftSyncService, getAuthenticMintDate } from '../services/nftSyncService';

interface NftsViewProps {
  onSelectAddress: (addr: string) => void;
}

import { NftImage } from '../components/NftImage';

const formatMintDate = (dateStr?: string, contractOrId?: string): string => {
  const d = getAuthenticMintDate(contractOrId || '', dateStr);
  try {
    const [y, m, day] = d.split('-');
    if (y && m && day) {
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June', 
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const monthIndex = parseInt(m, 10) - 1;
      const monthName = (monthIndex >= 0 && monthIndex < 12) ? months[monthIndex] : m;
      return `${monthName} ${parseInt(day, 10)}, ${y}`;
    }
  } catch {}
  return d;
};

export const NftsView: React.FC<NftsViewProps> = ({ onSelectAddress }) => {
  // Dynamic on-chain collection state
  const [collections, setCollections] = useState<NftCollection[]>(() => nftSyncService.getStoredCollections());
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('bitnet-punks');
  const [activeTab, setActiveTab] = useState<'gallery' | 'holders' | 'activity'>('gallery');
  const [selectedNft, setSelectedNft] = useState<NftItem | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Live on-chain sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [syncStatusText, setSyncStatusText] = useState<string>('Live Synced');

  // Custom contract lookup state for developers
  const [customContract, setCustomContract] = useState('');
  const [customTokenId, setCustomTokenId] = useState('1');
  const [customResult, setCustomResult] = useState<any | null>(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  const activeCollection: NftCollection = 
    collections.find((c) => c.id === selectedCollectionId) || collections[0] || BITNET_NFT_COLLECTIONS[0];

  const copyToClipboard = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const seconds = Math.max(0, now - timestamp);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const handleCustomQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customContract.trim() || !customContract.startsWith('0x')) {
      setCustomError('Please enter a valid 0x BTS-721 contract address');
      return;
    }

    setCustomLoading(true);
    setCustomError(null);
    setCustomResult(null);

    try {
      const code = await rpcService.getCode(customContract.trim());
      if (!code || code === '0x') {
        setCustomError('No smart contract bytecode found at this address.');
        setCustomLoading(false);
        return;
      }

      let owner = 'Unknown';
      const idHex = BigInt(customTokenId || '1').toString(16).padStart(64, '0');
      try {
        const ownerHex = await rpcService.call(customContract.trim(), '0x6352211e' + idHex);
        if (ownerHex && ownerHex !== '0x' && ownerHex.length >= 66) {
          owner = '0x' + ownerHex.slice(26);
        }
      } catch {}

      setCustomResult({
        contract: customContract.trim(),
        tokenId: customTokenId,
        owner,
      });
    } catch (err: any) {
      setCustomError(err.message || 'Failed to query NFT');
    } finally {
      setCustomLoading(false);
    }
  };

  // Initial on-chain sync & background polling
  useEffect(() => {
    let isMounted = true;

    const doSync = async () => {
      setIsSyncing(true);
      try {
        const synced = await nftSyncService.syncOnChainCollections();
        if (isMounted && Array.isArray(synced) && synced.length > 0) {
          setCollections(synced);
          setLastSyncTime(new Date());
          setSyncStatusText('Live Synced');
        }
      } catch (err) {
        console.warn('On-chain sync error:', err);
      } finally {
        if (isMounted) setIsSyncing(false);
      }
    };

    doSync();

    // Periodically poll for new mints / contracts every 25 seconds
    const interval = setInterval(doSync, 25000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Pre-load images in background for active collection
  useEffect(() => {
    if (activeCollection?.items?.length) {
      const urls = activeCollection.items.map((it) => it.image);
      ipfsGatewayManager.prefetchImages(urls);
    }
  }, [activeCollection?.id]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatusText('Scanning Chain...');
    try {
      const synced = await nftSyncService.syncOnChainCollections();
      if (Array.isArray(synced) && synced.length > 0) {
        setCollections(synced);
        setLastSyncTime(new Date());
        setSyncStatusText('Updated');
        setTimeout(() => setSyncStatusText('Live Synced'), 3000);
      }
    } catch {
      setSyncStatusText('Sync Error');
    } finally {
      setIsSyncing(false);
    }
  };


  // Filter items in active collection gallery
  const filteredItems = activeCollection.items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.id.toString() === q.replace('#', '') ||
      item.owner.toLowerCase().includes(q)
    );
  });

  // Global aggregate stats
  const totalMinted = collections.reduce((acc, c) => acc + c.minted, 0);
  const totalHolders = collections.reduce((acc, c) => acc + c.holdersCount, 0);
  const totalVolume = collections.reduce((acc, c) => acc + c.volume24hBtn, 0);

  return (
    <div className="space-y-8 w-full animate-fade-in">
      {/* Top Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shadow-xs flex-shrink-0">
              <Image className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  BTS-721 Standard
                </span>
                <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Bitnet L1 PoW On-Chain NFTs
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Bitnet NFT & Digital Asset Explorer
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Official BTS-721 collections, artworks, holders, and on-chain ownership records minted on Bitnet L1.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Live Chain Sync Status Badge & Button */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
              <span className="text-xs font-semibold text-slate-700">
                {syncStatusText}
              </span>
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                title="Scan Chain for New Collections & Mints"
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-[#016976] transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#016976]' : ''}`} />
              </button>
            </div>

            <span className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-600">
              Chain ID: <strong className="text-slate-900">210</strong>
            </span>
          </div>
        </div>

        {/* Global Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Collections
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              {collections.length} Verified
            </div>
          </div>

          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total NFTs Minted
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-0.5">
              {totalMinted.toLocaleString()} <span className="text-xs text-slate-400 font-normal">NFT</span>
            </div>
          </div>

          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Holders
            </div>
            <div className="text-lg sm:text-xl font-black text-[#016976] font-mono mt-0.5">
              {totalHolders} <span className="text-xs text-teal-600 font-normal">Wallets</span>
            </div>
          </div>

          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              24h Volume
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-0.5">
              {totalVolume > 0 ? (
                <>
                  {totalVolume.toLocaleString()} <span className="text-xs text-slate-500 font-normal">BTN</span>
                </>
              ) : (
                <span className="text-slate-400 font-semibold text-sm">0 BTN (No active trades)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Collection Selector Cards */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#016976]" />
            <span>Verified NFT Collections on Bitnet</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">Select collection</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {collections.map((col) => {
            const isSelected = col.id === selectedCollectionId;
            return (
              <div
                key={col.id}
                onClick={() => {
                  setSelectedCollectionId(col.id);
                  setSearchQuery('');
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative shadow-xs flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-teal-50/50 border-[#016976] ring-2 ring-[#016976]/20 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-2xs flex-shrink-0">
                      <NftImage src={col.iconImage} alt={col.name} className="w-full h-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 truncate">
                          {col.category}
                        </span>
                        {col.verified && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        )}
                      </div>
                      <h3 className="font-extrabold text-sm text-slate-900 tracking-tight truncate mt-1 group-hover:text-[#016976] transition-colors">
                        {col.name}
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 font-medium line-clamp-2">
                    {col.description}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Holders</span>
                    <span className="font-mono font-bold text-slate-900">
                      {col.holdersCount} Wallets
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] block">Floor Price</span>
                    <span className="font-mono font-bold text-[#016976]">
                      {col.floorPriceBtn != null ? `${col.floorPriceBtn} BTN` : 'Not Listed'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Collection Showcase */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Collection Header Bar */}
        <div className="p-5 sm:p-7 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-slate-950 border-2 border-teal-500/30 shadow-md flex-shrink-0">
              <NftImage src={activeCollection.iconImage} alt={activeCollection.name} className="w-full h-full" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {activeCollection.name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-50 text-[#016976] border border-teal-200">
                  {activeCollection.symbol}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {activeCollection.standard}
                </span>
                {activeCollection.verified && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified On-Chain Contract
                  </span>
                )}
              </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-mono flex-wrap">
              <span>Contract:</span>
              <span 
                onClick={() => onSelectAddress(activeCollection.contract)}
                className="text-[#016976] hover:underline font-semibold cursor-pointer"
              >
                {activeCollection.contract}
              </span>
              <button
                onClick={(e) => copyToClipboard(activeCollection.contract, e)}
                className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Copy Contract Address"
              >
                {copiedText === activeCollection.contract ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl self-start md:self-auto">
            <button
              onClick={() => setActiveTab('gallery')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'gallery'
                  ? 'bg-white text-[#016976] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Image className="w-3.5 h-3.5" />
              <span>NFT Gallery ({activeCollection.items.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('holders')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'holders'
                  ? 'bg-white text-[#016976] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Holders ({activeCollection.holdersCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'activity'
                  ? 'bg-white text-[#016976] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Activity</span>
            </button>
          </div>
        </div>

        {/* Tab 1: NFT Gallery Cards */}
        {activeTab === 'gallery' && (
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by NFT name, Token ID (#), or owner address..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#016976]"
                />
              </div>

              <div className="text-xs text-slate-500 font-medium">
                {filteredItems.length} items listed
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedNft(item)}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-[#016976] hover:shadow-lg transition-all duration-300 group cursor-pointer flex flex-col justify-between"
                >
                  {/* NFT Image Artwork */}
                  <div className="relative aspect-square w-full bg-slate-950 overflow-hidden flex items-center justify-center">
                    <NftImage
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 z-20">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase shadow-sm ${item.rarityColor}`}>
                        {item.rarity}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 z-20 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/20 text-white font-mono font-bold text-[11px]">
                      #{item.id}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-[#016976] transition-colors line-clamp-1">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {activeCollection.name}
                      </p>
                    </div>

                    {/* Traits tags */}
                    <div className="flex flex-wrap gap-1">
                      {item.traits.slice(0, 2).map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-slate-100 rounded-md text-[10px] text-slate-600 font-medium"
                        >
                          {t.trait_type}: {t.value}
                        </span>
                      ))}
                      {item.traits.length > 2 && (
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded-md text-[10px] text-slate-400 font-medium">
                          +{item.traits.length - 2}
                        </span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Owner:</span>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAddress(item.owner);
                          }}
                          className="font-mono text-slate-700 hover:text-[#016976] hover:underline font-semibold"
                        >
                          {truncateAddress(item.owner)}
                        </span>
                      </div>
                      {item.priceBtn && (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Last Price:</span>
                          <span className="font-mono font-bold text-emerald-700">
                            {item.priceBtn} BTN
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: HODL Sahipleri (Holders Table) */}
        {activeTab === 'holders' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Rank</th>
                  <th className="py-3.5 px-4 sm:px-6">Holder Address</th>
                  <th className="py-3.5 px-4 text-right">Quantity</th>
                  <th className="py-3.5 px-4 sm:px-6">Share</th>
                  <th className="py-3.5 px-4 sm:px-6">Owned Token IDs</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {activeCollection.holders.map((holder) => (
                  <tr
                    key={holder.address}
                    onClick={() => onSelectAddress(holder.address)}
                    className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                  >
                    {/* Rank */}
                    <td className="py-4 px-4 sm:px-6 font-mono font-bold text-slate-700">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        holder.rank === 1
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : holder.rank === 2
                          ? 'bg-slate-200 text-slate-700 border border-slate-300'
                          : holder.rank === 3
                          ? 'bg-orange-100 text-orange-800 border border-orange-300'
                          : 'text-slate-500'
                      }`}>
                        #{holder.rank}
                      </span>
                    </td>

                    {/* Address */}
                    <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-[#016976] font-bold text-xs flex-shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-mono text-slate-900 group-hover:text-[#016976] group-hover:underline font-semibold">
                          {holder.address}
                        </span>
                        <button
                          onClick={(e) => copyToClipboard(holder.address, e)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                          title="Copy Wallet Address"
                        >
                          {copiedText === holder.address ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800">
                        {holder.quantity} NFT
                      </span>
                    </td>

                    {/* Percentage */}
                    <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                          <div
                            className="h-full bg-gradient-to-r from-[#016976] to-teal-400 rounded-full"
                            style={{ width: holder.percentage }}
                          />
                        </div>
                        <span className="font-mono font-bold text-xs text-slate-700">
                          {holder.percentage}
                        </span>
                      </div>
                    </td>

                    {/* Token IDs list */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                        {holder.tokenIds.map((tid) => (
                          <span
                            key={tid}
                            className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-[#016976] font-mono font-bold text-[10px]"
                          >
                            #{tid}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                      <button
                        onClick={() => onSelectAddress(holder.address)}
                        className="px-3 py-1 rounded-lg bg-slate-100 group-hover:bg-[#016976] text-slate-700 group-hover:text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                      >
                        View Wallet
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Recent Activity / Transfers */}
        {activeTab === 'activity' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Tx Hash</th>
                  <th className="py-3.5 px-4 sm:px-6">NFT</th>
                  <th className="py-3.5 px-4 sm:px-6">From (Seller)</th>
                  <th className="py-3.5 px-4 sm:px-6">To (Buyer / Holder)</th>
                  <th className="py-3.5 px-4 text-right">Price</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {activeCollection.recentTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ArrowRightLeft className="w-6 h-6 text-slate-300" />
                        <span className="text-xs font-semibold text-slate-600">No secondary marketplace trades recorded</span>
                        <span className="text-[11px] text-slate-400">NFTs in this collection are currently held directly in owner wallets (HODL) without active market trades.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  activeCollection.recentTransfers.map((tx) => (
                    <tr key={tx.hash} className="hover:bg-slate-50/90 transition-colors">
                      <td className="py-4 px-4 sm:px-6 font-mono text-[#016976] font-semibold whitespace-nowrap">
                        {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                      </td>
                      <td className="py-4 px-4 sm:px-6 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-mono font-bold text-xs">
                          #{tx.tokenId}
                        </span>
                      </td>
                      <td className="py-4 px-4 sm:px-6 font-mono text-slate-700 hover:text-[#016976] cursor-pointer whitespace-nowrap">
                        <span onClick={() => onSelectAddress(tx.from)}>
                          {truncateAddress(tx.from)}
                        </span>
                      </td>
                      <td className="py-4 px-4 sm:px-6 font-mono text-slate-900 font-bold hover:text-[#016976] cursor-pointer whitespace-nowrap">
                        <span onClick={() => onSelectAddress(tx.to)}>
                          {truncateAddress(tx.to)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {tx.priceBtn ? `${tx.priceBtn} BTN` : '-'}
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-right font-mono text-slate-400 whitespace-nowrap">
                        {formatTimeAgo(tx.timestamp)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* NFT Detail Modal */}
      {selectedNft && (
        <div 
          onClick={() => setSelectedNft(null)}
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative animate-scale-in"
          >
            <button
              onClick={() => setSelectedNft(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 sm:p-8">
              {/* Image Preview */}
              <div className="aspect-square rounded-2xl bg-slate-950 overflow-hidden shadow-md flex items-center justify-center">
                <NftImage
                  src={selectedNft.image}
                  alt={selectedNft.name}
                  className="w-full h-full"
                />
              </div>

              {/* Information */}
              <div className="space-y-4">
                <div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${selectedNft.rarityColor}`}>
                    {selectedNft.rarity}
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-2">
                    {selectedNft.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {activeCollection.name} ({activeCollection.standard})
                  </p>
                </div>

                <div className="space-y-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Current Owner (Holder):</span>
                    <span 
                      onClick={() => {
                        setSelectedNft(null);
                        onSelectAddress(selectedNft.owner);
                      }}
                      className="text-[#016976] hover:underline font-bold break-all cursor-pointer"
                    >
                      {selectedNft.owner}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Contract Address:</span>
                    <span className="text-slate-700 break-all">
                      {activeCollection.contract}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Mint Date:</span>
                    <span className="text-slate-800 font-semibold">
                      {formatMintDate(selectedNft.mintDate, activeCollection.contract)}
                    </span>
                  </div>

                  {selectedNft.priceBtn && (
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">Last Price / Value:</span>
                      <span className="text-emerald-700 font-bold text-sm">{selectedNft.priceBtn} BTN</span>
                    </div>
                  )}
                </div>

                {/* Traits / Attributes */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">
                    Traits & Attributes
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedNft.traits.map((t, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-400 font-sans block">{t.trait_type}</span>
                        <span className="text-xs font-bold text-slate-800 font-mono">{t.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedNft(null);
                    onSelectAddress(selectedNft.owner);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#016976] hover:bg-[#01545e] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                >
                  <User className="w-4 h-4" />
                  <span>View Owner's Wallet History</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Developer Custom Contract Inspector */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#016976] shadow-xs">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Developer BTS-721 Contract Inspector
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Directly inspect any custom BTS-721 NFT contract address and token ID deployed on Bitnet L1.
            </p>
          </div>
        </div>

        <form onSubmit={handleCustomQuery} className="mt-5 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={customContract}
            onChange={(e) => setCustomContract(e.target.value)}
            placeholder="BTS-721 Contract Address (0x...)"
            className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#016976]"
          />
          <input
            type="number"
            value={customTokenId}
            onChange={(e) => setCustomTokenId(e.target.value)}
            placeholder="Token ID (e.g. 1)"
            className="w-full sm:w-36 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#016976]"
          />
          <button
            type="submit"
            disabled={customLoading}
            className="px-5 py-2.5 rounded-xl bg-[#016976] hover:bg-[#01545e] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <Search className="w-4 h-4" />
            <span>{customLoading ? 'Inspecting...' : 'Inspect Contract'}</span>
          </button>
        </form>

        {customError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {customError}
          </div>
        )}

        {customResult && (
          <div className="mt-5 p-4 rounded-2xl bg-teal-50/40 border border-teal-200 text-xs font-mono space-y-1.5">
            <div className="flex items-center justify-between pb-2 border-b border-teal-200/60 font-sans">
              <span className="font-bold text-slate-900">BTS-721 Token #{customResult.tokenId}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Active On-Chain</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans">Owner Address: </span>
              <span 
                onClick={() => onSelectAddress(customResult.owner)}
                className="text-[#016976] font-bold hover:underline cursor-pointer"
              >
                {customResult.owner}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

