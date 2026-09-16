import type { Href } from 'expo-router';

/**
 * The two links that more than one screen builds, built in one place.
 *
 * The match detail is the second page of the chat — the "Uyum" tab of
 * `(matches)/chat/[id]` — and this is the one place that knows it.
 */
export function matchDetailHref(matchId: string): Href {
  return { pathname: '/chat/[id]', params: { id: matchId, page: 'match' } };
}

/**
 * The moment a match lands: the root layout (a match arriving over
 * Realtime) and the deck after a like both go here first, and this screen
 * hands on to the chat's Uyum page. It reverses the owner's default of
 * 2026-09-11 (no separate "EŞLEŞTİNİZ" screen) at their request of
 * 2026-09-16 ("its a match ekranımız var mı? yoksa yarat"). Inside the
 * matches stack like every signed-in screen, so the bar stays under it.
 */
export function matchArrivedHref(matchId: string): Href {
  return { pathname: '/match/[id]', params: { id: matchId } };
}

/** The chat itself, on its thread page. */
export function chatHref(matchId: string): Href {
  return { pathname: '/chat/[id]', params: { id: matchId } };
}

/**
 * Options for a navigation INTO the matches stack from outside it — the
 * deck after a like, or the Realtime listener.
 * `unstable_settings.initialRouteName` seats the list beneath a cold deep
 * link, but an in-app `navigate` from another tab mounts the stack with
 * the match alone, and the list is then unreachable until a restart.
 * `withAnchor` loads the anchor under the target in that one action.
 * Inside the matches stack (chat → match) the list is already there.
 */
export const INTO_MATCHES = { withAnchor: true } as const;
