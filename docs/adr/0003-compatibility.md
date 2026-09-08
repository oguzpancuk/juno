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
