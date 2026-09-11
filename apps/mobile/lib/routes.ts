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

export function personHref(personId: string): Href {
  return { pathname: '/person/[id]', params: { id: personId } };
}
