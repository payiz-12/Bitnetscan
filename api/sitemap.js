// /sitemap.xml (rewritten here by vercel.json): the pages search engines should index. The
// main pages, every BTS-20 token page, verified contracts and the largest accounts, read from
// the Bitnet explorer index. Cached at the edge for an hour, so new tokens are listed within the hour.
const EXPLORER = 'https://explorer.bitnetmoney.com/api/v2';

const PAGES = [
  ['/', 'always', '1.0'],
  ['/blocks', 'always', '0.9'],
  ['/transactions', 'always', '0.9'],
  ['/tokens', 'daily', '0.8'],
  ['/rich-list', 'daily', '0.8'],
  ['/transfers', 'hourly', '0.7'],
  ['/mine', 'weekly', '0.8'],
  ['/mining', 'hourly', '0.8'],
  ['/charts', 'hourly', '0.7'],
  ['/supply', 'hourly', '0.7'],
  ['/security', 'hourly', '0.7'],
  ['/uncles', 'hourly', '0.6'],
  ['/nfts', 'daily', '0.6'],
  ['/contracts', 'daily', '0.6'],
  ['/nodes', 'weekly', '0.5'],
  ['/tools', 'monthly', '0.5'],
  ['/api', 'monthly', '0.5'],
  ['/console', 'monthly', '0.4'],
];

async function pages(path, maxPages) {
  const items = [];
  let next = null;
  for (let i = 0; i < maxPages; i++) {
    const qs = new URLSearchParams(next ?? {});
    const url = `${EXPLORER}${path}${path.includes('?') ? '&' : '?'}${qs}`;
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(4000) });
      if (!res.ok) break;
      const d = await res.json();
      items.push(...(d.items ?? []));
      next = d.next_page_params;
      if (!next) break;
    } catch {
      break;
    }
  }
  return items;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default async function handler(req, res) {
  const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  const [tokens, contracts, accounts] = await Promise.all([
    pages('/tokens?type=ERC-20', 5),
    pages('/smart-contracts', 3),
    pages('/addresses', 2),
  ]);

  const urls = new Map();
  for (const [path, changefreq, priority] of PAGES) urls.set(path, { changefreq, priority });
  for (const t of tokens) {
    const a = t.address_hash || t.address;
    if (a) urls.set(`/token/${a}`, { changefreq: 'daily', priority: '0.6' });
  }
  for (const c of contracts) {
    const a = c.address?.hash;
    if (a && !urls.has(`/token/${a}`)) urls.set(`/address/${a}`, { changefreq: 'weekly', priority: '0.5' });
  }
  for (const acc of accounts) {
    const a = acc.hash;
    if (a && !urls.has(`/address/${a}`)) urls.set(`/address/${a}`, { changefreq: 'daily', priority: '0.4' });
  }

  const body = [...urls]
    .map(([path, u]) => `  <url><loc>${esc(origin + path)}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`)
    .join('\n');
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
}
