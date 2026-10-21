// /tx/:hash, /block/:id and /address/:address (rewritten here by vercel.json) return the app's
// index.html with link-preview tags for that page, so X, Telegram, WhatsApp and Discord show
// a card with the details. The app then shows the page for that path.
import { loadCard } from './_lib/card.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function setTag(html, attr, key, value) {
  const re = new RegExp(`(<meta ${attr}="${key.replace(/[:]/g, '\\$&')}" content=")[^"]*(")`);
  return re.test(html) ? html.replace(re, `$1${esc(value)}$2`) : html.replace('</head>', `  <meta ${attr}="${key}" content="${esc(value)}" />\n  </head>`);
}

export default async function handler(req, res) {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const type = params.get('type');
  const id = String(params.get('id') || '');
  const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;

  let html = null;
  try {
    const page = await fetch(`${origin}/index.html`, { signal: AbortSignal.timeout(5000) });
    if (page.ok) html = await page.text();
  } catch {
    // fall back below
  }
  if (!html) {
    const target = `/#/${type === 'address' ? 'address' : type}/${encodeURIComponent(id)}`;
    html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>BitnetScan</title><meta name="description" content=""><meta property="og:title" content=""><meta property="og:description" content=""><meta property="og:url" content=""><meta property="og:image" content=""><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content=""><meta name="twitter:description" content=""><meta name="twitter:image" content=""><script>location.replace(${JSON.stringify(target)})</script></head><body></body></html>`;
  }

  let card = null;
  try {
    card = await loadCard(type, id);
  } catch {
    // keep the default tags
  }
  if (card) {
    const url = `${origin}${card.path}`;
    const image = `${origin}/api/og?type=${type}&id=${encodeURIComponent(card.path.split('/').pop())}`;
    const title = `${card.title} | BitnetScan`;
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
    html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${esc(url)}$2`);
    html = setTag(html, 'name', 'description', card.description);
    for (const [key, value] of [['og:title', title], ['og:description', card.description], ['og:url', url], ['og:image', image], ['og:image:secure_url', image], ['og:image:alt', card.title]]) {
      html = setTag(html, 'property', key, value);
    }
    for (const [key, value] of [['twitter:title', title], ['twitter:description', card.description], ['twitter:image', image], ['twitter:image:alt', card.title]]) {
      html = setTag(html, 'name', key, value);
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', `public, s-maxage=${card ? Math.min(card.maxAge, 3600) : 60}, stale-while-revalidate=86400`);
  res.status(200).send(html);
}
