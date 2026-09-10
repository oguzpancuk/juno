# ADR-0009: Dimensions, score presentation and weighted ranking

Status: accepted · Date: 2026-09-10

## Context

The owner's product system of 2026-09-10 ("Juno — Astrology / Compatibility
Product System", recorded in `docs/NOTES.md`) sets two rules that the shipped
screens do not follow: _the chart is the hero, the photo is the context_ and
_show the calculation, soften the conclusion_. It asks for five internal
compatibility dimensions, qualitative labels instead of per-dimension
numbers, a match page split into "why you're drawn to each other" and "where
it gets interesting", and a compatibility engine designed so a viewer's own
priorities can weight discovery ranking later.

Three of those decisions turn on facts nobody had measured, so they were
measured first. 400 charts were generated over the product's real
population — births 1991–2006 (ages 20–35 in 2026) at Turkish coordinates —
and all 79 800 pairs scored with ADR-0003's `compatibility()`:

```
score:  min 14 · p25 55 · median 62 · p75 68 · p95 75 · p99 80 · max 91
        ≥70: 18.25 %  ≥80: 1.31 %  ≥86: 0.06 %
aspects per pair: 21.6 over all 51 pairings, 7.5 over the curated 17
```

Two consequences follow. First, ADR-0003's score is not a percentage: the
median pair scores 62, and the 86 in the owner's mockups occurs in six pairs
in ten thousand. Printed with a `%` sign it reads as a school mark, and an
average pair is told it scored 62 out of 100. Second, the curated pairing
list is too thin to fill the match page on its own — 17.07 % of pairs cannot
produce three positive aspects from it and 4.88 % produce no tension at all,
against 0.06 % and 0.08 % when all 51 pairings are eligible (never both at
once).

The measurement script is `packages/astro/scripts/score-distribution.ts`.

## Decision

### 1. Five dimensions, one mapping table

Every one of ADR-0003's 51 scored pairings belongs to exactly one dimension.
The table is the single source of truth and does four jobs: it produces the
dimension scores, names the aspect cards, splits the match page into its two
sections, and decides which aspects are eligible for the primary view.

| Dimension         | Pairings                                                                                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Emotional**     | moon–moon, moon–sun, moon–mercury, moon–venus, moon–mars, moon–ascendant, moon–jupiter, moon–neptune                                                                              |
| **Chemistry**     | venus–mars, venus–venus, mars–mars, venus–ascendant, mars–ascendant, sun–venus, sun–mars, sun–ascendant, ascendant–ascendant, venus–jupiter, mars–jupiter, ascendant–jupiter      |
| **Communication** | mercury–mercury, mercury–sun, mercury–venus, mercury–mars, mercury–ascendant, mercury–jupiter                                                                                     |
| **Stability**     | saturn–sun, saturn–moon, saturn–mercury, saturn–venus, saturn–mars, saturn–ascendant, sun–sun                                                                                     |
| **Growth**        | sun–jupiter, moon–uranus, moon–pluto, uranus–{sun, mercury, venus, mars, ascendant}, neptune–{sun, mercury, venus, mars, ascendant}, pluto–{sun, mercury, venus, mars, ascendant} |

moon–mercury is Emotional, not Communication; the Moon rules the row it
appears in. Counts: 8 + 12 + 6 + 7 + 18 = 51, asserted by a test rather than
trusted to this table being read correctly. The owner's "Intensity" category
is folded into Growth: Pluto–Venus alone is present in only 36.8 % of pairs,
too rare to carry a standing section.

**Valence.** Emotional, Chemistry, Communication and Stability sum ADR-0003's
signed terms. Growth sums `|term|`: a square to Uranus is signal there, not
deficit. This is the one place where tension counts as presence.

### 2. Dimensions are labels, never numbers

Each dimension's aspects are reduced by ADR-0003's own mapping
(`50 + 50 × (H − T) / (H + T + 10)`) over that dimension's terms only, and
the result is shown as a qualitative label — never as 0–100. Five named
axes with numbers read as a psychometric assessment of a person the user has
not met, and the underlying method does not support that claim.

Label thresholds are percentiles of the same reference distribution as the
overall score (decision 3), not hand-picked cut-offs. A dimension with no
aspects at all renders as absent, not as a low score.

### 3. The overall score is shown calibrated, or not at all

ADR-0003 is unchanged: `compatibility()` keeps returning the same raw score,
and it stays the ranking key. What changes is presentation.

A raw score is mapped through a committed reference distribution to a
percentile before any number reaches a screen, so a displayed 86 means "ahead
of 86 % of pairs" — a rank, which the method can support — rather than a
share of some notional maximum, which it cannot. The reference distribution
is generated by `scripts/score-distribution.ts` over the population above and
committed as a fixture; regenerating it is part of any change to ADR-0003's
table, and a test asserts the mapping is monotonic and covers 0–100.

Every screen also carries a band label ("Manyetik ve sağlam"), and the label,
not the number, is the primary element. Dropping the number entirely stays an
open owner option; nothing downstream depends on it being displayed.

### 4. Symmetry survives weighted ranking

ADR-0003 guarantees `compatibility(a, b) === compatibility(b, a)`, and a test
asserts it. A viewer's own dimension priorities (a future feature, PRD §12 of
the owner's system) would break that the moment they touched the score.

Rule: the displayed score and every displayed label come from the symmetric
base. Viewer weights may only reorder `discover` — they are an `ORDER BY`
input, never a displayed value. The engine therefore returns per-dimension
raw sums alongside the overall score so a weighted ordering can be computed
without recomputing anything, and the symmetry test stays valid.

### 5. Match-page sections fill from the curated list, then widen

"Why you're drawn to each other" wants three positive aspects and "where it
gets interesting" one tense aspect. Both draw first from the owner's curated
17 pairings, ranked by `|term|`; when a section cannot be filled, the
remaining 51 − 17 pairings become eligible, ranked the same way. The
measurement above is what makes this a two-step rule rather than a special
case: the curated list alone leaves a gap in roughly one pair in six.

A section that is still empty is omitted with its heading, not filled with a
verdict. `bands.json`'s low-band sentence ("sürdürmek emek ister") is retired
by rule 13 of the owner's copy philosophy — no text passes judgement on a
pairing.

## Consequences

- One table drives scoring, card titles, section split and eligibility; a
  change to it moves all four together, which is the point, and every
  fixture flags the change.
- Card titles collapse from 255 (one per key) to ~30, derived from
  (dimension × valence × variant). The 255 existing interpretations stay as
  the card bodies.
- The reference distribution is a new committed artefact with a real
  maintenance cost: it is only valid for the population it was generated
  over, and it must be regenerated whenever ADR-0003's weights change.
- Showing the orb on screen (`♀ △ ♂ · 0°48′`) moves ADR-0004's accepted
  error from an internal tolerance to something a user can check against
  astro.com. The tolerance is unchanged and invisible at this precision;
  the two known boundary cases — a planet within arcseconds of a sign cusp,
  and a retrograde flag within minutes of a station — become user-visible
  disagreements. Accepted, and noted in ADR-0004.
- Growth's `|term|` rule means a pair can score high on Growth entirely
  through hard aspects. That is intended, and it is why the label vocabulary
  for that dimension must not read as praise.
- Per-dimension labels need their own thresholds, so the calibration item
  blocks the dimension UI, not just the overall number.
