import React, { useEffect, useMemo, useState } from 'react';
import { Pickaxe, Wallet, Server, Terminal, Search, Copy, Check, HardDrive, ShieldAlert, ExternalLink, PlusCircle } from 'lucide-react';
import { NetworkStats } from '../types/blockchain';
import { fetchLivePoolStats, getCachedPoolStats, LivePoolStats, COOLPOOL_ADDR, GTPOOL_ADDR } from '../services/miningPoolStats';
import { loadExactHistory, ExactHistory, btnPerGhDay } from '../services/exactHistory';
import { priceService, BtnPriceData } from '../services/priceService';
import { ethashDagSize, ETHASH_EPOCH_LENGTH } from '../services/ethash';
import { formatHashrate } from '../services/hashrate';

interface MineViewProps {
  stats: NetworkStats | null;
  onSelectMiner: (address: string) => void;
  onSelectAddress: (address: string) => void;
  onNavigate: (view: string) => void;
}

const POOLS = [
  { address: COOLPOOL_ADDR, name: 'CoolPool', site: 'https://coolpool.top', kind: 'Solo pool', about: 'Each block your rigs find pays you its whole reward, so payouts come in lumps; small rigs can wait long between blocks.' },
  { address: GTPOOL_ADDR, name: 'GTPool', site: 'https://gtpool.io', kind: 'Multi-coin pool', about: 'You set a payout wallet on the pool; it pays out manually or automatically, as its site describes.' },
];

const MINERS = [
  { id: 'lolminer', name: 'lolMiner', gpus: 'NVIDIA and AMD', cmd: (h: string, w: string, k: string) => `lolMiner --algo ETHASH --pool ${h} --user ${w}.${k}` },
  { id: 'trex', name: 'T-Rex', gpus: 'NVIDIA', cmd: (h: string, w: string, k: string) => `t-rex -a ethash -o stratum+tcp://${h} -u ${w} -w ${k} -p x` },
  { id: 'teamred', name: 'TeamRedMiner', gpus: 'AMD', cmd: (h: string, w: string, k: string) => `teamredminer -a ethash -o stratum+tcp://${h} -u ${w}.${k} -p x` },
  { id: 'gminer', name: 'GMiner', gpus: 'NVIDIA and AMD', cmd: (h: string, w: string, k: string) => `miner --algo ethash --server ${h} --user ${w}.${k}` },
  { id: 'srb', name: 'SRBMiner-Multi', gpus: 'AMD and NVIDIA', cmd: (h: string, w: string, k: string) => `SRBMiner-MULTI --algorithm ethash --pool ${h} --wallet ${w}.${k}` },
];

const GIB = 2 ** 30;
const isAddress = (v: string) => /^0x[0-9a-fA-F]{40}$/.test(v.trim());
const fmt = (v: number, digits = 0) => v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const monthYear = (ms: number) => new Date(ms).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const Step: React.FC<{ n: number; title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ n, title, icon, children }) => (
  <section className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-3 min-w-0">
    <div className="flex items-center gap-3">
      <span className="w-9 h-9 rounded-xl bg-petrol text-white flex items-center justify-center font-black shrink-0">{n}</span>
      <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">{icon}{title}</h2>
    </div>
    <div className="text-sm text-slate-600 space-y-3">{children}</div>
  </section>
);

const CopyBlock: React.FC<{ text: string; label: string }> = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-2xl theme-island bg-[#0B132B] border border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-slate-700">
        <span className="text-[11px] font-semibold text-slate-400">{label}</span>
        <button
          type="button"
          onClick={() => { navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {}); }}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 text-xs text-emerald-300 font-mono whitespace-pre-wrap break-all">{text}</pre>
    </div>
  );
};

