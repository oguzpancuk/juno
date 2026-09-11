import {
  hasSynastryText,
  isLesserId,
  parseStarterKey,
  starterFromKey,
  synastryReading,
} from '@juno/astro';
import type { PublicChart } from '@juno/astro';
import type { MatchProfileRow } from './matches';

/** One thing the starter screen can offer to send. */
export interface StarterOption {
  readonly headline: string;
  readonly meaning: string;
  readonly question: string;
}

/**
 * Starter parts for a match, from my side (a < b by uuid).
 *
 * Takes only the two columns it reads, so this module stays free of the
 * Supabase client and can be tested without a React Native runtime.
 */
export function starterFor(
  row: Pick<MatchProfileRow, 'starter_key' | 'id'>,
  myId: string,
): StarterOption | null {
  const key = parseStarterKey(row.starter_key);
  if (!key) return null;
  // Parsing is not enough. The column's CHECK admits every body-aspect-body
  // triple, 605 of them, while the content set covers the 255 pairings the
  // engine can actually score. A key from outside that set used to throw
  // out of the render — on the match screen, the matches list and the
  // thread, all of which only wanted to show a row.
  if (!hasSynastryText(key.planetA, key.aspect, key.planetB)) return null;
  return starterFromKey(key, isLesserId(myId, row.id));
}

/** How many aspects to offer before the list starts over. */
export const OFFERED = 5;

/**
 * The questions to offer, best first.
 *
 * `synastryReading` ranks the aspects between the two charts viewer-first;
 * the like stored one of them in uuid order, which is the same aspect seen
 * from the other side when this viewer is the greater id. Matching it back
 * up puts the stored question first — the one the match screen shows —
 * instead of offering it twice or leading with a different one.
 *
 * Without the viewer's own chart there is still the stored aspect, which
 * needs only the key: one question and no alternatives is a working
 * screen, and much better than the error it would otherwise be.
 */
export function starterOptions(
  myChart: PublicChart | null,
  row: MatchProfileRow,
  userId: string,
): readonly StarterOption[] {
  const stored = starterFor(row, userId);
  if (!myChart) return stored ? [stored] : [];
  const { aspects } = synastryReading(myChart, row.chart, OFFERED);
  const key = parseStarterKey(row.starter_key);
  if (!key) return aspects;
  const viewerIsA = isLesserId(userId, row.id);
  const mine = viewerIsA ? key.planetA : key.planetB;
  const theirs = viewerIsA ? key.planetB : key.planetA;
  const at = aspects.findIndex(
    (reading) =>
      reading.aspect.planetA === mine &&
      reading.aspect.planetB === theirs &&
      reading.aspect.aspect === key.aspect,
  );
  // Outside the top `OFFERED`: `strongestOf` prefers a harmonious aspect
  // over a slightly stronger tense one, so the stored aspect is not always
  // first by magnitude and with a long aspect list can fall off the end.
  // Putting the stored question in front of the ranked list keeps this
  // screen agreeing with the match screen either way.
  if (at < 0) return stored ? [stored, ...aspects] : aspects;
  if (at === 0) return aspects;
  const first = aspects[at];
  if (!first) return aspects;
  return [first, ...aspects.filter((_, index) => index !== at)];
}
