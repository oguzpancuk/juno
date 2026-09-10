# Juno — PRD

<!-- Product name: Juno (owner's decision, 2026-09-10). The old code name
     `stardate` was dropped entirely on 2026-09-10 — repo, workspace scope
     and local Supabase project all say juno now. -->

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
of them. Turkish-speaking, iPhone user. They know their birth date and can
find their birth time (from their mother or a birth record); the app
requires it. The single job: **find someone worth talking to, and have a
first message that isn't "selam".**

## Core interactions

<!-- Numbered. These are the product. "Works when…" must be checkable by a
     person clicking through the app. -->

1. **Sign up and enter birth data** (place, date, time — all three
   required) — works when: after sign-in with Apple or email OTP and
   entering birth data, the app shows a chart with Sun, Moon and Ascendant
   that match astro.com for the same input; the form cannot be submitted
   without a time; a birth date under 18 years ago is rejected before the
   profile is created.
2. **See and understand your natal chart** — works when: the chart screen
   lists the 10 planets (Sun–Pluto) with sign and house, the Ascendant, and
   the major aspects; each row opens a Turkish explanation of that
   placement; the "big three" (Sun/Moon/Rising) appear as a badge. All
   values come from `packages/astro`, verified against reference charts in
   Vitest.
3. **Build a profile** (1–6 photos, name, age, gender, who they want to
   meet, short bio; location captured once with permission; big-three
   badge auto-attached) — works when: another signed-in user sees exactly
   that profile with the badge and a distance in km (never coordinates),
   and the profile is invisible until at least one photo and the birth
   data exist.
4. **Discover with compatibility** — works when: the swipe screen shows
   one profile at a time within the user's distance radius (default 50 km,
   adjustable 5–500 km) whose gender matches what the user wants and who
   wants the user's gender; the card shows a compatibility score (0–100)
   computed from both charts per `docs/adr/0003-compatibility.md` plus a
   one-line "why" (e.g. "Ay'ın onun Venüs'üyle üçgen yapıyor"); Like and
   Pass are recorded; a passed or liked profile never reappears.
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

## Amendment 2026-09-10 — chart-first presentation

<!-- The owner's product system of 2026-09-10 (recorded in docs/NOTES.md).
     It does not add an interaction; it revises how 2, 4 and 5 present what
     the engine already computes. Mechanics: docs/adr/0009-presentation.md. -->

Two rules govern every presentation decision from here:

> The chart is the hero. The photo is the context.

> Show the calculation. Soften the conclusion.

The second is the tighter constraint. The real astrology stays on screen —
the aspect glyphs, the orb to the arcminute, the sign and house — while the
conclusion drawn from it is written as a tendency, never as a verdict or a
measurement.

**Product language leads, astrology follows.** A placement is titled by what
it means for dating and subtitled by what it is: "Nasıl seversin ·
Venüs Akrep'te", not "Venüs · Akrep · 7. ev". The six primary placements are
Sun (core self), Moon (emotional world), Rising (first impression), Mercury
(how you think), Venus (how you love), Mars (what moves you).

**Revises interaction 2.** The chart screen leads with those six as editorial
cards; the remaining planets, houses and natal aspects move behind an
"explore your full chart" disclosure. Nothing is deleted — the 754 existing
texts all stay reachable — but the first screen stops being a ten-row report.

**Revises interaction 4.** The discovery card gives the chart real visual
weight rather than a badge under the photo, and the compatibility signal is
a label first. This is the product's central bet and also its main risk: a
card that takes longer to read lowers swipe throughput, and the success
signals below are already thin. It is the first thing to watch in the
TestFlight cohort.

**Revises interaction 5.** The match screen becomes: an overall band with a
one-sentence summary, two to three aspects under "why you're drawn to each
other", one under "where it gets interesting", optional house overlays, then
the conversation starter. A tense aspect is a dynamic, never a failure; no
text passes judgement on a pairing.

