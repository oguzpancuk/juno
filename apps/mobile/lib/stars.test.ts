import { describe, expect, it } from 'vitest';
import {
  STAR_ALPHA,
  STAR_HUES,
  STAR_PERIOD,
  STAR_RADIUS,
  starField,
} from './stars';

describe('starField', () => {
  it('is the same sky for the same seed', () => {
    expect(starField(7, 40, 402, 874)).toEqual(starField(7, 40, 402, 874));
  });

  it('is a different sky for a different seed', () => {
    expect(starField(7, 40, 402, 874)).not.toEqual(starField(8, 40, 402, 874));
  });

  it('draws the number asked for, every one inside the box', () => {
    const stars = starField(3, 60, 300, 500);
    expect(stars).toHaveLength(60);
    for (const { x, y, r, alpha, hue, period, phase } of stars) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(300);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(500);
      expect(r).toBeGreaterThanOrEqual(STAR_RADIUS.min);
      expect(r).toBeLessThanOrEqual(STAR_RADIUS.max);
      expect(alpha).toBeGreaterThanOrEqual(STAR_ALPHA.min);
      expect(alpha).toBeLessThanOrEqual(STAR_ALPHA.max);
      expect(Number.isInteger(hue)).toBe(true);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(STAR_HUES);
      expect(period).toBeGreaterThanOrEqual(STAR_PERIOD.min);
      expect(period).toBeLessThanOrEqual(STAR_PERIOD.max);
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(1);
    }
  });

  it('makes small stars the majority', () => {
    const stars = starField(11, 400, 402, 874);
    const mid = (STAR_RADIUS.min + STAR_RADIUS.max) / 2;
    const small = stars.filter((s) => s.r < mid).length;
    expect(small).toBeGreaterThan(stars.length / 2);
  });

  it('keeps a negative seed on the canvas', () => {
    for (const { x, y, r } of starField(-5, 20, 100, 100)) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(r).toBeGreaterThanOrEqual(STAR_RADIUS.min);
    }
  });

  it('keeps white stars the majority', () => {
    const stars = starField(5, 400, 402, 874);
    expect(stars.filter((s) => s.hue === 0).length).toBeGreaterThan(
      stars.length / 2,
    );
  });

  it('survives a zero seed', () => {
    expect(starField(0, 5, 100, 100)).toHaveLength(5);
    expect(starField(0, 5, 100, 100)).toEqual(starField(0, 5, 100, 100));
  });
});
