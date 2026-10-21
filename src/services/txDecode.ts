import { ethers } from 'ethers';
import { loadContractAbi, loadVerifiedContract } from './contractAbi';
import { lookupSignatures } from './signatures';
import { KNOWN_METHOD_SIGNATURES, KNOWN_EVENT_TOPICS } from './decoder';

/**
 * Decoding of transaction input and event logs. Order of preference: the ABI of the contract
 * verified on the Bitnet explorer (and of its implementation when it is a proxy), the standard
 * BTS-20 interface for unverified tokens, then the public signature database, whose matches are
 * checked by re-encoding so a selector collision is not shown as a match.
 */
export type DecodeSource = 'verified' | 'standard' | 'signature';

export interface DecodedArg {
  param: ethers.ParamType;
  value: unknown;
}

export interface DecodedCall {
  source: DecodeSource;
  contractName?: string;
  name: string;
  signature: string;
  selector: string;
  args: DecodedArg[];
  token?: { decimals: number; symbol: string };
}

export interface DecodedLog {
  source: DecodeSource;
  contractName?: string;
  name: string;
  signature: string;
  args: (DecodedArg & { indexed: boolean })[];
  token?: { decimals: number; symbol: string };
}

interface Known {
  iface: ethers.Interface;
  source: 'verified' | 'standard';
  name: string;
  token?: { decimals: number; symbol: string };
}

const known = new Map<string, Promise<Known[]>>();

/** ABIs that apply to an address: its own, plus its implementations when it is a verified proxy. */
function interfacesFor(address: string): Promise<Known[]> {
  const key = address.toLowerCase();
  let hit = known.get(key);
  if (!hit) {
    hit = (async () => {
      const out: Known[] = [];
      const add = async (a: string) => {
        const abi = await loadContractAbi(a).catch(() => ({ kind: 'none' as const }));
        if (abi.kind === 'none') return;
        const src = abi as { kind: 'verified' | 'standard'; name: string; abi: ethers.InterfaceAbi; symbol?: string; decimals?: number };
        out.push({
          iface: new ethers.Interface(src.abi),
          source: src.kind,
          name: src.name,
          token: src.kind === 'standard' ? { decimals: src.decimals!, symbol: src.symbol! } : undefined,
        });
      };
      await add(address);
      if (out[0]?.source === 'verified') {
        const v = await loadVerifiedContract(address).catch(() => null);
        for (const impl of v?.implementations ?? []) await add(impl.address);
      }
      return out;
    })();
    known.set(key, hit);
  }
  return hit;
}

const builtinFunction = (selector: string): string[] => {
  const k = KNOWN_METHOD_SIGNATURES[selector];
  return k ? [`${k.name}(${k.params.join(', ')})`] : [];
};
const builtinEvent = (topic: string): string[] => {
  const k = KNOWN_EVENT_TOPICS[topic];
  return k ? [`${k.name}(${k.params.join(', ')})`] : [];
};

export async function decodeCall(to: string | null | undefined, input: string): Promise<DecodedCall | null> {
  if (!input || input.length < 10) return null;
  const data = input.toLowerCase();
  const selector = data.slice(0, 10);

  if (to) {
    for (const k of await interfacesFor(to)) {
      try {
        const tx = k.iface.parseTransaction({ data });
        if (tx) {
          return {
            source: k.source, contractName: k.name, name: tx.name, signature: tx.signature, selector,
            args: tx.fragment.inputs.map((param, i) => ({ param, value: tx.args[i] })), token: k.token,
          };
        }
      } catch {
        // not this ABI
      }
    }
  }

  const fromDb = (await lookupSignatures([selector], []).catch(() => new Map<string, string[]>())).get(selector) ?? [];
  let loose: DecodedCall | null = null;
  for (const sig of [...fromDb, ...builtinFunction(selector)]) {
    try {
      const iface = new ethers.Interface([`function ${sig}`]);
      const tx = iface.parseTransaction({ data });
      if (!tx) continue;
      const decoded: DecodedCall = {
        source: 'signature', name: tx.name, signature: tx.signature, selector,
        args: tx.fragment.inputs.map((param, i) => ({ param, value: tx.args[i] })),
      };
      if (iface.encodeFunctionData(tx.fragment, tx.args).toLowerCase() === data) return decoded;
      loose ??= decoded;
    } catch {
      // the arguments do not decode with this signature
    }
  }
  return loose;
}

