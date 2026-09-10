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
population — 1500 charts, births 1991–2005 (ages 20–35 in 2026) at Turkish
coordinates — and all 1 124 250 pairs scored with ADR-0003's
`compatibility()`:

```
score:  min 16 · p25 56 · median 62 · p75 67 · p95 75 · p99 80 · max 93
        ≥70: 17.86 %  ≥80: 1.16 %  ≥86: 0.05 %
aspects per pair: 21.54 over all 51 pairings, 7.47 over the curated 17
Pluto–Venus present in 36.51 % of pairs
```

Two consequences follow. First, ADR-0003's score is not a percentage: the
median pair scores 62, and the 86 in the owner's mockups occurs in five pairs
in ten thousand. Printed with a `%` sign it reads as a school mark, and an
average pair is told it scored 62 out of 100. Second, the curated pairing
list is too thin to fill the match page on its own — 16.03 % of pairs cannot
produce three positive aspects from it, 4.48 % produce no tension at all and
0.41 % hit both gaps at once, against 0.05 %, 0.05 % and none when all 51
pairings are eligible.

The measurement script is `packages/astro/scripts/score-distribution.ts`.
Its population is a sample, so the figures carry sampling error: rerun under
a second seed the median holds at 62, the quantile breakpoints of decision 3
move by less than 0.1 of a point at p50, p86 and p99, and the fill-rule
shares move by less than 0.2 of a point. The 400-chart first pass this ADR
was drafted from gave the same medians but a tail too thin to calibrate
against — a single chart supplied a seventh of its pairs above 86.

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
deficit. This is the one place where tension counts as presence, and it is
why Growth also keeps its signed sum — without it the five dimensions could
not add back up to the whole.

**The element bonus belongs to a dimension too.** ADR-0003 adds +2 to harmony
when the two Suns agree by element and again for the two Moons, outside any
aspect and therefore outside any pairing. The Sun bonus is counted into
Stability and the Moon bonus into Emotional, matching where sun–sun and
moon–moon already sit. Without this the dimension sums cannot reconstruct
the overall harmony total, which they must for a weighted ordering
(decision 4) to be a reweighting of the same quantity rather than a
different one.

### 2. Dimensions are labels, never numbers

Each dimension's aspects are reduced by ADR-0003's own mapping
(`50 + 50 × (H − T) / (H + T + 10)`) over that dimension's terms only, and
the result is shown as a qualitative label — never as 0–100. Five named
axes with numbers read as a psychometric assessment of a person the user has
not met, and the underlying method does not support that claim.

Each dimension gets **its own** breakpoints, measured over the same
population but never borrowed from the overall score's. A dimension reduces
one to four terms through a mapping whose +10 damping was chosen for a
whole-chart sum of twenty-odd, so its scores sit far lower: over the
population above, the median pair's Stability is 50.0 and its Communication 52.3
— measured over the same population, which places them near the 10th and
15th percentiles of the overall score. A
median pair labelled "weak" on four axes out of five would be an artefact of
the damping, not a signal. A dimension with no aspects at all renders as
absent, not as a low score.

### 3. The overall score is shown calibrated, or not at all

ADR-0003 is unchanged: `compatibility()` keeps returning the same raw score,
and it stays the ranking key. What changes is presentation.

A score is mapped through a committed reference distribution to a percentile
before any number reaches a screen, so a displayed 86 means "ahead of 86 % of
pairs" — a rank, which the method can support — rather than a share of some
notional maximum, which it cannot.

The fixture is an array of 101 quantile breakpoints, and the displayed value
is the largest `k` whose breakpoint is at or below the pair's score. Two
details are load-bearing. It calibrates on the **unrounded** score, not the
integer `compatibility()` returns: consecutive integers are whole percentiles
apart near the median, so calibrating on them would leave most displayable
numbers unreachable — 86 among them — and collapse the whole top end onto 100. And the displayed value is clamped to 1–99, because no pair is ahead of
every pair and none is ahead of none.

The fixture is generated by `scripts/score-distribution.ts` over the
population above; regenerating it is part of any change to ADR-0003's table.
Each of the five dimensions carries its own breakpoint array, generated the
same way.

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
verdict. `bands.json`'s `very-low` sentence ("Haritalarınız birbirini
zorluyor … sürdürmek emek ister") and its `low` sentence ("Ortalama altı bir
uyum … sürtüşme de belirgin") are both retired by the amendment's copy rules
— no text passes judgement on a pairing, and between them those two bands
cover roughly a fifth of pairs.

## Consequences

- One table drives scoring, card titles, section split and eligibility; a
  change to it moves all four together, which is the point, and every
  fixture flags the change.
- Card titles collapse from 255 (one per key) to ~30, derived from
  (dimension × valence × variant). The 255 existing interpretations stay as
  the card bodies.
- The reference distribution is a new committed artefact with a real
  maintenance cost: six breakpoint arrays (the overall score and five
  dimensions), valid only for the population they were generated over, all
  regenerated whenever ADR-0003's weights change.
- Calibrating on the unrounded score means the display path needs harmony and
  tension, not just `score`. `compatibility()` already returns both.
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
- Assigning the element bonus to Stability and Emotional makes those two
  dimensions carry a term that is not an aspect, so neither can be explained
  on screen purely by naming its aspects.
