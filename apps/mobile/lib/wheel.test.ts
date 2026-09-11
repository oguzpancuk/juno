import { PLANETS, type Planet, type PublicChart } from '@juno/astro';
import { describe, expect, it } from 'vitest';
import {
  MAX_GLYPH_LEVEL,
  MIN_GLYPH_GAP,
  circularGap,
  glyphLevels,
} from './wheel';

/** A chart carrying nothing but the longitudes under test. */
const chartWith = (
  longitudes: Partial<Record<Planet, number>>,
): PublicChart => {
  const spread = 33; // any spacing wider than MIN_GLYPH_GAP
  const planets = Object.fromEntries(
    PLANETS.map((planet, index) => [
      planet,
      {
        sign: 'aries',
        degree: 0,
        house: 1,
        retrograde: false,
        longitude: longitudes[planet] ?? index * spread + 180,
      },
    ]),
  );
  return {
    planets,
    houses: {
      ascendant: 0,
      midheaven: 270,
      cusps: Array.from({ length: 12 }, (_, i) => i * 30),
    },
  } as unknown as PublicChart;
};

describe('circularGap', () => {
  it('measures the short way round', () => {
    expect(circularGap(350, 10)).toBe(20);
    expect(circularGap(10, 350)).toBe(20);
    expect(circularGap(0, 180)).toBe(180);
  });
});

describe('glyphLevels', () => {
  it('leaves a well-spaced chart alone', () => {
    const levels = glyphLevels(chartWith({}));
    expect([...levels.values()].every((level) => level === 0)).toBe(true);
  });

  it('steps a conjunction apart without moving it', () => {
    const levels = glyphLevels(chartWith({ sun: 50, mercury: 51 }));
    expect(levels.get('sun')).not.toBe(levels.get('mercury'));
  });

  it('separates every pair in a stellium that is closer than the gap', () => {
    const stellium = { sun: 50, mercury: 52, venus: 54 };
    const levels = glyphLevels(chartWith(stellium));
    const used = Object.keys(stellium).map((p) => levels.get(p as Planet));
    expect(new Set(used).size).toBe(3);
  });

  it('separates a conjunction that straddles 0° Aries', () => {
    const levels = glyphLevels(chartWith({ jupiter: 358, saturn: 2 }));
    expect(levels.get('jupiter')).not.toBe(levels.get('saturn'));
  });

  it('does not let one tight pair disturb another elsewhere', () => {
    const levels = glyphLevels(
      chartWith({ sun: 2, jupiter: 357, mercury: 100, venus: 101.5 }),
    );
    expect(levels.get('mercury')).not.toBe(levels.get('venus'));
  });

  it('never steps further in than the cap', () => {
    const pile = { sun: 50, mercury: 50.5, venus: 51, mars: 51.5, moon: 52 };
    const levels = glyphLevels(chartWith(pile));
    expect(Math.max(...levels.values())).toBeLessThanOrEqual(MAX_GLYPH_LEVEL);
  });

  it('reuses the outer ring once the gap is wide enough', () => {
    const levels = glyphLevels(
      chartWith({ sun: 50, mercury: 51, venus: 50 + MIN_GLYPH_GAP }),
    );
    expect(levels.get('venus')).toBe(0);
  });
});
