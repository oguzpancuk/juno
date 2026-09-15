# Working notes — append-only, dated

<!-- The session-to-session memory. Every work session appends: what was
     done, what was verified (and how), what is open. Newest at top.
     Never rewrite old entries — this file is the audit trail. -->

## Upstream candidates

<!-- Improvements made HERE to template-origin files (.claude/, contracts/,
     CLAUDE.md) that maya should inherit. /update-stack harvests this list.
     Format: date · file · one-line what/why. Remove entries once upstreamed. -->

- 2026-09-11 · `contracts/init.sh` · Metro is started with `CI=1`, which
  disables file watching. Any screen edited after `init.sh` runs never
  reaches the bundle, and the symptom is silent: the section simply does
  not render, with no error in Metro, in the app, or in the battery. It
  cost most of an hour tonight before the cause was found. The comment in
  the script explains why `--clear` is there but not what `CI=1` gives up.
  Either drop `CI=1` and keep `--clear`, or say in the echoed output that
  the server does not watch. Parked, not applied: no owner decision, and
  `contracts/` is template-origin.

- 2026-09-10 · `.claude/hooks/verify.sh` + `.claude/hooks/docs-figures.sh` ·
  A docs-consistency step, applied here on the owner's say-so and awaiting
  `/update-stack` for maya. Six code-review rounds went almost entirely to
  one defect: a measured number restated in a second sentence, corrected in
  the first, silently false in the second. The gate is not a phrase
  blacklist — it reads the fenced "Measured figures" block out of the
  product's own ADR, takes every distinctive number in it (decimals, grouped
  thousands) and fails if any appears elsewhere under `docs/`, exempting the
  append-only NOTES and any file stale by declaration. It is generic: the
  block's location is the only product-specific line, so the template can
  carry it with that as a variable. It found three surviving copies on its
  first run, after six human-style review rounds had passed the same files.

## 2026-09-11 — Pushed, and one more count of my own

- The branch is on `origin/main`: `86635ad..717000e`, 28 commits, under the
  owner's approval of 2026-09-10 ("publish the work to date"). CI green on
  the pushed commit — run 34514122573, 4m36s, the same `verify.sh` the
  local battery runs. The remote is private; nothing became public.
- **Correction to the entry above**, in a new one because that is the rule
  it just finished restating: it says "the eighteen screenshots" and there
  are **37** tracked PNGs under `screenshots/`. The claim the number was
  supporting still holds — seed names, flat-colour placeholders, no face
  and no account identifier in any of them — but the count was invented.
  Three entries in a row have now had to correct a figure I wrote from
  memory instead of counting. The pattern is worth naming: every number
  in these notes should come from a command, and when it does not, it has
  been wrong about a third of the time.
- **A contrast case left as-is, recorded rather than fixed:** `buttonBusy`
  is `opacity: 0.55` on the whole `Pressable`, so a dimmed button's
  `onBright` label composites to 3.03:1 against its own dimmed fill,
  against 7.68:1 at full opacity. It clears the 3:1 floor and misses 4.5:1
  at 17 pt. Pre-existing on every button in the app and outside the scope
  of the commit that found it; a disabled control is also the one place
  WCAG exempts. Worth a decision, not a reflex.
- Left for the owner, none of them defects: the repo has no README and no
  LICENSE at its root; `app.json` sets `userInterfaceStyle: "automatic"`
  on an app with one fixed dark palette, so a light-mode device gets light
  keyboards and native alerts against the dark composer; and all 148
  commits are authored from a machine-name address, which a later change
  cannot remove from the history already pushed.
- **The night's gap, stated plainly:** two of the seven review rounds found
  defects that no test could have caught, because there is no test that
  renders a screen — the match screen carrying state across an identity
  change, and the discover card clipping its own like and pass buttons.
  Both were found by a person reading code and looking at screenshots.
  Before TestFlight, the battery needs something that mounts a screen.
- Next session: the startup `TypeError`, a rendering test, and TestFlight
  itself — which needs the owner for the Apple account, the privacy-policy
  URL and the EAS project.

## 2026-09-11 — The last gate, and three of my own claims

- A publication-gate review of the whole branch. Nothing unsafe: no key,
  token or service-role string anywhere in the tree, the only tracked env
  file is the example with a literal placeholder, no local path or address
  in any diff, and the eighteen screenshots carry seed data and flat-colour
  placeholders — no real face, no account identifier. The battery is green
  on the clean commit with the Supabase stack actually up, so the RLS and
  Edge suites ran rather than silently passing.
- **Three things HEAD said about itself were wrong, and each took one
  command to falsify.**
  - The disabled send label went in at `textFaint` on the dark fill:
    **2.76:1**, under the 3:1 floor this same file had declared two
    commits earlier as the reason four other colours were changed. It is
    `textMuted` now — 5.19:1, still visibly dimmer than the enabled state.
  - "281 tests" was `packages/astro` alone, written next to the battery
    command. The battery runs four workspaces: 54 + 281 + 36 + 119 =
    **490**. The docs gate cannot catch this — the figure is not in
    ADR-0009's block — so it is caught by reading, or not at all.
  - The entry saying the chat send button "takes `color.onBright` now" was
    left standing after the button gained a second colour, and
    `screenshots/design-chat.png` still shows the state before either
    change, listed as evidence without the caveat `design-discover.png`
    got. Both corrected here rather than in place.
- Smaller: the sign-in verify button was disabled on two conditions and
  dimmed on one, so five typed digits left it looking tappable.
- **A process note against myself.** The previous commit edited a dated
  NOTES entry in place to correct "three titles" to "four". The outcome
  was right and the file's own header forbids the mechanism: _never
  rewrite old entries — this file is the audit trail_. A correction
  belongs in a new entry, as this one is. Same-day and factual is still a
  rewrite.
- Also recorded rather than fixed, because they are outside this branch's
  scope: `app.json` sets `userInterfaceStyle: "automatic"` on an app with
  one fixed dark palette, so a light-mode device gets light keyboards and
  alerts against the dark composer; the repo has no README and no LICENSE
  at its root; and every commit in this repository's history is authored
  from a machine-name address, which is worth changing before the project
  is shown to anyone.
- Verified: `bash .claude/hooks/verify.sh` green, five steps, 490 tests
  across four workspaces.

## 2026-09-11 — A card that could clip its own buttons

- The review of the redesign found a regression I had introduced, and it
  was the kind a screenshot cannot show: the discover card became
  `flex: 1` with `overflow: 'hidden'` inside a screen that does not
  scroll. On iOS that sets `clipsToBounds`, so anything past the card's
  bottom edge is neither drawn nor hit-tested. Collapsed, on this device,
  the content cleared the edge by about 75 points. One tap on "Uyum
  detayı" adds four hundred, and the like and pass buttons went out of
  reach with no way back except the toggle that was itself sliding off.
  A three-line bio ate the slack on its own, and on a smaller phone the
  buttons were gone before the user touched anything. The screen scrolls
  now and only the photo clips, for the card's top corners. Verified on
  the simulator with the detail fully open:
  `screenshots/design-discover-detail.png`.
- **Two "done" claims were false and are corrected.** "Nothing outside
  the token file holds a hex value" — two survived the migration, an
  `ActivityIndicator` colour and a hand-spelled `rgba` of the background;
  both are tokens now (`color.track`, `color.scrim`) and the claim is
  true. And the screenshot inventory said ten of eleven screens while
  sign-in, the most-redesigned screen of the four, had none. It has one.
- **Contrast:** `#7c6cff` became the lighter `color.cool`, and four places
  kept near-white text on it — the gender and radius chips, the unread
  badge, the chat send button. Measured 2.47:1, below the 3:1 floor even
  for large text, and the badge is 12 pt. They take `color.onBright` now,
  which is what its docstring was for.
- **The shared component set shipped six components nothing imported**,
  including a `BandRing` that divided by a caller-supplied `steps` with no
  guard. They are gone; `components/ui.tsx` is now what the screens
  actually use.
- Smaller, all from the same review: a block or report resolving after the
  key swap now checks it is still mounted before navigating or showing a
  confirmation; a non-string route param starts in the error state instead
  of spinning for ever; `expo-linear-gradient` was declared in the
  workspace root as well as the app; the overlay grouping carries its house
  and direction instead of parsing them back out of a string key, and the
  unreachable third sort criterion is gone; the sign-in button dims when it
  is disabled; the discover nav row can shrink.
- **`matchSections`' second parameter has a test now.** It closed a real
  collision — four titles are byte-identical to dimension labels — and had
  none. The test states the honest contract: a title already on the screen
  is stepped off when a free variant exists, and the section keeps its
  cards when the bucket is exhausted.
- **A tooling note for the next session that drives the simulator.** Taps
  through the simulator MCP landed unreliably in the lower part of the
  screen: the discover Like and Pass buttons never fired, and neither did
  the sign-in "Doğrula" on a second attempt at a different y. Taps in the
  upper two-thirds worked every time. It cost the same twenty minutes
  twice — first when a mutual like had to be completed in the database
  instead, then when onboarding could not be reached, which is why that
  screen is still the one without a photograph. Whatever the cause, it is
  the environment and not the app: the same buttons work under a finger.
- Verified: `bash .claude/hooks/verify.sh` green, five steps, 281 tests.

## 2026-09-11 — The design, and what of it could not be built

- The owner brought a finished visual design and asked for the UI to
  become it. Applied: `apps/mobile/theme/tokens.ts` is now the only file
  in the app holding a colour, `components/ui.tsx` is the shared set, and
  every screen draws from both. `expo-linear-gradient` is the one new
  dependency; the brand mark is drawn in views rather than pulling in an
  SVG runtime.
- **Three things in the mockups were not built, each for a reason older
  than the mockups.** They carry a compatibility percentage on most
  screens (`86%`, `92%`), five numeric dimension scores
  (`Emotional 92 · Chemistry 95 · Communication 68`), and a Juno-asteroid
  feature (`Juno Taurus 26°`, `Juno △ Venus`). The first two were removed
  by the owner's own decision the night before — the raw score is not a
  percentage, the median pair takes 62 — and the owner reaffirmed the band
  when asked. The third the engine cannot compute: `astronomy-engine` has
  no asteroids (ADR-0004). Drawing a Juno placement would have been
  inventing data. The mockups appear to predate the 2026-09-10 decision:
  both the percentage and the "Juno signature" come from the owner's first
  product document.
- The English copy in the mockups was replaced with the strings that
  already exist. The PRD's single-market decision stands and 800-odd
  Turkish texts depend on it.
- **The review of the previous three commits found a safety bug**, and it
  is the most important thing in this entry: the match screen kept every
  piece of state across a change of match id. The root layout navigates to
  `/match/[id]` when a match arrives over Realtime, and navigating to a
  route you are already on swaps the params without remounting — so an open
  "Engelle" confirmation survived the swap, and its next tap would have
  blocked whoever had just arrived. The view is keyed by id now. Nothing
  in the battery would have caught this; there is no test that renders a
  screen.
- Other findings closed in the same commit: overlay cards collided on 83 %
  of pairs (grouped by house and ranked now), four card titles matched a
  dimension chip on the same screen, the disclosed planet list repeated the
  six lead cards verbatim, a stray heading over an empty dimension row on
  two screens, a local re-declaration of `BANDS` that a reorder would have
  broken silently, and a lost own-profile fetch that removed the whole
  compatibility block without saying so.
- **Open, and worth a session of its own:** the app logs
  `TypeError: Cannot convert undefined value to object` twice at startup,
  before any navigation. It predates tonight as far as I can tell, no
  screen is affected, and I did not chase it — bisecting it would have meant
  stashing the night's work. It should be found before TestFlight.
- The screens that took the palette mechanically kept their old layouts,
  and all but onboarding were checked on the simulator: matches, settings,
  profile, chat, legal and blocked are consistent, with the radius chips,
  the delete-account line and the legal document all reading correctly on
  the new palette. Onboarding needs a signed-out account and was left.
- Verified: `bash .claude/hooks/verify.sh` green, five steps; the four
  redesigned screens driven on the simulator against the local stack.

## 2026-09-11 — C2 through C6, and the app the owner asked for by morning

- Owner approved the parked upstream candidate, a publication of the work
  to date, and asked for the app to be feature-complete by morning with
  only the visual design left. Five ROADMAP items landed overnight, each
  with its own commit and its own tests.
- **C6 — per-dimension sums.** `compatibility()` returns a harmony sum and
  a tension sum per dimension plus Growth's absolute sum, so a viewer
  weighting can reorder `discover` without touching a displayed value. Two
  symmetry defects surfaced while testing it, both invisible until now
  because the score rounds to an integer: terms accumulated in traversal
  order, and `separation` computed from `lonB − lonA`, which normalises
  asymmetrically. The second was the real one and it changed scoring at
  exact-boundary orbs — recorded as ADR-0003 amendment 3, not filed as
  float noise.
- **C3 — bands and labels.** No score is printed. Four bands from the
  committed calibration, three labels per dimension from that dimension's
  own cuts. `bands.json` went from five entries to four and lost both
  judging texts. One clause is not met and says so in the ROADMAP: the
  population generator is still duplicated between the script and the test.
- **C4 — the two match sections.** Curated pairings first, widened when
  short, an empty section omitted rather than padded. The curated list
  moved into `dimensions.ts`, so the engine and the script read one copy —
  the duplication class that cost this work six review rounds.
- **C2 — the three screens.** The chart screen leads with six
  product-language cards and hides the rest behind "Tüm haritanı gör"; the
  discover card shows a band word beside a four-step meter; the match
  screen is band, summary, dimension chips, "Neden birbirinize
  çekiliyorsunuz" and "Burası ilginç". Thirty card titles by (dimension ×
  valence × variant), picked by a stable hash so a pair reads the same
  every visit, and stepped on when a title is already on the screen — two
  cards both reading "Anlaşılan taraf" is what made that necessary.
- **C5 — house overlays.** Sixty texts, both directions, six houses. The
  card's title is the house's dating meaning, because the text already
  opens by naming the placement and a title repeating it read as a bug.
- **Verified on the simulator**, signed in as a real tester against the
  local stack, matched with a seed: `screenshots/c2-chart.png`,
  `c2-chart-full.png`, `c2-discover.png`, `c2-match.png`,
  `c2-match-sections.png`, `c5-overlays.png`.
- **Two environment notes worth keeping.** Expo Go was not installed on the
  simulator; `xcrun simctl install booted ~/.expo/ios-simulator-app-cache/
Expo-Go-*.tar.app` uses the cached build without a download. And
  `contracts/init.sh` starts Metro with `CI=1`, which disables file
  watching — a screen edited after that start never reaches the bundle, and
  the symptom is a section that simply does not render with no error
  anywhere. Restarting Metro without `CI=1` fixed it; the contract should
  probably say so.
- **Two off-center taps never registered** in the simulator (the Like and
  Pass buttons), so the mutual like was completed in the database instead.
  The like path itself is covered by tests; what the screenshots evidence
  is the rendering.
- Verified: `bash .claude/hooks/verify.sh` green, five steps, on each
  commit. 277 tests.
- Next: the visual design item, which is now the only thing between this
  and a TestFlight build. `docs/design-brief.md` must be regenerated first
  — it carries a warning saying so.

## 2026-09-11 — What the gate could not see

- The review of the gate commit found its own headline claim false: the
  tokeniser took decimals and grouped thousands only, so every integer in
  the figures block was unguarded, and "the median pair scores 62" was
  sitting in three documents. Confirmed by the reviewer against a snapshot:
  pasting a copy of that sentence passed the step, exit 0.
- The gate now also takes integers of three digits or more (73 tokens, up
  from 57), which caught `1500` and the second seed restated in the ADR's
  own prose. Two-digit figures stay outside it by decision, not oversight —
  16, 30, 56, 62, 67 and 93 collide with ordinary prose — and both the
  block's maintenance comment and the upstream-candidate entry now say so
  rather than claiming coverage the check does not have.
- The three "median 62" copies are gone: the prose says "the low sixties"
  and "a low D". The one-in-1700 rate was a hand-derived aggregate no
  artefact printed; the script prints it now and the block carries it.
- **C4's 300-chart sample is reproducible again.** `CHARTS` was a constant
  with no override, so the 0 / 14 / 13 figures could only be obtained by
  re-implementing the generator. `--charts=300` reproduces them exactly, and
  the ROADMAP names the command.
- Smaller, from the same review: the gate blanks the block's lines instead
  of splicing them, so reported line numbers in that file are true (they
  were off by the block's height); it refuses to run without `python3`,
  which is the battery's first non-Node dependency and is now in CLAUDE.md's
  command table; the `// why:` in `dimensions.ts` sits on the cast it
  explains.
- **Owner approval, recorded here because a commit message is not the
  approval record:** on 2026-09-10 the owner approved applying the parked
  upstream candidate and publishing the work to date to the remote, and
  asked for the app to be feature-complete by morning with only the visual
  design left. That is the authority under which `a36c61e` landed and under
  which this branch goes to the remote. Later publications are not covered
  by it and are asked for again.
- Verified: `bash .claude/hooks/verify.sh` green, five steps; the gate
  mutation-checked in both directions; `--charts=300` rerun.

## 2026-09-10 — A gate that reads the ADR instead of a blacklist

- Owner approved the parked upstream candidate and a push. The candidate is
  applied: `verify.sh` gained a `docs` step backed by
  `.claude/hooks/docs-figures.sh`.
- It enforces the property the last six rounds were really about — measured
  figures are cited, not copied — by deriving its watch list from the ADR's
  own figures block rather than from a hand-maintained list of forbidden
  phrases. Adding a figure to the block extends the gate with no list to
  update. **What it does not cover:** two-digit integers. The block holds
  16, 18, 30, 56, 62, 67, 75, 80 and 93, and gating on those would fire on
  ordinary prose, so they are guarded by review alone — the block's own
  maintenance comment says so. Decimals, grouped thousands and integers of
  three digits or more are covered: 66 tokens at the time of writing, and
  the plain integers are taken from what is left after the compound forms
  are cut out, so a decimal never shreds into a spurious token.
- On its first run it failed, naming three copies that six review rounds had
  read past: `0.05 %` restated in the PRD, `1 124 250` in the ADR's own
  prose above the block, and the sensitivity movements (0.01 / 0.05 / 0.10,
  0.11, 0.18, and the seed-to-seed count swings) which were themselves
  measurements living only in prose. The movements are now part of the
  block — a second half showing what a rerun under another seed moves — and
  the prose cites them qualitatively.
- Mutation-checked: pasting `24.47` into `docs/PRD.md` fails the step with
  the file, line and token; removing it restores green.
- Verified: `bash .claude/hooks/verify.sh` green on the clean commit, now
  five steps.

## 2026-09-10 — A result I did not observe, and the last of the copies

- Sixth review, on the consolidation. It confirmed every line of the figures
  block against the script and cleared the sensitivity paragraph, the
  argument guards and the `term >= 0` change (byte-identical output; the
  zero-term aspects are real — thirteen in a 300-chart sample — but none
  crosses a counter). Two things were mine to own.
- **I wrote a measured result I had not measured.** The previous entry and
  ROADMAP C4 said a 300-chart sample at the committed seed "contains no pair
  with an empty section at all". I had generalised from one column of a
  table the reviewer produced — the no-positive branch is zero there — to
  both branches. Measured now: **0** pairs without a positive aspect,
  **14** without a tense one, 13 short of three, over 44 850 pairs. The
  decision (hand-built pairs per branch) stands; its stated justification
  was false and is corrected in C4. The rule broken is the one this
  constitution puts first — never state a result you did not observe — and
  the way it broke is worth naming: a reviewer's table read as my own
  measurement.
- **The consolidation was not complete.** The previous entry claimed no
  derived number lived in two places; four still did outside the block
  (Pluto–Venus 36.51, the two-signs 98.88, the "2.67 and 7.14" term range,
  the 56 / 62 / 67 cuts twice) and `616` was in the block twice for one
  counter. The nested-count parenthetical also read as if one of the thirty
  zero-positive pairs had no tension either, contradicting "neither 0" two
  lines down. All replaced with citations; the 525 now partition explicitly
  as 30 + 1 + 494. Two prose figures the script did not print (mass on the
  cuts, share below raw 55) are printed now and sit in the block. The block
  has a visible label, so citations from the ROADMAP resolve for someone
  reading rendered markdown.
- **Freeze was one level short.** `PAIRINGS` froze the record and the
  arrays but shared the tuples with `RAW_PAIRINGS`, so a cast could still
  rewrite a pair in place and desync the table from `BY_KEY`. Each tuple is
  now frozen too; the test asserts all three levels. Under tsx the mutation
  fails silently rather than throwing, but it no longer changes anything.
- Also: C3 asked the battery to byte-compare the committed table against
  script output "cheaply", which is impossible without regenerating the
  population — it is a manual rerun-and-diff now; the orphaned "Measured
  over the population above:" colon from the deleted §2 table is gone; a
  `// why:` on the one cast in `dimensions.ts`; and a consistency note for
  C4 that `strongestOf` still searches with `term > 0`.
- Verified: `bash .claude/hooks/verify.sh` green on the clean commit; the
  script rerun; the tuple mutation probed at runtime. **This commit has not
  been reviewed** — the session stops here by the owner's stopping
  condition, and the push gate will refuse it until code-reviewer covers it.
- Next: C3 and the rest of C2, after a review of this commit.

## 2026-09-10 — Stop copying numbers into prose

- Fifth review, and it found the previous round's own headline fix carrying
  the same defect it had diagnosed: C4 said "525 fall short of three cards
  **without any section being empty**", but the three counters are nested,
  not disjoint. All 30 zero-positive pairs are inside the 525, and one more
  of them has no tension, so the short-but-nothing-empty count is **494**.
  Three rounds in a row lost to a figure restated in a second sentence and
  left behind when the first was corrected.
- **So the copies are gone.** ADR-0009's Context now holds a single fenced
  "measured figures" block — every count, cut, share and per-dimension row in
  one place, refreshed as a whole from one run of the script. §2, §3 and §5
  cite it instead of repeating it; the per-dimension table in §2 is deleted;
  ROADMAP C3, C4 and C6 point at it rather than restating shares or
  percentages. There is now no derived number in this repo's docs that exists
  in two places, which is the only version of this fix that holds.
- **C4's done-when could not fire.** It asked a bounded sample to prove the
  omit branch; at the committed seed a 300-chart sample contains **zero**
  pairs with an empty section (44 850 pairs), so the assertion was either
  vacuous or a coin flip across seeds. It is now hand-built pairs for each
  branch, with the population figures cited from the ADR rather than
  regenerated in the battery.
- **The fill-rule counts are not constants.** Between the two seeds "no
  positive at all" moves 30 → 18, "no tension" 616 → 785 and "short of three"
  525 → 386 — they live in the tail. The ADR's sensitivity paragraph promised
  "shares move by at most 0.18", which is true of the shares and not of these
  counts; it now says so, and decision 5 only needs them small and non-zero.
- **`-seed=5` still ran silently at the default seed**, one keystroke from
  the form fixed last round, and wrote a file named `-seed=5` into the repo
  root. Anything starting with a dash is now an option; a second `--seed=`
  is refused rather than the first quietly winning. Verified: the one-dash
  form, the space form, two flags, two positionals, zero, negative,
  fractional and non-numeric seeds all throw with the reason.
- **ADR-0003 carried a live presentation requirement** — "the UI labels it
  'uyum'" — with no pointer to ADR-0009, and it is the ADR someone reads to
  find out what the score means on screen. Amendment 2 records that the
  engine contract is untouched and the number is not displayed.
- **`docs/design-brief.md` was the most dangerous file in the repo**: 282
  lines instructing a design tool to build a ten-row chart screen, a large
  "78 uyum" number and a single-strongest-aspect match screen, with nothing
  saying it was stale. It now opens with a warning naming all three; the
  ROADMAP note about it named only two.
- Smaller: `PAIRINGS` is frozen, since exporting it made a runtime desync
  from the lookups reachable with one cast; aspects with a term of exactly 0
  (an aspect sitting on its maximum orb) now count as cards, matching how
  `compatibility()` buckets them; "between two and a half and seven terms"
  disagreed with its own table at the top end (Growth 7.14); the omit-branch
  rate is one in ~1 700, not ~1 800.
- Verified: `bash .claude/hooks/verify.sh` green on the clean commit; both
  seeds rerun; every argument guard exercised; the docs swept for surviving
  "0–100" and "uyum" claims — the remaining ones are engine-internal, the
  superseded ADR-0003 line directly above its amendment, or inside the
  design brief under its warning.
- Next: C3 and the rest of C2.

## 2026-09-10 — The same defect, one screen over

- Fourth review. It confirmed the pin test bites (three cross-dimension
  swaps, an unscored pairing, a dropped pairing and a broken key order all
  fail it; reordering within a dimension and flipping a tuple survive, which
  is correct — both are no-ops through `pairingKey`). Then it found the
  round's own headline fix had been applied in one place only.
- **The PRD still required the number, in interaction 4's works-when
  clause.** The previous round rewrote the amendment's presentation
  paragraph and left "the card shows a compatibility score (0–100)" in the
  numbered acceptance criteria — which is the part of that file an
  implementer actually builds against. Interactions 2 and 5 had drifted the
  same way. All three clauses are now rewritten to the amendment, each
  marked with what it used to say, so the acceptance criteria and the
  amendment cannot disagree again.
- **C4 pinned numbers that measured a different thing.** The omit branch
  fires when a section is _empty_; the clause pinned 525, which is how many
  pairs cannot reach _three_ cards. Measured: after widening, **30** pairs in
  1 124 250 have no positive aspect at all, **616** have no tense one, and
  **none** has neither — so the branch fires about once in 1 800 matches and
  cannot be assumed away, while 525 pairs simply show one or two cards, which
  is not an omission. The earlier "exactly 1 can fill neither" counted pairs
  with fewer than three positives _and_ no tension, which justifies nothing
  about a both-empty case.
- **A duplicate row could hide from every test.** The pin test derives its
  map from `dimensionOf`, so listing a pairing under two dimensions left
  every lookup unchanged when the duplicate went into an _earlier_ dimension
  — `new Map` lets the later entry win. The table a human reads would say
  one thing and the code another. `BY_KEY` is now built with an explicit
  duplicate check that throws at import, and a test pins the row count at 51.
  Mutation-verified: duplicating `venus–mars` into Emotional now fails at
  import with both dimensions named.
- **The seed guard did not guard.** `--seed 424242` (space, the natural typo
  of the new flag) was read as an output path and ran at the default seed,
  reporting success — the previous entry claimed this was fixed; it was not.
  Now the space form, an unknown flag, a second positional and a seed that is
  not a positive integer all throw. A negative seed used to be accepted and
  produced 1980s births off the Libyan coast while both existing guards
  stayed green.
- **The p99 sensitivity figure was no longer refreshable**, because the
  script stopped computing unrounded scores when the number came off the
  screen. It computes them again for that one line: at the second seed the
  unrounded distribution moves 0.01 at p50, 0.05 at p95 and 0.10 at p99,
  while the band cuts do not move at all. The ADR previously said "the other
  quantiles move by 0.01", which was wrong for p95.
- **98.52 % versus 98.88 %** was a definition, not a disagreement: 98.52 %
  counts aspect terms only, 98.88 % counts the element bonus as a harmony
  contribution, which is the form that matters for whether a signed sum can
  be split. The script now prints both and says which is which; C6 and the
  ADR both name the same one.
- Smaller: "between three and seven terms" contradicted its own table
  (Stability 2.67); C3 still said "equal-frequency" where the ADR says
  near-equal; C2's note said six tests where there are eight.
- **A cost the review named and C3 now answers:** pinning the committed
  figures in the battery would mean regenerating 1 124 250 pairs inside a
  suite that currently runs in 0.44 s — the script takes ~23 s. C3's
  done-when now uses a bounded 300-chart sample for the qualitative claims
  and leaves the exact figures to a rerun of the script, with the generator
  moved somewhere both can import so there is one copy of it.
- Verified: `bash .claude/hooks/verify.sh` green on the clean commit; both
  seeds rerun; all four argument guards fired; the duplicate mutation
  checked. Eight tests on the table.
- Next: C3 and the rest of C2.

## 2026-09-10 — Three tests that let a swapped table through

- Third code-reviewer pass, on the commit that added the engine code. It
  confirmed `dimensions.ts` transcribes ADR-0009 §1 exactly, that
  `pairingKey` is order-independent for every pair, that `scoredPairings()`
  reproduces `compatibility()`'s pairing set including the outer–outer skip,
  and that every figure the docs quote reproduces from a fresh run. Then it
  found three things worth the round.
- **The table's tests did not pin the table.** Counts alone let any
  count-preserving exchange through: moving `venus–jupiter` to Growth and
  `neptune–venus` to Chemistry kept 8/12/6/7/18 and every test green. Since
  the table drives card titles, the section split and eligibility at once,
  four surfaces would have moved on a green battery. `dimensions.test.ts`
  now pins all 51 assignments as a full key→dimension map. Verified by
  mutation: that exact swap now fails the suite, and reverting restores it.
- **The PRD still authorised the number the ADR forbids.** The amendment
  said the score "may be shown, but only mapped through a committed
  reference distribution first" — written before the owner's decision, and
  left behind when the ADR, ROADMAP and NOTES were updated. Whoever built
  the match screen would have read the spec file first and shipped a
  compliant number. Rewritten to record the decision and point at ADR-0009
  §3 for the way back.
- **C6's clause double-counted the element bonus.** ADR-0009 §1 folds the Sun
  bonus into Stability and the Moon's into Emotional; the clause then asked a
  test to add them again on top of the five dimension sums, which overshoots
  `harmony` by up to 4 on the ~75 % of pairs carrying one. Fixed, and the
  clause now says why.
- **Corrections to earlier entries** (append-only, so they stand as written):
  the middle entry's "reruns agree to within 0.01 of a point at p50, p86 and
  p99" is wrong at p99 — that quantile moves 0.10 where the others move 0.01,
  which is precisely the tail sensitivity the band decision declines to
  maintain. The 98.52 % figure for mixed-sign dimensions is 98.88 % once the
  element bonus counts as a harmony contribution, which is the form that
  matters for the split.
- **Now measured by the script rather than by hand**, so the ADR refreshes
  from one run: the mixed-sign share, each dimension's terms per pair, how
  often a dimension is absent and how much of that is bonus-only, and the
  four band shares. The one figure that stays historical is the 400-chart
  tail, which needs that pass's chart count and birth range.
- **A calibration detail worth the change:** the dimension cuts were being
  taken over every pair, including pairs where the dimension renders absent.
  They are now taken over pairs where it is present, which moved Stability's
  cuts from 49.99/57.82 to 49.56/57.68 and Communication's from 49.97/55.23
  to 49.71/55.45. Small, but these are the numbers C3 commits.
- **Bands are not equal and cannot be.** They hold 24.47 / 24.59 / 22.12 /
  28.82 % — the score is a discrete integer with 3–5 % of the mass sitting
  exactly on each cut. The ADR said "about a quarter"; C3 now pins the
  measured shares instead.
- Smaller: the script takes `--seed=N` rather than a positional argument,
  which used to make `score-distribution.ts 424242` write a file called
  `424242` under the default seed and report success; `dimensionTerm` is now
  used by the script instead of the rule being re-implemented inline.
- Verified: `bash .claude/hooks/verify.sh` green on the clean commit; both
  seeds rerun; the pinning test mutation-checked. Seven tests on the table.
- Next: C3 (commit the thirteen figures) and the rest of C2.

## 2026-09-10 — The number comes off the screen, and a signed sum loses the split

- **Owner decision: the overall compatibility score is never printed.** It
  stays the ranking key and reaches the screen as one of four bands, cut at
  the 25th, 50th and 75th percentiles (raw 56 / 62 / 67), shown as a word
  next to a four-step visual so cards stay comparable at a glance. Three
  reasons, recorded in ADR-0009 §3: a number becomes the hero and turns the
  aspect cards into evidence for a verdict, which is the opposite of the
  amendment's first rule; calibrated honestly it can only mean "ahead of N %
  of pairs", and the population it would be calibrated against is not the one
  `discover` serves; and it needs a maintained reference distribution whose
  tail is the sampling-sensitive part. The reversal path is written down and
  not built — turning a number on later is a day's work, turning it off after
  users have seen it is not.
- The decision paid for itself immediately in stability. Rerun at seed
  424242 the band cuts are **identical** and every dimension cut moves by at
  most 0.11, where the 99th percentile of a displayed number moves by 0.10
  against 0.01 elsewhere. The calibrated surface went from six 101-entry
  breakpoint arrays to **thirteen numbers**, small enough to read in a diff.
- **`packages/astro/src/dimensions.ts` landed** so the table lives in one
  place: the ADR, the script and the future UI now read the same definition
  rather than three copies. Six tests assert what the ADR claims about it,
  including one that drives real charts so the aspects are ones the engine
  emits. Zero aspects fall outside the table over 1 124 250 pairs.
- **The second review caught a fix that had not fixed it.** C6 asked the
  per-dimension _signed_ sums to reconstruct harmony and tension: they
  cannot, and the previous entry's diagnosis (the element bonus, Growth's
  `|term|`) named two real problems but missed the structural one. A signed
  sum is `H − T`; `{+3, −2}` and `{+1}` both give +1 but are (3, 2) and
  (1, 0), and 98.52 % of pairs have at least one dimension holding both
  signs. Every dimension now carries two sums. Growth keeps a third, its
  absolute sum, which is the only one its label reads. Verified in the
  script: reconstruction holds to 1.4e-14, and the clause now names
  `roundTerm`'s six decimals, since `===` fails on about half of pairs on
  float associativity alone.
