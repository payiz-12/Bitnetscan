// GET /api/og?type=tx|block|address&id=... -> 1200×630 PNG share card read from the Bitnet chain.
// Used as the og:image / twitter:image of /tx/…, /block/… and /address/… links.
import { ImageResponse } from '@vercel/og';
import { loadCard } from './_lib/card.js';
import { renderCard, loadFonts } from './_lib/render.js';

export default async function handler(req, res) {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  try {
    const card = await loadCard(params.get('type'), String(params.get('id') || ''));
    if (!card) throw new Error('Not found');
    const image = new ImageResponse(renderCard(card, `https://${host}`), { width: 1200, height: 630, fonts: await loadFonts() });
    const png = Buffer.from(await image.arrayBuffer());
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', `public, s-maxage=${card.maxAge}, stale-while-revalidate=86400`);
    res.status(200).send(png);
  } catch {
    // Unknown id or chain unreachable: fall back to the site's default preview image.
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    res.setHeader('Location', '/og-image.png');
    res.status(302).end();
  }
}
