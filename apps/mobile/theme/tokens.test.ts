import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { color, glass, gradient, planet } from './tokens';

/**
 * WCAG 2 relative luminance and contrast ratio, from sRGB hex. The rgba
 * tokens that carry text — the glass fills — are composited over the
 * ground they sit on first; the rest (borders, tracks, scrims) are not
 * measured.
 */
function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG AA for text under 18pt regular / 14pt bold, which is all of ours. */
const AA = 4.5;
/** WCAG AA for large text; the planet glyphs are 17pt and up, coloured. */
const AA_LARGE = 3;

/** `rgba(r,g,b,a)` laid over a hex ground, as the hex it composites to. */
function over(rgba: string, ground: string): string {
  const m = /rgba\((\d+),(\d+),(\d+),([\d.]+)\)/.exec(rgba);
  if (m === null) throw new Error(`not rgba: ${rgba}`);
  const a = Number(m[4]);
  const hex = (i: number) => parseInt(ground.slice(i, i + 2), 16);
  const mix = (top: number, under: number) =>
    Math.round(top * a + under * (1 - a))
      .toString(16)
      .padStart(2, '0');
  return `#${mix(Number(m[1]), hex(1))}${mix(Number(m[2]), hex(3))}${mix(Number(m[3]), hex(5))}`;
}

const GROUNDS = ['bg', 'surface', 'surfaceSoft', 'surfaceHigh'] as const;
/** Every token that is ever the colour of a `Text` on one of the grounds. */
const INKS = [
  'text',
  'textMuted',
  'textFaint',
  'danger',
  'ok',
  'tense',
  'pink',
  'cool',
  'coolLight',
  'warm',
] as const;

describe('text contrast', () => {
  for (const ink of INKS) {
    for (const ground of GROUNDS) {
      it(`${ink} on ${ground} is at least ${AA}:1`, () => {
        expect(contrast(color[ink], color[ground])).toBeGreaterThanOrEqual(AA);
      });
    }
  }

  it('onBright reads on every stop of the gradient', () => {
    for (const stop of gradient) {
      expect(contrast(color.onBright, stop)).toBeGreaterThanOrEqual(AA);
    }
  });

  it('reads on the three filled surfaces that carry text', () => {
    expect(contrast(color.text, color.mine)).toBeGreaterThanOrEqual(AA);
    expect(contrast(color.danger, color.dangerSurface)).toBeGreaterThanOrEqual(
      AA,
    );
    expect(contrast(color.text, color.disabled)).toBeGreaterThanOrEqual(AA);
    expect(contrast(color.textMuted, color.disabled)).toBeGreaterThanOrEqual(
      AA,
    );
  });

  it('keeps every ink readable on glass over the darkest ground', () => {
    // A glass fill is darkest over `bg`; over `surface` it is lighter, so
    // the ground that is hardest for a light ink is the one to check.
    for (const fill of [glass.fill, glass.fillSoft, glass.fillHigh]) {
      const ground = over(fill, color.bg);
      for (const ink of INKS) {
        expect(contrast(color[ink], ground)).toBeGreaterThanOrEqual(AA);
      }
    }
  });

  it('keeps every planet glyph readable where it is drawn', () => {
    // Glyphs sit on a card (glass over bg) and in a tinted badge on it;
    // the badge tint is `glass.fillHigh`, the darkest of the three.
    const card = over(glass.fill, color.bg);
    const badge = over(glass.fillHigh, card);
    for (const ink of Object.values(planet)) {
      expect(contrast(ink, card)).toBeGreaterThanOrEqual(AA_LARGE);
      expect(contrast(ink, badge)).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  it('measures the way the palette was measured', () => {
    // The pair the D1 fix was sized on: #8A84AD on #1D1B31, 4.77 by hand.
    expect(contrast('#8A84AD', '#1D1B31')).toBeCloseTo(4.77, 2);
    expect(contrast('#FFFFFF', '#000000')).toBe(21);
  });
});

const MOBILE = fileURLToPath(new URL('..', import.meta.url));

function* sources(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sources(path);
    else if (/\.tsx?$/.test(entry.name)) yield path;
  }
}

describe('nothing outside tokens.ts holds a colour', () => {
  // A hex or rgb() literal inside a string. Two documented exceptions,
  // both of them files read before any JavaScript runs — `app.json`, for
  // the splash and the Android icon, and the web page's own head and tab
  // icon under `public/`. Each is checked against the token below.
  const literal = /(['"`])#[0-9a-f]{3,8}\1|\brgba?\(/i;

  it('app, components and lib are clean', () => {
    const hits: string[] = [];
    for (const root of ['app', 'components', 'lib']) {
      for (const file of sources(join(MOBILE, root))) {
        readFileSync(file, 'utf8')
          .split('\n')
          .forEach((line, i) => {
            if (literal.test(line))
              hits.push(`${file}:${i + 1}: ${line.trim()}`);
          });
      }
    }
    expect(hits).toEqual([]);
  });

  it('the web page and its tab icon paint the ground the tokens do', () => {
    // The browser paints its canvas, its toolbars and the icon's ground
    // before the bundle exists, so these three cannot read `tokens.ts`.
    // They can be held to it: a `color.bg` that moved without these
    // moving is exactly the white edge this pair of files was written to
    // remove (owner, 2026-09-17).
    const html = readFileSync(join(MOBILE, 'public', 'index.html'), 'utf8');
    const svg = readFileSync(join(MOBILE, 'public', 'icon.svg'), 'utf8');
    const hexes = (text: string, pattern: RegExp): string[] =>
      [...text.matchAll(pattern)].map((m) => (m[1] ?? '').toUpperCase());

    // Three grounds: the theme-color the toolbars take, the page's own
    // background, and the icon's rounded square.
    const grounds = [
      ...hexes(html, /(?:content="|background-color:\s*)(#[0-9a-fA-F]{6})/g),
      ...hexes(svg, /fill="(#[0-9a-fA-F]{6})"/g),
    ];
    expect(grounds).toEqual([color.bg, color.bg, color.bg]);

    // And the mark itself is the product's one gradient: the ring runs
    // through all three stops in order, and each sphere ends on one of its
    // ends — the warm one below left, the cool one above right.
    const defs = (id: string): string => {
      const block = new RegExp(
        `<(linear|radial)Gradient id="${id}"[\\s\\S]*?</\\1Gradient>`,
      ).exec(svg);
      expect(block, `no gradient "${id}" in icon.svg`).not.toBeNull();
      return block === null ? '' : block[0];
    };
    const stops = (id: string): string[] =>
      hexes(defs(id), /stop-color="(#[0-9a-fA-F]{6})"/g);
    expect(stops('ring')).toEqual([...gradient]);
    expect(stops('warm').at(-1)).toBe(color.warm);
    expect(stops('cool').at(-1)).toBe(color.cool);
  });

  it('app.json paints the ground the tokens do', () => {
    const json = readFileSync(join(MOBILE, 'app.json'), 'utf8');
    const painted = [
      ...json.matchAll(/"backgroundColor":\s*"(#[0-9a-fA-F]{6})"/g),
    ].map((m) => m[1]);
    expect(painted.length).toBeGreaterThan(0);
    for (const hex of painted) expect(hex).toBe(color.bg);
  });
});
