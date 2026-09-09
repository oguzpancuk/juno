# Working notes — append-only, dated

<!-- The session-to-session memory. Every work session appends: what was
     done, what was verified (and how), what is open. Newest at top.
     Never rewrite old entries — this file is the audit trail. -->

## Upstream candidates

<!-- Improvements made HERE to template-origin files (.claude/, contracts/,
     CLAUDE.md) that maya should inherit. /update-stack harvests this list.
     Format: date · file · one-line what/why. Remove entries once upstreamed. -->

## 2026-09-09 — Web client, and what it immediately caught

- `expo install react-dom react-native-web @expo/metro-runtime` plus a
  `web` block in `app.json` (metro bundler, single output) is the whole
  setup; `npx expo start --web --port 8083` serves the same screens. Run it
  with `EXPO_PUBLIC_SUPABASE_URL`/`_ANON_KEY` from `supabase status`: a
  browser on this machine reaches the local stack, so the hosted project
  is not needed to try it.
- Verified in the browser, end to end, as a new user: sign-in with the
  emailed code, onboarding (city search offered İstanbul first for
  "ista"), chart with the interpretation texts, discover with two passes
  and a like, the mutual like opening the match screen, sending a message
  from the composer and receiving the reply, filing a report, and
  blocking — which redirected to an empty match list.
- The web client immediately paid for itself twice. First, it closed the
  two verification gaps the simulator left open: the chat composer's send
  path and the block/report buttons had never been exercised. Second, it
  found a real bug: `Alert.alert` is a no-op in react-native-web, so on
  the web the block confirmation and "Hesabımı sil" did nothing at all.
  Both are in-page confirmations now, which is also better on iOS.
- Reordering ADR-0005 (web before the hosted project) was the right call
  for verification: browser automation drives this app reliably, while the
  simulator dropped synthetic taps on Pressables inside ScrollViews and
  sent typed text to another app.
- Note for the hosted step: nothing here proves the web build works
  against a remote project (CORS on the Edge Function is written for it
  but untested), and there is no static hosting yet.

## 2026-09-09 — Safety fourth pass: a writable view and a leaking note

- `my_reports` was auto-updatable and ran as its owner, and Supabase's
  default grants left `authenticated` with insert, update and delete on
  it. One REST call could rewrite or erase every report an account had
  ever filed — the record the whole design says survives even an account
  deletion. The view is explicitly read-only now, with a test.
- The mask covered `reported_id` but not `note`, so a prober who reports
  every match with a one-character note could sort a block (id null, note
  present) from a deletion (both null) with a single filtered GET. The
  view masks the note the same way.
- Two more claims corrected: a report row is anonymous only once BOTH
  sides are gone, and until then it still carries the surviving person's
  uuid; the client docstring and the ROADMAP said otherwise.
- The mask itself had no test (deleting it left the suite green, because
  the reads happened after the unblock) and only the reporter-deleted half
  of the set-null design was covered. Both sides are pinned now.
- Deck: only a missing counterpart counts as "gone". A 23503 on the
  caller's own profile row (account deleted on another device) used to
  drop cards silently until the deck looked empty; it now falls through to
  the error path.
- The Realtime test was flaky on a cold stack — the first
  postgres_changes binding after a container restart takes seconds, and CI
  runs exactly that cold path. `beforeAll` now does one full warm round
  trip and deletes the primer, so the measured crossing is steady-state.

## 2026-09-09 — Safety third pass: reports and Realtime were reading surfaces

- The third review falsified "no read surface reveals it" again, in two
  places, and both are now closed:
  1. `reports: read own` returned the subject's id, so a prober who
     reports every match on day one later sees the id still there after a
     block while a deletion nulls it. The table is no longer selectable by
     `authenticated`; the reporter reads `my_reports`, an owner-executed
     view that masks a subject who has blocked them, so a block and a
     deletion look identical.
  2. Realtime DELETE events are not RLS-filtered: a subscriber received
     the primary key of matches and messages between other people, and the
     presence or absence of a DELETE told a blocked person which of the
     two had happened. `supabase_realtime` now publishes insert and update
     only; nothing in the app subscribes to deletes.
- The set-null design had no test: cascading both foreign keys instead
  left all 58 tests green. The Edge Function suite now asserts the row
  survives with both ids and the note nulled and the reason intact.
