import * as ImagePicker from 'expo-image-picker';
import { z } from 'zod';
import { supabase } from './supabase';

/** Mirrors the trigger on `profiles.photos`. */
export const MAX_PHOTOS = 6;
const BUCKET = 'photos';
/**
 * Short on purpose. A signed URL is a bearer token: Storage checks the
 * signature, not the block table, so a URL handed out before a block keeps
 * resolving until it expires while a deleted account's stops at once —
 * a window in which the two are distinguishable. Ten minutes covers a
 * browsing session (screens re-sign on focus) and keeps that window small.
 * Closing it fully needs photos served through a function that authorises
 * every request; recorded in docs/NOTES.md as a v1 residual.
 */
const SIGNED_URL_TTL_SECONDS = 10 * 60;

const SignedSchema = z.array(
  z.object({
    path: z.string().nullable(),
    signedUrl: z.string().nullable(),
    error: z.string().nullable().optional(),
  }),
);

/**
 * Display URLs for stored paths, aligned with the input: index i is the URL
 * for paths[i], or null when that one path cannot be signed (blocked, or
 * the object is gone). Never compacted — callers pair these with the paths
 * by index, and a shorter array would put one person's photo on another
 * person's card.
 */
export async function signedPhotoUrls(
  paths: readonly string[],
): Promise<(string | null)[]> {
  if (paths.length === 0) return [];
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls([...paths], SIGNED_URL_TTL_SECONDS);
  if (error) return paths.map(() => null);
  const parsed = SignedSchema.safeParse(data);
  if (!parsed.success) return paths.map(() => null);
  const byPath = new Map<string, string>();
  for (const signed of parsed.data) {
    if (signed.path !== null && signed.signedUrl !== null) {
      byPath.set(signed.path, signed.signedUrl);
    }
  }
  return paths.map((path) => byPath.get(path) ?? null);
}

const EXTENSIONS: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Opens the library. Returns the picked file, or null if cancelled. */
export async function pickPhoto(): Promise<{
  uri: string;
  mimeType: string;
} | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [3, 4],
    quality: 0.7,
  });
  const asset = picked.assets?.[0];
  if (picked.canceled || !asset) return null;
  // The bucket accepts three types; anything else is rejected here rather
  // than uploaded under a guessed extension.
  const mimeType = asset.mimeType ?? 'image/jpeg';
  if (!(mimeType in EXTENSIONS)) return null;
  return { uri: asset.uri, mimeType };
}

/**
 * Upload one photo into the caller's own folder and append it to the
 * profile. Storage RLS enforces the folder; the trigger on `photos`
 * enforces the count and that every path is the owner's.
 */
export async function addPhoto(
  userId: string,
  current: readonly string[],
  file: { uri: string; mimeType: string },
): Promise<string[] | null> {
  if (current.length >= MAX_PHOTOS) return null;
  const extension = EXTENSIONS[file.mimeType];
  if (!extension) return null;
  // Random suffix: two uploads in the same millisecond would otherwise
  // overwrite each other and leave two profile entries on one object.
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const path = `${userId}/${name}.${extension}`;
  const body = await (await fetch(file.uri)).blob();
  const uploaded = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: file.mimeType });
  if (uploaded.error) return null;
  const photos = [...current, path];
  const { error } = await supabase
    .from('profiles')
    .update({ photos })
    .eq('id', userId);
  if (error) {
    // Do not leave an object the profile does not know about.
    await supabase.storage.from(BUCKET).remove([path]);
    return null;
  }
  return photos;
}

/** Remove one photo from the profile and then from storage. */
export async function removePhoto(
  userId: string,
  current: readonly string[],
  path: string,
): Promise<string[] | null> {
  const photos = current.filter((p) => p !== path);
  const { error } = await supabase
    .from('profiles')
    .update({ photos })
    .eq('id', userId);
  if (error) return null;
  // Best effort: a leftover object is invisible, a leftover path is not.
  await supabase.storage.from(BUCKET).remove([path]);
  return photos;
}

export const MAX_BIO_LENGTH = 300;

export async function saveBio(userId: string, bio: string): Promise<boolean> {
  const trimmed = bio.trim();
  if (trimmed.length > MAX_BIO_LENGTH) return false;
  const { error } = await supabase
    .from('profiles')
    .update({ bio: trimmed.length > 0 ? trimmed : null })
    .eq('id', userId);
  return !error;
}
