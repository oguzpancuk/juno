import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseRows, warnDropped } from './rows';

const Row = z.object({ id: z.string() });

describe('parseRows', () => {
  it('keeps the rows that parse and drops the ones that do not', () => {
    const dropped: number[] = [];
    const kept = parseRows(Row, [{ id: 'a' }, { id: 7 }, { id: 'b' }], (n) =>
      dropped.push(n),
    );
    expect(kept).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(dropped).toEqual([1]);
  });

  it('says nothing when every row is readable', () => {
    let called = false;
    const kept = parseRows(Row, [{ id: 'a' }], () => {
      called = true;
    });
    expect(kept).toHaveLength(1);
    expect(called).toBe(false);
  });

  it('reports the total when everything is unreadable', () => {
    // The case that matters: a schema change or a renamed column empties
    // the screen, and without this it looks like there is simply nobody
    // there.
    const seen: [number, number][] = [];
    const kept = parseRows(Row, [{}, {}, {}], (dropped, total) =>
      seen.push([dropped, total]),
    );
    expect(kept).toEqual([]);
    expect(seen).toEqual([[3, 3]]);
  });

  it('handles an empty list without reporting', () => {
    let called = false;
    parseRows(Row, [], () => {
      called = true;
    });
    expect(called).toBe(false);
  });

  it('names the surface in the warning', () => {
    const messages: unknown[] = [];
    const original = console.warn;
    console.warn = (message: unknown) => messages.push(message);
    try {
      warnDropped('discover')(2, 5);
    } finally {
      console.warn = original;
    }
    expect(messages).toEqual(['discover: dropped 2 of 5 unreadable rows']);
  });
});
