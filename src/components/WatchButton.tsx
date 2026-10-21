import React from 'react';
import { Star } from 'lucide-react';
import { addWatch, isWatched, removeWatch, useWatchlist } from '../services/watchlist';
import { getAddressLabel } from '../services/addressLabels';

/** Adds or removes an address from the browser's watchlist. */
export const WatchButton: React.FC<{ address: string }> = ({ address }) => {
  useWatchlist();
  const watched = isWatched(address);
  return (
    <button
      type="button"
      onClick={() => (watched ? removeWatch(address) : addWatch(address, getAddressLabel(address)?.name || ''))}
      aria-pressed={watched}
      title={watched ? 'Remove from watchlist' : 'Add to watchlist'}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer transition-colors ${
        watched ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' : 'bg-white text-slate-700 border-slate-200 hover:border-petrol hover:text-petrol'
      }`}
    >
      <Star className={`w-3.5 h-3.5 ${watched ? 'fill-amber-400 text-amber-500' : ''}`} />
      {watched ? 'Watching' : 'Watch'}
    </button>
  );
};
