// Share card layout (1200×630) for @vercel/og, written as plain element objects.
import { readFile } from 'node:fs/promises';

const h = (type, style, ...children) => ({
  type,
  props: { style, children: children.length === 1 ? children[0] : children },
});
const img = (src, style) => ({ type: 'img', props: { src, style } });

const BADGE = {
  Success: ['#ECFDF5', '#047857', '#A7F3D0'],
  Failed: ['#FFF1F2', '#BE123C', '#FECDD3'],
  Pending: ['#FFFBEB', '#B45309', '#FDE68A'],
};

let fontsJob = null;
/** Inter 400/700/800 and JetBrains Mono 500, bundled in api/_fonts (SIL Open Font License). */
export function loadFonts() {
  if (!fontsJob) {
    const file = (name) => readFile(new URL(`../_fonts/${name}.woff`, import.meta.url));
    fontsJob = Promise.all([
      file('inter-latin-400-normal'),
      file('inter-latin-700-normal'),
      file('inter-latin-800-normal'),
      file('jetbrains-mono-latin-500-normal'),
    ]).then(([r, b, x, m]) => [
      { name: 'Inter', data: r, weight: 400, style: 'normal' },
      { name: 'Inter', data: b, weight: 700, style: 'normal' },
      { name: 'Inter', data: x, weight: 800, style: 'normal' },
      { name: 'Mono', data: m, weight: 500, style: 'normal' },
    ]);
  }
  return fontsJob;
}

export function renderCard(card, origin) {
  const size = card.headline.length > 26 ? 50 : card.headline.length > 18 ? 62 : 76;
  const [badgeBg, badgeText, badgeBorder] = BADGE[card.badge] || ['#EBF6F7', '#016976', '#D3ECEF'];
  const host = origin.replace(/^https?:\/\//, '');
  const shownPath = card.path.length > 34 ? `${card.path.slice(0, 22)}…${card.path.slice(-8)}` : card.path;

  return h(
    'div',
    { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#F8F7F4', padding: '44px 56px', fontFamily: 'Inter' },
    // Header
    h(
      'div',
      { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
      h(
        'div',
        { display: 'flex', alignItems: 'center' },
        h('div', { display: 'flex', width: 64, height: 64, borderRadius: 18, background: '#FFFFFF', border: '2px solid #E2E8F0', alignItems: 'center', justifyContent: 'center' }, img(`${origin}/bitnetscan-icon.png`, { width: 46, height: 46 })),
        h('div', { display: 'flex', marginLeft: 18, fontSize: 40, fontWeight: 800, color: '#162334' }, 'Bitnet', h('span', { color: '#016976' }, 'Scan'))
      ),
      h('div', { display: 'flex', fontSize: 24, fontWeight: 700, color: '#016976', background: '#EBF6F7', border: '2px solid #D3ECEF', borderRadius: 999, padding: '8px 22px' }, 'Bitnet · Chain 210')
    ),
    // Card
    h(
      'div',
      { display: 'flex', flexDirection: 'column', flex: 1, marginTop: 28, background: '#FFFFFF', border: '2px solid #E2E8F0', borderRadius: 32, padding: '34px 44px', position: 'relative', overflow: 'hidden' },
      // Faint brand mark filling the right side of the card
      img(`${origin}/bitnetscan-icon.png`, { position: 'absolute', right: -40, top: 40, width: 360, height: 360, opacity: 0.06 }),
      h(
        'div',
        { display: 'flex', alignItems: 'center' },
        h('div', { display: 'flex', fontSize: 22, fontWeight: 700, letterSpacing: 2, color: '#016976', background: '#EBF6F7', borderRadius: 10, padding: '6px 14px' }, card.kind.toUpperCase()),
        card.badge
          ? h('div', { display: 'flex', marginLeft: 14, fontSize: 22, fontWeight: 700, color: badgeText, background: badgeBg, border: `2px solid ${badgeBorder}`, borderRadius: 999, padding: '4px 16px' }, card.badge)
          : h('div', { display: 'flex' }, '')
      ),
      h('div', { display: 'flex', marginTop: 18, fontSize: size, fontWeight: 800, color: '#0F172A', letterSpacing: -1, lineHeight: 1.15 }, card.headline),
      h('div', { display: 'flex', marginTop: 6, lineHeight: 1.3, fontSize: card.subline.startsWith('0x') || card.subline.includes('· 0x') ? 22 : 26, color: '#64748B', fontFamily: card.subline.includes('0x') ? 'Mono' : 'Inter' }, card.subline),
      h(
        'div',
        { display: 'flex', flexWrap: 'wrap', marginTop: 'auto' },
        ...card.rows.map((r) =>
          h(
            'div',
            { display: 'flex', flexDirection: 'column', width: '50%', marginTop: 16, paddingRight: 24 },
            h('div', { display: 'flex', fontSize: 18, fontWeight: 700, letterSpacing: 1.5, color: '#94A3B8' }, r.label.toUpperCase()),
            h('div', { display: 'flex', marginTop: 4, fontSize: 26, fontWeight: 700, color: '#0F172A', lineHeight: 1.25 }, r.value)
          )
        )
      )
    ),
    // Footer
    h(
      'div',
      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, fontSize: 22, color: '#64748B' },
      h('div', { display: 'flex', fontFamily: 'Mono' }, `${host}${shownPath}`),
      h('div', { display: 'flex', alignItems: 'center' }, h('div', { display: 'flex', width: 12, height: 12, borderRadius: 999, background: '#10B981', marginRight: 10 }, ''), 'Read live from the Bitnet chain')
    )
  );
}