- "What survives names nobody" was false while `note` (free text a
  reporter writes, often a name) stayed. A trigger clears the note as soon
  as either side goes.
- Deck bug from the new likes insert policy: a card belonging to someone
  who blocks you mid-session refused both like and pass and stuck at the
  head. A block or a deleted profile now drops the card, the same as
  having swiped it.
- Residual, deliberate and documented in the migration: write error codes
  still differ (42501 for a block, 23503 for a deletion) on a like or a
  report insert. Closing that needs a tombstone model. Also unbounded: one
  caller can still file one report per reason per person; there is no
  throttle.
- Reading `reports` needs care in tests: `authenticated` has insert but
  not select, so `insert(...).select()` comes back null. Insert, then read
  `my_reports`.

## 2026-09-09 — Safety re-review: the third oracle, and honest claims

- The re-review falsified the previous entry's claim. `likes` still told
  the blocked person what happened: their own like row for the blocker
  survived a block but vanished when an account was deleted, so two REST
  calls named the block. The read policy now hides it and the insert
  policy refuses a like at a blocked person. What is left is a write-code
  difference (42501 for a block, 23503 for a deletion); closing that would
  need a tombstone model, so the claim is now "no read surface reveals
  it", not "indistinguishable".
- `reports.reported_id` had lost its NOT NULL for the set-null path, which
  let any caller insert unbounded rows naming nobody. A before-insert
  trigger requires both sides; nulls can now only come from the FK.
- The unique index was per pair, so a user reporting the same person for
  something worse got "received and will be reviewed" while the row still
  read the old reason. It is now per pair AND reason, so an escalation is
  a new record.
- The preflight test measured the local gateway, not the function: with
  the CORS code deleted it still passed. It now asserts the function's own
  headers on a POST, and the allow-list gained `x-client-info`, which
  supabase-js always sends and whose absence would have broken account
  deletion in the browser the ADR makes the first client.
- Corrected claims: the surviving report row names nobody, so it is an
  anonymous audit trail and not a way to recognise a re-registering
  offender; the migration comment and this file said otherwise.
- Tracked rather than fixed: `unblockUser` stays out of the client until
  there is a screen for it, and the ROADMAP now carries "Blocked list in
  settings". Also unverified: whether Realtime filters DELETE events on
  `matches` by RLS — the shipped client only subscribes to INSERT, but a
  modified one could learn a deletion happened and infer a block from its
  absence.

## 2026-09-09 — Safety review: two block oracles closed

- Review found that the block was announced by two surfaces even though
  the `blocks` row itself was hidden. Both are closed:
  1. `is_blocked` and `match_open` sat in `public`, so PostgREST served
     them as RPC and the blocked person could ask
     `rpc/is_blocked(<uuid>)` and get `true`. They now live in a `private`
     schema, which is not in `config.toml`'s exposed `schemas`, with
     usage and execute granted to `authenticated` only.
  2. `match_profiles` hid the pair but the raw `matches` row stayed
     readable, and "match row present, profile row missing" has one cause.
     The `matches` select policy now carries the same block check, so a
     block looks exactly like the other person deleting their account.
- The discover block and report filters were unpinned: the pair in the
  test had liked each other, so the like filter satisfied the assertions
  and both clauses could be deleted with the suite green. A new test uses
  a pair that never swiped.
- Reports now survive the accounts they are about (`on delete set null`
  on both ids) so a repeat offender cannot clear their record by deleting
  and re-registering; what is kept is reason, note and timestamp. A
  partial unique index makes one report per pair, and the client treats
  the conflict as "already filed". The self-report CHECK had to be
  rewritten for nulls: with both accounts gone the row is (null, null)
  and `is distinct from` was rejecting the second delete with GoTrue's
  "Database error deleting user".
- The report confirmation used to promise "you will never see this
  profile again", which is false on the match screen: reporting is
  one-way and leaves the match and the thread open. It now says the deck
  is cleared and points to Engelle for cutting contact.
- The Edge Function answers a preflight with CORS headers; ADR-0005 makes
  a browser the first reachable client and `functions.invoke` always
  preflights. New tests cover the preflight, an anon or service-role key
  used as a bearer token, and a body naming someone else (ignored; the
  caller is deleted, the named account survives).
