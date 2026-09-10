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
- [ ] **Close the local/CI gap around Edge Functions.** CI was red for
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
      _Code done, checkbox waiting on the run: this item's own done-when
      asks for CI green, and CI has not seen the commits yet. A vitest
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
      catches side-effect, dynamic and computed imports too, after three
      review rounds found the first version blind to all of them; every
      assertion was checked by a fixture that fails without it. What it cannot
      promise: pinning the top of the graph is not a lockfile —
      supabase-js itself declares `npm:@opentelemetry/api@^1.0.0`, and
      that range is still resolved at cold start._

- [ ] **Visual design (Claude Design).** The screens are functional but
      unstyled beyond a provisional dark palette. `docs/design-brief.md`
      is the prompt and context for a claude.ai/design project; the
      owner runs the design there, then the screens are implemented in
      `apps/mobile` with tokens in one file and shared pieces in
      `apps/mobile/components`. `/design-sync` is not applicable until
      that component set exists (2026-09-09: nothing to sync yet).
      — done when: every screen in the brief matches the accepted design
      in the simulator (screenshot per screen under `screenshots/design-*`),
      tokens live in one file, and the battery is green.
- [ ] **TestFlight.** Confirm Apple Developer Program membership for
      oguzpancuk (create if missing — ask-tier), reserve bundle ID
      `com.oguzpancuk.juno`, check App Store name availability; hosted
      Supabase project (EU), EAS project, first `eas build` + `eas submit`;
      refs recorded in `docs/NOTES.md`.
      — done when: `/deploy-checklist` passes and an external tester installs
      the build (manual). Ask-tier: never without the owner's yes.

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
