import { PLANETS, type Planet, type PublicChart } from '@juno/astro';

/**
 * Geometry the chart wheel needs that is worth testing on its own.
 *
 * Nothing astrological is computed here — the positions come from the
 * engine. This is only about where a glyph fits on the drawing.
 */

/**
 * Degrees two glyphs need between them to be read as two glyphs, at the
 * outermost ring of a 320-point wheel. Only a fallback: the drawing knows
 * its own radii and should pass `minGap` from `glyphGapDegrees` instead.
 */
export const MIN_GLYPH_GAP = 9;

/**
 * How far in a glyph may be stepped. Three rings hold any real chart: the
 * cap only bites on a pile-up of four bodies inside one gap, and then a
 * pair overlapping is better than a glyph drawn near the middle of the
 * wheel, where it would read as belonging to no house at all. The drawing
 * divides the band between the planet ring and the aspect ring by one
 * more than this, so the innermost ring always stays clear of the aspect
 * lines whatever the wheel's size.
 */
export const MAX_GLYPH_LEVEL = 2;

/**
 * The angle a glyph of `width` points subtends at `radius` points — the
 * separation two glyphs on the same ring need in order not to touch.
 *
 * An angle is not a distance: seven degrees is nineteen points out at the
 * rim and ten points in at the third ring, so a fixed angle either wastes
 * the outer ring or overlaps the inner one. Pass the smallest radius any
 * glyph is drawn at and every ring is safe.
 */
export function glyphGapDegrees(width: number, radius: number): number {
  if (radius <= 0) return 360;
  return Math.min(360, (width / radius) * (180 / Math.PI));
}

/** Shortest way round the circle between two longitudes, in degrees. */
export function circularGap(a: number, b: number): number {
  const raw = (((a - b) % 360) + 360) % 360;
  return Math.min(raw, 360 - raw);
}

/**
 * Which ring each planet's glyph is drawn on: 0 is the outermost.
 *
 * A conjunction puts two bodies within a degree of each other and their
 * glyphs land on the same pixel. Moving one of them sideways — the obvious
 * fix — would draw it at a longitude it is not at: for a stellium, a whole
 * sign away, past a house cusp. So they are stepped inwards instead. Every
 * glyph keeps its true angle; only the radius changes.
 *
 * Assignment goes in longitude order and takes the lowest ring no
 * already-placed neighbour is using, so the result depends on the chart
 * alone and not on the order `PLANETS` happens to be in.
 */
export function glyphLevels(
  chart: PublicChart,
  minGap: number = MIN_GLYPH_GAP,
): ReadonlyMap<Planet, number> {
  const longitudeOf = (planet: Planet) => chart.planets[planet].longitude;
  const ordered = [...PLANETS].sort((a, b) => longitudeOf(a) - longitudeOf(b));
  const levels = new Map<Planet, number>();
  for (const planet of ordered) {
    const taken = new Set<number>();
    for (const [other, level] of levels) {
      if (circularGap(longitudeOf(planet), longitudeOf(other)) < minGap)
        taken.add(level);
    }
    let level = 0;
    while (taken.has(level)) level++;
    levels.set(planet, Math.min(level, MAX_GLYPH_LEVEL));
  }
  return levels;
}
