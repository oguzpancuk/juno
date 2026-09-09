# stardate (the product ships as Juno)

<!-- Instantiated from maya (see .maya-version). Slots marked [STACK: ...]
     are filled by /new-product; a remaining [STACK: TODO] is a visible gap,
     never fill one with a guess. -->

<!-- `stardate` is the repo and code name; the product name the owner chose
     on 2026-09-10 is Juno. Anything a user reads says Juno; package names,
     workspaces and the local Supabase project keep stardate. -->

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
| test | `npm run test --workspaces --if-present` (Vitest) |
| typecheck | `npm run typecheck --workspaces --if-present` (`tsc --noEmit`) |
| lint | `npm run lint --workspaces --if-present` (ESLint) + `npx prettier --check .` |
| dev | `bash contracts/init.sh` (local Supabase + Expo on 8082 with local keys); or `npm run start -w apps/mobile` with `EXPO_PUBLIC_SUPABASE_URL`/`_ANON_KEY` set (see `apps/mobile/.env.example`) |
| local backend | `npx supabase start` / `npx supabase db reset` (needs Docker) |
| full battery | `bash .claude/hooks/verify.sh` |

## Standards
- Strict typing where the language offers it; schema validation at every
  external boundary. `any`/untyped escape hatches need a `// why:` comment.
- Every feature lands with its verification: a test, or for UI a screenshot
  check — named in the ROADMAP done-when clause it satisfies.
- `packages/astro` is pure and deterministic: no I/O, no RN imports, every
  computation covered by Vitest against known reference charts. UI never
  computes astrology; it renders what the engine returns.
- Zod at every boundary: Edge Function input, Supabase rows read into the
  app, env (`expo-constants` extras), on-device storage.
- Data access goes through Supabase RLS policies; no service-role key ever
  ships in the app. Secrets (Supabase service role, any LLM API key) live
  only in Edge Function env — the app calls functions, never providers.
- UI verification is a simulator screenshot per ROADMAP done-when clause;
  component tests are not in the battery until a feature needs them.

## Verification
`bash .claude/hooks/verify.sh` is the single battery (CI runs the same file).
It must pass on a clean, committed HEAD before a push or a "done" report —
`git status --porcelain` empty before and after. A result from a dirty tree
is not a result.
Nothing leaves this machine unreviewed: the push gate refuses any local
commit newer than `.claude/last-reviewed`, which the harness writes when
code-reviewer finishes. Commit first, then review — the reviewer covers
`last-reviewed..HEAD`; a fix made after a review needs its own. Force
pushes and remote deletions are refused outright; the scan is coarse, so a
commit message that mentions a push flag is written with `git commit -F`.

## Workflow
- The repo is the memory. Read `docs/ROADMAP.md` + `docs/NOTES.md` when
  starting; update `docs/NOTES.md` (dated, append-only) when stopping.
  Decisions that constrain the future go to `docs/adr/`.
- Every task states its stopping condition up front; when met, stop & report.
- Unattended runs (goal loops, overnight): follow `contracts/README.md` —
  one feature per session, default-FAIL feature list, evidence before
  `passes: true`.
- Launch code-reviewer before reporting a feature done, and evaluator-qa
  before any deploy and after an unattended run — unprompted; the roster
  is a standing instruction, not an option.

## Deploy
Two targets, both ask-tier (never without the owner's per-instance yes):
- Backend: hosted Supabase project. `npx supabase db push` (migrations),
  `npx supabase functions deploy` (Edge Functions).
- App: EAS. `eas build --platform ios --profile production` → `eas submit`
  (TestFlight → App Store); JS-only changes via `eas update`.
Trigger: /deploy-checklist walks the gates and the product steps in order.
No hosted project or EAS project exists yet — the first deploy session
creates them and records refs in `docs/NOTES.md`.
