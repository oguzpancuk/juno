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
- [ ] **S0 — Environment boots, battery is born.** Root `package.json` with
  npm workspaces; `packages/astro` (tsup/tsc, Vitest) with ONE real test
  (Sun sign for a known date); `apps/mobile` from `create-expo-app` with
  Expo Router rendering a "stardate" screen; shared `tsconfig` strict,
  ESLint, Prettier; `.claude/hooks/verify.sh` unchanged.
  — done when: `bash .claude/hooks/verify.sh` exits 0 on a clean committed
  HEAD (battery) and `screenshots/s0-boot.png` shows the app on the iOS
  simulator (screenshot).
- [ ] **S1 — Planets in signs (PRD-2 engine half).** `computeChart(input)`
  returns ecliptic longitude, sign and degree for Sun–Pluto using
  `astronomy-engine`; input is UTC instant + lat/lon; Zod schema on input.
  — done when: Vitest compares 3 reference charts (astro.com printouts
  stored as JSON fixtures) and every planet is within 1° (battery).
- [ ] **S2 — Ascendant + houses, unknown-time fallback (PRD-1/2).**
  Placidus cusps and Ascendant; when `timeKnown: false` the engine returns
  whole-sign houses and no Ascendant, and the UI later hides them.
  — done when: Ascendant within 1° on the same 3 fixtures; a 4th fixture
  with unknown time asserts `ascendant === null` (battery).
- [ ] **S3 — Birth place → UTC instant.** Offline city list for Turkey +
  major world cities (GeoNames cities15000 subset, name/lat/lon/IANA tz);
  local date+time + IANA zone → UTC via `Intl`/`date-fns-tz` so historical
  DST rules apply (assumption for PRD open question 1: offline list).
  — done when: Vitest resolves "İstanbul, 1995-07-14 03:30" and
  "Ankara, 1990-01-01 12:00" to the UTC instants astro.com uses (battery).
- [ ] **S4 — Backend skeleton with RLS.** `supabase init`; migration 0001:
  `profiles` (id = auth uid, display_name, birth_date, birth_time_known,
  birth_utc, city, chart jsonb, big_three), `likes` (from, to, kind),
  `matches` (a, b, starter, created_at) with a trigger that inserts a match
  on mutual like; RLS: own profile read/write, other profiles read-only
  and only public columns (a view), likes insert-own only, matches
  read-own only; email OTP auth enabled in `config.toml`.
  — done when: `npx supabase db reset` succeeds and a Vitest suite in
  `supabase/tests` (supabase-js against local stack, run only when
  `SUPABASE_LOCAL=1`) proves: anon reads 0 profiles; user A cannot read
  B's `birth_utc`; A liking B then B liking A yields exactly one match row
  (battery, gated on local stack; skip reports as FAIL in CI until the
  Supabase CLI step is added to `ci.yml`).
- [ ] **S5 — Sign in, birth data, chart screen (PRD-1, PRD-2 UI half).**
  Email OTP sign-in; onboarding form (display name, city picker, date,
  time or "bilmiyorum"; birth date < 18 years ago rejected inline); chart
  computed on device with `packages/astro`, profile row upserted with the
  chart JSON; chart screen lists big three + 10 planets with sign/house
  (placeholder one-line Turkish text per planet-in-sign; full texts in v1).
  — done when: `screenshots/s5-chart.png` shows the chart for fixture #1
  and the values equal the fixture (screenshot + manual compare); the
  profile row exists in local DB (manual: Supabase Studio).
- [ ] **S6 — Discover with compatibility (PRD-4, minimal).** `compatibility
  (chartA, chartB)` in `packages/astro` returns 0–100 plus the strongest
  inter-chart aspect as a `{ planetA, aspect, planetB }` triple; a seed
  script creates 5 profiles in the same city; discover screen shows one
  card (name, age, city, big three, score, one-line "why"); Like and Pass
  write `likes`; shown profiles exclude already-liked/passed.
  — done when: Vitest asserts the score is symmetric, bounded and equals a
  hand-computed value for one fixture pair (battery);
  `screenshots/s6-discover.png` shows a card with a score; after Pass the
  card does not return on reload (manual).
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
  per-user folder policy; 1–6 photos; profile invisible in discovery until
  ≥ 1 photo.
  — done when: Storage policy test proves user A cannot write to B's
  folder (battery); a photo-less seeded profile never appears in discover
  (manual); `screenshots/v1-profile.png`.
- [ ] **Gender + preference filter (PRD-4).** Schema per PRD open question
  6 (assumption until answered: woman / man / everyone).
  — done when: discovery RLS view test proves mismatched preferences yield
  0 rows (battery).
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
  text at sign-up, stored `consent_at`; privacy policy hosted at a URL.
  — done when: profile insert without `consent_at` is rejected by a
  CHECK constraint (battery) and the URL returns 200 (manual).
- [ ] **Full Turkish content.** ~120 planet-in-sign, ~120 planet-in-house
  and ~50 aspect/starter snippets in `packages/astro/content/tr/*.json`,
  each keyed and validated by Zod; detail screen per placement; aspects
  list on the chart screen. Source per PRD open question 3.
  — done when: a Vitest asserts every key the engine can emit has a
  non-empty snippet (battery); `screenshots/v1-placement-detail.png`.
- [ ] **Unknown-time UX (PRD open question 8).** Note on the chart screen
  when the Ascendant is missing.
  — done when: `screenshots/v1-no-time.png` shows the note and no houses.
- [ ] **Compatibility formula review (PRD open question 2).** Documented
  weights in `docs/adr/0003-compatibility.md`; tests updated.
  — done when: ADR merged and the S6 fixture test passes with the new
  weights (battery).
- [ ] **Metrics.** SQL views for onboarding completion, matches,
  conversations with ≥ 3 messages each side; crash reporting (Sentry via
  `sentry-expo`).
  — done when: the views return the PRD success-signal numbers on the seed
  data (manual, Supabase Studio); a forced test crash appears in Sentry.
- [ ] **TestFlight.** Hosted Supabase project (EU), EAS project, first
  `eas build` + `eas submit`; refs recorded in `docs/NOTES.md`.
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
- **Photo pre-moderation** — PRD open question 5; reports + block satisfy
  Apple for a small cohort. Revisit before public launch.
- **Nationwide discovery** — PRD open question 4; same-city keeps the seed
  cohort dense enough to produce matches.
- **Transits, daily horoscope, notifications about "today"** — a
  retention feature for a product that first needs to prove matching.
- **Payments / premium** — nothing to gate yet.
- **English UI / i18n** — single-market launch; strings already live in
  one file so the cost later is translation, not refactoring.
- **Media in chat, voice, video** — text proves the starter works; media
  adds Storage cost and moderation surface.
- **Web app** — no user in the PRD uses a browser.
