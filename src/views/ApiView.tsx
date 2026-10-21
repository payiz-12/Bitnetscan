import React, { useState } from 'react';
import { Braces, Play, RefreshCw, Copy, Check } from 'lucide-react';

interface Param {
  name: string;
  about: string;
}

interface Endpoint {
  path: string;
  example: string;
  title: string;
  about: string;
  params?: Param[];
  returns: string;
  cache: string;
  image?: boolean;
}

const ENDPOINTS: Endpoint[] = [
  {
    path: '/api/stats',
    example: '/api/stats',
    title: 'Network stats',
    about: 'Chain ID, latest block, average block time over the last 120 blocks, difficulty, hashrate, gas price, peers, Ethash epoch and DAG size.',
    returns: 'JSON',
    cache: '15 s',
  },
  {
    path: '/api/supply',
    example: '/api/supply',
    title: 'Supply',
    about: 'Circulating supply in BTN as plain text, for CoinGecko and CoinMarketCap. The sum of every account balance, recomputed hourly; burn addresses excluded.',
    params: [
      { name: 'q=total', about: 'Total supply instead of circulating supply.' },
      { name: 'format=json', about: 'The full snapshot: total, circulating, burned, block range and method.' },
    ],
    returns: 'Plain text (JSON with format=json)',
    cache: '5 min',
  },
  {
    path: '/api/address',
    example: '/api/address?address=0xfad4a236c87880035497043f24ea58d73c3e50de',
    title: 'Address',
    about: 'Balance (exact BTN and wei), nonce, whether the address is a contract, and its label if it is a known pool or token.',
    params: [{ name: 'address', about: 'Required. A 0x address.' }],
    returns: 'JSON',
    cache: '15 s',
  },
  {
    path: '/api/blocks',
    example: '/api/blocks?limit=5',
    title: 'Latest blocks',
    about: 'The newest blocks with miner, transactions, uncles, gas used, difficulty and subsidy (1 BTN + 1/32 BTN per uncle; fees not included).',
    params: [{ name: 'limit', about: 'Number of blocks, 1–50. Default 10.' }],
    returns: 'JSON',
    cache: '10 s',
  },
  {
    path: '/api/miners',
    example: '/api/miners?blocks=1000',
    title: 'Miner shares',
    about: 'Who mined the newest blocks: blocks and share per miner, the Nakamoto coefficient (fewest miners with more than half of the blocks) and the uncle rate.',
    params: [{ name: 'blocks', about: 'How many recent blocks to count, 100–2,000. Default 1,000.' }],
    returns: 'JSON',
    cache: '2 min',
  },
  {
    path: '/api/reorgs',
    example: '/api/reorgs',
    title: 'Chain reorganizations',
    about: 'Blocks the Bitnet explorer indexer had stored and later saw replaced by another chain, newest first. A lower bound: the indexer only records blocks it had already stored.',
    returns: 'JSON',
    cache: '15 min',
  },
  {
    path: '/api/og',
    example: '/api/og?type=block&id=7820729',
    title: 'Share card image',
    about: 'A 1200×630 PNG card for a transaction, block or address, as shown in link previews.',
    params: [
      { name: 'type', about: 'tx, block or address.' },
      { name: 'id', about: 'Transaction hash, block number or address.' },
    ],
    returns: 'PNG image',
    cache: '1 day (transactions, old blocks), 10 min (addresses)',
    image: true,
  },
];

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {})}
      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 cursor-pointer shrink-0"
      title="Copy URL"
    >
      {done ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

const EndpointCard: React.FC<{ e: Endpoint; origin: string }> = ({ e, origin }) => {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ status: number; ms: number; body?: string; image?: string } | null>(null);
  const url = `${origin}${e.example}`;

  const run = async () => {
    setBusy(true);
    setOut(null);
    const t0 = performance.now();
    try {
      const res = await fetch(e.example);
      const ms = Math.round(performance.now() - t0);
      const type = res.headers.get('content-type') || '';
      if (type.includes('text/html')) {
        setOut({ status: res.status, ms, body: 'The server answered with the app page instead of the API. This happens on the local development server, which does not run the API functions.' });
      } else if (e.image && type.startsWith('image/')) {
        setOut({ status: res.status, ms, image: URL.createObjectURL(await res.blob()) });
      } else if (type.includes('json')) {
        const text = JSON.stringify(await res.json(), null, 2);
        const lines = text.split('\n');
        setOut({ status: res.status, ms, body: lines.length > 60 ? `${lines.slice(0, 60).join('\n')}\n…` : text });
      } else {
        setOut({ status: res.status, ms, body: await res.text() });
      }
    } catch {
      setOut({ status: 0, ms: Math.round(performance.now() - t0), body: 'Request failed.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm min-w-0 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold font-mono">GET</span>
        <span className="font-mono font-bold text-sm text-slate-900">{e.path}</span>
        <span className="text-xs text-slate-500">· {e.title}</span>
      </div>
      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{e.about}</p>
      {e.params && (
        <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {e.params.map((p) => (
            <div key={p.name} className="px-3 py-2 flex flex-col sm:flex-row sm:gap-3 text-xs">
              <span className="font-mono font-bold text-petrol sm:w-32 shrink-0">{p.name}</span>
              <span className="text-slate-600">{p.about}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span>Returns: <span className="text-slate-700 font-semibold">{e.returns}</span></span>
        <span>Cached: <span className="text-slate-700 font-semibold">{e.cache}</span></span>
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
        <span className="font-mono text-[11px] sm:text-xs text-slate-800 break-all flex-1">{url}</span>
        <CopyButton text={url} />
      </div>
      <button type="button" onClick={run} disabled={busy} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-petrol hover:bg-petrol-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60">
        {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
        Try it
      </button>
      {out && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-slate-500">HTTP {out.status || '—'} · {out.ms} ms</p>
          {out.image ? (
            <img src={out.image} alt={`${e.title} example`} className="w-full rounded-xl border border-slate-200" />
          ) : (
            <pre className="max-h-80 overflow-auto rounded-xl theme-island bg-[#0B132B] text-emerald-300 text-[11px] sm:text-xs p-3 whitespace-pre-wrap break-all">{out.body}</pre>
          )}
        </div>
      )}
    </section>
  );
};

export const ApiView: React.FC = () => {
  const origin = window.location.origin;
  return (
    <div className="space-y-5 sm:space-y-6 w-full animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-petrol-50 border border-petrol-100 flex items-center justify-center text-petrol shrink-0">
            <Braces className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">BitnetScan API</h1>
            <p className="text-xs sm:text-sm text-slate-500">Free HTTPS endpoints for Bitnet chain data. No key needed.</p>
          </div>
        </div>
        <ul className="text-xs sm:text-sm text-slate-600 space-y-1 list-disc pl-5">
          <li>Base URL: <span className="font-mono text-slate-900">{origin}</span></li>
          <li>Every endpoint answers <span className="font-mono">GET</span> requests and allows calls from any website (CORS).</li>
          <li>Answers are cached at the edge for the time shown; please cache on your side as well and avoid polling faster than that.</li>
          <li>Data is read from the Bitnet JSON-RPC (<span className="font-mono">rpc.bitnetmoney.org</span>) when the cache refreshes. On an error the endpoint answers 503.</li>
        </ul>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start">
        {ENDPOINTS.map((e) => <EndpointCard key={e.path} e={e} origin={origin} />)}
      </div>
    </div>
  );
};
