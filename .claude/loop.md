Maintenance tick for this product. Work top-down; stop at the first section
that yields real work, do it, then report and end the tick.

1. CI/PRs: if CI is red on the default branch or an open PR I own is red or
   conflicted — fix per the drive-to-green discipline.
2. ROADMAP: if the walking skeleton has an unstarted item whose dependencies
   are done, take exactly ONE and complete it with its done-when verification.
3. Tidy: if neither applies, check docs/NOTES.md for stale open questions I
   can now answer from the code; answer at most one, then stop.

Bounds: never start a second feature in one tick; never touch deploy; work
needing a local device or service this session cannot reach: do not
attempt it — write the handoff into docs/NOTES.md. If nothing is
actionable, say "quiet tick" and stop — do not invent work.
