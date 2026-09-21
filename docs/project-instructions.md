# Project instructions — juno

<!-- SOURCE of the project's instructions field (Project settings > Memory).
     Edit here, commit, paste again. Rules about the repository itself live
     in CLAUDE.md, which every thread reads from its clone. -->

## About

<!-- Written by /mvp-scope from docs/PRD.md and docs/ROADMAP.md; re-run it
     and paste again whenever the ROADMAP changes. The coordinator has no
     clone: this block is what it knows about the product. -->

- Product: star-chart dating app — birth place, date and time in; natal
  chart, astrological compatibility on the swipe screen and in profiles,
  and a chart-based conversation starter for matched pairs. Mobile-first
  (iOS first), Turkish UI; the same Expo app also ships as a web client.
- Areas: `apps/mobile` (Expo Router app and its web target) ·
  `packages/astro` (pure-TS chart and compatibility engine) ·
  `packages/geo` (offline cities, local time → UTC) · `supabase/`
  (migrations, RLS, Edge Functions).
- Walking skeleton (S0–S7): done — environment and battery, chart engine,
  birth place → UTC, backend with RLS, sign-in and chart screen, discover
  with compatibility, match and conversation starter.
- v1, open (the rest of v1 is done; `docs/ROADMAP.md` has every clause in
  full):
  - Sign in with Apple and Google — manual check: sign-in on a real device
    reaches the same profile flow. Built; waits on credentials.
  - KVKK consent and privacy policy — test: a profile insert without
    `consent_at` is refused by a CHECK; manual check: the notice URL
    answers 200.
  - Metrics — manual check: the SQL views return the PRD's success-signal
    numbers on seed data; a forced crash shows up in crash reporting.
  - The deploy gate, tested where it breaks — test: Vitest drives
    `resolveDeployEnv(root, shell)` against a fixture directory.
  - Edge Function preflight asserts the worker — test: a fixture answering
    204 without its own `access-control-allow-methods` fails the suite.
  - Dead-style gate — test: the scan runs in the battery, green.
  - Revoke EXECUTE on the older security-definer triggers — test: a
    migration revokes it from every role; battery green.
  - Accessibility props in the spelling every target reads — test: an
    ESLint rule refuses the `accessibility*` spellings that have a twin.
  - Two RLS runs on one local stack must not see each other — test: two
    concurrent `npm run test -w supabase` runs both pass.
  - Design frames D6 (starter, chat), D7 (onboarding, welcome, filters,
    profile), D8 (screens the sheet never drew) — screenshot, each.
  - D13 settings as grouped rows — screenshot for the mark on the door,
    manual check for the rows on a signed-in client.
  - TestFlight — manual check: /deploy-checklist passes and an external
    tester installs the build. Ask me first.
- Deferred: Android (until the iOS cohort gives feedback) · push
  notifications (retention, not proof of concept) · LLM-written texts
  (templates are testable; revisit if users call them generic) · photo
  pre-moderation (reports-only by my decision) · travel mode · transits and
  daily horoscope · payments (nothing to gate yet) · English UI · media in
  chat (cost and moderation surface).

## Work

- The plan is `docs/ROADMAP.md`, written by me. Threads execute it in
  order; nobody re-plans it here. Whatever I paste is the task; if a
  ROADMAP item already covers it, say so instead of starting a second
  thread.
- One feature per thread. A second problem found on the way goes into
  `docs/NOTES.md`, not into the fix.
- When a thread reports back, it names the ROADMAP item it completed and
  the next unstarted one. The coordinator has no clone; this is how it
  knows where the build order stands.
- Propose threads before starting them; at most two at a time until I say
  otherwise.

## Pull requests

- Start from `main`, work on your own branch, open one pull request per
  thread. The body names the done-when clause it satisfies and carries
  this pull request's preview URL (CLAUDE.md, Preview) — without it the
  pull request is not ready for me; what else it carries, CLAUDE.md says.
- A `manual check` clause is listed in the body as "awaiting the owner's
  check on a device", with what to try. I check before merging — on the
  preview, or on a TestFlight build I ask for myself when a native screen
  needs it; the thread does not report that item done and never triggers
  a build.
- `main` is protected: CI green and up to date with `main`, or no merge.
  When `main` moves under your open pull request, merge it into your branch
  yourself.

## Review

- When a thread opens a pull request, start a review thread for it. Its
  task: `/code-review --comment` on the pull request — never `--fix`. If
  `--comment` cannot post from the thread, post each finding as a pull
  request comment yourself, file and line included.
- In a summary comment it also checks that every new test covers the clause
  it claims and that the body shows its red run, then ends with APPROVE or
  NEEDS_WORK and one sentence why.
- The review thread keeps watching the pull request. After each push it
  reviews the delta the same way, until its summary says APPROVE. The
  authoring thread fixes what the review posts.

## Ask me first

- Deploys and release tags are not done from this project at all: I run
  them from a local session. Anything else outward-facing — DNS,
  third-party dashboards, production data — ask me first.
- A schema or API change that is not reversible in one commit.
- A dependency that is not clearly better than the standard library.

## Memory

- Project memory stays in this project. What is about the repository — a
  pitfall, a template improvement, a battery miss — also goes into
  `docs/NOTES.md`, under the section CLAUDE.md names. Only the repo reaches
  the other products.
