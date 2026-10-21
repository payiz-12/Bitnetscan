/**
 * Text signatures for 4-byte function selectors and 32-byte event topics, from the public
 * signature database (Sourcify's, with openchain as a fallback; both are the same dataset).
 * Used to name calls and events of contracts that are not verified on the Bitnet explorer.
 */
const SOURCES = [
  'https://api.4byte.sourcify.dev/signature-database/v1/lookup',
  'https://api.openchain.xyz/signature-database/v1/lookup',
];

const cache = new Map<string, string[]>();

/** Candidate signatures per selector/topic (lower-case hex), best match first; [] when unknown. */
export async function lookupSignatures(functions: string[], events: string[]): Promise<Map<string, string[]>> {
  const fn = [...new Set(functions.map((s) => s.toLowerCase()))].filter((s) => /^0x[0-9a-f]{8}$/.test(s) && !cache.has(s));
  const ev = [...new Set(events.map((s) => s.toLowerCase()))].filter((s) => /^0x[0-9a-f]{64}$/.test(s) && !cache.has(s));

  if (fn.length || ev.length) {
    const query = new URLSearchParams({ filter: 'true' });
    if (fn.length) query.set('function', fn.join(','));
    if (ev.length) query.set('event', ev.join(','));
    for (const base of SOURCES) {
      try {
        const res = await fetch(`${base}?${query}`, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        const body = await res.json();
        if (!body?.ok) continue;
        for (const [kind, keys] of [['function', fn], ['event', ev]] as const) {
          const found = body.result?.[kind] ?? {};
          for (const key of keys) {
            const list: { name: string; filtered?: boolean; hasVerifiedContract?: boolean }[] = found[key] ?? [];
            // Signatures seen in verified contracts first; filtered (spam) entries dropped.
            const names = list
              .filter((x) => !x.filtered)
              .sort((a, b) => Number(Boolean(b.hasVerifiedContract)) - Number(Boolean(a.hasVerifiedContract)))
              .map((x) => x.name);
            cache.set(key, names);
          }
        }
        break;
      } catch {
        // try the next source
      }
    }
  }

  const out = new Map<string, string[]>();
  for (const key of [...functions, ...events]) {
    const k = key.toLowerCase();
    if (cache.has(k)) out.set(k, cache.get(k)!);
  }
  return out;
}
