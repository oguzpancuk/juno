/**
 * A star field that is the same every time it is drawn.
 *
 * `Math.random` would give every mount a different sky, so a re-render —
 * a rotation, the keyboard, a parent's state — would make the stars jump.
 * A seeded generator makes the field a pure function of its inputs, which
 * is also what lets a test pin it. The generator is Park–Miller: one
 * multiply and a modulo, good enough for forty dots.
 */
export interface Star {
  x: number;
  y: number;
  /** Radius in points. */
  r: number;
  /** 0–1. Most stars are faint; a few carry the field. */
  alpha: number;
  /** Which of the sky's colours (an index into `tokens.star`). */
  hue: number;
  /** One breath of the twinkle, in milliseconds. */
  period: number;
  /** Where in its breath the star starts, 0–1, so they never march. */
  phase: number;
}

const MODULUS = 2147483647;
const MULTIPLIER = 16807;

function lcg(seed: number): () => number {
  // Folded onto [1, MODULUS): a seed of 0 would stay 0 forever, and JS
  // keeps the sign of a negative one, which would put every star off the
  // canvas.
  let state = (((seed | 0) % MODULUS) + MODULUS) % MODULUS || 1;
  return () => {
    state = (state * MULTIPLIER) % MODULUS;
    return (state - 1) / (MODULUS - 1);
  };
}

export const STAR_RADIUS = { min: 0.6, max: 2.6 } as const;
export const STAR_ALPHA = { min: 0.25, max: 0.9 } as const;
export const STAR_HUES = 4;
export const STAR_PERIOD = { min: 1600, max: 4200 } as const;

export function starField(
  seed: number,
  count: number,
  width: number,
  height: number,
): Star[] {
  const next = lcg(seed);
  const stars: Star[] = [];
  for (let i = 0; i < count; i += 1) {
    const x = next() * width;
    const y = next() * height;
    // Squared so small stars outnumber large ones, the way a sky reads.
    const size = next() ** 2;
    const r = STAR_RADIUS.min + size * (STAR_RADIUS.max - STAR_RADIUS.min);
    const alpha = STAR_ALPHA.min + size * (STAR_ALPHA.max - STAR_ALPHA.min);
    // Most stars white; the tinted ones are the exception, as in a sky.
    const hue = next() < 0.55 ? 0 : 1 + Math.floor(next() * (STAR_HUES - 1));
    const period =
      STAR_PERIOD.min + next() * (STAR_PERIOD.max - STAR_PERIOD.min);
    const phase = next();
    stars.push({ x, y, r, alpha, hue, period, phase });
  }
  return stars;
}
