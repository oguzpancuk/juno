# juno

<!-- Instantiated from maya (see .maya-version). Slots marked [STACK: ...]
     are filled by /new-product; a remaining [STACK: TODO] is a visible gap,
     never fill one with a guess. -->

<!-- Juno everywhere: the product name, the repo, the npm workspace scope
     (`@juno/*`) and the local Supabase project. `stardate` was the code
     name until 2026-09-10 and survives only in historical NOTES and ADR
     entries, which record what was true when they were written. -->

Star-chart dating app: users enter birth place, date and time; the app
computes their natal chart, explains it, shows astrological compatibility
on the swipe screen and in profiles, and gives matched pairs a
chart-based conversation starter. Mobile-first (iOS first, Android second).

Spec: `docs/PRD.md` · Build order: `docs/ROADMAP.md` · Working notes:
`docs/NOTES.md` · Decisions: `docs/adr/`

## Stack & commands
TypeScript (strict) on Node 22 · Expo (React Native) + Expo Router for the
app · Supabase (Postgres + RLS, Auth, Storage, Realtime, Edge Functions) for
the backend · npm workspaces monorepo. Stack rationale: `docs/adr/0002-*`.

| Path | What |
|---|---|
| `apps/mobile` | Expo app (Expo Router) |
| `packages/astro` | Pure-TS natal chart + compatibility engine, no RN deps |
| `packages/geo` | Offline city list (GeoNames) + local time → UTC, no RN deps |
| `supabase/` | Migrations, Edge Functions (Deno), local config |

| Purpose | Command |
|---|---|
| install | `npm ci` |
| test | `npm run test --workspaces --if-present` (Vitest); the `supabase` workspace needs the local stack up, the other three do not |
| typecheck | `npm run typecheck --workspaces --if-present` (`tsc --noEmit`) |
| lint | `npm run lint --workspaces --if-present` (ESLint) + `npx prettier --check .` |
| dev | `bash contracts/init.sh` (local Supabase + Expo on 8082 with local keys); or `npm run start -w apps/mobile` with `EXPO_PUBLIC_SUPABASE_URL`/`_ANON_KEY` set (see `apps/mobile/.env.example`) |
| local backend | `npx supabase start` / `npx supabase db reset` (needs Docker) |
| full battery | `bash .claude/hooks/verify.sh` (needs `python3` for the docs step). Tests are one step per workspace. Where containers are impossible — no `docker`, or a `docker` with no daemon, which is every cloud thread — a thread reports `tests (@juno/supabase)` as **NOT RUN**, printed in the summary beside ok and FAIL, and the battery still exits 0; CI's `verify` job is the run. With a daemon answering, a stack that is down is a FAIL, and with `CI` set to anything but `false` or `0` the suite always runs. |

## Standards
- Strict typing where the language offers it; schema validation at every
  external boundary. `any`/untyped escape hatches need a `// why:` comment.
- Every feature lands with the verification its ROADMAP done-when clause
  names: a test, a screenshot check, or a manual check.
- A new test is seen red before the change that makes it pass; the pull
  request says which test and how it was made to fail.
- `packages/astro` is pure and deterministic: no I/O, no RN imports, every
  computation covered by Vitest against known reference charts. UI never
  computes astrology; it renders what the engine returns.
- Zod at every boundary: Edge Function input, Supabase rows read into the
  app, env (`expo-constants` extras), on-device storage.
- Data access goes through Supabase RLS policies; no service-role key ever
  ships in the app. Secrets (Supabase service role, any LLM API key) live
  only in Edge Function env — the app calls functions, never providers.
- UI verification per ROADMAP done-when clause: a `screenshot` clause is a
  screen a thread can drive — the Expo web target; a native-only screen is
  a `manual check`, the owner's on a device before the merge. Component
  tests are not in the battery until a feature needs them.

## Verification
- `bash .claude/hooks/verify.sh` is the single battery. CI runs the same
  file as the required check on every pull request.
- Run it before opening a pull request, on a clean committed HEAD
  (`git status --porcelain` empty before and after), and put the result in
  the pull request body. A step this machine cannot run goes in the body
  as "not run here — CI's `<job>` is the run", never as passing.
