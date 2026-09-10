import { Link, Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MAX_BIO_LENGTH,
  MAX_PHOTOS,
  addPhoto,
  pickPhoto,
  removePhoto,
  saveBio,
  usePhotoSources,
} from '@/lib/photos';
import { fetchOwnProfile } from '@/lib/profile';
import { useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { color } from '@/theme/tokens';

/** Stable identity: a new [] on every render would refetch for ever. */
const EMPTY: readonly string[] = [];

export default function Profile() {
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const insets = useSafeAreaInsets();
  const [photos, setPhotos] = useState<string[] | null>(null);
  // Aligned with `photos` by index, always the same length: null while a
  // set is being fetched and where a photo cannot be shown, so a missing
  // one never shifts the rest and a removed one never lingers in the
  // wrong tile.
  const sources = usePhotoSources(photos ?? EMPTY);
  const [bio, setBio] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void fetchOwnProfile(userId).then((state) => {
      if (cancelled || state.status !== 'ready') return;
      setPhotos(state.profile.photos);
      setBio(state.profile.bio ?? '');
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (session.status === 'signed-out') return <Redirect href="/sign-in" />;

  const add = () => {
    if (!userId || working.current || photos === null) return;
    working.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    void pickPhoto()
      .then(async (file) => {
        if (!file) return;
        const next = await addPhoto(userId, photos, file);
        if (next === null) setError(t.profile.photoFailed);
        else setPhotos(next);
      })
      .finally(() => {
        working.current = false;
        setBusy(false);
      });
  };

  const drop = (path: string) => {
    if (!userId || working.current || photos === null) return;
    working.current = true;
    void removePhoto(userId, photos, path).then((next) => {
      working.current = false;
      if (next === null) setError(t.profile.failed);
      else setPhotos(next);
    });
  };

  const store = () => {
    if (!userId || working.current) return;
    working.current = true;
    setError(null);
    void saveBio(userId, bio).then((ok) => {
      working.current = false;
      if (ok) setNotice(t.profile.saved);
      else setError(t.profile.failed);
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 32 },
      ]}
      testID="profile-screen"
    >
      <Link href="/settings" style={styles.back}>
        {t.profile.back}
      </Link>
      <Text style={styles.title}>{t.profile.title}</Text>

      <Text style={styles.label}>{t.profile.photos}</Text>
      <Text style={styles.hint}>{t.profile.photosHint(MAX_PHOTOS)}</Text>
      {photos === null ? (
        <ActivityIndicator color={color.textMuted} />
      ) : (
        <>
          {photos.length === 0 ? (
            <Text style={styles.hint}>{t.profile.noPhotos}</Text>
          ) : null}
          <View style={styles.grid}>
            {photos.map((path, index) => (
              <View key={path} style={styles.tile}>
                {sources[index] ? (
                  <Image
                    source={sources[index] ?? { uri: '' }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.photo, styles.photoEmpty]} />
                )}
                <Pressable
                  testID={`remove-photo-${index}`}
                  onPress={() => {
                    drop(path);
                  }}
                >
                  <Text style={styles.removeText}>{t.profile.remove}</Text>
                </Pressable>
              </View>
            ))}
          </View>
          {photos.length < MAX_PHOTOS ? (
            <Pressable
              testID="add-photo"
              style={[styles.button, busy && styles.buttonBusy]}
              disabled={busy}
              onPress={add}
            >
              <Text style={styles.buttonText}>
                {busy ? t.profile.adding : t.profile.addPhoto}
              </Text>
            </Pressable>
          ) : null}
        </>
      )}

      <Text style={styles.label}>{t.profile.bio}</Text>
      <TextInput
        testID="bio"
        style={styles.bio}
        value={bio}
        onChangeText={setBio}
        placeholder={t.profile.bioPlaceholder}
        placeholderTextColor={color.textFaint}
        multiline
        maxLength={MAX_BIO_LENGTH}
      />
      <Text style={styles.hint}>{t.profile.bioHint(MAX_BIO_LENGTH)}</Text>
      <Pressable testID="save-bio" style={styles.button} onPress={store}>
        <Text style={styles.buttonText}>{t.profile.save}</Text>
      </Pressable>
      {notice ? <Text style={styles.ok}>{notice}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { padding: 24, paddingTop: 64, gap: 10 },
  back: { color: color.textMuted, fontSize: 14 },
  title: { color: color.text, fontSize: 26, fontWeight: '700' },
  label: {
    color: color.textMuted,
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 16,
  },
  hint: { color: color.textFaint, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: 96, gap: 4 },
  photo: { width: 96, height: 128, borderRadius: 12 },
  photoEmpty: { backgroundColor: color.surface },
  removeText: { color: color.textMuted, fontSize: 12, textAlign: 'center' },
  button: {
    backgroundColor: color.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonBusy: { opacity: 0.6 },
  buttonText: { color: color.text, fontSize: 15, fontWeight: '600' },
  bio: {
    backgroundColor: color.surface,
    borderRadius: 14,
    padding: 14,
    minHeight: 96,
    color: color.text,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  ok: { color: color.ok, fontSize: 13 },
  error: { color: color.danger, fontSize: 13 },
});