- **"Never both at once" was false by exactly one pair.** Across all 51
  pairings, 1 pair in 1 124 250 has fewer than three positives _and_ no
  tension — the script printed 0.00 % because shares are two-decimal. C4's
  done-when asked for a test that would have failed on that pair; it now
  asserts the measured figure and keeps the omit branch, which is the
  outcome the rule already specifies. The script prints raw counts now.
- **Corrections to the previous entry**, which stands unrewritten because
  this file is append-only: the per-dimension medians quoted there were
  measured before the element bonus was assigned; with it they are Emotional
  57.5, Chemistry 56.8, Communication 52.3, Stability 53.6, Growth 66.4. Of
  the five, one sits in the overall score's bottom decile and three more
  below its 30th percentile — "bottom-decile on four axes out of five"
  overstated it. The 400-chart pass's tail was worse than described: one
  chart supplied 14 of 48 pairs above 86, nearly a third, not a seventh.
- **Script hardening from the same review:** it now refuses to run if the
  charts are not all distinct. The generator repeats after ~10 466 draws and
  each chart costs three, so raising `CHARTS` past ~3 488 would have silently
  produced duplicates and dependent pairs — the exact defect the move to 1500
  charts was meant to remove. `quantile` also indexes the array it is given
  rather than the module-level pair count, which would have read past the end
  of any filtered sample.
- Verified: `bash .claude/hooks/verify.sh` green on the clean commit; the
  script rerun at two seeds; the six new dimension tests pass. Not yet
  reviewed: `dimensions.ts` and its test were uncommitted during the second
  review, so they are outside the range it covered and need their own pass
  before any push.
- Next: C3 (thirteen figures, committed) and the rest of C2 — the card
  titles and the three screens.

## 2026-09-10 — The review caught the presentation rule being unreachable

- code-reviewer on `86635ad..HEAD` returned NEEDS_WORK. It reproduced every
  figure the script printed and confirmed the dimension table covers all 51
  pairings exactly once — and then found that ADR-0009's headline rule could
  not actually render. Fixed in this session; the entry above keeps its
  original numbers because this file is append-only, and they are superseded
  by the ones here.
- **The calibration could not produce the number it promised.** Mapping the
  _rounded_ score to a percentile yields only ~41 distinct values: raw 71 is
  the 85th percentile and raw 72 the 87th, so 86 — the ADR's own example —
  was unreachable, and every raw ≥ 83 read as "ahead of 100 % of pairs",
  which is false. Calibration now runs on the unrounded score and the
  fixture is 101 quantile breakpoints instead of a raw→percentile map; the
  displayed value is clamped to 1–99. All 101 breakpoints are distinct.
- **The sample was too thin at the end that matters.** 400 charts give
  79 800 pairs that are not independent — a single chart supplied 14 of the
  48 pairs above 86, and reruns under other seeds moved the ≥80 share by a
  fifth of its value. The population is now 1500 charts / 1 124 250 pairs
  (~20 s). Reruns under a second seed now agree to within 0.01 of a point at
  p50, p86 and p99. Medians never moved; the tail did.
- **Numbers, restated at the larger sample:** median 62, p75 67, p95 75,
  p99 80, max 93; ≥70 17.86 %, ≥80 1.16 %, ≥86 0.05 %. Curated-17 gaps
  16.03 % / 4.48 %, and 0.41 % hit both at once — the earlier entry's "never
  both at once" was true only of the all-51 case (0.05 % / 0.05 % / none).
- **Two done-when clauses could not have been satisfied.** C6 asked the
  per-dimension sums to reconstruct the overall harmony and tension: they
  cannot, because ADR-0003's element bonus is added to harmony outside any
  aspect (so it belongs to no pairing) and because Growth sums `|term|`,
  which has no signed decomposition. ADR-0009 now assigns the Sun element
  bonus to Stability and the Moon's to Emotional, and Growth carries both a
  signed and an absolute sum. C3's "covers 0–100" was unsatisfiable in one
  reading and trivial in the other, and its symmetry clause was about a
  function that takes no charts; both replaced with checks that bite.
- **The ADR contradicted itself on dimension thresholds**, and the wrong side
  was the normative one: §2 said dimension labels use the overall score's
  distribution. Measured over the population, the median pair's Stability is
  50.0, Communication 52.3, Emotional 54.3, Chemistry 56.8, Growth 66.4 — a
  dimension reduces one to four terms through a damping constant chosen for a
  sum of twenty-odd, so on the overall scale a median pair would be labelled
  bottom-decile on four axes out of five. Each dimension now gets its own
  breakpoints. Recomputing those medians also confirmed the mapping table
  independently: zero aspects fell outside it over 244 650 pairs.
- **Smaller corrections:** the judging sentence the ADR retires is
  `bands.json`'s `very-low`, not `low` (both go — together they are shown to
  about a fifth of pairs); the cohort now really is ages 20–35 in 2026
  (births ran to end-2006, which is 19); three figures the ADR quoted were
  not printed by the script and now are; the pair-count guard throws instead
  of silently skipping, so a loop-bound mistake cannot produce a wrong ADR
  with no symptom; the LCG comment no longer claims integer determinism it
  does not have.
- Verified: `bash .claude/hooks/verify.sh` green on the clean commit; the
  script rerun at two seeds. Not re-reviewed yet — these commits need their
  own code-reviewer pass before any push.
- Open for the owner, unchanged by this work: whether to show the overall
  number at all. There are now three independent reasons it is fragile (it
  is not a percentage, it needs a maintained calibration fixture, and its
  top end is sampling-sensitive), and the band label carries the meaning
  without any of them. The mechanism works either way.

## 2026-09-10 — The chart becomes the hero, and the score stops being a percentage

- The owner wrote a full product system for how Juno should present
  astrology ("Juno — Astrology / Compatibility Product System"). It adds no
  interaction: it changes how what the engine already computes reaches a
  screen. Two rules govern it — _the chart is the hero, the photo is the
  context_ and _show the calculation, soften the conclusion_. Recorded as an
  amendment in `docs/PRD.md` rather than a rewrite, since interactions 1–7
  and their "works when" clauses still stand.
- **Three of its decisions turned on numbers nobody had measured, so they
  were measured first.** `packages/astro/scripts/score-distribution.ts`
  builds the product's real population (400 charts, births 1991–2006 at
  Turkish coordinates) and scores all 79 800 pairs. Findings:
  - ADR-0003's score is **not a percentage**. Median pair 62, p95 75, max 91;
    the 86 in the owner's mockups occurs in 0.06 % of pairs. Printed with a
    `%` an average pair is told it scored 62 out of 100. Decision: the raw
    score stays the ranking key and is unchanged, but nothing reaches a
    screen before being mapped through a committed reference distribution,
    so a shown 86 means "ahead of 86 % of pairs" — a rank the method can
    support. Whether to show a number at all stays an open owner option.
  - The owner's curated 17 pairings are **too thin to fill the match page**:
    17.07 % of pairs cannot produce three positive aspects from them and
    4.88 % produce no tension, against 0.06 % and 0.08 % when all 51 are
    eligible, never both at once. Hence a two-step fill rule rather than a
    special case, and it needs no new content — the existing 255 synastry
    texts already cover all 51.
  - Pluto–Venus is present in only 36.8 % of pairs, so the owner's
    "Intensity" category cannot be a standing section; folded into Growth.
- **ADR-0009** records the mapping table (every one of the 51 scored
  pairings belongs to exactly one of emotional/chemistry/communication/
  stability/growth, 8/12/6/7/18), that dimensions are shown as labels and
  never as numbers, the calibration rule, the fill rule, and the one that is
  easy to get wrong later: viewer-weighted ranking may reorder `discover`
  but may never touch a displayed value, because ADR-0003 guarantees
  symmetry and a test asserts it. Growth is the single place where tension
  counts as presence (`|term|`), which is why its label vocabulary must not
  read as praise.
- **ADR-0004 amended**: putting the orb on screen to the arcminute moves its
  two accepted boundary cases (a planet on a cusp, a retrograde near a
  station) from an internal tolerance to something a user can check against
  astro.com. Unchanged decision, now a visible one.
- **Deferred with reasons, not dropped**: dating archetypes (a "you are X"
  claim over 24 buckets discredits the screen when one feels wrong), the
  Juno asteroid and "Juno Signature" (the ephemeris cannot compute it —
  the product is named after a body the engine does not have), directional
  Saturn/Pluto readings (a rewrite of existing texts), user-weighted
  ranking (designed for, not exposed).
- **Cut from the owner's draft, with the reason**: 96 themed conversation
  starters — `synastry.json` already carries an aspect-specific question on
  each of its 255 entries, so a 12-theme library would be a regression;
  "try another" walks down the ranked aspect list instead. Per-aspect
  intensity prose (a label plus the orb says it). Rare-pattern copy trimmed
  from 36 to the six patterns that actually trigger.
- **Content accounting**, since the draft's "~500–800 atoms" budget reads as
  the total: 754 already exist and are owner-approved. The draft reuses ~213
  of them on its primary surfaces; the rest stay reachable behind "explore
  your full chart". New copy after the cuts is ~180, not the ~450 the draft
  implies — mostly house overlays (60) and card titles (~30).
- Written this session: PRD amendment, ADR-0009, ADR-0004 amendment 1,
  ROADMAP items C2–C6 (each with a done-when), and the measurement script.
  Verified: `bash .claude/hooks/verify.sh` green on the commit. No engine or
  UI code changed — C2 is the first item that touches either.
- Next: C2 (mapping table + presentation), then C3 (calibration), which
  together are the input `docs/design-brief.md` needs before it is
  regenerated — the brief still describes the ten-row chart screen and a raw
  0–100 score.

## 2026-09-10 — Closing out the rename: volumes gone, old name let go

- Two owner decisions, recorded because neither is visible in the code
  and both would otherwise be re-proposed.
- **No stardate Docker volume is left.** The earlier entry says the
  `supabase_db_stardate` volume is "still on the machine — harmless, and
  safe to drop"; the owner dropped it, and two more the entry never named
  went with it this session (`supabase_edge_runtime_stardate`, the Deno
  module cache, and `supabase_storage_stardate`, the old local Storage
  files). Nothing was attached to any of them — the juno stack has run on
  its own volumes since the rename — and all three are reproducible from
  migrations, seed and a cold fetch. Treat the earlier line as
  superseded.
- **The freed `oguzpancuk/stardate` repository name is not being
  reserved.** GitHub redirects a renamed repository only until someone
  else claims the old name, so a stale clone or an external link still
  pointing at `stardate` breaks the day that happens. The owner accepts
  that rather than holding an empty repository for it. Nothing here
  depends on the old URL: `origin` was repointed at
  `oguzpancuk/juno.git`, and no file in the repo references either name
  as a URL.
- Verified after the removal, not before it: `bash .claude/hooks/verify.sh`
  green on a clean committed tree, with the Supabase suite's 119 tests
  passing against the running juno stack — which is the check that
  matters here, since `global-setup.ts` refuses to start unless every
  Edge Function answers a preflight and `local.ts` fails on a missing
  database, so there is no path by which a broken stack reports green.

## 2026-09-10 — The two leftovers from the CI outage, closed

- Both were the same shape as the outage itself: a difference between
  this machine and CI that only CI could see.
- **The suite now says what is missing.** A vitest globalSetup preflights
  `photo` and `delete-account` before any file runs. `local.ts` already
  turned a missing database into a FAIL naming the fix; the functions
  gateway had no such contract, which is why twelve tests reported
  "expected 503 to be 200" and the cause had to be found by hand. OPTIONS
  is the probe because both functions answer a preflight 204 before they
  read a token or touch the database, so warming them cannot change
  state. Checked the only way that means anything — started the stack
  with `-x ...,edge-runtime,...` and watched one named error replace the
  twelve.
- **The cold cache is paid outside a test.** CI creates the runtime's
  Deno cache volume empty, so the first request to each function resolves
  its import graph over the network. That was happening inside a 20 s
  test timeout; it now has its own budget in setup.
- **The version is pinned in the specifier, not an import map.** An
  import map (`functions/deno.json`) would have been the single source of
  truth, but the CLI's handling of it could only be verified here for
  serve, never for deploy, and a mechanism whose first failure would be
  in production is not worth that. Both functions now import
  `jsr:@supabase/supabase-js@2.116.0` — the same version
  `supabase/package.json` resolves, so the repo runs one supabase-js.
  Worth being exact about what that buys: pinning the top of the graph is
  not a lockfile. supabase-js pins its own `@supabase/*` dependencies but
  declares `npm:@opentelemetry/api@^1.0.0`, and that range is still
  resolved from the network at cold start. The risk is narrowed to
  transitive ranges, not closed.
- **The pin has a gate, and the gate needed a second pass.** `functions/`
  is outside the TypeScript project and ESLint ignores it, so nothing but
  `tests/functions-pinned.test.ts` would notice a floating specifier
  coming back. The first version of it could be walked past three ways,
  all found in review: it only opened `<dir>/index.ts`, and it only
  matched `from '…'` — so a side-effect `import '…'`, a dynamic
  `import('…')`, or any module that is not the entrypoint (a future
  `_shared/`) would have restored the exact risk the commit exists to
  remove, with the test green. It now walks every module extension Deno
  runs, everywhere under `functions/`, and matches all three import forms, and two further
  assertions close what a comment used to promise: the functions may not
  disagree with each other on a version, and they may not drift from the
  supabase-js the workspace has installed — `npm update` alone now turns
  the suite red until the functions are bumped with it. All three were
  checked by mutation: a floating specifier hidden in `_shared/boot.ts`,
  the two functions set to different versions, and both set behind the
  install. Each fails for its own reason and only that one.
- **The second review found the fixes had their own regressions.** Two
  mattered, both in the direction of failing the whole suite on something
  that was not a defect here: a 500 was made fail-fast, but a 500 is
  exactly what a briefly unreachable registry produces during a cold
  boot, so one bad moment at jsr.io would have failed every Supabase
  suite; and the per-attempt timeout was set to 15 s, shorter than the
  20 s cold start the file exists to outlast, with an aborted attempt
  reported as "the stack is down". Both are the same wrong-cause failure
  this whole series is about. Now everything except a 404 is retried
  inside a 180 s budget, an attempt gets 60 s, and a timeout says it is a
  timeout.
- **The preflight's second claim is now observed, not asserted.** That it
  boots the worker (rather than being answered by the gateway) is visible
  in the answer: photo returns `access-control-allow-methods: GET,
OPTIONS` and delete-account returns `POST, OPTIONS` — constants that
  exist only inside each module, which a shared gateway plugin could not
  produce per route.
- **Five review rounds on one gate, and each round found the previous
  fix's own hole.** Worth recording as a pattern rather than as five
  bugs: a gate written against a list of known shapes keeps having the
  shape nobody listed. Four rounds were blind spots, ending with a
  computed specifier whose interpolation comes first — `` `${CDN}/pkg@2` ``
  has no visible scheme, so the "is this remote?" test skipped it. The
  fifth was the opposite failure and arrived with the fix for the fourth:
  widening that test made it reach strings that are not imports at all,
  so `supabase.from(`profiles_${shard}`)` would have been reported as an
  unpinned dependency. Widening a gate creates false alarms as reliably
  as narrowing one creates blind spots, and only the second kind is
  obvious while you are writing it.
- **What stopped the cycle was tables, not care.** The parser and the
  source scan each have a table of cases in the test file, so what took
  five rounds to get right now fails on a revert without anyone planting
  a poisoned module under `functions/` — which is how every earlier check
  was done, and why each one vanished with its session. Two of those
  checks did not discriminate on the first attempt: the fixture for the
  computed guard would have passed with the guard deleted, and the
  lookbehind case was carried entirely by a different rule until it was
  given a path separator. A mutation check is only evidence once the
  mutation actually fails.
- **A checkbox I had no right to tick.** The ROADMAP item was marked done
  before CI had seen the commits, while its own done-when clause asks for
  a green run. Review caught it; it is back to `[ ]` with the evidence
  recorded and the run named as what is missing. The lesson is the one
  this whole outage already taught: a green local battery is not evidence
  about CI.
- Verified: battery green on a clean tree. CI green on this commit is the
  claim that still needs the run.
- **The run, and which commit actually fixed CI.** 9de4b83 is green (run
  34452505805, 4m25s). It is the _second_ green run, not the first: CI
  went green at 2012b1c (run 34444723974), whose one behavioural line
  stopped excluding the edge runtime; the nine commits between it and
  this one were hardening on a pipeline that already passed. Worth stating plainly
  because the wrong version was written first, reasoned from this file's
  own older "six runs, all failures" note instead of re-querying — under
  a bullet about not claiming what was not observed. What the second run
  adds is narrower and still worth having: the gates written since do not
  break CI, and they pass against an edge runtime booting on a Deno cache
  that a fresh runner creates empty.
- What a green run does not show, since `verify.sh` prints step output
  only on failure: the log is four `ok` lines. That `ok tests` covers the
  Edge Functions is an inference from the harness having no skip path —
  `globalSetup` throws unless every function answers a preflight 204. The
  next step of that inference is weaker than it reads: the reason a 204
  means the worker booted is that each function returns its own
  `access-control-allow-methods`, which was checked by hand on 10 Sep and
  is asserted nowhere in the battery. `warm()` compares a status and
  nothing else, so a gateway that ever answered preflights itself would
  leave the gate passing with the runtime dead — the original incident.
  Parked as a ROADMAP item rather than fixed here, because it is a change
  to a gate and this is a docs commit.

## 2026-09-10 — CI has never been green, and now we know why

- Pushing the rename surfaced it. GitHub has six runs on record for this
  repository and all six are failures; the oldest already postdates the
  commits that added the Edge Function tests, so no run has ever gone
  green. That matters for what this fix proves: it removes the only
  defect we have evidence for, not the last one — the rest of the
  workflow has never been observed to pass end to end, so a second
  CI-only defect on the next run would be a fresh find, not a
  regression. Nothing here is rename-related: `npm ci` resolved fine and
  three of the five Supabase test files passed.
