/**
 * The one rule of the photo reorder: a photo trades places with the
 * neighbour on the side that was tapped. Buttons, not a drag (owner,
 * 2026-09-11): six items at most, no gesture dependency, and the rule
 * fits in a function with a test.
 *
 * Returns the input itself when nothing can move — an edge, an index
 * that is not in the list — so a state setter fed the result skips the
 * render and a key built from the list does not refetch. A new array
 * otherwise; the input is never mutated, and the result is always a
 * permutation of it: nothing is duplicated, nothing is dropped.
 */
export function movePhoto<T>(
  list: readonly T[],
  index: number,
  direction: 'left' | 'right',
): readonly T[] {
  if (!Number.isInteger(index)) return list;
  const target = direction === 'left' ? index - 1 : index + 1;
  if (index < 0 || index >= list.length) return list;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  const moving = next[index] as T;
  next[index] = next[target] as T;
  next[target] = moving;
  return next;
}
