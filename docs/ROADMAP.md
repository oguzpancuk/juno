# Juno — Roadmap

<!-- The product, the repo and the code all say Juno. Historical entries
     below keep the old `stardate` name where it describes what was on
     screen at the time. -->

<!-- Written via /mvp-scope from the PRD. Every item has a done-when clause
     naming its verification. Status moves only with evidence. -->

Legend: PRD-n refers to the numbered core interaction in `docs/PRD.md`.
Verification kinds: `battery` = `bash .claude/hooks/verify.sh` (Vitest,
tsc, ESLint, Prettier); `screenshot` = iOS simulator screenshot saved under
`screenshots/`; `manual` = a checklist step a person clicks through.

## Walking skeleton

<!-- The thinnest end-to-end path through every layer, completable in days.
     Core job completed once: sign in → birth data → chart → see one
     other person with a compatibility score → mutual like → chart-based
     conversation starter. Chat itself is v1 (the starter is the value). -->

- [x] **S0 — Environment boots, battery is born.** Root `package.json` with
      npm workspaces; `packages/astro` (tsc, Vitest) with ONE real test
      (Sun sign for a known date); `apps/mobile` from `create-expo-app` with
      Expo Router rendering a "stardate" screen; shared `tsconfig` strict,
      ESLint, Prettier; `.claude/hooks/verify.sh` unchanged.
      — done when: `bash .claude/hooks/verify.sh` exits 0 on a clean committed
      HEAD (battery) and `screenshots/s0-boot.png` shows the app on the iOS
      simulator (screenshot).
- [x] **S1 — Planets in signs (PRD-2 engine half).** `computeChart(input)`
      returns ecliptic longitude, sign, degree-in-sign and retrograde flag for
      Sun–Pluto using `astronomy-engine`; input is UTC instant + lat/lon with
      a Zod schema.
      — done when: Vitest compares 3 reference charts (Swiss Ephemeris via
      `scripts/gen-fixtures.py`, the same engine astro.com runs, stored as
      JSON fixtures validated by Zod) and every planet is within 1° with the
      same sign and retrograde state (battery).
- [x] **S2 — Ascendant + Placidus houses (PRD-1/2).** Ascendant, MC and 12
      cusps; each planet gets a house. Birth time is mandatory: the Zod input
      schema has no "unknown time" branch.
      — done when: Ascendant and MC within 1° and every planet in the same
      house as astro.com on the 3 fixtures (battery).
- [x] **S3 — Birth place → UTC instant.** `packages/geo`: offline city
      list (GeoNames cities15000 subset — all Turkish entries plus world
      cities ≥ 100 k, ~1 MB JSON, Zod-validated at first use, CC BY 4.0
      attribution owed in the app), diacritic-insensitive prefix search, and
      `localToUtc(local, ianaZone)` via `Intl` so historical DST rules apply;
      `resolveBirth(cityId, local)` yields the chart engine input.
      — done when: Vitest resolves "İstanbul, 1995-07-14 03:30",
      "Ankara, 1990-01-01 12:00", Helsinki 2001 and Sydney 1988 to the UTC
      instants of the astro fixtures, plus Turkey's 2016 zone change and a
      DST gap/overlap (battery).
- [x] **S4 — Backend skeleton with RLS.** `supabase init`; migration
      `20260908000001_skeleton.sql`: `profiles` (id = auth uid, display_name,
      birth_date with an 18+ CHECK, birth_local, birth_city_id, birth_utc,
      public `chart` jsonb — CHECK forbids engine-input keys —, big_three,
      gender, interested_in, PostGIS `location` snapped to a 0.01° grid by
      trigger, radius_km default 50; birth data and chart immutable after
      insert), `likes` (from, to, kind, `starter_key` domain — a like needs
      one, a pass forbids one; a second swipe is a PK violation), `matches`
      (a < b, starter_key) filled only by a security-definer trigger on
      mutual like that takes a pair-scoped advisory lock and requires both
      keys to agree; RLS: own profile read/insert/update, likes
      insert-own/read-own, matches read-own; anon revoked; TRUNCATE/
      REFERENCES/TRIGGER revoked; `discover` view (owner-executed) applies
      radius + mutual gender preference, hides self and already-swiped,
      exposes id, name, age, gender, big_three, chart and a km-rounded
      distance; `match_profiles` view exposes the counterpart of each match
      with the same column list; email OTP with confirmations on and a
      `{{ .Token }}` template for both magic-link and signup mails.
      — done when: `npx supabase db reset` succeeds and the Vitest suite in
      `supabase/tests` (supabase-js typed from `gen types`, Zod-parsed rows,
      a workspace so the battery runs it; a missing stack FAILs) proves:
      anon is denied; A cannot read B's birth_utc/location nor filter on
      them; out-of-radius and preference-mismatched profiles are absent from
      A's `discover`, which exposes only the public columns; a pass hides a
      visible profile; A cannot like as B, insert a match, or change others'
      rows; A liking B then B liking A — sequentially or simultaneously —
      yields exactly one match visible to both and to nobody else; a
      mismatched reciprocal key is refused; the committed types match
      `gen types` (battery; CI starts a stack via supabase/setup-cli pinned
      to the CLI version the tests assert).
- [x] **S5 — Sign in, birth data, chart screen (PRD-1, PRD-2 UI half).**
      Email OTP sign-in; onboarding form (display name, gender, interested
      in, birth city picker, date, time — all required; birth date < 18 years
      ago rejected inline); device location requested once, city centre used
      on refusal; chart computed on device with `packages/astro`; profile row
      upserted with chart JSON; chart screen lists big three + 10 planets with
      sign/house (placeholder one-line Turkish text per planet-in-sign; full
      texts in v1).
      — done when: `screenshots/s5-chart.png` (+ `s5-chart-2.png`, scrolled) shows the chart for fixture #1
      and the values equal the fixture (screenshot + manual compare), which
      also proves Hermes' `Intl` resolves Europe/Istanbul 1995 like Node's
      ICU (a second manual check at a midnight wall time guards the ICU
      "24" hour quirk); the city index is warmed on screen mount; the profile row exists in local DB with a location (manual:
      Supabase Studio).
