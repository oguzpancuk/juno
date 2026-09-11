import { describe, expect, it } from 'vitest';
import type { MessageRow } from './chat';
import {
  EXCERPT_LENGTH,
  excerpt,
  indexById,
  initialOf,
  lastReadMine,
  quoteFor,
  showsAvatar,
} from './thread-view';

const ME = '00000000-0000-4000-8000-00000000000a';
const THEM = '00000000-0000-4000-8000-00000000000b';
const MATCH = '00000000-0000-4000-8000-0000000000aa';

const uuid = (n: number): string =>
  `00000000-0000-4000-8000-${n.toString().padStart(12, '0')}`;

/** A row at minute `minute` of one day; `read` stamps a receipt. */
const row = (
  n: number,
  sender: string,
  options: { read?: boolean; minute?: number; replyTo?: string } = {},
): MessageRow => ({
  id: uuid(n),
  match_id: MATCH,
  sender_id: sender,
  body: `message ${n}`,
  reply_to: options.replyTo ?? null,
  read_at: options.read ? '2026-09-11T12:00:00Z' : null,
  created_at: `2026-09-11T10:${(options.minute ?? n).toString().padStart(2, '0')}:00Z`,
});

describe('lastReadMine', () => {
  it('picks my newest read message', () => {
    const thread = [
      row(1, ME, { read: true }),
      row(2, THEM, { read: true }),
      row(3, ME, { read: true }),
      row(4, ME),
    ];
    expect(lastReadMine(thread, ME)).toBe(uuid(3));
  });

  it('ignores their messages, read or not', () => {
    expect(lastReadMine([row(1, THEM, { read: true }), row(2, THEM)], ME)).toBe(
      null,
    );
  });

  it('is null when nothing of mine has been read', () => {
    expect(lastReadMine([row(1, ME), row(2, ME)], ME)).toBeNull();
    expect(lastReadMine([], ME)).toBeNull();
  });

  it('does not depend on the order it is given', () => {
    const oldestFirst = [
      row(1, ME, { read: true }),
      row(2, ME, { read: true }),
      row(3, ME),
    ];
    expect(lastReadMine(oldestFirst, ME)).toBe(uuid(2));
    expect(lastReadMine([...oldestFirst].reverse(), ME)).toBe(uuid(2));
  });

  it('breaks a shared timestamp by id, like the fetch order', () => {
    const tie = [
      row(2, ME, { read: true, minute: 5 }),
      row(1, ME, { read: true, minute: 5 }),
    ];
    expect(lastReadMine(tie, ME)).toBe(uuid(2));
  });
});

describe('showsAvatar', () => {
  // Newest first, as the inverted FlatList holds it. Read bottom-up on
  // the screen: index 0 is the bubble nearest the composer.
  const ordered = [
    row(6, ME),
    row(5, THEM), // last of a run of two → avatar
    row(4, THEM),
    row(3, ME),
    row(2, THEM), // a run of one → avatar
    row(1, ME),
  ];

  it('is true only on the last bubble of a run of theirs', () => {
    expect(ordered.map((_, i) => showsAvatar(ordered, i, ME))).toEqual([
      false,
      true,
      false,
      false,
      true,
      false,
    ]);
  });

  it('marks their newest bubble when it is the newest of all', () => {
    const theirsLast = [row(2, THEM), row(1, THEM)];
    expect(showsAvatar(theirsLast, 0, ME)).toBe(true);
    expect(showsAvatar(theirsLast, 1, ME)).toBe(false);
  });

  it('never marks mine, and never an index off the list', () => {
    expect(showsAvatar([row(1, ME)], 0, ME)).toBe(false);
    expect(showsAvatar(ordered, ordered.length, ME)).toBe(false);
  });
});

describe('quoteFor', () => {
  const loaded = [row(1, THEM), row(2, ME, { replyTo: uuid(1) })];
  const byId = indexById(loaded);

  it('resolves a reply from the loaded window', () => {
    expect(quoteFor(byId, uuid(1))?.body).toBe('message 1');
  });

  it('is null for an id that is not loaded, and for no reply', () => {
    expect(quoteFor(byId, uuid(99))).toBeNull();
    expect(quoteFor(byId, null)).toBeNull();
  });
});

describe('excerpt', () => {
  it('returns a short message as it is', () => {
    expect(excerpt('Merhaba')).toBe('Merhaba');
  });

  it('truncates at the limit with an ellipsis, the ellipsis counted', () => {
    const long = 'a'.repeat(EXCERPT_LENGTH + 20);
    const cut = excerpt(long);
    expect(Array.from(cut)).toHaveLength(EXCERPT_LENGTH);
    expect(cut.endsWith('…')).toBe(true);
    expect(excerpt('b'.repeat(EXCERPT_LENGTH))).toBe(
      'b'.repeat(EXCERPT_LENGTH),
    );
  });

  it('folds a multi-line message into one line', () => {
    expect(excerpt('bir\n\n  iki   üç ')).toBe('bir iki üç');
  });

  it('counts code points, so an emoji at the cut is not split', () => {
    const cut = excerpt('🙂'.repeat(10), 5);
    expect(cut).toBe(`${'🙂'.repeat(4)}…`);
  });
});

describe('initialOf', () => {
  it('upper-cases the first letter the Turkish way', () => {
    expect(initialOf('irem')).toBe('İ');
    expect(initialOf('ışıl')).toBe('I');
    expect(initialOf('deniz')).toBe('D');
    expect(initialOf('  Çağla')).toBe('Ç');
  });

  it('is empty for an empty name', () => {
    expect(initialOf('')).toBe('');
    expect(initialOf('   ')).toBe('');
  });
});
