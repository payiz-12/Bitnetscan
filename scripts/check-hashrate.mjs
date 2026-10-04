import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const temp=await mkdtemp(join(tmpdir(),'btn-hashrate-'));
try {
 const file=join(temp,'hashrate.mjs');
 await build({entryPoints:['src/services/hashrate.ts'],bundle:true,platform:'node',format:'esm',outfile:file});
 const {calculateHashrate,getCachedHashrateHistory,loadHashrateHistory}=await import(pathToFileURL(file));
 // Block time and difficulty both change midway through this chain.
 const block=n=>({number:n,timestamp:1689340800+Math.min(n,10000)*5+Math.max(n-10000,0)*20,
  totalDifficulty:String(BigInt(Math.min(n,10000))*100000000n+BigInt(Math.max(n-10000,0))*500000000n),difficulty:'500000000'});
 assert.deepEqual(getCachedHashrateHistory('1d'),[],'no generated curve on a cold load');
 assert.equal(calculateHashrate(block(10000),block(20000)),25000000);
 assert.equal(calculateHashrate(block(1),{...block(2),totalDifficulty:''}),null,'missing work must not use last difficulty');
 assert.equal(calculateHashrate(block(2),block(1)),null);
 const latest=block(20000), control=new AbortController();
 const points=await loadHashrateHistory('1d',latest,async n=>block(n),control.signal);
 assert.equal(points.length,24);
 assert.ok(points.every(p=>p.hashrate===0.025));
 assert.ok(points[0].fullDate.startsWith(new Date((latest.timestamp-86400)*1000).toISOString()),'range starts at the actual time boundary');
 assert.equal(points.at(-1).timestamp,latest.timestamp);
 assert.equal(getCachedHashrateHistory('1d').length,24);
 await assert.rejects(loadHashrateHistory('7d',latest,async n=>n===1?block(n):null,control.signal),/unavailable/);
 assert.deepEqual(getCachedHashrateHistory('7d'),[],'failed scan must not invent a fallback rate');
 const aborted=new AbortController();aborted.abort();
 await assert.rejects(loadHashrateHistory('all',latest,async n=>block(n),aborted.signal));
 console.log('PASS: cumulative work, real time boundary, verified cache, missing work, missing blocks and cancellation.');
} finally {await rm(temp,{recursive:true,force:true});}