- [x] **S6 — Discover with compatibility (PRD-4).** The engine's
      `compatibility(chartA, chartB)` in `packages/astro` implements `docs/adr/0003-compatibility.md`
      and returns 0–100, harmony/tension sums, every inter-aspect and the
      strongest one; `starterKey`/`parseStarterKey` encode the
      `likes.starter_key` contract; `describeAspectTr` renders the why-line.
      `supabase/scripts/gen-seed.ts` (tsx) writes six seeded users with
      real charts (five around Istanbul, one in Ankara). Discover screen
      shows one card (name, age, distance km, big three, score, why-line),
      sorted by score then distance; Like/Pass write `likes` with a
      uuid-ordered starter key; swiped profiles are excluded by the view.
      Settings offer radius presets 5/25/50/100/500 km (chips, not a slider
      — same function, no extra dependency).
      — done when: Vitest asserts the score is symmetric, bounded, equals
      the hand-computed synthetic pair (65) and matches the ADR table case
      by case (battery); `screenshots/s6-discover.png` shows a card with
      score and distance; after Pass and Like the cards do not return on
      re-entry (manual, verified); `screenshots/s6-radius-500.png` shows
      the Ankara seed appearing only after the radius is widened (manual).
- [x] **S7 — Match + conversation starter (PRD-5).** `starterSentenceTr`
      renders a like's `starter_key` from the viewer's side with a question
      (one placeholder line per aspect type; pair-specific lines are v1
      content); the match trigger stores the agreed key; after a like the
      client checks `match_profiles` directly and opens `/match/[id]`; the
      root layout also subscribes to `matches` inserts over Realtime
      (RLS-scoped) for the other side; `/match/[id]` reads `match_profiles`
      through Zod; a matches list links back; `supabase/scripts/seed-like.ts`
      makes a seeded user like a tester on the local stack.
      — done when: Vitest covers starter selection/orientation and the
      sentence for both sides (battery); `seed-like.ts deniz` then Like on
      Deniz in the simulator shows `screenshots/s7-match.png` with the
      starter (observed immediate — at that commit the only path was the
      Realtime INSERT event, so delivery to a client is evidenced; the direct
      check was added afterwards) and `s7-matches.png` lists the match; the
      `matches` row carries the same key both clients computed (manual,
      psql). NOT evidenced: delivery to the _liked_ user's own device within
      5 s (PRD-5 "both users") needs a second signed-in simulator — covered
      by the v1 chat item's two-simulator check.

Skeleton exit: all seven checked, `verify.sh` green on clean HEAD,
code-reviewer run, remotes + CI (`ci.yml`) live, NOTES entry written.

## v1

<!-- What makes the skeleton shippable to a TestFlight cohort. Order is the
     build order; Apple-required items are marked (Apple). -->

- [x] **Chat (PRD-6).** `messages` table, RLS (only the two match members),
      Realtime subscription, conversation list with last message + unread
      flag; starter pinned at top of the thread.
      — done when: RLS Vitest proves a third user gets 0 rows and cannot
      insert (battery); two simulators show a message crossing within 2 s
      (`screenshots/v1-chat.png`, manual timing). _Done: 8 RLS tests plus a
      Realtime test that measures the crossing (346 ms) and proves an
      outsider's socket stays silent; the second simulator was replaced by
      a scripted peer (see NOTES 2026-09-09)._
- [x] **Profile photos + bio (PRD-3).** Private Storage bucket with a
      per-user folder policy; 1–6 photos; profile absent from `discover`
      until ≥ 1 photo; `delete-account` removes the folder.
      — done when: Storage policy test proves user A cannot write to B's
      folder (battery); a photo-less profile never appears in discover;
      `screenshots/v1-profile.png` shows the profile screen (screenshot).
      _Done: RLS tests cover the folder rule, the six-photo and
      own-folder triggers, a path with no object behind it, nesting below
      the owner folder, signing another member's photo until a block, the
      photo gate on discover, and the folder going with the account —
      including a folder larger than one Storage listing page and one
      with a nested object in it. `photo.test.ts` asserts that a block and
      a deletion answer identically.
      Verified in the browser: bio saved from the profile screen, the
      photo rendered there and on the discover card, and the chart screen
      nudging a photo-less profile; `screenshots/v1-profile.png` is the
      same screen in the simulator. Photos are served by the `photo` Edge
      Function, which authorises every request (ADR-0006), verified on
      both clients: the browser fetches the bytes and the simulator sends
      the token as a header. Not automated: the OS file chooser
      that `expo-image-picker` opens, so the pick step itself is
      unexercised; the upload path underneath it is covered by tests._
- [x] **Safety controls (PRD-7) (Apple).** Block, report (reason enum),
      delete account (Edge Function with service role deletes auth user +
      storage objects; cascades handle rows).
      — done when: Vitest proves blocked pairs vanish from discover, matches
      and messages both ways and the report row exists (battery); manual
      delete-account run leaves 0 rows and 0 storage objects for that uid.
      _Done: RLS tests for blocks and reports, and Edge Function tests
      covering the auth paths, CORS and a delete that clears the profile,
      likes, match, messages and blocks while the other person survives and
      the report stays with the caller's id and
      note cleared.
      No storage bucket exists yet, so "0 storage objects" is trivially
      true; the photos item must add the folder delete to the function.
      `screenshots/v1-safety.png` shows the controls; their button wiring
      is not verified (NOTES 2026-09-09)._
- [x] **Blocked list in settings.** The server already allows an unblock
      (`blocks: delete own`, covered by an RLS test); the app has no screen
      for it, so a misfired block is permanent for the user.
      — done when: settings lists blocked people and an unblock restores
      the match, verified in the simulator against the database.
      _Done: `my_blocks` reads a name snapshotted onto the block row when
      it is written — the first version joined `profiles` live, which
      turned one insert into a read on any profile id (closed in
      `20260909000012`). `/blocked` lists it with an unblock, and RLS
      tests prove the other side sees nothing, the view is read-only, and
      the name does not follow a rename. Verified in the browser (listing,
      unblock, and the row gone from the database) and
      `screenshots/v1-blocked.png` shows the screen in the simulator.
      Undoing a block restores the thread on both sides, which is a
      recorded trade: ADR-0007._