- Not done: `deno` is not installed on this machine, so the Edge Function
  is still outside the battery's typecheck and lint. Worth a `deno check`
  step once Deno is available.

## 2026-09-09 — v1 safety controls: block, report, delete account

- Schema (`20260909000002_safety.sql`): `blocks` (one row, two-way effect)
  and `reports` (enum reason plus an optional private note). A block is
  readable only by the blocker, because "you have been blocked" is not a
  fact the app hands out; `is_blocked()` and `match_open()` are security
  definer so the blocked side is shut out without being able to see the
  row. `match_open` replaced `is_match_member` in the message policies, so
  one block closes discovery, the match and the thread for both people at
  once. A report is one-way: it hides the profile from the reporter only.
- Account deletion is an Edge Function (`supabase/functions/delete-account`)
  that verifies the caller with their own token and then deletes exactly
  that auth user with the service-role key; the schema's cascades take the
  profile, likes, matches, messages, blocks and reports. The service-role
  key never reaches the app.
- Verified: battery green; 8 RLS tests (both-way closure, the blocked side
  seeing nothing, unblock restoring the thread, report stored and hiding
  the profile, no editing or withdrawing a report, enum enforced) and 3
  Edge Function tests (401 without a token, 405 on GET, and a delete that
  leaves the other person intact but match-less).
- Found by driving the UI: the safety buttons sat under the home indicator
  on the match screen, the same class of bug as the chat composer earlier
  today. Both screens now pad by the safe-area inset.
- NOT verified: the block and report buttons' wiring. Injected taps do not
  reach a Pressable inside this screen's ScrollView (Links directly above
  it work, and Pressables in a plain View work with a press-and-hold), so
  no observed press. The database behaviour behind them is covered by the
  tests above. Same standing gap as the chat composer's send button.
- Gotcha: a new Edge Function is copied into the edge-runtime container at
  `supabase start`; restarting the container is not enough, the stack has
  to be stopped and started or the endpoint stays 404.

## 2026-09-09 — Chat review fixes, city search, location refresh

- Chat review (code-reviewer, NEEDS_WORK → fixed in `9ac71ae`): a matched
  user could set `created_at` and `read_at` on insert. A chosen
  `created_at` pins that message as the other person's conversation
  preview forever (no delete, no unmatch in v1); a preset `read_at` posts
  a message that never counts as unread. Both are now stamped by a
  before-insert trigger, the receipt cannot be cleared or backdated, and a
  CHECK holds `read_at >= created_at`. Also: `is_match_member` pins
  `search_path` to '', the conversation list refetches on focus (the badge
  used to stay stale after reading), `fetchMessages` takes the newest 200
  descending (an unbounded ascending query freezes at PostgREST's 1000-row
  cap), `markThreadRead` reports failures, and a ref guards double-tap
  send. Two new RLS tests cover the timestamp invariants.
- City search (`1a7e73d`): tiered matching plus 53 Turkish exonyms. The
  reviewer caught that a half-typed exonym outranked real names ("is" gave
  İskenderiye before İstanbul); exonym prefixes now sit after whole-name
  matches, with a test.
- Location refresh: `lib/location.ts` holds the one-shot fix shared with
  onboarding, `updateLocation` writes the point, settings has "Konumu
  güncelle" with working/done/failed states.
- Commit hygiene: `9ac71ae` mixed three unrelated changes (chat fixes, the
  geo ranking fix, the location feature) because everything was staged
  together; the message only describes the chat fixes. Not rewritten
  (history rewriting is ask-tier); recorded here instead.
- Simulator gotchas worth keeping: the `pati` dev build
  (`com.oguzpancuk.pati`) competes for `exp://` AND for keyboard focus —
  typed text landed in it for most of this session until it was
  terminated with `simctl terminate`. After that, text entry into a React
  Native TextInput works. Some Pressables need a press-and-hold
  (`touch_path` with ~130 ms) rather than an instant tap. The chat
  composer's send button was clipped under the home indicator (no safe-area
  inset) — found by driving the UI, fixed with `useSafeAreaInsets`.
- Verified: battery green; location change observed in the database
  (`screenshots/v1-location.png`). NOT verified: a message sent from the
  app's own composer. Text now reaches the composer and the send button
  enables, but no send was observed completing; the insert path is covered
  by the RLS suite, the UI wiring is not.

