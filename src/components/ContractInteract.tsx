import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, PenSquare, Wallet, RefreshCw, AlertTriangle, CheckCircle2, ShieldCheck, ChevronDown, Info, XCircle } from 'lucide-react';
import { ethers } from 'ethers';
import { rpcService } from '../services/rpc';
import { loadContractAbi, AbiSource } from '../services/contractAbi';
import { AbiValue as Value } from './AbiValue';

interface Props {
  address: string;
  onSelectAddress: (a: string) => void;
  onSelectTx: (hash: string) => void;
}

type Eip1193 = { request: (args: { method: string; params?: unknown[] }) => Promise<any>; on?: (e: string, f: (...a: any[]) => void) => void; removeListener?: (e: string, f: (...a: any[]) => void) => void };
const wallet = (): Eip1193 | undefined => (window as any).ethereum;
const BITNET_CHAIN = '0xd2';

const inputCls = 'w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs text-slate-900 focus:outline-none focus:border-petrol';

/** Turns a text field into the value ethers expects for a Solidity parameter type. */
function parseArg(p: ethers.ParamType, raw: string): unknown {
  const v = raw.trim();
  const name = p.name || p.type;
  if (p.baseType === 'array' || p.baseType === 'tuple') {
    try { return JSON.parse(v); } catch { throw new Error(`${name}: enter JSON, e.g. ${p.baseType === 'array' ? '["0x…", "0x…"]' : '["value1", 2]'}`); }
  }
  if (p.baseType === 'address') {
    if (!ethers.isAddress(v)) throw new Error(`${name}: enter a 0x address`);
    return ethers.getAddress(v.toLowerCase());
  }
  if (p.baseType === 'bool') {
    if (/^(true|1)$/i.test(v)) return true;
    if (/^(false|0)$/i.test(v)) return false;
    throw new Error(`${name}: enter true or false`);
  }
  if (/^u?int/.test(p.baseType)) {
    try { return BigInt(v); } catch { throw new Error(`${name}: enter a whole number (decimal, or hex starting with 0x)`); }
  }
  if (p.baseType.startsWith('bytes')) {
    if (!/^0x([0-9a-fA-F]{2})*$/.test(v)) throw new Error(`${name}: enter hex bytes starting with 0x`);
    return v;
  }
  return raw;
}

const placeholder = (p: ethers.ParamType) =>
  p.baseType === 'address' ? '0x…' : p.baseType === 'bool' ? 'true / false' : /^u?int/.test(p.baseType) ? '0' : p.baseType === 'array' ? '[ … ] (JSON)' : p.baseType === 'tuple' ? '[ … ] (JSON, in field order)' : p.baseType.startsWith('bytes') ? '0x…' : '';

const revertText = (r: { error: string; data?: string }, iface: ethers.Interface) => {
  if (r.data && r.data !== '0x') {
    try {
      const err = iface.parseError(r.data);
      if (err?.name === 'Error') return String(err.args[0]);
      if (err?.name === 'Panic') return `Panic ${String(err.args[0])} (assert, overflow or division by zero)`;
      if (err) return `${err.name}(${err.args.map(String).join(', ')})`;
    } catch { /* not a custom error from this ABI */ }
    try {
      const reason = ethers.AbiCoder.defaultAbiCoder().decode(['string'], '0x' + r.data.slice(10))[0];
      if (r.data.startsWith('0x08c379a0')) return String(reason);
    } catch { /* not Error(string) */ }
  }
  return r.error.replace(/^execution reverted:?\s*/i, '') || 'execution reverted';
};