- [ ] **Sign in with Apple (Apple).** Alongside email OTP.
      — done when: manual sign-in on a real device works and creates the same
      profile flow (manual; not simulator-testable).
- [ ] **KVKK consent + privacy policy (Apple).** Consent checkbox with
      text at sign-up (covers birth data and location), stored `consent_at`;
      privacy policy hosted at a URL; about/legal screen credits GeoNames
      (CC BY 4.0) and astronomy-engine (MIT).
      — done when: profile insert without `consent_at` is rejected by a
      CHECK constraint (battery) and the URL returns 200 (manual).
      _Built: the notice is rendered at `/legal`, linked from settings and
      from sign-in, with the GeoNames and astronomy-engine credits
      (`screenshots/v1-legal.png`); onboarding carries a checkbox that
      must be ticked, and the profile stores `consent_version` (no
      default, so a profile cannot be created without it) plus a
      server-stamped `consent_at`. Still open, both outside the code: the
      two owner placeholders in the notice, and hosting it at a public URL
      — which the web client's `/legal` route becomes once deployed._
- [x] **Full Turkish content (owner priority, before chat).** _Built,
      source-verified (`docs/astro-sources.md`), owner signed off on the
      texts on 2026-09-09 (NOTES)._ Professional
      1–2-sentence interpretations for every combination the engine can
      emit, as data in `packages/astro/content/tr/*.json` validated by Zod:
      planet×sign (120) + rising sign (12), planet×house (120), retrograde
      (8), natal aspects (45 scorable pairs × 5 minus 11 geometrically
      impossible = 214), synastry aspects (51 pairs × 5 = 255, each with an
      opening question), element pairs for
      Sun and Moon (20), score bands (5). Engine gains `natalAspects(chart)`
      and a ranked synastry summary. UI: chart screen shows sign + house
      lines per planet and an aspects section; discover card keeps score +
      one line plus an expandable detail; the match screen shows the top
      aspects with meaning and the pair-specific opening question.
      Authored by Claude, reviewed by the owner.
      — done when: a Vitest asserts every key the engine can emit has a
      non-empty snippet in every content file (battery);
      `screenshots/c1-chart-texts.png`, `c1-aspects.png`, `c1-synastry.png`
      show the texts on the real user; owner sign-off recorded in NOTES.
