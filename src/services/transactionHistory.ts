import { formatEther } from 'ethers';
const DAY = 86400000;
const GENESIS_DAY = Date.UTC(2023, 6, 14);
export interface ActivityBucket { start: number; end: number }
export interface TransactionHistoryPoint {
  date: string; fullDate: string; timestamp: number;
  txs: number | null; volume: number | null; volumeWei?: string; volumeText?: string;
  hashrate: number; supply: number | null; supplyText?: string; provisional?: boolean;
}
export interface TransactionHistory { points: TransactionHistoryPoint[]; message: string; fetchedAt: number }
export function activityBuckets(timeframe: string, now: number, daily = false): ActivityBucket[] {
  const today = Math.floor(now / DAY) * DAY;
  if (timeframe === '1d') return Array.from({length:24}, (_,i) => ({start:now-(24-i)*3600000,end:now-(23-i)*3600000}));
  if (timeframe === 'all') {
    const out: ActivityBucket[] = [];
    for (let d = GENESIS_DAY; d < now;) {
      const date = new Date(d), end = Math.min(now, daily ? d + DAY : Date.UTC(date.getUTCFullYear(), date.getUTCMonth()+1,1));
      out.push({start:d,end}); d=end;
    }
    return out;
  }
  const days = ({'7d':7,'30d':30,'90d':90,'1y':daily ? 365 : 364} as Record<string,number>)[timeframe] || 30;
  const step = timeframe === '1y' && !daily ? 7 : 1;
  const out: ActivityBucket[] = [];
  for(let d=today-(days-1)*DAY;d<now;d+=step*DAY) out.push({start:d,end:Math.min(d+step*DAY,now)});
  return out;
}
function point(bucket: ActivityBucket, timeframe: string): TransactionHistoryPoint {
  const options: Intl.DateTimeFormatOptions = timeframe==='1d' ? {hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'UTC'} : {day:'numeric',month:'short',timeZone:'UTC',...(timeframe==='all'?{year:'2-digit'}:{})};
  return {date:new Date(bucket.start).toLocaleString('en-US',options),fullDate:`${new Date(bucket.start).toISOString()} – ${new Date(bucket.end).toISOString()}`,timestamp:bucket.start/1000,txs:null,volume:null,hashrate:0,supply:null};
}
const jsonCache = new Map<string, { at: number; value: any }>();
const inFlight = new Map<string, Promise<any>>();
async function readJson(url: string): Promise<any> {
  const cached=jsonCache.get(url); if(cached && Date.now()-cached.at<300000) return cached.value;
  if(inFlight.has(url)) return inFlight.get(url)!;
  const job=(async()=>{
    const control=new AbortController(), timer=setTimeout(()=>control.abort(),3500);
    try {
      const response=await fetch(url,{signal:control.signal,headers:{Accept:'application/json'}});
      if(!response.ok) throw new Error(`Explorer HTTP ${response.status}`);
      const value=await response.json();
      if(jsonCache.size>150) jsonCache.delete(jsonCache.keys().next().value!);
      jsonCache.set(url,{at:Date.now(),value});return value;
    } finally {clearTimeout(timer);}
  })();
  inFlight.set(url,job);try{return await job;}finally{inFlight.delete(url);}
}
async function explorerJson(path: string) {
  try {return await readJson('/api/explorer'+path);} catch {return readJson('https://explorer.bitnetmoney.com'+path);}
}
async function statsJson(path: string) {
  try {return await readJson('/api/stats'+path);} catch {return readJson('https://stats.explorer.bitnetmoney.com'+path);}
}
export function aggregateOfficialCounts(chart: any[], buckets: ActivityBucket[], timeframe: string): TransactionHistoryPoint[] {
  const daily=new Map<string,any>();
  for(const item of chart) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !/^\d+$/.test(String(item.value)) || !Number.isSafeInteger(Number(item.value))) throw new Error('Invalid transaction statistics');
    if(daily.has(item.date) && daily.get(item.date).value!==item.value) throw new Error('Conflicting daily counts');
    daily.set(item.date,item);
  }
  return buckets.map(b=>{
    const p=point(b,timeframe);let count=0,complete=true,provisional=false;
    for(let d=b.start;d<b.end;d+=DAY) {
      const item=daily.get(new Date(d).toISOString().slice(0,10));
      if(!item) {complete=false;break;}
      count+=Number(item.value);provisional ||= item.is_approximate === true;
    }
    if(complete) {p.txs=count;p.provisional=provisional;if(provisional)p.fullDate+=' (provisional indexer data)';}
    return p;
  });
}
// Accumulate pages once: scanning older history must not repeatedly sum every
// preceding transaction, or treat a partially scanned period as a complete total.
function transactionAccumulator(buckets: ActivityBucket[], timeframe: string) {
  const seen = new Set<string>();
  const totals = buckets.map(() => ({ count: 0, wei: 0n, known: true }));
  return {
    add(items: any[]) {
      for (const tx of items) {
        const time = Date.parse(tx.timestamp);
        if (!/^0x[0-9a-f]{64}$/i.test(tx.hash) || !Number.isFinite(time) || !/^\d+$/.test(String(tx.value))) throw new Error('Invalid indexed transaction');
        const hash = tx.hash.toLowerCase();
        if (seen.has(hash)) continue;
        seen.add(hash);
        // Find the UTC bucket in logarithmic time, including long daily histories.
        let lo = 0, hi = buckets.length;
        while (lo < hi) {
          const mid = (lo + hi) >>> 1;
          if (buckets[mid].start <= time) lo = mid + 1; else hi = mid;
        }
        const i = lo - 1;
        if (i < 0 || time >= buckets[i].end) continue;
        const total = totals[i];
        total.count++;
        if (tx.status === 'ok') total.wei += BigInt(tx.value);
        else if (tx.status !== 'error') total.known = false;
      }
    },
    points(oldest: number, exhausted: boolean): TransactionHistoryPoint[] {
      return buckets.map((b, i) => {
        const p = point(b, timeframe), total = totals[i];
        if (!exhausted && oldest >= b.start) return p;
        p.txs = total.count;
        if (total.known) {
          p.volumeWei = total.wei.toString();
          p.volumeText = formatEther(total.wei);
          p.volume = Number(p.volumeText);
        }
        return p;
      });
    },
  };
}
const inFlightScans = new Map<string, Promise<TransactionHistory>>();
const completedPeriodCache = new Map<string, { points: TransactionHistoryPoint[]; at: number }>();