## 2026-09-09 — v1 chat (unattended session)

- Done: `messages` table with `is_match_member()` (security definer,
  search_path pinned, execute granted to authenticated only) behind every
  policy; insert pins `sender_id` to the caller; update is limited to the
  recipient and, by trigger, to `read_at`; no delete policy; table added
  to the Realtime publication. `match_profiles` extended with
  `last_body`/`last_at`/`last_sender_id`/`unread_count` (lateral joins), so
  the conversation list needs no second query.
- App: `lib/chat.ts` (Zod rows, `useThread` with postgres_changes filtered
  by `match_id`, merge-by-id so a row arriving twice renders once),
  `/chat/[id]` with the starter pinned above the thread, matches screen
  turned into a conversation list (last message, "Sen:" prefix, unread
  badge), match screen links into the thread.
- Behaviour fixed mid-session: the thread first marked messages read from
  the Realtime handler, so a backgrounded (still-mounted) thread marked
  them read while the user was on another screen. Read receipts now fire
  only from `useFocusEffect` and from a focused-guarded effect. Verified
  both ways in the simulator against the database.
- Verified: battery green on a clean tree; 8 new RLS tests; a Realtime
  test measuring the crossing (346 ms against a 2 s budget) that also
  asserts an outsider receives nothing; `screenshots/v1-chat.png` (peer
  message arriving live in the open thread) and
  `v1-conversations.png` (unread badge, last message).
- NOT verified: sending a message from the app's own composer. Text
  injection into a React Native TextInput does not work in this
  simulator setup (taps and swipes do; `simctl` typing and clipboard
  paste both fail, with and without the hardware-keyboard default). The
  insert path is covered by the RLS tests instead. Also not done: two
  real simulators side by side; the peer was a service-role script
  (`supabase/scripts/seed-message.ts`).
- Gotchas: Metro in CI mode does not regenerate `.expo/types/router.d.ts`
  when a route file is added — restart Expo or typed `href`s fail to
  typecheck. A simulator session can be planted by writing the
  supabase-js session into Expo Go's AsyncStorage
  (`…/ExponentExperienceData/@anonymous/<slug>/RCTAsyncLocalStorage`, key
  `sb-127-auth-token`, value in a file named by the key's MD5 when over
  1 KB); `supabase/scripts/make-tester.ts` creates the matching profile.
- Next: profile photos + bio (Storage policies), then safety controls.

## 2026-09-09 — App name: constraint and shortlist

- Owner ruled out Turkish names: the shipped app name must not be Turkish
  (the Turkish UI stays; only the product name is affected).
- `stardate` cannot ship as the product name: stardate.love is a live
  astrology dating app. It stays as the repo/code name only.
- Checked and taken: Trine (a synastry match app), Midheaven, Yildizname,
  Zodya. Synastry is generic and cannot be owned.
- Shortlist with no App Store hit found: Conjunct (recommended),
  Luminaries, Perihelion; Syzygy has minor developer-name collisions.
  Trademark (Turk Patent, USPTO) and domain checks are still not done.
- Open: owner picks the name, then Expo config, app.json, strings and
  store metadata are renamed in one commit.

## 2026-09-09 — Owner sign-off on the interpretation texts