/** A step-by-step guide to mining Bitnet, with live network figures, pool servers and miner commands. */
export const MineView: React.FC<MineViewProps> = ({ stats, onSelectMiner, onSelectAddress, onNavigate }) => {
  const [pools, setPools] = useState<Record<string, LivePoolStats>>(() => getCachedPoolStats());
  const [history, setHistory] = useState<ExactHistory | null>(null);
  const [price, setPrice] = useState<BtnPriceData>(priceService.getCachedPrice());
  const [wallet, setWallet] = useState('');
  const [worker, setWorker] = useState('rig1');
  const [server, setServer] = useState('');
  const [walletAdded, setWalletAdded] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchLivePoolStats().then((p) => { if (active) setPools(p); }).catch(() => {});
    loadExactHistory().then((h) => { if (active) setHistory(h); }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => priceService.subscribe(setPrice), []);

  const servers = useMemo(() => POOLS.flatMap((p) => (pools[p.address]?.servers ?? []).map((s) => ({ pool: p.name, ...s }))), [pools]);
  useEffect(() => { if (!server && servers.length) setServer(servers[0].host); }, [servers, server]);

  // Network figures: the last complete day from the history of every block, live stats otherwise.
  const lastDay = history?.days.filter((d) => d.work !== null).at(-1) ?? null;
  const perGh = lastDay ? btnPerGhDay(lastDay.issued, lastDay.work!) : null;
  const recent = history?.days.slice(-30) ?? [];
  const majorityDays = recent.filter((d) => d.blocks > 0 && d.miners.length > 0 && Math.max(...d.miners.map(([, n]) => n)) * 2 > d.blocks).length;
  const shareYesterday = (address: string) => {
    if (!history || !lastDay) return null;
    const i = history.miners.indexOf(address);
    const row = lastDay.miners.find(([m]) => m === i);
    return row ? row[1] / lastDay.blocks : 0;
  };

  // DAG: now, and when it passes 4 GiB (4 GB cards stop somewhat earlier, as the driver keeps memory).
  const height = stats?.latestBlock ?? 0;
  const epoch = Math.floor(height / ETHASH_EPOCH_LENGTH);
  const dagNow = height ? ethashDagSize(epoch) : null;
  let fourGbEpoch = epoch;
  while (height && ethashDagSize(fourGbEpoch) < 4 * GIB) fourGbEpoch++;
  const blockTime = stats?.avgBlockTimeSeconds && stats.avgBlockTimeSeconds > 0 ? stats.avgBlockTimeSeconds : 14.4;
  const fourGbDate = height ? Date.now() + (fourGbEpoch * ETHASH_EPOCH_LENGTH - height) * blockTime * 1000 : null;

  const walletOk = isAddress(wallet);
  const w = walletOk ? wallet.trim() : 'YOUR_BTN_ADDRESS';
  const k = worker.trim().replace(/[^A-Za-z0-9_-]/g, '') || 'rig1';
  const host = server || 'POOL_HOST:PORT';

  const addNetwork = async () => {
    const eth = (window as any).ethereum;
    if (!eth) { setWalletAdded('No browser wallet found. Install MetaMask or another EVM wallet, then try again.'); return; }
    try {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0xd2',
          chainName: 'Bitnet Mainnet',
          nativeCurrency: { name: 'Bitnet', symbol: 'BTN', decimals: 18 },
          rpcUrls: ['https://rpc.bitnetmoney.org/', 'https://rpc.bitnetmoney.com/'],
          blockExplorerUrls: [window.location.origin],
        }],
      });
      setWalletAdded('Bitnet was added to your wallet.');
    } catch {
      setWalletAdded('The wallet did not add the network.');
    }
  };

  const facts = [
    { label: 'Algorithm', value: 'Ethash', note: 'Any Ethash GPU miner works' },
    { label: 'Reward', value: '1 BTN per block', note: 'Plus uncle rewards and fees; no halving' },
    { label: 'Network', value: stats?.hashrateHps ? formatHashrate(stats.hashrateHps) : '…', note: `Blocks every ~${blockTime.toFixed(1)} s` },
    { label: '1 GH/s earned', value: perGh !== null ? `${fmt(perGh, 1)} BTN / day` : '…', note: lastDay ? `On ${lastDay.date}${perGh !== null && price.available ? ` · ≈ $${(perGh * price.priceUsd).toFixed(2)}` : ''}` : 'From every block' },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 w-full animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-petrol-50 border border-petrol-100 flex items-center justify-center text-petrol shrink-0">
            <Pickaxe className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">How to Mine Bitnet</h1>
            <p className="text-xs sm:text-sm text-slate-500">Bitnet (BTN) is a proof-of-work chain mined with GPUs on Ethash. Four steps from a wallet to your first block.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {facts.map((f) => (
            <div key={f.label} className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 min-w-0">
              <span className="text-[11px] text-slate-500 font-semibold block">{f.label}</span>
              <span className="text-base sm:text-lg font-black text-slate-900 block truncate">{f.value}</span>
              <span className="text-[11px] text-slate-500 block">{f.note}</span>
            </div>
          ))}
        </div>
        {dagNow !== null && (
          <div className="flex items-start gap-2 p-3 rounded-2xl bg-petrol-50 border border-petrol-100 text-xs text-slate-700">
            <HardDrive className="w-4 h-4 text-petrol shrink-0 mt-0.5" />
            <span>
              The DAG is {(dagNow / GIB).toFixed(2)} GiB now (epoch {epoch}), so <span className="font-bold text-slate-900">cards with 4 GB of memory can mine Bitnet</span>. It grows by 8 MiB every {ETHASH_EPOCH_LENGTH.toLocaleString()} blocks (about {((ETHASH_EPOCH_LENGTH * blockTime) / 86400).toFixed(1)} days) and passes 4 GiB at epoch {fourGbEpoch}{fourGbDate ? `, around ${monthYear(fourGbDate)}` : ''}; 4 GB cards stop a little earlier, as the driver keeps some memory.
            </span>
          </div>
        )}
      </div>

      <Step n={1} title="Get a BTN address" icon={<Wallet className="w-4 h-4 text-petrol" />}>
        <p>Bitnet is an EVM chain, so any Ethereum wallet holds BTN: MetaMask, Rabby, a hardware wallet. Add the Bitnet network (chain ID 210) to your wallet and copy your address.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={addNetwork} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-petrol hover:bg-petrol-600 text-white text-xs font-bold cursor-pointer">
            <PlusCircle className="w-4 h-4" /> Add Bitnet to my wallet
          </button>
          <button type="button" onClick={() => onNavigate('nodes')} className="text-xs font-bold text-petrol hover:underline cursor-pointer">Network settings to enter by hand</button>
        </div>
        {walletAdded && <p className="text-xs text-slate-500">{walletAdded}</p>}
      </Step>

      <Step n={2} title="Choose a pool" icon={<Server className="w-4 h-4 text-petrol" />}>
        <p>
          A pool collects work from many rigs. Bitnet is safest when no single miner mines more than half of the blocks; on {majorityDays} of the last {recent.length || 30} days one miner did.{' '}
          <button type="button" onClick={() => onNavigate('security')} className="font-bold text-petrol hover:underline cursor-pointer">See the majority history</button>. Spreading hashrate across pools, or mining solo, makes the chain harder to attack.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {POOLS.map((p) => {
            const live = pools[p.address];
            const share = shareYesterday(p.address);
            return (
              <div key={p.name} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">{p.name} <span className="ml-1 text-[11px] font-semibold text-slate-500">{p.kind}</span></span>
                  <a href={p.site} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-petrol hover:underline">{p.site.replace('https://', '')} <ExternalLink className="w-3 h-3" /></a>
                </div>
                <p className="text-xs">{p.about}</p>
                <p className="text-xs text-slate-500">
                  {live?.feePercent !== undefined ? `Fee ${live.feePercent}%` : 'Fee: see the pool'}
                  {live?.minPayoutBtn !== undefined ? ` · Minimum payout ${live.minPayoutBtn} BTN` : ''}
                  {share !== null && lastDay ? ` · Mined ${(share * 100).toFixed(0)}% of the blocks on ${lastDay.date}` : ''}
                </p>
                {live?.servers?.length ? (
                  <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                    {live.servers.map((s) => (
                      <div key={s.host} className="px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-mono font-bold text-slate-900 select-all break-all">{s.host}</span>
                        <span className="text-slate-500">{s.region}{s.note ? ` · ${s.note}` : ''}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Server list: on the pool's site.</p>
                )}
                <button type="button" onClick={() => onSelectMiner(p.address)} className="text-xs font-bold text-petrol hover:underline cursor-pointer">Its blocks, rewards and payouts →</button>
              </div>
            );
          })}
        </div>
        <p className="text-xs">
          <span className="font-bold text-slate-900">Mining with your own node:</span> the{' '}
          <a href="https://github.com/BitnetMoney/bitnet-desktop-node/releases" target="_blank" rel="noopener noreferrer" className="font-bold text-petrol hover:underline">Bitnet Desktop Node</a>{' '}
          (Windows) runs a node and mines with an ordinary computer; the{' '}
          <a href="https://github.com/BitnetMoney/bitnet" target="_blank" rel="noopener noreferrer" className="font-bold text-petrol hover:underline">Bitnet client</a>{' '}
          builds on Linux, macOS and Windows and joins with <code className="font-mono text-[11px]">--networkid 210</code>. A node also helps the network.
        </p>
      </Step>

      <Step n={3} title="Start your miner" icon={<Terminal className="w-4 h-4 text-petrol" />}>
        <p>Enter your address and pick a server; the commands below fill in.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="md:col-span-2 text-xs font-semibold text-slate-600 space-y-1">
            <span>Your BTN address</span>
            <input value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="0x…" spellCheck={false}
              className={`w-full px-3 py-2 rounded-xl border bg-white font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-petrol/30 ${wallet && !walletOk ? 'border-rose-300' : 'border-slate-200'}`} />
            {wallet && !walletOk && <span className="text-rose-600 font-normal">An address is 0x followed by 40 hex characters.</span>}
          </label>
          <label className="text-xs font-semibold text-slate-600 space-y-1">
            <span>Worker name</span>
            <input value={worker} onChange={(e) => setWorker(e.target.value)} spellCheck={false}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-petrol/30" />
          </label>
        </div>
        {servers.length > 0 && (
          <label className="block text-xs font-semibold text-slate-600 space-y-1">
            <span>Server</span>
            <select value={server} onChange={(e) => setServer(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-petrol/30">
              {servers.map((s) => <option key={s.host} value={s.host}>{s.pool} · {s.region} · {s.host}</option>)}
            </select>
          </label>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {MINERS.map((m) => <CopyBlock key={m.id} label={`${m.name} (${m.gpus})`} text={m.cmd(host, w, k)} />)}
          <CopyBlock
            label="HiveOS flight sheet"
            text={`Coin: BTN (add a custom coin)\nWallet: ${w}\nPool: Configure in miner\nMiner: lolMiner\n  Algo: ETHASH\n  Wallet and worker template: %WAL%.%WORKER_NAME%\n  Pool URL: ${host}\n  Pass: x`}
          />
        </div>
        <p className="text-xs text-slate-500">These are the standard Ethash settings; a pool's own page may list extra options (for example a stratum mode). Download miners only from their official sites.</p>
      </Step>

      <Step n={4} title="Check your rewards" icon={<Search className="w-4 h-4 text-petrol" />}>
        <p>Once your rigs find shares, the pool shows your hashrate. When your address starts receiving BTN, BitnetScan shows every reward and payout.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={!walletOk} onClick={() => onSelectAddress(wallet.trim())}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            My address page
          </button>
          <button type="button" disabled={!walletOk} onClick={() => onSelectMiner(wallet.trim())}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            My miner page (solo blocks)
          </button>
          <button type="button" onClick={() => onNavigate('mining')} className="text-xs font-bold text-petrol hover:underline cursor-pointer">Profitability calculator</button>
          {!walletOk && <span className="text-xs text-slate-500">Enter your address in step 3 first.</span>}
        </div>
      </Step>

      <div className="flex items-start gap-2 p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600">
        <ShieldAlert className="w-4 h-4 text-petrol shrink-0 mt-0.5" />
        <span>Mining uses electricity and wears hardware; the calculator on the Mining page compares the BTN you would earn with your power cost. BitnetScan is not affiliated with any pool.</span>
      </div>
    </div>
  );
};
