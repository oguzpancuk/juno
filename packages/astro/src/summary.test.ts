import { describe, expect, it } from 'vitest';
import { PLANETS } from './bodies';
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

  it('has a sign and house line for all ten planets and a rising line', () => {
    expect(reading.planets.map((p) => p.planet)).toEqual([...PLANETS]);
    for (const p of reading.planets) {
      expect(p.signText.length).toBeGreaterThan(20);
      expect(p.houseText.length).toBeGreaterThan(20);
    }
    expect(reading.risingText).toMatch(/Meraklı|konuşkan/); // Gemini rising
  });

  it('marks retrograde planets with a retrograde line and never the Sun or Moon', () => {
    const jupiter = reading.planets.find((p) => p.planet === 'jupiter');
    expect(jupiter?.retrogradeText).toMatch(/Jüpiter retro/);
    expect(
      reading.planets.find((p) => p.planet === 'sun')?.retrogradeText,
    ).toBeNull();
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