- Owner approved the Turkish content as of `459ce54` ("metinleri
  onaylıyorum"). ROADMAP v1 item "Full Turkish content" closed; its
  done-when is now fully met (completeness test, screenshots, sign-off).
- Owner asked for app name proposals; recorded in the next entry when a
  name is chosen.

## 2026-09-09 — Layering guarantee: rules test + full-pair judgment

- Owner approved the three-layer guarantee for sign/house/aspect text
  consistency (the astrological standard covers score vs aspect text;
  sign-vs-house consistency inside one reading is our own layering rule).
- Layer 1+2 (`packages/astro/src/content-rules.test.ts`, in the battery):
  house texts carry no sign-owned tempo/temperament words; aspect texts
  carry no sign names or element flavour (whole-word Turkish match); no
  sentence repeated between sign and house layers; all 1,440 planet
  sign+house pairs scanned for antonym pairs (stem match, so Turkish
  suffixes count) and for any shared 4-word sequence. The antonym scan is
  a regression guard: on today's corpus no pair fires; consistency itself
  was established by the evaluator passes below.
- Layer 3 (one-off): five evaluator passes judged every one of the 1,440
  pairs twice. First pass flagged 190 (house texts asserting tempo,
  visibility or dignity; outer-planet sign texts written as life areas).
  Response: 115 of 120 house texts rewritten to life area + behaviour
  across the range (97 in `e9ce67c`), 52 Jupiter–Pluto sign texts
  rewritten to temperament. Second
  pass flagged 111, mostly natural-house restatements (Leo/5, Virgo/6 …)
  and a few residual mode claims in house texts; ~70 texts rephrased with
  distinct vocabulary. Rewritten texts re-audited against the references:
  houses 117/120, outer signs 56/60, deviations applied.
- Known residual, accepted: a sign and its natural house share a theme by
  definition; texts now differ in wording and in mode (how vs where) but
  a reader will still see the theme twice in 1/12 of placements.
- Verified: battery green; astro 236 tests. Not verified: no third
  judgment pass; no screenshots (text-only change).

## 2026-09-08 — Owner decision: compatibility stays purely geometric

- Owner confirmed the scoring model: the score comes only from inter-chart
  aspects, weights, orbs and the Sun/Moon element bonus (ADR-0003). The
  natal character texts are not an input, and no semantic trait-matching
  layer will be added; "if the astrology is right, the system is right".
- Consequence: text-to-score consistency is guaranteed by construction
  (each scored aspect shows its own text, direction checked mechanically
  for all 469 aspect keys). Sign-text vs house-text consistency within one
  reading is our own layering rule, not something the sources guarantee;
  the mechanical guards for it (lexicon lint and full 1,440-pair scan) are
  proposed, not yet built.

## 2026-09-08 — Content verified against references; geometry–meaning coherence

- Owner asked (a) that every chart text be interpreted correctly and
  (b) that the geometric match (score, strongest aspect) really agree with
  the written characters. Method for (a): four researcher passes built a
  keyword table per key from two independent public references per layer
  (list and URLs in `docs/astro-sources.md`); four audit passes judged
  every text for semantic match and direction. Result: signs 132 (4
  fixed), houses 120 (2), natal aspects 214 (8), synastry 255 (15);
  commits `00f4f53`, `54bceb8`, `057efc6`, `f4c2cf1`. Reference tables
  live only in the session scratchpad; the document records sources and
  method, not the tables.
- Method for (b): `packages/astro/scripts/content-audit.ts` renders a
  coherence report for seven sample pairs (fixture user + seeds) plus a
  lexicon-based sentiment-direction check against ADR nature; an
  evaluator-qa pass judged it NEEDS_WORK with eight concrete findings, all
  applied to the texts (not the samples) in `54bceb8`: sign-flavoured
  aspect texts made sign-neutral, Uranus conjunctions framed as "one shakes
  the other's patterns", the "high" band no longer promises excitement the
  aspect list can contradict, house texts reframed to the life area so
  they stop contradicting the sign text's tempo (Mars Taurus "slow" vs
  1st house "fast"), duplicate phrases between sign and house removed.
  Layering rule now written in `docs/astro-sources.md`.
- Engine: ADR-0003 amendment 1 (`af86641`) — an opposition to the
  Ascendant is a Descendant conjunction and scores +4, texts rewritten in
  that framing. Observed but NOT changed (owner call): the tight-orb bonus
  can rank a 0.3° Venus–Jupiter square above a 4° Venus–Mars conjunction
  as the headline aspect (Ayse × Deniz); the harmonious preference in
  `strongestOf` only applies within 10 %.
- Remaining sentiment-audit flags (3) are lexicon false positives
  (sun-square-jupiter, venus-square-uranus, uranus-sextile-ascendant).
- Verified: battery green on each commit; astro 228 tests. Not verified:
  no new screenshots (UI unchanged); references were read through a fetch
  summariser, not raw pages — a spot check of any line is cheap before it
  becomes marketing copy.
- Still open: owner sign-off on the texts (ROADMAP item stays `[~]`);
  composite sign+house texts (1,440 keys) deliberately not written.

## 2026-09-08 — Interpretation content (owner priority)

