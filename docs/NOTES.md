# Working notes — append-only, dated

<!-- The session-to-session memory. Every work session appends: what was
     done, what was verified (and how), what is open. Newest at top.
     Never rewrite old entries — this file is the audit trail. -->

## Upstream candidates

<!-- Improvements made HERE to template-origin files (.claude/, contracts/,
     CLAUDE.md) that maya should inherit. /update-stack harvests this list.
     Format: date · file · one-line what/why. Remove entries once upstreamed. -->

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