- Cause: `.github/workflows/ci.yml` started the stack with
  `-x ...,edge-runtime,...`, an exclusion list written in S4 when no test
  called an Edge Function. `photo.test.ts` and `delete-account.test.ts`
  later started calling `/functions/v1/*`; with no edge runtime Kong
  answers 503, and twelve tests fail on a stack defect instead of on the
  code. `supabase start` locally boots everything, which is why the
  battery was green here and red there — the exact disagreement the
  header comment of that file forbids ("CI runs the SAME battery agents
  run locally").
- Reproduced before fixing, not assumed: started the local stack with
  CI's exact flag list and got 12/12 failures in those two suites, all
  503; restored the full stack and they pass. Fix is to drop
  `edge-runtime` from the exclusion, with a comment saying only services
  no test touches may be excluded.
- Worth noting for its own sake: six pushes went out under a green local
  battery while CI was red, because nobody read the run. A local battery
  is not evidence about CI.
- Left open by review, both the same class as the bug just fixed — a
  difference between the two environments that only CI can see: the Edge
  Functions import `jsr:@supabase/supabase-js@2` with no lockfile or
  import map, so CI resolves that graph over the network on a cold Deno
  cache inside a 20 s test timeout, and the floating `@2` means a new
  2.x release can turn CI red with no commit here. Nothing in
  `supabase/tests/local.ts` probes the functions gateway either, which is
  why twelve tests said "expected 503 to be 200" instead of naming the
  missing runtime.
- Verified: `bash .claude/hooks/verify.sh` green on a clean tree. Whether
  CI itself goes green can only be proven by the run on this commit.

## 2026-09-10 — stardate is gone from the code, not just from the screen

- The owner renamed the working directory and the GitHub repository to
  `juno`, which retired the reason the earlier rename session had for
  keeping the old code name ("`stardate` stays as the repo, workspace and
  local Supabase project name"). Owner decision this session: rename all
  of it.
- `origin` still pointed at `oguzpancuk/stardate.git` and only worked
  because GitHub redirects renamed repositories; it now points at
  `oguzpancuk/juno.git`, verified with `git ls-remote`.
- The npm workspace scope is `@juno/*` across twenty files, the root
  package is `juno`, the local Supabase project id is `juno`, the RLS
  suite's throwaway password is `juno-test-password`, and
  `contracts/init.sh` writes `/tmp/juno-expo.log`. `package-lock.json` was
  regenerated with `npm install`, so `npm ci` in CI still resolves.
- Changing `project_id` renames every local Docker container, so the old
  stack was stopped by id (`supabase stop --project-id stardate`, with
  backup) and a fresh one started: all migrations applied and `seed.sql`
  ran clean. The old `supabase_db_stardate` volume is still on the machine
  — harmless, and safe to drop whenever the owner wants it gone.
- Historical NOTES entries and ADRs 0002/0005 keep the old name on
  purpose: they record what was true when written. ADR-0005 got Amendment
  1 instead of an edit, because its consequence section still claimed the
  bundle id was `com.oguzpancuk.stardate` while `app.json` has said
  `com.oguzpancuk.juno` since the mark landed — a stale fact a deploy
  session would have acted on.
- Verified: `bash .claude/hooks/verify.sh` green (typecheck, lint, format,
  tests) against the freshly seeded local stack.
- Open: whether "Juno" is free on the App Store, still for the first
  deploy session.

## 2026-09-10 — Two tests that could not fail, and a rule I broke

- The eighth review reverted each of the previous round's fixes and
  watched the test suite stay green for two of them. One never made the
  read that fills the cache, so it skipped the restore for the wrong
  reason and would have passed against the very bug it was named for; the
  other asserted a consequence the same commit had just deleted. Both are
  rewritten and checked the only way that means anything — revert the fix,
  watch the test fail, put it back — and a third now pins the counter
  check on the delete's failure path. A test that cannot fail is worse
  than no test, because it gets counted.
- ADR-0008 corrected on three points from the same review: the iOS
  sign-out mitigation holds only when the revoke reached the server, and
  offline it does not; the unreadable plain store is its own residual,
  because a launch that cannot read the marker declines to wipe and hands
  over whatever the keychain holds; and "one key" describes what
  supabase-js writes, not every name that can reach this store.
- **A rule I broke:** the entry below was edited in place to admit the two
  tests did not bite. NOTES is append-only — the header says so — and the
  audit trail is the point: an entry that claimed coverage it did not have
  should stay as written, with the correction dated after it. This is that
  correction. The counts in that entry (53 mobile, 41 store) are also
  stale; the tree has 54 and 42, which is what ROADMAP says.
- Nine review rounds on one file, and the ADR still says seven. Left as
  is: the number in prose is not worth a commit, and this entry records
  it.
- Verified: battery green on a clean tree; 54 mobile tests, 42 on this
  store; pushed to the private repo.

## 2026-09-10 — Three fixes, then stop: ADR-0008

- The seventh review found that marking on a write had introduced a
  regression of its own, and two smaller things. All three are fixed, and
  then this file stops — the rest is platform, and it is written down in
  ADR-0008 rather than chased into an eighth round.
- **The marker could record a state that was never learned.** A single
  failed AsyncStorage read on a fresh install — the moment that store is
  most likely to fail, since its file is being created — left the check
  unable to tell fresh from upgraded, and the first write then wrote the
  marker anyway. Every later launch read the marker and skipped the check
  for good: on a resold phone, permanently inside the previous owner's
  account. The marker is only written when the check actually managed to
  read the store.
- **A short-circuit that bought nothing.** "Once marked, stop wiping" was
  protecting this install's own keys, but the per-key map already does
  that — every key this install writes went through the wipe first. With
  the line gone, a leftover key touched after the marker is cleared too,
  which is the residual the entry below wrongly claimed was already
  answered.
- **The write counter counted attempts, not values.** A read fills the
  cache as well as a write, so a refused write could make an in-flight
  delete "restore" a session the user had just ended. It counts values
  that actually landed now.
- Each of the three has a test, and so do the four mechanisms the review's
  mutation table showed were unpinned. **Two of those tests did not
  actually bite** — the eighth review reverted each fix and watched them
  stay green. One never made the read that fills the cache, so it skipped
  the restore for the wrong reason; the other asserted a consequence that
  the same commit had just removed. Both are rewritten and checked the
  only way worth checking: revert the fix, watch the test fail, put it
  back. A test that cannot fail is worse than no test, because it is
  counted.
- Recorded as accepted rather than fixed, in ADR-0008: a key this install
  never touches keeps a previous install's value (only reachable if PKCE
  or a separate user storage is adopted); iOS reports a failed keychain
  delete as success, which makes the retry machinery unreachable there; an
  iCloud restore would carry a clear-text session from a pre-keychain
  build, which never shipped; and the Android clear-text delete frees the
  page without zeroing it.
- Verified: battery green on a clean tree; 53 mobile tests, 41 on this
  store.

## 2026-09-10 — The marker belongs to a write, not to a wipe

- The fresh-install wipe still rested on something unwritten: it marked
  the install as soon as _any_ key's wipe went through, so the guarantee
  depended on which key supabase-js happens to touch first. A launch that
  only saw a PKCE verifier would mark the install while the previous
  owner's session sat untouched — the resold-phone case again, through a
  third door. It is not reachable today (the client is on the implicit
  flow, so only one key exists) and that is exactly why it was worth
  closing: the safety lived in a library's init order, not in this file.
- The marker is written when this install first _stores_ something — a
  sign-in, or a session migrated out of the old plain store, both of
  which are this install's own. Until then every key is cleared the first
  time it is used, in any order. An install where nobody signs in checks
  again next launch, which costs nothing.
- A real race closed on the way: a sign-out delete already in flight when
  a token refresh writes would remove the new value, and the person was
  signed out by something they could not see. The delete now notices a
  newer write and puts it back.
- Three tests the last review named as missing are in: a non-session key
  first touch must not mark the install, a migrated session must be
  remembered even when the keychain refuses it, and the write counter's
  one job. That review's remaining point — that a key nobody ever touches
  keeps a previous install's value — is answered by the rule change
  rather than argued: nothing is marked until this install owns something.
- Verified: battery green on a clean tree; 48 mobile tests, 36 on this
  store; and the simulator sequence again end to end — clear-text session
  planted with no marker, app opened signed in, plain store left holding
  only the marker, quit and reopened, still signed in.

## 2026-09-10 — Guessing key names was the wrong idea

- To make the fresh-install wipe reach keys a launch might never touch, I
  derived the other names supabase-js builds from the storage key. The
  review took the parser apart: for `…-auth-token-code-verifier` it
  strips the wrong dash, so the list it produced contained neither the
  session key nor the verifier — and because a wipe that "succeeded"
  recorded the install as clean, a launch whose first key was the
  verifier marked the install while deleting nothing. The previous
  owner's session then survived on a resold phone, which is the exact
  case the wipe exists for, reopened through a different door.
- Worse, the derived list included the base key, so touching a second key
  after signing in deleted the session that had just been created.
- The guessing is gone. Each key is wiped on its first touch in the
  process, and the marker only records the check for later launches — so
  a key this launch never touches is cleared the first time it is used
  instead. A key nobody ever touches holds no session; that is the whole
  claim, and it does not need a parser.
- Also from that review: a retried delete that finally goes through now
  records the install, so a keychain that refuses once no longer costs an
  extra sign-in later; a migration whose keychain write fails answers with
  the session rather than signing the person out (the next launch retries,
  and the clear-text copy stays one launch longer, which is the cheaper
  of the two); and the pending-removal branch no longer pretends it might
  have a value to hand back — a write clears the pending state, so
  reaching that branch means the value is meant to be gone.
- The counter on writes stays for the one thing it actually does: a
  delete already in flight cannot re-arm the pending state after a newer
  write landed. NOTES said it did more than that; corrected above.
- Verified: battery green on a clean tree; 44 mobile tests, 32 of them on
  this store.

## 2026-09-10 — A fix that made the thing it fixed permanent

- Writing the install marker before the wipe — my answer to "an unwritable
  store must not sign someone out on every launch" — turned a transient
  keychain refusal into a permanent one. The marker said the check had
  run, the key was noted as done, and no launch tried again: a resold
  phone stayed inside the previous owner's account for the life of the
  install. The version before my fix recovered on the next launch. The
  review put both side by side and the regression was plain.
- The two costs are not the same size, which is what decides it. A wipe
  that repeats costs a sign-in; a wipe that never happens costs someone
  else's account. So the wipe runs first and the marker is written only
  once a delete has actually gone through — and until it does, the key is
  held as pending, so reads answer null rather than handing back the
  previous owner's session. The test that encoded the old trade was
  rewritten to state this one, out loud.
- Three more from the same review:
  - The retry-delete could swallow a sign-in that landed while it was in
    flight: sign out, keychain refuses, sign back in, and the late delete
    removed the new session. A write clears the pending state, and a
    delete already in flight carries a counter so it cannot re-arm it.
  - A sign-out whose clear-text delete also failed was undone on the next
    read: the keychain was empty, so the migration path found the leftover
    and wrote it back. A key known to be gone is not migrated.
  - The wipe only ever reached keys the first launch happened to touch. It
    now covers the ones supabase-js derives from the key it is given —
    the user blob and the PKCE verifier — which a launch may never read.
- Verified on the simulator, the path every existing install hits exactly
  once: marker absent and a clear-text session in the plain store, app
  opened signed in, the plain store left holding only the marker and no
  `refresh_token` anywhere.
- Verified: battery green on a clean tree; 40 mobile tests.

## 2026-09-10 — Order of calls is not a guarantee

- The keychain store worked, and worked for a reason I had not written
  down: supabase-js happens to read the session key first. Two rules were
  keyed on "whichever key came first" rather than on the key —
  the fresh-install wipe and the clear-text cleanup — so under a different
  flow (`flowType: 'pkce'`, or a separate user storage) the wipe would
  have missed the session and the clear-text copy of it would have stayed
  on disk for ever. Both are per key now. A library's internal call order
  is not a thing to build on, and it was not even documented as an
  assumption.
- **The upgrade path had no test at all** — marker absent _and_ a session
  in the plain store, which is what every existing install hits exactly
  once. A mutant that signs out every one of them passed the whole suite.
  It has a test now; that is the second time a review has found the most
  consequential path uncovered while the corners were well tested.
- A sign-out the keychain refuses used to report success and leave the
  entry: a refresh running alongside it re-reads the store, finds the
  session and writes rotated tokens straight back, undoing the sign-out.
  The store remembers the attempt, reads as signed out, and retries the
  delete on the next read.
- And the marker is written before anything is dropped, not after. If the
  write fails there is no way to record that the check ran, so dropping
  anyway would sign the person out on every launch for as long as the
  store is unwritable.
- One cost worth stating: an install of the previous build — keychain, no
  marker — is signed out once by this one, because the marker is new and
  its absence reads as a fresh install. Nothing is deployed, so this is
  a development-only cost, but it is the kind of thing that is invisible
  until it is a support ticket.
- Verified: battery green on a clean tree; 32 mobile tests.

## 2026-09-10 — Two ways the keychain surprised me

- Review of the keychain store found two things I had not thought about,
  both of them the kind that only show up in someone's hands.
- **Returning null when the keychain cannot be read signs people out.**
  supabase-js re-reads the store after rotating a refresh token and reads
  a null as "storage was cleared under us", so it throws the _new_ tokens
  away and keeps the one the server has already consumed. Lock the phone
  mid-refresh and the next launch fails with a revoked token. The store
  answers with the last value it knows to be stored instead — and never
  with the clear-text copy, which would undo the whole change on exactly
  the platform where the keychain is unreliable. There is a test for that
  distinction now, because the suite could not tell the two apart.
- **An iOS keychain entry outlives the app that wrote it.** Delete Juno,
  reinstall it, and the old session is still there: someone who wiped the
  app to get out of an account, or the next owner of a resold phone,
  lands inside it without signing in. AsyncStorage does go with the app,
  so its emptiness is the signal — no marker means this install has never
  run, and any keychain entry belongs to a previous one and is dropped.
  Verified on the simulator: with the marker absent the app opened signed
  out and the entry was gone; with it present, a planted clear-text
  session migrated, the plain store came back holding only the marker,
  and a restart kept the session.
- Smaller, same review: a successful migration reported null if the
  clear-text delete failed — a spurious sign-out on the one launch that
  matters; the delete on the old store now runs once rather than on every
  read; and `expo-secure-store`'s plugin was shipping an English Face ID
  purpose string for a prompt this app never triggers.
- Known and left, both Android and both invisible from the code:
  `keychainAccessible` is an iOS option — what keeps the session out of an
  Android backup is the config plugin's backup rules, which also narrow
  Auto Backup for the whole app. And AsyncStorage on Android is one SQLite
  file, so deleting the migrated row frees the page without zeroing it:
  the token stays recoverable from the free list until it is overwritten.
  Against the threat this change names, the Android migration removes the
  row, not the bytes.
- Verified: battery green on a clean tree; 27 mobile tests; the three
  simulator sequences above.

## 2026-09-10 — The cipher was answering a limit that does not exist

- **The entry below describes a design that lasted two hours.** It is left
  as written, because the reason it was wrong is the useful part.
- It sealed the session with XChaCha20-Poly1305 and kept only the key in
  the keychain, on the premise — stated in the ROADMAP since the skeleton
  — that SecureStore caps a value at 2 KB. A review asked whether that was
  still true. It is not: there is no size check anywhere in
  `expo-secure-store@57`, and a throwaway screen on the simulator stored
  1 KB, 2 KB, 4 KB, 8 KB and 16 KB and read every one of them back.
- So the session goes into the keychain whole and the cipher is gone. With
  it went the key cache and its race, the nonce handling, a duplicated
  base64 pair, `@noble/ciphers`, `expo-crypto`, and four of the review's
  findings — none of them fixed, all of them deleted. The measurement cost
  ten minutes and retired more risk than any of the fixes would have.
- What the same review caught that still mattered, and is now handled:
  - **The clear-text session was never removed.** Failing to open a value
    left it in place, and supabase-js only clears a value that parsed, so
    an upgraded install kept a live refresh token on disk indefinitely.
    The store now moves an old session into the keychain on first read and
    deletes the clear-text copy — and clears it on every write and every
    sign-out too.
  - **`WHEN_UNLOCKED` is carried into an encrypted backup**, so restoring
    one onto another device hands over the token — one of the three
    threats the code names. It is `WHEN_UNLOCKED_THIS_DEVICE_ONLY` now;
    the cost is a sign-in after a legitimate device migration, which is
    the right way round for a credential.
  - **A failed write no longer deletes a good session.** A locked device
    is not a bad value, and the old code could not tell them apart.
  - `expo-crypto`'s `getRandomBytes` falls back to `Math.random()` in a
    dev build on the bridgeless runtime — so the one hand-check planned
    for the feature would have exercised a non-cryptographic key. Moot
    now, and a good argument for having deleted the randomness.
- **Correction to the entry below:** it says the change was "verified in
  the browser". It was not — the web branch uses the browser's own storage
  and never touches the new path. What the browser run actually showed was
  that nothing regressed on web. The device path is verified now, properly:
  a clear-text session planted in Expo Go's AsyncStorage, the app opened
  signed in, `manifest.json` back to `{}` with no `refresh_token` left in
  the store, then Expo Go quit and reopened — still signed in, which it
  can only be from the keychain. The simulator's keychain file is
  encrypted at rest, so I did not read the entry itself; there is nowhere
  else the session could have come from.
- `supabase/scripts/plant-session.ts` is deleted. It planted a clear-text
  session, which the app now migrates and erases on first read — so it
  would work exactly once and only until the migration is retired, which
  is worse than not having it.
- Verified: battery green on a clean tree; 21 mobile tests; the simulator
  sequence above.

## 2026-09-10 — The session is sealed, and what that cost

- The refresh token sat in AsyncStorage in clear text — Supabase's
  documented Expo default, and a plain SQLite file in the app sandbox.
  Fine against another app, useless against anyone holding the file
  system. It is sealed now with XChaCha20-Poly1305 and the key lives in
  the keychain; the session itself cannot go there, because SecureStore
  caps a value at 2 KB and a session is larger.
- XChaCha rather than AES-GCM: a 24-byte random nonce can be drawn for
  ever without the birthday problem that makes a 12-byte GCM nonce a
  footgun, and both are authenticated, so a tampered value fails to open
  instead of decrypting to rubbish.
- The web keeps the browser's own storage untouched. There is no keychain
  there, and a key beside the ciphertext in the same origin protects
  nothing; pretending otherwise would be theatre.
- Nothing in the path throws. supabase-js calls it on every launch and
  every refresh, and a session that cannot be read or written has to mean
  "sign in again", never a crash — so a lost keychain entry, a tampered
  value, a key of the wrong size and a keychain that refuses to write all
  answer null or store nothing.
- Structure: the sealing is pure (`session-crypto.ts`), the store logic
  takes its keychain, store and randomness as arguments
  (`session-store.ts`), and only the binding touches the platform
  (`session-storage.ts`). 17 tests, including a fresh store instance
  opening what the previous one wrote — which is what an app restart is.
- **What this cost:** session injection is dead. `plant-session.ts` wrote
  a plaintext session into Expo Go's AsyncStorage, and that is how every
  authed simulator screenshot in this repo was taken. The app now refuses
  to open it, and the script cannot seal one because the key is in a
  keychain it cannot read. Authed screens are verified in the browser from
  here on; the device path needs a person to sign in once, which is why
  the ROADMAP clause stays open with the owner's check written out rather
  than ticked.
- Dependencies added, both justified: `expo-secure-store` for the keychain
  and `@noble/ciphers` because the React Native runtime has no cipher at
  all — no WebCrypto `subtle`, and `expo-crypto` gives digests and random
  bytes only.
- Verified: battery green on a clean tree; 29 mobile tests; sign-in and a
  full page reload driven in the browser under the new adapter.

## 2026-09-10 — The other end of the range

- The magnitude guard caught numbers too large to be a double and not
  numbers too small: `numeric -> double precision` raises on underflow
  too, so `1e-400` came back as a type error with the constraint's
  internals in the message instead of a refusal. JavaScript reads that as
  zero and accepts it, so a crafted chart got neither an accept nor a
  clean no.
- The small-magnitude branch does not collapse everything to zero:
  `-1e-321` is a real negative denormal and the client refuses it, so
  accepting it here would have been a divergence in the dangerous
  direction. It answers null — and that also refuses the narrower band the
  client would accept as `-0`, since `-0 >= 0` is true in JavaScript. It
  was `-1` at first; a later review pointed out that a future signed field
  would read that as a real value, so it is null, the same answer the
  function gives for anything that is not a degree. Tested through raw
  text, since `1e-400` is just `0` once TypeScript reads it.
- The service-role test was anchored on an update that reports no error
  when it matches nothing — and a zero-row update evaluates no constraint,
  so it would have passed green with the grant missing. It asserts the
  returned row now.
- `jsonb_array_length` was the last type-dependent call sitting outside
  the CASE that guards it, which is the argument the rest of that file
  already makes.
- Known and left, two things:
  - The service role can write `profiles` but cannot read `discover`,
    `match_profiles` or `my_reports` — those views call
    `private.is_blocked`, which is granted to `authenticated` only.
    Nothing server-side reads them today; the next Edge Function that
    wants to will need the grant.
  - Two bands where the server and the client do not agree, both
    fail-closed. A number too extreme for `numeric` itself (`1e-16384`,
    and scale-dependent neighbours like `9.9999e-16383`) fails when the
    text becomes jsonb, before any CHECK is reached, so the error names
    `numeric` rather than the constraint; it cannot be fixed in a CHECK,
    because a value has to parse before a constraint can see it. And a
    negative small enough to be `-0` in JavaScript is accepted by the
    client (`-0 >= 0` is true) and refused here. Refusing more than the
    client does is the safe direction; nothing the engine emits is
    anywhere near either band.
- Verified: battery green on a clean tree; 105 Supabase tests, 12 mobile.

## 2026-09-10 — Two ways a check can be right and still be wrong

- **The private-schema move locked the service role out of `profiles`.**
  A CHECK runs with the writer's privileges — the fact the whole move was
  built on — and `private` was granted to `authenticated` only. Every
  service-role write failed with "permission denied for function
  is_sign": the seed scripts first, and any backfill, moderation write or
  Edge Function later. Granting the schema and the four helpers to
  `service_role` costs nothing on the API surface, because PostgREST
  exposes `public` and `graphql_public` and nothing else. A test now
  writes a profile as the service role, and `seed-photos.ts` runs again.
- **The check compared in `numeric` and the app compares in IEEE-754.**
  `359.99999999999999999` is under 360 as a decimal and becomes exactly
  360 when `JSON.parse` reads it, so a crafted chart passed the constraint
  and then failed in the app for ever — that member's own chart screen
  erroring on every launch, `chart` immutable, account deletion the only
  exit. The comparisons happen in double precision now, which is the
  arithmetic the client actually uses, with a magnitude guard so a number
  too large to be a double is refused rather than raising.
  That case cannot be written as a TypeScript literal without losing the
  precision that is the point, so the test sends the row as text.
- The migration now has the tests it should have shipped with: the four
  shapes the header names (a placement missing `degree`, missing
  `retrograde`, `house: 77`, `degree: 44`), an `ascendant` of −999, the
  decimal case above, and the service-role write.
- Two claims corrected rather than defended: "field for field" was not
  literally true — the SQL is stricter in three ways no JS client can
  reach, which is the safe direction but not the same thing — and the
  dropped-row warning reaches a developer watching Metro and nobody else,
  which is the whole channel until crash reporting lands.
- Verified: battery green on a clean tree; 104 Supabase tests, 12 mobile;
  `seed-photos.ts` and `make-tester.ts` both run against a fresh reset.

## 2026-09-10 — Mirroring a schema means mirroring all of it

- The shape check I added claimed to mirror `PublicChartSchema` and did
  not: it required a longitude and a sign and nothing else, so a chart
  with no `degree`, no `house`, no `retrograde`, or with `house = 77` and
  `ascendant = -999`, was stored and then failed to parse in the app. That
  member's own chart screen would have shown an error for ever — `chart`
  is immutable after insert, so the only way out is deleting the account —
  and every deck would have quietly dropped their card. It is field for
  field now, including the ranges, and the numeric comparisons are guarded
  by CASE rather than by an earlier OR arm, since Postgres does not
  promise the order of OR.
- **A dropped row is now reported.** Parsing the deck row by row fixed the
  outage but changed its shape: a systemic break — a renamed column, a
  schema change — would render as an empty deck and an empty conversation
  list with nothing in the log, which looks exactly like a quiet day.
  `parseRows` warns with a count, and it is a pure module with its own
  test, because this is the second time the client half of a fix shipped
  without one. The warning reaches a developer watching Metro and nobody
  else — there is no field channel until crash reporting lands.
- The helpers moved to the `private` schema. In `public` they were live
  anon RPC endpoints — `POST /rest/v1/rpc/is_sign` answered, and
  `is_public_chart` chewed through an 8.7 MB payload. Revoking EXECUTE was
  the obvious fix and it broke every insert: a CHECK is evaluated with the
  privileges of whoever is inserting, not the table owner. `private` is
  what keeps them off the API while `authenticated` keeps the grant.
- Also: an unknown city has its own sentence instead of borrowing "pick a
  city from the list", which is what the person just did; and the
  types-drift test has a real timeout, because a cold `gen types` run
  alongside the other suites was failing at five seconds and reading as
  schema drift.
- Verified: battery green on a clean tree; 101 Supabase tests, 12 mobile.

## 2026-09-10 — The other door into the same outage

- The review of the rename commit found that bounding the birth dates
  closed only one of two ways for a single member to blank the deck for
  everyone near them. The other: `chart` was checked for the presence of
  three keys and `big_three` was not checked at all, so an insert could
  carry `{"version":1,"planets":{},"houses":[]}` and `{}`. The row is
  valid JSON and unreadable to the app — and the client parsed the deck as
  one array, so one such profile turned the whole deck into an error state
  for every viewer in radius.
- Closed from both sides. The server now checks the shape it expects: ten
  planets with a sign and a longitude in range, twelve cusps, three real
  signs, mirroring `PublicChartSchema` and `BigThreeSchema`. And the
  client parses row by row, so a row that somehow gets through costs that
  one card rather than the deck.
- **A CHECK that evaluates to null is a pass.** The first version of the
  constraint accepted `big_three = {}` because `->>` on a missing key is
  null, `null in (...)` is null, and the whole expression was null. Both
  helpers coalesce to false now. The test caught it, which is the only
  reason I know.
- Smaller, all from the same review: an unknown city no longer tells the
  person to check a working connection (that happens when the app ships a
  city list the database has not caught up with); the retry waits 400 ms
  and does not retry a missing function or an expired token; `birth_date`
  has the upper bound its migration header claimed; and the three birth
  floors agree instead of carving a one-day hole that reported as bad
  data. The old name is out of the ROADMAP's bundle id — the deploy
  checklist would have reserved `com.oguzpancuk.stardate` against an
  app.json that says juno — and out of the design brief.
- Verified: battery green on a clean tree; 101 Supabase tests, including
  three degenerate charts refused and the neighbouring deck still
  answering.

## 2026-09-10 — The product is Juno, and two ways to break it are closed

- **Name.** The owner chose Juno. Everything a person reads says Juno now:
  the app name and scheme, the bundle id (`com.oguzpancuk.juno` — nothing
  is published yet, so this was the last cheap moment to change it), the
  sign-in mail subject and template, the 18+ line, and the PRD title.
  `stardate` stays as the repo, workspace and local Supabase project name:
  it was only ever the code name once stardate.love turned out to be a
  live astrology dating app. Whether "Juno" is free on the App Store is
  still open for the first deploy session — it is an asteroid used in
  astrology, which fits, but it is a common name elsewhere.
- **One member could darken the app for everyone near them.** A review
  found that `'-infinity'::date` passes the 18+ rule (it is certainly more
  than eighteen years ago) and passes the agreement rule (its wall clock
  and its instant are both infinite and equal) — and then breaks every
  reader, because `discover` and `match_profiles` cast an age from it and
  Postgres cannot turn infinity into an integer. Any viewer whose radius
  covered that profile got a blank deck, with no way back short of a
  delete in the database. Birth columns are bounded now at both ends, and
  a test inserts `-infinity` and then asserts a neighbour's deck still
  answers.
- **The Tijuana case was only fixed on the happy path.** The helper
  swallowed any error and fell back to the device's answer, which the
  server then refused — the same dead end, reached by one transient 5xx.
  There is no fallback now: onboarding writes a row, so it needs the
  network anyway. The call retries once with an 8-second abort (a hung
  request used to leave the button spinning for ever) and a failure is its
  own retryable reason with copy that says what to do, rather than
  "invalid data".
- `dbErrorText` matched `/birth_date/` to decide "you are under 18". The
  agreement rule mentions that column too, so a mismatch told people the
  wrong thing; it matches the constraint name now.
- Verified: battery green on a clean tree; onboarding driven in the
  browser under the new name, with Monrovia 1965 — the sub-minute offset
  case — storing 09:44:30Z, the server's exact answer rather than the
  client's rounded 09:44:00Z; the sign-in mail arrives as "Juno giriş
  kodun".

## 2026-09-09 — The birth check was keeping real people out

- The check compared the device's conversion with Postgres's and refused
  any difference. A review measured that difference across 342,832 pairs:
  **1476 refusals in 21 zones**, some of them ordinary noons. Two causes,
  both real. Historical offsets that carry seconds — Monrovia ran at
  −00:44:30 until 1972, Riyadh until 1947, Dhaka 1941, Tehran 1935 — which
  the engine rounds to the minute. And a flat one-hour disagreement
  between zone database versions for Tijuana 1953–1975, where Node's ICU
  says PDT and Postgres says PST.
- Someone born in Tijuana in 1970 could not create a profile at all, and
  the app could only tell them their data was invalid. The feature built
  to protect people from a stale zone database was turning it into a wall.
- Fixed by removing the second answer rather than widening the tolerance.
  `public.birth_instant(city_id, local)` hands the client the server's own
  conversion; the app uses it for the chart and stores it, so there is
  nothing left to reconcile. The two-way rule stays for the offline
  fallback with a minute of slack — far below the half hour a stale zone
  database costs. Verified in the browser: Tijuana, 15 July 1970, 12:30
  now onboards and stores 20:30Z, which is the server's answer, not the
  device's 19:30Z.
- Three more from the same review:
  - `consent_version` could be walked backwards to a notice that never
    existed. It moves forward only now.
  - `birth_date` and `birth_local` were unrelated columns, so a client
    could present as 36 with a twelve-year-old's chart while the 18+ gate
    read the date. The trigger ties them.
  - `city_zones` kept Supabase's default grants — the one table in the
    schema that did — and the newer security-definer helpers still had
    EXECUTE on PUBLIC. Both revoked.
- The test that was supposed to cover the two-way rule had been silently
  neutered by the column-grant change in the previous commit: it used an
  UPDATE, which is refused by privilege before any trigger runs, so it
  passed even with a plainly wrong instant. Rebuilt on inserts, and a new
  test asserts `city_zones` still matches `packages/geo` — the table is
  generated by hand, and a city added without regenerating would be a
  birthplace the server rejects.
- Verified: battery green on a clean tree; the Tijuana case driven end to
  end in the browser.

## 2026-09-09 — Consent review: a live profile read and a forgeable stamp

- Two blockers in the consent/blocked-list commit, both found by probing
  rather than reading.
- **The blocked list was a profile lookup.** `my_blocks` joined `profiles`
  as its owner, and inserting a block needs nothing but your own id as the
  blocker — so one row opened a live read on any profile id you had ever
  seen: their current display name, every rename, and whether the account
  still existed. Worse, it worked from the side that had already been
  blocked. The name is now snapshotted onto the block row by a trigger and
  the view reads the snapshot: a record of what you blocked, not a window
  on who they are now. A test renames the blocked person and asserts the
  list does not follow.
- **`consent_at` was client-writable.** The stamping trigger fires only on
  an update that names `consent_version`, and `profiles: update own` came
  with a table-wide UPDATE grant, so one REST call could set the KVKK
  timestamp to any value — the one field the whole record rests on. The
  grant is now a column list: display name, gender, interest, location,
  radius, bio, photos and the consent version. Everything else, including
  the birth columns, is refused by privilege before any trigger runs.
  Revoking the single column would have done nothing while the table-wide
  grant stood — that is the part I got wrong the first time.
- `consent_version` is a `date` now, not text with a regex: the regex
  accepted `9999-99-99`, which would also have compared as newer than
  every real version for ever. A CHECK keeps it out of the future.
- **ADR-0007** records the one place the block/deletion indistinguishability
  is deliberately traded: undoing a block restores the match and the
  thread, so lifting one tells the other side they had been blocked. The
  alternative is an irreversible block, which makes a mistap
  unrecoverable. The screen now says what will happen in as many words.
- Also from the review: the consent checkbox named only the compatibility
  purpose while the notice bases location on proximity, so the sentence
  names both; the notice lists the consent record itself as data; a failed
  read on the blocked screen no longer leaves a spinner under an error;
  and an unblock that matched no row is no longer reported as success.
- **Metrics views** landed alongside: onboarding completion, matches,
  two-sided conversations with the ≥ 3 each threshold, and the report
  queue. Aggregates only, and closed to every client — a view carries no
  policies, so the grant is the boundary, and a test proves a member and
  anon are both refused. Sentry stays parked.
- Verified: battery green on a clean tree; 94 Supabase tests;
  `screenshots/v1-blocked.png` shows the screen in the simulator.

## 2026-09-09 — The server checks the birth instant

- A phone with a stale zone database converts a birth time with an offset
  that was right years ago. Nothing downstream can tell: the chart is
  simply wrong by an hour. The server now recomputes the instant from the
  city and the wall clock and refuses a mismatch.
- Built as a trigger rather than the Edge Function the ROADMAP named. The
  check belongs in the write path — an Edge Function only helps if the
  client chooses to call it — and Postgres already carries a full zone
  database. `city_zones` holds the 6594 cities the app can offer,
  generated from `packages/geo` by `supabase/scripts/gen-city-zones.ts`,
  with RLS on and no policies: the app has the list offline, so no client
  needs to read it, and the check runs as definer.
- Two ways to be right, because a wall clock and an instant do not map one
  to one. The instant may render back to the submitted wall clock in that
  zone — the normal case, and the one that takes both readings of the hour
  the clocks go back; or it may equal what Postgres computes from the wall
  clock, which is what an hour that never happened resolves to. Measured
  the disagreement first rather than assuming: for 2021-11-07 01:30 in New
  York the engine answers 05:30Z and Postgres 06:30Z, and both are
  defensible, so both are accepted. An offset that is simply wrong
  satisfies neither.
- Gotcha worth remembering: a plpgsql trigger runs as the invoker, so a
  lookup table with RLS on and no policies reads as empty and the check
  raised "unknown birth city" for every insert. The first test run caught
  it; the function is a definer now.
- Verified: battery green on a clean tree; four new RLS tests (a one-hour
  error, an unknown city, the engine's own instant, and both readings of
  a repeated hour).

## 2026-09-09 — KVKK consent, the blocked list, and a one-sided guard

- **Consent is recorded.** Onboarding carries a checkbox that has to be
  ticked, and the profile stores `consent_version` — no default, so a
  profile cannot be created without one — plus a `consent_at` the server
  stamps, since a client must not be able to claim consent at a time of
  its choosing. The version is a date that mirrors `LEGAL_VERSION` in
  `apps/mobile/lib/legal.ts`; bump both together. Driven end to end in
  the browser: submitting unticked refuses with the copy, ticking creates
  the profile, and the row carries the version and a server timestamp.
- **The blocked list exists.** `my_blocks` is an owner-executed view, so
  it can carry the blocked person's name — `profiles` is not readable
  across accounts, and a list of uuids is no use. `/blocked` shows it with
  an unblock; the other side still sees nothing. Verified in the browser
  including the unblock reaching the database.
- **A one-sided guard, found by review.** The no-rename trigger tested
  only the _destination_ bucket, so an object could be carried _out_ of
  the photos bucket: no delete fires, so the path stayed in
  `profiles.photos` with nothing behind it. Only the service role can do
  it today, and only because the single UPDATE policy on the bucket
  demands `bucket_id = 'photos'` — but RLS policies OR together, so the
  first other bucket with an "own folder" update policy would have opened
  it for everyone, in a migration that would never mention photos. Both
  directions are guarded now, with a test that moves an object into a
  throwaway bucket.
- Also from that review: at exactly 200 objects the cap refused an upsert
  too, because a BEFORE INSERT trigger runs before the conflict is
  resolved — so a full folder could not be emptied through the app at all,
  since the sweep only runs after a successful upload. An upsert of an
  existing name now skips the count, `addPhoto` sweeps and retries once
  when an upload is refused, and `removePhoto` sweeps as well.
- The sweep is deliberately conservative: it only runs once a folder holds
  50 objects or more, and only deletes what the profile does not list and
  what is over a day old. Deleting an unlisted object destroys bytes a
  second device may have just written, so a folder with a normal handful
  of photos is left alone entirely.
- `usePhotoSources` now matches a source to its _path_ rather than its
  position. A path carries the owner's id, so the deck still cannot show
  the previous candidate's face; but removing one photo of six no longer
  blanks the other five while they are refetched. Two more tests.
- `vitest` is now a declared dependency of `apps/mobile` instead of being
  borrowed from the hoisted root copy, and the two new storage assertions
  check what actually refused the write instead of accepting any error.
- Verified: battery green on a clean tree; 86 Supabase tests, 7 mobile
  tests; consent and the blocked list driven in the browser.

## 2026-09-09 — Fourth photos review: the cap that skipped the risky accounts

- The 200-object folder cap was keyed on the owner's profile row, and it
  returned early when there was none. Nothing requires a profile before
  uploading, so an account that signs up and never finishes onboarding
  had no limit at all — the review filled one with 1200 objects. That is
  the same "undeletable account" the cap exists to prevent, aimed at the
  account most likely to be abusive. The lock is now an advisory lock on
  the folder name, which exists whether the profile does or not; it also
  stops one member's upload burst from serialising on a row other queries
  want. The test now fills a profile-less account.
- **`storage.move` could strand a path for ever.** A move fires no delete,
  so the prune trigger never runs and `profiles.photos` keeps the old
  name; since the existence check now only looks at paths being added,
  nothing failed and nothing repaired it, and the profile stayed in every
  nearby deck with nothing behind its photo. Renaming is refused outright
  — the app never renames a photo. Replacing one in place still works.
- **The deck showed the previous candidate's face.** Holding the old
  sources until the new ones arrive is right on the profile screen and
  wrong in the deck: a swipe replaces the name, age and chart at once, so
  for one round trip the photo belonged to the person just swiped past.
  The rule is now "sources belong to the paths they were fetched for, or
  they are not shown", and it lives in `lib/photo-alignment.ts` as a pure
  function with a test — this class of bug has now appeared twice (first
  compacting the array, then holding it over), so it gets a test rather
  than another comment. `apps/mobile` therefore has a test script, and
  the battery runs it.
- Smaller: `addPhoto` sweeps objects in the caller's folder that the
  profile does not list and that are over an hour old, so a folder cannot
  silently fill with invisible files until it refuses new photos; the
  legal text no longer implies a retention period for reports and auth
  audit rows that no job enforces (there is none — it says so); and the
  `/legal` back link is hidden until the session is known instead of
  pointing at the wrong screen and then changing.
- Verified: battery green on a clean tree, now including one mobile test
  file; 81 Supabase tests; deck driven in the browser at 800×900 with the
  swipe landing on the next card's own photo.
- Still open from this review, deliberately: nothing — but the next
  review found two things this round had left open, so read the entry
  above rather than trusting that line. The radius asymmetry stays an
  owner decision, recorded in the entry below.

## 2026-09-09 — Third photos review: the fix that made deletion impossible

- The prune trigger from the previous round created a worse version of
  the bug it was fixing. `storage.remove([a, b])` deletes a batch in one
  statement and AFTER-row triggers run at the end of it, so pruning `a`
  updated `profiles.photos` when `b` was already gone — and the existence
  check on that update then failed on `b`. Every account with two or more
  photos returned HTTP 500 from `delete-account`, permanently. The header
  comment claiming the profile trigger was "skipped by construction" was
  simply wrong: shrinking a list still re-runs the check on what survives.
- Fixed by checking existence only for paths being _added_. An existing
  path is history the prune trigger already maintains. The suite gained
  the case that was missing: an account with three photos in its own
  list, deleted.
- Two more ways to make an account undeletable, both closed: the prune
  trigger cast a folder name to uuid without the guard its sibling read
  policy has, so one object in a non-uuid folder (Studio placeholders,
  any service-role write) could never be deleted again; and the step cap
  added in the previous round turned a large folder into a permanent 500.
  The loop is bounded by progress instead, and a trigger caps a folder at
  200 objects — with the owner's profile row locked first, because
  counting alone is not a limit when inserts arrive in parallel.
- The deck no longer downloads every candidate's photo. Each request is
  authorised now, so fetching the whole deck cost one invocation per
  candidate on every swipe and buffered every image at once; only the
  visible card's photo is fetched. Object URLs are freed after the
  replacement set arrives, not on the way out — revoking in the effect
  cleanup blanked the card the screen was still rendering. Both live in
  one `usePhotoSources` hook so the three screens cannot drift.
- Three corrections to the privacy notice, all found by checking it
  against the running stack rather than against intent:
  - The identity layer stores an IP address and a user agent per session.
    The text said "only the following data"; it now lists them.
  - Auth audit rows outlive a deleted account with the e-mail in them.
    The text named reports as the single exception; now there are two.
  - **The radius asymmetry.** `discover` filters on the _viewer's_
    radius, so a small radius limits who you see, not who sees you. The
    notice implied the opposite and the settings hint did not correct it.
    Both now say plainly that anyone whose own radius reaches you can see
    you. Whether the product should instead require both radii to match
    is an owner decision, not a bug fix — parked here rather than changed.
- Verified: battery green on a clean tree; 80 Supabase tests; deck and
  swipe driven in the browser with one photo request per card and no
  blank card between swipes.

## 2026-09-09 — Photos re-review: a move, a wedge, and the oracle closed

- The photos fix commit came back NEEDS_WORK again. Two blockers, both
  real, both from one root: a guarantee asserted in a comment rather than
  enforced in every policy that could break it.
- **`storage.move` walked around the one-folder-level rule.** The rule was
  added to the insert policy; move goes through the _update_ policy, which
  still only checked the first segment. One move call created
  `<uid>/deep/hidden.png`, and from then on the account could never be
  deleted: a listing returns a folder pseudo-row, removing a folder
  deletes nothing and reports no error, so the loop spun until the worker
  was killed and the photo stayed fetchable by any signed-in member. Fixed
  in `20260909000004`: the update policy carries the same rule, and the
  delete loop walks folders as well as objects under a step cap, so
  neither an old nested object nor a stubborn one can wedge it again.
- **The block-vs-deletion oracle is closed, not narrowed.** Photos are no
  longer served by signed URL. A signed URL is a bearer token that Storage
  validates without consulting the block table, so shortening its lifetime
  only shrinks the window. A new `photo` Edge Function authorises every
  request; blocked, deleted, never existed and malformed all answer 404
  with the same body. Recorded as ADR-0006, because it has a real cost —
  an invocation per photo view and no caching — and the alternative was
  accepting the leak, which is not mine to accept.
- On the web the app fetches the bytes and hands `Image` an object URL:
  `img` cannot send an Authorization header. Screens revoke those URLs
  when they replace or drop a set.
- **The photo gate no longer counts stale strings.** A trigger on
  `storage.objects` prunes a deleted object's path out of
  `profiles.photos`, so a profile cannot delete its object and stay in the
  deck with a blank card.
- Also: the read policy's uuid guard is a CASE rather than two AND terms,
  since the planner does not promise evaluation order; and
  `profiles_check_photos` fixes its search path like every other function
  here.
- Verified: battery green on a clean tree; the new `photo.test.ts` asserts
  that a block and a deletion answer identically, body included; the RLS
  suite proves upload, move and copy all refuse to nest, and that deleting
  an object drops the path and the profile out of the deck; the
  delete-account suite plants a nested object with the service role and
  requires the account to delete anyway.

## 2026-09-09 — Privacy notice at /legal

- Wrote the KVKK notice and licence credits, and rendered them at
  `/legal`, linked from settings and from the sign-in screen under the
  consent sentence. Reachable signed out on purpose: someone deciding
  whether to sign up has to be able to read it first, and on the web
  client this route is the public URL the App Store listing needs.
- The text lives in `apps/mobile/lib/legal.ts`, not in `docs/`. It was
  drafted as a doc first and then moved: two copies of a legal text drift,
  and this one is shown to users, so the app is the canonical place.
- Written from the schema rather than from a template, so every claim is
  checkable: location is rounded to a ~1 km grid before it is stored, the
  birth date/time/city are never shown to anyone (only the chart computed
  from them is), and a report about a deleted account keeps only its
  existence, reason and date.
- Two placeholders are deliberately unfilled — the data controller's name
  and a contact e-mail. Both are owner decisions; publishing the owner's
  personal address is not mine to make.
- Verified: battery green on a clean tree; `screenshots/v1-legal.png`
  shows the screen in the simulator.
- Not done, so the ROADMAP item stays open: `consent_at` is not stored
  and has no CHECK, and nothing is hosted yet.

## 2026-09-09 — Photos review: two leaks and a gate that counted strings

- Review of the photos commit (`1dfce01`) returned NEEDS_WORK with two
  blockers, both proven by probe, both fixed here.
- **Account deletion left photos behind.** `list()` answers 100 objects at
  a time and is not recursive, so a folder with 105 flat objects plus one
  nested kept seven of them, and another signed-in member fetched one with
  HTTP 200 after the account was gone. Fixed by paging until the folder is
  empty, plus a one-folder-level rule on uploads. A test uploads 105
  objects and asserts the folder is empty afterwards. **Corrected later
  the same day:** the claim that a flat listing was therefore "complete by
  construction" was false — the rule sat on the insert policy only, and
  `storage.move` goes through the update policy. See the newer entry.
- **The photo gate counted strings, not objects.** `profiles.photos` only
  had to look like a path, so one invented string put a photo-less profile
  in every nearby deck. The trigger now requires an object to exist behind
  every path. Consequence for tests: a fixture profile has to upload
  before it inserts (`insertProfileRow` in `supabase/tests/fixtures.ts`),
  and the age-rule test carries no photos because the trigger runs before
  the CHECK constraint and would otherwise mask what it asserts.
- **Signed URLs are bearer tokens.** Storage validates the signature, not
  the block table, so a URL handed out before a block keeps resolving
  while a deleted account's stops at once — the two are distinguishable
  inside that window. Not closable with a policy: the TTL dropped from an
  hour to ten minutes, and it is recorded here as a v1 residual. Closing
  it properly means serving photos through a function that authorises
  every request, which is a v1.1 item, not a migration.
- `signedPhotoUrls` no longer compacts its result. One unsignable path
  used to blank the whole batch or, worse, shift the array so one person's
  photo appeared on another person's card. It now returns `null` in place
  and callers pair by index safely.
- Smaller: the read policy's `::uuid` cast is guarded (one non-uuid folder
  name would have broken every `list()` in the bucket for everyone); an
  unknown mime type is refused at the picker rather than uploaded as
  `.jpg`; upload names carry a random suffix so two uploads in the same
  millisecond cannot overwrite each other.
