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
  (iOS first), Turkish UI.
- Areas: `apps/mobile` (Expo Router app, also the web target) ·
  `packages/astro` (pure-TS chart + compatibility engine) · `packages/geo`
  (offline cities, local time → UTC) · `supabase/` (migrations, RLS, Edge
  Functions).
- Walking skeleton: S0–S7 all done (environment → chart engine → backend
  with RLS → sign-in and chart screen → discover → match + starter).
- v1, still open in `docs/ROADMAP.md` (14 of 77 items): Sign in with Apple
  and Google · KVKK consent + privacy policy · Metrics · the deploy gate
  tested where it breaks · the Edge Function preflight asserting the worker
  · TestFlight · dead-style gate · revoke EXECUTE on older security-definer
  triggers · design frames D6, D7, D8, D13 · accessibility props · RLS runs
  isolated on one local stack.
- Deferred: Android · push notifications · LLM-generated texts · photo
  pre-moderation · travel mode · transits/daily horoscope · payments ·
  English UI · media in chat. (Reasons: `docs/ROADMAP.md`, Deferred.)

<!-- 2026-09-21: extracted from the ROADMAP by /update-stack, not written by
     /mvp-scope. Re-run /mvp-scope to replace it; then paste again. -->

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
  check on a device", with what to try and which TestFlight build. I check
  before merging; the thread does not report that item done. After review
  fixes, do not trigger a new build yourself — I ask for one when I want
  to look again.
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

- Anything outward-facing: pushing a release tag, deploys, DNS, third-party
  dashboards, production data.
- A schema or API change that is not reversible in one commit.
- A dependency that is not clearly better than the standard library.

## Memory

- Project memory stays in this project. What is about the repository — a
  pitfall, a template improvement, a battery miss — also goes into
  `docs/NOTES.md`, under the section CLAUDE.md names. Only the repo reaches
  the other products.
