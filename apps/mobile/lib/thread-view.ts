import type { MessageRow } from './chat';

/**
 * The rules of the thread screen that do not need React Native: which
 * bubble carries the other person's avatar, which of mine shows "Okundu",
 * what a reply quotes and how much of it. Each is a small function with
 * a test, because each was a place to get a direction wrong — the list
 * is inverted, and "under the last message" means the opposite of what
 * the array order says.
 */

/** How much of a quoted message the reply bar and the quote block show. */
export const EXCERPT_LENGTH = 60;

/**
 * One line of a message, at most `max` characters with the ellipsis
 * counted. Code points, not UTF-16 units: an emoji at the cut would
 * otherwise be split in two.
 */
export function excerpt(body: string, max = EXCERPT_LENGTH): string {
  const oneLine = body.replace(/\s+/g, ' ').trim();
  const chars = Array.from(oneLine);
  if (chars.length <= max) return oneLine;
  return `${chars
    .slice(0, max - 1)
    .join('')
    .trimEnd()}…`;
}

/** Same order as `fetchMessages`: time, then id, so two rows never tie. */
const later = (a: MessageRow, b: MessageRow): boolean =>
  a.created_at === b.created_at ? a.id > b.id : a.created_at > b.created_at;

/**
 * The id of my newest message the other side has read, or null. Only that
 * one bubble carries the caption: a receipt under every read message is
 * noise, and the newest one implies the rest. Order-agnostic, so the
 * caller may pass the thread either way round.
 */
export function lastReadMine(
  messages: readonly MessageRow[],
  myId: string,
): string | null {
  let newest: MessageRow | null = null;
  for (const message of messages) {
    if (message.sender_id !== myId || message.read_at === null) continue;
    if (newest === null || later(message, newest)) newest = message;
  }
  return newest === null ? null : newest.id;
}

/**
 * Whether the bubble at `index` of the inverted list gets the other
 * person's avatar. `ordered` is newest first (the FlatList is inverted),
 * so the last bubble of a run of theirs — the one nearest the composer —
 * is the one with the LOWEST index of its run: their bubble whose newer
 * neighbour is absent or someone else's.
 */
export function showsAvatar(
  ordered: readonly MessageRow[],
  index: number,
  myId: string,
): boolean {
  const bubble = ordered[index];
  if (bubble === undefined || bubble.sender_id === myId) return false;
  const newer = ordered[index - 1];
  return newer === undefined || newer.sender_id !== bubble.sender_id;
}

/** Rows by id, for the quote lookups below. */
export function indexById(
  messages: readonly MessageRow[],
): ReadonlyMap<string, MessageRow> {
  return new Map(messages.map((message) => [message.id, message]));
}

/**
 * The message a reply quotes, when it is in the loaded window; null when
 * it is not, and the screen says so instead of fetching it. A reply to
 * something two hundred messages up is rare enough that the fallback
 * line costs less than a request per bubble would.
 */
export function quoteFor(
  byId: ReadonlyMap<string, MessageRow>,
  replyTo: string | null,
): MessageRow | null {
  if (replyTo === null) return null;
  return byId.get(replyTo) ?? null;
}

/**
 * The letter an avatar falls back to when there is no photo. Turkish
 * upper case: `i` becomes `İ`, which `toUpperCase()` alone gets wrong
 * (`ı` → `I` it already gets right).
 */
export function initialOf(name: string): string {
  const first = Array.from(name.trim())[0];
  if (first === undefined) return '';
  return first === 'i' ? 'İ' : first.toUpperCase();
}