- New tool: `supabase/scripts/plant-session.ts` writes a real session into
  Expo Go's AsyncStorage on the booted simulator, so a screen behind the
  sign-in gate can be screenshotted without typing an OTP (text injection
  into a React Native TextInput still does not work here).
- Verified: battery green on a clean tree; 71 Supabase tests including the
  page-crossing delete, the missing-object path and the nesting refusal;
  `screenshots/v1-profile.png` shows the profile screen in the simulator
  with its photo fetched through a signed URL.
- Gotcha: Expo must be started with `EXPO_PUBLIC_SUPABASE_URL` and
  `_ANON_KEY` in the environment (`contracts/init.sh` does this). Started
  bare, the app boots to a red Zod error from `env.ts`.
- Next: the remaining v1 items — Sign in with Apple, KVKK consent, the
  `birth_utc` validation function, blocked-list screen.

## 2026-09-09 — Design brief; /design-sync not applicable yet

- The owner ran `/design-sync` wanting Claude Design to produce the app's
  UI. That skill goes the other way (it uploads an existing compiled
  component library so the design agent builds with real components);
  stardate has no shared components, tokens or Storybook, so there was
  nothing to sync. No Claude Design project or `.design-sync/` config was
  created.
- Wrote `docs/design-brief.md`: the prompt to paste into claude.ai/design
  plus the full screen inventory with the exact Turkish strings from
  `apps/mobile/lib/strings.ts`, the current provisional palette, the RN +
  web constraints, and the component set to extract. Numbers checked
  against source: 6 photos, 300-character bio, radius presets
  5/25/50/100/500, the six report reasons.
- ROADMAP v1 gained "Visual design (Claude Design)" with its done-when.
  Next: owner runs the design; then implementation with tokens +
  `apps/mobile/components`; only after that does `/design-sync` apply.

## 2026-09-09 — v1 profile photos and bio

- Photos live in a private Storage bucket, one folder per user, read
  through signed URLs. Private on purpose: with a public bucket any URL
  that ever leaks keeps working, which is the wrong default here.
- Storage policies: write, replace and delete only inside `<uid>/`; read
  for any signed-in user except across a block, keyed on the folder name
  through `private.is_blocked`. `profiles.photos` denormalises the ordered
  path list so discover can filter on it, and a trigger keeps every path
  inside the owner's folder and the list at six or fewer.
- `discover` now hides a profile with no photo. The RLS fixtures gained a
  default photo, or every existing discover test would have broken.
- `delete-account` lists and removes the folder before deleting the user:
  storage objects are not rows and nothing cascades to them.
- App: a `/profile` screen for photos and bio, a link from settings, a
  nudge on the chart screen while the profile has no photo, and the photo
  plus bio on the discover card.
- Verified in the browser: bio saved and read back, the photo rendered on
  the profile screen and on a discover card through a signed URL, the
  nudge appearing and disappearing. Not automated: the OS file chooser
  `expo-image-picker` opens; the upload underneath is covered by tests.
- Dev-loop gotcha: `npx supabase db reset` wipes the storage objects, so
  every seeded profile silently drops out of discover until
  `npx tsx supabase/scripts/seed-photos.ts` runs again. The script
  generates a solid-colour PNG per profile with zlib, so no image files
  are committed. Run it from the repo root, not from `apps/mobile`.

## 2026-09-09 — Web client, and what it immediately caught

- `expo install react-dom react-native-web @expo/metro-runtime` plus a
  `web` block in `app.json` (metro bundler, single output) is the whole
  setup; `npx expo start --web --port 8083` serves the same screens. Run it
  with `EXPO_PUBLIC_SUPABASE_URL`/`_ANON_KEY` from `supabase status`: a
  browser on this machine reaches the local stack, so the hosted project
  is not needed to try it.
- Verified in the browser, end to end, as a new user: sign-in with the
  emailed code, onboarding (city search offered İstanbul first for
  "ista"), chart with the interpretation texts, discover with two passes
  and a like, the mutual like opening the match screen, sending a message
  from the composer and receiving the reply, filing a report, and
  blocking — which redirected to an empty match list.
- The web client immediately paid for itself twice. First, it closed the
  two verification gaps the simulator left open: the chat composer's send
  path and the block/report buttons had never been exercised. Second, it
  found a real bug: `Alert.alert` is a no-op in react-native-web, so on
  the web the block confirmation and "Hesabımı sil" did nothing at all.
  Both are in-page confirmations now, which is also better on iOS.
- Reordering ADR-0005 (web before the hosted project) was the right call
  for verification: browser automation drives this app reliably, while the
  simulator dropped synthetic taps on Pressables inside ScrollViews and
  sent typed text to another app.
- Note for the hosted step: nothing here proves the web build works
  against a remote project (CORS on the Edge Function is written for it
  but untested), and there is no static hosting yet.

## 2026-09-09 — Safety fourth pass: a writable view and a leaking note

- `my_reports` was auto-updatable and ran as its owner, and Supabase's
  default grants left `authenticated` with insert, update and delete on
  it. One REST call could rewrite or erase every report an account had
  ever filed — the record the whole design says survives even an account
  deletion. The view is explicitly read-only now, with a test.
- The mask covered `reported_id` but not `note`, so a prober who reports
  every match with a one-character note could sort a block (id null, note
  present) from a deletion (both null) with a single filtered GET. The
  view masks the note the same way.
- Two more claims corrected: a report row is anonymous only once BOTH
  sides are gone, and until then it still carries the surviving person's
  uuid; the client docstring and the ROADMAP said otherwise.
- The mask itself had no test (deleting it left the suite green, because
  the reads happened after the unblock) and only the reporter-deleted half
  of the set-null design was covered. Both sides are pinned now.
- Deck: only a missing counterpart counts as "gone". A 23503 on the
  caller's own profile row (account deleted on another device) used to
  drop cards silently until the deck looked empty; it now falls through to
  the error path.
- The Realtime test was flaky on a cold stack — the first
  postgres_changes binding after a container restart takes seconds, and CI
  runs exactly that cold path. `beforeAll` now does one full warm round
  trip and deletes the primer, so the measured crossing is steady-state.

## 2026-09-09 — Safety third pass: reports and Realtime were reading surfaces

- The third review falsified "no read surface reveals it" again, in two
  places, and both are now closed:
  1. `reports: read own` returned the subject's id, so a prober who
     reports every match on day one later sees the id still there after a
     block while a deletion nulls it. The table is no longer selectable by
     `authenticated`; the reporter reads `my_reports`, an owner-executed
     view that masks a subject who has blocked them, so a block and a
     deletion look identical.
  2. Realtime DELETE events are not RLS-filtered: a subscriber received
     the primary key of matches and messages between other people, and the
     presence or absence of a DELETE told a blocked person which of the
     two had happened. `supabase_realtime` now publishes insert and update
     only; nothing in the app subscribes to deletes.
- The set-null design had no test: cascading both foreign keys instead
  left all 58 tests green. The Edge Function suite now asserts the row
  survives with both ids and the note nulled and the reason intact.
- "What survives names nobody" was false while `note` (free text a
  reporter writes, often a name) stayed. A trigger clears the note as soon
  as either side goes.
- Deck bug from the new likes insert policy: a card belonging to someone
  who blocks you mid-session refused both like and pass and stuck at the
  head. A block or a deleted profile now drops the card, the same as
  having swiped it.
- Residual, deliberate and documented in the migration: write error codes
  still differ (42501 for a block, 23503 for a deletion) on a like or a
  report insert. Closing that needs a tombstone model. Also unbounded: one
  caller can still file one report per reason per person; there is no
  throttle.
- Reading `reports` needs care in tests: `authenticated` has insert but
  not select, so `insert(...).select()` comes back null. Insert, then read
  `my_reports`.

## 2026-09-09 — Safety re-review: the third oracle, and honest claims

- The re-review falsified the previous entry's claim. `likes` still told
  the blocked person what happened: their own like row for the blocker
  survived a block but vanished when an account was deleted, so two REST
  calls named the block. The read policy now hides it and the insert
  policy refuses a like at a blocked person. What is left is a write-code
  difference (42501 for a block, 23503 for a deletion); closing that would
  need a tombstone model, so the claim is now "no read surface reveals
  it", not "indistinguishable".
- `reports.reported_id` had lost its NOT NULL for the set-null path, which
  let any caller insert unbounded rows naming nobody. A before-insert
  trigger requires both sides; nulls can now only come from the FK.
- The unique index was per pair, so a user reporting the same person for
  something worse got "received and will be reviewed" while the row still
  read the old reason. It is now per pair AND reason, so an escalation is
  a new record.
- The preflight test measured the local gateway, not the function: with
  the CORS code deleted it still passed. It now asserts the function's own
  headers on a POST, and the allow-list gained `x-client-info`, which
  supabase-js always sends and whose absence would have broken account
  deletion in the browser the ADR makes the first client.
- Corrected claims: the surviving report row names nobody, so it is an
  anonymous audit trail and not a way to recognise a re-registering
  offender; the migration comment and this file said otherwise.
- Tracked rather than fixed: `unblockUser` stays out of the client until
  there is a screen for it, and the ROADMAP now carries "Blocked list in
  settings". Also unverified: whether Realtime filters DELETE events on
  `matches` by RLS — the shipped client only subscribes to INSERT, but a
  modified one could learn a deletion happened and infer a block from its
  absence.

## 2026-09-09 — Safety review: two block oracles closed

- Review found that the block was announced by two surfaces even though
  the `blocks` row itself was hidden. Both are closed:
  1. `is_blocked` and `match_open` sat in `public`, so PostgREST served
     them as RPC and the blocked person could ask
     `rpc/is_blocked(<uuid>)` and get `true`. They now live in a `private`
     schema, which is not in `config.toml`'s exposed `schemas`, with
     usage and execute granted to `authenticated` only.
  2. `match_profiles` hid the pair but the raw `matches` row stayed
     readable, and "match row present, profile row missing" has one cause.
     The `matches` select policy now carries the same block check, so a
     block looks exactly like the other person deleting their account.
- The discover block and report filters were unpinned: the pair in the
  test had liked each other, so the like filter satisfied the assertions
  and both clauses could be deleted with the suite green. A new test uses
  a pair that never swiped.
- Reports now survive the accounts they are about (`on delete set null`
  on both ids) so a repeat offender cannot clear their record by deleting
  and re-registering; what is kept is reason, note and timestamp. A
  partial unique index makes one report per pair, and the client treats
  the conflict as "already filed". The self-report CHECK had to be
  rewritten for nulls: with both accounts gone the row is (null, null)
  and `is distinct from` was rejecting the second delete with GoTrue's
  "Database error deleting user".
- The report confirmation used to promise "you will never see this
  profile again", which is false on the match screen: reporting is
  one-way and leaves the match and the thread open. It now says the deck
  is cleared and points to Engelle for cutting contact.
- The Edge Function answers a preflight with CORS headers; ADR-0005 makes
  a browser the first reachable client and `functions.invoke` always
  preflights. New tests cover the preflight, an anon or service-role key
  used as a bearer token, and a body naming someone else (ignored; the
  caller is deleted, the named account survives).
- Not done: `deno` is not installed on this machine, so the Edge Function
  is still outside the battery's typecheck and lint. Worth a `deno check`
  step once Deno is available.

## 2026-09-09 — v1 safety controls: block, report, delete account

- Schema (`20260909000002_safety.sql`): `blocks` (one row, two-way effect)
  and `reports` (enum reason plus an optional private note). A block is
  readable only by the blocker, because "you have been blocked" is not a
  fact the app hands out; `is_blocked()` and `match_open()` are security
  definer so the blocked side is shut out without being able to see the
  row. `match_open` replaced `is_match_member` in the message policies, so
  one block closes discovery, the match and the thread for both people at
  once. A report is one-way: it hides the profile from the reporter only.
- Account deletion is an Edge Function (`supabase/functions/delete-account`)
  that verifies the caller with their own token and then deletes exactly
  that auth user with the service-role key; the schema's cascades take the
  profile, likes, matches, messages, blocks and reports. The service-role
  key never reaches the app.
- Verified: battery green; 8 RLS tests (both-way closure, the blocked side
  seeing nothing, unblock restoring the thread, report stored and hiding
  the profile, no editing or withdrawing a report, enum enforced) and 3
  Edge Function tests (401 without a token, 405 on GET, and a delete that
  leaves the other person intact but match-less).
- Found by driving the UI: the safety buttons sat under the home indicator
  on the match screen, the same class of bug as the chat composer earlier
  today. Both screens now pad by the safe-area inset.
- NOT verified: the block and report buttons' wiring. Injected taps do not
  reach a Pressable inside this screen's ScrollView (Links directly above
  it work, and Pressables in a plain View work with a press-and-hold), so
  no observed press. The database behaviour behind them is covered by the
  tests above. Same standing gap as the chat composer's send button.
- Gotcha: a new Edge Function is copied into the edge-runtime container at
  `supabase start`; restarting the container is not enough, the stack has
  to be stopped and started or the endpoint stays 404.

## 2026-09-09 — Chat review fixes, city search, location refresh

- Chat review (code-reviewer, NEEDS_WORK → fixed in `9ac71ae`): a matched
  user could set `created_at` and `read_at` on insert. A chosen
  `created_at` pins that message as the other person's conversation
  preview forever (no delete, no unmatch in v1); a preset `read_at` posts
  a message that never counts as unread. Both are now stamped by a
  before-insert trigger, the receipt cannot be cleared or backdated, and a
  CHECK holds `read_at >= created_at`. Also: `is_match_member` pins
  `search_path` to '', the conversation list refetches on focus (the badge
  used to stay stale after reading), `fetchMessages` takes the newest 200
  descending (an unbounded ascending query freezes at PostgREST's 1000-row
  cap), `markThreadRead` reports failures, and a ref guards double-tap
  send. Two new RLS tests cover the timestamp invariants.
- City search (`1a7e73d`): tiered matching plus 53 Turkish exonyms. The
  reviewer caught that a half-typed exonym outranked real names ("is" gave
  İskenderiye before İstanbul); exonym prefixes now sit after whole-name
  matches, with a test.
- Location refresh: `lib/location.ts` holds the one-shot fix shared with
  onboarding, `updateLocation` writes the point, settings has "Konumu
  güncelle" with working/done/failed states.
- Commit hygiene: `9ac71ae` mixed three unrelated changes (chat fixes, the
  geo ranking fix, the location feature) because everything was staged
  together; the message only describes the chat fixes. Not rewritten
  (history rewriting is ask-tier); recorded here instead.
- Simulator gotchas worth keeping: the `pati` dev build
  (`com.oguzpancuk.pati`) competes for `exp://` AND for keyboard focus —
  typed text landed in it for most of this session until it was
  terminated with `simctl terminate`. After that, text entry into a React
  Native TextInput works. Some Pressables need a press-and-hold
  (`touch_path` with ~130 ms) rather than an instant tap. The chat
  composer's send button was clipped under the home indicator (no safe-area
  inset) — found by driving the UI, fixed with `useSafeAreaInsets`.
- Verified: battery green; location change observed in the database
  (`screenshots/v1-location.png`). NOT verified: a message sent from the
  app's own composer. Text now reaches the composer and the send button
  enables, but no send was observed completing; the insert path is covered
  by the RLS suite, the UI wiring is not.

## 2026-09-09 — v1 chat (unattended session)

- Done: `messages` table with `is_match_member()` (security definer,
  search_path pinned, execute granted to authenticated only) behind every
  policy; insert pins `sender_id` to the caller; update is limited to the
  recipient and, by trigger, to `read_at`; no delete policy; table added
  to the Realtime publication. `match_profiles` extended with
  `last_body`/`last_at`/`last_sender_id`/`unread_count` (lateral joins), so
  the conversation list needs no second query.
- App: `lib/chat.ts` (Zod rows, `useThread` with postgres_changes filtered
  by `match_id`, merge-by-id so a row arriving twice renders once),
  `/chat/[id]` with the starter pinned above the thread, matches screen
  turned into a conversation list (last message, "Sen:" prefix, unread
  badge), match screen links into the thread.
- Behaviour fixed mid-session: the thread first marked messages read from
  the Realtime handler, so a backgrounded (still-mounted) thread marked
  them read while the user was on another screen. Read receipts now fire
  only from `useFocusEffect` and from a focused-guarded effect. Verified
  both ways in the simulator against the database.
- Verified: battery green on a clean tree; 8 new RLS tests; a Realtime
  test measuring the crossing (346 ms against a 2 s budget) that also
  asserts an outsider receives nothing; `screenshots/v1-chat.png` (peer
  message arriving live in the open thread) and
  `v1-conversations.png` (unread badge, last message).
- NOT verified: sending a message from the app's own composer. Text
  injection into a React Native TextInput does not work in this
  simulator setup (taps and swipes do; `simctl` typing and clipboard
  paste both fail, with and without the hardware-keyboard default). The
  insert path is covered by the RLS tests instead. Also not done: two
  real simulators side by side; the peer was a service-role script
  (`supabase/scripts/seed-message.ts`).
- Gotchas: Metro in CI mode does not regenerate `.expo/types/router.d.ts`
  when a route file is added — restart Expo or typed `href`s fail to
  typecheck. A simulator session can be planted by writing the
  supabase-js session into Expo Go's AsyncStorage
  (`…/ExponentExperienceData/@anonymous/<slug>/RCTAsyncLocalStorage`, key
  `sb-127-auth-token`, value in a file named by the key's MD5 when over
  1 KB); `supabase/scripts/make-tester.ts` creates the matching profile.
- Next: profile photos + bio (Storage policies), then safety controls.

## 2026-09-09 — App name: constraint and shortlist

- Owner ruled out Turkish names: the shipped app name must not be Turkish
  (the Turkish UI stays; only the product name is affected).
- `stardate` cannot ship as the product name: stardate.love is a live
  astrology dating app. It stays as the repo/code name only.
- Checked and taken: Trine (a synastry match app), Midheaven, Yildizname,
  Zodya. Synastry is generic and cannot be owned.
- Shortlist with no App Store hit found: Conjunct (recommended),
  Luminaries, Perihelion; Syzygy has minor developer-name collisions.
  Trademark (Turk Patent, USPTO) and domain checks are still not done.
- Open: owner picks the name, then Expo config, app.json, strings and
  store metadata are renamed in one commit.

## 2026-09-09 — Owner sign-off on the interpretation texts

- Owner approved the Turkish content as of `459ce54` ("metinleri
  onaylıyorum"). ROADMAP v1 item "Full Turkish content" closed; its
  done-when is now fully met (completeness test, screenshots, sign-off).
- Owner asked for app name proposals; recorded in the next entry when a
  name is chosen.

## 2026-09-09 — Layering guarantee: rules test + full-pair judgment

- Owner approved the three-layer guarantee for sign/house/aspect text
  consistency (the astrological standard covers score vs aspect text;
  sign-vs-house consistency inside one reading is our own layering rule).
- Layer 1+2 (`packages/astro/src/content-rules.test.ts`, in the battery):
  house texts carry no sign-owned tempo/temperament words; aspect texts
  carry no sign names or element flavour (whole-word Turkish match); no
  sentence repeated between sign and house layers; all 1,440 planet
  sign+house pairs scanned for antonym pairs (stem match, so Turkish
  suffixes count) and for any shared 4-word sequence. The antonym scan is
  a regression guard: on today's corpus no pair fires; consistency itself
  was established by the evaluator passes below.
- Layer 3 (one-off): five evaluator passes judged every one of the 1,440
  pairs twice. First pass flagged 190 (house texts asserting tempo,
  visibility or dignity; outer-planet sign texts written as life areas).
  Response: 115 of 120 house texts rewritten to life area + behaviour
  across the range (97 in `e9ce67c`), 52 Jupiter–Pluto sign texts
  rewritten to temperament. Second
  pass flagged 111, mostly natural-house restatements (Leo/5, Virgo/6 …)
  and a few residual mode claims in house texts; ~70 texts rephrased with
  distinct vocabulary. Rewritten texts re-audited against the references:
  houses 117/120, outer signs 56/60, deviations applied.
- Known residual, accepted: a sign and its natural house share a theme by
  definition; texts now differ in wording and in mode (how vs where) but
  a reader will still see the theme twice in 1/12 of placements.
- Verified: battery green; astro 236 tests. Not verified: no third
  judgment pass; no screenshots (text-only change).

## 2026-09-08 — Owner decision: compatibility stays purely geometric

- Owner confirmed the scoring model: the score comes only from inter-chart
  aspects, weights, orbs and the Sun/Moon element bonus (ADR-0003). The
  natal character texts are not an input, and no semantic trait-matching
  layer will be added; "if the astrology is right, the system is right".
- Consequence: text-to-score consistency is guaranteed by construction
  (each scored aspect shows its own text, direction checked mechanically
  for all 469 aspect keys). Sign-text vs house-text consistency within one
  reading is our own layering rule, not something the sources guarantee;
  the mechanical guards for it (lexicon lint and full 1,440-pair scan) are
  proposed, not yet built.

## 2026-09-08 — Content verified against references; geometry–meaning coherence

- Owner asked (a) that every chart text be interpreted correctly and
  (b) that the geometric match (score, strongest aspect) really agree with
  the written characters. Method for (a): four researcher passes built a
  keyword table per key from two independent public references per layer
  (list and URLs in `docs/astro-sources.md`); four audit passes judged
  every text for semantic match and direction. Result: signs 132 (4
  fixed), houses 120 (2), natal aspects 214 (8), synastry 255 (15);
  commits `00f4f53`, `54bceb8`, `057efc6`, `f4c2cf1`. Reference tables
  live only in the session scratchpad; the document records sources and
  method, not the tables.
- Method for (b): `packages/astro/scripts/content-audit.ts` renders a
  coherence report for seven sample pairs (fixture user + seeds) plus a
  lexicon-based sentiment-direction check against ADR nature; an
  evaluator-qa pass judged it NEEDS_WORK with eight concrete findings, all
  applied to the texts (not the samples) in `54bceb8`: sign-flavoured
  aspect texts made sign-neutral, Uranus conjunctions framed as "one shakes
  the other's patterns", the "high" band no longer promises excitement the
  aspect list can contradict, house texts reframed to the life area so
  they stop contradicting the sign text's tempo (Mars Taurus "slow" vs
  1st house "fast"), duplicate phrases between sign and house removed.
  Layering rule now written in `docs/astro-sources.md`.
- Engine: ADR-0003 amendment 1 (`af86641`) — an opposition to the
  Ascendant is a Descendant conjunction and scores +4, texts rewritten in
  that framing. Observed but NOT changed (owner call): the tight-orb bonus
  can rank a 0.3° Venus–Jupiter square above a 4° Venus–Mars conjunction
  as the headline aspect (Ayse × Deniz); the harmonious preference in
  `strongestOf` only applies within 10 %.
