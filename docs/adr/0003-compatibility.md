# ADR-0003: Compatibility score — weighted synastry aspect sum

Status: accepted · Date: 2026-09-08

## Context

The owner asked for "whatever the standard is" (PRD open question 2). A
research pass (2026-09-08) found no single published standard: astro.com
shows an inter-aspect grid and refuses to score; Sirius/Kepler and the
consumer apps keep their weights private. Three concrete, published and
deterministic methods exist and agree on shape:

- Cafe Astrology's romantic-compatibility point sheet (+4 … −4 per
  inter-chart aspect, positive/negative/net totals kept separately;
  Saturn hard aspects to Moon/Venus/Mars are the strongest negatives).
- Discepolo's method as implemented in Kerykeion (`RelationshipScore`):
  Sun–Sun, Sun–Moon, Sun–ASC, Moon–ASC, Venus–Mars only; hard and soft
  aspects score the same (intensity, not harmony); bonus for orb ≤ 2°.
- SolarSage (open source): per-body weights (Sun 1.0 … outers 0.5),
  aspect bases conj +4 / trine +3 / sextile +2 / opp −2 / square −3,
  linear orb decay, `harmony / (harmony + tension) × 100`.

Consensus: term = pairWeight × aspectWeight × orbFactor, summed over all
inter-chart aspects; Sun, Moon, Venus, Mars and the Ascendant dominate.
Per-vendor: exact weights, whether hard aspects subtract, and the 0–100
mapping.

## Decision

`compatibility(chartA, chartB)` in `packages/astro` implements the
following. Every number here is the spec; the Vitest fixture pair in
ROADMAP S6 is hand-computed from this table.

**Bodies and weights** (conventional ordering; values from SolarSage):

| Body                   | w   |
| ---------------------- | --- |
| Sun, Moon              | 1.0 |
| Venus                  | 0.9 |
| Mars, Ascendant        | 0.8 |
| Jupiter, Saturn        | 0.7 |
| Mercury                | 0.6 |
| Uranus, Neptune, Pluto | 0.5 |

Pair weight = wA × wB. Pairs where both bodies are Jupiter–Pluto are
skipped (generational, near-identical for same-age users).

**Aspects and base values** (major aspects only):

| Aspect      | Angle | Max orb | Base |
| ----------- | ----- | ------- | ---- |
| Conjunction | 0°    | 8°      | +4   |
| Trine       | 120°  | 6°      | +3   |
| Sextile     | 60°   | 4°      | +2   |
| Opposition  | 180°  | 8°      | −2   |
| Square      | 90°   | 6°      | −3   |

Max orb is multiplied by 0.75 when either body is Jupiter–Pluto.
Override (Cafe Astrology): Saturn in conjunction, square or opposition to
the other chart's Moon, Venus or Mars has base −4.

**Orb factor:** `f = 1 − orb / maxOrb`, then `f × 1.25` when orb ≤ 2°,
capped at 1.0.

**Element bonus (synthesis, small):** +2 when the two Suns share an
element or are complementary (fire–air, earth–water); the same for the
two Moons. Counts as harmony.

**Totals:** harmony `H` = sum of positive terms, tension `T` = sum of the
absolute values of negative terms. Both are returned.

**Score:** `score = round(50 + 50 × (H − T) / (H + T + 10))`, clamped to
0–100. The +10 damping keeps thin charts near 50 and rewards total
activity, which Cafe Astrology stresses over the net alone; no aspects
gives exactly 50. The function is symmetric in its arguments by
construction (every pair is visited once, A×B and B×A are the same pair).

**Strongest aspect** (for the "why" line and the conversation starter):
the term with the largest absolute value, ties broken by smaller orb;
harmonious preferred over tense when within 10 % of each other. Returned
as `{ planetA, aspect, planetB, orb, term }`.

## Amendment 1 (2026-09-08): opposition to the Ascendant

An opposition to the Ascendant is a conjunction to the Descendant, the
7th-house cusp and the classic partnership point; Cafe Astrology's sheet
rates Sun or Moon conjunct the Descendant +4, its highest value, and the
interpretive tradition reads planets on the Descendant as
relationship-forming. The table above scored it as a generic opposition
(−2), which contradicted the texts ("klasik partner açısı"). Rule: when
either body is the Ascendant and the aspect is an opposition, the base is
the conjunction base (+4); the opposition orb (8°) still applies and the
Saturn override does not (its targets are Moon, Venus, Mars only). Applies
to natal aspects as well, where the same geometry means a planet on the
Descendant.

## Consequences

- Deterministic, pure, symmetric, unit-testable; the table can be tuned
  in one place and every fixture flags the change.
- The +10 damping and the element bonus are our synthesis, not
  convention; they are listed as tunables to revisit after the TestFlight
  cohort shows the score distribution (v1 metrics).
- Nodes, Vertex, Chiron and minor aspects are excluded on purpose; adding
  them later is a table change, not a redesign.
- The score is a heuristic, not a claim; the UI labels it "uyum" and the
  "why" line always names the single aspect behind it.

## Amendment 2 (2026-09-10): the score is not displayed

The Consequences above end "the UI labels it 'uyum'", which was a statement
about the screen, not the engine. The 2026-09-10 PRD amendment and
`docs/adr/0009-presentation.md` §3 supersede it: the score is never printed.
It stays exactly as specified here — same table, same 0–100 return, same
symmetry — and remains the ranking key for `discover`, but it reaches a
screen only as one of four bands. Everything else in this ADR is unchanged;
`compatibility()`'s contract is not a presentation decision and never was.

## Amendment 3 (2026-09-11): the separation is computed from the unordered pair

`aspectBetween` derived the separation from `lonB - lonA`. Subtraction
negates exactly, but normalising the negation does not: `((d % 360) + 360)
% 360` rounds `d + 360` and `360 - d` differently, so the two argument
orders disagreed by one ulp on roughly a seventh of body pairs. That ulp
sits on two thresholds — `orb > maxOrb` and the tight-orb bonus at exactly
2° — where it is worth up to a quarter of a term, so
`compatibility(a, b)` and `compatibility(b, a)` could differ in the terms
themselves, not merely in the last decimal of a sum. This ADR guarantees
symmetry; it was not being honoured.

The separation now comes from `max(lonA, lonB) − min(lonA, lonB)`, which is
the same expression whichever way round the pair is passed.

This changes scoring at exact-boundary orbs, and the change is worth
naming rather than filing as float noise. Measured over 79 800 pairs: 3 908
pairs move in harmony or tension, two move by a whole integer score point,
one gains an aspect (a trine sitting exactly on `6° × 0.75`), and one has
its `strongest` aspect flip — which is the conversation starter a matched
pair receives. No figure in `docs/adr/0009-presentation.md`'s measured
block moves: the reference run is byte-identical before and after.

The new behaviour is the one this ADR always specified. The old one was
order-dependent, which meant that of the two values, at least one was
already wrong.
