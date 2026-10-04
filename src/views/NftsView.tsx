import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Search, RefreshCw, X, ExternalLink, Layers, User, ArrowRightLeft, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { BITNET_NFT_COLLECTIONS, NftCollection, NftItem } from '../data/nftCollections';
import { NftImage } from '../components/NftImage';
import { nftSyncService, NftSyncResult } from '../services/nftSyncService';
import { resourceUrls, ZERO_ADDRESS } from '../services/nftData';

interface NftsViewProps { onSelectAddress: (address: string) => void; }
const shortAddress = (address: string) => address ? `${address.slice(0, 8)}…${address.slice(-6)}` : 'Unknown';
const count = (value: number | null) => value == null ? 'Unavailable' : value.toLocaleString();
const date = (value?: string) => value ? new Date(value).toLocaleString() : 'Unavailable';
const statusLabel = (status: NftCollection['dataStatus']) => ({
  unloaded: 'Awaiting indexer', indexed: 'Indexed', cached: 'Cached', partial: 'Partial data', error: 'Unavailable',
}[status]);
const PAGE_SIZE = 24;

export const NftsView: React.FC<NftsViewProps> = ({ onSelectAddress }) => {
  const [collections, setCollections] = useState(() => nftSyncService.getStoredCollections());
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
  const mounted = useRef(false), busy = useRef(false), inspection = useRef(0);

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
  const ownerDataComplete = collections.length > 0 && collections.every(collection => collection.dataStatus === 'indexed' && collection.ownershipComplete);
  const historyComplete = collections.length > 0 && collections.every(collection => collection.dataStatus === 'indexed' && collection.transfersComplete);
  const totalSupply = ownerDataComplete ? collections.reduce((sum, collection) => sum + (collection.totalSupply ?? 0), 0) : null;
  const totalMints = historyComplete ? collections.reduce((sum, collection) => sum + (collection.minted ?? 0), 0) : null;
  const totalHolders = ownerDataComplete ? new Set(collections.flatMap(collection => collection.holders.map(holder => holder.address.toLowerCase()))).size : null;
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
  const collectionCards = (rows: NftCollection[]) => rows.map(collection => <button key={collection.id} onClick={() => { setSelectedId(collection.id); setQuery(''); }} className={`text-left p-4 rounded-2xl border ${active?.id === collection.id ? 'bg-teal-50 border-[#016976] ring-1 ring-[#016976]' : 'bg-white border-slate-200 hover:border-teal-400'}`}>
            <div className="flex items-center gap-3"><NftImage refreshKey={collection.syncedAt} src={collection.iconImage} alt={collection.name} className="w-12 h-12 rounded-xl flex-shrink-0" /><div className="min-w-0"><div className="text-xs text-slate-500">{statusLabel(collection.dataStatus)}</div><h3 className="font-bold text-sm text-slate-900 truncate">{collection.name}</h3></div></div>
            <div className="mt-2 text-[10px] font-mono text-slate-400">{shortAddress(collection.contract)}</div><div className="mt-3 text-xs text-slate-500">Supply: <strong className="text-slate-800">{count(collection.totalSupply)}</strong> · Holders: <strong className="text-slate-800">{count(collection.holdersCount)}</strong></div>
          </button>);

  return (
    <div className="space-y-6 w-full animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-[#016976]">BITNET · ERC-721</span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">NFT & Digital Asset Explorer</h1>
            <p className="text-sm text-slate-500 mt-2">Explore indexed ownership and original NFT metadata. Open an NFT to verify its owner and metadata link.</p>
          </div>
          <button onClick={refresh} disabled={syncing} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-50 text-[#016976] border border-teal-200 text-xs font-bold disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Loading indexed records…' : sync?.status === 'live' ? 'Indexed · Refresh' : 'Refresh NFT data'}
          </button>
        </div>
        <p className={`mt-4 text-xs ${sync?.status && sync.status !== 'live' ? 'text-amber-800' : 'text-slate-500'}`} role="status">
          {sync?.message || (collections.some(collection => collection.syncedAt) ? 'Showing cached NFT records while live data loads.' : 'Loading NFT collection records from the Bitnet indexer.')}
          {sync?.syncedAt && <span className="block mt-1">Last indexer refresh: {date(sync.syncedAt)}</span>}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          {[
            ['Contract addresses shown', collections.length.toLocaleString()],
            ['Current indexed supply', count(totalSupply)],
            ['Unique indexed holders', count(totalHolders)],
            ['Mint events indexed', count(totalMints)],
          ].map(([label, value]) => <div key={label} className="p-4 rounded-2xl bg-slate-50 border border-slate-200"><div className="text-[11px] text-slate-500 font-bold uppercase">{label}</div><div className="text-lg font-black text-slate-900 mt-1">{value}</div></div>)}
        </div>
      </div>

      <section>
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3"><Layers className="w-4 h-4 text-[#016976]" />Known collection addresses ({knownCollections.length})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {collectionCards(knownCollections)}
        </div>
        {additionalCollections.length > 0 && <details className="mt-4"><summary className="text-sm font-bold text-slate-600 cursor-pointer">Additional indexed contracts ({additionalCollections.length})</summary><p className="text-xs text-slate-500 mt-2 mb-3">Separate contracts may reuse collection names. Inclusion here does not imply authenticity or endorsement; compare the contract address.</p><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mt-3">{collectionCards(additionalCollections)}</div></details>}
      </section>

      {active && <section className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 sm:p-7 bg-slate-50 border-b border-slate-200">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div className="min-w-0"><h2 className="text-xl font-black text-slate-900">{active.name} <span className="text-sm font-normal text-slate-500">{active.symbol}</span></h2><button onClick={() => onSelectAddress(active.contract)} className="text-xs font-mono text-[#016976] break-all text-left mt-2">{active.contract}</button></div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${active.dataStatus === 'indexed' ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'}`}>{statusLabel(active.dataStatus)}</span>
          </div>
          <p className="text-xs text-slate-500 mt-3">{active.syncedAt ? `Indexer snapshot: ${date(active.syncedAt)}. Images and traits are metadata supplied by the NFT creator.` : 'Collection figures and artwork are unavailable until indexed records load.'}</p>
          {active.error && <p className="text-xs text-amber-800 mt-2">{active.error}</p>}
          <div className="flex flex-wrap gap-2 mt-4">
            {([
              ['gallery', 'Gallery', Image], ['holders', 'Holders', User], ['activity', 'Transfers', ArrowRightLeft],
            ] as const).map(([value, label, Icon]) => <button key={value} onClick={() => setTab(value)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${tab === value ? 'bg-white text-[#016976] shadow-sm border border-teal-200' : 'text-slate-600 border border-transparent'}`}><Icon className="w-4 h-4" />{label}</button>)}
          </div>
        </div>

        {tab === 'gallery' && <div className="p-5 sm:p-7">
          <div className="relative mb-5"><Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search NFT name, token ID or owner" className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600" /></div>
          {!filtered.length && <p className="py-8 text-center text-sm text-slate-500">{active.dataStatus === 'indexed' ? 'No indexed NFTs match this search.' : 'NFT records are loading or unavailable.'}</p>}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.slice(offset, offset + PAGE_SIZE).map(item => <div key={item.id} className="rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              <button onClick={() => inspect(active, item)} className="w-full block text-left"><NftImage refreshKey={active.syncedAt} src={item.image} alt={item.name} className="aspect-square w-full" /><div className="p-3"><div className="text-[10px] text-slate-500 font-mono break-all">Token #{item.id}</div><h3 className="text-sm font-bold text-slate-900 mt-1 truncate">{item.name}</h3><div className="text-[10px] text-slate-500 mt-1">{item.metadataSource === 'indexer' ? 'Indexed metadata' : 'Metadata unavailable'}</div></div></button>
              <div className="px-3 pb-3 text-[11px] text-slate-500">Indexed owner: {item.owner && item.owner.toLowerCase() !== ZERO_ADDRESS ? <button onClick={() => onSelectAddress(item.owner)} className="text-[#016976] font-mono font-bold">{shortAddress(item.owner)}</button> : 'Unavailable / burned'}</div>
            </div>)}
          </div>
        </div>}

        {tab === 'holders' && <div className="overflow-x-auto">
          {!active.ownershipComplete ? <p className="p-8 text-center text-sm text-slate-500">Complete ownership records are unavailable. Holder totals and percentages cannot be confirmed.</p> : <table className="w-full text-xs text-left"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Rank</th><th className="p-4">Holder</th><th className="p-4 text-right">NFTs</th><th className="p-4 text-right">Share of current supply</th><th className="p-4">Token IDs</th></tr></thead><tbody>
            {active.holders.slice(offset, offset + PAGE_SIZE).map(holder => <tr key={holder.address.toLowerCase()} className="border-t border-slate-100"><td className="p-4">#{holder.rank}</td><td className="p-4 font-mono"><button onClick={() => onSelectAddress(holder.address)} className="text-[#016976] font-bold">{holder.address}</button></td><td className="p-4 text-right font-bold">{holder.quantity.toLocaleString()}</td><td className="p-4 text-right">{holder.percentage}</td><td className="p-4 min-w-40 max-w-sm break-words">{holder.tokenIds.slice(0, 12).map(id => `#${id}`).join(', ')}{holder.tokenIds.length > 12 && ` · ${holder.tokenIds.length - 12} more`}</td></tr>)}
            {!active.holders.length && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No current holders in the indexed records.</td></tr>}
          </tbody></table>}
        </div>}

        {tab === 'activity' && <div className="overflow-x-auto">
          {!active.transfersComplete && <p className="p-4 text-xs text-amber-800">Transfer history is incomplete or unavailable.</p>}
          {active.recentTransfers.length ? <table className="w-full text-xs text-left"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Transaction</th><th className="p-4">Event / NFT</th><th className="p-4">From</th><th className="p-4">To</th><th className="p-4">Block</th><th className="p-4">Timestamp</th></tr></thead><tbody>
            {active.recentTransfers.slice(offset, offset + PAGE_SIZE).map(transfer => <tr key={`${transfer.hash}:${transfer.logIndex}:${transfer.tokenId}`} className="border-t border-slate-100"><td className="p-4 font-mono"><a href={`https://explorer.bitnetmoney.org/tx/${transfer.hash}`} target="_blank" rel="noopener noreferrer" className="text-[#016976]">{shortAddress(transfer.hash)}</a><div className="text-[10px] text-slate-400">Log #{transfer.logIndex}</div></td><td className="p-4 whitespace-nowrap">{transfer.type} · #{transfer.tokenId}</td><td className="p-4 font-mono"><button onClick={() => onSelectAddress(transfer.from)} className="text-[#016976]">{transfer.from.toLowerCase() === ZERO_ADDRESS ? 'Zero address' : shortAddress(transfer.from)}</button></td><td className="p-4 font-mono"><button onClick={() => onSelectAddress(transfer.to)} className="text-[#016976]">{transfer.to.toLowerCase() === ZERO_ADDRESS ? 'Zero address' : shortAddress(transfer.to)}</button></td><td className="p-4">{transfer.blockNumber.toLocaleString()}</td><td className="p-4 whitespace-nowrap">{date(new Date(transfer.timestamp * 1000).toISOString())}</td></tr>)}
          </tbody></table> : <p className="p-8 text-center text-sm text-slate-500">{active.transfersComplete ? 'The indexer returned no transfer events for this collection.' : 'Transfer events could not be loaded.'}</p>}
          <p className="px-5 py-3 text-[11px] text-slate-500">Transfers include mints, burns and ownership changes. A transfer event does not establish a sale or its price.</p>
        </div>}

        {pageCount > 1 && <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs"><span className="text-slate-500">Page {currentPage} of {pageCount}</span><div className="flex gap-2"><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Previous page" className="p-2 rounded-lg border border-slate-200 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button><button disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} aria-label="Next page" className="p-2 rounded-lg border border-slate-200 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button></div></div>}
      </section>}

      <section className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7">
        <h2 className="text-lg font-black text-slate-900">Inspect an ERC-721 NFT</h2><p className="text-xs text-slate-500 mt-1">Read the owner and tokenURI from the contract at the same RPC block.</p>
        <form onSubmit={inspectCustom} className="flex flex-col sm:flex-row gap-3 mt-4"><input value={customContract} onChange={event => setCustomContract(event.target.value)} placeholder="Contract address (0x…)" aria-label="NFT contract address" className="flex-1 min-w-0 rounded-xl border border-slate-300 p-3 text-xs font-mono" required /><input type="text" inputMode="numeric" pattern="[0-9]+" value={customTokenId} onChange={event => setCustomTokenId(event.target.value)} aria-label="NFT token ID" className="sm:w-40 rounded-xl border border-slate-300 p-3 text-xs font-mono" required /><button disabled={customLoading} className="rounded-xl bg-[#016976] px-5 py-3 text-xs font-bold text-white disabled:opacity-60">{customLoading ? 'Inspecting…' : 'Inspect NFT'}</button></form>
        {customError && <p className="text-xs text-rose-700 mt-3" role="alert">{customError}</p>}
      </section>

      {modal && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-6" onClick={closeModal}><div role="dialog" aria-modal="true" aria-label={modal.item.name} className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl" onClick={event => event.stopPropagation()}>
        <div className="flex justify-between items-start p-5 border-b border-slate-200"><div className="min-w-0"><h2 className="text-lg font-black text-slate-900 break-words">{modal.item.name}</h2><p className="text-xs text-slate-500">{modal.collectionName} · Token #{modal.item.id}</p></div><button onClick={closeModal} aria-label="Close NFT details" className="p-2"><X className="w-5 h-5" /></button></div>
        <div className="p-5 grid md:grid-cols-2 gap-5"><NftImage src={modal.item.image} alt={modal.item.name} className="aspect-square w-full rounded-2xl" /><div className="space-y-4 min-w-0">
          {checking && <p role="status" className="text-xs text-[#016976] flex gap-2 items-center"><Loader2 className="w-4 h-4 animate-spin" />Checking owner and tokenURI via RPC…</p>}
          {detailError && <p role="alert" className="text-xs text-amber-800 flex gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" />{detailError} Displayed records are from the indexer snapshot.</p>}
          {modal.item.metadataError && <p className="text-xs text-amber-800">{modal.item.metadataError}</p>}<div className="text-xs space-y-3"><div><span className="text-slate-500 block">{modal.item.ownerSource === 'rpc' ? `Owner verified at block ${modal.item.checkedBlock?.toLocaleString()}` : 'Owner from indexer snapshot'}</span>{modal.item.owner ? <button onClick={() => { closeModal(); onSelectAddress(modal.item.owner); }} className="font-mono text-[#016976] font-bold break-all text-left mt-1">{modal.item.owner}</button> : <span>Unavailable</span>}</div><div><span className="text-slate-500 block">Contract</span><span className="font-mono break-all">{modal.contract}</span></div><div><span className="text-slate-500 block">Mint timestamp (indexed)</span>{date(modal.item.mintDate)}</div><div><span className="text-slate-500 block">Metadata source</span>{modal.item.metadataSource === 'tokenURI' ? 'Contract tokenURI · creator-provided metadata' : modal.item.metadataSource === 'indexer' ? 'Indexer metadata snapshot' : 'Unavailable'}</div>
            {modal.item.tokenUri && <div><span className="text-slate-500 block">Contract tokenURI</span><span className="font-mono break-all block mt-1">{modal.item.tokenUri}</span>{resourceUrls(modal.item.tokenUri)[0] && <a href={resourceUrls(modal.item.tokenUri)[0]} target="_blank" rel="noopener noreferrer" className="text-[#016976] flex gap-1 items-center mt-1">Open metadata <ExternalLink className="w-3 h-3" /></a>}</div>}
          </div>
          <div><h3 className="text-xs font-bold text-slate-900 mb-2">Metadata attributes</h3>{modal.item.traits.length ? <div className="grid grid-cols-2 gap-2">{modal.item.traits.map((trait, index) => <div key={index} className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs min-w-0"><span className="text-[10px] text-slate-500 block break-words">{trait.trait_type}</span><span className="text-slate-800 font-bold break-words">{trait.value}</span></div>)}</div> : <p className="text-xs text-slate-500">No attributes available from the metadata.</p>}</div>
        </div></div>
      </div></div>}
    </div>
  );
};