- [x] **Session in SecureStore.** The skeleton keeps the Supabase session
      (refresh token) in AsyncStorage, Supabase's documented Expo default but
      plaintext in the sandbox.
      — done when: the session survives an app restart and the AsyncStorage
      value is ciphertext (manual, simulator).
      _Done, by a simpler route than the clause imagined: the session goes
      into the keychain whole, so there is no ciphertext in AsyncStorage —
      there is nothing in AsyncStorage. The clause assumed SecureStore
      caps a value at 2 KB; measured on the simulator, this version stores
      16 KB, so the cipher and key handling a first attempt introduced
      were deleted. A session left by an older build is moved into the
      keychain on first read and the clear-text copy removed.
      `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, so an encrypted backup restored
      onto another device does not carry it. Verified on the simulator: a
      clear-text session planted in Expo Go's AsyncStorage, the app opened
      (signed in), `manifest.json` back to `{}` with no `refresh_token`
      anywhere in the store, then Expo Go quit and reopened — still signed
      in, so the session is read from the keychain. A fresh install drops
      whatever the keychain kept from a previous one — an iOS keychain
      entry outlives the app, so without that a reinstall (or the next
      owner of a resold phone) lands inside the old account; verified on
      the simulator as well. ADR-0008 records what the platform leaves
      open. 42 tests cover the move (including the
      upgrade that introduces the marker itself, driven on the simulator
      too), both-places sign-out, an unreadable keychain never falling
      back to the clear-text copy, a failed write leaving a good session
      alone, the wipe applying per key and being retried until it goes
      through, a session signed in on a fresh install surviving a later
      key's first touch, a sign-out the keychain refused still reading as
      signed out, and a sign-in that lands while that delete is retried
      surviving it._
- [x] **Server-side birth_utc validation.** Devices with stale tzdata
      (Android especially) can compute a wrong `birth_utc`; the server
      recomputes it from city + wall time and rejects a mismatch before the
      profile is stored.
      — done when: a Vitest against the local stack proves an inconsistent
      `birth_utc` is rejected and a consistent one accepted (battery).
      _Done as a trigger, not the Edge Function this line first named: the
      check belongs in the write path, where nothing can go around it, and
      Postgres carries a full zone database. `city_zones` (6594 cities,
      generated from `packages/geo`) is closed to clients and read by a
      security-definer check. An instant is accepted if it renders back to
      the submitted wall clock in that zone — which takes both readings of
      a repeated hour — or if it equals what Postgres computes from the
      wall clock, which is what an hour that never happened resolves to.
      Four RLS tests, including an unknown city and a one-hour error._
- [x] **City search UX.** Word-prefix matching ("york" → New York) and a
      curated Turkish exonym list (Viyana, Münih, Londra …) in
      `packages/geo`.
      — done when: Vitest covers both (battery). _Done: tiered search plus
      53 exonyms, resolved by ascii name + country and guarded by a test._
- [x] **Location refresh.** "Konumu güncelle" in settings re-reads device
      location and updates `location`.
      — done when: manual check in Studio shows the point changed. _Done:
      simulator moved to Ankara, the stored point went from
      POINT(29.02 41.03) to POINT(32.86 39.93) (grid-snapped);
      `screenshots/v1-location.png`._
- [ ] **Metrics.** SQL views for onboarding completion, matches,
      conversations with ≥ 3 messages each side; crash reporting (Sentry via
      `@sentry/react-native`).
      — done when: the views return the PRD success-signal numbers on the seed
      data (manual, Supabase Studio); a forced test crash appears in Sentry.
      _Views built (`20260909000011`): onboarding completion, matches and
      how many carried a message, two-sided conversations with the ≥ 3
      each threshold, and the report queue with the age of the oldest.
      Aggregates only, and closed to every client — a view has no policies,
      so the grant is the boundary, and a test proves a member and anon
      are both refused. Read on the seed data through psql rather than
      Studio. Sentry is parked: it needs an account, and the owner takes
      third-party sign-ups at the step that needs them._
- [x] **Web client (ADR-0005).** Expo Router web output of the same
      screens, so people can use the product without the App Store, as
      `pati` does.
      — done when: the web build serves sign-in, onboarding, chart,
      discover, matches and chat, verified in a browser.
      _Done against the LOCAL stack (a browser on this machine reaches it,
      so the hosted project was not needed yet): sign-in with an emailed
      code, onboarding including city search, chart, discover with swipe,
      a mutual like producing a match, sending and receiving a message,
      filing a report and blocking. `screenshots/web-sign-in.png` is the
      unauthenticated page; the authenticated screens were driven and read
      back in-session. Still open for the hosted project: EXPO_PUBLIC_*
      env for a deployed build and where to host the static output._
- [x] **Close the local/CI gap around Edge Functions.** CI was red for
      days because the workflow started a stack without the edge runtime
      and twelve tests reported a bare status mismatch instead of naming
      the missing service (docs/NOTES.md, 2026-09-10). Two leftovers of
      the same class: the Supabase test run has no probe that the
      functions gateway answers, and the functions import
      `jsr:@supabase/supabase-js@2` — a floating major with no import map
      or lockfile, resolved over the network on CI's cold Deno cache
      inside a 20 s test timeout.
      — done when: a missing or unbooted edge runtime fails the Supabase
      suite with a message naming it and the fix, every remote import in
      the functions is pinned, and CI is green on the commit that does it
      (battery + the run).
      _CI green on 9de4b83 (run 34452505805, 4m25s), which is what this
      item's done-when asked for. CI had already gone green one commit
      into this work, at 2012b1c — the line that stopped excluding the
      edge runtime — so what this run adds is that the gates built on top
      of it hold, against a runtime booting on a Deno cache a fresh
      runner creates empty. A vitest
      globalSetup preflights every function directory with OPTIONS, which
      they answer 204 before reading a token, so warming them changes
      nothing; it also moves the cold-cache download out of a test's 20 s
      budget. Checked by starting the stack without the runtime: one
      error naming the function, the 503 and the fix, in place of twelve
      status mismatches. The version is pinned in the specifier rather
      than an import map — the CLI's handling of `functions/deno.json`
      could only be verified for serve here, never for deploy, and a
      mechanism that fails first in production is not worth the single
      source of truth. `tests/functions-pinned.test.ts` is the gate,
      since tsc and ESLint both ignore `functions/`. It reads every
      module extension Deno runs, everywhere under `functions/`, and
      catches side-effect, dynamic and computed imports too — five review
      rounds, the first four finding a shape it was blind to and the last
      finding strings it flagged that were never imports. The parser and
      the source scan both have tables of cases, so what took those
      rounds to get right fails on a revert without a poisoned module
      under `functions/`; the walk and the three policy assertions were
      checked by mutation. What it cannot
      promise: pinning the top of the graph is not a lockfile —
      supabase-js itself declares `npm:@opentelemetry/api@^1.0.0`, and
      that range is still resolved at cold start._

- [ ] **Make the Edge Function preflight assert the worker, not the
      status.** `tests/global-setup.ts` accepts any 204, and the reason a
      204 means the function's module was evaluated — each returns its own
      `access-control-allow-methods` — is checked nowhere. A gateway that
      answered preflights itself would leave the gate green with the edge
      runtime dead, which is the incident it was written for.
      — done when: the preflight asserts each function's own
      `access-control-allow-methods` value, and a fixture answering 204
      without it fails the suite (battery).

<!-- The C series continues the "Full Turkish content" item above, whose
     screenshots are `c1-*`; these five carry the 2026-09-10 amendment. -->

- [x] **C2 — Presentation layer (PRD amendment 2026-09-10, ADR-0009 §1/§2/§5).**
      The dimension mapping table lands in `packages/astro` and drives four
      things at once: the five dimension sums, the card titles derived from
      (dimension × valence), the match page's two-section split, and which
      aspects are eligible for the primary view. UI: the chart screen leads
      with the six product-language cards ("Nasıl seversin · Venüs Akrep'te")
      and moves the other planets, houses and natal aspects behind an
      "explore your full chart" disclosure; the match screen becomes band +
      summary, "why you're drawn to each other", "where it gets interesting",
      each aspect showing its glyph, orb to the arcminute and a strength
      label; the discovery card gives the chart real visual weight.
      — done when: a Vitest asserts every one of the 51 scored pairings maps
      to exactly one dimension, that the per-dimension counts equal
      ADR-0009's table (8/12/6/7/18), and that every (dimension × valence)
      has a title (battery); `screenshots/c2-chart.png`, `c2-discover.png`
      and `c2-match.png` show the three screens (screenshot).
      _Done. `dimensions.ts` is the table, with eight tests: the 51
      assignments pinned as a full map, the row count and duplicate check,
      and one driving real charts so the aspects are ones the engine emits.
      A pairing under two dimensions throws at import. `titles.json` is
      thirty card titles by (dimension × valence × variant), picked by a
      stable hash of the aspect and stepped on when a title is already on
      the screen — two cards both reading "Anlaşılan taraf" is what made
      that necessary. `placements.json` titles the six leading placements.
      Screens: `screenshots/c2-chart.png` (six cards, no repeated rising
      text), `c2-chart-full.png` (the disclosure open on the ten planets),
      `c2-discover.png` (band word beside a four-step meter, no number),
      `c2-match.png` and `c2-match-sections.png` (band, dimension chips,
      the two sections with orbs). Driven on the simulator against the
      local stack as the tester Ece, matched with the Kaan seed._
- [x] **C3 — Bands and labels (ADR-0009 §2/§3).** No score is shown as a
      number (owner decision, 2026-09-10). The whole calibrated surface is
      thirteen figures written by `packages/astro/scripts/score-distribution.ts`
      and committed: three cut points for the overall score's four near-equal
      bands (a discrete score cannot split evenly; the cuts are in ADR-0009's
      figures block) and two per
      dimension for its three labels. A dimension with no aspect renders absent even when an
      element bonus gives it a value.
      — done when: a Vitest asserts the band of a pair is the band its raw
      score falls in, that each dimension's labels come from its own cuts and
      not the overall ones, that a bonus-only dimension renders absent, and
      that over a bounded sample (300 charts, about a second) every band
      holds 20–30 % of pairs (battery). The committed table is checked
      against the script by rerunning it and diffing — a manual step named
      next to the script, not a battery step, since the only way to get the
      script's output is to regenerate the population (~23 s against a suite
      that runs in 0.44 s). The generator moves somewhere both the script and
      the bounded-sample test can import, so there is one copy of it rather
      than two.
      _Done. `content/calibration.json` is the thirteen figures, Zod-parsed
      at import; nothing else in the package holds a threshold. `bands.json`
      is four entries with no verdict in any of them — the old very-low and
      low texts told people a pairing would take work — and
      `dimensions.json` is five axis names with fifteen labels. Seven tests
      over a 300-chart sample. The generator moved to `src/sample.ts`, which
      the script and both tests import — three copies before, one now — and
      it refuses a count past the point where the draws start repeating._
- [x] **C4 — Section fill rule (ADR-0009 §5).** The two match-page sections
      fill from the curated 17 pairings first and widen to all 51 when a
      section cannot be filled; a section that is still empty is omitted with
      its heading rather than filled. `bands.json`'s `very-low` and `low`
      sentences, which pass judgement on a pairing and between them are shown
      to about a fifth of pairs (ADR-0009's figures block), are retired by the
      amendment's copy rules.
      — done when: hand-built pairs prove each branch: a section with no
      aspect is omitted rather than filled or judged, a section with one or
      two is shown as it is, and neither case produces a verdict sentence. A
      bounded sample cannot carry the no-positive branch — at the committed
      seed a 300-chart sample has no pair without a positive aspect, fourteen
      without a tense one and thirteen short of three, reproducible with
      `npx tsx packages/astro/scripts/score-distribution.ts --charts=300` —
      so the rule is sized against the figures block in ADR-0009, not against
      a sample in the battery (battery).
      _Done: six tests, including a pair with only positives, one with only
      tensions, one showing two cards, and one with no aspects at all. The
      curated list moved into `dimensions.ts` so the engine and the script
      read one copy._
- [x] **C5 — House overlays (60 texts).** The partner's Sun, Moon, Mercury,
      Venus and Mars falling in the viewer's 1st, 5th, 7th, 8th, 11th or 12th
      house, written in both directions (5 × 6 × 2). No engine work: the
      public chart already carries the twelve cusps, so this is content plus
      a lookup. A deeper layer — one card by default, the rest disclosed.
      — done when: the content test proves all 60 keys have a non-empty text
      and the direction is never mixed up (battery);
      `screenshots/c5-overlays.png` shows the section on a real pair.
      _Done. The card's title is the house's dating meaning rather than a
      repeat of the text's opening clause. Five tests plus the generic
      content rules, which caught a telegraphic sentence on the way in._
- [x] **C6 — Weighted-ranking readiness (ADR-0009 §4).** `compatibility()`
      returns a harmony sum and a tension sum per dimension alongside the
      overall score — two figures, never one signed sum, which would collapse
      to `H − T` and lose the split on the great majority of pairs (the
      figures block in ADR-0009 has the share) — plus Growth's
      absolute sum. A viewer's own priorities can then reorder `discover`
      without recomputing anything and without touching a displayed value.
      No UI in v1: the item exists so the door stays open without breaking
      the symmetry ADR-0003 guarantees.
      — done when: a Vitest asserts that the five dimensions' harmony sums
      reconstruct `harmony` and their tension sums reconstruct `tension`,
      both to `roundTerm`'s six decimals (float associativity makes `===`
      fail on about half of pairs) — the element bonuses are already inside
      Stability and Emotional per ADR-0009 §1, so adding them again would
      overshoot by up to 4 — that the result is still symmetric in its
      arguments, and that a weighted ordering over the generated population
      differs from the unweighted one for at least one viewer (battery).
      _Done, and two symmetry defects surfaced while testing it: terms were
      accumulated in traversal order, and `separation` came from
      `lonB − lonA`, which normalises asymmetrically. The second changed
      scoring at exact-boundary orbs — ADR-0003 amendment 3 — and was the
      real asymmetry; the first is defensive. Six tests, one of which pins
      which dimension owns each element bonus, since swapping them left the
      totals invariant and the labels wrong._
- [x] **Visual design (Claude Design).** The screens are functional but
      unstyled beyond a provisional dark palette. `docs/design-brief.md`
      is the prompt and context for a claude.ai/design project; the
      owner runs the design there, then the screens are implemented in
      `apps/mobile` with tokens in one file and shared pieces in
      `apps/mobile/components`. `/design-sync` is not applicable until
      that component set exists (2026-09-09: nothing to sync yet).
      `docs/design-brief.md` was regenerated on 2026-09-11, after C2–C6: the
      six-card chart screen with its disclosure, the band word and four-step
      meter in place of the score component, and the match screen's two
      aspect sections plus the house overlays. Its prompt now carries the
      two rules the amendment set. It is ready to paste.
      — done when: every screen in the brief matches the accepted design
      in the simulator (screenshot per screen under `screenshots/design-*`),
      tokens live in one file, and the battery is green.
      _Done, by a different route than this clause imagined: the owner
      brought a finished design on 2026-09-11 rather than running a Claude
      Design session, so `design-brief.md` was never used as a prompt — it
      stands as the written record of the screens. The token file is the one
      place a colour lives: no literal survives in any `.ts` or `.tsx` under
      `apps/mobile`, checked by grep. `app.json` is the exception and has
      to be — Expo reads the splash and adaptive-icon colours out of it
      before any JavaScript runs — so it carries the ground colour as a
      literal, kept equal to `color.bg` by hand. `apps/mobile/components/ui.tsx` is the shared set, trimmed
      to what the screens import. Screenshots:
      `design-chart.png`, `design-discover.png` (which predates the scroll fix
      and still shows the card stretched to the bottom edge —
      `design-discover-detail.png` is the shipped layout),
      `design-match.png`,
      `design-match-sections.png` for the screens the design changed most,
      plus `design-sign-in.png`, `design-discover-detail.png`,
      `design-matches.png`, `design-settings.png`, `design-profile.png`,
      `design-chat.png` (which predates two changes to the send button's
      colour), `design-legal.png` and `design-blocked.png`. Ten
      of the eleven; onboarding needs an account part-way through sign-up
      and was not photographed._
      NOT met: the mockups carry a compatibility percentage on most
      screens, five numeric dimension scores and a Juno-asteroid feature.
      The first two are refused by ADR-0009 §3 (owner reaffirmed on
      2026-09-11) and the third by ADR-0004 — `astronomy-engine` has no
      asteroids. The design's visual language was taken; those three
      elements were not.
- [x] **C7 — the screens the design session needs.** The owner's plan is
      to have Claude Design style the app, which needs the screen set to be
      complete first: a sign-in/sign-up entry, the other person's profile
      and chart, the conversation starter as a surface of its own, and the
      beat between onboarding and the chart. Three owner decisions on
      2026-09-11 shaped it: no notifications screen ("1. olmadan girelim"),
      discovery filters by band rather than by percentage ("2. bant
      üzerinden yapalım"), and build the age range ("3. yap").
      — done when: every screen below renders against seeded data in the
      simulator (screenshot per screen under `screenshots/c7-*`) and the
      battery is green on a committed HEAD.
      _Done. `welcome` (`c7-welcome.png`) and the existing `sign-in` are
      the entry pair; `filters` (`c7-filters.png`) carries the age range,
      the minimum band and the Sun-element preference, with the age range
      filtering `discover` in both directions. `person/[id]`
      (`c7-person.png`), `person/[id]/chart.png` (`c7-person-chart.png`)
      and `person/[id]/full` (`c7-person-full.png`) are the other side of
      a match; the last draws the chart as a wheel. `starter/[id]`
      (`c7-starter.png`) is one question at a time with "Bunu gönder" and
      "Başka bir tane". `Calculating` (`c7-calculating.png`) is the beat
      after onboarding — captured mid-hold from a frame burst, since the
      hold is shorter than a screenshot round trip. `c7-onboarding.png`
      finally photographs onboarding itself, which the design pass could
      not reach. The natal chart also gained the house reading the owner
      asked for ("gezegenlerin hangi evde olduğu da bir şey ifade
      etmeli"): every card now says what its planet's house means._
- [x] **C8 — the shape of the app.** The owner's navigation decisions of
      2026-09-11: "haritam sekmesi profilim olarak değişmeli, profilden
      haritaya ulaşmalı, profil düzenleme de oradan olmalı" and "sekme bari
      aşağıda olmalı: profil - keşfet - eşleşmeler", plus a home for
      settings. Also the chart's house readings, which were labelled on the
      six cards at the top and unlabelled everywhere else.
      — done when: the three tabs render with the right screen under each,
      the chart is reached from the profile and settings from the profile's
      own control, a new account lands inside the tab bar, signing out
      leaves nothing of the old session on the stack, and the battery is
      green on a committed HEAD (screenshots under `screenshots/c8-*`).
      _Done. `c8-profile.png`, `c8-discover.png`, `c8-matches.png` are the
      three tabs; `c8-chart.png` is the chart as reached from the profile.
      Settings is the profile's top-right control — sliders, not a gear,
      because a gear at 26 points is a circle with eight spokes and this
      app draws real suns. `c8-onboarding-lands-on-chart.png` and
      `c8-back-from-chart-is-the-deck.png` are the first-run path: the
      chart arrives with the deck underneath it, which `replace('/chart')`
      alone did not do once the deck moved into the tab group.
      `c8-sign-out-lands-on-sign-in.png` is where signing out ends up.
      It is deliberately not offered as proof of the stack being one route
      deep: a mid-drag frame with nothing behind it is pixel-identical to
      one taken without a gesture at all, so the image cannot tell those
      two apart. What it shows is the landing; the single-route stack was
      read off the reducer and watched in the simulator (an edge swipe
      revealing nothing), and holds by construction because every route to
      sign-in now goes through `leaveToSignIn`._
- [ ] **TestFlight.** Confirm Apple Developer Program membership for
      oguzpancuk (create if missing — ask-tier), reserve bundle ID
      `com.oguzpancuk.juno`, check App Store name availability; hosted
      Supabase project (EU), EAS project, first `eas build` + `eas submit`;
      refs recorded in `docs/NOTES.md`.
      — done when: `/deploy-checklist` passes and an external tester installs
      the build (manual). Ask-tier: never without the owner's yes.

## The five-item pass (owner request 2026-09-11)

<!-- The owner's list of 2026-09-11 in five sections: general (tab bar on
     every screen, popups, sign-up/sign-in), profile, discover, matches.
     Planned by four read-only scouts plus a partition critic; the file
     claims below are the partition. Serial foundation first, then four
     worktree tracks — the owner's explicit yes ("paralel worktreelerde
     başlatalım"). Mechanics: `.claude/skills/parallel-tracks/SKILL.md`. -->

Shared resources have one owner, the main session: the iOS simulator, the
Metro server on 8082 and the local Supabase stack. A track therefore runs
the battery WITHOUT the supabase workspace (`npm run typecheck/lint/test`
for `apps/mobile`, `packages/*`, plus `npx prettier --check .`) and does not
`db reset`; the full `verify.sh` and every screenshot named below are taken
on main after that track's `--no-ff` merge. `lib/strings.ts` is written by
every track, in disjoint top-level sections only (named per track).
`docs/NOTES.md` is append-only and every track appends its own dated entry;
`docs/ROADMAP.md` is edited only inside the track's own item below.
Nothing here imports `react-native-gesture-handler` or `reanimated`: both
are peer-installed by expo-router, not dependencies of the app.

- [ ] **F — Foundation, serial on main (items 1.1, 1.2, 4.3).** Every
      signed-in screen renders inside the tab bar: `(tabs)/_layout.tsx`
      keeps three tabs named `(profile)`, `(discover)`, `(matches)`, each
      a nested Stack (`components/TabStack.tsx`, per-group `_layout.tsx`
      exporting `unstable_settings.initialRouteName`). Moves: profile,
      chart, settings (→ `settings/index.tsx`, with `settings/legal.tsx`
      re-exporting the root legal page), filters and blocked under
      `(profile)`; discover under `(discover)`; matches, chat, starter
      and a single copy of `match/[id]` under `(matches)`; `person/[id]/*`
      in the shared group `(discover,matches)`. The root Stack then holds
      exactly one signed-in route, so `leaveToSignIn` lands on a
      one-route stack by construction. Chat loses its "‹ Eşleşmeler"
      link; match loses its bottom "Tüm eşleşmeler / Keşfete dön" links
      and its post-block `replace` becomes `dismissTo('/matches')`.
      `lib/routes.ts` (`matchDetailHref`, `personHref`) replaces the five
      inline `/match/[id]` hrefs so Track D retargets them in one file.
      `components/Popup.tsx`: RN Modal, `color.scrim` backdrop, scrollable
      sheet, exactly one closing button (`t.common.close`). Shared pieces
      extracted before the fork: `components/Meter.tsx` (generic bars +
      `BandMeter`), `components/BigThreeRow.tsx`,
      `components/CompatibilityDetail.tsx` (union of the discover detail
      block and the match summary). `supabase/config.toml` flips
      `[auth.email] enable_confirmations` off for the stack the tracks
      share (owner: "maili sonra ayarlarız"). `lib/routes.test.ts` asserts
      the signed-out allowlist at the app root and a `_layout.tsx` with
      `unstable_settings` per tab group.
      — done when: battery green on a committed HEAD; `npx expo start`
      once so the gitignored `.expo/types/router.d.ts` regenerates and
      `npm run typecheck -w apps/mobile` still passes (CI never sees typed
      hrefs — `.expo/` is ignored and `ci.yml` starts no dev server);
      screenshots `c9-chat-in-tab-bar.png`, `c9-settings-legal-in-tab-bar.png`,
      `c9-match-in-tab-bar.png`, `c9-realtime-match-lands-in-tab.png`,
      `c9-sign-out-from-legal-lands-on-sign-in.png`, `c9-popup.png`;
      code-reviewer over the foundation range before the fork.

- [ ] **Track A — sign-up and sign-in with a password; inert Apple and
      Google buttons (item 1.3).** One screen, `sign-in.tsx`, with an
      `in | up` mode from a Zod-parsed route param; `signUp` /
      `signInWithPassword`; a `session === null` result shows
      "confirmation sent" instead of hanging (the hosted project, when
      created, must mirror confirmations off — recorded in NOTES). OTP
      removed. `lib/auth.ts` credentials schema (e-mail trimmed and
      lowercased, password 8–72); `lib/errors.ts` maps `weak_password`,
      `invalid_credentials`, `user_already_exists`/`email_exists`,
      `email_not_confirmed`. `welcome.tsx` primary button opens sign-up,
      a link opens sign-in, and two `OutlineButton`s (new in `ui.tsx`)
      read "Apple ile giriş yap" / "Google ile giriş yap" with empty
      handlers and a `// why:` naming the owner's 2026-09-11 decision;
      the file's "a dead button is worse" comment is rewritten to say so.
      `supabase/config.toml` `minimum_password_length` 6 → 8.
      Claims: `app/sign-in.tsx`, `app/welcome.tsx`, `components/ui.tsx`,
      `lib/auth.ts` (+test), `lib/errors.ts` (+test), `supabase/config.toml`,
      `supabase/tests/auth.test.ts`; strings sections `welcome`, `signIn`,
      `signUp` (new, right after `signIn`), `errors`.
      — done when: track battery green; `lib/auth.test.ts` and
      `lib/errors.test.ts` pass; on main after merge the auth DB test
      (`supabase/tests/auth.test.ts`) is green (fresh sign-up yields a session, duplicate →
      `user_already_exists`, 5-char password → `weak_password`, wrong
      password → `invalid_credentials`); screenshots `auth-welcome.png`,
      `auth-sign-up.png`, `auth-sign-in.png`, `auth-wrong-password.png`,
      `auth-one-tab-bar.png` (sign in as a seed account, sign out from
      `/settings/legal`, sign in again: one tab bar).

- [ ] **Track B — one profile for you and for them, with an edit mode
      (item 2, item 3's "tamamen aynı gözükmeli").** New
      `components/ProfileView.tsx`, presentational: paged photo carousel
      with name and age inside the photo on a scrim (the discover card's
      pattern), `BigThreeRow`, bio card, the three primary cards (Çekirdek
      benlik, Duygusal dünya, İlk izlenim) with their readings, then
      "Tüm haritanı gör" / "Tüm haritasını gör" opening a `Popup` with
      `components/ChartDetail.tsx` (wheel, the remaining three primary
      cards, all ten planets, aspects). `chart.tsx`, `person/[id]/chart.tsx`
      and `person/[id]/full.tsx` are deleted; sign-out moves to settings;
      onboarding lands on the profile tab. Edit mode: a "Düzenle" pill
      beside the settings control; while editing, the thumbnail strip
      gets ‹ › and Kaldır per tile plus "Fotoğraf ekle", the bio becomes
      a TextInput; the pill reads "Kaydet" and one `update({photos, bio})`
      persists order and bio (`lib/photos.ts` `saveProfileEdits`; add and
      remove stay immediate because the trigger needs the object to exist).
      Reorder is buttons, not drag: six items at most, no gesture
      dependency, and the rule is a pure tested function (`lib/photo-order.ts`).
      Own age is computed by `lib/age.ts` mirroring the view's SQL `age()`.
      Claims: `components/ProfileView.tsx`, `components/ChartDetail.tsx`,
      `(profile)/profile.tsx`, `(profile)/chart.tsx` (delete),
      `(profile)/settings/index.tsx`, `(discover,matches)/person/[id]/*`
      (index edit, chart + full delete), `app/onboarding.tsx`,
      `lib/photos.ts`, `lib/photo-order.ts` (+test), `lib/age.ts` (+test);
      strings sections `profile`, `person`, `chart`, `settings`.
      — done when: track battery green; `photo-order.test.ts` and
      `age.test.ts` pass; no href to the deleted routes remains (grep);
      on main after merge screenshots `p-profile.png`, `p-chart-popup.png`,
      `p-edit.png`, `p-reordered.png` (order survives a relaunch and shows
      on another account's discover card), `p-person.png` (same layout,
      no edit control), `p-onboarding-lands-on-profile.png`,
      `p-settings-sign-out.png`.

- [ ] **Track C — discover: detail popup, profile button, glyph chips,
      swipe to like or pass (item 3).** The card shows `BigThreeRow`
      glyphs; under the band meter two buttons side by side, "Uyum
      detayı" (opens `CompatibilityDetail` in a `Popup`) and "Profili gör"
      (`personHref`); the photo is no longer a link — that area is the
      swipe surface. Swipe with the built-in `PanResponder` + `Animated`:
      claim only when |dx| > 8 and |dx| > |dy| so the vertical scroll
      survives, rotate with dx, BEĞEN/GEÇ overlay, release decided by a
      pure `lib/swipe.ts` (`decideSwipe`: past 30 % of the width or a
      flick), fly out then the existing `act()`, spring back otherwise or
      while busy. The round ✕ / ♥ buttons stay.
      Claims: `(discover)/discover.tsx`, `lib/swipe.ts` (+test); strings
      section `discover`.
      — done when: track battery green; `swipe.test.ts` passes (like past
      the threshold or a rightward flick, pass symmetrically, null below
      both, null when dx and vx disagree); on main after merge screenshots
      `disc-card.png`, `disc-detail-popup.png`, `disc-after-swipe.png`
      (a `touch_path` drag past the threshold: card gone, count down, the
      `likes` row present in the local database), `disc-person.png`; and
      recorded in NOTES: vertical scroll still works, a tap on "Uyum
      detayı" does not swipe.

- [ ] **Track D — matches and chat: avatars, Okundu, Yanıtla, the
      chat/match pager, level meters, plainer names (item 4).**
      `components/Avatar.tsx` (round, initial-letter fallback); the
      conversation list resolves first photos with ONE `usePhotoSources`
      call (ADR-0006: never cached); the thread shows their avatar beside
      the last bubble of a run. Okundu: `lastReadMine` picks my newest
      read message and a faint caption sits under it; `useThread` adds a
      Realtime UPDATE binding (publication already publishes updates;
      DEFAULT replica identity suffices, asserted by a realtime test).
      Yanıtla: migration `20260911000002_reply_to.sql` adds
      `messages.reply_to` (FK, not self, same-match trigger, frozen after
      insert), `MessageRowSchema` and `sendMessage` grow the field; long
      press a bubble → reply bar above the composer; a replying bubble
      shows a quote resolved from the loaded window. Pager: `chat/[id]`
      becomes two pages in a horizontal paging ScrollView with a
      two-segment header (Sohbet / Uyum); page 2 is
      `components/MatchDetail.tsx` (what `match/[id]` renders today);
      `match/[id].tsx` is deleted and `matchDetailHref` retargets to
      `/chat/[id]?page=match` — a new match opens the chat on page 2.
      Meters: `LevelMeter` (three steps) replaces the level word in
      `CompatibilityDetail`, the word staying as the accessibility label;
      no number reaches a Text (ADR-0009). Names in
      `packages/astro/content/tr/dimensions.json`: Duygusal yakınlık,
      Çekim, İletişim, İstikrar, Gelişim.
      Claims: the migration, `supabase/tests/database.types.ts`
      (regenerated on main), `supabase/tests/rls.test.ts`,
      `supabase/tests/realtime.test.ts`, `supabase/scripts/seed-message.ts`,
      `lib/chat.ts`, `lib/thread-view.ts` (+test), `lib/routes.ts`,
      `components/Avatar.tsx`, `components/Meter.tsx`,
      `components/CompatibilityDetail.tsx`, `components/MatchDetail.tsx`,
      `(matches)/match/[id].tsx` (delete), `(matches)/chat/[id].tsx`,
      `(matches)/matches.tsx`, `(matches)/starter/[id].tsx`,
      `packages/astro/content/tr/dimensions.json`; strings sections
      `chat`, `match`, `matches`, `starter`.
      — done when: track battery green; `thread-view.test.ts` and the
      astro content/calibration tests pass with the new names; on main
      after merge and `db reset`: rls tests for reply_to (same match
      accepted, cross-match refused, unknown id refused, frozen after
      insert), the realtime UPDATE test, types-drift green; screenshots
      `chat-matches-avatars.png`, `chat-thread.png` (avatar, Okundu, a
      quoted reply, the reply bar, no back link), `chat-match-page.png`
      (page 2 with the kicker, level meters and the five names),
      `chat-meters-discover.png`, `chat-block-leaves-one-route.png`.

Owner decisions taken by default on 2026-09-11, each reversible (the
question and the default are in `docs/NOTES.md` under the same date): a
popup dims the tab bar too; onboarding lands on the profile tab; photo
order is moved with buttons; add/remove write immediately and Kaydet
writes order + bio; the discover photo is not a tap target; the full-chart
popup keeps the Mercury/Venus/Mars cards; the five dimension names above;
reply by long press; no separate "EŞLEŞTİNİZ" screen; password minimum 8.

## Deferred

- **Android** — the Expo codebase keeps it possible; nothing is tested
  there until the iOS TestFlight cohort produces feedback.
- **Push notifications (new match / message)** — matters for retention,
  not for proving the concept; needs APNs setup and an Edge Function
  trigger. Add after TestFlight shows people come back on their own.
- **LLM-generated explanations and starters** — PRD non-goal for now;
  templates are deterministic and testable. Revisit if TestFlight users
  call the texts generic; the Edge Function boundary makes it a drop-in.
- **Photo pre-moderation** — owner decided reports-only (2026-09-08);
  revisit before public launch if reports volume demands it.
- **Travel / passport mode (set a location by hand)** — the one-shot
  location plus manual refresh covers the seed cohort.
- **Transits, daily horoscope, notifications about "today"** — a
  retention feature for a product that first needs to prove matching.
- **Payments / premium** — nothing to gate yet.
- **English UI / i18n** — single-market launch; strings already live in
  one file so the cost later is translation, not refactoring.
- **Media in chat, voice, video** — text proves the starter works; media
  adds Storage cost and moderation surface.
- **Web app** — no user in the PRD uses a browser.
