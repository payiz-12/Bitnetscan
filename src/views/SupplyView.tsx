import React, { useEffect, useState } from 'react';
import { Coins, ExternalLink, RefreshCw } from 'lucide-react';
import { NetworkStats } from '../types/blockchain';
import { fetchSupplySnapshot, SupplySnapshot } from '../services/supply';
import { loadRecentScan, getCachedRecentScan, RecentScan, issuancePerBlock, scanBlockTime, weiToBtn } from '../services/chainScan';
import { priceService, BtnPriceData } from '../services/priceService';
import { fetchTopAccounts, TopAccountsResult } from '../data/richList';

interface SupplyViewProps {
  stats: NetworkStats | null;
  onNavigate: (view: string) => void;
}

const fmt = (n: number, digits = 0) => n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const usd = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${n.toFixed(2)}`;

const Row: React.FC<{ label: string; value: React.ReactNode; note?: React.ReactNode }> = ({ label, value, note }) => (
  <div className="py-2.5 flex items-start justify-between gap-3 border-b border-slate-100 last:border-0">
    <span className="text-xs font-semibold text-slate-500">{label}</span>
    <span className="text-right">
      <span className="text-sm font-bold text-slate-900 font-mono block">{value}</span>
      {note && <span className="text-[11px] text-slate-500 block">{note}</span>}
    </span>
  </div>
);

const Card: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <section className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm min-w-0">
    <h2 className="text-base font-bold text-slate-900">{title}</h2>
    {subtitle && <p className="text-xs text-slate-500 mb-2">{subtitle}</p>}
    {children}
  </section>
);

/** Share bar: the filled part carries the value, the track is a lighter step of the same hue. */
const ShareBar: React.FC<{ label: string; share: number }> = ({ label, share }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-xs">
      <span className="font-semibold text-slate-700">{label}</span>
      <span className="font-bold text-slate-900">{(share * 100).toFixed(1)}%</span>
    </div>
    <div className="h-2 rounded-full bg-petrol-100 overflow-hidden">
      <div className="h-full rounded-full bg-petrol" style={{ width: `${Math.min(100, share * 100)}%` }} />
    </div>
  </div>
);

export const SupplyView: React.FC<SupplyViewProps> = ({ stats, onNavigate }) => {
  const [supply, setSupply] = useState<SupplySnapshot | null>(null);
  const [scan, setScan] = useState<RecentScan | null>(() => getCachedRecentScan());
  const [price, setPrice] = useState<BtnPriceData>(priceService.getCachedPrice());
  const [top, setTop] = useState<TopAccountsResult | null>(null);
  const [scanError, setScanError] = useState(false);

  useEffect(() => priceService.subscribe(setPrice), []);
  useEffect(() => {
    let active = true;
    fetchSupplySnapshot().then((s) => { if (active) setSupply(s); });
    loadRecentScan().then((s) => { if (active) setScan(s); }).catch(() => { if (active) setScanError(true); });
    fetchTopAccounts(stats?.latestBlock || undefined).then((t) => { if (active) setTop(t); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const circulating = supply ? Number(supply.circulatingSupply) : null;
  const total = supply ? Number(supply.totalSupply) : null;
  const base = supply ? Number(supply.baseIssuance) : null;
  const marketCap = circulating !== null && price.available ? circulating * price.priceUsd : null;

  const perBlock = scan ? issuancePerBlock(scan) : null;
  const blockTime = scan ? scanBlockTime(scan) : null;
  const perDay = perBlock !== null && blockTime ? (86400 / blockTime) * perBlock : null;
  const perYear = perDay !== null ? perDay * 365 : null;
  const inflation = perYear !== null && circulating ? perYear / circulating : null;
  const uncleShareNow = scan ? weiToBtn(scan.uncleRewardsWei) / weiToBtn(scan.issuedWei) : null;

  const holdersShare = (n: number) => {
    if (!top || !circulating || top.source !== 'indexer') return null;
    return top.accounts.slice(0, n).reduce((s, a) => s + a.balance, 0) / circulating;
  };
  const top10 = holdersShare(10);
  const top50 = holdersShare(50);

  const projection = circulating !== null && perYear !== null
    ? [1, 2, 5].map((years) => {
        const start = circulating + perYear * (years - 1);
        return { years, supply: circulating + perYear * years, inflation: perYear / start };
      })
    : [];

  const tiles = [
    { label: 'Price (NestEx)', value: price.available ? price.priceFormatted : '—', note: price.available ? `${price.change24hFormatted} 24h` : 'No quote' },
    { label: 'Market cap', value: marketCap !== null ? usd(marketCap) : '—', note: 'Circulating × price' },
    { label: 'Circulating supply', value: circulating !== null ? `${fmt(circulating)} BTN` : '—', note: supply ? `Block #${supply.blockRange[1].toLocaleString()}` : '…' },
    { label: 'Annual inflation', value: inflation !== null ? `${(inflation * 100).toFixed(1)}%` : '—', note: 'At the current issuance rate' },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 w-full animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Supply & Market</h1>
            <p className="text-xs sm:text-sm text-slate-500">How much BTN exists, how fast new BTN is created and what the market pays for it.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {tiles.map((t) => (
            <div key={t.label} className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 min-w-0">
              <span className="text-[11px] text-slate-500 font-semibold block">{t.label}</span>
              <span className="text-lg sm:text-xl font-black text-slate-900 block truncate">{t.value}</span>
              <span className="text-[11px] text-slate-500">{t.note}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <Card title="Supply" subtitle="Sum of every account balance, recomputed hourly.">
          <Row label="Total supply" value={total !== null ? `${fmt(total, 2)} BTN` : '…'} />
          <Row label="Burned" value={supply ? `${fmt(Number(supply.burned), 2)} BTN` : '…'} note="Held by 0x0…0 and 0x…dEaD" />
          <Row label="Circulating supply" value={circulating !== null ? `${fmt(circulating, 2)} BTN` : '…'} note="Total minus burned" />
          <Row label="Addresses with a balance" value={supply ? fmt(supply.accounts) : '…'} />
          <Row
            label="From block subsidies"
            value={base !== null ? `${fmt(base)} BTN` : '…'}
            note="1 BTN for every block"
          />
          <Row
            label="From uncle rewards"
            value={total !== null && base !== null ? `${fmt(total - base, 2)} BTN` : '…'}
            note={total !== null && base !== null ? `Uncle and 1/32 BTN inclusion rewards · ${((total - base) / total * 100).toFixed(1)}% of total supply` : undefined}
          />
          <Row label="Premine" value="0 BTN" note="No balances at genesis" />
          <p className="text-[11px] text-slate-500 pt-2">
            Snapshot {supply ? new Date(supply.updatedAt).toLocaleString('en-US', { timeZone: 'UTC', hour12: false }) + ' UTC' : '…'} ·{' '}
            <a href="/api/supply?format=json" target="_blank" rel="noopener noreferrer" className="text-petrol font-semibold hover:underline">/api/supply</a>
          </p>
        </Card>

        <Card
          title="Issuance"
          subtitle={scan ? `Measured over blocks #${scan.from.toLocaleString()}–#${scan.to.toLocaleString()} (last ${(scan.to - scan.from + 1).toLocaleString()} blocks).` : 'Measured over the last 2,000 blocks.'}
        >
          {scanError && !scan ? (
            <p className="text-xs text-amber-800 py-4">Could not read the recent blocks from the RPC.</p>
          ) : (
            <>
              <Row label="New BTN per block" value={perBlock !== null ? `${perBlock.toFixed(4)} BTN` : '…'} note="1 BTN subsidy + uncle and inclusion rewards" />
              <Row label="Average block time" value={blockTime ? `${blockTime.toFixed(2)} s` : '…'} />
              <Row label="New BTN per day" value={perDay !== null ? `${fmt(perDay)} BTN` : '…'} note={perDay !== null && price.available ? `≈ ${usd(perDay * price.priceUsd)} at the NestEx price` : undefined} />
              <Row label="New BTN per year" value={perYear !== null ? `${fmt(perYear)} BTN` : '…'} />
              <Row
                label="Uncle rewards"
                value={uncleShareNow !== null ? `${(uncleShareNow * 100).toFixed(1)}% of new BTN` : '…'}
                note={
                  <button onClick={() => onNavigate('uncles')} className="text-petrol font-semibold hover:underline cursor-pointer">
                    See uncle blocks
                  </button>
                }
              />
              <Row label="Maximum supply" value="None" note="1 BTN per block with no halving, so the inflation rate falls as supply grows" />
            </>
          )}
        </Card>

        <Card title="Projection" subtitle="If block time and uncle rate stay as they are now.">
          {projection.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">Waiting for supply and issuance data…</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2">In</th>
                  <th className="py-2 text-right">Circulating supply</th>
                  <th className="py-2 text-right">Inflation that year</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {projection.map((p) => (
                  <tr key={p.years}>
                    <td className="py-2.5 font-sans font-semibold text-slate-700">{p.years} {p.years === 1 ? 'year' : 'years'}</td>
                    <td className="py-2.5 text-right font-bold text-slate-900">{fmt(p.supply)} BTN</td>
                    <td className="py-2.5 text-right text-slate-900">{(p.inflation * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Distribution" subtitle="Share of circulating supply held by the largest addresses (pools and exchanges included).">
          {top10 === null || top50 === null ? (
            <p className="text-xs text-slate-500 py-4 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-petrol" /> Loading the top accounts…
            </p>
          ) : (
            <div className="space-y-4 pt-2">
              <ShareBar label="Top 10 addresses" share={top10} />
              <ShareBar label="Top 50 addresses" share={top50} />
              <button onClick={() => onNavigate('rich-list')} className="inline-flex items-center gap-1 text-xs font-bold text-petrol hover:underline cursor-pointer">
                Top accounts <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </Card>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Market (NestEx BTN/USDT)</h2>
        <p className="text-xs text-slate-500 mb-2">NestEx is the only exchange listing BTN; prices are not on chain.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: '24h high', value: price.available ? `$${price.high24h}` : '—' },
            { label: '24h low', value: price.available ? `$${price.low24h}` : '—' },
            { label: '24h volume', value: price.available ? usd(price.volumeUsd) : '—' },
            { label: '24h volume (BTN)', value: price.available ? fmt(price.volumeBtn) : '—' },
          ].map((t) => (
            <div key={t.label} className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold block">{t.label}</span>
              <span className="text-base font-black text-slate-900">{t.value}</span>
            </div>
          ))}
        </div>
        <a href="https://trade.nestex.one/spot/BTN" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-petrol hover:underline">
          trade.nestex.one <ExternalLink className="w-3 h-3" />
        </a>
      </section>
    </div>
  );
};