**Compatibility presentation.** Five dimensions — emotional, chemistry,
communication, stability, growth — are computed internally and shown as
qualitative labels. Per-dimension numbers are out: five named axes with
scores read as a psychometric assessment of a person the user has not met.
The single overall score may be shown, but only mapped through a committed
reference distribution first, because ADR-0003's raw score is not a
percentage (median pair 62, the mockups' 86 occurs in 0.06 % of pairs).
See ADR-0009.

**Editorial voice.** All astrology copy describes tendencies, not facts. Use
"olabilir", "genelde", "eğilimindesin"; never "sensin", "bu ilişki şöyle
olacak", "ihtiyacın var". No "ruh eşi", "kader", "toksik", "mükemmel
eşleşme", no claim of psychological measurement, no fortune-teller register.
Explain the technical term in ordinary language, keep the calculation
visible, keep it short enough for a phone, and prefer a specific relational
meaning over generic horoscope language. One voice across all of it.

**Deferred by this amendment,** each for a stated reason: dating archetypes
("you are X" claims more than a placement reading does, and 24 buckets over
35 million configurations discredit the screen when one feels wrong);
the Juno asteroid and any "Juno Signature" feature (the ephemeris does not
compute it — ADR-0004); directional readings of Saturn and Pluto contacts
(a rewrite of existing texts, not an addition); user-weighted discovery
ranking (designed for in ADR-0009, not exposed in v1).

## Non-goals

- No LLM-generated text. All chart explanations and conversation starters
  are hand-written Turkish templates keyed by placement/aspect. (Revisit
  after v1; the Edge Function boundary keeps the door open.)
- No unknown-birth-time mode. No whole-sign fallback, no chart without an
  Ascendant. Users who cannot find their time cannot finish onboarding.
- No continuous location tracking. Location is read once at onboarding
  (device location with permission; the chosen city's centre if refused)
  and only when the user taps "Konumu güncelle". Other users see a
  distance in km, never coordinates.
- No Android in the first release. The Expo codebase keeps it possible;
  nothing is Android-tested until iOS ships.
- No payments, premium tier, boosts or super-likes.
- No transits, daily horoscopes, notifications about "today's energy".
- No English or other UI languages; no i18n framework beyond keeping
  strings in one file.
- No photo pre-moderation. Photos go live immediately; reports and blocks
  are the moderation path (owner decision 2026-09-08).
- No photo, voice or video in chat. Text only.
- No social graph features (friends, comparing charts with non-matches).
- No web app.

## Constraints

- **Platform:** iOS first via Expo + EAS; Expo Router; TypeScript strict.
  Backend is Supabase (Postgres + RLS, Auth, Storage, Realtime, Edge
  Functions). See `docs/adr/0002-stack.md`.
- **Astrology engine:** `astronomy-engine` (MIT, pure JS) for planetary
  positions; tropical zodiac; Placidus houses computed in-house. Birth
  time is mandatory, so every chart has an Ascendant and houses. Swiss
  Ephemeris is out (AGPL / paid licence).
- **Compatibility formula:** the conventional synastry point method
  (inter-chart aspects weighted by planet pair, aspect type and orb),
  parameters fixed in `docs/adr/0003-compatibility.md`; deterministic,
  symmetric, unit-tested.
- **Birth place → coordinates + time zone:** offline city list bundled in
  the app (GeoNames `cities15000` subset with IANA zone); local time →
  UTC via ICU/`Intl` so historical DST rules apply for the birth date.
  No paid geocoding API.
- **Distance:** stored as a PostGIS/earthdistance point per profile;
  discovery filters by radius server-side; the public profile view
  exposes only a rounded distance.
- **Gender model:** gender ∈ {kadın, erkek, belirtmek istemiyorum};
  interested in ∈ {kadın, erkek, herkes}. A user whose gender is
  "belirtmek istemiyorum" is shown only to users who chose "herkes".
- **Content:** Turkish template texts authored by Claude in this repo and
  reviewed by the owner; ~360 snippets (120 planet-in-sign, 120
  planet-in-house, 12 Ascendant signs, ~105 inter-chart aspect starters
  for Sun/Moon/Mercury/Venus/Mars/Ascendant pairs × 5 major aspects).
- **Apple App Store dating-app rules:** 18+ age gate at sign-up; block and
  report reachable from every profile and chat; in-app account deletion;
  a report-review path; Sign in with Apple offered alongside email OTP.
  Developer name: oguzpancuk; bundle ID `com.oguzpancuk.juno`;
  whether an Apple Developer Program membership exists is checked in the
  first deploy session.
- **KVKK (Turkish data protection):** birth date/time/place and location
  are personal data; explicit consent text at sign-up; privacy policy URL
  required by App Store; data lives in Supabase EU region.
- **Security:** no service-role key in the app; all data access via RLS;
  Zod at every boundary.
- **Budget:** solo developer; Supabase free/Pro tier; Apple Developer
  Program; no paid third-party APIs.
- **Language:** UI and content Turkish; code, comments, commits, docs
  English.
- **Timeline:** no hard deadline. This PRD is more than ~2 weeks of solo
  work; `docs/ROADMAP.md` holds the walking-skeleton cut.

## Success signals

- **Engine accuracy:** every reference chart in the Vitest suite matches
  astro.com within 1° for all 10 planets and the Ascendant (0 failures).
- **Onboarding completion:** ≥ 70 % of users who create an account reach
  the chart screen (Supabase query on profiles vs. auth users).
- **TestFlight cohort (first 2 weeks, ~50 invited users):** ≥ 10 matches,
  ≥ 5 conversations with ≥ 3 messages from each side.
- **Starter usage:** ≥ 50 % of first messages in a match reference the
  pinned starter (manual read of a sample, or a "used starter" tap).
- **Stability:** crash-free sessions ≥ 99 % on TestFlight (Sentry).
- **Safety:** every report is visible in the Supabase dashboard within a
  minute; no report goes unreviewed for more than 48 h during TestFlight.

## Open questions

[Unresolved — owner answers these, agents don't guess them.]

Resolved 2026-09-08 by the owner (kept for the audit trail):

1. Geocoding: offline city list. → Constraints.
2. Compatibility formula: "whatever the standard is, research and apply
   it". → `docs/adr/0003-compatibility.md`.
3. Content authoring: Claude writes, owner reviews. → Constraints.
4. Discovery scope: distance filter, not city. → Interaction 4.
5. Photo moderation: on report only. → Non-goals.
6. Gender model: kadın/erkek/belirtmek istemiyorum; interested in
   kadın/erkek/herkes. → Constraints.
7. Apple: developer name oguzpancuk; membership status unknown. → Deploy
   step in ROADMAP v1.
8. Birth time: required. → Interaction 1, Non-goals.

Still open:

- Does an Apple Developer Program membership exist for oguzpancuk, and is
  the App Store name "Juno" available? Answered in the first deploy
  session; blocks TestFlight only. Juno is an asteroid used in astrology,
  which fits, but the name is common enough elsewhere that the listing has
  to be checked before it is promised anywhere.
