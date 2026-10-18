import React, { useEffect, useState } from 'react';
import { Activity, Copy, Check, Server, Cpu, Code, ExternalLink } from 'lucide-react';
import { NetworkStats } from '../types/blockchain';
import { rpcService } from '../services/rpc';
import { fetchLivePoolStats, getCachedPoolStats, LivePoolStats, COOLPOOL_ADDR, GTPOOL_ADDR } from '../services/miningPoolStats';
import { fetchSupplySnapshot, SupplySnapshot } from '../services/supply';
import { ETHASH_EPOCH_LENGTH, ethashDagSize } from '../services/ethash';
import { RpcStatusView } from './RpcStatusView';

const RPC_URLS = ['https://rpc.bitnetmoney.org', 'https://rpc.bitnetmoney.com'];
const EXPLORERS = [
  { name: 'Bitnet Explorer (Blockscout)', url: 'https://explorer.bitnetmoney.com' },
  { name: 'BitnetScan', url: 'https://bitnetscan.vercel.app' },
];

const WALLET_CONFIG = {
  chainId: '0xd2',
  chainName: 'Bitnet',
  nativeCurrency: { name: 'Bitnet', symbol: 'BTN', decimals: 18 },
  rpcUrls: RPC_URLS,
  blockExplorerUrls: EXPLORERS.map((e) => e.url),
};

const formatGiB = (bytes: number) => `${(bytes / 2 ** 30).toFixed(2)} GiB`;

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-0.5 sm:gap-4 border-b border-slate-100 last:border-0">
    <span className="text-xs font-semibold text-slate-500">{label}</span>
    <div className="sm:col-span-2 text-xs sm:text-sm font-mono text-slate-900 break-all">{children}</div>
  </div>
);

const Card: React.FC<{ title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
  <section className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-3 mb-1 border-b border-slate-100">
      <Icon className="w-4 h-4 text-petrol" />
      {title}
    </h2>
    {children}
  </section>
);

