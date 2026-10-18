import React from 'react';
import { AddressLabelKind, useAddressLabel } from '../services/addressLabels';

const KIND_STYLES: Record<AddressLabelKind, string> = {
  pool: 'bg-amber-50 border-amber-200 text-amber-800',
  solo: 'bg-teal-50 border-teal-200 text-[#016976]',
  miner: 'bg-orange-50 border-orange-200 text-orange-800',
  burn: 'bg-rose-50 border-rose-200 text-rose-700',
  token: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  contract: 'bg-indigo-50 border-indigo-200 text-indigo-700',
};

/** Small badge naming a known address (pool, miner, burn address, token or verified contract). */
export const AddressTag: React.FC<{ address: string | null | undefined; className?: string }> = ({ address, className = '' }) => {
  const label = useAddressLabel(address);
  if (!label) return null;
  return (
    <span
      title={label.detail}
      className={`inline-flex items-center shrink-0 px-1.5 py-px rounded-md border text-[10px] font-bold font-sans truncate max-w-[10rem] ${KIND_STYLES[label.kind]} ${className}`}
    >
      {label.name}
    </span>
  );
};