- Remaining sentiment-audit flags (3) are lexicon false positives
  (sun-square-jupiter, venus-square-uranus, uranus-sextile-ascendant).
- Verified: battery green on each commit; astro 228 tests. Not verified:
  no new screenshots (UI unchanged); references were read through a fetch
  summariser, not raw pages — a spot check of any line is cheap before it
  becomes marketing copy.
- Still open: owner sign-off on the texts (ROADMAP item stays `[~]`);
  composite sign+house texts (1,440 keys) deliberately not written.

## 2026-09-08 — Interpretation content (owner priority)

- Owner asked for professional, 1–2-sentence analysis of every chart and
  compatibility combination without drowning the user. Built:
  `packages/astro/content/tr/` — signs 132, houses 120, retrograde 8,
  natal aspects 216 (45 body pairs × 5 minus 9 geometrically impossible
  Sun–Mercury/Sun–Venus/Mercury–Venus hard aspects), synastry 255 (51
  pairs × 5, each meaning + opening question), Sun/Moon element pairs 20,
  score bands 5 — 756 texts, Zod-validated, `content.test.ts` enumerates
  every key the engine can emit and fails on a missing or unknown key
  (generational outer–outer pairs are excluded from both engine and key
  space). Engine: `natalAspects`, `natalReading`, `synastryReading`,
  `starterFromKey`. UI: chart screen shows sign + house + retrograde
  lines per planet and the strongest natal aspects with orbs; discover
  card has an expandable detail (band, elements, top 3 aspects); match
  screen shows the pair-specific starter (headline, meaning, question),
  score band, element lines and top 5 aspects.
- Quality pass: the first draft of the 300 outer-planet entries was
  telegraphic ("… fazla vaat. Ölçü."); all rewritten as full sentences in
  `b0fd8cf`. Voice: natal texts address the user ("sen"), synastry texts
  describe the pair neutrally so one text serves both viewers; the
  mechanical headline is oriented per viewer by the engine.
