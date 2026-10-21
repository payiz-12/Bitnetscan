import React from 'react';
import { ethers } from 'ethers';

/** A decoded value, with addresses linked and nested tuples/arrays expanded. */
export const AbiValue: React.FC<{ p: ethers.ParamType; v: any; onSelectAddress: (a: string) => void; token?: { decimals: number; symbol: string } | null }> = ({ p, v, onSelectAddress, token }) => {
  if (v instanceof ethers.Indexed) {
    return <span className="break-all">{v.hash} <span className="text-slate-500 font-sans">(hash of the indexed value)</span></span>;
  }
  if (p.baseType === 'tuple' && p.components) {
    return (
      <div className="pl-3 border-l-2 border-slate-200 space-y-1">
        {p.components.map((c, i) => (
          <div key={i}><span className="text-slate-500">{c.name || `[${i}]`}:</span> <AbiValue p={c} v={v?.[i]} onSelectAddress={onSelectAddress} /></div>
        ))}
      </div>
    );
  }
  if (p.baseType === 'array' && p.arrayChildren) {
    const items = Array.from(v ?? []);
    if (items.length === 0) return <span className="text-slate-400">[ ]</span>;
    return (
      <div className="pl-3 border-l-2 border-slate-200 space-y-1">
        {items.map((x, i) => <div key={i}><span className="text-slate-500">[{i}]</span> <AbiValue p={p.arrayChildren!} v={x} onSelectAddress={onSelectAddress} /></div>)}
      </div>
    );
  }
  if (p.baseType === 'address') {
    return <button type="button" onClick={() => onSelectAddress(String(v))} className="text-petrol hover:underline cursor-pointer break-all">{String(v)}</button>;
  }
  if (typeof v === 'bigint') {
    return (
      <span className="break-all">
        {v.toString()}
        {token && <span className="text-slate-500 font-sans"> ≈ {Number(ethers.formatUnits(v, token.decimals)).toLocaleString('en-US', { maximumFractionDigits: 6 })} {token.symbol}</span>}
      </span>
    );
  }
  return <span className="break-all whitespace-pre-wrap">{typeof v === 'string' ? (v === '' ? '""' : v) : String(v)}</span>;
};
