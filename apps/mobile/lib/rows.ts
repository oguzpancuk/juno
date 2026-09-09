import type { z } from 'zod';

/**
 * Parse a list of rows one at a time, keeping the ones that hold up.
 *
 * The alternative — parsing the array as a whole — means one unreadable
 * row costs the whole screen for everyone: a single profile the app
 * cannot read used to turn every nearby deck into an error. A dropped row
 * is reported rather than swallowed, because the failure that matters is
 * not one bad row, it is every row failing at once, and an empty list
 * with nothing in the log looks exactly like a quiet day.
 */
export function parseRows<T>(
  schema: z.ZodType<T>,
  rows: readonly unknown[],
  onDropped: (dropped: number, total: number) => void,
): T[] {
  const kept: T[] = [];
  for (const row of rows) {
    const parsed = schema.safeParse(row);
    if (parsed.success) kept.push(parsed.data);
  }
  const dropped = rows.length - kept.length;
  if (dropped > 0) onDropped(dropped, rows.length);
  return kept;
}

/** The default report: a warning naming how many rows were unreadable. */
export const warnDropped =
  (what: string) =>
  (dropped: number, total: number): void => {
    console.warn(`${what}: dropped ${dropped} of ${total} unreadable rows`);
  };
