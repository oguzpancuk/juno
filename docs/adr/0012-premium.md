# 12. Premium membership: a self-granted flag, server-enforced quotas

Date: 2026-09-21

## Status

Accepted

## Context

The owner asked for a premium membership on 2026-09-21, and said in the
same sentence what it must not wait for:

> premium uyelik ozelligi: simdilik odeme kismina gerek yok, premium uye
> farki yeterli. premium uyelik al dediginde direkt almis olsin, odemeyi
> sonra ekleriz. premium uye farkli olarak sinirsiz like atabilir, haftada
> 5 superlika atabilir, kendisini begenenleri gorebilir ve uyuma gore
> siralama yapabilir

Payments are deferred by an earlier decision of the owner's, so the
membership has to exist with nothing behind the counter. That leaves one
real question — where the difference between a free and a premium member
is decided — and three smaller ones it drags along: what "unlimited"
is measured against, what a super like is in a schema that has two kinds
of swipe, and what a free member is allowed to learn about the people who
liked them.

## Decision

**The flag is the member's own to set.** `profiles.is_premium` is in the
column-by-column update grant; "Premium ol" is one write from the device
and the membership is live in that round trip. There is no receipt to
check, so an Edge Function in front of it would be a function that says
yes to everyone, and a boundary that cannot refuse anything is worse than
no boundary: it reads as one. `premium_since` is the server's, stamped by
a trigger, so the one fact about the membership that must not be a
client's word is not one.

**The quotas are the database's.** `private.likes_enforce_quota`, a
BEFORE INSERT trigger on `likes`, refuses a free member's twenty-first
like of a rolling day and every super like they try, and a premium
member's sixth star of a rolling week. It also overwrites `created_at`
with `now()`, because a client that picks its own timestamp empties every
window it likes. These are what the flag actually buys, and they hold
against PostgREST, not only against the app.

The two numbers are 20 likes per 24 hours and 5 super likes per 7 days.
"Unlimited" needs something to be unlimited against, and the repo had no
cap at all, so one was chosen rather than discovered: 20 is roughly a
deck's worth of nearby people, and the window rolls rather than resetting
at midnight, because a calendar day needs a timezone and the truer
sentence is "your likes come back one by one over the next day".

**A super like is a like with a column on it**, `likes.is_super`, not a
third value of `like_kind`. Every `kind = 'like'` condition already
written — the match trigger, the demo reciprocation, `discover`'s
exclusion — keeps meaning what it says, and a super like matches exactly
as a like does.

**`liked_me` withholds the person, not the row.** The view returns one
row per waiting like for everybody, carrying the star and the day; the
columns that say who — name, age, photographs, chart — come through a
join that is only made for a premium member, so for a free one they are
null in the answer rather than blurred on the device. The count and the
star are the upsell, and the upsell is the one thing a free member is
meant to have.

**Ordering the deck by compatibility is a preference, not a rule.** The
score comes from `@juno/astro` on the device, so the server cannot rank
by it (the same reason `min_band` and `sun_elements` are stored and
applied on the device). `profiles.sort_by` is honoured by the client;
with a self-granted flag there is nothing it could usefully enforce
anyway.

## Consequences

Until the first swipe of a free member's twenty-first like of the day,
nothing in this release can tell a member from a non-member, and that is
by design: a member who wants the membership taps once and has it. When a
payment step lands, `is_premium` comes out of the update grant and a
function that has a receipt to check writes it instead; nothing else in
this decision has to move, because every rule already runs on the flag
rather than on how it got there.

The free deck now comes in distance order. Until this release every deck
was ordered by compatibility, so this is a visible change for a free
member, and it is what leaves the membership something to offer.

Demo profiles never appear on `liked_me`: a demo likes a member only in
answer to that member's own like (ADR-less, `20260917000001_demo_profiles.sql`),
which is a match in the same round trip. Read against the owner's "hepsi o
kullanıcıyı beğensin", a new member's list is therefore empty until a real
person likes them. Whether the demos should be shown there as waiting
likes is the owner's call and is recorded in `docs/NOTES.md`.
