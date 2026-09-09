# 6. Serve photos through an authorising endpoint, not signed URLs

Date: 2026-09-09

## Status

Accepted

## Context

Photos live in a private Storage bucket, one folder per user. Until now
the app asked Storage for a signed URL and handed that to `Image`.

A signed URL is a bearer token. Storage validates the signature and the
expiry; it does not consult the block table on the request. So a URL
issued while two people could still see each other keeps working after
one of them blocks the other, while a URL for an account that has been
deleted stops working immediately: the object is gone.

That difference is an oracle for a property this codebase treats as
hard. Everywhere else, being blocked and the other person having deleted
their account are deliberately indistinguishable — five earlier review
passes closed leaks of exactly this kind in the RPC surface, `matches`,
`likes`, `reports`, Realtime delete events and even row order. A blocked
person only had to re-request a photo URL their client had already
signed: HTTP 200 meant blocked, HTTP 400 meant deleted. Blocks usually
happen mid-conversation, which is precisely when the other client is
holding a fresh URL, so this was not a corner case.

Shortening the signature's lifetime was tried first, from one hour to
ten minutes. It narrows the window; it does not close it. A lifetime is
a knob, and no setting of it makes the two answers the same.

## Decision

Photos are served by an Edge Function, `photo`, which authorises every
individual request: it identifies the caller from their own access
token, refuses the pair that has a block in either direction, and only
then reads the object with the service role. Blocked, deleted, never
existed and malformed all answer `404` with the same body.

The bucket stays private and its policies stay as they are, so nothing
depends on the function being the only door.

Clients no longer create signed URLs. On native the request carries the
caller's token in a header; on the web the bytes are fetched and handed
to `Image` as an object URL, because `img` cannot send headers. Nothing
is cached (`cache-control: private, no-store`): a cached copy would
reopen the window this exists to close.

## Consequences

Every photo view costs a function invocation and streams through the
edge runtime rather than coming from Storage directly. At v1 traffic
this is cheap, and the deck fetches one photo per card. If it ever
stops being cheap, the answer is a CDN in front of the function with the
authorisation kept per request — not a longer-lived URL.

Photos cannot be shown to a signed-out viewer. That is already true of
every other screen.

The web client holds photo bytes in memory as blobs, so screens revoke
their object URLs when they replace or drop a set.

Signed URLs remain fine for anything with no privacy boundary behind
it. This decision is about photos, where the boundary is the whole
point.
