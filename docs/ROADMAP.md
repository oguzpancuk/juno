# stardate — Roadmap

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
      — done when: `screenshots/s5-chart.png` shows the chart for fixture #1
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
      content); the match trigger stores the agreed key; the root layout
      subscribes to `matches` inserts over Realtime (RLS-scoped) and opens
      `/match/[id]`, which reads `match_profiles` through Zod; a matches list
      links back to each match; `supabase/scripts/seed-like.ts` makes a
      seeded user like a tester on the local stack.
      — done when: Vitest covers starter selection/orientation and the
      sentence for both sides (battery); `seed-like.ts deniz` then Like on
      Deniz in the simulator shows `screenshots/s7-match.png` with the
      starter within 5 s (observed: immediate) and `s7-matches.png` lists
      the match; the `matches` row carries the same key both clients
      computed (manual, psql).

Skeleton exit: all seven checked, `verify.sh` green on clean HEAD,
code-reviewer run, remotes + CI (`ci.yml`) live, NOTES entry written.

## v1

<!-- What makes the skeleton shippable to a TestFlight cohort. Order is the
     build order; Apple-required items are marked (Apple). -->

- [ ] **Chat (PRD-6).** `messages` table, RLS (only the two match members),
      Realtime subscription, conversation list with last message + unread
      flag; starter pinned at top of the thread.
      — done when: RLS Vitest proves a third user gets 0 rows and cannot
      insert (battery); two simulators show a message crossing within 2 s
      (`screenshots/v1-chat.png`, manual timing).
- [ ] **Profile photos + bio (PRD-3).** Supabase Storage bucket with
      per-user folder policy; 1–6 photos; profile absent from `discover`
      until ≥ 1 photo.
      — done when: Storage policy test proves user A cannot write to B's
      folder (battery); a photo-less seeded profile never appears in discover
      (manual); `screenshots/v1-profile.png`.
- [ ] **Safety controls (PRD-7) (Apple).** Block, report (reason enum),
      delete account (Edge Function with service role deletes auth user +
      storage objects; cascades handle rows).
      — done when: Vitest proves blocked pairs vanish from discover, matches
      and messages both ways and the report row exists (battery); manual
      delete-account run leaves 0 rows and 0 storage objects for that uid.
- [ ] **Sign in with Apple (Apple).** Alongside email OTP.
      — done when: manual sign-in on a real device works and creates the same
      profile flow (manual; not simulator-testable).
- [ ] **KVKK consent + privacy policy (Apple).** Consent checkbox with
      text at sign-up (covers birth data and location), stored `consent_at`;
      privacy policy hosted at a URL; about/legal screen credits GeoNames
      (CC BY 4.0) and astronomy-engine (MIT).
      — done when: profile insert without `consent_at` is rejected by a
      CHECK constraint (battery) and the URL returns 200 (manual).
- [ ] **Full Turkish content.** ~360 snippets in
      `packages/astro/content/tr/*.json` (120 planet-in-sign, 120
      planet-in-house, 12 Ascendant signs, ~105 aspect starters), authored by
      Claude, reviewed by the owner, each keyed and validated by Zod; detail
      screen per placement; aspects list on the chart screen.
      — done when: a Vitest asserts every key the engine can emit has a
      non-empty snippet (battery); `screenshots/v1-placement-detail.png`;
      owner sign-off recorded in NOTES.
- [ ] **Session in SecureStore.** The skeleton keeps the Supabase session
      (refresh token) in AsyncStorage, Supabase's documented Expo default but
      plaintext in the sandbox; wrap an AES key in expo-secure-store and
      encrypt the AsyncStorage value (SecureStore's 2 KB limit rules out
      storing the session directly).
      — done when: the session survives an app restart and the AsyncStorage
      value is ciphertext (manual, simulator).
- [ ] **Server-side birth_utc validation.** Devices with stale tzdata
      (Android especially) can compute a wrong `birth_utc`; an Edge Function
      (Deno, full ICU) recomputes it from city + wall time and rejects a
      mismatch before the profile is stored.
      — done when: a Vitest against the local stack proves an inconsistent
      `birth_utc` is rejected and a consistent one accepted (battery).
- [ ] **City search UX.** Word-prefix matching ("york" → New York) and a
      curated Turkish exonym list (Viyana, Münih, Londra …) in
      `packages/geo`.
      — done when: Vitest covers both (battery).
- [ ] **Location refresh.** "Konumu güncelle" in settings re-reads device
      location and updates `location`.
      — done when: manual check in Studio shows the point changed.
- [ ] **Metrics.** SQL views for onboarding completion, matches,
      conversations with ≥ 3 messages each side; crash reporting (Sentry via
      `@sentry/react-native`).
      — done when: the views return the PRD success-signal numbers on the seed
      data (manual, Supabase Studio); a forced test crash appears in Sentry.
- [ ] **TestFlight.** Confirm Apple Developer Program membership for
      oguzpancuk (create if missing — ask-tier), reserve bundle ID
      `com.oguzpancuk.stardate`, check App Store name availability; hosted
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
