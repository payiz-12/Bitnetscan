import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const temp = await mkdtemp(join(tmpdir(), 'btn-supply-'));
const originalFetch = globalThis.fetch, originalNow = Date.now;
try {
  const file = join(temp, 'supply.mjs');
  await build({entryPoints:['src/services/transactionHistory.ts'],bundle:true,platform:'node',format:'esm',outfile:file});
  const {aggregateOfficialSupply, loadSupplyHistory} = await import(pathToFileURL(file));
  const day = 86400000, start = Date.parse('2026-09-01T00:00:00Z');
  const chart = Array.from({length:30}, (_,i) => ({date:new Date(start+i*day).toISOString().slice(0,10),value:String(100+i)}));
  const daily = aggregateOfficialSupply(chart,[{start,end:start+day}],'7d')[0];
  assert.equal(daily.supply,100);
  assert.equal(daily.txs,null,'supply is not a transaction count');
  assert.equal(aggregateOfficialSupply(chart,[{start,end:start+7*day}],'1y')[0].supply,106,'weekly supply is the last daily balance, not the sum');
  assert.equal(aggregateOfficialSupply(chart,[{start,end:start+30*day}],'all')[0].supply,129,'monthly supply is not summed');
  const missing=aggregateOfficialSupply(chart.slice(0,6),[{start,end:start+7*day}],'1y')[0];
  assert.equal(missing.supply,null,'missing endpoint is not zero or an earlier balance');
  const exact=aggregateOfficialSupply([{date:'2026-09-01',value:'100.000000000000000001',is_approximate:true}],[{start,end:start+day}],'7d')[0];
  assert.equal(exact.supplyText,'100.000000000000000001');assert.equal(exact.provisional,true);
  assert.equal(aggregateOfficialSupply([{date:'2026-09-01',value:'0'}],[{start,end:start+day}],'7d')[0].supply,0);
  assert.deepEqual(aggregateOfficialSupply(chart,[{start,end:start+3600000}],'1d'),[]);
  assert.throws(()=>aggregateOfficialSupply([{date:'2026-09-01',value:'NaN'}],[{start,end:start+day}],'7d'));

  let clock=Date.parse('2026-10-04T12:00:00Z');Date.now=()=>clock;
  let mode='absent',calls=[];
  globalThis.fetch=async url=>{
    calls.push(url);
    const info={id:'circulatingSupply',units:mode==='wrong-unit'?'USD':'BTN',resolutions:['DAY']};
    return {ok:true,json:async()=>url.endsWith('/api/v1/lines')
      ? {sections:[{charts:mode==='absent'?[{id:'marketCap',units:'USD'},{id:'coinSupply',units:'BTN'}]:[info]}]}
      : {info,chart:[{date:'2026-10-03',value:'7654321.5'}]}};
  };
  assert.deepEqual(await loadSupplyHistory('7d',new AbortController().signal),[]);
  assert.equal(calls.length,1,'no speculative market-cap/coin-supply endpoint requests');
  clock+=600000;mode='valid';calls=[];
  const loaded=await loadSupplyHistory('7d',new AbortController().signal);
  assert.equal(loaded.find(p=>p.fullDate==='2026-10-03 (UTC)').supply,7654321.5);
  assert.equal(loaded.at(-1).supply,null);
  clock+=600000;mode='wrong-unit';calls=[];
  assert.deepEqual(await loadSupplyHistory('7d',new AbortController().signal),[]);
  assert.equal(calls.length,1,'USD must not be interpreted as BTN supply');
  console.log('PASS: supply field, daily/weekly/monthly snapshots, missing vs zero, exact decimals, provisional data, hourly rejection, source and unit validation.');
} finally {
  globalThis.fetch=originalFetch;Date.now=originalNow;
  await rm(temp,{recursive:true,force:true});
}
