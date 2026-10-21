// Dark theme for the whole app, applied when <html> has the class "dark".
//
// Instead of a dark: variant on every element, each themed color utility reads a CSS variable
// whose fallback is the normal (light) color: `rgb(var(--tx-slate-900, 15 23 42) / <alpha-value>)`.
// Light mode defines no variables, so every class keeps its usual color. The `.dark` rule below sets
// the variables, so the same classes switch to the dark palette. Mapping is per property: a light
// background shade turns into a dark surface, a dark text shade turns light, and dark backgrounds,
// solid buttons and light text (which already sit on dark surfaces) stay as they are.
//
// `.theme-island` marks an element that is dark in both themes (the top ticker bar); inside it the
// variables are reset so it looks exactly the same in both themes.
import colors from 'tailwindcss/colors';

const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

export const petrol = {
  DEFAULT: '#016976', 50: '#EBF6F7', 100: '#D3ECEF', 200: '#A7D9DF', 300: '#74BFC8', 400: '#3A98A4',
  500: '#016976', 600: '#015661', 700: '#01424B', 800: '#023239', 900: '#02242A', 950: '#011A1F',
};
export const terracotta = {
  DEFAULT: '#D68142', 50: '#FDF8F4', 100: '#FBF0E6', 200: '#F6DCC4', 300: '#EEBD92', 400: '#E29E66',
  500: '#D68142', 600: '#BD6E32', 700: '#9C5622', 800: '#7A431B', 900: '#5C3215', 950: '#3F220E',
};

// Dark surfaces, slightly tinted towards petrol.
export const DARK = {
  page: '#0B1316',
  surface: '#111B1F',
};
const NEUTRAL_BG = { 50: '#162327', 100: '#1B2A2F', 200: '#243439', 300: '#2F4249', 400: '#4B6069' };
const NEUTRAL_BORDER = { 50: '#18252A', 100: '#1D2B30', 200: '#26373D', 300: '#34484F', 400: '#4B6069' };
const NEUTRAL_TEXT = { 300: '#50646C', 400: '#74888F', 500: '#92A4AA', 600: '#AEBDC2', 700: '#C6D2D6', 800: '#DAE3E6', 900: '#E9EFF1', 950: '#F1F5F6' };

const HUES = {
  petrol, terracotta,
  amber: colors.amber, emerald: colors.emerald, rose: colors.rose, sky: colors.sky, indigo: colors.indigo,
  purple: colors.purple, orange: colors.orange, red: colors.red, teal: colors.teal, blue: colors.blue,
  green: colors.green, yellow: colors.yellow, violet: colors.violet, cyan: colors.cyan,
};

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const channels = (hex) => rgb(hex).join(' ');
const mix = (hex, base, amount) => {
  const a = rgb(hex);
  const b = rgb(base);
  return '#' + a.map((v, i) => Math.round(v * amount + b[i] * (1 - amount)).toString(16).padStart(2, '0')).join('');
};

// Dark-theme replacements per property; a shade missing here keeps its normal color.
function darkShades(name, scale) {
  const tintBase = scale[400];
  const bg = {
    50: mix(tintBase, DARK.surface, 0.1), 100: mix(tintBase, DARK.surface, 0.16),
    200: mix(tintBase, DARK.surface, 0.26), 300: mix(tintBase, DARK.surface, 0.4),
  };
  const border = {
    50: mix(tintBase, DARK.surface, 0.14), 100: mix(tintBase, DARK.surface, 0.2),
    200: mix(tintBase, DARK.surface, 0.3), 300: mix(tintBase, DARK.surface, 0.45),
  };
  // Petrol's 400 is too dark for text on a dark surface; its text steps one shade lighter.
  const text = name === 'petrol'
    ? { DEFAULT: scale[300], 500: scale[300], 600: scale[300], 700: scale[200], 800: scale[100], 900: scale[100], 950: scale[50] }
    : { DEFAULT: scale[400], 500: scale[400], 600: scale[400], 700: scale[400], 800: scale[300], 900: scale[200], 950: scale[200] };
  return { bg, text, border, other: border };
}

const vars = {};
const palettes = { bg: {}, tx: {}, bd: {}, c: {} };
const PROPS = { bg: 'bg', tx: 'text', bd: 'border', c: 'other' };

function addHue(name, scale, dark) {
  for (const [prefix, prop] of Object.entries(PROPS)) {
    const out = {};
    for (const shade of [...(scale.DEFAULT ? ['DEFAULT'] : []), ...SHADES]) {
      const base = scale[shade];
      if (!base) continue;
      const replacement = dark[prop][shade];
      if (replacement && replacement.toLowerCase() !== base.toLowerCase()) {
        const v = `--${prefix}-${name}-${shade}`;
        vars[v] = channels(replacement);
        out[shade] = `rgb(var(${v}, ${channels(base)}) / <alpha-value>)`;
      } else {
        out[shade] = base;
      }
    }
    palettes[prefix][name] = out;
  }
}

for (const [name, scale] of Object.entries(HUES)) addHue(name, scale, darkShades(name, scale));

addHue('slate', colors.slate, {
  bg: NEUTRAL_BG,
  border: NEUTRAL_BORDER,
  text: NEUTRAL_TEXT,
  other: { ...NEUTRAL_BG, ...Object.fromEntries(Object.entries(NEUTRAL_TEXT).filter(([s]) => Number(s) >= 400)) },
});

// White: card backgrounds and borders become the dark surface; white text stays white.
for (const prefix of ['bg', 'bd']) {
  const v = `--${prefix}-white`;
  vars[v] = channels(DARK.surface);
  palettes[prefix].white = `rgb(var(${v}, 255 255 255) / <alpha-value>)`;
}

export const themeColors = {
  colors: palettes.c,
  backgroundColor: palettes.bg,
  textColor: palettes.tx,
  borderColor: palettes.bd,
};

export const darkThemePlugin = ({ addBase }) => {
  addBase({
    '.dark': { ...vars, colorScheme: 'dark' },
    '.dark .theme-island': Object.fromEntries(Object.keys(vars).map((v) => [v, 'initial'])),
  });
};
