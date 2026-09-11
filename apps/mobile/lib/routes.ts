import type { Href } from 'expo-router';

/**
 * The two links that more than one screen builds, built in one place.
 *
 * The match detail is the second page of the chat — the "Uyum" tab of
 * `(matches)/chat/[id]` — and this is the one place that knows it. The
 * root layout (a match arriving over Realtime), the deck after a like and
 * the person page all land there through this function; a new match
 * therefore opens the chat on its Uyum page, kicker and all (owner
 * default of 2026-09-11: no separate "EŞLEŞTİNİZ" screen).
 */
export function matchDetailHref(matchId: string): Href {
  return { pathname: '/chat/[id]', params: { id: matchId, page: 'match' } };
}

/** The chat itself, on its thread page. */
export function chatHref(matchId: string): Href {
  return { pathname: '/chat/[id]', params: { id: matchId } };
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