// Supply is a balance at a date, not a flow: never sum daily balances.
export function aggregateOfficialSupply(chart: any[], buckets: ActivityBucket[], timeframe: string): TransactionHistoryPoint[] {
  if (timeframe === '1d') return []; // Daily records cannot verify hourly supply.
  const daily = new Map<string, any>();
  for (const item of chart) {
    const time = Date.parse(item.date), value = String(item.value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !Number.isFinite(time)
      || new Date(time).toISOString().slice(0, 10) !== item.date
      || (item.date_to && item.date_to !== item.date)
      || !/^\d+(\.\d{1,18})?$/.test(value) || !Number.isFinite(Number(value))) {
      throw new Error('Invalid daily supply record');
    }
    if (daily.has(item.date) && String(daily.get(item.date).value) !== value) throw new Error('Conflicting supply records');
    daily.set(item.date, item);
  }
  return buckets.map(bucket => {
    const date = new Date(Math.ceil(bucket.end / DAY) * DAY - DAY).toISOString().slice(0, 10);
    const timestamp = Date.parse(date);
    const p = point({ start: timestamp, end: timestamp + DAY }, timeframe);
    const record = daily.get(date);
    p.fullDate = `${date} (UTC)`;
    if (record) {
      p.supplyText = String(record.value);
      p.supply = Number(p.supplyText);
      p.provisional = record.is_approximate === true;
      if (p.provisional) p.fullDate += ' (provisional indexer data)';
    }
    return p;
  });
}

