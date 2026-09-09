import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { supabase } from './supabase';

/** A row of `messages`. Both sides of a match read the same rows. */
export const MessageRowSchema = z.object({
  id: z.string().uuid(),
  match_id: z.string().uuid(),
  sender_id: z.string().uuid(),
  body: z.string(),
  read_at: z.string().nullable(),
  created_at: z.string(),
});

export type MessageRow = z.infer<typeof MessageRowSchema>;

/** Mirrors the CHECK on `messages.body`. */
export const MAX_MESSAGE_LENGTH = 2000;

export const isSendable = (body: string): boolean => {
  const trimmed = body.trim();
  return trimmed.length > 0 && body.length <= MAX_MESSAGE_LENGTH;
};

/**
 * Newest slice of a thread, oldest first. Bounded on purpose: PostgREST
 * caps a response at `max_rows` (1000), and an unbounded ascending query
 * would hand back the OLDEST 1000 once a thread grows past it, freezing
 * the screen in the past.
 */
export const THREAD_PAGE_SIZE = 200;

export async function fetchMessages(
  matchId: string,
  limit = THREAD_PAGE_SIZE,
  /** Page backwards from this row (exclusive), oldest known first. */
  before?: Pick<MessageRow, 'created_at' | 'id'>,
): Promise<MessageRow[] | null> {
  let query = supabase
    .from('messages')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  if (before) {
    // Tuple comparison on (created_at, id): two messages can share a
    // timestamp, and a plain `lt` on time would drop one of them.
    query = query.or(
      `created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`,
    );
  }
  const { data, error } = await query;
  if (error) return null;
  const parsed = z.array(MessageRowSchema).safeParse(data);
  return parsed.success ? [...parsed.data].reverse() : null;
}

/**
 * Insert one message. `sender_id` is also enforced by RLS; sending it
 * explicitly keeps the row valid without a server default.
 */
export async function sendMessage(
  matchId: string,
  senderId: string,
  body: string,
): Promise<MessageRow | null> {
  if (!isSendable(body)) return null;
  const { data, error } = await supabase
    .from('messages')
    .insert({ match_id: matchId, sender_id: senderId, body: body.trim() })
    .select('*')
    .single();
  if (error) return null;
  const parsed = MessageRowSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/**
 * Mark the counterpart's unread messages as read. The update policy only
 * matches rows this user received, so the filter is a narrowing, not the
 * guard.
 */
export async function markThreadRead(
  matchId: string,
  myId: string,
): Promise<void> {
  // The server stamps the time; the value sent here only satisfies the
  // column's not-null rule on update.
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('match_id', matchId)
    .neq('sender_id', myId)
    .is('read_at', null);
  // A failure leaves the badge up; the next focus retries, so this is a
  // log rather than a state the screen has to carry.
  if (error) console.warn('markThreadRead failed', error.message);
}

const byTime = (a: MessageRow, b: MessageRow): number =>
  a.created_at === b.created_at
    ? a.id.localeCompare(b.id)
    : a.created_at.localeCompare(b.created_at);

/** Insert-or-replace by id: a row can arrive twice (insert reply + Realtime). */
function merge(list: readonly MessageRow[], row: MessageRow): MessageRow[] {
  const without = list.filter((m) => m.id !== row.id);
  return [...without, row].sort(byTime);
}

export interface Thread {
  readonly messages: MessageRow[] | null | 'loading';
  readonly send: (body: string) => Promise<boolean>;
  /** Pull the page before the oldest message held; no-op once exhausted. */
  readonly loadOlder: () => Promise<void>;
}

/**
 * One match's thread: initial load plus live inserts. Read receipts are
 * NOT sent here: the subscription outlives the screen's visibility, and a
 * message must not count as read while the thread sits in the background.
 * The screen marks read while it is focused. Realtime postgres_changes
 * respects RLS, so only this match's rows reach a member.
 */
export function useThread(matchId: string | null, myId: string | null): Thread {
  const [messages, setMessages] = useState<MessageRow[] | null | 'loading'>(
    'loading',
  );
  // The current list, readable from callbacks without re-creating them.
  const held = useRef<MessageRow[]>([]);
  const exhausted = useRef(false);
  const loadingOlder = useRef(false);

  useEffect(() => {
    held.current =
      messages === 'loading' || messages === null ? [] : [...messages];
  }, [messages]);

  useEffect(() => {
    exhausted.current = false;
  }, [matchId]);

  useEffect(() => {
    if (!matchId || !myId) return;
    let cancelled = false;
    void fetchMessages(matchId).then((rows) => {
      if (!cancelled) setMessages(rows);
    });

    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const row = MessageRowSchema.safeParse(payload.new);
          if (!row.success || cancelled) return;
          setMessages((prev) =>
            merge(prev === 'loading' || prev === null ? [] : prev, row.data),
          );
        },
      )
      .subscribe((status, err) => {
        // A dead socket degrades to "no live updates", never to a wrong
        // thread; make it visible instead of silent.
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`messages channel ${status}`, err?.message);
        }
      });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [matchId, myId]);

  const send = useCallback(
    async (body: string): Promise<boolean> => {
      if (!matchId || !myId) return false;
      const row = await sendMessage(matchId, myId, body);
      if (!row) return false;
      setMessages((prev) =>
        merge(prev === 'loading' || prev === null ? [] : prev, row),
      );
      return true;
    },
    [matchId, myId],
  );

  const loadOlder = useCallback(async (): Promise<void> => {
    if (!matchId || exhausted.current || loadingOlder.current) return;
    const oldest = held.current[0];
    if (!oldest) return;
    loadingOlder.current = true;
    const older = await fetchMessages(matchId, THREAD_PAGE_SIZE, oldest);
    loadingOlder.current = false;
    if (!older) return;
    if (older.length === 0) {
      exhausted.current = true;
      return;
    }
    if (older.length < THREAD_PAGE_SIZE) exhausted.current = true;
    setMessages((prev) => {
      const base = prev === 'loading' || prev === null ? [] : prev;
      return older.reduce<MessageRow[]>((list, row) => merge(list, row), base);
    });
  }, [matchId]);

  return { messages, send, loadOlder };
}
