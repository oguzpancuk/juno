# Working notes — append-only, dated

<!-- The session-to-session memory. Every work session appends: what was
     done, what was verified (and how), what is open. Newest at top.
     Never rewrite old entries — this file is the audit trail. -->

## Upstream candidates

<!-- Improvements made HERE to template-origin files (.claude/, contracts/,
     CLAUDE.md) that maya should inherit. /update-stack harvests this list.
     Format: date · file · one-line what/why. Remove entries once upstreamed. -->

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
