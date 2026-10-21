import { ethers } from 'ethers';

/** Most transactions written to one CSV; the explorer pages 50 at a time. */
export const CSV_MAX_ROWS = 5000;

const INDEXER_BASES = ['/api/explorer', 'https://explorer.bitnetmoney.com'];

async function page(path: string, signal: AbortSignal): Promise<any> {
  for (const base of INDEXER_BASES) {
    try {
      const res = await fetch(`${base}${path}`, { headers: { Accept: 'application/json' }, signal });
      if (res.ok) return await res.json();
    } catch (e) {
      if (signal.aborted) throw e;
    }
  }
  throw new Error('The explorer did not answer');
}

const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const btn = (wei: string | null | undefined) => {
  try { return ethers.formatEther(BigInt(wei || '0')); } catch { return ''; }
};

/**
 * Downloads an address's transactions (newest first, up to CSV_MAX_ROWS) as a CSV file.
 * Values and fees are exact BTN amounts; dates are UTC. Reports progress after each page.
 */
export async function exportTransactionsCsv(address: string, onProgress: (rows: number) => void, signal: AbortSignal): Promise<{ rows: number; truncated: boolean }> {
  const me = address.toLowerCase();
  const lines = ['Transaction Hash,Block,Date (UTC),From,To,Direction,Value (BTN),Fee (BTN),Status,Method'];
  let query = '';
  let truncated = false;
  for (;;) {
    const data = await page(`/api/v2/addresses/${address}/transactions${query}`, signal);
    const items: any[] = Array.isArray(data?.items) ? data.items : [];
    for (const t of items) {
      const from = String(t.from?.hash || '');
      const to = String(t.to?.hash || t.created_contract?.hash || '');
      const direction = from.toLowerCase() === me && to.toLowerCase() === me ? 'SELF' : from.toLowerCase() === me ? 'OUT' : 'IN';
      lines.push([
        t.hash,
        String(t.block_number ?? ''),
        String(t.timestamp || '').replace('T', ' ').replace(/\.\d+Z$|Z$/, ''),
        from,
        t.to ? to : `${to} (contract created)`,
        direction,
        btn(t.value),
        btn(t.fee?.value),
        t.status === 'ok' ? 'Success' : t.status === 'error' ? 'Failed' : String(t.status || ''),
        String(t.method || ''),
      ].map((v) => cell(String(v))).join(','));
      if (lines.length - 1 >= CSV_MAX_ROWS) break;
    }
    onProgress(lines.length - 1);
    if (lines.length - 1 >= CSV_MAX_ROWS) { truncated = Boolean(data?.next_page_params) || items.length > 0; break; }
    if (!data?.next_page_params) break;
    query = '?' + new URLSearchParams(Object.entries(data.next_page_params).map(([k, v]) => [k, String(v)])).toString();
  }

  // UTF-8 byte order mark so spreadsheet apps read the file as UTF-8.
  const blob = new Blob(['﻿' + lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bitnetscan-${me}-transactions.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { rows: lines.length - 1, truncated };
}
