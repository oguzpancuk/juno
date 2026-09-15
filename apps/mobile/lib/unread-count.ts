/**
 * The arithmetic of the Eşleşmeler tab's unread badge, apart from the
 * query and the subscription so it can be tested without a network.
 */

/** Past this the badge stops counting; the list still shows each thread's. */
export const BADGE_CAP = 99;

/** Every thread's unread count, summed. Negative or broken counts add 0. */
export function totalUnread(rows: readonly { unread_count: number }[]): number {
  let total = 0;
  for (const row of rows) {
    const n = row.unread_count;
    if (Number.isInteger(n) && n > 0) total += n;
  }
  return total;
}

/**
 * What the badge says: nothing at zero — React Navigation hides a badge
 * whose value is undefined — the count up to the cap, then "99+".
 */
export function badgeText(total: number): string | undefined {
  if (!Number.isInteger(total) || total <= 0) return undefined;
  return total > BADGE_CAP ? `${BADGE_CAP}+` : String(total);
}
