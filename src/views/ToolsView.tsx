import React, { useState } from 'react';
import { Wrench, Calculator, CalendarSearch, PenLine, Hash, AtSign, CheckCircle2, XCircle, RefreshCw, Copy, Check } from 'lucide-react';
import { ethers } from 'ethers';
import { rpcService } from '../services/rpc';
import type { Block } from '../types/blockchain';

interface ToolsViewProps {
  onSelectBlock: (n: number) => void;
  onSelectAddress: (a: string) => void;
}

const input = 'w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:border-petrol shadow-xs';
const label = 'block text-xs font-semibold text-slate-700 mb-1';
const btn = 'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-petrol hover:bg-petrol-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60';

const Card: React.FC<{ icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string; children: React.ReactNode }> = ({ icon: Icon, title, subtitle, children }) => (
  <section className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm min-w-0 space-y-3">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-petrol-50 border border-petrol-100 flex items-center justify-center text-petrol shrink-0">
        <Icon className="w-[18px] h-[18px]" />
      </div>
      <div>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
    {children}
  </section>
);

const CopyValue: React.FC<{ value: string }> = ({ value }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {})}
      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 cursor-pointer shrink-0"
      title="Copy"
    >
      {done ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

const Result: React.FC<{ name: string; value: string }> = ({ name, value }) => (
  <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0">
    <span className="text-xs text-slate-500 shrink-0">{name}</span>
    <span className="flex items-center gap-1 min-w-0">
      <span className="font-mono text-xs text-slate-900 break-all text-right">{value}</span>
      <CopyValue value={value} />
    </span>
  </div>
);

/** Wei, Gwei and BTN kept in sync with exact integer arithmetic. */
const UnitConverter: React.FC = () => {
  const [wei, setWei] = useState<bigint | null>(10n ** 18n);
  const [edit, setEdit] = useState<{ unit: 'wei' | 'gwei' | 'btn'; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const decimals = { wei: 0, gwei: 9, btn: 18 } as const;
  const shown = (unit: 'wei' | 'gwei' | 'btn') => {
    if (edit?.unit === unit) return edit.text;
    if (wei === null) return '';
    const s = ethers.formatUnits(wei, decimals[unit]);
    return s.endsWith('.0') ? s.slice(0, -2) : s;
  };
  const change = (unit: 'wei' | 'gwei' | 'btn', text: string) => {
    setEdit({ unit, text });
    const clean = text.trim().replace(/,/g, '');
    if (!clean) { setWei(null); setError(null); return; }
    try {
      const v = ethers.parseUnits(clean, decimals[unit]);
      if (v < 0n) throw new Error('negative');
      setWei(v);
      setError(null);
    } catch {
      setError(unit === 'wei' ? 'Wei must be a whole number.' : `Enter a number with at most ${decimals[unit]} decimals.`);
    }
  };
  return (
    <Card icon={Calculator} title="Unit converter" subtitle="1 BTN = 10⁹ Gwei = 10¹⁸ wei, converted exactly.">
      {(['btn', 'gwei', 'wei'] as const).map((u) => (
        <div key={u}>
          <label className={label} htmlFor={`unit-${u}`}>{u === 'btn' ? 'BTN' : u === 'gwei' ? 'Gwei' : 'Wei'}</label>
          <input id={`unit-${u}`} inputMode="decimal" className={input} value={shown(u)} onChange={(e) => change(u, e.target.value)} onBlur={() => setEdit(null)} />
        </div>
      ))}
      {error && <p className="text-xs text-rose-700">{error}</p>}
    </Card>
  );
};

async function headerAt(n: number): Promise<Block> {
  const [b] = await rpcService.getBlockHeadersByNumbers([n], { cache: false });
  if (!b) throw new Error(`Block ${n} unavailable`);
  return b;
}

/** Exact binary search for the last block mined at or before a UTC time. */
const BlockByDate: React.FC<{ onSelectBlock: (n: number) => void }> = ({ onSelectBlock }) => {
  const [value, setValue] = useState(() => new Date(Date.now() - 86400000).toISOString().slice(0, 16));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ block: Block; next: Block | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const find = async () => {
    const target = Math.floor(Date.parse(`${value}:00Z`) / 1000);
    if (!Number.isFinite(target)) { setError('Enter a date and time.'); return; }
    setBusy(true); setError(null); setResult(null);
    try {
      const headNumber = await rpcService.getBlockNumber();
      let lo = await headerAt(1);
      let hi = await headerAt(headNumber);
      if (target < lo.timestamp) throw new Error(`Bitnet's first block was mined on ${new Date(lo.timestamp * 1000).toUTCString()}.`);
      if (target >= hi.timestamp) {
        setResult({ block: hi, next: null });
        return;
      }
      // Invariant: lo.timestamp <= target < hi.timestamp. Interpolation and bisection steps
      // alternate, so the search ends within about 2 × log2(height) header reads.
      for (let step = 0; hi.number - lo.number > 1; step++) {
        const fraction = (target - lo.timestamp) / Math.max(1, hi.timestamp - lo.timestamp);
        let mid = step % 2 === 0 ? Math.floor(lo.number + fraction * (hi.number - lo.number)) : Math.floor((lo.number + hi.number) / 2);
        if (mid <= lo.number || mid >= hi.number) mid = Math.floor((lo.number + hi.number) / 2);
        const b = await headerAt(mid);
        if (b.timestamp <= target) lo = b; else hi = b;
      }
      setResult({ block: lo, next: hi });
    } catch (e: any) {
      setError(e?.message || 'Could not read blocks from the RPC.');
    } finally {
      setBusy(false);
    }
  };

  const when = (ts: number) => new Date(ts * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC');
  return (
    <Card icon={CalendarSearch} title="Block by date" subtitle="The last block mined at or before a moment, found exactly by binary search.">
      <div>
        <label className={label} htmlFor="block-date">Date and time (UTC)</label>
        <input id="block-date" type="datetime-local" className={input} value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
      <button className={btn} onClick={find} disabled={busy}>
        {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CalendarSearch className="w-3.5 h-3.5" />}
        Find block
      </button>
      {error && <p className="text-xs text-rose-700">{error}</p>}
      {result && (
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Block</span>
            <button onClick={() => onSelectBlock(result.block.number)} className="font-mono font-bold text-petrol hover:underline cursor-pointer">#{result.block.number.toLocaleString()}</button>
          </div>
          <div className="flex items-center justify-between gap-2"><span className="text-slate-500">Mined at</span><span className="font-mono text-slate-900">{when(result.block.timestamp)}</span></div>
          {result.next ? (
            <div className="flex items-center justify-between gap-2"><span className="text-slate-500">Next block</span><span className="font-mono text-slate-900">#{result.next.number.toLocaleString()} · {when(result.next.timestamp)}</span></div>
          ) : (
            <p className="text-slate-500">That moment is after the newest block, so this is the chain head.</p>
          )}
        </div>
      )}
    </Card>
  );
};

/** personal_sign (EIP-191) signature check: recovers the signer and compares it with the address. */
const VerifySignature: React.FC<{ onSelectAddress: (a: string) => void }> = ({ onSelectAddress }) => {
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [result, setResult] = useState<{ ok: boolean; signer: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verify = () => {
    setResult(null); setError(null);
    if (!ethers.isAddress(address.trim())) { setError('Enter a valid 0x address.'); return; }
    if (!message) { setError('Enter the message exactly as it was signed.'); return; }
    try {
      const signer = ethers.verifyMessage(message, signature.trim());
      setResult({ ok: signer.toLowerCase() === address.trim().toLowerCase(), signer });
    } catch {
      setError('The signature is not valid. It should be 0x followed by 130 hex characters.');
    }
  };

  return (
    <Card icon={PenLine} title="Verify signed message" subtitle="Check that a message was signed by an address (personal_sign, EIP-191), for example to prove wallet ownership.">
      <div>
        <label className={label} htmlFor="sig-address">Address</label>
        <input id="sig-address" className={input} placeholder="0x…" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div>
        <label className={label} htmlFor="sig-message">Message</label>
        <textarea id="sig-message" rows={3} className={`${input} font-sans`} value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      <div>
        <label className={label} htmlFor="sig-signature">Signature</label>
        <input id="sig-signature" className={input} placeholder="0x…" value={signature} onChange={(e) => setSignature(e.target.value)} />
      </div>
      <button className={btn} onClick={verify}><PenLine className="w-3.5 h-3.5" /> Verify</button>
      {error && <p className="text-xs text-rose-700">{error}</p>}
      {result && (
        <div className={`rounded-2xl border p-3 text-xs space-y-1 ${result.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
          <p className={`font-bold flex items-center gap-1.5 ${result.ok ? 'text-emerald-800' : 'text-rose-800'}`}>
            {result.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {result.ok ? 'Signed by this address' : 'Not signed by this address'}
          </p>
          <p className="text-slate-600">
            Signer: <button onClick={() => onSelectAddress(result.signer)} className="font-mono text-petrol hover:underline cursor-pointer break-all">{result.signer}</button>
          </p>
        </div>
      )}
    </Card>
  );
};

/** keccak256 of a function or event signature: the 4-byte selector and the 32-byte topic. */
const SelectorTool: React.FC = () => {
  const [sig, setSig] = useState('transfer(address,uint256)');
  const clean = sig.replace(/\s+/g, '');
  const valid = /^[A-Za-z_$][\w$]*\((?:[\w\[\]]+(?:,[\w\[\]]+)*)?\)$/.test(clean);
  const hash = valid ? ethers.id(clean) : null;
  return (
    <Card icon={Hash} title="Function selector and event topic" subtitle="keccak256 of a signature, as used in call data (first 4 bytes) and event logs (topic 0).">
      <div>
        <label className={label} htmlFor="selector-sig">Signature</label>
        <input id="selector-sig" className={input} value={sig} onChange={(e) => setSig(e.target.value)} />
        <p className="text-[11px] text-slate-500 mt-1">Name and parameter types only, e.g. Transfer(address,address,uint256).</p>
      </div>
      {hash ? (
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-3 py-1">
          <Result name="Function selector" value={hash.slice(0, 10)} />
          <Result name="Event topic" value={hash} />
        </div>
      ) : (
        sig.trim() && <p className="text-xs text-rose-700">Write it as name(type,type), without parameter names.</p>
      )}
    </Card>
  );
};

/** EIP-55 checksum for addresses and hex ↔ decimal for numbers. */
const FormatTool: React.FC = () => {
  const [addr, setAddr] = useState('');
  const [num, setNum] = useState('');
  const a = addr.trim();
  const addrOk = a && ethers.isAddress(a);
  let numResult: { hex: string; dec: string } | null = null;
  let numError = false;
  const n = num.trim().replace(/,/g, '');
  if (n) {
    try {
      const v = BigInt(n);
      if (v < 0n) throw new Error('negative');
      numResult = { hex: '0x' + v.toString(16), dec: v.toString() };
    } catch {
      numError = true;
    }
  }
  return (
    <Card icon={AtSign} title="Address checksum and hex ↔ decimal" subtitle="EIP-55 mixed-case form of an address, and numbers in both bases.">
      <div>
        <label className={label} htmlFor="fmt-address">Address</label>
        <input id="fmt-address" className={input} placeholder="0x…" value={addr} onChange={(e) => setAddr(e.target.value)} />
      </div>
      {a && (addrOk ? (
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-3 py-1">
          <Result name="Checksum" value={ethers.getAddress(a.toLowerCase())} />
          <Result name="Lowercase" value={a.toLowerCase()} />
        </div>
      ) : <p className="text-xs text-rose-700">Not a valid address (0x and 40 hex characters).</p>)}
      <div>
        <label className={label} htmlFor="fmt-number">Number (decimal, or hex starting with 0x)</label>
        <input id="fmt-number" className={input} placeholder="7843881 or 0x77b029" value={num} onChange={(e) => setNum(e.target.value)} />
      </div>
      {numResult && (
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-3 py-1">
          <Result name="Decimal" value={numResult.dec} />
          <Result name="Hex" value={numResult.hex} />
        </div>
      )}
      {numError && <p className="text-xs text-rose-700">Enter a whole number, or hex starting with 0x.</p>}
    </Card>
  );
};

export const ToolsView: React.FC<ToolsViewProps> = ({ onSelectBlock, onSelectAddress }) => (
  <div className="space-y-5 sm:space-y-6 w-full animate-fade-in">
    <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-petrol-50 border border-petrol-100 flex items-center justify-center text-petrol shrink-0">
          <Wrench className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Developer Tools</h1>
          <p className="text-xs sm:text-sm text-slate-500">Converters and checks for building on Bitnet. Everything runs in your browser; block lookups read the chain.</p>
        </div>
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start">
      <UnitConverter />
      <BlockByDate onSelectBlock={onSelectBlock} />
      <VerifySignature onSelectAddress={onSelectAddress} />
      <SelectorTool />
      <FormatTool />
    </div>
  </div>
);
