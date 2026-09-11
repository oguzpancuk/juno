import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  PATH_SEPARATOR,
  photoKey,
  sourcesFor,
  type FetchedSources,
  type PhotoSource,
} from './photo-alignment';
import { env } from './env';
import { supabase } from './supabase';

/** Mirrors the trigger on `profiles.photos`. */
export const MAX_PHOTOS = 6;
const BUCKET = 'photos';

/**
 * On native the request carries the caller's token in a header; on the
 * web the bytes are fetched here and handed over as an object URL,
 * because `img` cannot send headers.
 */
export type { PhotoSource } from './photo-alignment';

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
 * object URL pins its blob in memory until it is revoked.
 */
function release(sources: readonly (PhotoSource | null)[]): void {
  if (Platform.OS !== 'web') return;
  for (const source of sources) {
    if (source && source.uri.startsWith('blob:')) {
      URL.revokeObjectURL(source.uri);
    }
  }
}

/**
 * Sources for `paths`, aligned by index, for as long as the screen shows
 * them. Entries are null while a set is still being fetched and where a
 * photo cannot be shown, so index i always belongs to paths[i]; the rule
 * itself is `sourcesFor`, which has its own test.
 *
 * Identity of the array does not matter, only its contents, so a refetch
 * that returns the same paths does not refetch the photos. The previous
 * set is freed once the new one has arrived, never on the way out: an
 * object URL revoked while the screen still points at it leaves a blank
 * image.
 */
export function usePhotoSources(
  paths: readonly string[],
): (PhotoSource | null)[] {
  const key = photoKey(paths);
  const [fetched, setFetched] = useState<FetchedSources>({
    paths: [],
    sources: [],
  });
  const held = useRef<readonly (PhotoSource | null)[]>([]);

  useEffect(() => {
    let cancelled = false;
    const wanted = key === '' ? [] : key.split(PATH_SEPARATOR);
    void photoSources(wanted).then((next) => {
      if (cancelled) {
        release(next);
        return;
      }
      const previous = held.current;
      held.current = next;
      setFetched({ paths: wanted, sources: next });
      release(previous);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  // Only on unmount: what is held is what the screen is showing.
  useEffect(
    () => () => {
      release(held.current);
      held.current = [];
    },
    [],
  );

  return sourcesFor(paths, fetched);
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
  const upload = () =>
    supabase.storage.from(BUCKET).upload(path, body, {
      contentType: file.mimeType,
    });
  let uploaded = await upload();
  if (uploaded.error) {
    // The folder may be full of objects the profile does not list, and
    // the sweep below only runs after a successful upload — so a folder
    // in that state could never be emptied through the app.
    await sweepOrphans(userId, current);
    uploaded = await upload();
  }
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
  await sweepOrphans(userId, photos);
  return photos;
}

/**
 * An object older than this, that the profile does not list, is not an
 * upload in progress.
 */
const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Sweeping starts only once a folder is drifting toward the cap. Deleting
 * an unlisted object is destructive — a second device may have listed it
 * in a write this one has not seen — so a folder holding a normal handful
 * of photos is left alone entirely.
 *
 * The age cutoff means a folder filled to the cap with objects younger
 * than a day cannot be swept: adding a photo stays refused until they age
 * out. That is the narrow residue of a folder that could not be emptied
 * at all, and it is bounded and self-inflicted.
 */
const SWEEP_THRESHOLD = 50;

/**
 * Delete objects in the caller's folder that the profile does not list.
 * They come from an upload whose profile update failed, or a removal whose
 * storage delete did. Nothing shows them, but the folder is capped, and a
 * folder full of invisible files would eventually refuse every new photo.
 */
async function sweepOrphans(
  userId: string,
  keep: readonly string[],
): Promise<void> {
  const listed = await supabase.storage
    .from(BUCKET)
    .list(userId, { limit: 200 });
  if (listed.error || !listed.data) return;
  if (listed.data.length < SWEEP_THRESHOLD) return;
  const cutoff = Date.now() - ORPHAN_AGE_MS;
  const stale = listed.data
    .filter((entry) => entry.id !== null)
    .filter((entry) => !keep.includes(`${userId}/${entry.name}`))
    .filter((entry) => {
      // A listing without a timestamp is not old enough to judge.
      const created = entry.created_at;
      return created !== null && Date.parse(created) < cutoff;
    })
    .map((entry) => `${userId}/${entry.name}`);
  if (stale.length > 0) await supabase.storage.from(BUCKET).remove(stale);
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
  await sweepOrphans(userId, photos);
  return photos;
}

export const MAX_BIO_LENGTH = 300;

/**
 * What "Kaydet" persists: the photo order and the bio, in ONE update.
 *
 * The order is the whole list written back as a permutation of the set
 * the row already holds. `profiles_check_photos` (latest definition in
 * `20260909000005_photo_delete_fixes.sql`) checks count, owner folder and
 * storage existence only for paths not already in `old.photos`, so a
 * reorder of the same set passes without touching storage. Adding and
 * removing are not part of this call on purpose: a path can only be
 * listed once its object exists, so those write at once (`addPhoto`,
 * `removePhoto`) and this call carries whatever order they left.
 */
export async function saveProfileEdits(
  userId: string,
  edits: { readonly photos: readonly string[]; readonly bio: string },
): Promise<boolean> {
  const bio = edits.bio.trim();
  if (bio.length > MAX_BIO_LENGTH) return false;
  if (edits.photos.length > MAX_PHOTOS) return false;
  const { error } = await supabase
    .from('profiles')
    .update({ photos: [...edits.photos], bio: bio.length > 0 ? bio : null })
    .eq('id', userId);
  return !error;
}
