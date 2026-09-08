# ADR-0004: Ephemeris — astronomy-engine, tropical zodiac, Placidus houses

Status: accepted · Date: 2026-09-08

## Context

ADR-0002 deferred the ephemeris source to its own ADR after a licence
check. The candidates were Swiss Ephemeris (the de-facto standard in
astrology software; AGPL, or a paid commercial licence for closed-source
apps) and pure-JS libraries: `astronomy-engine` (MIT, VSOP87-derived,
arcminute accuracy, no data files) and `astronomia` (MIT, VSOP87 with
bundled data). The app is closed-source and ships on the App Store, so
AGPL is not usable; the paid licence is an avoidable cost for a solo MVP.
The owner chose `astronomy-engine` when asked (2026-09-08).

## Decision

- **Planetary positions:** `astronomy-engine` (MIT). Geocentric ecliptic
  longitudes of Sun–Pluto (Moon included) for the birth instant, tropical
  zodiac (the Turkish popular-astrology convention), no sidereal option.
- **Houses:** Placidus, implemented in `packages/astro` from the standard
  formulae (obliquity, sidereal time, Ascendant/MC, iterative cusp
  solution); whole-sign is not offered because birth time is mandatory
  (PRD non-goal).
- **Aspects:** the five major aspects (conjunction 0°, sextile 60°, square
  90°, trine 120°, opposition 180°) with orbs fixed in ADR-0003.
- **Accuracy target:** within 1° of astro.com for every planet, Ascendant
  and MC on the reference fixtures; the Vitest suite in `packages/astro`
  is the gate (ROADMAP S1/S2).
- **Time handling:** birth place resolves to lat/lon and an IANA zone from
  the bundled city list; local time → UTC via `Intl` (ICU carries
  historical DST rules). The engine takes a UTC instant only.

## Consequences

- No licence obligations beyond MIT attribution.
- Accuracy is below Swiss Ephemeris (arcminutes vs. arcseconds) but far
  inside the 1° tolerance a sign/house/aspect product needs; the boundary
  cases (a planet within arcminutes of a sign or house cusp) can differ
  from astro.com and are accepted.
- Placidus is our own code, so it is the riskiest part of the engine; it
  is tested against three reference charts, including one at a high
  latitude, before the UI uses it. Charts above ~66° latitude, where
  Placidus is undefined, are rejected by the Zod schema with a message.
- Swapping the ephemeris later only touches the position adapter in
  `packages/astro`; the fixtures stay valid.
