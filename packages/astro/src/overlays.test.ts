import { describe, expect, it } from 'vitest';
import {
  OVERLAY_DIRECTIONS,
  OVERLAY_HOUSES,
  OVERLAY_PLANETS,
  overlayText,
} from './content';
import { houseOverlays } from './summary';
import { computeChart } from './chart';
import { population } from './sample';
import { toPublicChart } from './public';

/** ROADMAP C5. Content plus a lookup: the cusps are already public. */

const chart = (iso: string, latitude = 41.01, longitude = 28.98) =>
  toPublicChart(computeChart({ utc: new Date(iso), latitude, longitude }));

const a = chart('1995-07-14T00:30:00Z');
const b = chart('1990-01-01T09:00:00Z', 39.93, 32.86);

describe('house overlays', () => {
  it('has a text for all sixty keys', () => {
    for (const planet of OVERLAY_PLANETS)
      for (const house of OVERLAY_HOUSES)
        for (const direction of OVERLAY_DIRECTIONS)
          expect(
            overlayText(planet, house, direction).length,
            `${planet}-${house}-${direction}`,
          ).toBeGreaterThan(20);
  });

  it('never mixes the two directions up', () => {
    // "Onun X'i senin N. evinde" and "Senin X'in onun N. evinde" are
    // different claims; a swap would be invisible without this.
    for (const planet of OVERLAY_PLANETS) {
      for (const house of OVERLAY_HOUSES) {
        expect(overlayText(planet, house, 'theirs').startsWith('Onun')).toBe(
          true,
        );
        expect(overlayText(planet, house, 'yours').startsWith('Senin')).toBe(
          true,
        );
        expect(overlayText(planet, house, 'theirs')).not.toBe(
          overlayText(planet, house, 'yours'),
        );
      }
    }
  });

  it('reads a real pair in both directions', () => {
    const readings = houseOverlays(a, b);
    expect(readings.length).toBeGreaterThan(0);
    for (const reading of readings) {
      expect(OVERLAY_HOUSES).toContain(reading.house);
      expect(reading.placements.length).toBeGreaterThan(0);
      const owner = reading.direction === 'theirs' ? 'Onun' : 'Senin';
      for (const placement of reading.placements) {
        expect(placement.text).toBe(
          overlayText(placement.planet, reading.house, reading.direction),
        );
        expect(placement.text.startsWith(owner)).toBe(true);
        expect(placement.text).toContain(`${reading.house}. evinde`);
      }
      // The title is the house's meaning, never a repeat of a text's
      // opening clause.
      expect(reading.theme.length).toBeGreaterThan(2);
    }
    expect(readings.some((r) => r.direction === 'theirs')).toBe(true);
    expect(readings.some((r) => r.direction === 'yours')).toBe(true);
  });

  it('never shows the same title twice, over a real population', () => {
    // Sun, Mercury and Venus stay within ~76 degrees, so several of them
    // share a house on most pairs; one card per placement produced three
    // cards in a row all headed the same way.
    const charts = population(60);
    for (let i = 0; i < charts.length; i++) {
      for (let j = i + 1; j < charts.length; j++) {
        const x = charts[i];
        const y = charts[j];
        if (!x || !y) continue;
        // Unique within a direction: the screen groups by direction, and
        // the same house can legitimately appear on both sides.
        for (const direction of ['theirs', 'yours'] as const) {
          const titles = houseOverlays(x, y)
            .filter((r) => r.direction === direction)
            .map((r) => r.theme);
          expect(new Set(titles).size, titles.join(' / ')).toBe(titles.length);
        }
      }
    }
  });

  it('puts the most telling house first', () => {
    // The screen shows one card before the disclosure, so the order decides
    // which one that is.
    for (const reading of [houseOverlays(a, b), houseOverlays(b, a)]) {
      const houses = reading.map((r) => `${r.direction}-${r.house}`);
      const sorted = [...houses].sort((x, y) => {
        const rank: Record<string, number> = {
          '7': 0,
          '8': 1,
          '5': 2,
          '1': 3,
          '11': 4,
          '12': 5,
        };
        const [dx, hx] = x.split('-');
        const [dy, hy] = y.split('-');
        return (
          (dx === 'theirs' ? 0 : 1) - (dy === 'theirs' ? 0 : 1) ||
          (rank[hx ?? ''] ?? 9) - (rank[hy ?? ''] ?? 9)
        );
      });
      expect(houses).toEqual(sorted);
    }
  });

  it('says nothing about the six houses it does not cover', () => {
    for (const reading of houseOverlays(a, b))
      expect([2, 3, 4, 6, 9, 10]).not.toContain(reading.house);
  });
});
