import { describe, expect, it } from 'vitest';
import {
  OVERLAY_DIRECTIONS,
  OVERLAY_HOUSES,
  OVERLAY_PLANETS,
  overlayText,
} from './content';
import { houseOverlays } from './summary';
import { computeChart } from './chart';
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
      expect(reading.text).toBe(
        overlayText(reading.planet, reading.house, reading.direction),
      );
      const owner = reading.direction === 'theirs' ? 'Onun' : 'Senin';
      expect(reading.text.startsWith(owner)).toBe(true);
      expect(reading.text).toContain(`${reading.house}. evinde`);
      // The title is the house's meaning, never a repeat of the text's
      // opening clause.
      expect(reading.theme.length).toBeGreaterThan(2);
      expect(reading.text.startsWith(reading.theme)).toBe(false);
    }
    expect(readings.some((r) => r.direction === 'theirs')).toBe(true);
    expect(readings.some((r) => r.direction === 'yours')).toBe(true);
  });

  it('swaps direction when the viewer swaps', () => {
    const forward = houseOverlays(a, b);
    const backward = houseOverlays(b, a);
    const flip = (d: string) => (d === 'theirs' ? 'yours' : 'theirs');
    for (const reading of forward) {
      const mirror = backward.find(
        (x) =>
          x.planet === reading.planet &&
          x.house === reading.house &&
          x.direction === flip(reading.direction),
      );
      expect(
        mirror,
        `${reading.planet} ${reading.house} ${reading.direction}`,
      ).toBeDefined();
    }
  });

  it('says nothing about the six houses it does not cover', () => {
    for (const reading of houseOverlays(a, b))
      expect([2, 3, 4, 6, 9, 10]).not.toContain(reading.house);
  });
});
