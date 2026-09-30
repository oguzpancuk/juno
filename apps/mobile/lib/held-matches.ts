/**
 * Matches that arrived while the member stood behind the privacy notice
 * (KVKK re-consent). The root layout's Realtime listener must not open the
 * tabs over `/consent` or over the gate's spinner, and the insert it heard
 * fires only once, so the match waits here until the tabs' gate answers
 * `current` and shows it then (review of #19, round 2).
 *
 * Module state, per member, like the `current` set in `consent.ts`. Pure,
 * so Vitest drives it.
 */
const held = new Map<string, string[]>();

/** Keep a match for when the member is through the gate. */
export function holdMatch(userId: string, matchId: string): void {
  const ids = held.get(userId) ?? [];
  if (!ids.includes(matchId)) held.set(userId, [...ids, matchId]);
}

/** The held matches, in arrival order; taking them empties the list. */
export function takeHeldMatches(userId: string): string[] {
  const ids = held.get(userId) ?? [];
  held.delete(userId);
  return ids;
}