export async function loadSupplyHistory(timeframe: string, signal: AbortSignal): Promise<TransactionHistoryPoint[]> {
  if (signal.aborted) throw new Error('Cancelled');
  if (timeframe === '1d') return [];
  // Discover an explicitly labelled BTN circulating-supply series. Market cap
  // and total coin supply are different metrics and must never substitute for it.
  const catalog = await statsJson('/api/v1/lines');
  const findSeries = (value: any): any => {
    if (!value || typeof value !== 'object') return null;
    if (value.id === 'circulatingSupply' && value.units === 'BTN' && value.resolutions?.includes('DAY')) return value;
    for (const child of Object.values(value)) {
      const found = findSeries(child);
      if (found) return found;
    }
    return null;
  };
  if (signal.aborted) throw new Error('Cancelled');
  if (!findSeries(catalog)) return [];
  const now = Date.now(), buckets = activityBuckets(timeframe, now, false);
  const query = new URLSearchParams({
    resolution: 'DAY',
    from: new Date(buckets[0].start).toISOString().slice(0, 10),
    to: new Date(now).toISOString().slice(0, 10),
  });
  const data = await statsJson(`/api/v1/lines/circulatingSupply?${query}`);
  if (signal.aborted) throw new Error('Cancelled');
  if (data.info?.id !== 'circulatingSupply' || data.info?.units !== 'BTN' || !Array.isArray(data.chart)) {
    throw new Error('Unverified supply series or unit');
  }
  return aggregateOfficialSupply(data.chart, buckets, timeframe);
}

export function aggregateTransactions(items: any[], buckets: ActivityBucket[], timeframe: string, oldest: number, exhausted: boolean): TransactionHistoryPoint[] {
  const totals = transactionAccumulator(buckets, timeframe);
  totals.add(items);
  return totals.points(oldest, exhausted);
}

export async function loadTransactionHistory(metric: 'txs'|'volume', timeframe: string, signal: AbortSignal, onProgress?: (result: TransactionHistory)=>void): Promise<TransactionHistory> {
  const scanKey = `${metric}:${timeframe}`;
  if (inFlightScans.has(scanKey)) {
    return inFlightScans.get(scanKey)!;
  }

  const job = (async () => {
    const now = Date.now(), buckets = activityBuckets(timeframe, now, metric === 'txs');
    const check = () => { if (signal.aborted) throw new Error('Cancelled'); };

    if (metric === 'txs' && timeframe !== '1d') {
      const query = new URLSearchParams({
        resolution: 'DAY',
        from: new Date(buckets[0].start).toISOString().slice(0, 10),
        to: new Date(now).toISOString().slice(0, 10),
      });
      const data = await statsJson(`/api/v1/lines/newTxns?${query}`);
      check();
      if (!Array.isArray(data.chart)) throw new Error('Transaction chart unavailable');
      const points = aggregateOfficialCounts(data.chart, buckets, timeframe);
      const res: TransactionHistory = {
        points,
        fetchedAt: now,
        message: 'Verified Blockscout newTxns · UTC. Missing periods remain blank (never filled with zero).',
      };
      completedPeriodCache.set(scanKey, { points, at: now });
      return res;
    }

    const totals = transactionAccumulator(buckets, timeframe), seenCursors = new Set<string>();
    let scanned = 0, cursor = '', oldest = Infinity, exhausted = false;

    for (;;) {
      check();
      const data = await explorerJson('/api/v2/transactions?filter=validated' + cursor);
      check();
      if (!Array.isArray(data.items)) throw new Error('Transaction list unavailable');
      totals.add(data.items);
      scanned += data.items.length;
      for (const item of data.items) {
        const time = Date.parse(item.timestamp);
        if (!Number.isFinite(time)) throw new Error('Transaction timestamp missing');
        oldest = Math.min(oldest, time);
      }
      exhausted = !data.next_page_params || Object.keys(data.next_page_params).length === 0;
      const points = totals.points(oldest, exhausted);
      const complete = exhausted || oldest < buckets[0].start;
      const result: TransactionHistory = {
        points,
        fetchedAt: now,
        message: `Verified indexer ledger · UTC · ${scanned} transactions scanned. ${complete ? 'Requested range verified.' : 'Only fully scanned periods are shown; earlier periods remain blank.'}`,
      };
      if (onProgress) onProgress(result);
      if (complete) {
        completedPeriodCache.set(scanKey, { points, at: now });
        return result;
      }
      const next = new URLSearchParams(Object.entries(data.next_page_params).map(([k, v]) => [k, String(v)])).toString();
      if (seenCursors.has(next)) throw new Error('Indexer repeated a page');
      seenCursors.add(next);
      cursor = '&' + next;
    }
  })();

  inFlightScans.set(scanKey, job);
  try {
    return await job;
  } finally {
    inFlightScans.delete(scanKey);
  }
}