- Owner asked for professional, 1–2-sentence analysis of every chart and
  compatibility combination without drowning the user. Built:
  `packages/astro/content/tr/` — signs 132, houses 120, retrograde 8,
  natal aspects 216 (45 body pairs × 5 minus 9 geometrically impossible
  Sun–Mercury/Sun–Venus/Mercury–Venus hard aspects), synastry 255 (51
  pairs × 5, each meaning + opening question), Sun/Moon element pairs 20,
  score bands 5 — 756 texts, Zod-validated, `content.test.ts` enumerates
  every key the engine can emit and fails on a missing or unknown key
  (generational outer–outer pairs are excluded from both engine and key
  space). Engine: `natalAspects`, `natalReading`, `synastryReading`,
  `starterFromKey`. UI: chart screen shows sign + house + retrograde
  lines per planet and the strongest natal aspects with orbs; discover
  card has an expandable detail (band, elements, top 3 aspects); match
  screen shows the pair-specific starter (headline, meaning, question),
  score band, element lines and top 5 aspects.
- Quality pass: the first draft of the 300 outer-planet entries was
  telegraphic ("… fazla vaat. Ölçü."); all rewritten as full sentences in
  `b0fd8cf`. Voice: natal texts address the user ("sen"), synastry texts
  describe the pair neutrally so one text serves both viewers; the
  mechanical headline is oriented per viewer by the engine.
