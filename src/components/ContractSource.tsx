import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Copy, Check, FileCode, ChevronDown, ExternalLink, Info, RefreshCw, XCircle, BadgeCheck } from 'lucide-react';
import { ethers } from 'ethers';
import { loadVerifiedContract, VerifiedContract } from '../services/contractAbi';
import { AbiValue } from './AbiValue';
import { verifyIndependently, VerifyResult } from '../services/bytecodeVerify';

const EXPLORER = 'https://explorer.bitnetmoney.com';

const KEYWORDS = 'pragma|solidity|contract|interface|library|abstract|function|modifier|event|error|struct|enum|mapping|returns|return|public|private|internal|external|view|pure|payable|virtual|override|constant|immutable|memory|storage|calldata|if|else|for|while|do|break|continue|emit|revert|require|assert|new|delete|import|from|as|is|using|unchecked|try|catch|constructor|fallback|receive|indexed|anonymous|true|false|this|super|type|assembly|let';
const TOKEN = new RegExp(
  `(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)|("(?:[^"\\\\\\n]|\\\\.)*"|'(?:[^'\\\\\\n]|\\\\.)*')|\\b(${KEYWORDS})\\b|\\b(address|bool|string|bytes\\d*|u?int\\d*)\\b|\\b(0x[0-9a-fA-F]+|\\d[\\d_]*(?:\\.\\d+)?(?:e\\d+)?)\\b`,
  'g',
);
const TOKEN_CLASS = ['text-slate-500 italic', 'text-amber-300', 'text-purple-300', 'text-sky-300', 'text-emerald-300'];

/** Solidity source with comments, strings, keywords, types and numbers colored. */
function highlight(source: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of source.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(source.slice(last, at));
    const group = m.slice(1).findIndex((g) => g !== undefined);
    out.push(<span key={at} className={TOKEN_CLASS[group]}>{m[0]}</span>);
    last = at + m[0].length;
  }
  if (last < source.length) out.push(source.slice(last));
  return out;
}

const CopyButton: React.FC<{ text: string; label: string }> = ({ text, label }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {})}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 hover:text-petrol hover:border-petrol-200 cursor-pointer"
    >
      {done ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />} {done ? 'Copied' : label}
    </button>
  );
};

const SourceFile: React.FC<{ path: string; source: string; open: boolean; onToggle: () => void }> = ({ path, source, open, onToggle }) => {
  const lines = useMemo(() => source.split('\n').length, [source]);
  const colored = useMemo(() => (open ? highlight(source) : null), [open, source]);
  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50">
        <button type="button" onClick={onToggle} className="flex items-center gap-2 min-w-0 text-left cursor-pointer">
          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
          <span className="font-mono text-xs font-bold text-slate-900 truncate">{path}</span>
          <span className="text-[11px] text-slate-500 shrink-0">{lines.toLocaleString()} lines</span>
        </button>
        <CopyButton text={source} label="Copy" />
      </div>
      {open && (
        <div className="theme-island bg-[#0B132B] flex max-h-[32rem] overflow-auto text-[12px] leading-5 font-mono">
          <pre className="select-none text-right text-slate-600 px-3 py-3 border-r border-slate-800 shrink-0" aria-hidden="true">
            {Array.from({ length: lines }, (_, i) => i + 1).join('\n')}
          </pre>
          <pre className="px-4 py-3 text-slate-200 whitespace-pre">{colored}</pre>
        </div>
      )}
    </div>
  );
};

/**
 * BitnetScan's own check of the explorer's verification: recompile the published source in the
 * browser and compare it with the code on the chain.
 */
