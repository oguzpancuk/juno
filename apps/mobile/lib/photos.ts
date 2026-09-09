import * as ImagePicker from 'expo-image-picker';
import { z } from 'zod';
import { supabase } from './supabase';

/** Mirrors the trigger on `profiles.photos`. */
export const MAX_PHOTOS = 6;
const BUCKET = 'photos';
/** Long enough for a browsing session; the bucket itself stays private. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

const SignedSchema = z.array(
  z.object({ path: z.string().nullable(), signedUrl: z.string() }),
);

/**
 * Display URLs for stored paths, in the same order. A path that cannot be
 * signed (blocked, or the object is gone) is dropped rather than shown as
 * a broken image.
 */
export async function signedPhotoUrls(
  paths: readonly string[],
): Promise<string[]> {
  if (paths.length === 0) return [];
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls([...paths], SIGNED_URL_TTL_SECONDS);
  if (error) return [];
  const parsed = SignedSchema.safeParse(data);
  if (!parsed.success) return [];
  const byPath = new Map(
    parsed.data
      .filter((s) => s.path !== null)
      .map((s) => [s.path, s.signedUrl]),
  );
  return paths.flatMap((path) => {
    const url = byPath.get(path);
    return url ? [url] : [];
  });
}

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
  return { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' };
}

const EXTENSIONS: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

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
  const extension = EXTENSIONS[file.mimeType] ?? 'jpg';
  const path = `${userId}/${Date.now()}.${extension}`;
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
