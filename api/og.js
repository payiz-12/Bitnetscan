// GET /api/og?type=tx|block|address&id=... -> 1200×630 PNG share card read from the Bitnet chain.
// Used as the og:image / twitter:image of /tx/…, /block/… and /address/… links.
// satori lays the card out as SVG; resvg (WebAssembly) turns it into a PNG. No native image
// libraries are involved.
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import satori from 'satori';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import { loadCard } from './_lib/card.js';
import { renderCard, loadAssets } from './_lib/render.js';

const require = createRequire(import.meta.url);
let wasmJob = null;
const resvgReady = () => {
  wasmJob ??= readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')).then(initWasm);
  wasmJob.catch(() => { wasmJob = null; });
  return wasmJob;
};

export async function renderPng(card, origin) {
  const [assets] = await Promise.all([loadAssets(), resvgReady()]);
  const svg = await satori(renderCard(card, origin, assets), { width: 1200, height: 630, fonts: assets.fonts });
  const rendered = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render();
  const png = Buffer.from(rendered.asPng());
  rendered.free();
  return png;
}

export default async function handler(req, res) {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  try {
    const card = await loadCard(params.get('type'), String(params.get('id') || ''));
    if (!card) throw new Error('Not found');
    const png = await renderPng(card, `https://${host}`);
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
