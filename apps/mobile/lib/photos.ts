import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { env } from './env';
import { supabase } from './supabase';

/** Mirrors the trigger on `profiles.photos`. */
export const MAX_PHOTOS = 6;
const BUCKET = 'photos';

/**
 * What an `Image` needs to show one photo. On native the request carries
 * the caller's token in a header; on the web the bytes are fetched here
 * and handed over as an object URL, because `img` cannot send headers.
 */
export interface PhotoSource {
  readonly uri: string;
  readonly headers?: Readonly<Record<string, string>>;
}

const endpoint = (path: string): string =>
  `${env.supabaseUrl}/functions/v1/photo?path=${encodeURIComponent(path)}`;

/**
 * Sources for stored paths, aligned with the input: index i belongs to
 * paths[i], or is null when that photo cannot be shown. Never compacted —
 * callers pair these with the paths by index, and a shorter array would
 * put one person's photo on another person's card.
 *
 * Photos come through an Edge Function rather than a signed URL: a signed
 * URL is a bearer token that outlives a block, and "blocked" must not be
 * distinguishable from "deleted" (ADR-0006). Every request is authorised,
 * so nothing here is cached.
 */
export async function photoSources(
  paths: readonly string[],
): Promise<(PhotoSource | null)[]> {
  if (paths.length === 0) return [];
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token === undefined) return paths.map(() => null);
  const headers = {
    Authorization: `Bearer ${token}`,
    apikey: env.supabaseAnonKey,
  };
  if (Platform.OS !== 'web') {
    return paths.map((path) => ({ uri: endpoint(path), headers }));
  }
  return Promise.all(
    paths.map(async (path) => {
      try {
        const response = await fetch(endpoint(path), { headers });
        if (!response.ok) return null;
        const blob = await response.blob();
        return { uri: URL.createObjectURL(blob) };
      } catch {
        return null;
      }
    }),
  );
}

/**
 * Frees what `photoSources` allocated. A no-op on native; on the web an
 * object URL pins its blob in memory until it is revoked, so screens call
 * this when they replace or drop a set.
 */
export function releasePhotoSources(
  sources: readonly (PhotoSource | null)[],
): void {
  if (Platform.OS !== 'web') return;
  for (const source of sources) {
    if (source && source.uri.startsWith('blob:')) {
      URL.revokeObjectURL(source.uri);
    }
  }
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