/** Every way of marking `count` of the parameters as indexed, leading parameters first. */
function indexedChoices(n: number, count: number, limit = 300): number[][] {
  const out: number[][] = [];
  const pick = (start: number, chosen: number[]) => {
    if (out.length >= limit) return;
    if (chosen.length === count) { out.push(chosen); return; }
    for (let i = start; i < n; i++) pick(i + 1, [...chosen, i]);
  };
  pick(0, []);
  return out;
}

function decodeWithSignature(sig: string, topics: string[], data: string): DecodedLog | null {
  let base: ethers.EventFragment;
  try { base = ethers.EventFragment.from(`event ${sig}`); } catch { return null; }
  const indexedCount = topics.length - 1;
  if (indexedCount < 0 || indexedCount > base.inputs.length) return null;
  for (const choice of indexedChoices(base.inputs.length, indexedCount)) {
    const params = base.inputs.map((p, i) => `${p.format('sighash')}${choice.includes(i) ? ' indexed' : ''}${p.name ? ` ${p.name}` : ''}`);
    try {
      const iface = new ethers.Interface([`event ${base.name}(${params.join(', ')})`]);
      const parsed = iface.parseLog({ topics, data });
      if (!parsed) continue;
      const plain = parsed.fragment.inputs.map((p, i) => ({ p, v: parsed.args[i] })).filter((x) => !x.p.indexed);
      if (ethers.AbiCoder.defaultAbiCoder().encode(plain.map((x) => x.p), plain.map((x) => x.v)).toLowerCase() !== data.toLowerCase()) continue;
      return {
        source: 'signature', name: parsed.name, signature: parsed.signature,
        args: parsed.fragment.inputs.map((param, i) => ({ param, value: parsed.args[i], indexed: Boolean(param.indexed) })),
      };
    } catch {
      // try the next choice of indexed parameters
    }
  }
  return null;
}

export async function decodeLogs(logs: { address: string; topics: string[]; data: string }[]): Promise<(DecodedLog | null)[]> {
  const out: (DecodedLog | null)[] = await Promise.all(logs.map(async (log) => {
    if (!log.topics?.length) return null;
    for (const k of await interfacesFor(log.address)) {
      try {
        const parsed = k.iface.parseLog({ topics: log.topics, data: log.data });
        if (parsed) {
          return {
            source: k.source, contractName: k.name, name: parsed.name, signature: parsed.signature,
            args: parsed.fragment.inputs.map((param, i) => ({ param, value: parsed.args[i], indexed: Boolean(param.indexed) })),
            token: k.token,
          };
        }
      } catch {
        // not this ABI
      }
    }
    return null;
  }));

  const missing = logs.map((l, i) => (out[i] === null && l.topics?.length ? l.topics[0].toLowerCase() : null)).filter((t): t is string => t !== null);
  if (missing.length) {
    const sigs = await lookupSignatures([], missing).catch(() => new Map<string, string[]>());
    logs.forEach((log, i) => {
      if (out[i] !== null || !log.topics?.length) return;
      const topic = log.topics[0].toLowerCase();
      for (const sig of [...(sigs.get(topic) ?? []), ...builtinEvent(topic)]) {
        const decoded = decodeWithSignature(sig, log.topics, log.data || '0x');
        if (decoded) { out[i] = decoded; break; }
      }
    });
  }
  return out;
}
