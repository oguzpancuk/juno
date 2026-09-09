import { z } from 'zod';
import { supabase } from './supabase';

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
  return !error || error.code === '23505';
}

export async function unblockUser(
  myId: string,
  otherId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', myId)
    .eq('blocked_id', otherId);
  return !error;
}

/** File a report. The reported profile disappears from the reporter's deck. */
export async function reportUser(
  myId: string,
  otherId: string,
  reason: ReportReason,
  note?: string,
): Promise<boolean> {
  const trimmed = note?.trim();
  const { error } = await supabase.from('reports').insert({
    reporter_id: myId,
    reported_id: otherId,
    reason,
    note: trimmed && trimmed.length > 0 ? trimmed.slice(0, 500) : null,
  });
  return !error;
}

const DeletedSchema = z.object({ deleted: z.string().uuid() });

/**
 * Delete this account. The Edge Function holds the service-role key and
 * only ever deletes its caller; the schema's cascades take the profile,
 * likes, matches, messages, blocks and reports with it.
 */
export async function deleteAccount(): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
  });
  if (error) return false;
  return DeletedSchema.safeParse(data).success;
}
