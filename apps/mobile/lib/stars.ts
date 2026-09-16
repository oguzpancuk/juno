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

export const STAR_RADIUS = { min: 0.6, max: 1.8 } as const;
export const STAR_ALPHA = { min: 0.25, max: 0.9 } as const;

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
    stars.push({ x, y, r, alpha });
  }
  return stars;
}