/** One read (view/pure) function: no-input ones load at once, others query on demand. */
const ReadFn: React.FC<{ fn: ethers.FunctionFragment; iface: ethers.Interface; address: string; index: number; onSelectAddress: (a: string) => void; token: { decimals: number; symbol: string } | null }> = ({ fn, iface, address, index, onSelectAddress, token }) => {
  const auto = fn.inputs.length === 0;
  const [open, setOpen] = useState(auto);
  const [args, setArgs] = useState<string[]>(() => fn.inputs.map(() => ''));
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ ok: true; values: ethers.Result } | { ok: false; error: string } | null>(null);
  const amountLike = token && ['balanceOf', 'totalSupply', 'allowance'].includes(fn.name);

  const query = async () => {
    setBusy(true);
    try {
      const data = iface.encodeFunctionData(fn, fn.inputs.map((p, i) => parseArg(p, args[i])));
      const r = await rpcService.simulateCall({ to: address, data });
      setOut(r.ok ? { ok: true, values: iface.decodeFunctionResult(fn, (r as { result: string }).result) } : { ok: false, error: revertText(r as { error: string; data?: string }, iface) });
    } catch (e: any) {
      setOut({ ok: false, error: e?.shortMessage || e?.message || 'Could not call this function' });
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { if (auto) query(); }, []);

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 text-left cursor-pointer">
        <span className="font-mono text-xs font-bold text-slate-900 truncate">{index}. {fn.name}<span className="text-slate-400 font-normal">({fn.inputs.map((p) => p.type).join(', ')})</span></span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="p-3 space-y-2 text-xs">
          {fn.inputs.map((p, i) => (
            <div key={i}>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">{p.name || `arg${i}`} <span className="font-mono text-slate-400">({p.type})</span></label>
              <input className={inputCls} placeholder={placeholder(p)} value={args[i]} onChange={(e) => setArgs((a) => a.map((x, j) => (j === i ? e.target.value : x)))} />
            </div>
          ))}
          {!auto && (
            <button type="button" onClick={query} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-petrol hover:bg-petrol-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60">
              {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />} Query
            </button>
          )}
          {busy && auto && <p className="text-slate-400">Reading…</p>}
          {out && (out.ok ? (
            <div className="font-mono space-y-1">
              {fn.outputs.map((p, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:gap-2">
                  <span className="text-slate-500 shrink-0">{p.name ? `${p.name} ` : ''}<span className="text-slate-400">{p.type}</span></span>
                  <Value p={p} v={(out as { values: ethers.Result }).values[i]} onSelectAddress={onSelectAddress} token={amountLike ? token : null} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-rose-700 flex items-start gap-1.5"><XCircle className="w-3.5 h-3.5 mt-px shrink-0" /> {(out as { error: string }).error}</p>
          ))}
        </div>
      )}
    </div>
  );
};

interface WalletState {
  account: string | null;
  chainId: string | null;
}