- The battery says that itself for the one step it can apply to. Tests are
  one step per workspace, and `tests (@juno/supabase)` needs a local
  Supabase stack, which needs containers. Where containers are impossible
  — no `docker` binary, or a `docker` binary with no daemon behind it,
  which is what a cloud thread has — the step reports `NOT RUN`,
  printed in the summary beside ok and FAIL with the reason, and the
  battery still exits 0. That line goes into the pull request body as it
  stands: it is this repo's "not run here", and CI's `verify` job is the
  run. Nothing else changes — with a daemon answering, a stack that is
  down means `npx supabase start` and the step is a FAIL; with `CI` set to
  anything but `false` or `0` the suite always runs, so a missing stack in
  CI is a defect in the run. The decision is `supabase_tests_plan` in
  `.claude/hooks/verify-lib.sh`, driven six ways by
  `.claude/hooks/verify-lib.test.sh` — the battery's own
  `battery self-test` step. Change one and the other has to agree.
- If the item's done-when clause names a screenshot or manual check, run the
  `evaluator-qa` agent on it and put its verdict in the pull request body.
  NEEDS_WORK means not done: fix, run it again, open the pull request only
  on PASS. A clause that names a test needs no QA pass.
- A native mobile screen cannot be driven from a cloud thread. For such a
  clause the pull request says exactly what to try and where (see Preview);
  the owner checks it on a device before merging, and the item is not
  reported done until then.
- Never report a check you did not run.

## Workflow
- Work on a branch, never on `main`; land through a pull request.
- Read `docs/ROADMAP.md` and `docs/NOTES.md` when starting. When stopping,
  append a dated entry to `docs/NOTES.md`; decisions that constrain the
  future go to `docs/adr/`.
- Always into `docs/NOTES.md`, whatever else you remember them in: an
  improvement to `CLAUDE.md`, `verify.sh`, `ci.yml` or
  `docs/project-instructions.md` under "Upstream candidates"; anything the
  battery passed that turned out broken under "Battery gaps".
- State the stopping condition up front; when met, stop and report.
- Never merge, force-push, or change CI configuration. Merging is the
  owner's.

## Preview
Every pull request gets a preview URL and its body carries it. A pull
request without its preview link is not ready for the owner.
Provider: a Cloudflare Worker VERSION per pull request
(`.github/workflows/preview.yml`): the Expo web export, uploaded with the
alias `pr-<number>` — never deployed, so production traffic is untouched.
URL: `https://pr-<number>-juno.<account>.workers.dev`; the `preview`
check's summary prints it, and it is true once that check is green.
What a preview is NOT: it talks to the PRODUCTION Supabase project (owner
decision) — real data behind RLS, so try it with a test account and never
bulk-write; a pull request's MIGRATIONS and Edge Function changes are not
applied, so a change that needs them cannot be tried here at all — say so
in the pull request. Google sign-in has no button (no client ids). A
native-only screen names an EAS Update channel instead; none exists yet,
so such a clause is the owner's check on a device build.
The workflow runs from `main` (`pull_request_target`): a pull request
cannot change how its own preview is built or what the token is used for.

## Deploy
maya's rule: deploys run in CI on the release tag (`deploy.yml`, after the
owner approves the `production` environment); a thread never pushes a
release tag or deploys. [STACK: TODO — `deploy.yml` is unconfigured and
fails on purpose: moving the three targets below into it needs Actions
secrets only the owner can create (Supabase access token, Cloudflare API
token, Expo token) and an owner decision on EAS vs. Xcode Cloud for the
iOS archive. Until then the commands below remain the deploy path, run by
the owner.]
Three targets, all ask-tier (never without the owner's per-instance yes):
- Backend: hosted Supabase project `jkxuhbuuhsumyjmlskls` (eu-central-1).
  `npx supabase db push` (migrations), `npx supabase functions deploy`.
- Web: Cloudflare Worker serving the Expo web export at
  `www.juno-dating.com` / `juno-dating.com`. `npm run deploy -w @juno/mobile`
  — despite the name, this publishes; it is not a local build.
- App: EAS. `eas build --platform ios --profile production` → `eas submit`
  (TestFlight → App Store); JS-only changes via `eas update`.
Trigger: /deploy-checklist walks the gates and the product steps in order.
No EAS project exists yet — the session that creates it records the ref in
`docs/NOTES.md`, as the Supabase and Cloudflare sessions did.
Infrastructure that carries personal data is named in the privacy notice
(`apps/mobile/lib/legal.ts`) in the same change that puts it in the path,
never afterwards.