export const NetworkView: React.FC<{ stats: NetworkStats | null }> = ({ stats }) => {
  const [node, setNode] = useState<{ client: string | null; networkId: string | null; genesis: string | null }>({ client: null, networkId: null, genesis: null });
  const [pools, setPools] = useState<Record<string, LivePoolStats>>(() => getCachedPoolStats());
  const [supply, setSupply] = useState<SupplySnapshot | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    rpcService
      .batch([
        { method: 'web3_clientVersion', params: [] },
        { method: 'net_version', params: [] },
        { method: 'eth_getBlockByNumber', params: ['0x0', false] },
      ])
      .then(([client, networkId, genesis]) => {
        if (active) setNode({ client, networkId, genesis: genesis?.hash ?? null });
      })
      .catch(() => {});
    fetchLivePoolStats().then((p) => { if (active) setPools({ ...p }); });
    fetchSupplySnapshot().then((s) => { if (active) setSupply(s); });
    return () => { active = false; };
  }, []);

  const height = stats?.latestBlock || 0;
  const epoch = height > 0 ? Math.floor(height / ETHASH_EPOCH_LENGTH) : null;
  const nextEpochBlock = epoch !== null ? (epoch + 1) * ETHASH_EPOCH_LENGTH : null;
  const blocksToNextEpoch = nextEpochBlock !== null ? nextEpochBlock - height : null;
  const hoursToNextEpoch = blocksToNextEpoch !== null && stats?.avgBlockTimeSeconds
    ? (blocksToNextEpoch * stats.avgBlockTimeSeconds) / 3600
    : null;

  const poolList = [
    { name: 'CoolPool', site: 'https://coolpool.top', stats: pools[COOLPOOL_ADDR] },
    { name: 'GTPool', site: 'https://gtpool.io', stats: pools[GTPOOL_ADDR] },
  ];

  const copyConfig = () => {
    navigator.clipboard?.writeText(JSON.stringify(WALLET_CONFIG, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="space-y-5 sm:space-y-6 w-full animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-petrol-50 border border-petrol-100 flex items-center justify-center text-petrol shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Bitnet Network</h1>
            <p className="text-xs sm:text-sm text-slate-500">Parameters for wallets, pools and node operators.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <Card title="Chain" icon={Server}>
          <Row label="Chain ID">210 (0xd2)</Row>
          <Row label="Network ID">{node.networkId ?? '…'}</Row>
          <Row label="Currency">BTN · 18 decimals</Row>
          <Row label="Genesis block hash">{node.genesis ?? '…'}</Row>
          <Row label="Latest block">{height > 0 ? `#${height.toLocaleString()}` : '…'}</Row>
          <Row label="Average block time">
            {stats?.avgBlockTimeSeconds ? `${stats.avgBlockTimeSeconds.toFixed(2)} s (last 120 blocks)` : '…'}
          </Row>
          <Row label="Gas price">{stats?.gasPriceGwei != null ? `${stats.gasPriceGwei} Gwei` : '…'}</Row>
          <Row label="Supply">
            {supply
              ? `${Number(supply.circulatingSupply).toLocaleString('en-US', { maximumFractionDigits: 2 })} BTN circulating · ${Number(supply.totalSupply).toLocaleString('en-US', { maximumFractionDigits: 2 })} BTN total (block #${supply.blockRange[1].toLocaleString()})`
              : '…'}
          </Row>
          <Row label="Node client">{node.client ?? '…'}</Row>
          <Row label="Node peers">{stats?.peerCount ?? '…'}</Row>
        </Card>

        <Card title="Mining (Ethash)" icon={Cpu}>
          <Row label="Algorithm">Ethash, epoch length {ETHASH_EPOCH_LENGTH.toLocaleString()} blocks</Row>
          <Row label="Current epoch">{epoch ?? '…'}</Row>
          <Row label="DAG size">
            {epoch !== null ? `${ethashDagSize(epoch).toLocaleString('en-US')} bytes (${formatGiB(ethashDagSize(epoch))})` : '…'}
          </Row>
          <Row label="Next epoch">
            {nextEpochBlock !== null
              ? `Block #${nextEpochBlock.toLocaleString()} · DAG ${formatGiB(ethashDagSize(epoch! + 1))}${hoursToNextEpoch !== null ? ` · in ~${hoursToNextEpoch.toFixed(1)} h` : ''}`
              : '…'}
          </Row>
          <Row label="Difficulty">{stats?.difficulty ?? '…'}</Row>
          <Row label="Network hashrate">{stats?.hashrateEstimate ?? '…'}</Row>
          <Row label="Block reward">1 BTN + transaction fees (fees are not burned)</Row>
          <Row label="Uncle inclusion">+1/32 BTN per uncle for the block miner (max 2 uncles)</Row>
          <Row label="Uncle reward">(8 − depth) / 8 BTN to the uncle miner, depth 1–6</Row>
          <p className="text-[11px] text-slate-500 pt-2">Reward rules checked against miner balance changes on chain.</p>
        </Card>
      </div>

      <Card title="Endpoints" icon={Code}>
        {RPC_URLS.map((url) => <Row key={url} label="JSON-RPC">{url}</Row>)}
        {EXPLORERS.map((e) => <Row key={e.url} label={e.name}>{e.url} <span className="text-slate-400">(/tx, /address, /block, /token)</span></Row>)}
        <Row label="BitnetScan API">
          <div className="space-y-1">
            <div><a className="text-petrol hover:underline" href="/api/stats" target="_blank" rel="noopener noreferrer">/api/stats</a> <span className="text-slate-500 font-sans">— live chain stats (JSON)</span></div>
            <div><a className="text-petrol hover:underline" href="/api/supply" target="_blank" rel="noopener noreferrer">/api/supply</a> <span className="text-slate-500 font-sans">— circulating supply (plain text)</span></div>
            <div><a className="text-petrol hover:underline" href="/api/supply?q=total" target="_blank" rel="noopener noreferrer">/api/supply?q=total</a> <span className="text-slate-500 font-sans">— total supply (plain text)</span></div>
            <div><a className="text-petrol hover:underline" href="/api/supply?format=json" target="_blank" rel="noopener noreferrer">/api/supply?format=json</a> <span className="text-slate-500 font-sans">— snapshot with block range</span></div>
          </div>
        </Row>
        <div className="pt-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-500">Wallet configuration (wallet_addEthereumChain)</span>
            <button
              onClick={copyConfig}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="p-3 rounded-2xl bg-[#0B132B] text-emerald-300 text-[11px] sm:text-xs overflow-x-auto">{JSON.stringify(WALLET_CONFIG, null, 2)}</pre>
        </div>
      </Card>

      <Card title="Pools and nodes" icon={Server}>
        {poolList.map(({ name, site, stats: pool }) => (
          <Row key={name} label={name}>
            {pool ? (
              <div className="space-y-1">
                <div className="font-sans text-slate-600">
                  {pool.workers} {pool.workers === 1 ? 'worker' : 'workers'}
                  {pool.hashrateGh !== undefined && ` · ${pool.hashrateGh.toFixed(2)} GH/s`}
                  {pool.feePercent !== undefined && ` · fee ${pool.feePercent}%`}
                </div>
                {pool.servers?.map((srv) => (
                  <div key={srv.host}>{srv.host} <span className="text-slate-400 font-sans">{srv.region}{srv.note ? ` · ${srv.note}` : ''}</span></div>
                ))}
              </div>
            ) : (
              <span className="font-sans text-slate-500">Loading…</span>
            )}
            <a href={site} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-petrol font-sans text-xs font-bold hover:underline mt-1">
              {site.replace('https://', '')} <ExternalLink className="w-3 h-3" />
            </a>
          </Row>
        ))}
        <Row label="Node software">
          <div className="space-y-1 font-sans">
            <a href="https://github.com/BitnetMoney/bitnet" target="_blank" rel="noopener noreferrer" className="text-petrol hover:underline">Bitnet Core (Geth fork)</a>
            {' · '}
            <a href="https://github.com/BitnetMoney/bitnet-desktop-node" target="_blank" rel="noopener noreferrer" className="text-petrol hover:underline">Bitnet Desktop Node</a>
          </div>
        </Row>
      </Card>

      <RpcStatusView />
    </div>
  );
};
