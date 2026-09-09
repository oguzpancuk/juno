# 7. A block is reversible, and undoing one brings the thread back

Date: 2026-09-09

## Status

Accepted

## Context

Blocking hides the pair from each other everywhere: discovery, the match
row, the thread, the photos. It is one row in `blocks`, and every surface
keys on that row existing. Deleting the row therefore restores
everything, including the messages sent before the block, because nothing
was destroyed — only hidden.

That is a leak of the property this codebase otherwise holds to. While a
block stands, the blocked person sees exactly what they would see if the
other account had been deleted. The moment the block is lifted, the
conversation reappears with its history, and they know with certainty
that they were blocked rather than left.

The alternatives were considered and rejected:

- **Destroy the match and the messages when a block is filed.** The
  property holds for ever, but a misfired block — the wrong card, a
  mistap — becomes unrecoverable, and the other person loses a
  conversation they did nothing to lose. Apple requires blocking to be
  easy to reach; making it irreversible makes it dangerous.
- **Keep the block reversible but never restore the thread.** Half the
  data survives with no way to see it, which is the worst of both: the
  messages are still stored, so they are still the user's data under
  KVKK, but nobody can read them.

## Decision

A block stays reversible and undoing one restores the match and the
thread on both sides. The blocked-list screen says so in as many words,
so the person lifting the block knows what the other side will see.

## Consequences

Being blocked is indistinguishable from being deleted only while the
block stands. A person who unblocks tells the other side, implicitly and
irreversibly, that they had been blocked. Nothing in the app hides that,
and it would be dishonest to pretend otherwise in the copy.

This is the one place where the indistinguishability property is
deliberately traded, and it is traded for reversibility of a destructive
action. Every other leak of that property found in review has been
closed rather than accepted.

If the trade turns out to be wrong in use — people unblocking and
regretting it — the fix is not to hide the restoration but to make the
block itself a two-step decision with a clearer warning.