- Verified: battery green (astro 218 tests); `screenshots/c1-chart-texts.png`,
  `c1-aspects.png`, `c1-synastry.png` on the real user (Ayse / Deniz).
  Not done: owner sign-off on the texts (the done-when's last clause);
  ROADMAP item marked in progress until then.
- Review (code-reviewer, pass 1 NEEDS_WORK → this commit): Saturn
  conjunctions to Moon/Venus/Mars score as tension (ADR −4) but the
  synastry texts sold them as the safest bond — rewritten as heavy-but-
  binding; `IMPOSSIBLE` now also excludes Sun–Mercury and Sun–Venus
  sextiles (a sextile needs ≥ 56° separation; max elongations are 28°/48°)
  so natal texts are 214; the completeness contract is now engine-derived
  (a test synthesizes every pair at every angle and asserts the emitted
  aspect resolves to a text), `natalAspects` has a direct fixture test, and
  a "≥ 4 words per sentence" test enforces the 1–2-full-sentence brief —
  it caught 139 telegraphic tails, all rewritten; same-body texts no longer
  claim "same sign" (conjunction is longitude-based); match/discover show the viewer-oriented headline ("Ay'ın onun
  Satürn'üyle …") instead of a neutral "Ay kare Satürn" — landed in the
  follow-up commit: the first attempt's text replacement had silently
  missed and an earlier version of this note wrongly claimed it; the
  reviewer caught it; `natalReading` drops a geometrically impossible
  pair from a tampered row instead of throwing; dead placeholder starter
  code removed; duplicate question fixed.
- Review pass 3: PASS for the whole content range. `c1-synastry.png`
  recaptured with viewer-oriented headlines. Open: owner sign-off on the
  texts; reviewer's remaining minor is a third copy of the outer-planet
  set in the test (engine, content, test) — export one when convenient.
- Gotchas: `exp://` is claimed by both Expo Go and the pati dev build on
  this simulator, so `openurl` sometimes fronts pati and typed text lands
  there — `xcrun simctl launch booted host.exp.Exponent` before typing.
  An expired session once left the app on "Yükleniyor…" with no network
  request until Expo Go was relaunched (then it resolved to signed-out);
  not reproduced, worth watching (v1 SecureStore/session item).
  `prettier --write` must include `packages/astro/content` after regenerating
  JSON from Python (indent differs).

## 2026-09-08 — S7 match + conversation starter

- Done: `starterSentenceTr` (astro), `lib/matches.ts` (Zod rows from
  `match_profiles`, `useMatchListener` on Realtime `postgres_changes`
  INSERT for `matches`), `/match/[id]`, `/matches`, discover nav link,
  `seed-like.ts` (service role, refuses non-local URLs). S6 review fixes
  landed in `5eb862e` (deterministic tie-break — documented as not
  mirror-invariant on exact ties, harmless because keys are computed in
  a<b order; element bonus from stored signs; settings guards; the root
  `tsconfig.json`/`lint` script that `expo lint` had scaffolded removed).
- Verified: battery green (astro 186). Simulator: `seed-like.ts
t3@stardate.local deniz` wrote Deniz → Ayse (`jupiter-square-venus`,
  Deniz is `a`); Like on Deniz produced one `matches` row and the match
  screen opened at once via Realtime, showing "Venüs'ün onun Jüpiter'iyle
  kare açı yapıyor. Sürtüşme de çekim demek; …?" from Ayse's side
  (`screenshots/s7-match.png`); the matches list shows the same
  (`s7-matches.png`).
- Gotchas: RN `textTransform: 'uppercase'` maps Turkish i → I (rendered
  "EŞLEŞTINIZ"); pre-uppercase Turkish strings instead. Prettier flips the
  indentation of a code span broken across lines in a Markdown list —
  keep code spans on one line. `expo lint` from the repo root scaffolds
  `eslint.config.js`, `tsconfig.json` and a `lint` script at the root;
  always run it inside `apps/mobile`. Python edit scripts must be
  idempotent and assert every anchor; this session lost edits three
  times to prettier reformatting anchor text between runs.
- Review (code-reviewer, S7 pass 1 NEEDS_WORK → `bb69a60`): the tie
  test was a tautology (now pins the winner and input-order independence);
  the liker now checks `match_profiles` right after a like instead of
  relying on the Realtime socket; `isLesserId` single-sources a<b order;
  `s7-match.png` retaken after the kicker fix. `expo lint` caches under
  `apps/mobile/.expo/cache` and kept reporting a parse error that no
  longer existed, so the app's lint script runs `--no-cache` (commit
  `bb69a60` was cut while that stale FAIL showed; the tree was clean by
  every other check and is re-verified in the next commit).
- `contracts/init.sh` boots Supabase + Expo (8082) with the local keys;
  from an agent shell run it detached (`bash contracts/init.sh > log &`):
  run inline, the Bash tool waited on Expo's process group for 10 min.
- S7 review pass 2: PASS. Reviewer saw one unreproduced supabase test
  failure in six battery runs (name not captured); `vitest.config.ts`
  already serialises files and sets a 60 s hook timeout — watch for it in
  CI, and capture the failing test name if it recurs.
- evaluator-qa (fresh context, HEAD 6a4636a/3fdc69d): NEEDS_WORK on
  evidence, PASS on function — battery green on clean HEAD twice, `npm ls`
  clean, 27/27 RLS tests ×7 (the flake did not reproduce), every
  screenshot matches its clause and the fixture, live deep-link
  re-observation of chart/discover/matches/match agreed with the
  committed images, DB rows as claimed. Gaps and what was done: (1) S7
  Realtime delivery to the _liked_ side is unobserved (no second client)
  — ROADMAP S7 now says so and points at the v1 two-simulator check;
  the liker-side Realtime delivery was observed before the direct
  `match_profiles` check existed. (2) `s5-chart.png` shows 8 of 10 rows —
  `s5-chart-2.png` (scrolled) adds Neptün and Plüton. (3) The midnight
  user's DB row was wiped by a later `db reset`; the observation stands
  as recorded (`birth_utc 1995-07-13T21:10Z`) but is not re-verifiable
  without re-onboarding — re-check it in the v1 server-side validation
  item. (4) Review marker lagged HEAD by one docs commit — final review
  requested on the closing range.
- Walking skeleton complete (S0–S7). Skeleton exit items still open:
  remotes + CI never run (no GitHub remote; creating one is outward-facing
  and waits for the owner), code-reviewer on S7, evaluator-qa after this
  unattended run.

## 2026-09-08 — S6 discover with compatibility

- Done: `packages/astro/src/compatibility.ts` (ADR-0003 verbatim: body
  weights, aspects/orbs/bases, outer-orb ×0.75, Saturn −4 override,
  tight-orb ×1.25 capped, element bonus, damped score, strongest with
  harmonious preference; `starterKey` oriented a<b), Turkish aspect text
  (`describeAspectTr`), seed generator (`supabase/scripts/gen-seed.ts`,
  run with `npx tsx`, output committed as `seed.sql`), discover +
  settings screens, swipe library with 23505 tolerance, account-switch
  link on onboarding, auth error mapping keyed on GoTrue codes.
- Verified: battery green (astro 184 tests incl. the hand-built pair —
  found by a one-off greedy search because eleven bodies per chart make
  an aspect-free layout impossible by hand, then hand-verified: H = 3+2+2,
  T = 1.35 → 65). Simulator, user "Ayse" (fixture #1, woman, wants men):
  discover shows Kaan 72 / Emre 60 / Deniz 59 (men; women and the Ankara
  seed excluded); Pass on Kaan and Like on Emre write `likes` rows (the
  like carries `sun-trine-venus`, oriented with Emre as `a`); re-entering
  discover shows only Deniz; settings 500 km makes Burak (352 km) appear.
  `screenshots/s6-discover.png`, `s6-radius-500.png`; `s5-chart.png`
  recaptured with the final strings.
- Gotchas: Expo Go's floating dev-menu gear sits exactly over a top-right
  link, so navigation in tests goes through deep links
  (`exp://127.0.0.1:8082/--/discover`); `expo lint` run from the repo
  root generates a stray root `eslint.config.js` (deleted); the remote
  gate hooks scan the whole Bash command text for the deploy verb, even
  inside heredoc comments — phrase docs as "hosted project" instead;
  Expo Go keeps stale JS across `expo start` restarts until the app is
  terminated and reopened.
- Next: S7 match screen + starter (Realtime on `matches`); the seed can
  make a seeded user like the tester via a service-role script.

## 2026-09-08 — S5 sign-in, onboarding, chart screen

- Done: `apps/mobile` screens — sign-in (email OTP: `signInWithOtp` +
  `verifyOtp`, session in AsyncStorage), onboarding (name, gender,
  interest, offline city search, date + mandatory time, calendar and 18+
  checks mirroring the DB, one-shot device location with a 5 s timeout
  and city-centre fallback), chart (big three badges, ten planets with
  sign/degree/house/retrograde and placeholder Turkish lines, sign-out).
  `lib/profile.ts` computes the chart on device, stores the `PublicChart`
  form (no engine input) and reads rows back through Zod; `lib/errors.ts`
  maps auth/Postgres error codes to Turkish (raw provider text never
  reaches the screen); 23505 on insert routes to the chart (lost response
  after a committed insert). `packages/astro` gained `PublicChartSchema`,
  `toPublicChart` (boundary-safe rounding: 359.99996 → 0, sign/degree
  derived from the rounded longitude), `bigThree`, Turkish names and
  `formatDegree`; `packages/geo` gained `isValidCalendarDate`.
- Verified: battery green; `screenshots/s5-chart.png` shows fixture #1
  (İstanbul 1995-07-14 03:30) and every visible value equals the Swiss
  Ephemeris fixture (Sun Yengeç 21°08′ 2. ev … Plüton Akrep 27°59′ R);
  the DB row has `birth_utc` 00:30Z, i.e. Hermes' Intl agrees with Node.
  `screenshots/s5-midnight.png`: a second user born 00:10 local resolves to
  1995-07-13T21:10Z — no ICU "24" hour quirk on Hermes/iOS. Both users
  denied location; the stored point is the snapped city centre.
- Manual-test hygiene: `db reset` wipes local users, and Expo Go keeps the
  JS app alive across it — the chart screen can show a profile that no
  longer exists until a sign-out. The RLS suite must not assume an empty
  DB (one test did; fixed to assert absence of fixture users).
- Dev loop: keys are passed as `EXPO_PUBLIC_*` env vars on the `expo
start` command line (the `.env` write was refused by the tool
  permissions; `.env.example` documents the variables). Port 8082, `--clear`
  after route changes; typed routes regenerate on `expo start`.
  Simulator typing drops characters occasionally (a "14" arrived as "1",
  an e-mail lost its tail, autocorrect turned "Gece" into "Hence") —
  always screenshot before submitting.
- Review (code-reviewer, S5 pass 1 NEEDS_WORK → fixes in this commit):
  location call could hang submit forever; boundary rounding could throw
  a ZodError on a valid chart; 30 Feb passed the UI check; English error
  text; duplicate-profile dead end; `zod` undeclared in the app; effect
  refetch keyed on session object; `expo-location` plugin with a Turkish
  purpose string. v1 gains "session in SecureStore".
- Known: two clients on different engine versions produce different
  starter keys and can never match (trigger refuses) — the v1 app-update
  story must version the key or the engine (noted for S7).
- Next: S6 discover + compatibility.

## 2026-09-08 — S4 backend skeleton with RLS

- Done: `supabase init` (CLI 2.117, Postgres 17), migration
  `20260908000001_skeleton.sql` (see ROADMAP S4 for the schema), empty
  `seed.sql`, and `supabase/` as a workspace holding the Vitest RLS suite
  (`tests/local.ts` reads keys from `supabase status -o json`; users are
  created through the admin API and signed in with supabase-js, so every
  assertion goes through PostgREST + RLS exactly as the app will).
  ADR-0002 amended: supabase/ is a workspace for its tests only.
- Design choices worth knowing: `discover` and `match_profiles` expose
  `chart` (planet and house placements) so the client can score
  compatibility in S6 — positions reveal roughly the birth date and hour,
  which the profile's age already half-reveals; the chart column is the
  `PublicChart` shape exported by `@stardate/astro` (`toPublicChart`
  strips the engine input; a CHECK rejects input keys server-side). The
  starter is a constrained `starter_key` ("<planet of a>-<aspect>-<planet
  of b>", a < b by uuid) computed by each liking client; the match trigger
  requires both keys to agree and clients render the Turkish sentence
  from the key, so no free text crosses users. Locations snap to a 0.01°
  grid (≈1 km) because a km-rounded distance from a freely movable caller
  is otherwise trilaterable. Birth data + chart are immutable after insert
  (the trigger also binds service_role: a v1 re-onboarding function must
  delete and reinsert). Anon is revoked from all tables and views.
  `birth_local` is stored for the v1 server-side re-validation of
  `birth_utc`. Review (3 passes, PASS): the first version lost a match when
  two likes raced (fixed with a pair advisory lock, proven with two psql
  sessions) and copied client free text onto the other user's match.
- The test-only RPC `profile_location_text` lives in `seed.sql` (local
  reset only), so the hosted schema carries no coordinate-reading function.
  `supabase gen types` still lists it locally; the drift test compares
  against the local DB, which is the intended contract.
- Auth config only governs the local stack; the hosted project's auth
  settings and the two `{{ .Token }}` e-mail templates must be applied at
  first deploy (/deploy-checklist item). `db reset` does not restart Auth:
  config.toml changes need `supabase stop && supabase start`.
- Verified: `npx supabase db reset` applies the migration; 15 RLS tests
  pass against the local stack; full battery green on clean HEAD. CI now
  runs `supabase start` before `verify.sh` (not yet exercised — no remote).
- Gotchas: `npm install -w supabase <pkg>` silently recorded nothing the
  first time (the workspace had just been added); always check the
  manifest after an install. `supabase start` was launched before the
  migration existed, so `db reset` was needed once.
- Next: S5 sign-in + onboarding + chart screen in the app.

## 2026-09-08 — S3 birth place → UTC (`packages/geo`)

- Done: new workspace `packages/geo` (config mirrors astro). Data:
  `scripts/build-cities.mjs` turns GeoNames `cities15000.txt` into
  `src/data/cities.json` (6 596 cities: all 431 Turkish entries + world
  ≥ 100 k population; lat/lon rounded to 4 decimals; 1.04 MB; prettier-
  ignored, byte-canonical). GeoNames is CC BY 4.0 — attribution must
  appear in the app's about/legal screen (added to the v1 KVKK item).
  `searchCities` folds Turkish dotted/dotless i and other diacritics;
  `localToUtc` uses `Intl.DateTimeFormat` parts to find the offset,
  checks candidate offsets from ±1 day, picks the earlier instant on
  overlap and the pre-transition offset in a gap. `resolveBirth` joins
  city + wall time into `{ utc, latitude, longitude }`.
- Verified: battery green; geo suite covers the four astro fixtures,
  Turkey's 2016 permanent +03 switch, a 2015 DST gap and overlap,
  New York, validation (unknown zone, 30 Feb, out-of-range). Node's full
  ICU is the tzdata here; the simulator check that Hermes' Intl agrees is
  an S5 done-when addition (see ROADMAP S5).
- Owner instruction this session: proceed through the skeleton without
  asking; pushes remain ask-tier.
- Next: S4 Supabase schema + RLS (Docker and Supabase CLI 2.117 present).

## 2026-09-08 — S2 Ascendant, MC, Placidus houses

- Done: `packages/astro/src/houses.ts` — RAMC from astronomy-engine's
  Greenwich apparent sidereal time + east longitude, true obliquity of
  date from `e_tilt`; Ascendant and MC closed-form; cusps 11/12/2/3 by
  fixed-point iteration on right ascension (semi-arc thirds), 4–9 by
  opposition; `houseOf(longitude, cusps)` assigns houses. `computeChart`
  now returns `houses` and each placement carries `house`. Zod caps
  |latitude| at 66° with a Placidus message (ADR-0004).
- Verified: battery green (124 Vitest cases). Ascendant, MC and all 12
  cusps agree with the Swiss Ephemeris fixtures within 0.2″ on all three
  charts, including Helsinki at 60°N; every planet lands in the same house
  as the reference (like-for-like `houseOf` on the fixture values).
- Review (code-reviewer, 2 passes, PASS on b4e0d5f..HEAD): planet houses
  now judged against `swe.house_pos` in the fixtures (independent oracle),
  Sydney 1988 southern fixture added (cusps ≤ 0.19″), cusps typed as a
  12-tuple, non-convergence throws, latitude cap is one refine. Lesson:
  I reported a direct `computeHouses` throw test as added when a text
  replace had silently missed; the reviewer caught it. Assert replacements
  (`assert old in s`) so a miss fails loudly.
- Next: S3 birth place → UTC (offline city list, IANA zone via Intl).

## 2026-09-08 — S1 planets in signs

- Done: `packages/astro` `computeChart({ utc, latitude, longitude })` →
  ten placements (longitude, sign, degree, retrograde) via
  `Ecliptic(GeoVector(body, utc, aberration=true))`, i.e. true ecliptic and
  equinox of date, which is what the tropical zodiac needs; retrograde is
  the sign of the 1-hour longitude difference. Zod schema on the input and
  on the fixtures. `sunLongitude` now delegates to the same path.
- Reference oracle: astro.com has no fetchable chart API, so the fixtures
  come from the Swiss Ephemeris itself (pyswisseph 2.10.03, Moshier mode,
  `scripts/gen-fixtures.py`, dev-only venv, never in the battery). Three
  charts: Istanbul 1995, Ankara 1990, Helsinki 2001 (60°N, for S2). Each
  fixture also carries Ascendant, MC and Placidus cusps for S2.
- Verified: battery green (40 Vitest cases). Max deviation from Swiss
  Ephemeris across all 30 planet positions: 13.6″ (Saturn, Helsinki);
  typical < 5″. Retrograde flags agree on all 30.
- Gotchas: macOS has no `timeout`; earlier "timed out" commands silently
  never ran. `z.record(enum, …)` in zod 3 makes keys optional — the fixture
  schema builds an explicit object instead.
- Review (code-reviewer, 2 passes, PASS on e342576..HEAD): retrograde
  moved to a central difference (t ± 30 min) with a regression test on
  Mercury's 2024-01-02 ~03:07Z station checked against pyswisseph; fixture
  directory prettier-ignored so `gen-fixtures.py` output is byte-canonical
  (rerun after commit is a no-op); ADR-0004 names the real oracle.
- Next: S2 Ascendant + Placidus (fixtures already hold the reference).

## 2026-09-08 — S0 walking skeleton: environment boots, battery green

- Done: root npm workspaces (`apps/*`, `packages/*`), `tsconfig.base.json`
  (strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes),
  Prettier root config; `packages/astro` with `astronomy-engine`, Vitest
  and typescript-eslint strict-type-checked, one real test (Sun sign +
  longitude for J2000 and 1995-07-14 vs astro.com, 1° tolerance);
  `apps/mobile` from `create-expo-app` blank-typescript (Expo SDK 57,
  RN 0.86, React 19.2, TS 6.0) converted to Expo Router (`app/_layout.tsx`,
  `app/index.tsx`), bundle id `com.oguzpancuk.stardate`, typed routes,
  `eslint-config-expo` flat config.
- Verified: `bash .claude/hooks/verify.sh` → ok typecheck / lint / format /
  tests; `screenshots/s0-boot.png` shows the app in Expo Go on iPhone 17
  simulator (Metro bundled `expo-router/entry`, 1263 modules).
- Gotchas: port 8081 is held by the pati project, use `--port 8082`; after
  switching `main` to `expo-router/entry` Metro needs `--clear` once;
  `npx expo install` dev deps take `-- --save-dev`; `npx prettier --write .`
  reformatted template-origin files (.claude/, contracts/, CLAUDE.md), so
  those are now in `.prettierignore` and were reverted. Local Node is 24,
  CI is 22; `.nvmrc` says 22.
- Review (code-reviewer, 3 passes, final APPROVE on a395291..HEAD):
  fixed `.js`-suffixed imports (Metro does not remap to `.ts`), lockfile
  drift (`npm dedupe`; gate is `npm ls` exiting 0 after `npm ci`, not a
  green battery), `normalizeDegrees`/`signOf` edge cases, explicit 1°
  tolerance, mobile tsconfig extending the shared base, splash plugin,
  dev-dependency placement, and the template-expression lint override
  spelled out in full. Fresh iOS bundle re-verified with curl after the
  fixes (1295 modules, HTTP 200).
- For S4: Deno resolves relative imports literally, so a Supabase Edge
  Function cannot import `packages/astro` source as-is. Either bundle
  astro for Deno (esbuild) or switch astro to `./x.ts` import suffixes
  (`allowImportingTsExtensions`; Metro, Vite and Deno all accept them).
- Not done: no remotes/CI run yet (skeleton exit item); the S0 test is the
  only engine coverage.
- Next: S1 (planets in signs, 3 astro.com fixtures).

## 2026-09-08 — owner answers to PRD open questions

- All 8 answered: offline geocoding; standard synastry method researched
  and fixed as ADR-0003; Claude authors the ~360 Turkish snippets, owner
  reviews; distance filter (radius, default 50 km) replaces same-city;
  reports-only moderation; gender kadın/erkek/belirtmek istemiyorum,
  interested in kadın/erkek/herkes; developer name oguzpancuk, Apple
  membership status unknown; birth time mandatory (no unknown-time mode).
- Written: PRD rewritten with the decisions (open questions kept as an
  audit list); ROADMAP S2/S4/S5/S6 adjusted (no fallback, discover view
  with radius + preference, location on profile); v1 loses the gender
  filter and unknown-time items, gains location refresh and the Apple
  membership check; ADR-0003 (compatibility formula, synthesis from Cafe
  Astrology, Discepolo/Kerykeion, SolarSage) and ADR-0004 (ephemeris).
- Verified: docs only; nothing runnable yet.
- Open: Apple Developer Program membership and App Store name — first
  deploy session. Next: S0.

## 2026-09-08 — /spec + /mvp-scope

- Owner decisions (asked in one batch): Turkey-first, Turkish UI; template
  text, no LLM; `astronomy-engine` (MIT) for ephemeris; MVP loop is
  swipe + mutual like + in-app chat. Recorded in `docs/PRD.md`.
- Written: `docs/PRD.md` (7 core interactions, each with a "works when"
  clause; 8 open questions for the owner) and `docs/ROADMAP.md`
  (walking skeleton S0–S7, v1 list with Apple-required items, deferred
  list with reasons). Chat is v1, not skeleton: the match screen with the
  starter is the value; messaging is standard machinery.
- Assumptions taken until the owner answers PRD open questions: offline
  city list for geocoding (Q1); same-city discovery (Q4); woman/man/
  everyone preference model (Q6). Each is marked in the ROADMAP item.
- Verified: nothing runnable yet; verify.sh still FAILs by design until S0.
- Next: answer PRD open questions (at least Q1, Q3, Q6 before S3/S5/v1),
  then S0 (skeleton boot + battery).

## 2026-09-08 — instantiated from maya 22e7efe

- Repo created by /new-product. Owner delegated the stack choice (no
  technical preference); recorded as ADR-0002, not a guess.
- Filled: CLAUDE.md commands + standards + deploy, verify.sh battery,
  ci.yml, deploy-checklist product steps, .gitignore.
- Not done, by design: no code skeleton yet — verify.sh reports FAIL
  ("no root package.json") until the walking-skeleton step lands.
  `contracts/init.sh` stays unwritten until the app can boot (the
  initializer session writes it before the first unattended run).
- Open before /spec: ephemeris library + licence (Swiss Ephemeris is AGPL /
  commercial; pure-JS alternatives exist); chart interpretation and
  conversation starters — templated text vs. LLM via Edge Function; Apple
  dating-app requirements (age gate, moderation, account deletion) as PRD
  constraints.
- Next: /spec → /mvp-scope → skeleton → remotes/CI.

## 2026-09-09 — The app is called juno; it has a mark

- Owner renamed the product **juno** (Roman goddess of marriage; in
  astrology the asteroid of partnership and commitment). Only the mark
  landed this session — the `stardate` → `juno` rename of `app.json`,
  strings, package scopes and bundle id is parked by owner decision
  ("şimdilik hayır"). Until it runs, the code, the docs and the App Store
  name disagree; the rename session should sweep all of them at once and
  decide the bundle id before the first TestFlight build, since that one
  is permanent.
- The mark is the astrological Juno glyph (a star on a sceptre) reduced
  to its silhouette: two four-pointed stars stacked, the upper one large,
  the lower one stretched so it reads as the staff and crossbar. Three
  concepts were drawn (the literal glyph, a chart wheel with an aspect
  line, a star-dotted j); the owner picked the glyph and asked for it
  more minimal, which produced this.
- Source of truth is `apps/mobile/assets/brand/mark.svg`;
  `apps/mobile/scripts/brand-assets.py` renders every PNG Expo needs
  (iOS icon, splash, favicon, Android adaptive background / foreground /
  monochrome) with headless Chrome, so nothing is hand-exported. Re-run
  it after touching the SVG. The Android adaptive background moved from
  the template's light blue to the night background.
- First accent colour in the palette: gold `#F2B97E` → rose `#E98FA0`,
  used only in the mark so far. Recorded in the design brief; the UI
  still has no accent.
- Verified: PNG dimensions and alpha with `sips` (icon opaque, adaptive
  layers transparent), a contact sheet of every asset at real size.

## 2026-09-11 — The screens the design session needs (C7)

- The owner redirected mid-session: rather than implementing the mockups
  by hand, Claude Design will style the app, so this session's job was to
  complete the screen set first ("önce Claude Design'a designi
  yaptıracağım, ama onun için eksik sayfaları tamamlamamız lazım").
  Eight screens are now photographed under `screenshots/c7-*`.
- Three owner decisions taken here: no notifications screen, discovery
  filters expressed as a minimum band rather than a percentage (which
  ADR-0009 §3 would have forbidden anyway), and the age range built.
- The natal chart explains houses now. The owner asked for it directly:
  "kişinin yıldız haritası daha açıklayıcı olmalı, örneğin gezegenlerin
  hangi evde olduğu da bir şey ifade etmeli". Each chart card carries the
  planet's house alongside its sign, with a line on what that house
  means.
- `ChartWheel` draws a real wheel in SVG. Two things it does that are not
  obvious from the code: every longitude lookup goes through
  `longitudeOf`, because `natalAspects` can involve the Ascendant, which
  is not a planet and lives on `houses`; and the planet glyphs are spread
  to a minimum angular gap while their ticks stay on the true longitude,
  because a conjunction otherwise stacks two glyphs on the same pixel.
  The spreading gives up and falls back to true positions if the last
  planet would be pushed past the first, rather than drawing a planet in
  the wrong sign.
- The calculating screen's minimum hold is derived from the copy
  sequence (`steps.length * STEP_MS`), not set on its own. With the two
  independent, the hold was exactly one line long and the other lines
  never appeared — caught by watching it rather than by reading it.
  Location permission is requested _before_ the screen goes up, which the
  simulator run confirmed: the system prompt appears over the form, not
  over a screen claiming to be working.
- Verification note: the simulator's text injection is lossy. Typing
  `tester@seed.local` produced `tester@seed`, and `Ece` produced `Eve`.
  Type in short runs and screenshot to confirm rather than trusting the
  "typed N characters" result.
- Deep links into Expo Go work and are much faster than tapping through:
  `xcrun simctl openurl booted "exp://127.0.0.1:8082/--/<route>"`.
- Still open from earlier: `color.textFaint` (#6E6890 on #0C0A14) is
  about 2.8:1 against the background and is used for hints on six
  screens. That is a palette decision for the design session, not a
  per-screen fix, so it was left consistent rather than patched here.

## 2026-09-11 — C7 review round

`code-reviewer` on `717000e..HEAD` returned NEEDS_WORK; every finding is
answered in the commit that follows it. The two that mattered:

- The starter screen had **two ways to become unusable**. A failed read of
  the viewer's _own_ profile left `me === null`, which the render treated
  as "still loading" — a permanent spinner on a screen whose spinner
  branch has no back link and whose stack has no header. And the actions
  were laid out with `marginTop: 'auto'` inside a plain `View`: with the
  longest question in the content set at an accessibility text size, the
  send button was positioned below the bottom of a small phone. Both are
  fixed, and the second was checked at 320×568, narrower than any phone
  the app will meet.
- The wheel **drew lines with no card beneath them**. The list under it
  comes from `natalReading`, which filters impossible pairs and keeps
  eight; the wheel called `natalAspects` raw and drew all fifteen to
  twenty-five. It now takes the aspects as a prop, which is what its own
  doc comment always claimed.

Two pieces of logic moved out of components into `lib/wheel.ts` and
`lib/starter.ts` so they could be tested; thirteen tests came with them,
and one of them found the glyph spreading putting a planet in the wrong
sign. The angular spread is gone — glyphs now step _inwards_ by a ring
instead of sideways, so a glyph's angle is always its true longitude.
`starterFor` moved to `lib/starter.ts` as part of this: it is pure, and
leaving it next to the Supabase client made the module untestable outside
a React Native runtime.

**For the owner:** `person/[id]/full` shows exact ascendant, midheaven and
cusp degrees for anyone in the deck, not only for matches. `PublicChart`
has always designated that data as shown to other users, so this is not a
new leak — but it is the first screen that makes a stranger's birth _time_
inferable at a glance. Worth a decision before TestFlight: either accept
it, or restrict the wheel's exact degrees to matches.

## 2026-09-11 — Seven-lens audit of C7/C8

A workflow ran seven review lenses over `b730683..HEAD` — navigation,
React correctness, wheel geometry, data/RLS, content coverage,
accessibility/layout, and the project's own standards — and put every
finding in front of three independent refuters, each told to kill it and
to default to refuted when unsure. Twenty-eight raised, five survived,
and a completeness critic found three more that no lens had looked for.

The one that mattered: **the chat screen was the only `[id]` route
without `key={id}`**, and the `dismissTo` landed earlier in the day made
that reachable. `POP_TO` finds a route by name and rewrites its params
while keeping its key, so with a thread to someone else already on the
stack the screen would re-render for a different match still holding the
first one's half-typed message — and the next tap on Gönder would send it
to the wrong person. The reducer was run against a real stack to confirm
the key survives. Keyed now, like every sibling.

The critic caught what seven lenses missed, twice by reading a file none
of them opened:

- Onboarding still did `router.replace('/chart')`. After the tab move
  that left a new account's very first screen outside the tab group with
  a one-route stack: no tab bar, no way forward. It replaces to the deck
  and pushes the chart, so the chart arrives with the app underneath it.
- `@react-navigation/bottom-tabs` was a dependency nothing imports —
  expo-router vendors its own fork of it, so the package was never
  resolved. Removed.

Also fixed: `backBehavior="initialRoute"`, without which Android back
from the opening tab would have switched to a tab nobody had visited;
the settings control announced nothing to VoiceOver and is the only route
into Settings; and the filters back label said "Keşfet" while the control
went to Ayarlar, which is also its only entry point.

**Gate change.** Dead imports and styles left by a refactor have now
reached review twice. The cause is that `eslint-config-expo` reports
unused declarations as a _warning_ and the battery treats a warning as a
pass, so nothing ever failed. `apps/mobile/eslint.config.js` now raises
`@typescript-eslint/no-unused-vars` to an error, with the usual
underscore escape for a deliberately unused argument.

Two corrections to that, both from the pre-push review, and both worth
keeping because the first version of this gate was quietly useless:

- The rules block had no `files`, so it applied to `.js` too — where
  `eslint-config-expo` never registers the `@typescript-eslint` plugin.
  ESLint then refuses to run at all: adding a `metro.config.js` or an
  `app.config.js`, both ordinary Expo files, would have taken the lint
  step down with an error about a missing plugin instead of about the
  code. Scoped to `**/*.ts` and `**/*.tsx` now.
- `expo lint` lints `app/`, `components/` and `src/` only. `lib/` — 27
  files, including every module the dead code actually lives in — was
  never linted by the battery at all. The script now names
  `app components lib theme`. Verified by planting a dead import in
  `lib/wheel.ts` and watching the battery fail on it, and it immediately
  caught two dead `router` imports left by this session's own edit.

Dead _strings_ are still not covered and cannot be: they are keys in an
object literal in `lib/strings.ts`, which no unused-variable rule can
see. Five of them had accumulated and were removed by hand.

## 2026-09-11 — Pre-push review

`code-reviewer` over `95e9eb2..HEAD` refused the push, correctly. Besides
the two lint-gate holes above:

- **Signing out left two tab navigators in one stack.** `replace` only
  swaps the top route, so the tab group stayed underneath; the route
  after sign-in is `/`, which redirects into the tab group again, and
  expo-router — seeing the focused route diverge at the root — adds a
  _second_ navigator rather than reusing the one already there. An edge
  swipe then revealed a stale tab bar, and on Android back landed in it
  instead of leaving the app. `leaveToSignIn` in `lib/session.ts`
  dismisses to the root before replacing, and every sign-out path goes
  through it. Checked on the device: after signing out, an edge swipe
  reveals nothing (`screenshots/c8-sign-out-leaves-one-route.png`).
- A comment written on the starter's send was simply false — it claimed
  the screen survives a successful send, which POP_TO never allows.
  Corrected rather than deleted, because the reason the line is there is
  still good.
- `sendMessage` was the one blocking call left without a timeout, beside
  two reads that had just been given one.

`READ_TIMEOUT_MS` now lives in `lib/supabase.ts`. The reason recorded at
the time — that `lib/profile.ts` and `lib/matches.ts` import each other —
stopped being true the moment the move landed, because the import it
removed _was_ the cycle: `profile.ts` now imports neither, and the only
remaining edge is `matches → profile`. The placement is still right for a
duller reason: every consumer already imports `supabase.ts` and it
imports nothing of theirs, so nobody has to reason about which module
initialises first. Recorded because a rationale that quietly went stale
is the second one this session, and both were caught by review rather
than by anything in the battery.

## 2026-09-11 — Pre-push review, round two

The first fix closed the three places that sign out on purpose and missed
the one that signs out on its own. `<Redirect href="/sign-in" />` is
`router.replace` — the very call the fix was written against — and that
guard fires unprompted when a refresh token expires while the app is
backgrounded, which makes it the likeliest way into the two-tab-navigator
state rather than the rarest. There is one `RedirectToSignIn` component
now and every guard uses it, so the property holds by construction
instead of at each place someone remembered.

Writing that turned up a screen nobody had guarded at all: the deck. Its
load effect begins `if (!userId) return`, so a session expiring while
someone is on it left them on a spinner with a tab bar and no way out —
reproduced by deep-linking `/discover` signed out, and fixed by the same
guard. The linter caught the first attempt at placing it, which sat above
six more hooks despite a comment claiming otherwise.

Two more dead rationales came out with it. A screenshot named
`c8-sign-out-leaves-one-route.png` could not show what its name claimed:
a mid-drag frame of a stack with nothing behind it is pixel-identical to
one taken without a gesture. Renamed to what it does show, with the
actual claim attributed to the reducer and the simulator. And the
`READ_TIMEOUT_MS` placement comment cited a cycle that the move itself
had deleted.

Three rounds of review on one range, and every round's most valuable
finding was a sentence that had stopped being true rather than code that
had never worked. Worth remembering the next time a comment feels
finished.

## 2026-09-11 — The five-item pass: plan and partition

The owner's list of the evening — tab bar on every screen, dimmed popups
with one closing button, sign-up and sign-in with a password plus inert
Apple/Google buttons, the profile rebuilt around the photo with an edit
mode, discover with a detail popup and swipe gestures, and the chat with
avatars, read receipts, replies and a chat/match pager — went through
four read-only scouts (nav, auth, profile+discover, matches+chat) and a
partition critic before a line was written. The plan is the new
"five-item pass" section of `docs/ROADMAP.md`: a serial foundation on
main, then four worktree tracks, each with its file claims.

What the scouts verified in `node_modules` rather than assumed, because
each one decides the shape of the work:

- expo-router 57.0.19 supports the array-group directory
  `(discover,matches)/…` (`build/matchers.js` `matchArrayGroupName`,
  `getRoutesCore.js` `extrapolateGroups`), reads `unstable_settings`
  per group, and resolves `router.navigate` from the root layout against
  the focused route's segments — so the Realtime match listener lands
  inside a tab stack (the matches tab, once `match/[id]` became a single
  copy there). Nested native stacks under bottom tabs keep the bar.
- `react-native-gesture-handler` and `reanimated` are in `node_modules`
  only as expo-router peer dependencies auto-installed by npm; nothing in
  the app depends on them and there is no babel config for worklets.
  Importing them would be a phantom dependency. Swipe and the pager use
  the built-in `PanResponder`, `Animated` and a paging `ScrollView`.
- Typed routes are on, but `.expo/types/router.d.ts` is gitignored and
  only the dev server writes it, so CI's `tsc` never sees a stale href.
  Every track's done-when therefore carries a local `npx expo start`
  regeneration plus a grep for the deleted paths. Worth a real fix later
  (a generation step in the battery) — parked, not done.
- `profiles_check_photos` (latest definition in
  `20260909000005_photo_delete_fixes.sql`) checks count, owner folder and
  storage existence only for paths not already in `old.photos`, so a
  reorder of the same set in one update passes.
- The Realtime publication already publishes `insert, update`; under
  DEFAULT replica identity an UPDATE payload carries the full new row, so
  read receipts reach the sender without `replica identity full`. The
  track asserts it with a test rather than trusting this paragraph.

Partition decisions the critic made, and why:

- `match/[id]` moves as a single copy into the matches stack, not into
  the shared group: Track D deletes the route and folds it into the chat
  as page 2, and a chat belongs to the matches tab anyway. A like on the
  deck therefore jumps to Eşleşmeler for the match screen. Only
  `person/[id]/*` needs the shared group.
- `lib/routes.ts` (`matchDetailHref`, `personHref`) exists so the five
  places that link to the match detail change in one file when D
  retargets them — and so `app/_layout.tsx` is read-only for every track.
- `CompatibilityDetail`, `Meter`, `BigThreeRow` and `Popup` are extracted
  in the foundation because two or three tracks would otherwise each
  create them. After the fork D owns the first two, nobody edits the rest.
- `lib/strings.ts` is the one file every track writes. Allowed under a
  section partition (A: welcome/signIn/signUp/errors; B: profile/person/
  chart/settings; C: discover; D: chat/match/matches/starter), new keys
  inserted after a section's first key so adjacent sections do not share
  diff context.
- Shared resources — the simulator, Metro on 8082, the one local Supabase
  stack — stay with the main session. Tracks run the battery without the
  supabase workspace and never `db reset`; a track's DB tests and every
  screenshot are taken on main after its `--no-ff` merge. The reason is
  concrete: once D applies its migration to the shared stack, the
  types-drift test fails in every other worktree.

Owner questions, each answered by a default so the work does not wait
(the owner can reverse any of them; the cost of each reversal is noted):

1. A popup (RN `Modal`) dims and blocks the tab bar while open. Default:
   accepted — the bar is on every page, a popup is not a page. Reversal:
   an in-screen overlay per tab stack, more work.
2. After onboarding the account lands on the profile tab (the chart is
   now part of the profile). Default: yes.
3. Photo order is changed with ‹ › buttons, not drag. Default: buttons;
   drag is a separate PanResponder job.
4. Adding and removing a photo write immediately (the trigger needs the
   object to exist); Kaydet writes order and bio; there is no Vazgeç.
   Default: yes; a full draft with cancel grows Track B.
5. Tapping the discover photo no longer opens the profile — that area is
   the swipe surface; "Profili gör" does. Default: button only.
6. The full-chart popup keeps the Mercury/Venus/Mars cards above the
   planet list. Default: keep, so no reading is lost.
7. Dimension names become Duygusal yakınlık / Çekim / İletişim /
   İstikrar / Gelişim. Default: ship these five.
8. Reply is a long press on a bubble, not swipe-to-reply. Default: long
   press — no dependency, no fight with the horizontal pager.
9. No separate "EŞLEŞTİNİZ" screen remains; a new match opens the chat on
   its Uyum page with the kicker there. Default: yes; a celebration popup
   can be added to D.
10. Password minimum is 8 (client and config); the welcome button opens
    sign-up with a "Giriş yap" link under it. Default: yes.

One owner decision is recorded as overriding a comment in the code:
`app/welcome.tsx` says a button that does nothing is worse than none.
The owner asked for inert Apple and Google buttons on 2026-09-11 ("arkası
şimdilik boş kalsın"); Track A rewrites the comment to say so. The App
Store review risk of a non-functional Sign in with Apple button stands
and is flagged for the TestFlight item.

## 2026-09-11 — The foundation: every screen under the tab bar

The serial phase before the four tracks fork, as the plan entry above
laid it out. Five commits on main.

**The route tree.** `(tabs)/_layout.tsx` now names three group
directories, `(profile)`, `(discover)`, `(matches)`, each with a
`_layout.tsx` that renders one shared `components/TabStack.tsx` and
statically exports `unstable_settings.initialRouteName` — static because
expo-router reads it while building the route table, not at render.
Every signed-in route moved under one of them; `person/[id]/*` sits in
the shared `(discover,matches)` group so both tabs can push it, and
`match/[id]` moved as a single copy into `(matches)` because Track D
folds it into the chat, which lives there. The root stack holds exactly
one signed-in route, `(tabs)`, and `lib/routes.test.ts` fails the battery
if a signed-in screen ever reappears at the root — and now also if a
group's anchor names a screen that does not exist. Watched on the
simulator: settings, the legal page reached from settings, a chat, a
match screen and the deck all render with the bar under them
(`screenshots/c9-*`); a match arriving over Realtime while the Profil
tab was focused jumped to Eşleşmeler and pushed the match screen there
(`c9-realtime-match-lands-in-tab.png`).

**What the restructure broke, and the fix.** Signing out from the chart
screen produced a dev warning, "The action 'POP_TO_TOP' was not handled
by any navigator". `leaveToSignIn` began with `dismissAll`, whose
POP_TO_TOP the root stack — now one route long — could not take, and
the nested stack it was meant for never saw it. The replace that follows
removes the whole tab subtree by itself, so the dismiss is gone and the
routes test is the guard. Before the fix the landing was still a
one-route sign-in (an edge swipe revealed nothing), so the bug was a
warning, not a regression; it is still the kind of thing that hides a
real one later.

The second sign-out, after the fix, revealed the welcome screen under
sign-in on an edge swipe. Not the old bug — no signed-in screen was
there — but history: `sign-in`'s "‹ Geri" was a `Link` to `/welcome`,
which pushes, so every welcome ⇄ sign-in round trip grew the root stack
by two, and the old `dismissAll` had been hiding that by popping the
root on the way out. The link is a `BackLink` now (pops, falls back to
`/welcome`), and the signed-out reader's way out of the legal page is
the same control. The property this leaves is the one that matters:
nothing signed-in ever sits under sign-in; what may sit under it is the
door the person came through.

**What the reviewer caught before the fork.** Onboarding's landing had
become `replace('/profile'); push('/chart')`. Both calls sit in one
routing-queue flush, and expo-router (`routingQueue.js`, `stateUtils.js`
`findDivergentState`) creates the new `(tabs)` route from the REPLACE
with no nested state yet — so the PUSH that follows diverges at the root
and adds a _second_ `(tabs)`: the very bug this range exists to remove,
on the first screen every new account sees. The old tree got away with
the same two calls because `/chart` was a root route. It is one call
now, `replace('/chart', { withAnchor: true })`, which loads the profile
tab's anchor beneath the chart in a single action. The lesson is written
next to `leaveToSignIn` and in `TabStack`: the tree is necessary, not
sufficient — a handler makes one router call into the tab tree. Smaller
catches from the same review, all fixed: five styles orphaned by the
BackLink swaps, three comments pointing at old paths, the legal page
telling an onboarding reader "‹ Ayarlar" (one neutral label now), the
Popup backdrop announced to VoiceOver as a second Kapat, and the deck's
`toggle-detail` testID that only opens.

A second review — three lenses, every finding put to two refuters —
agreed on the onboarding blocker and added one of its own weight:
`unstable_settings.initialRouteName` seats a group's anchor only under a
cold deep link. An in-app `navigate` into a tab whose stack has never
mounted — a like on the deck, a match arriving over Realtime, "Uyum
detayı" from the deck's copy of a person page — mounted the matches
stack with the match alone, so the list beneath it did not exist and
could not be reached until a restart. `c9-realtime-match-lands-in-tab.png`
was taken in exactly that state and cannot tell the difference. The
three call sites now pass `INTO_MATCHES` (`{ withAnchor: true }`,
`lib/routes.ts`), which loads the anchor beneath the target in the one
action. Track D inherits the rule when it retargets the href to the
chat. The review also asked for a visible way back from a chat or a
match; the owner said there is none ("geri dönme butonuna ihtiyaç
yok"), so the edge swipe and the tab stay the exits — whether re-tapping
the focused tab pops its stack to the list is checked at Track D's
merge, with the pager in place.

The re-review of the fixes passed, tracing `withAnchor` on `replace`,
`navigate` and `<Link>` through expo-router's `getNavigationAction` and
React Navigation's vendored `useNavigationBuilder` (the anchor loads
because `initial: false` sends the fresh stack through
`getInitialState`, where the group's `initialRouteName` sorts first).
Three notes kept: `initial=false` rides along in the target's params,
so on the web the URL after onboarding reads `/chart?initial=false` —
cosmetic, every screen reads only `id`, but a `.strict()` on route
params would trip on it one day; `BackLink`'s cold-open fallback now
passes `withAnchor` too, for the same reason; and a person page opened
from a match pushes a second copy of that match through its "Uyum
detayı" link (pre-existing, Track B rebuilds the page). The eighteen
older dead styles it counted are a ROADMAP follow-up with a gate, not a
tonight fix: the four tracks are rewriting those files as this is written.

**Shared pieces.** `components/Popup.tsx` (a native `Modal`, `color.scrim`
backdrop, bottom sheet, exactly one closing button — the owner's rule),
`components/Meter.tsx` (`Meter` + `BandMeter`, out of the deck screen),
`components/BigThreeRow.tsx` (Sun, Moon, rising with their body glyphs —
the owner's item 3.2, now on the deck card, the match page and the
person page at once) and `components/CompatibilityDetail.tsx` (the union
of the deck's inline detail and the match page's summary). `lib/routes.ts`
builds the match-detail and person hrefs in one place, so the root
layout's Realtime navigation never has to be edited by a track. The
deck's "Uyum detayı" now opens the Popup — the first half of the owner's
item 3.1 landed here because the Popup needed a real consumer to be
photographed (`c9-popup.png`), and Track C's stub shrinks accordingly.

**Config.** `[auth.email] enable_confirmations = false` in
`supabase/config.toml`, restarted into the shared stack, so Track A's
password sign-up yields a session at once. The hosted project must
mirror it when it exists.

Simulator lessons that cost time tonight, all recorded so the next
session does not pay again:

- Two simulators were booted (another product's session runs `pati` on
  an iPhone 17). `xcrun simctl … booted` resolves to whichever it likes,
  so half an hour of "Juno shows pati" screenshots were pictures of the
  other device. Every simctl call now names the UDID
  (`D667658A-CA77-431B-94E3-C106344B8DB3`, the iPhone 17 Pro), and the
  simulator MCP takes `device` for the same reason.
- HID typing drops trailing characters: "oguzpancuk@gmail.com" arrived
  as "oguzpancuk@gma". With `shouldCreateUser: true` the OTP form then
  created a local account for the truncated address before anything was
  noticed. Type, crop-screenshot the field, then continue; the stray
  `auth.users` row was deleted by hand (local stack only).
- `contracts/init.sh` starts Metro with `CI=1`, which does not watch
  files (already an upstream candidate above). For a session that edits
  and looks, start Metro by hand without `CI=1` on 8082; the same env
  lines as the script.
- A seed user cannot be made to like a non-seed profile with
  `seed-like.ts`; a session-scratch variant keyed by display name did
  it for Derya. Not committed: one screenshot's worth of tooling.

## 2026-09-11 — Track A: the password door, and two buttons that do nothing

Branch `track/a-auth`, worked in its own worktree off `b80bcc1` while
the other three tracks ran beside it; main merges. Item 1.3 of the
owner's list: sign-up and sign-in with a password, the Apple and Google
buttons visible with nothing behind them.

**OTP is gone, not kept beside the password.** The owner's default of
the plan entry above. Two flows on one screen would have meant two
sets of strings, two error mappings and a choice on every visit for a
product that has no real users yet; the mail the code arrived by was
the thing being deferred ("maili sonra ayarlarız"). What left with it:
`signInWithOtp`/`verifyOtp`, the code step, the five `signIn` strings
it used, `errors.otpInvalid`, and in `lib/errors.ts` the `otp_*` cases
and the bare-403 fallback (a 403 with no code was read as a wrong code;
there is no such request now, so it reads as unnamed). The
`magic_link` template stays in `config.toml` with its comment reworded:
it renders `{{ .Token }}` and nothing in the app reads one any more.

**The screen.** `sign-in.tsx` has two modes, `in | up`, from a route
param parsed with `z.enum(['in','up']).catch('up')` — a mistyped deep
link opens sign-up, the cheaper mistake for a newcomer. The param is
read once into state and the bottom link flips it in place, keeping
what was typed; `router.setParams` would have kept the URL honest too,
but its typed-routes signature infers the route through a conditional
type and I did not want the screen's one flip to depend on that
inference holding across expo-router upgrades. Welcome pushes a fresh
instance per tap, so a stale param cannot reach a mounted screen.
Submit stays dimmed until `parseCredentials` passes; a field's own
sentence appears once there is something in it to be wrong, so an
empty form is not shouted at. Success is `dismissAll` then
`replace('/')`, exactly as the plan wrote it: the dismiss is a
POP_TO_TOP on the root stack (welcome and sign-in are root routes, so
it is handled — the one `leaveToSignIn` lost was aimed at a one-route
root), and it is what keeps welcome from sitting under `(tabs)` after a
sign-in, which today is why Android back from the deck lands on
welcome while signed in. One call into the tab tree; the dismiss
touches only root routes.

**A null session is a sentence, not a spinner.** `signUp` on a project
that confirms addresses answers with a user and no session and no
error. The screen shows `signUp.confirmSent` and stays. The local
stack cannot produce that state (`enable_confirmations = false` since
the foundation), so the branch is written, not watched. **The hosted
project, when it exists, must set Confirm email = off** (Authentication
→ Providers → Email) or every sign-up ends on that sentence; and its
confirmation template must not be the local one, which mails a 6-digit
code the app has nowhere to accept. Turning confirmations on is a
feature (a verification step in the app), not a switch.

**The inert buttons and the App Store.** Two `OutlineButton`s on
welcome, "Apple ile giriş yap" and "Google ile giriş yap", with
`onPress={() => {}}` and a `// why:` naming the owner's decision. The
file's doc comment said a button that does nothing is worse than none;
it now records that the owner overrode this on 2026-09-11 and why. The
risk stands and is the TestFlight item's to clear: App Store Review
Guideline 4.8 requires Sign in with Apple wherever a third-party login
is offered, and a visible Sign in with Apple button that does nothing
is a reason to reject a build — reviewers tap it. Before the first
TestFlight, either the providers work or the two buttons go back
behind the ROADMAP item; there is no third state that passes review.

**Password rules.** 8 to 72 on the client (`lib/auth.ts`; 72 is
bcrypt's input cap, which GoTrue enforces with `weak_password`) and
`minimum_password_length = 8` in `config.toml`. `credentialsSchema`
trims and lowercases the address — the HID lesson of the foundation
entry showed how easily a stray character reaches a field — and does
not trim the password, because a leading space is part of a secret.

**What the auth DB test asserts, and that it was not run.**
`supabase/tests/auth.test.ts`: fresh sign-up → session with
`email_confirmed_at` set (the line that goes red if the stack's config
drifts back to mailing); same address → `user_already_exists`; 5-char
password → `weak_password` with status 422; wrong password and an
unregistered address → `invalid_credentials` (the API does not say
which half was wrong, and neither does the app); the right password →
a session. Cleanup through `deleteUsers`. Typechecked and linted with
the supabase workspace's strict type-aware rules; not run — the stack is
main's, and a track that starts one breaks the types-drift test in
every other worktree. Main runs it after the merge, with the five
screenshots.

**Legal text.** "Giriş tek kullanımlık kod ile yapılır; parola
saklanmaz" became false and is reworded: sign-in is by e-mail and
password, the password is stored only as a hash by the auth provider
and shown to no one, and the address is not verified at sign-up for
now. `LEGAL_UPDATED` is 11 Eylül 2026. `LEGAL_VERSION` stays at
2026-09-09 on purpose: it is written once into `profiles.consent_version`
at onboarding and nothing anywhere compares a stored version against
the current one or asks anyone to accept a newer text — so a bump would
record a re-consent that never happened. Its doc comment said "bump
both together"; it now says why not. The open question this leaves for
the owner: a profile created after today records 2026-09-09 while the
person read the 11 Eylül text. Harmless while every account is local
and seeded, but the first hosted sign-up makes it a wrong record. The
fix is a re-consent step (compare `consent_version` to `LEGAL_VERSION`
at app start, show the notice, update the row — the trigger already
refuses a backwards move) and a bump in the same change; or, if the
owner judges this wording change immaterial to consent, leave both as
they are and say so in an ADR.

**Verification.** Track battery on the worktree (typecheck, lint, test
for `apps/mobile`, `packages/astro`, `packages/geo`; `prettier --check .`)
green on the committed HEAD. `.expo/types/router.d.ts` is gitignored
and absent in a fresh worktree, which makes `Href` loosely typed; the
main checkout's copy was placed in the worktree's `.expo/types/`
(same route tree — this track adds no route) and `tsc` passed against
the typed hrefs too, including the two `{ pathname: '/sign-in',
params: { mode } }` links. No dev server was started: the disk had
about 2 GB free and Metro's cache lives in the shared `node_modules`.
Not done here, main's after the merge: the five `auth-*.png`
screenshots and the auth DB test run.

## 2026-09-11 — Track B: one profile for you and for them

Branch `track/b-profile`, worktree
`.claude/worktrees/agent-a601c5bf39360f3a4`, base b80bcc1. The stub in
`docs/ROADMAP.md` ("The five-item pass", Track B) is the spec; this is
what was built against it and what was found on the way.

**The shape.** `components/ProfileView.tsx` is the one page: a paged
carousel (`ScrollView pagingEnabled`, one page per photo, the width
measured with `onLayout` so the carousel does not know the screen's
padding, 3:4 like the picker's crop) with the name and age inside the
picture on the discover card's scrim and a dot per photo; `BigThreeRow`;
the bio as a `Card` (a `TextInput` while editing, the placeholder hint
for an owner without one, nothing for another person without one); the
first three of `reading.primary` as cards; one `GradientButton` opening a
`Popup` whose body is `components/ChartDetail.tsx` — the wheel at 300,
Mercury/Venus/Mars, the ten planets, the aspects. `PrimaryCard` lives in
`ChartDetail` and is imported by `ProfileView`, not the other way round,
so the two files do not import each other. The presence of the `edit`
prop is what marks a page as the viewer's own: it decides the bio hint,
the empty-carousel hint and which Ascendant note is shown. Another
person's page never passes it.

**Edit mode.** `profile.tsx` keeps the row's `photos` and `bio` as state;
"Düzenle" flips `editing`, the pill reads "Kaydet" (cool fill) and
"Kaydediliyor…" while `saveProfileEdits` runs — one
`update({ photos, bio })`, which the trigger accepts because it checks
storage only for paths not already in `old.photos`. Add and remove keep
writing at once through `addPhoto` / `removePhoto`, and since both take
the on-screen list, an unsaved reorder rides along with them — the
order is never lost to an add. `saveBio` is gone; nothing else used it.
A failed save shows `t.profile.failed` and stays in the edit mode with
the draft intact. The header row is rendered outside `ProfileView` on
the owner's page so settings stays reachable while the fetch is loading
or failed; the edit pill only appears once the row is there.

**What the stub got wrong, checked rather than copied.** It said a 29
February birth "counts on 28 Feb" in a common year. A read-only
`select extract(year from age(...))` on the local Postgres (the very
expression `discover` and `match_profiles` use) says otherwise:
`age('2025-02-28', '2000-02-29')` is 24 years 11 months 28 days, so the
birthday falls on 1 March. The 28-Feb rule is the CHECK constraint's
(`current_date - interval '18 years'` clamps), a different operation.
`lib/age.ts` mirrors the views — the owner must read the number others
see — and `age.test.ts` carries the observed values with the reason.
`ageOn` returns null for a string it cannot read (the row schema only
promises a string); the name then stands alone rather than "NaN".

**Smaller decisions.**

- The popup titles reuse two keys that were about to die:
  `chart.title` ("Doğum haritan") for the owner and
  `person.chartTitle(name)` for another person. `chart.fullChart` stays
  as the owner's button label, `person.fullChart` as theirs.
- `profile.bio` ("HAKKINDA"), `profile.photos`, `profile.saved`,
  `profile.chart*`, `chart.backToProfile/hideFullChart/signOut`,
  `person.chartLabel/openChart/backToProfile/backToChart/fullTitle/tabs`
  are deleted. Four keys are new after `profile.title`: `edit`,
  `saving`, `moveLeft`, `moveRight` (the ‹ › buttons need a spoken
  label). `settings.signOut` sits after `settings.title`.
- `discover.completeProfile` was used only by the deleted chart screen.
  It is Track C's section, so it is left in place and named here for
  main to prune after the merges.
- The empty carousel shows `t.profile.noPhotos` for the owner; the deck
  requires a photo, but a match may have removed theirs, so another
  person's empty page is a plain surface with the name on it.
- `git status` in a fresh worktree lists the two `node_modules` symlinks
  the track setup asks for (`.gitignore` says `node_modules/`, which
  matches directories, not symlinks); they are not committed and are
  the only untracked entries when this track reports.

**Verified here (the track battery, from the worktree root):**
`npm run typecheck -w apps/mobile -w packages/astro -w packages/geo`
clean, after `.expo/types/router.d.ts` was regenerated on port 8092
and named no chart route; `npm run lint …` 0 errors (one pre-existing
`exhaustive-deps` warning in discover.tsx, Track C's file);
`npm run test …` mobile 8 files / 88 tests, astro 13 / 282, geo 2 / 36,
all passing; `npx prettier --check .` clean. `grep -rn "/chart"` over
app, components and lib finds no href. Not verified here, by design: every
`p-*.png` screenshot, which main takes after the `--no-ff` merge.

## 2026-09-11 — Track D: avatars, Okundu, Yanıtla, the pager, level meters, plainer names

Built on `track/d-chat` in a worktree; main merges, runs the DB tests
and takes the screenshots. What is here is the code, its tests and the
decisions that were not written down in the stub.

**What the thread screen became.** One screen, two pages: a two-segment
header (Sohbet / Uyum, 44pt targets, a pink underline) over a paging
`ScrollView`. Page 1 is the thread as it was, with three additions; page
2 is `components/MatchDetail.tsx`, the body of the old `match/[id]`
without its "Sohbeti aç" link — you are already in the chat. The old
route is deleted and `matchDetailHref` now answers
`/chat/[id]?page=match`, so the Realtime listener, the deck after a like
and the person page open the chat on its Uyum page with the kicker
there (owner default 9). The three call sites outside the matches stack
still pass `INTO_MATCHES`; nothing about the anchor changed. The `page`
param is Zod-parsed (`z.enum(['thread','match']).catch('thread')`) and
applied through `contentOffset` (iOS reads it before the first frame)
and `onLayout` (everything else, and a scrollTo before layout is
dropped); a `[page]` effect covers a same-chat param swap. The chat
keeps `key={id}`, which now also discards an open block confirmation on
page 2 when a match arriving over Realtime swaps the id.

**The three additions, and the direction each one hides.**
`lib/thread-view.ts` is pure and tested because each rule had a way to
be wrong by one sign: the FlatList is inverted, so "the last bubble of a
run" — the one that gets their avatar — is the LOWEST index of its run,
not the highest (`showsAvatar`); "Okundu" sits under my newest read
message only, found order-agnostically by (created_at, id)
(`lastReadMine`); a reply quotes from the loaded window or says "Önceki
bir mesaj", never fetching (`quoteFor`); the excerpt counts code points
so an emoji at the cut is not split (`excerpt`). `useThread` gained an
UPDATE binding merged by id — the read receipt arriving on my message.
Reply is a long press (owner default 8) plus a VoiceOver custom action
with the same label, because a long press is not a gesture VoiceOver
users have.

**reply_to on the server.** `20260911000002_reply_to.sql`: a nullable
self-reference, a not-self check, a partial index, a BEFORE INSERT
trigger that keeps the quoted message inside the thread, and
`forbid_message_edit` re-created with `reply_to` frozen. One deviation
from the stub, deliberate: the trigger is security definer, not invoker.
Under the sender's RLS a message of another match is invisible, so an
invoker trigger cannot tell "another thread" from "no such message" and
both would come out 23514. With the definer lookup a cross-thread reply
is 23514 and an unknown id falls through to the foreign key's 23503 —
the two refusals the stub asked the tests to assert separately. The
function reads one `match_id` by primary key and returns a verdict;
nothing from the definer context reaches the caller. The trigger
function has no grant or revoke: a function returning `trigger` cannot
be called, only fired.

**What the typed client would not let me write.** `tests/database.types.ts`
is generated from the running stack, which the tracks share and must
not migrate, so it still lacks `reply_to` on this branch — and the
typed client rejects an unknown column on insert and update. Two small
helpers in `rls.test.ts` (`withReply`, `replyPatch`) declare the column
on the way in; they stay correct after main regenerates the file and can
then be replaced by plain literals. `supabase/scripts/seed-message.ts`
is untyped and simply gained `--reply`.

**Smaller choices.** The chat requests its photos once
(`usePhotoSources(row.photos)`) and hands the sources to the header
avatar, the bubble avatars and page 2's strip — one authorised request
per photo per mount rather than two for the first photo (ADR-0006 says
never cache, not fetch twice). The conversation list resolves each row's
first photo with one call and maps back by path, never by index — the
alignment bug of `photo-alignment.ts` again. `lib/routes.ts` gained
`chatHref` beside `matchDetailHref`; the list and the starter's BackLink
fallback use it, and the starter's label is "‹ Sohbet" — the fallback
is the thread the label names, not the Uyum page. `Avatar` falls back
to the Turkish initial (`initialOf`: `i` → `İ`, which `toUpperCase`
gets wrong) on `surfaceHigh`. `LevelMeter` is three steps from
`LEVELS`, the level word kept as the accessibility label; no number
reaches a `Text`. The five names are Duygusal yakınlık, Çekim,
İletişim, İstikrar, Gelişim (owner default 7).

**For main, after the merge.** `db reset`, then `npm run gen:types -w
supabase` (types-drift fails until it runs), the reply_to tests in
`rls.test.ts`, and the new UPDATE test in `realtime.test.ts`. That test
runs after the INSERT one, so the primer that warms the socket has
already fired; if the first UPDATE binding after a container restart
drops its event the way the first INSERT binding does, the test will
say so on its first run and the warm-up needs an UPDATE primer too —
not seen, since no track can run it. The screenshots named in the stub,
and the check the foundation review deferred to this merge: whether
re-tapping the focused Eşleşmeler tab pops its stack back to the list,
now that the chat is the only screen above it.

## 2026-09-11 — Three tracks merged, reviewed and photographed

The four tracks were resumed after an API session limit stopped all of
them mid-work (their worktrees and uncommitted edits survived; a message
to each agent picked up where it left off). Merge order A, B, D, each
`--no-ff`; the one conflict every time was `docs/NOTES.md`, the accepted
append-only case, resolved by keeping both entries in merge order. The
full battery was green after each merge, with the shared stack restarted
once for Track A's config (`minimum_password_length`) and Track D's
migration applied with `supabase migration up` — not a reset, which
would have wiped the tester and the matches the screenshots use — then
`gen types` regenerated (`npm run gen:types -w supabase` wrote a truncated
file because the CLI's warning went through the same redirect; running
the CLI directly from `supabase/` and copying the output worked).

Each merge got its own code-reviewer pass on main, and each found
something the track battery could not:

- **A** (NEEDS_WORK → fixed): the Zod password cap counted UTF-16 units
  while bcrypt and GoTrue count bytes, so a password of forty `ş` passed
  the form and came back as `validation_failed`, which the screen read as
  a bad e-mail address — the cap is measured in UTF-8 now
  (`lib/auth.ts` `utf8Length`, tests). `leaveToSignIn` reached the screen
  without a mode, so every sign-out and expired token opened the
  newcomer's Kaydol; it passes `mode: 'in'`. The reviewer also argued
  `LEGAL_VERSION` should move with the text: it is written once at
  onboarding as the version the person read, nothing re-asks existing
  members, so leaving it at 2026-09-09 made every new profile record a
  text it had not seen. Bumped. `supabase/tests/auth.test.ts` ran green
  on main (6/6).
- **B** (PASS with one important): `move` was the one edit control not
  behind the working gate, so a photo moved during Kaydet's update or an
  upload showed an order that was never written. Gated; the bio input is
  read-only and the pill disabled while either write is in flight.
- **D**: its own reviewer ran on the track; the merge's DB tests
  (reply_to RLS, the realtime UPDATE receipt, types-drift) passed on main.

Simulator evidence, all on the iPhone 17 Pro by UDID: `auth-welcome`,
`auth-sign-up`, `auth-sign-in`, `auth-wrong-password` ("E-posta ya da
parola yanlış."), `auth-one-tab-bar` (an edge swipe on the deck after a
password sign-in reveals nothing), `p-profile`, `p-profile-cards`,
`p-chart-popup`, `p-edit`, `p-reordered` (a second photo given to the
tester by a scratch script, moved first with ‹, Kaydet, relaunch: the
row is `[2.png, 1.png]` and the teal photo leads), `p-person`,
`p-settings`, `p-settings-sign-out` (lands on sign-in in Giriş yap mode
after the fix; an edge swipe reveals nothing), `chat-matches-avatars`,
`chat-thread` (avatar on the last bubble of a run, Okundu under my last
read message after Selin's side was marked read by SQL, the quoted reply
posted with `seed-message.ts --reply`), `chat-thread-reply` (the reply bar
after a long press), `chat-match-page`, `chat-match-meters` (the five new
names as three-step meters), `chat-meters-discover` (the same inside the
deck's popup), `chat-block-leaves-one-route` (a block from page 2 lands
on the list, `dismissTo` handled inside the nested stack; the block row
was deleted by hand afterwards to keep the test data).

Two navigation questions the reviews had left open are settled on the
device: re-tapping the focused Eşleşmeler tab pops its stack to the list
(so a chat has a way back without a button, as the owner wanted), and
`dismissTo('/matches')` after a block is handled inside the nested stack.
Onboarding's landing was checked on the web client with a fresh
password sign-up (`onb-test2@seed.local`): no mail step, the form, then
"Profilin" with one tab bar — there is no PNG for that clause, the
browser tool does not save one.

Not merged yet: Track C (its reviewer asked for a velocity dead-band on
the swipe veto and a guard against a responder recreated mid-touch; the
fixes are committed on the branch and its battery is re-running).

## 2026-09-11 — Track C: the deck swipes, and a button beside the detail

Item 3 of the five-item pass, in its own worktree on `track/c-discover`
(base b80bcc1). The foundation had already put the glyph chips on the
card and turned "Uyum detayı" into a popup; what was left was the button
beside it and the gesture.

**Profili gör.** The photo is no longer a `Link` — the plan entry's
default for question 5: that area is the swipe surface. Two pills sit
side by side under the why-line, "Uyum detayı" and "Profili gör"
(`testID="open-person"`, `router.push(personHref(id))`), the same
outlined style, `flex: 1` each.

**The gesture.** Built-in `PanResponder` + `Animated`, nothing from the
peer-installed gesture packages. The card is an `Animated.View` on an
`Animated.ValueXY`; the responder claims only when `|dx| > 8 && |dx| >
|dy|` (`onMoveShouldSetPanResponder`, never on touch start) and answers
`false` to termination requests, so a vertical drag stays the scroll
view's and a tap reaches the buttons — the two claims main checks on the
simulator. While moving, the card follows dx and a quarter of dy and
tilts up to ±12°; BEĞEN (pink) and GEÇ (muted) stamps on the photo's
upper corners fade in with |dx| and are fully there exactly at the
threshold. On release `decideSwipe` (`lib/swipe.ts`, pure, nine cases
in `swipe.test.ts`) answers like, pass or null: past 30 % of the window
width or a 0.5 pt/ms flick, symmetrically, and nothing when dx and vx
disagree in sign — a change of mind — provided the opposing velocity is
over 0.15 pt/ms: `vx` is the last move event's instantaneous speed, and
a finger lifting after a clear drag carries a few hundredths the other
way (a review finding; the first version sprang the card back from a
swipe plainly made). A non-finite `vx` decides on distance. A decision
flies the card out in 220 ms and then calls the existing `act()`; null,
busy or flying, a platform cancel (`onPanResponderTerminate`: iOS
cancels content touches when its scroll view starts moving) or a failed
record all spring it back. The round ✕ / ♥ buttons are untouched, inert
during the fly-out, and remain the accessible way; the stamps are hidden
from VoiceOver.

Two things decided on the way, both in comments where they bite:

- `act()` now answers whether the card was dropped, and never rejects
  (a thrown network failure is a refused write, so `busy` cannot stay
  set). The fly-out happens before the network call (the spec's order),
  so when the record fails — the error path, or `busy` — the card is
  off-screen and has to come home; the round buttons ignore the answer.
  The successor's reset is a layout effect on the card id, before paint.
  The fly-out's `finished` flag is checked too: a card grabbed
  mid-flight belongs to that gesture, not the previous one; a `flying`
  flag keeps the round buttons inert meanwhile, because a tap on ♥ in
  those 220 ms would start a second record through a closure that still
  believed nothing was busy.
- The responder is `useMemo`d on what its handlers close over (`act`,
  `busy`, `current`, `flying`, `pan`, `settle`, `width`), not created
  every render and not fed a ref. A fresh `PanResponder` has an empty
  gesture state, so recreating it mid-drag (the photo arriving) would
  snap the card to the middle; and `react-hooks/refs` refuses a ref
  captured by a function passed to `PanResponder.create` during render
  — it flagged the first version, which read a `latest` ref written in
  an effect. The memo is still remade when a record returns, which can
  happen with a finger down after a tap on ♥ (the review's second
  finding): the remade responder took the rest of that drag as a swipe
  on the next candidate, someone never seen. So the responder is built
  by a module-level factory that remembers the id of the card it was
  granted on and settles a release on any other; a factory rather than a
  `let` in the memo because `react-hooks/immutability` refuses a
  variable reassigned after render inside the component.

Reviewed (code-reviewer over `main..HEAD`, two findings, both landed
above) and verified by the track battery (typecheck, lint, test for
`apps/mobile` and `packages/*`, `prettier --check .`), not on the
simulator: the worktree owns none. For main after the merge: `disc-card.png`,
`disc-detail-popup.png`, `disc-after-swipe.png` (a `touch_path` past
30 % of the width; the `likes` row), `disc-person.png`, and the two
claims — vertical scroll still scrolls, a tap on "Uyum detayı" opens the
popup without moving the card. One thing to watch there: a fast vertical
scroll that begins with a horizontal wobble past 8 pt could claim the
card; `|dx| > |dy|` is the guard, and the number is the spec's.

Worktree note, for whoever runs the next parallel session: `.gitignore`
says `node_modules/`, which does not match the symlinks a track makes to
the main checkout's `node_modules`, so they showed as untracked in every
worktree. `node_modules` (no slash) went into the repository's local
`.git/info/exclude` — not a tracked file; the tracked `.gitignore` is
main's to change.

## 2026-09-11 — Track C merged; the five-item pass is on main

Track C landed last (`793d476`), after its own reviewer's two findings
were fixed on the branch: a velocity dead-band on the swipe veto (RN's
`vx` is the last move event's instantaneous velocity, so a lift after a
clear drag could carry a tiny opposing value and spring the card back)
and a responder that remembers the card it was granted on, so a finger
still down when a ♥ returns cannot swipe the next person. The one
orphaned string Track B reported, `discover.completeProfile`, was pruned
once C's section was merged. On the simulator, signed in with the
password: the two pills, "Profili gör" opening the person page, "Uyum
detayı" opening the sheet without moving the card, a vertical swipe
scrolling the page and recording nothing, and a `touch_path` drag of
300 pt recording a like on Ayşe (the `likes` row, count 4 → 5) with
Melis's card up next — `screenshots/disc-*.png`.

The merge review on main raised the iOS question the track could not:
under the new architecture a native scroll view can cancel a content
touch when its own pan begins, whatever the JS responder answers to a
termination request, so a steep diagonal drag would settle the card
with no decision. Tried on the simulator: a drag of 300 pt left with
90 pt of downward travel recorded a pass on Melis, so at that angle
the card keeps the touch. The comment in `discover.tsx` no longer
claims a guarantee, and names `scrollEnabled={false}` for the length
of a drag as the remedy if a tester reports a lost swipe. Two of the
review's smaller notes are worth keeping in mind for the TestFlight
cohort: while the like's round trip is in flight the card sits off
screen and the deck looks blank, and a card with no shared aspect
flies out and springs straight back with the error because the
refusal is synchronous — a pre-check before animating would remove
that fake like. "Profili gör" navigates rather than pushes, so a
double tap cannot stack the same person twice.

All four tracks are merged into main with `--no-ff`, each reviewed on
main, the full battery green after each merge and after the prune
(`80b85ea`). The four track branches and worktrees are still on disk
for the owner to inspect; they are deleted once the branch has left the
machine. Nothing has left the machine: that step is ask-tier.

## 2026-09-11 — evaluator-qa on the merged whole

A fresh-context judge over HEAD: the battery green on a clean tree, the
migration, triggers, photo order, the like row and the block cleanup
all confirmed in the local database, thirty-one of thirty-two
screenshots showing what their clause says. NEEDS_WORK on the evidence
contract, three corrections, all taken:

- `c9-sign-out-from-chart-lands-on-sign-in.png` was the frame after the
  edge swipe (welcome), not the landing; the landing frame from the same
  minute replaces it, and the F paragraph says so.
- `p-onboarding-lands-on-profile.png` was named in Track B's clause but
  never existed — the landing was checked on the web client, where the
  browser tool saves no PNG. The clause now says what was observed.
- "shows on another account's discover card" was a sub-claim nothing
  evidenced; the clause now claims the stored row, which is what every
  other deck reads.

The fourth item, a `pass` on Melis at 18:55 that no NOTES entry
explained at the time, was the diagonal-drag check for the Track C
review (a 300 pt drag left with 90 pt of downward travel), written up in
the entry above a few minutes after the judge read the file. The judge
could not drive the simulator (no tap tooling in its sandbox), so the
gesture claims — vertical scroll survives, a tap on the pill does not
swipe, re-tapping the focused tab pops to the list, an edge swipe after
sign-out reveals nothing — rest on this session's device runs and the
PNGs and rows they left behind.

## 2026-09-11 — The steep diagonal, and the battery on the final HEAD

The last review left one thing documented rather than tested: a drag
steep enough to worry the native scroll view but still claimable by the
card (|dx| > |dy|). Done on the simulator on a fresh candidate: a drag
of 200 pt right with 180 pt of downward travel, about forty degrees,
recorded a like (the `likes` row on the web-onboarded test account, the
count 6 → 7). So on this device the card keeps the touch at both angles
tried, and `scrollEnabled={false}` stays a remedy in reserve rather than
a change. The full battery is green on `c23d177` with a clean tree (this
entry and the comment beside the responder are the only change since).

## 2026-09-12 — the second pass: five corrections and a name that fits

The owner watched the first pass on the simulator and sent five
corrections, then a sixth mid-session. All six are on main.

**The deck was empty, and it was not a bug.** Before any of it: the owner
asked for a full account on the simulator and then for someone on the
deck. `oguzpancuk@gmail.com` was already signed in with four matches, six
messages and two photos, but Keşfet said nobody was left. The `discover`
view was right — that account is interested in women, and every woman
with a photo had already been liked or passed; the rest were men or had
no photo. Rather than delete a decision, `Sumeyye Ayan` was given a
placeholder photo with a one-profile copy of `seed-photos.ts`. The real
script rewrites `photos` for every profile, which would have destroyed
the ordered pair the reorder evidence rests on — worth remembering
before anyone runs it again on a live local stack.

**The chat has a back link again, and the header is the way in.** The
first pass removed the link on the owner's instruction; the owner
reversed it. `t.chat.backToMatches` was still in `strings.ts`, so this
was one `BackLink` above the title row. The name and avatar became one
`Pressable` that opens the person as a `Popup` — the same `ProfileView`
the profile tab renders, fed from the `match_profiles` row the chat
already holds, so opening it fetches nothing. `MatchDetail` lost its
`open-person` link. The popup inside the popup ("Tüm haritasını gör")
is a nested RN `Modal`; it works on iOS under the new architecture,
checked on the device, and it is the reason the chart is still one tap
from a profile wherever that profile is rendered.

**One chart, read once.** The popup used to open on Mercury — the three
primary cards the profile had not shown — and then start again at the
Sun as a second, differently shaped `PLANETLER` list. `PRIMARY_PLACEMENTS`
(six) is gone; `PLACEMENTS` is all eleven bodies in profile order and
`natalReading` returns one `placements` array in the card shape. The
profile slices the first three, the popup renders all of them. Everything the
deleted list carried but one thing is on the cards: the degree and the
retrograde mark went into the technical line (`degree` prop on
`PlacementCard`) and the retrograde paragraph onto the card. The one
loss is the sign's glyph beside its name (♏ Akrep), which the card
writes out in words instead. The
outer five needed names in the product's own language, beside Çekirdek
benlik and Duygusal dünya: Seni ne büyütür, Neyi ciddiye alırsın, Seni ne
özgürleştirir, Neyi hayal edersin, Neyi dönüştürürsün. The section label
started as "HARİTAN BAŞTAN SONA" and lost the possessive — "HARİTA
BAŞTAN SONA" — the moment it appeared over someone else's chart.

**Edge to edge.** `Screen`'s gutter is now `SCREEN_PADDING`, exported so
a child can cancel exactly it; the profile carousel does, and drops its
corner radius with it. The deck card cancels the deck screen's `space.lg`
and gives up its side border and radius too — a rounded corner against
the screen edge reads as a mistake. The carousel's scrim picks up
`SCREEN_PADDING` so the name still lines up with the cards below. One
thing the change costs: the card had nothing to sit off once it ran full
width, so it took a small top margin under the "Keşfet" title.

**Şikâyet et is a popup.** The reason list moved into `Popup`; filing
still writes and the sheet closes onto the page's own confirmation.
Engelle keeps its inline confirmation — its confirm is a second,
destructive button, and `Popup` has exactly one.

**"Yakınlık", not "Duygusal yakınlık".** Mid-session the owner reported
Gelişim wrapping to a second line on the Uyum page. The name is shorter
now and the five chips share the row (`flex: 1`, `paddingHorizontal:
space.xs`, `numberOfLines={1}`) rather than wrapping, so no future name
can push one down alone.

**Left in the local database on purpose:** the report row filed against
Selin at 16:09:09Z while proving item 5, and Sumeyye's placeholder photo.
Both are test data the owner can clear; deleting rows is ask-tier.

## 2026-09-12 — what the review of the second pass caught

Two findings worth the round trip, both invisible to the battery.

**A popup is not a screen, and the equal numbers hid it.** `Screen` keeps
its gutter on the scroll view's _content container_, so `ProfileView`'s
carousel with `marginHorizontal: -SCREEN_PADDING` grows into the frame.
`Popup` kept the same measurement on the _sheet view_, with the scroll
view inside it — so the same margin pushed the carousel 24pt out of the
scroll view's bounds on each side, where `UIScrollView` clips it. The
person popup therefore showed the gutter the owner had asked to remove
_and_ cropped 12% off the photo's width, while the identical component
on the profile tab was right. `Popup` now carries the gutter on its
title, its scroll content and its action row, and `ProfileView` states
the requirement it places on a host instead of leaving it to a matching
number in two files.

**The Ascendant's degree could print an arcminute low.** `toPublicChart`
rounds `longitude % 30` to four decimals precisely because float modulo
is inexact, and the new placement list reintroduced the raw modulo for
the Ascendant alone — about one chart in 1,650 would have disagreed with
astro.com by a minute, which ADR-0009 makes a real defect. Both paths go
through `degreeInSign` now, and `public.test.ts` pins the trap value
(30.15) rather than only the printed format.

Smaller things taken in the same pass: the dimension chips use
`flexBasis` and let a name wrap inside its chip, because a fixed single
line came back as "Yakınlı…" on all five at a large Dynamic Type
setting — the owner's complaint in a worse form; the chat header's top
padding comes from the safe-area inset rather than a number that put the
back link's hit area under the Dynamic Island; and
`t.person.openProfile` lost the "›" it no longer earns now that it is
only an accessibility label.

The review of that fix approved it and left four things worth doing,
all taken. The test that proved the rounding tested the helper, not the
call site that had regressed: `summary.test.ts` now feeds an Ascendant
of 30.2 through `natalReading` and pins `0°12′`, which the raw modulo
prints as `0°11′`. `degreeInSign` could round a longitude up onto the
boundary (59.99999 → "Boğa'da 30°00′"), unreachable through
`toPublicChart` but not through an Ascendant the schema only bounds to
[0, 360); a second modulo closes it. The chips' `flexBasis` of 58 needed
322pt and a 360dp Android leaves 310, so the row would have wrapped with
one stretched orphan on the second line — exactly the owner's complaint
in a louder form; 52 needs 292 and holds. And the chat header's
safe-area inset is floored at 44, because on the web client the inset is
0 and the back link would sit against the top of the viewport.

## 2026-09-12 — the ascendant's sign and its degree, read from one value

The second review of the rounding fix found the guard had moved the
error rather than removed it. `natalReading` took the Ascendant's sign
from the raw longitude and its degree from the rounded one, so a point
in the last arcsecond of Aries (29.99996) printed "Koç'ta 0°00′" — the
_start_ of the sign it was leaving, thirty degrees from where it is, and
unlike the malformed "30°00′" it replaced, nothing a reader could catch.

Sign and degree now come from one value. `roundLongitude` lives in
`signs.ts` beside `signOf` and `degreeInSign`; `toPublicChart`'s private
`roundDeg` is gone. Not quite the same function: the new one normalises
first. That matters for input outside [0, 360), which `computeHouses`
never produces (it normalises every angle it returns) and which the
schema would reject on the way out, and at an exact 1e-5 tie, where the
fold shifts the value by an ulp and flips the fourth decimal — 29.99995
now rounds to 30, so Boğa 0°00′ where it used to be Koç 29°59′. The
value is mathematically inside Aries, so that is a tie-break, not a
correction; what it buys is that the sign agrees with the longitude
actually stored. 0.36 of an arcsecond, but it is a change to what a
chart stores, not only to what one prints. `degreeInSign` rounds
twice on purpose and the comment says why: the longitude first, so a
boundary point lands in the same sign here and in `signOf`, and the
reduction after, so `% 30` cannot eat an arcminute. Probed through
`natalReading`: 29.99996 → Boğa 0°00′, 359.999961 → Koç 0°00′, 59.99999
→ İkizler 0°00′, 30.2 → Boğa 0°12′.

One thing deliberately left alone: `chart.ts` still computes its own
`degree` as a raw `longitude % 30`. Routing it through `degreeInSign`
broke four cases of `chart.test.ts`, which pins sign × 30 + degree back
to the longitude at 5e-10 — the internal chart is meant to keep its full
precision, and rounding belongs to `toPublicChart`, which every
displayed degree goes through. The comment there now says so.

The chips' basis went 52 → 44. At 52 the row still wrapped below 310pt,
and a 320pt viewport is in reach without an old device (Display Zoom, or
Android with an enlarged display size); at 44 five chips and four gaps
need 252 against 270.

Then the row stopped wrapping at all, which is what the owner asked for
in the first place. `flexShrink: 1` beside `flexWrap: 'wrap'` was a
misunderstanding worth recording: Yoga collects flex lines from the
basis, before any shrink is resolved, so a wrapping row breaks at 252
however much the chips could have given up — and the chip left alone on
the second line is then stretched across it by `flexGrow`, which is the
complaint in a louder form. Wrap and shrink cannot both be the cushion.
With the wrap gone the five always share the row and `flexShrink`
absorbs a narrow width as a tighter chip.

Measured after the change, in the popup — the narrower of the two
containers this renders in: at 375pt and at 360dp, the two narrowest
widths that ship, the five sit at one offsetTop with the longest label
(44pt) inside its chip's content box (48.6pt and 45.6pt). At 300px they
still hold one row — but reading that as "the labels fit" would be the
measurement backwards. They stay on one line because the browser will
not break a single word, and at that width they overflow their chips
instead; iOS and Android would break inside the word rather than
overflow, which is no better to look at. The crossover follows from
where those two numbers come from — a chip is `(W − 82) / 5` inside the
popup and its content box is ten less — so it is 352pt exactly, not a
bisected estimate. Nothing in the iOS deployment range reaches it: Expo
SDK 57 requires iOS 16.4, which puts the 320pt iPhone SE out of range
and makes 375pt the floor there. An iPhone in Display Zoom does reach
it, and so would sub-360dp Android hardware. Shrink can narrow a chip;
what it cannot do is make a name fit. That corroborates the arrangement rather than
proving the device: Chrome and CoreText do not measure the same string
identically, and whether a label wraps is exactly a measurement
question. (Two write-ups of this went wrong before this one, both in
the direction the entry is about. The first blamed a `flex-shrink`
default that Yoga and CSS supposedly disagree on: they do, but
react-native-web's own `View` sets `flexShrink: 0`, so the web client had
Yoga's default all along, and line collection ignores shrink in either
engine. The second read a measurement backwards, calling one-line labels
a fit when they were an overflow. A note about evidence that asserts an
unchecked mechanism, and then misreads its own numbers, is twice the
fault it is warning about.) The simulator screenshot stays what it
was; at 402pt every width in this discussion fits, so it witnesses the
names and the meters, not the narrow case.

## 2026-09-14 — the third pass: four corrections, and two things learned

Designed with a five-agent pass (one per item plus a gesture specialist)
and two critics over the four plans. The critics earned their keep: they
found that items 1 and 4 would collide in `ProfileView` — item 1 planned
to re-document a `header` prop item 4 deletes the only caller of — and
that three plans each intended to open their own dated ROADMAP section.
They also caught four wrong line citations and one wrong claim about how
many call sites `BackLink` has. Order was theirs: 4, 3, 2, 1.

**The composer's gap was a rename, not a taste.** `git show 2c33df1`
(2026-09-09) replaced the composer's `paddingBottom: 28` with
`Math.max(insets.bottom, 12) + 12` while the chat was a ROOT route, where
the inset was owed. `6ffdbb0` (2026-09-11) renamed the file under
`(tabs)/(matches)/` byte-identically, and the padding became a second
helping silently: the tab bar is `49 + inset` tall with `paddingBottom:
insets.bottom` of its own, and `useSafeAreaInsets` is a plain context read
with no idea what is below it — `SafeAreaProviderCompat` deliberately
renders a plain View rather than re-providing a reduced value. Five other
screens had the same bug. `lib/insets.ts` now asks
`BottomTabBarHeightContext`, which is defined for a screen the tab
navigator renders and undefined elsewhere — which is exactly the
question. `legal.tsx` is why it has to be a question and not a constant:
one component, two routes, one of them outside the tabs. `Popup` keeps a
raw inset and says why.

**The chat could never have had a swipe-back.** Worth writing down,
because the next person will reach for the native gesture. Under iOS 26
the whole-screen pop gesture is on by default, but
`react-native-screens`' `ios/RNSScreenStack.mm`
`shouldRequireFailureOfGestureRecognizer` makes it require the failure of
any scroll view pan whose content is wider than its frame — and this
screen's pager always is. Only the system edge strip popped, which is why
the chat read as having no swipe-back at all. The fix is therefore not a
gesture but a third, empty page in front of the thread: swiping onto it
is leaving. That also gives Uyum's right-swipe for free, because from
page two a right-swipe was always just one page back.

The arithmetic lives in `lib/chat-pages.ts` with a test, for one reason:
`pageAt` is asked to name a page from a content offset, and every
degenerate input — width 0 before layout, NaN — rounds to index 0, which
is the page that navigates. A screen that has not been laid out must not
be able to take the user off it by arithmetic accident.

**What the page deletion cost and did not.** `person/[id]` lost its last
entry point when `MatchDetail` dropped its link in the second pass; the
deck's pill was the only one left. Deleting it takes `lib/person.ts`,
`personHref`, `t.person.back` / `gone` / `openMatch`, `ProfileView`'s
`header` and `footer` props, and the `(discover,matches)` array group —
the only use of expo-router's array syntax in the tree, which
`routes.test.ts` had carved an exception for; the exception stays, with
its reason reworded, because it is a property of such a directory rather
than of that one. What is lost is a web deep-link target: `/person/<id>`
was a real page and is now a 404. Nothing in the app linked to it, and
the sheet shows the same thing.

## 2026-09-14 — the fourth pass: the top edge

Four requests, one missing move. The horizontal gutter has been cancelled
by the carousel since 2026-09-12 with `marginHorizontal: -SCREEN_PADDING`;
the top is the same contract in the other axis. What made it not a
one-liner is that the three hosts do not share a number, and one of them
cannot be reached from inside at all: `Popup` puts its 24pt gap on the
_sheet_, above the scroll view, so a negative margin inside the scroll
view lands above offset 0 and is clipped. That killed the obvious "one
prop on ProfileView" and forced a host change either way.

`Screen` cancels rather than zeroes. Zeroing its 68 would have meant
handing the clearance back by hand to the spinner and the error branch,
with a control-height constant — and the constant the losing design
proposed was 34 where the pill is 36, because it forgot the 1pt border on
each side. A magic number invented to undo a padding you chose to destroy
is the design telling you it took the wrong branch.

`bounces={false}` is the whole of "yukarı doğru scrollanmasın", and it is
scoped: on `Screen` only when `bleed`, on `Popup` only when `bleed`, so
the three titled sheets and every other screen keep their bounce. iOS has
no per-edge control, so the profile also loses its bottom rubber-band —
a small, named cost.

`Popup` resets the context unconditionally, bleed or not. A `Modal`
renders its children in the same React tree, so the full-chart sheet
opened from inside a bleed `Screen` would otherwise inherit that screen's
68 and cancel a padding this host never applied.

**The deck stopped scrolling, and a piece of the record narrows with it.**
The 2026-09-11 entry about the scroll view stealing the pan — the
`scrollEnabled={false}` remedy held in reserve, and the 300/90 and
200/180 diagonal-drag measurements — describes a mechanism this surface
no longer has: there is no ancestor scroll view on the deck. The finding
itself still stands wherever a pan lives inside a scroll view, which is
now the two sheets and the profile tab. The termination-request refusal
stays as the general safety net, because a Modal opening under a live
finger still terminates.

The deck's vertical budget is now fixed, which is why Dynamic Type below
the photo is capped at 1.35 rather than the 1.6 `MAX_LABEL_SCALE` allows:
with nothing to scroll into, text that grows without limit eats the
picture. The accessibility sizes are served uncapped by the two sheets,
which do scroll — which is exactly why `bounces={false}` had to be scoped
to bleed sheets only.

## 2026-09-14 — the fourth pass, amended on a second look

Five follow-ups the owner sent after seeing the pass on the device, all
small, one of them undoing something this session had just added.

**The top scrim is gone.** It was drawn so the fixed light status bar
would stay legible over a pale photograph; the owner does not want the
darkening. `PhotoTopScrim` and the `chrome` half of the top-gap contract
went with it, so `useTopGap` is now a number rather than a pair — the
simpler thing it should have been once its second consumer disappeared.

**The deck and the profile photos are one size.** `PHOTO_SCREEN_FRACTION`
in `ui.tsx` is the single number; the profile takes it as an explicit
height and the deck fills what its fixed block leaves and caps at it.
That asymmetry is deliberate: the deck cannot scroll, so it must be free
to shrink on a screen too short for the full share, and a cap can only
make it smaller. The fraction is 0.55 rather than 0.56 for exactly that
reason — at 0.56 the deck's own block left it 4pt short of the cap and
the two edges did not meet. Measured on the device afterwards: the photo
ends at 474.0pt on the deck and 472.7 on the profile, the 1.3pt being the
bottom gradient's own falloff, which starts higher on the profile because
its scrim also carries the page dots.

**The pills moved up and two things left the card.** "Uyum detayı" and
"Profili gör" sit directly under the name now rather than at the foot of
the screen — the owner asked for both arrangements a few hours apart, and
this one is the later word. The aspect sentence and the remaining count
are out entirely, with their strings.

**On the space under the tab bar**, which the owner asked about rather
than asked for: the bar is `49 + insets.bottom` = 83pt here, of which the
bottom 34 is the home-indicator inset iOS reserves and react-navigation
applies. The app adds nothing to it — `tabBarStyle` sets only colours and
the top border. Trimming it means overriding the bar's height and letting
the labels sit closer to the indicator, which is a taste call and is
therefore parked rather than taken.

## 2026-09-14 — the deck's two pills became two glyphs

The owner did not like the pills and proposed two round text-free buttons
in the corner of the photo. Taken, with one thing designed around: two
unlabelled circles sit a few points above the filled ✕ and ♥, and four
circles of similar size on one screen would read as four peers — two of
which decide something irreversible. So the pair is smaller (44 against
62), outlined and translucent rather than filled, and lives _on_ the
picture rather than on the background, which is the same separation the
card already makes between "look closer" and "answer".

Icon-only costs guessability, so neither glyph is invented: the reading
button is the `BandMeter` the card shows a few points below, shrunk, and
the person button is the profile tab's own head and shoulders. Both carry
an `accessibilityLabel` with the words the pills used to show.

One real bug on the way, worth the note because it will recur: the
buttons did nothing on the first run. The name's gradient is absolutely
positioned across the bottom of the photo and was painted after them, so
it took the touch. It is decoration plus a name, so it is now
`pointerEvents: 'none'` and the buttons render after it. `ProfileView`'s
own scrim had had that property since the day it was written; the deck's
copy never did, because until now nothing sat under it.

With the pills gone the card had about 68pt of slack between the band and
the ✕ / ♥, so `PHOTO_SCREEN_FRACTION` went 0.55 → 0.62 and the photo took
it. The profile follows the same constant, so the two still end on the
same line.

## 2026-09-14 — the deck card and the profile, measured against each other

The owner said the photo, the name and the big three did not look exactly
the same on the two screens. Two agents diffed the drawing paths and
resolved every token to points rather than eyeballing it; the list came
back the same from both, and all of it was the deck's side drifting.

Four numbers, all bare literals in `discover.tsx` where the profile's
equivalent comes from `Screen` through `SCREEN_PADDING`: the name's
gutter (16 against 24), the gap under the last line inside the gradient
(8 against 12), the big-three row's gutter (16, which also made every
chip 5.3pt wider) and the gap above that row (8 against `Screen`'s own
12). The deck moved in every case, because the profile's values live in
the component three screens share and moving them would drag the deck's
own person sheet and the chat header's along.

The fifth was not a style at all. The deck always draws a distance line
under the name; the owner's own profile has nothing to put there and so
drew none, which let the name drop 22pt on that one screen. The caption
is now always rendered, empty when there is nothing to say. A blank line
reserved on purpose is worth the note, because it looks like a mistake to
anyone who finds it without this paragraph.

Verified after the change rather than asserted: the big-three row starts
at the same x and ends at the same x on both screens, and its top edge is
at 502.0pt on each.

Two differences are left standing on purpose. The profile draws paging
dots and the deck does not — the deck shows one photo by design, and the
dots sit above the name so they move nothing. And the deck caps Dynamic
Type where the profile does not, which is invisible at the default size
and deliberate above it: the deck cannot scroll and the profile can.

The photo also got shorter — `PHOTO_SCREEN_FRACTION` 0.62 → 0.56 — and
the verdict buttons went 62 → 76pt with it, which is what the owner asked
the height for.

## 2026-09-15 — the photo and the band become the controls; and a disk that filled

**The deck has no secondary buttons now.** The owner dropped the two
corner glyphs: a tap on the photo opens the person, a tap on the band
block opens the reading. That reverses the 2026-09-11 rule that the photo
is a swipe surface only, and it is the gesture question the rule existed
to avoid, so it was checked rather than assumed. The card's responder
never claims on touch start, only on horizontal movement past
`CLAIM_DISTANCE`, so a tap reaches the photo's `Pressable`; and when a
drag does cross the threshold, the responder takes the touch and the
press is cancelled before it can fire. On the device: a tap on the photo
and a tap on the band each opened their sheet, and an 80pt drag moved the
card and let it spring back with no sheet and no `likes` row. One
known softness, not fixed: a long _vertical_ drag that ends inside the
photo still counts as a press, because nothing claims vertical movement
any more; it opens the profile rather than doing nothing.

✕ / ♥ are 88pt and centred in the free space: the card hugs its content
and the footer is `flex: 1` with a minimum of one button's height, so the
buttons sit between the band and the tab bar instead of against the bar.
Both card and photo may shrink, so on a screen too short for the full
photo share it is the picture that gives way.

**The environment broke underneath the session, and it was the disk.**
Docker Desktop would not open and every simulator reported "runtime
profile not found". Docker's own log had the cause at 05:22: "Docker
Desktop cannot continue because the disk is full". The backend stayed
hung after the error dialog closed, which is why reopening did nothing;
killing it and relaunching brought the engine back, and the local
database came through intact. The same disk pressure had evidently cost
the iOS 26.5 simulator runtime: `simctl runtime list` showed no disk
images at all. The owner re-downloaded it (`xcodebuild -downloadPlatform
iOS`, 8.5 GB), and installing it removed the now-orphaned device folders
— including the simulator this project had used all along, with Expo Go
and the signed-in session on it. A new iPhone 17 Pro was created and
Expo Go installed from `~/.expo/ios-simulator-app-cache` rather than
downloaded again.

`supabase start` after the Docker restart left the **edge runtime**
stopped (its container had exited 255 in the crash). Two symptoms, one
cause: every photo on screen drew as an empty tile, since photos come
through the `photo` function (ADR-0006), and the supabase test workspace
failed on the `delete-account` preflight. `docker start
supabase_edge_runtime_juno` fixed both. Worth checking first the next
time photos go blank.

The disk is at about 87% with 25 GB free. It filled once; the npm cache
(2.4 GB) is the one clearly safe thing left to reclaim.

## 2026-09-15 — the matches screen gets a top, the tab items come down, the deck's gaps even out

**New matches along the top.** With the page heading gone, the matches
screen had a list starting at the top of an otherwise empty page. It now
opens with a "YENİ EŞLEŞMELER" row: the matches nobody has written to
yet, as round faces, newest first, scrolling sideways edge to edge. The
list below it holds only the conversations. With nothing new the row does
not collapse — it says "Şimdilik yeni eşleşme yok." — so the top is
never bare (the owner's condition on picking this option). Two iOS
gotchas on the way: a bare `Link` renders as Text, and its line box cut
the top off the round photo, so the item is `Link asChild` around a
`Pressable`; and `asChild` passes props through a slot that drops a
style callback, which left the name unaligned under the photo, so the
item takes a plain style. Screenshots: `v6-matches-no-new.png` (the empty
row) and `v6-matches-new-strip.png`, for which a mutual like between
Selin and Burak was written to the local database with
`seed-like.ts` — test data, left in place.

**Tab items lower in the bar.** They sit at the top of react-navigation's
49pt UIKit row, which is `justifyContent: 'flex-start'`, with the home
indicator's 34pt below; on this dark screen, with no indicator drawn,
they read as riding high. `tabBarItemStyle: { paddingTop: space.xs }`
moves them 4pt down — measured on the device, the icon top went from
10.7pt below the bar's border to 14.7, and the label from 36.0pt above
the screen edge to 32.0. The bar's height is unchanged; trimming its
bottom padding instead would not have moved top-aligned items at all.

**The deck's three gaps under the chips are equal by construction.** The
owner asked whether the space above and below the compatibility block
matched; measured, it did not (21.3pt above, 23.7 below, 26.7 under the
buttons) — the top one was a fixed padding and the others the flexible
remainder, and they merely happened to be close on this screen. The free
space now splits by flex weight — one share inside the card between the
chips and the band, two to the footer, which spends them evenly above and
below the buttons — with the same 8pt floor on each, and the band block
lost its own vertical padding, which had added to both of its gaps. Its
touch target keeps its reach through `hitSlop`. Not yet measured on the
device: the simulator was in the owner's hands on another screen.

## 2026-09-15 — tab items centred, the deck's reading made whole, and a correction

**Tab items, centred for real.** The 4pt nudge was not enough; the owner
asked for them exactly in the middle. React Navigation lays the item out
from the top of a 49pt row and gives the home indicator's 34pt below it
as padding, so no amount of item padding could centre it within that
row. The bar keeps its standard height but its row now gets all of it
(`paddingBottom: 0`), and the items move down by `barHeight / 2` minus
their measured centre (28.85pt) — clamped to zero on a phone with no
home indicator, where the bar is the standard one. Measured:
23.7pt from the border to the icon, 23.0 from the label to the screen
edge. `v6-tabbar-centred.png`.

**"Uyum detayı" on the deck is the match page's reading.** The owner
wanted the deck's sheet as detailed as the Uyum tab after a match,
without the match part. The block is now one component, `PairReading` —
the band word, then `CompatibilityDetail` with the two aspect sections,
the house overlays and five aspects rather than three — rendered by both
the match page and the deck sheet, so they cannot drift. Left out as
match-specific: the "EŞLEŞTİNİZ" heading, the starter, the photo strip
and the safety controls. The deck's sheet lost the band meter it used to
draw beside the word, because the match page has none.

**The profile's bottom** keeps the gutter (24pt) under "Tüm haritanı gör"
instead of 56. `Screen` has that one caller.

**A correction to the previous entry.** It said the deck's three gaps
under the chips were equal "by construction". The layout boxes are; the
drawn gaps were not — measured 28.7 / 24.0 / 23.3pt. The band word's line
box is taller than its letters, by about 4.7pt above and 0.7 below, so
the gap above the band reads larger. The band is now lifted 4pt and the
gap above the tab bar given 5 more. **Not yet re-measured**: the
simulator was in the owner's hands. Neither is the deck's new reading
sheet or the profile's bottom gap; all three are typechecked, linted and
on the committed HEAD, and nothing more than that is claimed for them.

## 2026-09-15 — settings and filters as popups

**Settings is a sheet over the profile, filters a sheet over the deck.**
The two routes are gone (`settings/index.tsx`, `filters.tsx`); their
bodies are `SettingsPanel` and `FiltersPanel`, and the sliders glyph moved
out of the profile into `SlidersIcon` so both chips draw it. The legal
route still lives at `settings/legal`, and `/blocked` and `/legal` fall
back to `/profile` now that the page they used to return to does not
exist.

**Navigating out of a sheet has to wait for it.** The first build closed
the settings sheet and navigated to `/blocked` in the same handler; on
the device the sheet closed and nothing opened. On iOS a navigation
issued while a `Modal` is still animating away is dropped. `Popup` now
takes `onDismissed`, wired to `Modal.onDismiss` — which React Native
implements on iOS only; react-native-web calls it too — and on Android
fired when `visible` turns false. The profile queues the navigation (a
page, or the trip to sign-in after sign-out or account deletion) in a ref
and runs it from `onDismissed`. Checked on the device: "Engellediklerin"
and "Gizlilik ve lisanslar" each open from the sheet. Sign-out and delete
were not driven — delete is destructive and sign-out would have ended the
session the owner is using; both run the same queued path as the two
links.

**Top-right, not top-left.** The owner asked for the filters chip
top-left and corrected it to top-right while it was being built. It now
sits exactly where the profile's settings chip sits (the same
`Math.max(insets.top, space.xl)` from the top, the same gutter), so the
control does not move between the two tabs. That put it in the pass
stamp's corner, so both stamps now start 12pt below the chip. One thing
for the owner: the two chips now draw the same glyph in the same place
and mean different things — settings on one tab, filters on the other.

## 2026-09-15 — filters by drag, and settings pages inside the sheet

**Radius and age are sliders; the band floor is one row.** The owner
found the chips and the steppers slow ("daha kolay seçilmeli") and chose
the proposal: a five-stop radius track, a two-thumb age track, each value
written across from its label as the finger moves and saved once on
release, and a four-part segmented row for the band floor with its lowest
option called "Hepsi". `Track` is `PanResponder`-based — React Native's
own slider has one thumb — with the stop arithmetic in `lib/track.ts`
under Vitest. Two things it needed:

- The sheet's scroll view is native and takes over a touch that drifts
  vertically, so `Popup` now provides `useSheetScrollLock`, and a track
  holds the sheet still between grant and release (and on unmount, for a
  sheet closed under a finger).
- The lint rule that stopped the deck reading refs from its handlers
  stopped this too, and the deck's answer — remake the responder when
  its inputs change — does not work here, because the inputs change on
  every stop a drag crosses and a remade responder loses the drag. The
  gesture is a small class held in `useState`, told the latest props in
  an effect.

Checked on the device: both age thumbs and the radius thumb dragged and
wrote 39–81 and 100 km to the local database; a tap on the radius track
jumped to 50; drags past the ends held at 18 and 99; "Belirgin" saved as
`strong`. Selin's filters were put back to 50 km, 18–99, Hepsi through
the same controls. Not driven: VoiceOver stepping on the thumbs.

**Blocked people and privacy inside the settings sheet.** The owner
asked that the two links open inside the popup rather than as pages. The
host keeps which view the sheet shows, because the sheet's title names
it; "‹ Ayarlar" returns to the list, `Popup` gained `contentKey` to start
the body at the top when the view changes, and every opening starts at
the list. `BlockedList` and `LegalText` are the pages' bodies; the root
`/legal` page wraps `LegalText` for people who are not signed in, and
`/blocked` and `/settings/legal` are deleted. The blocked list is read on
mount, which is each time the sheet shows it, where the page used to read
on focus. Checked on the device: both views open, back returns to the
list, reopening starts at the list, and the legal text scrolls inside the
sheet.

A simulator note: while this was being built the owner was using the
same simulator, and one screenshot caught their screen rather than the
one being checked; it was deleted and retaken.

## 2026-09-15 — the settings gear

**Settings draws a gear.** Raised in the previous entry: the profile's
settings chip and the deck's filters chip sat in the same corner of
neighbouring tabs with the same sliders glyph. The owner chose a gear for
settings. `SlidersIcon`'s old comment had argued against a gear — at 26pt
a disc with spokes reads as a sun, which this app draws for real — so
`GearIcon` is an outline with eight flat-topped teeth and a hole, its path
computed from a few constants rather than copied from an icon set, which
leaves no licence to credit. Checked on the device (`v6-profile-gear.png`
and an enlarged crop): it reads as a gear, and the chip still opens the
settings sheet.

## 2026-09-15 — an unread badge on the Eşleşmeler tab

**What it counts.** The sum of `unread_count` over `match_profiles` — the
column the conversation rows already show — so the tab and the list agree
by construction, including leaving out a blocked person's thread. The
arithmetic (`totalUnread`, `badgeText` with its "99+" cap) is in
`lib/unread-count.ts` under Vitest; the read and the subscription are
`lib/unread.ts`.

**When it moves.** `useUnreadTotal`, mounted in the tabs layout, reads on
sign-in and again, after a 300ms settle, on any Realtime insert or update
on `messages` (RLS limits those to my threads; one thread marked read is
one update per message, hence the settle), on `notifyUnreadChanged()` —
called by `markThreadRead`, `blockUser` and `unblockUser` after they
succeed, and by the list on every focus — and when the app returns to the
foreground. A failed read keeps the last count rather than showing zero,
and the count is held with the user it was read for, so a second account
on the same device never sees the first one's number. With the socket
down the badge still follows this device's own reads, the list and the
foreground; a message from someone else then waits for one of those.

**Accessibility.** React Navigation does not announce the badge, so while
there is a count the tab's accessibility label becomes "Eşleşmeler, N
okunmamış mesaj". Not driven with VoiceOver.

**The row badge** sat on the name's line, at the top-right of the card;
the owner asked for it centred. It is now the row's last child, and the
row already centres its children, so it lines up with the avatar.

Checked on the device, with test messages written to the local database
as Burak to Selin (`Rozet testi 1`–`4`, left in place; the fourth is still
unread): three messages showed 3 on the tab and on Burak's row; opening
the thread stamped `read_at` on all three and both badges went; a fourth
inserted while Keşfet was open showed 1 on the tab with no reload.

## 2026-09-15 — review fixes

code-reviewer covered d08ff23..af210f1 (the fourth and fifth passes) and
returned NEEDS_WORK. Each of its eleven findings went to its own verifier
in a workflow, told to refute first and to settle behaviour from the
library source in `node_modules`, not from memory. Ten were confirmed and
one (the filters close race) only partly. What each turned out to be:

**Sign-out and deletion stranded the user (important, b3b7ac8).** The
earlier entry claimed both "run the same queued path as the two links".
They did not. `supabase.auth.signOut()` awaits `_notifyAllSubscribers
('SIGNED_OUT')` before it resolves (auth-js `GoTrueClient._removeSession`),
so every `useSession` flipped while the sheet was still up; the profile's
guard returned `RedirectToSignIn` and unmounted the sheet mid-presentation
— Fabric then dismisses the modal with its event emitter already reset,
so `onDismissed` never fired — and every mounted screen's redirect issued
`router.replace` during that dismissal, the case already recorded as
dropped on iOS. Now the sheet closes first and the host runs the
sign-out and the navigation from `onDismissed`; a deletion keeps the sheet
locked on its in-flight label until the server answers; and the settings
chip is disabled once a leave is asked for, so the sheet cannot be
reopened in the gap before the session ends. **Not driven on the device**:
it needs a sign-out, which would end the owner's session, and signing back
in is theirs to do.

**A slider took every touch (important, c22f58c).** The track claimed at
touch-down, jumped the thumb, locked the sheet and saved on release or on
termination, so a touch meant to scroll the sheet changed a filter. A touch
is now read first (`readTouch`, 8pt slop): sideways is a drag, which then
jumps the thumb and locks the sheet; vertical is the sheet's, untouched; a
lift before either is a tap. Release saves only a change, termination
never saves, and `onCancel` lets the panel drop what a drag showed. The
verifier's reading of RN: iOS ignores `onShouldBlockNativeResponder`, so
the scroll lock is still needed once a drag is under way; Android needs the
flag false for a vertical move to reach the scroll view.

**The deck hid who it shows from VoiceOver (important, de106f6).** An
accessible button's label replaces the text inside it. The photo now
reads "Kaan, 35, 15 km. Profili gör" and the band "Belirgin uyum. Uyum
detayı". Not read on the device: the simulator's accessibility reader was
unavailable this session.

**The minor ones.** Android tab items no longer centre into the system
navigation bar (0f06ea3). In the filters panel (c22f58c): a tap where a
stored radius between the options shows no longer rewrites it
(`optionToWrite`); a touch beside an age range closed to one stop takes
the thumb on its side (`nearerThumb`); a stored age above 99 is clamped to
the track's end on load; nothing is live until the row has loaded, and a
failed read shows an error and a retry; the deck's reload and a reopened
panel wait (at most the read timeout) for filter writes still in flight.
In the settings sheet (b3b7ac8), a swapped view scrolls back instead of
remounting, which had thrown away a deletion in flight. On the deck
(de106f6), a vertical drag that stays on the photo no longer opens the
profile.

Checked on the device: the settings sheet's views and back; with a stored
70 km, a tap on its thumb wrote nothing, a vertical drag starting on the
age track changed nothing, a tap on the age track saved 38, a sideways
drag saved 100 km, and closing the sheet straight after a drag and
reopening it showed the new values (Selin's filters were set back to
50 km, 18–99, Hepsi); on the deck a vertical drag opened nothing, a tap
opened the person, a short sideways drag sprang back. The badge work in
bfb2e2b and the gear in 0287afe were outside that review; the next review
covers them with these fixes.

## 2026-09-15 — review fixes, second round

**The owner signed out from the settings sheet on the device**, after
b3b7ac8: the sheet closed and sign-in opened. That closes the one check the
previous entry left undriven for sign-out; deletion is still not driven.

code-reviewer then covered af210f1..2ba5336 and returned NEEDS_WORK. A
workflow checked the Realtime question on the local stack and put a
skeptic on each planned fix before any of them was written.

**A deletion that finished after the sheet was closed (important,
bea3805).** b3b7ac8 queued every leave until the sheet reported itself
gone; if the person closed the sheet while "Siliniyor…" showed, nothing
would report it gone again, and they stayed signed in to a deleted account
with the settings chip off. `LeaveGate` now decides: while the sheet is up
or fading, wait for `onDismissed`; while it is down, go at once; only the
first leave counts, so "Çıkış yap" during a deletion cannot sign out twice
(a late second sign-out would wipe a session signed in since); nothing
runs once the profile is gone. "Çıkış yap" is also disabled during a
deletion. Refusing to close the sheet during a deletion was considered and
rejected: the delete call has no timeout, so a hung one would trap the
person in the sheet.

**The badge's subscription (important, open).** Every signed-in device
subscribes to all `messages` inserts and updates, and Realtime runs one RLS
check per subscriber per change. What the workflow measured on the local
stack (Realtime v2.130.0, SQL pipeline): `realtime.apply_rls` evaluates a
subscription's filter before its RLS check, so filtered-out subscribers
cost no RLS; 2000 fake unfiltered subscribers cost 2000 `match_open` calls
per change. An `in` filter on `match_id` works (an event in a listed match
arrived, one in an unlisted match did not), but the filter check itself
costs about as much as RLS at 50 ids, uuid lists over 69 fail on
Realtime's own index, and a failing subscription delayed or dropped events
for the other channels on the same socket. A `recipient_id=eq.` filter was
the cheapest measured. The decision is put to the owner (ROADMAP).

**Minor.** A sign-out could hang on a connection that accepts and never
answers: auth-js waits for `/logout` with no timeout. The client's fetch
now gives that one request the read timeout, and an aborted call takes
auth-js's dropped-connection path, clearing the session on the device once
(dee41d0; the workflow ran this against the local stack). The filter-write
tracker chained every answer for the life of the app and made each later
read wait out a hung write again; `PendingWrites` gives each write a slot
with its own deadline, and a write that ends with no answer (status 0),
which may still have landed, now reads the row back instead of reverting
and claiming failure (a0b2cd1). With a count, the tab's label had replaced
the library's iOS "tab, 3 of 3"; it is rebuilt from the navigator's route
list with the count after it, and the badge reads again whenever its
channel joins or rejoins (54c669d).

Not driven on the device: the simulator is signed out, and signing in is
the owner's. All of this round is covered by unit tests (`leave-gate`,
`pending-writes`, `tab-a11y`) and the battery.

## 2026-09-16 — messages carry their recipient

The owner chose option 1 for the badge's subscription: a `recipient_id`
column (ADR-0010). What was done and what to know:

- **The migration** (`20260916000001_message_recipient.sql`) adds the
  column, backfills it from each message's match with the edit guard held
  off for that one statement, requires it with a check constraint, fills
  it on every insert from a security-definer trigger (a client-supplied
  value is overwritten), freezes it in `forbid_message_edit`, and indexes
  it by recipient for the profile-deletion cascade.
- **Applied locally with `npx supabase migration up`, not `db reset`**, so
  the owner's local accounts and threads stayed. The 14 existing messages
  all got a recipient, none equal to their sender.
- **A check, not NOT NULL.** The first draft used NOT NULL, which the type
  generator turns into a required field on every insert; the file was
  changed to a check constraint after it had been applied locally, and
  the local database was brought in line by hand (drop not null, add the
  check). A fresh run of the migrations produces the same schema.
- **The badge** subscribes with `recipient_id=eq.<me>` for inserts and
  updates. `realtime.test.ts` measures it: Ada's subscription received
  Bora's message and then her own read receipt; Bora's own subscription
  did not receive the message he sent; Cem, naming Ada's id, received
  nothing, because RLS still decides.
- **Not on the device yet**: the simulator is signed out. The previous
  on-device badge checks (NOTES 2026-09-15) exercised the unfiltered
  version.
- **Hosted**: nothing is deployed; this migration goes with the first
  `npx supabase db push`, ask-tier. The CLI sends each migration file as
  one transaction, so the edit guard can never be left disabled, and the
  first run of it will be on an empty table.
- **Checked before commit by a two-lens workflow** (security, migration
  safety), all on the local stack inside rolled-back transactions. It
  found three minor things, fixed in the file and by hand locally:
  the trigger function kept EXECUTE on PUBLIC, which let an
  authenticated SQL session attach it to a temporary table and learn the
  other member of any match (no API route reaches it; revoked now); the
  index was partial and could not serve the deletion cascade (now plain);
  and the backfill addressed a non-member sender's row to one side where
  the trigger gives none (now the same rule, so such a row fails the
  migration loudly). Confirmed fine: a client cannot address a message to
  anyone but the other member by any insert, update or upsert; RLS still
  refuses non-members with 42501 before the check constraint; Realtime
  applies the filter before RLS and does not publish deletes on this
  table; no view exposes the column.
- **Follow-up, not done here**: `messages_reply_in_match`,
  `create_match_on_mutual_like` and `profiles_check_birth` are also
  security-definer trigger functions with EXECUTE on PUBLIC — the same
  pattern, pre-existing (ROADMAP).

## 2026-09-16 — review of the recipient change

code-reviewer covered 28713b4..9449861 and returned NEEDS_WORK on one
important finding, in a test rather than the code:

**The freeze test proved nothing.** "Who a message is for cannot be
changed afterwards" updated an unread message with a patch that carried no
`read_at`, so `forbid_message_edit` refused it by its other rule — "read_at
cannot be cleared" — whether or not `recipient_id` was frozen. The older
`reply_to` freeze test had the same flaw. Both now send a `read_at` with
the forbidden change and assert the refusal's message ("only read_at may
change"), and the recipient test then shows the same receipt landing
without the change. Measured, not argued: with a copy of the guard that
freezes neither column installed on the local database, both tests failed;
the real guard was put back and both pass.

This is the second time an assertion on an error code passed for the wrong
reason in this file. A standing rule for it is proposed to the owner rather
than written unasked.

**Minor, also fixed.** The badge's realtime test now also shows the
sender's recipient subscription staying silent when the other side reads
his message. A new test pins that a message whose sender is not in the
match is refused even by the service role, by the recipient check. In the
filters panel, a thumb let go while the row is being read back no longer
leaves a value on screen that nothing saves. ADR-0010 now says the order
for the first deploy: the database before any app build carrying the
filtered badge, since a subscription on a missing column fails and, on the
local stack, disturbed the other channels on the socket.

**Left as is.** A write aborted on the client may still commit on the
server after the panel has read the row back; whether PostgREST cancels
the statement when the client goes away is not checked. The local
database's migration history row for 20260916000001 holds the first draft
of the file; the schema itself matches the committed file.
