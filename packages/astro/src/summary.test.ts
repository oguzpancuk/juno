import { describe, expect, it } from 'vitest';
import { PLACEMENTS } from './content';
import { computeChart } from './chart';
import { toPublicChart } from './public';
import { natalReading, starterFromKey, synastryReading } from './summary';
import ankara from './__fixtures__/ankara-1990.json';
import istanbul from './__fixtures__/istanbul-1995.json';

const pub = (fx: typeof istanbul) =>
  toPublicChart(
    computeChart({
      utc: new Date(fx.input.utc),
      latitude: fx.input.latitude,
      longitude: fx.input.longitude,
    }),
  );

describe('natalReading', () => {
  const reading = natalReading(pub(istanbul));

  // One list, each body once, in the order the popup reads it: the
  // profile's three cards and the rest are the same shape (owner,
  // 2026-09-11).
  it('cards every body exactly once, in placement order', () => {
    expect(reading.placements.map((p) => p.placement)).toEqual([...PLACEMENTS]);
    for (const p of reading.placements) {
      expect(p.text.length).toBeGreaterThan(20);
      expect(p.label.length).toBeGreaterThan(2);
      expect(p.degree).toMatch(/^\d{1,2}°\d{2}′$/);
    }
    expect(reading.risingText).toMatch(/Meraklı|konuşkan/); // Gemini rising
  });

  // The helper is tested in public.test.ts; this pins the call site that
  // regressed, where a raw `% 30` printed an arcminute low.
  it("rounds the Ascendant's degree the way it rounds a planet's", () => {
    const chart = pub(istanbul);
    const withAscendant = {
      ...chart,
      houses: { ...chart.houses, ascendant: 30.2 },
    };
    const card = natalReading(withAscendant).placements.find(
      (p) => p.placement === 'ascendant',
    );
    expect(card?.degree).toBe('0°12′');
  });

  // The sign and the degree have to come from one value. Read the sign
  // from the raw longitude and the degree from a rounded one and a point
  // in the last arcsecond of Aries prints as the *start* of Aries, 30°
  // from where it is — and unlike a malformed "30°00′", nothing a reader
  // can catch. 30.2 above cannot see this: both spellings agree there.
  it('puts the Ascendant in the sign its rounded longitude is in', () => {
    const chart = pub(istanbul);
    const card = natalReading({
      ...chart,
      houses: { ...chart.houses, ascendant: 29.99996 },
    });
    const ascendant = card.placements.find((p) => p.placement === 'ascendant');
    expect(ascendant?.technical).toContain('Boğa');
    expect(ascendant?.degree).toBe('0°00′');
    // The reading follows the same sign, not the one the raw value is in.
    expect(card.risingText).toBe(
      natalReading({
        ...chart,
        houses: { ...chart.houses, ascendant: 30 },
      }).risingText,
    );
  });

  it('marks retrograde planets with a retrograde line and never the Sun or Moon', () => {
    const at = (body: string) =>
      reading.placements.find((p) => p.placement === body);
    expect(at('jupiter')?.retrogradeText).toMatch(/Jüpiter retro/);
    expect(at('sun')?.retrogradeText).toBeNull();
    // The Ascendant is a cusp, not a body that can turn around.
    expect(at('ascendant')?.retrogradeText).toBeNull();
  });

  it('lists the strongest natal aspects first, each with text', () => {
    expect(reading.aspects.length).toBeGreaterThan(0);
    expect(reading.aspects.length).toBeLessThanOrEqual(8);
    for (let i = 1; i < reading.aspects.length; i++) {
      expect(
        Math.abs(reading.aspects[i]?.aspect.term ?? 0),
      ).toBeLessThanOrEqual(Math.abs(reading.aspects[i - 1]?.aspect.term ?? 0));
    }
    for (const a of reading.aspects) expect(a.text.length).toBeGreaterThan(20);
  });
});

describe('synastryReading', () => {
  const a = pub(istanbul);
  const b = pub(ankara);
  const ab = synastryReading(a, b);
  const ba = synastryReading(b, a);

  it('agrees with compatibility() and reads from the viewer side', () => {
    expect(ab.score).toBe(ba.score);
    expect(ab.bandText.length).toBeGreaterThan(20);
    expect(ab.aspects.length).toBeGreaterThan(0);
    for (const x of ab.aspects) {
      expect(x.headline).toMatch(/onun/);
      expect(x.meaning.length).toBeGreaterThan(20);
      expect(x.question.endsWith('?')).toBe(true);
    }
    // Same strongest pair, mirrored headline, identical meaning/question.
    expect(ab.aspects[0]?.meaning).toBe(ba.aspects[0]?.meaning);
  });

  it('element lines mention both luminaries', () => {
    expect(ab.sunElements.length).toBeGreaterThan(20);
    expect(ab.moonElements.length).toBeGreaterThan(20);
    expect(ab.sunElements).toBe(ba.sunElements);
  });
});

describe('starterFromKey', () => {
  it('orients the headline by viewer side and keeps meaning/question', () => {
    const key = {
      planetA: 'jupiter',
      aspect: 'square',
      planetB: 'venus',
    } as const;
    const asA = starterFromKey(key, true);
    const asB = starterFromKey(key, false);
    expect(asA.headline.startsWith("Jüpiter'in onun Venüs'üyle")).toBe(true);
    expect(asB.headline.startsWith("Venüs'ün onun Jüpiter'iyle")).toBe(true);
    expect(asA.meaning).toBe(asB.meaning);
    expect(asA.question).toBe(asB.question);
  });
});

describe('the house says something too', () => {
  it('gives every primary placement but the Ascendant a house reading', () => {
    const chart = toPublicChart(
      computeChart({
        utc: new Date('1995-07-14T00:30:00Z'),
        latitude: 41.01,
        longitude: 28.98,
      }),
    );
    const reading = natalReading(chart);
    expect(reading.placements).toHaveLength(PLACEMENTS.length);
    for (const card of reading.placements) {
      expect(card.text.length).toBeGreaterThan(20);
      if (card.placement === 'ascendant') {
        // It is the first cusp, so there is no house it falls in.
        expect(card.house).toBeNull();
        expect(card.houseText).toBeNull();
        expect(card.technical).not.toContain('. ev');
      } else {
        expect(card.house).not.toBeNull();
        expect(card.houseText?.length ?? 0).toBeGreaterThan(20);
        expect(card.technical).toContain(`${String(card.house)}. ev`);
        // The sign reading and the house reading are different claims.
        expect(card.houseText).not.toBe(card.text);
      }
    }
  });
});