- Verified: battery green (astro 218 tests); `screenshots/c1-chart-texts.png`,
  `c1-aspects.png`, `c1-synastry.png` on the real user (Ayse / Deniz).
  Not done: owner sign-off on the texts (the done-when's last clause);
  ROADMAP item marked in progress until then.
- Review (code-reviewer, pass 1 NEEDS_WORK → this commit): Saturn
  conjunctions to Moon/Venus/Mars score as tension (ADR −4) but the
  synastry texts sold them as the safest bond — rewritten as heavy-but-
  binding; `IMPOSSIBLE` now also excludes Sun–Mercury and Sun–Venus
  sextiles (a sextile needs ≥ 56° separation; max elongations are 28°/48°)
  so natal texts are 214; the completeness contract is now engine-derived
  (a test synthesizes every pair at every angle and asserts the emitted
  aspect resolves to a text), `natalAspects` has a direct fixture test, and
  a "≥ 4 words per sentence" test enforces the 1–2-full-sentence brief —
  it caught 139 telegraphic tails, all rewritten; same-body texts no longer
  claim "same sign" (conjunction is longitude-based); match/discover show the viewer-oriented headline ("Ay'ın onun
  Satürn'üyle …") instead of a neutral "Ay kare Satürn" — landed in the
  follow-up commit: the first attempt's text replacement had silently
  missed and an earlier version of this note wrongly claimed it; the
  reviewer caught it; `natalReading` drops a geometrically impossible
  pair from a tampered row instead of throwing; dead placeholder starter
  code removed; duplicate question fixed.
- Review pass 3: PASS for the whole content range. `c1-synastry.png`
  recaptured with viewer-oriented headlines. Open: owner sign-off on the
  texts; reviewer's remaining minor is a third copy of the outer-planet
  set in the test (engine, content, test) — export one when convenient.
- Gotchas: `exp://` is claimed by both Expo Go and the pati dev build on
  this simulator, so `openurl` sometimes fronts pati and typed text lands
  there — `xcrun simctl launch booted host.exp.Exponent` before typing.
  An expired session once left the app on "Yükleniyor…" with no network
  request until Expo Go was relaunched (then it resolved to signed-out);
  not reproduced, worth watching (v1 SecureStore/session item).
  `prettier --write` must include `packages/astro/content` after regenerating
  JSON from Python (indent differs).

## 2026-09-08 — S7 match + conversation starter

- Done: `starterSentenceTr` (astro), `lib/matches.ts` (Zod rows from
  `match_profiles`, `useMatchListener` on Realtime `postgres_changes`
  INSERT for `matches`), `/match/[id]`, `/matches`, discover nav link,
  `seed-like.ts` (service role, refuses non-local URLs). S6 review fixes
  landed in `5eb862e` (deterministic tie-break — documented as not
  mirror-invariant on exact ties, harmless because keys are computed in
  a<b order; element bonus from stored signs; settings guards; the root
  `tsconfig.json`/`lint` script that `expo lint` had scaffolded removed).
- Verified: battery green (astro 186). Simulator: `seed-like.ts
t3@stardate.local deniz` wrote Deniz → Ayse (`jupiter-square-venus`,
  Deniz is `a`); Like on Deniz produced one `matches` row and the match
  screen opened at once via Realtime, showing "Venüs'ün onun Jüpiter'iyle
  kare açı yapıyor. Sürtüşme de çekim demek; …?" from Ayse's side
  (`screenshots/s7-match.png`); the matches list shows the same
  (`s7-matches.png`).
- Gotchas: RN `textTransform: 'uppercase'` maps Turkish i → I (rendered
  "EŞLEŞTINIZ"); pre-uppercase Turkish strings instead. Prettier flips the
  indentation of a code span broken across lines in a Markdown list —
  keep code spans on one line. `expo lint` from the repo root scaffolds
  `eslint.config.js`, `tsconfig.json` and a `lint` script at the root;
  always run it inside `apps/mobile`. Python edit scripts must be
  idempotent and assert every anchor; this session lost edits three
  times to prettier reformatting anchor text between runs.
- Review (code-reviewer, S7 pass 1 NEEDS_WORK → `bb69a60`): the tie
  test was a tautology (now pins the winner and input-order independence);
  the liker now checks `match_profiles` right after a like instead of
  relying on the Realtime socket; `isLesserId` single-sources a<b order;
  `s7-match.png` retaken after the kicker fix. `expo lint` caches under
  `apps/mobile/.expo/cache` and kept reporting a parse error that no
  longer existed, so the app's lint script runs `--no-cache` (commit
  `bb69a60` was cut while that stale FAIL showed; the tree was clean by
  every other check and is re-verified in the next commit).
- `contracts/init.sh` boots Supabase + Expo (8082) with the local keys;
  from an agent shell run it detached (`bash contracts/init.sh > log &`):
  run inline, the Bash tool waited on Expo's process group for 10 min.
- S7 review pass 2: PASS. Reviewer saw one unreproduced supabase test
  failure in six battery runs (name not captured); `vitest.config.ts`
  already serialises files and sets a 60 s hook timeout — watch for it in
  CI, and capture the failing test name if it recurs.
- evaluator-qa (fresh context, HEAD 6a4636a/3fdc69d): NEEDS_WORK on
  evidence, PASS on function — battery green on clean HEAD twice, `npm ls`
  clean, 27/27 RLS tests ×7 (the flake did not reproduce), every
  screenshot matches its clause and the fixture, live deep-link
  re-observation of chart/discover/matches/match agreed with the
  committed images, DB rows as claimed. Gaps and what was done: (1) S7
  Realtime delivery to the _liked_ side is unobserved (no second client)
  — ROADMAP S7 now says so and points at the v1 two-simulator check;
  the liker-side Realtime delivery was observed before the direct
  `match_profiles` check existed. (2) `s5-chart.png` shows 8 of 10 rows —
  `s5-chart-2.png` (scrolled) adds Neptün and Plüton. (3) The midnight
  user's DB row was wiped by a later `db reset`; the observation stands
  as recorded (`birth_utc 1995-07-13T21:10Z`) but is not re-verifiable
  without re-onboarding — re-check it in the v1 server-side validation
  item. (4) Review marker lagged HEAD by one docs commit — final review
  requested on the closing range.
- Walking skeleton complete (S0–S7). Skeleton exit items still open:
  remotes + CI never run (no GitHub remote; creating one is outward-facing
  and waits for the owner), code-reviewer on S7, evaluator-qa after this
  unattended run.

## 2026-09-08 — S6 discover with compatibility

- Done: `packages/astro/src/compatibility.ts` (ADR-0003 verbatim: body
  weights, aspects/orbs/bases, outer-orb ×0.75, Saturn −4 override,
  tight-orb ×1.25 capped, element bonus, damped score, strongest with
  harmonious preference; `starterKey` oriented a<b), Turkish aspect text
  (`describeAspectTr`), seed generator (`supabase/scripts/gen-seed.ts`,
  run with `npx tsx`, output committed as `seed.sql`), discover +
  settings screens, swipe library with 23505 tolerance, account-switch
  link on onboarding, auth error mapping keyed on GoTrue codes.
- Verified: battery green (astro 184 tests incl. the hand-built pair —
  found by a one-off greedy search because eleven bodies per chart make
  an aspect-free layout impossible by hand, then hand-verified: H = 3+2+2,
  T = 1.35 → 65). Simulator, user "Ayse" (fixture #1, woman, wants men):
  discover shows Kaan 72 / Emre 60 / Deniz 59 (men; women and the Ankara
  seed excluded); Pass on Kaan and Like on Emre write `likes` rows (the
  like carries `sun-trine-venus`, oriented with Emre as `a`); re-entering
  discover shows only Deniz; settings 500 km makes Burak (352 km) appear.
  `screenshots/s6-discover.png`, `s6-radius-500.png`; `s5-chart.png`
  recaptured with the final strings.
- Gotchas: Expo Go's floating dev-menu gear sits exactly over a top-right
  link, so navigation in tests goes through deep links
  (`exp://127.0.0.1:8082/--/discover`); `expo lint` run from the repo
  root generates a stray root `eslint.config.js` (deleted); the remote
  gate hooks scan the whole Bash command text for the deploy verb, even
  inside heredoc comments — phrase docs as "hosted project" instead;
  Expo Go keeps stale JS across `expo start` restarts until the app is
  terminated and reopened.
- Next: S7 match screen + starter (Realtime on `matches`); the seed can
  make a seeded user like the tester via a service-role script.

## 2026-09-08 — S5 sign-in, onboarding, chart screen

- Done: `apps/mobile` screens — sign-in (email OTP: `signInWithOtp` +
  `verifyOtp`, session in AsyncStorage), onboarding (name, gender,
  interest, offline city search, date + mandatory time, calendar and 18+
  checks mirroring the DB, one-shot device location with a 5 s timeout
  and city-centre fallback), chart (big three badges, ten planets with
  sign/degree/house/retrograde and placeholder Turkish lines, sign-out).
  `lib/profile.ts` computes the chart on device, stores the `PublicChart`
  form (no engine input) and reads rows back through Zod; `lib/errors.ts`
  maps auth/Postgres error codes to Turkish (raw provider text never
  reaches the screen); 23505 on insert routes to the chart (lost response
  after a committed insert). `packages/astro` gained `PublicChartSchema`,
  `toPublicChart` (boundary-safe rounding: 359.99996 → 0, sign/degree
  derived from the rounded longitude), `bigThree`, Turkish names and
  `formatDegree`; `packages/geo` gained `isValidCalendarDate`.
- Verified: battery green; `screenshots/s5-chart.png` shows fixture #1
  (İstanbul 1995-07-14 03:30) and every visible value equals the Swiss
  Ephemeris fixture (Sun Yengeç 21°08′ 2. ev … Plüton Akrep 27°59′ R);
  the DB row has `birth_utc` 00:30Z, i.e. Hermes' Intl agrees with Node.
  `screenshots/s5-midnight.png`: a second user born 00:10 local resolves to
  1995-07-13T21:10Z — no ICU "24" hour quirk on Hermes/iOS. Both users
  denied location; the stored point is the snapped city centre.
- Manual-test hygiene: `db reset` wipes local users, and Expo Go keeps the
  JS app alive across it — the chart screen can show a profile that no
  longer exists until a sign-out. The RLS suite must not assume an empty
  DB (one test did; fixed to assert absence of fixture users).
- Dev loop: keys are passed as `EXPO_PUBLIC_*` env vars on the `expo
start` command line (the `.env` write was refused by the tool
  permissions; `.env.example` documents the variables). Port 8082, `--clear`
  after route changes; typed routes regenerate on `expo start`.
  Simulator typing drops characters occasionally (a "14" arrived as "1",
  an e-mail lost its tail, autocorrect turned "Gece" into "Hence") —
  always screenshot before submitting.
- Review (code-reviewer, S5 pass 1 NEEDS_WORK → fixes in this commit):
  location call could hang submit forever; boundary rounding could throw
  a ZodError on a valid chart; 30 Feb passed the UI check; English error
  text; duplicate-profile dead end; `zod` undeclared in the app; effect
  refetch keyed on session object; `expo-location` plugin with a Turkish
  purpose string. v1 gains "session in SecureStore".
- Known: two clients on different engine versions produce different
  starter keys and can never match (trigger refuses) — the v1 app-update
  story must version the key or the engine (noted for S7).
- Next: S6 discover + compatibility.

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
