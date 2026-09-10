import { BODIES, OUTER_BODIES, type Body } from './bodies';

/**
 * The five compatibility dimensions (ADR-0009 §1). Every scored pairing
 * belongs to exactly one, and this table is the single source of truth for
 * four things at once: the dimension sums, the aspect card titles, the match
 * page's two-section split, and which aspects are eligible for the primary
 * view.
 */
export const DIMENSIONS = [
  'emotional',
  'chemistry',
  'communication',
  'stability',
  'growth',
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

type Pairing = readonly [Body, Body];

/**
 * Unordered pairings per dimension. Synastry visits A × B and B × A
 * separately — both are genuine aspects and both belong to the pairing
 * listed here once.
 */
const RAW_PAIRINGS: Record<Dimension, readonly Pairing[]> = {
  // The Moon rules the row it appears in: moon–mercury is Emotional, not
  // Communication.
  emotional: [
    ['moon', 'moon'],
    ['moon', 'sun'],
    ['moon', 'mercury'],
    ['moon', 'venus'],
    ['moon', 'mars'],
    ['moon', 'ascendant'],
    ['moon', 'jupiter'],
    ['moon', 'neptune'],
  ],
  chemistry: [
    ['venus', 'mars'],
    ['venus', 'venus'],
    ['mars', 'mars'],
    ['venus', 'ascendant'],
    ['mars', 'ascendant'],
    ['sun', 'venus'],
    ['sun', 'mars'],
    ['sun', 'ascendant'],
    ['ascendant', 'ascendant'],
    ['venus', 'jupiter'],
    ['mars', 'jupiter'],
    ['ascendant', 'jupiter'],
  ],
  communication: [
    ['mercury', 'mercury'],
    ['mercury', 'sun'],
    ['mercury', 'venus'],
    ['mercury', 'mars'],
    ['mercury', 'ascendant'],
    ['mercury', 'jupiter'],
  ],
  stability: [
    ['saturn', 'sun'],
    ['saturn', 'moon'],
    ['saturn', 'mercury'],
    ['saturn', 'venus'],
    ['saturn', 'mars'],
    ['saturn', 'ascendant'],
    ['sun', 'sun'],
  ],
  growth: [
    ['sun', 'jupiter'],
    ['moon', 'uranus'],
    ['moon', 'pluto'],
    ['uranus', 'sun'],
    ['uranus', 'mercury'],
    ['uranus', 'venus'],
    ['uranus', 'mars'],
    ['uranus', 'ascendant'],
    ['neptune', 'sun'],
    ['neptune', 'mercury'],
    ['neptune', 'venus'],
    ['neptune', 'mars'],
    ['neptune', 'ascendant'],
    ['pluto', 'sun'],
    ['pluto', 'mercury'],
    ['pluto', 'venus'],
    ['pluto', 'mars'],
    ['pluto', 'ascendant'],
  ],
};

/** `"venus|mars"` with the two bodies in BODIES order, so A×B == B×A. */
function pairingKey(a: Body, b: Body): string {
  return BODIES.indexOf(a) <= BODIES.indexOf(b) ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Frozen at every level — the record, each dimension's array, each tuple —
 * not merely `readonly`: the type is erased at runtime and this is exported,
 * so a single cast could otherwise desync the table from the lookups
 * snapshotted below.
 */
export const PAIRINGS: Readonly<Record<Dimension, readonly Pairing[]>> =
  Object.freeze(
    Object.fromEntries(
      DIMENSIONS.map((dimension) => [
        dimension,
        Object.freeze(
          RAW_PAIRINGS[dimension].map((pair) => Object.freeze([...pair])),
        ),
      ]),
      // why: Object.fromEntries widens the key to string; the keys are
      // exactly DIMENSIONS, and the tests assert every one is present.
    ) as Record<Dimension, readonly Pairing[]>,
  );

/**
 * Built with an explicit duplicate check rather than by handing pairs to
 * `new Map`: a Map silently lets a later entry win, so the same pairing
 * listed under two dimensions would leave `dimensionOf` correct while the
 * table a human reads — the ADR's "single source of truth" — says something
 * else. That shape survived every lookup-based test.
 */
const BY_KEY: ReadonlyMap<string, Dimension> = (() => {
  const map = new Map<string, Dimension>();
  for (const dimension of DIMENSIONS) {
    for (const [a, b] of PAIRINGS[dimension]) {
      const key = pairingKey(a, b);
      const existing = map.get(key);
      if (existing !== undefined)
        throw new Error(`${key} is in both ${existing} and ${dimension}`);
      map.set(key, dimension);
    }
  }
  return map;
})();

/**
 * The dimension a pairing belongs to. Every pairing ADR-0003 scores has one;
 * the generational pairs it skips (both bodies Jupiter–Pluto) do not, and
 * return null.
 */
export function dimensionOf(a: Body, b: Body): Dimension | null {
  return BY_KEY.get(pairingKey(a, b)) ?? null;
}

/** Every pairing ADR-0003 scores: all body pairs bar the generational ones. */
export function scoredPairings(): Pairing[] {
  const pairings: Pairing[] = [];
  for (let i = 0; i < BODIES.length; i++) {
    for (let j = i; j < BODIES.length; j++) {
      const a = BODIES[i];
      const b = BODIES[j];
      if (a === undefined || b === undefined) continue;
      if (OUTER_BODIES.has(a) && OUTER_BODIES.has(b)) continue;
      pairings.push([a, b]);
    }
  }
  return pairings;
}

/**
 * Growth counts tension as presence (ADR-0009 §1): a square to Uranus is
 * signal there, not deficit. Everywhere else the signed term is used.
 */
export function dimensionTerm(dimension: Dimension, term: number): number {
  return dimension === 'growth' ? Math.abs(term) : term;
}
