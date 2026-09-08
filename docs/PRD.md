# stardate — PRD

<!-- Written via /spec. Every core interaction carries a verifiable
     "works when…" clause; nothing ships without one. -->

## Problem
Dating apps give people nothing to talk about. Profiles are photos plus a
one-line bio, so the first message is either "hi" or a compliment, and most
matches die unanswered. Meanwhile astrology is already the small talk of
choice for a large slice of 20–35 year olds in Turkey: "burcun ne?" is a
real opener, but existing apps stop at the Sun sign, which everybody knows
is shallow. Nobody computes the actual natal chart, explains it, and turns
two charts into a concrete, personal reason to talk.

## User
A 20–35 year old in Istanbul, Ankara or Izmir who reads their horoscope,
knows their rising sign (or wants to), uses Tinder/Bumble/Hinge and is bored
of them. Turkish-speaking, iPhone user. They know their birth date; most
know the time roughly (from their mother or a birth record); some do not.
The single job: **find someone worth talking to, and have a first message
that isn't "selam".**

## Core interactions
<!-- Numbered. These are the product. "Works when…" must be checkable by a
     person clicking through the app. -->
1. **Sign up and enter birth data** (place, date, time; "I don't know the
   time" allowed) — works when: after sign-in with Apple or email OTP and
   entering birth data, the app shows a chart with Sun, Moon and Ascendant
   that match astro.com for the same input (Ascendant omitted when the time
   is unknown), and a birth date under 18 years ago is rejected before the
   account is created.
2. **See and understand your natal chart** — works when: the chart screen
   lists the 10 planets (Sun–Pluto) with sign and house, the Ascendant, and
   the major aspects; each row opens a Turkish explanation of that
   placement; the "big three" (Sun/Moon/Rising) appear as a badge. All
   values come from `packages/astro`, verified against reference charts in
   Vitest.
3. **Build a profile** (1–6 photos, name, age, city, short bio; big-three
   badge auto-attached) — works when: another signed-in user sees exactly
   that profile with the badge, and the profile is invisible until at least
   one photo and the birth data exist.
4. **Discover with compatibility** — works when: the swipe screen shows one
   profile at a time from the same city with a compatibility score (0–100)
   computed from both charts plus a one-line "why" (e.g. "Your Moon trines
   their Venus"); Like and Pass are recorded; a passed or liked profile
   never reappears; only users who selected each other's gender preference
   are shown.
5. **Match and get a conversation starter** — works when: when both users
   Like, both see a match screen within 5 seconds showing the strongest
   synastry aspect between the two charts as a Turkish sentence with a
   question attached (e.g. "…sizce de öyle mi?"), and the same starter is
   pinned at the top of the chat.
6. **Chat with a match** — works when: a text message sent from one device
   appears on the other within 2 seconds; the conversation list shows the
   latest message and unread state; a user who is not matched with you
   cannot read or write to your conversation (enforced by RLS, tested).
7. **Safety controls** (block, report, delete account) — works when:
   blocking removes the person from discovery, matches and chat on both
   sides immediately; reporting stores a row with reason and reporter and
   hides the reported profile from the reporter; "Hesabımı sil" removes
   the auth user, profile, photos, likes and messages, and the app returns
   to the sign-in screen.

## Non-goals
- No LLM-generated text. All chart explanations and conversation starters
  are hand-written Turkish templates keyed by placement/aspect. (Revisit
  after v1; the Edge Function boundary keeps the door open.)
- No Android in the first release. The Expo codebase keeps it possible;
  nothing is Android-tested until iOS ships.
- No payments, premium tier, boosts or super-likes.
- No transits, daily horoscopes, notifications about "today's energy".
- No English or other UI languages; no i18n framework beyond keeping
  strings in one file.
- No location tracking. City is chosen from a list at profile creation.
- No photo, voice or video in chat. Text only.
- No social graph features (friends, comparing charts with non-matches).
- No web app.

## Constraints
- **Platform:** iOS first via Expo + EAS; Expo Router; TypeScript strict.
  Backend is Supabase (Postgres + RLS, Auth, Storage, Realtime, Edge
  Functions). See `docs/adr/0002-stack.md`.
- **Astrology engine:** `astronomy-engine` (MIT, pure JS) for planetary
  positions; tropical zodiac; Placidus houses computed in-house, whole-sign
  when birth time is unknown (no Ascendant, no houses shown). Swiss
  Ephemeris is out (AGPL / paid licence).
- **Birth place → coordinates + time zone:** must resolve historical time
  zone offsets (DST rules for the birth date, not today). Source is an open
  question below.
- **Apple App Store dating-app rules:** 18+ age gate at sign-up; block and
  report reachable from every profile and chat; in-app account deletion;
  a moderation path for reports; Sign in with Apple offered because a
  third-party sign-in is not used (email OTP is first-party).
- **KVKK (Turkish data protection):** birth date/time/place are personal
  data; explicit consent text at sign-up; privacy policy URL required by
  App Store; data lives in Supabase EU region.
- **Security:** no service-role key in the app; all data access via RLS;
  Zod at every boundary.
- **Budget:** solo developer; Supabase free/Pro tier; Apple Developer
  Program; no paid geocoding API unless the open question below says so.
- **Language:** UI and content Turkish; code, comments, commits, docs
  English.
- **Timeline:** no hard deadline. This PRD is more than ~2 weeks of solo
  work; `/mvp-scope` cuts the walking skeleton.

## Success signals
- **Engine accuracy:** every reference chart in the Vitest suite matches
  astro.com within 1° for all 10 planets and the Ascendant (0 failures).
- **Onboarding completion:** ≥ 70 % of users who create an account reach
  the chart screen (Supabase query on profiles vs. auth users).
- **TestFlight cohort (first 2 weeks, ~50 invited users):** ≥ 10 matches,
  ≥ 5 conversations with ≥ 3 messages from each side.
- **Starter usage:** ≥ 50 % of first messages in a match reference the
  pinned starter (manual read of a sample, or a "used starter" tap).
- **Stability:** crash-free sessions ≥ 99 % on TestFlight (EAS/Sentry or
  Xcode Organizer).
- **Safety:** every report is visible in the Supabase dashboard within a
  minute; no report goes unreviewed for more than 48 h during TestFlight.

## Open questions
[Unresolved — owner answers these, agents don't guess them.]
1. **Geocoding + historical time zone for birth place:** bundle an offline
   city list (GeoNames cities15000 + `tz-lookup`, free, ~1 MB) or use a
   paid API (Google Places)? Offline is the default assumption until
   answered.
2. **Compatibility score formula:** which synastry factors and weights
   (Sun/Moon/Venus/Mars aspects, element balance, Ascendant)? Does an
   astrologer review it, or do we ship a documented heuristic and iterate?
3. **Content authoring:** who writes the Turkish template texts? Rough
   size: 10 planets × 12 signs (120) + 12 houses × 10 planets (120) +
   aspect starters (~50) ≈ 300 snippets. Owner, a freelance astrologer, or
   a first draft generated once offline and edited?
4. **Discovery radius:** same city only (default assumption) or nationwide
   with city shown?
5. **Photo moderation:** manual review in the Supabase dashboard before a
   photo goes live, or publish immediately and act on reports? Apple
   accepts either if the report path works.
6. **Gender and preference model:** binary (woman/man) plus "everyone", or
   a wider list? Affects the profile schema and the discovery filter.
7. **Apple Developer account and app name:** does an account exist, and is
   "stardate" the App Store name (it may be taken)? Bundle ID to reserve.
8. **Unknown birth time UX:** show a reduced chart silently, or nudge the
   user to find their time (e.g. a note explaining that the Ascendant is
   missing)?
