import { natalReading } from '@juno/astro';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Popup } from '@/components/Popup';
import { ProfileView } from '@/components/ProfileView';
import {
  SettingsPanel,
  settingsTitle,
  type SettingsView,
} from '@/components/SettingsPanel';
import { SlidersIcon } from '@/components/SlidersIcon';
import { useScreenName } from '@/lib/a11y';
import {
  Body,
  LinkText,
  PHOTO_SCREEN_FRACTION,
  SCREEN_PADDING,
  Screen,
} from '@/components/ui';
import { ageOn } from '@/lib/age';
import { movePhoto } from '@/lib/photo-order';
import {
  addPhoto,
  pickPhoto,
  removePhoto,
  saveProfileEdits,
  usePhotoSources,
} from '@/lib/photos';
import { fetchOwnProfile, type ProfileState } from '@/lib/profile';
import { RedirectToSignIn, useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { color, radius, space, type } from '@/theme/tokens';

/** Stable identity: a new [] on every render would refetch for ever. */
const EMPTY: readonly string[] = [];

/**
 * Your own page, laid out exactly as another person's is (`ProfileView`),
 * plus one pill beside the settings control: "Düzenle" opens the edit
 * mode, where it reads "Kaydet" and one update persists the photo order
 * and the bio. Adding and removing a photo write at once — the trigger
 * needs the object to exist before the profile may list it — so the
 * draft is only the order and the text (owner default, 2026-09-11: no
 * Vazgeç).
 */
export default function Profile() {
  useScreenName(t.tabs.profile);
  const insets = useSafeAreaInsets();
  // The same height the deck's photo reaches, so the two line up.
  const { height: windowHeight } = useWindowDimensions();
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const [state, setState] = useState<ProfileState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // The list on screen. Starts as the row's, then follows every add,
  // remove and move; a move is a draft until "Kaydet".
  const [photos, setPhotos] = useState<readonly string[]>(EMPTY);
  const sources = usePhotoSources(photos);
  const [bio, setBio] = useState('');
  const [editing, setEditing] = useState(false);
  // Settings is a popup over the profile, not a page (owner, 2026-09-15).
  const [showSettings, setShowSettings] = useState(false);
  // Which part of settings the sheet shows; every opening starts at the list.
  const [settingsView, setSettingsView] = useState<SettingsView>('menu');
  // What to do once the sheet is fully gone — the trip to sign-in after a
  // sign-out or a deleted account. Queued rather than run, see Popup's
  // `onDismissed`.
  const afterSettings = useRef<(() => void) | null>(null);
  const closeSettingsThen = (next: () => void) => {
    afterSettings.current = next;
    setShowSettings(false);
  };
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A ref, not the rendered state: two taps in one frame both read the
  // old value and would start two writes.
  const working = useRef(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void fetchOwnProfile(userId).then((next) => {
      if (cancelled) return;
      if (next.status === 'missing') {
        router.replace('/onboarding');
        return;
      }
      setState(next);
      if (next.status === 'ready') {
        setPhotos(next.profile.photos);
        setBio(next.profile.bio ?? '');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  // Interpretation is computed by the engine; the screen only renders it.
  const reading = useMemo(
    () => (state.status === 'ready' ? natalReading(state.profile.chart) : null),
    [state],
  );

  if (session.status === 'signed-out') return <RedirectToSignIn />;

  const add = () => {
    if (!userId || working.current) return;
    working.current = true;
    setAdding(true);
    setError(null);
    void pickPhoto()
      .then(async (file) => {
        if (!file) return;
        const next = await addPhoto(userId, photos, file);
        if (next === null) setError(t.profile.photoFailed);
        else setPhotos(next);
      })
      .finally(() => {
        working.current = false;
        setAdding(false);
      });
  };

  const remove = (index: number) => {
    const path = photos[index];
    if (!userId || working.current || path === undefined) return;
    working.current = true;
    setError(null);
    void removePhoto(userId, photos, path).then((next) => {
      working.current = false;
      if (next === null) setError(t.profile.failed);
      else setPhotos(next);
    });
  };

  const move = (index: number, direction: 'left' | 'right') => {
    // Gated like every other edit: a move during an in-flight save would
    // show an order the save did not write, and one during an upload is
    // undone when the upload's own list lands.
    if (working.current) return;
    setPhotos((list) => movePhoto(list, index, direction));
  };

  // One control, two meanings: it opens the edit mode, then saves it.
  const toggle = () => {
    if (!userId || working.current) return;
    if (!editing) {
      setError(null);
      setEditing(true);
      return;
    }
    working.current = true;
    setSaving(true);
    setError(null);
    void saveProfileEdits(userId, { photos, bio }).then((ok) => {
      working.current = false;
      setSaving(false);
      if (!ok) {
        // Stay in the edit mode: the draft is still on screen to retry.
        setError(t.profile.failed);
        return;
      }
      setBio(bio.trim());
      setEditing(false);
    });
  };

  const pillLabel = saving
    ? t.profile.saving
    : editing
      ? t.profile.save
      : t.profile.edit;

  return (
    <Screen bleed testID="profile-screen">
      {/* Out of the flow, and still first in document order: the photo has
          to be the first in-flow child to take the top edge (owner,
          2026-09-14 — "duzenle ve ayarlar resmin ustunde olsun"), while a
          screen reader should still meet the controls before the whole
          profile. `box-none` so only the two buttons take a touch; the
          photo's carousel swipes underneath.
          Always rendered, even before the row arrives: settings is the
          only way out when the fetch fails. */}
      <View
        style={[styles.overlay, { top: Math.max(insets.top, space.xl) }]}
        pointerEvents="box-none"
      >
        <View style={styles.controls}>
          {state.status === 'ready' ? (
            <Pressable
              testID="edit-profile"
              accessibilityRole="button"
              // Not during an upload either: the tap would be swallowed
              // by the working gate and read as a broken button.
              disabled={saving || adding}
              onPress={toggle}
              style={({ pressed }) => [
                styles.pill,
                editing && styles.pillOn,
                (pressed || saving || adding) && styles.dim,
              ]}
            >
              <Text style={[styles.pillText, editing && styles.pillTextOn]}>
                {pillLabel}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            testID="open-settings"
            accessibilityRole="button"
            // The child is an <Svg> of paths, which announces nothing, and
            // this is the only route into Settings.
            accessibilityLabel={t.settings.title}
            hitSlop={12}
            onPress={() => {
              setSettingsView('menu');
              setShowSettings(true);
            }}
            // A chip, because the icon now sits on a photograph: three bare
            // strokes over a picture are not a control.
            style={({ pressed }) => [styles.iconChip, pressed && styles.dim]}
          >
            <SlidersIcon />
          </Pressable>
        </View>
        {/* Under the control that caused it. In the flow it would push the
          photo down, which is the one thing this screen may not do. */}
        {error ? (
          <Text style={styles.error} testID="profile-error">
            {error}
          </Text>
        ) : null}
      </View>

      {state.status === 'error' ? (
        <View style={styles.center}>
          <Body muted>{t.errors.generic}</Body>
          <Pressable
            testID="retry"
            onPress={() => {
              setState({ status: 'loading' });
              setAttempt((n) => n + 1);
            }}
          >
            <LinkText>{t.common.retry}</LinkText>
          </Pressable>
        </View>
      ) : state.status !== 'ready' || !reading ? (
        <View style={styles.center}>
          <ActivityIndicator color={color.textMuted} />
        </View>
      ) : (
        <ProfileView
          name={state.profile.display_name}
          age={ageOn(state.profile.birth_date)}
          photos={photos}
          sources={sources}
          three={state.profile.big_three}
          bio={bio.length > 0 ? bio : null}
          reading={reading}
          chart={state.profile.chart}
          photoHeight={Math.round(windowHeight * PHOTO_SCREEN_FRACTION)}
          fullChartLabel={t.chart.fullChart}
          fullChartTitle={t.chart.title}
          edit={{
            active: editing,
            bio,
            onBioChange: setBio,
            onMove: move,
            onRemove: remove,
            onAdd: add,
            adding,
            busy: saving || adding,
          }}
        />
      )}
      <Popup
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        onDismissed={() => {
          const next = afterSettings.current;
          afterSettings.current = null;
          next?.();
        }}
        title={settingsTitle(settingsView)}
        contentKey={settingsView}
        testID="settings-popup"
      >
        <SettingsPanel
          view={settingsView}
          onView={setSettingsView}
          onLeave={closeSettingsThen}
        />
      </Popup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Absolute offsets are measured from the content container's border
  // box, so the gutter has to be repeated here for the settings icon to
  // line up with the cards below.
  overlay: {
    position: 'absolute',
    left: SCREEN_PADDING,
    right: SCREEN_PADDING,
    zIndex: 1,
    alignItems: 'flex-end',
    gap: space.sm,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  // 36pt: `type.bodySmall` at lineHeight 20 inside 7pt of padding and a
  // 1pt border, the same box the pill beside it makes.
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceSoft,
    paddingVertical: 7,
    paddingHorizontal: space.lg,
  },
  pillOn: { backgroundColor: color.cool, borderColor: color.cool },
  pillText: { ...type.bodySmall, color: color.text, fontWeight: '600' },
  pillTextOn: { color: color.onBright },
  dim: { opacity: 0.6 },
  error: {
    ...type.bodySmall,
    color: color.danger,
    backgroundColor: color.dangerSurface,
    borderRadius: radius.pill,
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
    textAlign: 'right',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    paddingVertical: space.xxl,
  },
});
