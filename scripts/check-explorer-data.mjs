import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const temp = await mkdtemp(join(tmpdir(), 'btn-explorer-'));
try {
  const file = join(temp, 'indexer.mjs');
  await build({ entryPoints: ['src/services/indexedTransactions.ts'], bundle: true, platform: 'node', format: 'esm', outfile: file, banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" } });
  const { IndexedTransactions } = await import(pathToFileURL(file));
  let now = Date.parse('2026-10-11T16:00:00Z');
  const tx = (id, timestamp = '2026-10-11T12:00:00Z') => ({
    hash: '0x' + id.toString(16).padStart(64, '0'), value: '2397791500000000000',
    block_number: 100, timestamp, from: { hash: '0x' + '1'.repeat(40) }, to: null,
    fee: { value: '21000000000000' }, status: 'ok',
  });
  const json = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
  let calls = [];
  const fetcher = async input => {
    calls.push(input);
    return json(input.includes('cursor=2')
      ? { items: [tx(2), tx(3), tx(4, '2026-10-10T23:59:59Z')], next_page_params: { cursor: 3 } }
      : { items: [tx(1), tx(2)], next_page_params: { cursor: 2 } });
  };
  const service = new IndexedTransactions(fetcher, ['https://one.test'], () => now);
  assert.deepEqual(await Promise.all([service.today(), service.today()]), [3, 3], 'count unique hashes across pages once');
  assert.equal(calls.length, 2, 'concurrent and repeated scans share cached pages');
  assert.equal(await service.today(), 3);
  assert.equal(calls.length, 2);
  const first = await service.page();
  assert.equal(first.transactions[0].value, '2.3977915');
  assert.equal(first.transactions[0].fee, '0.000021 BTN');
  assert.equal(first.transactions[0].to, '');
  const second = await service.page(first.next, first.source);
  assert.equal(second.transactions[1].hash, tx(3).hash, 'cursor loads records beyond the first page');
  assert.ok(calls.every(url => url.includes('filter=validated')));
  const partial = new IndexedTransactions(async input => {
    if (input.includes('cursor=')) throw new Error('offline');
    return json({ items: [tx(1)], next_page_params: { cursor: 2 } });
  }, ['https://one.test'], () => Date.parse('2026-10-11T16:00:00Z'));
  assert.equal(await partial.today(), null, 'incomplete daily scans must not report a count');
  const empty = new IndexedTransactions(async () => json({ items: [], next_page_params: null }), undefined, () => now);
  assert.equal(await empty.today(), 0, 'verified empty day is zero');
  const malformed = new IndexedTransactions(async () => json({ items: [] }), undefined, () => now);
  assert.equal(await malformed.today(), null, 'missing pagination must not imply exhaustion');
  const repeat = new IndexedTransactions(async () => json({ items: [tx(1)], next_page_params: { cursor: 2 } }), undefined, () => now);
  assert.equal(await repeat.today(), null, 'repeated cursors must not yield partial totals');
  const unordered = new IndexedTransactions(async () => json({ items: [tx(1), tx(2, '2026-10-11T13:00:00Z')], next_page_params: null }), undefined, () => now);
  assert.equal(await unordered.today(), null, 'unordered history cannot establish a daily boundary');
  const targets = [];
  const failover = new IndexedTransactions(async input => {
    targets.push(input);
    if (input.startsWith('https://bad.test') || input.includes('cursor=')) throw new Error('offline');
    return json({ items: [tx(1)], next_page_params: { cursor: 2 } });
  }, ['https://bad.test', 'https://good.test']);
  const recovered = await failover.page();
  assert.equal(recovered.source, 'https://good.test');
  targets.length = 0;
  await assert.rejects(failover.page(recovered.next, recovered.source));
  assert.equal(targets.length, 1, 'cursor failures must not switch indexers');
  now = Date.parse('2026-10-12T00:00:01Z');
  assert.equal(await service.today(), 0, 'UTC midnight invalidates yesterday’s count');
  const raw = JSON.parse(await readFile('reports/live-audit-2026-10-11-evidence.json', 'utf8').catch(() => 'null'));
  if (raw) {
    const liveRows = raw.indexedUtcDayTransactions.map(item => ({ ...tx(1, item.timestamp), hash: item.hash, value: item.valueWei }));
    liveRows.push(tx(999, raw.firstPreviousDayTransaction));
    const regression = new IndexedTransactions(async () => json({ items: liveRows, next_page_params: null }), undefined, () => Date.parse('2026-10-11T16:00:00Z'));
    assert.equal(await regression.today(), 10, 'live regression: ten records must not become stats summary count one');
  }
  console.log('PASS: daily pagination, deduplication, UTC rollover, incomplete scans, zero vs unknown, exact fees, archive cursors and source failover.');
} finally { await rm(temp, { recursive: true, force: true }); }