/** One state-changing function: checked with eth_call first, then sent by the user's wallet. */
const WriteFn: React.FC<{ fn: ethers.FunctionFragment; iface: ethers.Interface; address: string; index: number; w: WalletState; ensureReady: () => Promise<string>; onSelectTx: (h: string) => void }> = ({ fn, iface, address, index, w, ensureReady, onSelectTx }) => {
  const [open, setOpen] = useState(false);
  const [args, setArgs] = useState<string[]>(() => fn.inputs.map(() => ''));
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [warn, setWarn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ hash: string; status: 'pending' | 'success' | 'failed'; block?: number } | null>(null);

  const build = () => {
    const data = iface.encodeFunctionData(fn, fn.inputs.map((p, i) => parseArg(p, args[i])));
    let wei = 0n;
    if (fn.payable && value.trim()) {
      try { wei = ethers.parseEther(value.trim()); } catch { throw new Error('Value: enter an amount in BTN, e.g. 1.5'); }
    }
    return { data, wei };
  };

  const track = async (hash: string) => {
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      try {
        const r = await rpcService.getTransactionReceipt(hash);
        if (r) { setSent({ hash, status: r.status === '0x1' ? 'success' : 'failed', block: parseInt(r.blockNumber, 16) }); return; }
      } catch { /* keep waiting */ }
    }
  };

  const send = async (force = false) => {
    setError(null);
    setBusy(true);
    try {
      const { data, wei } = build();
      const from = await ensureReady();
      const tx = { from, to: address, data, value: '0x' + wei.toString(16) };
      if (!force) {
        const sim = await rpcService.simulateCall(tx);
        if (!sim.ok) { setWarn(revertText(sim as { error: string; data?: string }, iface)); return; }
      }
      setWarn(null);
      const hash: string = await wallet()!.request({ method: 'eth_sendTransaction', params: [tx] });
      setSent({ hash, status: 'pending' });
      track(hash);
    } catch (e: any) {
      setError(e?.code === 4001 ? 'You rejected the request in your wallet.' : e?.shortMessage || e?.message || 'The transaction could not be sent.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 text-left cursor-pointer">
        <span className="font-mono text-xs font-bold text-slate-900 truncate">
          {index}. {fn.name}<span className="text-slate-400 font-normal">({fn.inputs.map((p) => p.type).join(', ')})</span>
          {fn.payable && <span className="ml-1.5 px-1.5 py-px rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-sans">payable</span>}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="p-3 space-y-2 text-xs">
          {fn.payable && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Value to send <span className="font-mono text-slate-400">(BTN)</span></label>
              <input className={inputCls} placeholder="0" value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
          )}
          {fn.inputs.map((p, i) => (
            <div key={i}>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">{p.name || `arg${i}`} <span className="font-mono text-slate-400">({p.type})</span></label>
              <input className={inputCls} placeholder={placeholder(p)} value={args[i]} onChange={(e) => setArgs((a) => a.map((x, j) => (j === i ? e.target.value : x)))} />
            </div>
          ))}
          <button type="button" onClick={() => send(false)} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-petrol hover:bg-petrol-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60">
            {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PenSquare className="w-3.5 h-3.5" />} {w.account ? 'Write' : 'Connect wallet and write'}
          </button>
          {warn && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 space-y-1.5">
              <p className="text-amber-900 flex items-start gap-1.5"><AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" /> A test run of this call failed, so it would most likely fail on chain and still cost gas: {warn}</p>
              <button type="button" onClick={() => send(true)} className="text-[11px] font-bold text-amber-900 underline cursor-pointer">Send anyway</button>
            </div>
          )}
          {error && <p className="text-rose-700 flex items-start gap-1.5"><XCircle className="w-3.5 h-3.5 mt-px shrink-0" /> {error}</p>}
          {sent && (
            <p className={`flex items-center gap-1.5 ${sent.status === 'failed' ? 'text-rose-700' : sent.status === 'success' ? 'text-emerald-700' : 'text-slate-600'}`}>
              {sent.status === 'pending' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : sent.status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {sent.status === 'pending' ? 'Sent, waiting for a block' : sent.status === 'success' ? `Confirmed in block #${sent.block?.toLocaleString()}` : `Failed in block #${sent.block?.toLocaleString()}`}
              · <button type="button" onClick={() => onSelectTx(sent.hash)} className="font-mono text-petrol hover:underline cursor-pointer">{sent.hash.slice(0, 10)}…{sent.hash.slice(-6)}</button>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/** Read and write any function of a verified contract (or a standard BTS-20 token). */
export const ContractInteract: React.FC<Props> = ({ address, onSelectAddress, onSelectTx }) => {
  const [source, setSource] = useState<AbiSource | null>(null);
  const [mode, setMode] = useState<'read' | 'write'>('read');
  const [w, setW] = useState<WalletState>({ account: null, chainId: null });
  const [walletError, setWalletError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setSource(null);
    loadContractAbi(address).then((s) => { if (active) setSource(s); }).catch(() => { if (active) setSource({ kind: 'none' }); });
    return () => { active = false; };
  }, [address]);

  useEffect(() => {
    const eth = wallet();
    if (!eth) return;
    eth.request({ method: 'eth_accounts' }).then((a: string[]) => setW((s) => ({ ...s, account: a?.[0] ?? null }))).catch(() => {});
    eth.request({ method: 'eth_chainId' }).then((c: string) => setW((s) => ({ ...s, chainId: c }))).catch(() => {});
    const onAccounts = (a: string[]) => setW((s) => ({ ...s, account: a?.[0] ?? null }));
    const onChain = (c: string) => setW((s) => ({ ...s, chainId: c }));
    eth.on?.('accountsChanged', onAccounts);
    eth.on?.('chainChanged', onChain);
    return () => { eth.removeListener?.('accountsChanged', onAccounts); eth.removeListener?.('chainChanged', onChain); };
  }, []);

  const iface = useMemo(() => (source && source.kind !== 'none' ? new ethers.Interface(source.abi) : null), [source]);
  const fns = useMemo(() => {
    if (!iface) return { read: [] as ethers.FunctionFragment[], write: [] as ethers.FunctionFragment[] };
    const all = iface.fragments.filter((f): f is ethers.FunctionFragment => f.type === 'function');
    return { read: all.filter((f) => f.constant), write: all.filter((f) => !f.constant) };
  }, [iface]);
  const token = source?.kind === 'standard' ? { decimals: source.decimals, symbol: source.symbol } : null;

  /** Connects the wallet and makes sure it is on Bitnet; returns the account. */
  const ensureReady = async (): Promise<string> => {
    const eth = wallet();
    if (!eth) throw new Error('No browser wallet found. Install MetaMask or another EIP-1193 wallet.');
    setWalletError(null);
    const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
    const account = accounts?.[0];
    if (!account) throw new Error('The wallet did not share an account.');
    const chainId: string = await eth.request({ method: 'eth_chainId' });
    if (chainId?.toLowerCase() !== BITNET_CHAIN) {
      try {
        await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: BITNET_CHAIN }] });
      } catch (e: any) {
        if (e?.code !== 4902) throw new Error('Switch your wallet to the Bitnet network (chain 210) to write.');
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [{ chainId: BITNET_CHAIN, chainName: 'Bitnet', nativeCurrency: { name: 'Bitnet', symbol: 'BTN', decimals: 18 }, rpcUrls: ['https://rpc.bitnetmoney.org', 'https://rpc.bitnetmoney.com'], blockExplorerUrls: [window.location.origin] }],
        });
      }
    }
    setW({ account, chainId: BITNET_CHAIN });
    return account;
  };

  const connect = () => ensureReady().catch((e) => setWalletError(e?.code === 4001 ? 'You rejected the request in your wallet.' : e?.message || 'Could not connect the wallet.'));

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Read / Write Contract</h3>
          {source?.kind === 'verified' && <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 mt-0.5"><ShieldCheck className="w-3.5 h-3.5" /> {source.name} · source verified on the Bitnet explorer</p>}
          {source?.kind === 'standard' && <p className="text-xs text-amber-800 flex items-center gap-1.5 mt-0.5"><Info className="w-3.5 h-3.5" /> {source.name} ({source.symbol}) · source not verified; shown with the standard BTS-20 interface it answers to</p>}
        </div>
        {source && source.kind !== 'none' && (
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 self-start" role="group" aria-label="Read or write">
            {(['read', 'write'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${mode === m ? 'bg-petrol text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                {m === 'read' ? <BookOpen className="w-3.5 h-3.5" /> : <PenSquare className="w-3.5 h-3.5" />}
                {m === 'read' ? `Read (${fns.read.length})` : `Write (${fns.write.length})`}
              </button>
            ))}
          </div>
        )}
      </div>

      {source === null ? (
        <div className="space-y-2" role="status" aria-label="Loading contract">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-10 rounded-2xl" />)}</div>
      ) : source.kind === 'none' ? (
        <p className="text-xs text-slate-600 py-4">
          This contract's source is not verified on the Bitnet explorer, so its functions cannot be listed. Once the source is verified at explorer.bitnetmoney.com, every function appears here.
        </p>
      ) : mode === 'read' ? (
        <div className="space-y-2">
          {fns.read.length === 0 ? <p className="text-xs text-slate-500">No read functions.</p> : fns.read.map((fn, i) => (
            <ReadFn key={fn.selector + i} fn={fn} iface={iface!} address={address} index={i + 1} onSelectAddress={onSelectAddress} token={token} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-slate-600 flex items-start gap-1.5">
              <Wallet className="w-3.5 h-3.5 mt-px shrink-0 text-petrol" />
              {w.account
                ? <>Connected: <span className="font-mono text-slate-900">{w.account.slice(0, 6)}…{w.account.slice(-4)}</span>{w.chainId?.toLowerCase() !== BITNET_CHAIN && <span className="text-amber-800"> · not on Bitnet</span>}</>
                : 'Your wallet signs and sends every transaction; BitnetScan never sees your keys.'}
            </span>
            {(!w.account || w.chainId?.toLowerCase() !== BITNET_CHAIN) && (
              <button type="button" onClick={connect} className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-petrol hover:bg-petrol-600 text-white text-xs font-bold cursor-pointer">
                <Wallet className="w-3.5 h-3.5" /> {w.account ? 'Switch to Bitnet' : 'Connect wallet'}
              </button>
            )}
          </div>
          {walletError && <p className="text-xs text-rose-700">{walletError}</p>}
          <p className="text-[11px] text-slate-500">Each call is first run as a test against the latest block; if it would fail, you see why before anything is sent. Check the details in your wallet before confirming.</p>
          {fns.write.length === 0 ? <p className="text-xs text-slate-500">No write functions.</p> : fns.write.map((fn, i) => (
            <WriteFn key={fn.selector + i} fn={fn} iface={iface!} address={address} index={i + 1} w={w} ensureReady={ensureReady} onSelectTx={onSelectTx} />
          ))}
        </div>
      )}
    </div>
  );
};
