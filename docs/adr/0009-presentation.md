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
measured first. 1500 charts were generated over the product's real
population — births 1991–2005, ages 20–35 in 2026, Turkish coordinates —
and all 1 124 250 pairs scored with ADR-0003's `compatibility()`:

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
0.41 % hit both gaps at once, against 0.05 %, 0.05 % and a single pair in
1 124 250 when all 51 pairings are eligible.

The measurement script is `packages/astro/scripts/score-distribution.ts`.
Its population is a sample, so the figures carry sampling error, and how much
depends entirely on what is calibrated. Rerun at seed 424242: the band cuts
of decision 3 are **identical** (56 / 62 / 67), every dimension cut moves by
at most 0.11, and the fill-rule shares move by at most 0.18. A displayed
number would not have been so lucky — the same rerun moves the 99th
percentile by 0.10 where the other quantiles move by 0.01, which is the tail
sensitivity decision 3 declines to maintain. The 400-chart first pass this
ADR was drafted from gave the same medians but a tail no calibration should
have rested on: a single chart supplied 14 of its 48 pairs above 86. That
last figure is history rather than a refreshable output — it was measured at
`CHARTS = 400` and under the birth range that pass used.

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
is folded into Growth: Pluto–Venus alone is present in only 36.51 % of pairs,
too rare to carry a standing section.

**Valence.** Emotional, Chemistry, Communication and Stability read
ADR-0003's signed terms. Growth reads `|term|`: a square to Uranus is signal
there, not deficit. This is the one place where tension counts as presence.

**Every dimension carries two sums, harmony and tension — never one signed
sum.** A signed sum yields `H − T` and destroys the split, and the split is
not recoverable afterwards: `{+3, −2}` and `{+1}` both sum to +1 but are
(3, 2) and (1, 0). This is the common case, not an edge — over the population
below, 98.88 % of pairs have at least one of the four signed dimensions
carrying both a harmony and a tension contribution. Growth carries a third figure, its absolute sum,
which is what its label reads; its harmony and tension sums exist so the five
dimensions still add back up to the whole.

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

Three labels per dimension, cut at the 33rd and 67th percentiles of **that
dimension's own** distribution — never at the overall score's. A dimension
reduces between three and seven terms on average through a mapping whose +10
damping was chosen for a whole-chart sum of twenty-odd, so its scores sit
lower and spread less.
Measured over the population above:

| Dimension     | median | cuts (p33 / p67) | terms per pair |
| ------------- | ------ | ---------------- | -------------- |
| Emotional     | 57.5   | 53.06 / 61.70    | 3.74           |
| Chemistry     | 56.9   | 52.57 / 60.96    | 5.19           |
| Communication | 52.6   | 49.71 / 55.45    | 2.80           |
| Stability     | 53.7   | 49.56 / 57.68    | 2.67           |
| Growth        | 66.4   | 64.19 / 68.42    | 7.14           |

Each dimension's cuts are taken over the pairs where that dimension is
actually present; an absent one shows no label and would otherwise drag its
own thresholds down.

Against the overall score's cuts (56 / 62 / 67) a median pair would read as
bottom-band on Communication and Stability — an artefact of the damping
meeting a short sum, not a signal. A dimension with no aspects renders as
absent rather than as a low label, and that holds even when an element bonus
gives it a value: the bonus is not an aspect, so there would be nothing on
screen to explain the label. A dimension is absent in 0.08 % (Growth) to
4.72 % (Stability) of pairs, and the bonus-only case inside that is 2.06 %
for Stability and 0.53 % for Emotional.

### 3. The overall score is a band, not a number

ADR-0003 is unchanged: `compatibility()` keeps returning the same raw score
and it stays the ranking key. It is never printed. What reaches a screen is
one of **four bands**, cut at the 25th, 50th and 75th percentiles of the
measured population — raw 56, 62 and 67 (owner decision, 2026-09-10). The
bands hold 24.47 / 24.59 / 22.12 / 28.82 % of pairs: the score is a discrete
integer with 3–5 % of the mass sitting exactly on each cut, so no choice of
cuts makes four equal bands.

Three reasons, in the order they weigh:

1. **A number becomes the hero.** Put a figure on the screen and everything
   under it reads as its justification; the aspect cards turn into evidence
   for a verdict. That is the direct opposite of _the chart is the hero_, and
   no amount of softened copy under the number undoes it.
2. **It would be a ranking of people.** Calibrated honestly, a displayed
   number can only mean "ahead of N % of pairs" — and the population it is
   calibrated against is not the one `discover` serves, which is already
   filtered by radius and gender. The error is unmeasurable until there are
   users.
3. **It costs more than it carries.** A displayed number needs a maintained
   reference distribution, regenerated on every change to ADR-0003's table
   and sampling-sensitive at exactly the top end people would care about.
   The calibrated surface is now three cut points plus two per dimension —
   thirteen numbers.

Near-equal frequency is deliberate: a four-way split that comes as close to
even as a discrete score allows is the most informative one available, and it keeps any
band from being rare enough to read as a verdict. The bottom band's copy is
descriptive, never deficient — it is where a quarter of all pairs live.

Comparability across cards, the one thing a number does well, is carried by
showing the band as a four-step visual next to its word, so cards can be
ranked at a glance without asserting that 85 and 86 are distinguishable.
Precision has to match confidence: four steps claims what the method can
support, two significant figures does not.

**If the cohort asks for a number**, the path is specified and not built:
calibrate on the _unrounded_ score (consecutive integers are a whole
percentile apart near the median, so an integer calibration leaves most
values unreachable and collapses the top end onto 100), store 101 quantile
breakpoints, display the largest `k` whose breakpoint is at or below the
pair's score — 0 when the score is below every breakpoint, which production
scores outside the sample's range can be — and clamp the result to 1–99. Turning it on is a day's work; turning it
off after users have seen it is not, which is why it starts off.

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
- The calibrated surface is thirteen numbers — three band cuts and two per
  dimension — valid only for the population they were generated over and
  regenerated whenever ADR-0003's weights change. Small enough to read in a
  diff, which a 101-entry breakpoint array is not.
- Nothing on screen distinguishes two pairs in the same band. Sorting still
  uses the raw score, so the order is finer than the display; a user who
  compares two cards in the same band sees no reason for their order.
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
  blocks the dimension UI.
- Assigning the element bonus to Stability and Emotional makes those two
  dimensions carry a term that is not an aspect, so neither can be explained
  on screen purely by naming its aspects.
