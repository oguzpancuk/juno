import { z } from 'zod';
import { supabase } from './supabase';
import { notifyUnreadChanged } from './unread';

/** Mirrors the `report_reason` enum; the labels are the UI's, in Turkish. */
export const REPORT_REASONS = [
  { value: 'harassment', label: 'Taciz veya hakaret' },
  { value: 'spam', label: 'Spam veya reklam' },
  { value: 'fake_profile', label: 'Sahte profil' },
  { value: 'nudity', label: 'Uygunsuz içerik' },
  { value: 'underage', label: '18 yaşından küçük' },
  { value: 'other', label: 'Diğer' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['value'];

/**
 * Block someone. The row is one-directional; the server closes discovery,
 * the match and the thread on both sides.
 */
export async function blockUser(
  myId: string,
  otherId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('blocks')
    .insert({ blocker_id: myId, blocked_id: otherId });
  // Blocking twice is not an error the user needs to see.
  const ok = !error || error.code === '23505';
  // A blocked person's thread leaves the list, and its unread count the
  // tab's badge.
  if (ok) notifyUnreadChanged();
  return ok;
}

const BlockedSchema = z.array(
  z.object({
    blocked_id: z.string().uuid(),
    display_name: z.string(),
    created_at: z.string(),
  }),
);

export type BlockedPerson = z.infer<typeof BlockedSchema>[number];

/**
 * Everyone the caller has blocked. Reads the owner-executed `my_blocks`
 * view: `profiles` is not readable across accounts, and the list needs a
 * name to be of any use. Returns null when the read failed, which the
 * screen shows as an error rather than an empty list.
 */
export async function fetchBlocked(): Promise<BlockedPerson[] | null> {
  const { data, error } = await supabase
    .from('my_blocks')
    .select('blocked_id, display_name, created_at');
  if (error) return null;
  const parsed = BlockedSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/**
 * Undo a block. Discovery, the match and the thread reopen on both sides
 * — including the messages from before the block (ADR-0007).
 *
 * A delete that matched nothing is not a success: PostgREST reports no
 * error for it, and the screen would then show the block as lifted while
 * it still stands.
 */
export async function unblockUser(
  myId: string,
  otherId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', myId)
    .eq('blocked_id', otherId)
    .select('blocked_id');
  const ok = !error && (data?.length ?? 0) > 0;
  // The thread comes back, and with it whatever in it is unread.
  if (ok) notifyUnreadChanged();
  return ok;
}

/**
 * File a report. The reported profile disappears from the reporter's deck;
 * the match and the thread stay, so the copy tells the user to block if
 * they want the contact closed.
 */
export async function reportUser(
  myId: string,
  otherId: string,
  reason: ReportReason,
): Promise<boolean> {
  const { error } = await supabase
    .from('reports')
    .insert({ reporter_id: myId, reported_id: otherId, reason });
  // One report per pair and reason: the same reason twice is the same
  // complaint, already filed; a different reason files a new record.
  return !error || error.code === '23505';
}

const DeletedSchema = z.object({ deleted: z.string().uuid() });

/**
 * Delete this account. The Edge Function holds the service-role key and
 * only ever deletes its caller; the schema's cascades take the profile,
 * likes, matches, messages and blocks with it. Reports stay: the caller's
 * id is nulled and the note cleared, so what is left is the reason, the
 * time and the other side's id.
 */
export async function deleteAccount(): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
  });
  if (error) return false;
  return DeletedSchema.safeParse(data).success;
}
