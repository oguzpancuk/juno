# ADR-0002: Stack — Expo + Supabase + pure-TS astrology engine

Status: accepted · Date: 2026-09-08

## Context

stardate is a mobile-first dating app (swipe deck, profiles, matches,
realtime chat, photos) plus one unusual piece: natal chart computation and
compatibility scoring from birth date/time/place. The owner has no stack
preference and delegated the choice ("whatever such an app needs"); this
ADR records the decision so it is a decision, not a guess.

## Decision

- **TypeScript (strict), Node 22** — one language across app, engine and
  Edge Functions.
- **Expo (React Native) + Expo Router** — a dating app lives on phones; Expo
  is the well-trodden managed path (EAS builds, OTA updates, simulator
  workflow for screenshot verification). iOS first, Android second.
- **Supabase** — Postgres with RLS for profiles/swipes/matches, Auth,
  Storage for photos, Realtime for chat, Edge Functions (Deno) for anything
  that needs a secret (LLM calls, service-role writes). One vendor replaces
  a bespoke API server, auth service, websocket server and file store.
- **`packages/astro` as a pure TypeScript package** — the natal chart and
  compatibility engine has no I/O and no React Native imports, so it is
  unit-testable against reference charts in the battery without a device.
  The ephemeris source (Swiss Ephemeris vs. a pure-JS VSOP87 library) is
  decided in its own ADR at skeleton time, after checking licensing.
- **npm workspaces** (`apps/mobile`, `packages/astro`) — zero extra tooling;
  `supabase/` is a plain directory, not a workspace.
- **Vitest** for tests, **ESLint** (`eslint-config-expo`) + **Prettier** for
  lint/format. UI is verified by simulator screenshots per ROADMAP clause;
  component/e2e tests are added when a feature needs them (Maestro is the
  candidate for e2e).
- **Deploy**: EAS Build/Submit for the app, hosted Supabase for the backend.

## Consequences

- Local backend work needs Docker (`supabase start`); the battery does not
  depend on it — migrations are exercised by tests only once a feature adds
  them.
- Vendor lock-in to Supabase is accepted for v1; the data model stays plain
  Postgres so migration away is possible.
- Apple review applies to dating apps (age gating, moderation, account
  deletion) — a v1 constraint the PRD must carry.
- Any interpretive text (chart meaning, conversation starters) that uses an
  LLM runs in an Edge Function; the app never holds a provider key.
