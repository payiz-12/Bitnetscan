import { rpcService } from './rpc';
import type { VerifiedContract } from './contractAbi';

/**
 * Independent check of a contract the Bitnet explorer marks as verified: BitnetScan compiles the
 * published source with the same compiler version and settings, in the visitor's browser, and
 * compares the result with the code stored on the chain.
 *
 * The compiler (soljson, about 9 MB) comes from binaries.soliditylang.org, the Solidity project's
 * own release host, and runs in a classic worker built from a blob, so the page stays responsive.
 */
export type VerifyResult =
  | { match: 'full' | 'partial'; compiler: string; bytes: number; immutables: number }
  | { match: 'mismatch'; compiler: string; bytes: number; compiledBytes: number }
  | { match: 'error'; message: string };

const WORKER_SOURCE = `
self.onmessage = async function (e) {
  try {
    var src = 'https://binaries.soliditylang.org/bin/soljson-' + e.data.version + '.js';
    // Fetched first and run from a blob: some older builds fail to load through importScripts
    // directly. The host answers CORS requests; importScripts on the URL stays as the fallback.
    var code = null;
    try { var r = await fetch(src); if (r.ok) code = await r.text(); } catch (_) {}
    if (code) {
      var blobUrl = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      importScripts(blobUrl);
      URL.revokeObjectURL(blobUrl);
    } else {
      importScripts(src);
    }
    var M = self.Module, out;
    if (M._solidity_compile) out = M.cwrap('solidity_compile', 'string', ['string', 'number', 'number'])(e.data.input, 0, 0);
    else if (M._compileStandard) out = M.cwrap('compileStandard', 'string', ['string', 'number'])(e.data.input, 0);
    else throw new Error('This compiler version has no standard JSON interface');
    self.postMessage({ ok: true, output: out });
  } catch (err) {
    self.postMessage({ ok: false, error: String((err && err.message) || err) });
  }
};`;

function compile(version: string, input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
    const worker = new Worker(url);
    const done = () => { worker.terminate(); URL.revokeObjectURL(url); };
    const timer = setTimeout(() => { done(); reject(new Error('The compiler took too long')); }, 180_000);
    worker.onmessage = (e) => {
      clearTimeout(timer);
      done();
      if (e.data.ok) resolve(e.data.output); else reject(new Error(e.data.error));
    };
    worker.onerror = (e) => { clearTimeout(timer); done(); reject(new Error(e.message || 'The compiler could not be loaded')); };
    worker.postMessage({ version, input });
  });
}

/**
 * Builds from 2018 and earlier are asm.js code that overflows a worker's smaller stack while it is
 * parsed. Those run in a hidden frame on the page instead, which holds the page for a few seconds.
 */
async function compileInFrame(version: string, input: string): Promise<string> {
  const code = await fetch(`https://binaries.soliditylang.org/bin/soljson-${version}.js`).then((r) => {
    if (!r.ok) throw new Error(`The compiler could not be downloaded (HTTP ${r.status})`);
    return r.text();
  });
  const frame = document.createElement('iframe');
  frame.style.display = 'none';
  document.body.appendChild(frame);
  try {
    const win = frame.contentWindow as any;
    win.eval(code);
    const M = win.Module;
    if (M._solidity_compile) return M.cwrap('solidity_compile', 'string', ['string', 'number', 'number'])(input, 0, 0);
    if (M._compileStandard) return M.cwrap('compileStandard', 'string', ['string', 'number'])(input, 0);
    throw new Error('This compiler version has no standard JSON interface');
  } finally {
    frame.remove();
  }
}

const compileAnywhere = (version: string, input: string) => compile(version, input).catch((e: Error) => {
  if (/call stack/i.test(e.message)) return compileInFrame(version, input);
  throw e;
});

/** Removes the CBOR metadata the compiler appends (its length is in the last two bytes). */
function stripMetadata(hex: string): string {
  if (hex.length < 4) return hex;
  const len = parseInt(hex.slice(-4), 16);
  const start = hex.length - 4 - len * 2;
  if (start < 0) return hex;
  const first = parseInt(hex.slice(start, start + 2), 16);
  return first >= 0xa0 && first <= 0xbf ? hex.slice(0, start) : hex;
}

export async function verifyIndependently(address: string, contract: VerifiedContract): Promise<VerifyResult> {
  try {
    if (contract.language !== 'solidity') return { match: 'error', message: 'Only Solidity contracts can be recompiled here' };
    if (!contract.compilerVersion || contract.files.length === 0) return { match: 'error', message: 'The explorer did not publish the compiler version or the sources' };

    const settings: Record<string, unknown> = { ...(contract.compilerSettings ?? {}) };
    settings.outputSelection = { '*': { '*': ['evm.deployedBytecode.object', 'evm.deployedBytecode.immutableReferences'] } };
    const input = JSON.stringify({
      language: 'Solidity',
      sources: Object.fromEntries(contract.files.map((f) => [f.path, { content: f.source }])),
      settings,
    });

    const [onChain, raw] = await Promise.all([
      rpcService.getCode(address, 15000),
      compileAnywhere(contract.compilerVersion, input),
    ]);
    const output = JSON.parse(raw);
    const errors = (output.errors ?? []).filter((e: any) => e.severity === 'error');
    if (errors.length) return { match: 'error', message: `The compiler reported: ${errors[0].formattedMessage || errors[0].message}` };

    // The contract by its name, in its main file when the explorer says which one that is.
    const files: Record<string, Record<string, any>> = output.contracts ?? {};
    const entry = (contract.filePath && files[contract.filePath]?.[contract.name])
      ?? Object.values(files).map((byName) => byName[contract.name]).find(Boolean);
    const compiled: string | undefined = entry?.evm?.deployedBytecode?.object;
    if (!compiled) return { match: 'error', message: `The compiler output has no contract named ${contract.name}` };

    let chain = (onChain || '0x').replace(/^0x/, '').toLowerCase();
    let built = compiled.toLowerCase();
    // Library addresses are linked at deploy time: take them from the chain.
    built = built.replace(/__\$[0-9a-f]{34}\$__/g, (m, offset: number) => chain.slice(offset, offset + m.length));
    // Immutables are filled in at deploy time: blank them on the chain side.
    let immutables = 0;
    for (const refs of Object.values<any>(entry.evm.deployedBytecode.immutableReferences ?? {})) {
      for (const { start, length } of refs) {
        chain = chain.slice(0, start * 2) + '0'.repeat(length * 2) + chain.slice((start + length) * 2);
        immutables++;
      }
    }

    const bytes = chain.length / 2;
    if (chain === built) return { match: 'full', compiler: contract.compilerVersion, bytes, immutables };
    if (stripMetadata(chain) === stripMetadata(built)) return { match: 'partial', compiler: contract.compilerVersion, bytes, immutables };
    return { match: 'mismatch', compiler: contract.compilerVersion, bytes, compiledBytes: built.length / 2 };
  } catch (e: any) {
    return { match: 'error', message: e?.message || 'The check could not be completed' };
  }
}
