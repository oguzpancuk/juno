import type { Href } from 'expo-router';

/**
 * The two links that more than one screen builds, built in one place.
 *
 * Five screens link to the match detail. When that detail moves — it is
 * becoming the second page of the chat (ROADMAP, Track D) — the target
 * changes here and nowhere else, and `app/_layout.tsx`, which navigates
 * to it when a match arrives over Realtime, never has to be touched by
 * a feature track at all.
 */
export function matchDetailHref(matchId: string): Href {
  return { pathname: '/match/[id]', params: { id: matchId } };
}

/**
 * Options for a navigation INTO the matches stack from outside it — the
 * deck after a like, the Realtime listener, another tab's person page.
 * `unstable_settings.initialRouteName` seats the list beneath a cold deep
 * link, but an in-app `navigate` from another tab mounts the stack with
 * the match alone, and the list is then unreachable until a restart.
 * `withAnchor` loads the anchor under the target in that one action.
 * Inside the matches stack (chat → match) the list is already there.
 */
export const INTO_MATCHES = { withAnchor: true } as const;

export function personHref(personId: string): Href {
  return { pathname: '/person/[id]', params: { id: personId } };
}
