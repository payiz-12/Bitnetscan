import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const temp=await mkdtemp(join(tmpdir(),'btn-transaction-history-'));
try {
 const file=join(temp,'history.mjs');
 await build({entryPoints:['src/services/transactionHistory.ts'],bundle:true,platform:'node',format:'esm',outfile:file});
 const {activityBuckets,aggregateOfficialCounts,aggregateTransactions,loadTransactionHistory}=await import(pathToFileURL(file));
 const now=Date.parse('2026-10-03T00:00:00Z');
 const buckets=activityBuckets('7d',now+3600000);
 const data=[{date:'2026-09-27',value:'26'},{date:'2026-09-28',value:'27'},{date:'2026-09-29',value:'33'},{date:'2026-09-30',value:'23'},{date:'2026-10-01',value:'25'},{date:'2026-10-02',value:'20',is_approximate:true}];
 const counts=aggregateOfficialCounts(data,buckets,'7d');
 assert.equal(counts.reduce((n,p)=>n+(p.txs??0),0),154);
 assert.equal(counts.at(-1).txs,null);assert.equal(counts.at(-2).provisional,true);
 assert.equal(aggregateOfficialCounts([{date:'2026-10-03',value:'0'}],[buckets.at(-1)],'7d')[0].txs,0);
 assert.throws(()=>aggregateOfficialCounts([{date:'2026-10-03',value:'abc'}],buckets,'7d'));
 // The official 21 June spike must remain a daily value, including 1Y and ALL.
 const june=[{date:'2026-06-20',value:'10278'},{date:'2026-06-21',value:'9059'},{date:'2026-06-22',value:'8671'}];
 for(const range of ['1y','all']) {
  const daily=activityBuckets(range,now+3600000,true);
  const junePoint=aggregateOfficialCounts(june,daily,range).find(p=>p.timestamp===Date.parse('2026-06-21T00:00:00Z')/1000);
  assert.equal(junePoint.txs,9059,`${range} must not merge daily counts into weekly/monthly totals`);
  if(range==='1y')assert.equal(daily.length,365);
 }
 if(process.argv[2]) {
  const official=JSON.parse(await readFile(process.argv[2],'utf8')).chart;
  const byDay=new Map(official.map(p=>[p.date,p]));
  for(const range of ['7d','30d','90d','1y','all']) {
   const points=aggregateOfficialCounts(official,activityBuckets(range,now+3600000,true),range);
   for(const p of points) {
    const source=byDay.get(new Date(p.timestamp*1000).toISOString().slice(0,10));
    assert.equal(p.txs,source ? Number(source.value) : null);
   }
  }
  console.log(`PASS: ${official.length} official daily records matched across all daily transaction ranges.`);
 }
 const window=[{start:now-3600000,end:now}];
 const tx=(n,status,value,time=now-1000)=>({hash:'0x'+n.toString(16).padStart(64,'0'),status,value,timestamp:new Date(time).toISOString()});
 const items=[tx(1,'ok','1000000000000000001'),tx(2,'error','900000000000000000000'),tx(1,'ok','1000000000000000001'),tx(3,'ok','2000000000000000000')];
 const valid=aggregateTransactions(items,window,'1d',now-7200000,false)[0];
 assert.equal(valid.txs,3);assert.equal(valid.volumeText,'3.000000000000000001');
 assert.equal(aggregateTransactions(items,window,'1d',now-500,false)[0].volume,null,'incomplete page must not be total');
 assert.equal(aggregateTransactions([tx(4,'pending','100')],window,'1d',0,true)[0].volume,null);
 assert.equal(aggregateTransactions([tx(1,'ok','1',now)],window,'1d',0,true)[0].volumeText,'0.0','end boundary is exclusive');
 if(process.argv[3]) {
  const official=JSON.parse(await readFile(process.argv[3],'utf8')).items;
  const start=Date.parse('2026-10-02T00:00:00Z'),end=start+86400000;
  const expected=official.filter(t=>t.status==='ok'&&Date.parse(t.timestamp)>=start&&Date.parse(t.timestamp)<end)
    .reduce((sum,t)=>sum+BigInt(t.value),0n);
  const actual=aggregateTransactions(official,[{start,end}],'30d',Math.min(...official.map(t=>Date.parse(t.timestamp))),false)[0];
  assert.equal(actual.volumeWei,expected.toString());
  assert.notEqual(actual.volume,null);
  console.log(`PASS: official 2 October transfer volume ${actual.volumeText} BTN matched exactly in Wei.`);
 }
 const originalFetch=globalThis.fetch;let calls=0;
 try {
  globalThis.fetch=async url=>{calls++;return {ok:true,json:async()=>({items:[],next_page_params:null})};};
  const empty=await loadTransactionHistory('volume','1d',new AbortController().signal);
  assert.equal(empty.points.length,24);assert.ok(empty.points.every(p=>p.volume===0&&p.txs===0));
  await loadTransactionHistory('txs','1d',new AbortController().signal);
  assert.equal(calls,1,'same indexed page should be shared between graphs');
 } finally {globalThis.fetch=originalFetch;}
 const originalNow=Date.now;
 try {
  const snapshot=originalNow()+600000;
  Date.now=()=>snapshot; // Expire the shared page cache from the preceding test.
  let pages=0,progress=0;
  globalThis.fetch=async url=>{
   pages++;assert.ok(pages<=41,'pagination must stop once the range is covered');
   const page=Number(new URL(url,'https://example.test').searchParams.get('block_number')||0)+1;
   const items=page<=40
    ? Array.from({length:50},(_,i)=>tx((page-1)*50+i+1,'ok','1',snapshot-1000))
    : [tx(2001,'ok','1',snapshot-1000),tx(2002,'ok','999999',snapshot-86400000-1)];
   return {ok:true,json:async()=>({items,next_page_params:{block_number:page}})};
  };
  const full=await loadTransactionHistory('volume','1d',new AbortController().signal,()=>progress++);
  assert.equal(pages,41,'official volume must continue beyond the old 2,000 transaction cap');
  assert.equal(progress,41);
  assert.ok(full.points.every(p=>p.volume!==null));
  assert.equal(full.points.reduce((n,p)=>n+BigInt(p.volumeWei),0n),2001n);
  assert.equal(full.points.reduce((n,p)=>n+p.txs,0),2001);
 } finally {Date.now=originalNow;globalThis.fetch=originalFetch;}
 console.log('PASS: official counts, UTC boundaries, real zero vs missing dates, provisional data, exact Wei, failed transactions, duplicate hashes, incomplete scans and shared cache.');
} finally {await rm(temp,{recursive:true,force:true});}