const IndependentCheck: React.FC<{ address: string; contract: VerifiedContract }> = ({ address, contract }) => {
  const [state, setState] = useState<'idle' | 'running' | VerifyResult>('idle');
  useEffect(() => setState('idle'), [address]);
  const run = () => {
    setState('running');
    verifyIndependently(address, contract).then(setState);
  };
  const version = contract.compilerVersion.split('+')[0];

  if (state === 'idle' || state === 'running') {
    return (
      <div className="rounded-2xl border border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-900">Check it yourself</div>
          <p className="text-xs text-slate-500">
            {state === 'running'
              ? `Downloading Solidity ${version} (about 9 MB) from soliditylang.org and compiling in your browser…`
              : `BitnetScan can recompile this source with Solidity ${version} and the same settings, in your browser, and compare the result with the code on the chain.`}
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={state === 'running'}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-petrol hover:bg-petrol-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60 shrink-0"
        >
          {state === 'running' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />}
          {state === 'running' ? 'Compiling…' : 'Recompile and compare'}
        </button>
      </div>
    );
  }

  const r = state as VerifyResult;
  const ok = r.match === 'full' || r.match === 'partial';
  return (
    <div className={`rounded-2xl border p-3 sm:p-4 text-xs space-y-1 ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : r.match === 'mismatch' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
      <div className="flex items-center gap-1.5 font-bold">
        {ok ? <BadgeCheck className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
        {r.match === 'full' && 'Exact match: the compiled code is identical to the code on the chain'}
        {r.match === 'partial' && 'Match: the compiled code equals the code on the chain except the metadata hash'}
        {r.match === 'mismatch' && 'No match: the compiled code differs from the code on the chain'}
        {r.match === 'error' && 'The check could not be completed'}
      </div>
      {r.match === 'error' && <p>{(r as { message: string }).message}</p>}
      {(r.match === 'full' || r.match === 'partial') && (
        <p>
          Compiled with Solidity {(r as { compiler: string }).compiler} in your browser and compared byte by byte with the {(r as { bytes: number }).bytes.toLocaleString()} bytes stored at this address
          {(r as { immutables: number }).immutables > 0 ? `, leaving out ${(r as { immutables: number }).immutables} immutable values set at deployment` : ''}.
          {r.match === 'partial' && ' The metadata hash only records details such as file names and comments; the executable code is the same.'}
        </p>
      )}
      {r.match === 'mismatch' && (
        <p>Compiled with Solidity {(r as { compiler: string }).compiler}: {(r as { compiledBytes: number }).compiledBytes.toLocaleString()} bytes, against {(r as { bytes: number }).bytes.toLocaleString()} bytes on the chain.</p>
      )}
      <button type="button" onClick={run} className="font-semibold underline cursor-pointer">Run again</button>
    </div>
  );
};

/** Verified source code, compiler settings and ABI of a contract, from the Bitnet explorer. */
export const ContractSource: React.FC<{ address: string; onSelectAddress: (a: string) => void }> = ({ address, onSelectAddress }) => {
  const [contract, setContract] = useState<VerifiedContract | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [openFiles, setOpenFiles] = useState<Set<number>>(new Set([0]));
  const [showAbi, setShowAbi] = useState(false);

  useEffect(() => {
    let active = true;
    setContract(undefined);
    setFailed(false);
    setOpenFiles(new Set([0]));
    loadVerifiedContract(address)
      .then((c) => { if (active) setContract(c); })
      .catch(() => { if (active) { setContract(null); setFailed(true); } });
    return () => { active = false; };
  }, [address]);

  const abiText = useMemo(() => (contract ? JSON.stringify(contract.abi, null, 2) : ''), [contract]);
  const constructorArgs = useMemo(() => {
    if (!contract?.constructorArgs) return null;
    try {
      const ctor = new ethers.Interface(contract.abi).deploy;
      if (!ctor.inputs.length) return null;
      const hex = contract.constructorArgs.startsWith('0x') ? contract.constructorArgs : `0x${contract.constructorArgs}`;
      const values = ethers.AbiCoder.defaultAbiCoder().decode(ctor.inputs, hex);
      return ctor.inputs.map((p, i) => ({ param: p, value: values[i] }));
    } catch {
      return null;
    }
  }, [contract]);

  if (contract === undefined) {
    return <div className="skeleton rounded-2xl h-24" aria-hidden="true" />;
  }

  if (!contract) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 flex items-start gap-2">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-px" />
        <span>
          {failed
            ? 'The Bitnet explorer could not be reached, so the source code cannot be shown right now.'
            : 'The source code of this contract is not verified on the Bitnet explorer. The deployer can verify it there; it then appears here with its ABI.'}{' '}
          {!failed && (
            <a href={`${EXPLORER}/address/${address}/contract-verification`} target="_blank" rel="noopener noreferrer" className="text-petrol font-semibold hover:underline inline-flex items-center gap-0.5">
              Verify on the Bitnet explorer <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </span>
      </div>
    );
  }

  const facts: [string, React.ReactNode][] = [
    ['Contract name', contract.name],
    ['Compiler', contract.compilerVersion || '—'],
    ['Optimization', contract.optimization.enabled ? `Yes, ${contract.optimization.runs ?? '?'} runs` : 'No'],
    ['EVM version', contract.evmVersion || 'default'],
    ['License', contract.license || 'None declared'],
    ['Verified', contract.verifiedAt ? new Date(contract.verifiedAt).toISOString().slice(0, 10) : '—'],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5" /> Source code verified
        </span>
        <span className="text-xs text-slate-500">on the Bitnet explorer · {contract.language === 'vyper' ? 'Vyper' : 'Solidity'} · {contract.files.length} {contract.files.length === 1 ? 'file' : 'files'}</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {facts.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
            <div className="text-[11px] text-slate-500">{label}</div>
            <div className="text-xs font-mono font-bold text-slate-900 truncate" title={typeof value === 'string' ? value : undefined}>{value}</div>
          </div>
        ))}
      </div>

      <IndependentCheck address={address} contract={contract} />

      {contract.implementations.length > 0 && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
          This is a proxy. Implementation:{' '}
          {contract.implementations.map((impl) => (
            <button key={impl.address} type="button" onClick={() => onSelectAddress(impl.address)} className="font-mono font-bold hover:underline cursor-pointer">
              {impl.name ? `${impl.name} ` : ''}{impl.address}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {contract.files.map((f, i) => (
          <SourceFile
            key={f.path + i}
            path={f.path}
            source={f.source}
            open={openFiles.has(i)}
            onToggle={() => setOpenFiles((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; })}
          />
        ))}
      </div>

      {constructorArgs && (
        <div className="rounded-2xl border border-slate-200 p-3 space-y-1.5">
          <div className="text-xs font-bold text-slate-900">Constructor arguments</div>
          {constructorArgs.map((a, i) => (
            <div key={i} className="font-mono text-xs flex flex-col sm:flex-row sm:gap-2">
              <span className="text-slate-500 shrink-0">{a.param.name || `arg${i}`} <span className="text-slate-400">{a.param.type}</span></span>
              <span className="text-slate-900"><AbiValue p={a.param} v={a.value} onSelectAddress={onSelectAddress} /></span>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50">
          <button type="button" onClick={() => setShowAbi((v) => !v)} className="flex items-center gap-2 text-left cursor-pointer">
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showAbi ? 'rotate-180' : ''}`} />
            <FileCode className="w-4 h-4 text-petrol" />
            <span className="text-xs font-bold text-slate-900">Contract ABI</span>
            <span className="text-[11px] text-slate-500">{(contract.abi as unknown[]).length} entries</span>
          </button>
          <CopyButton text={abiText} label="Copy ABI" />
        </div>
        {showAbi && (
          <pre className="theme-island bg-[#0B132B] text-emerald-300 text-[11px] leading-5 font-mono p-4 max-h-80 overflow-auto">{abiText}</pre>
        )}
      </div>
    </div>
  );
};
