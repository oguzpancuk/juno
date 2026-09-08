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
- [ ] **S4 — Backend skeleton with RLS.** `supabase init`; migration 0001:
      `profiles` (id = auth uid, display_name, birth_date, birth_utc,
      birth_city, chart jsonb, big_three, gender, interested_in, location
      geography(point), radius_km default 50), `likes` (from, to, kind),
      `matches` (a, b, starter, created_at) with a trigger that inserts a match
      on mutual like; RLS: own profile read/write; other profiles only via a
      `discover` view that applies mutual gender preference + radius and
      exposes public columns plus rounded distance, never `location` or
      `birth_utc`; likes insert-own only; matches read-own only; email OTP
      auth enabled in `config.toml`.
      — done when: `npx supabase db reset` succeeds and a Vitest suite in
      `supabase/tests` (supabase-js against local stack, run only when
      `SUPABASE_LOCAL=1`) proves: anon reads 0 profiles; A cannot read B's
      `birth_utc` or `location`; a profile outside A's radius or with a
      non-matching preference is absent from A's `discover`; A liking B then
      B liking A yields exactly one match row (battery, gated on local stack;
      reported as FAIL in CI until the Supabase CLI step is added to
      `ci.yml`).
- [ ] **S5 — Sign in, birth data, chart screen (PRD-1, PRD-2 UI half).**
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
- [ ] **S6 — Discover with compatibility (PRD-4).** `compatibility(chartA,
chartB)` in `packages/astro` implements `docs/adr/0003-compatibility.md`
      and returns 0–100 plus the strongest inter-chart aspect as
      `{ planetA, aspect, planetB }`; a seed script creates 5 profiles within
      50 km and 1 outside; discover screen shows one card (name, age,
      distance km, big three, score, one-line "why"), Like and Pass write
      `likes`; shown profiles exclude already-liked/passed; radius slider in
      settings updates `radius_km`.
      — done when: Vitest asserts the score is symmetric, bounded and equals
      the hand-computed ADR example for one fixture pair (battery);
      `screenshots/s6-discover.png` shows a card with score and distance; the
      out-of-radius seed never appears and after Pass a card does not return
      on reload (manual).
- [ ] **S7 — Match + conversation starter (PRD-5).** `starter(chartA,
chartB)` picks the strongest aspect and renders a Turkish template
      sentence with a question; the match trigger stores it; the app
      subscribes to `matches` via Realtime and shows a match screen with the
      starter.
      — done when: Vitest covers starter selection for 3 pairs (battery); the
      seed script makes seeded user B like the tester, the tester likes B in
      the simulator, and `screenshots/s7-match.png` shows the match screen
      with the starter within 5 s (screenshot + manual).

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
