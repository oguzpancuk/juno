import { synastryReading } from '@juno/astro';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { BandRing } from '@/components/BandRing';
import { CosmicGround } from '@/components/CosmicGround';
import { GradientButton, Halo, OutlineButton, goBack } from '@/components/ui';
import { useBottomGap } from '@/lib/insets';
import { fetchMatch, type MatchProfileRow } from '@/lib/matches';
import { usePhotoSources } from '@/lib/photos';
import { fetchOwnProfile, type OwnProfile } from '@/lib/profile';
import { matchDetailHref } from '@/lib/routes';
import { RedirectToSignIn, useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { color, space, type } from '@/theme/tokens';

/**
 * The moment a match lands (sheet frame 09): the two of you in rings on
 * the night sky, the band, one line, and the way to the connection. It
 * is a door, not a page — everything it says is said again, in full, on
 * the chat's Uyum page it opens — so it loads only what it draws: both
 * first photos and the two charts for the band.
 *
 * Keyed by match id like the chat: a second match arriving while this
 * is up must remount, not swap its params under an open screen.
 */
export default function MatchArrivedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MatchArrived key={typeof id === 'string' ? id : 'none'} id={id} />;
}

const AVATAR = 104;
const RING = AVATAR + 12;

function MatchArrived({ id }: { id: string | undefined }) {
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const [row, setRow] = useState<MatchProfileRow | null>(null);
  const [me, setMe] = useState<OwnProfile | null>(null);
  const [failed, setFailed] = useState(false);
  const bottomGap = useBottomGap(space.xl);

  useEffect(() => {
    if (!userId || id === undefined) return;
    let cancelled = false;
    void Promise.all([fetchMatch(id), fetchOwnProfile(userId)]).then(
      ([match, own]) => {
        if (cancelled) return;
        if (match === null || own.status !== 'ready') {
          setFailed(true);
          return;
        }
        setRow(match);
        setMe(own.profile);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId, id]);

  // Two one-item lists rather than one two-item list: the hook aligns
  // sources with paths by index, and a missing first photo on either
  // side would otherwise shift the other's onto the wrong face.
  const minePath = me?.photos[0];
  const theirPath = row?.photos[0];
  const mine = usePhotoSources(minePath === undefined ? [] : [minePath]);
  const theirs = usePhotoSources(theirPath === undefined ? [] : [theirPath]);

  const reading = useMemo(
    () => (me && row ? synastryReading(me.chart, row.chart, 1) : null),
    [me, row],
  );

  if (session.status === 'signed-out') return <RedirectToSignIn />;

  const see = () => {
    if (id === undefined) return;
    // Replace, not push: the door closes behind you, and back from the
    // chat is the matches list, not this screen again.
    router.replace(matchDetailHref(id));
  };

  return (
    <View style={styles.screen} testID="match-arrived">
      {/* Stars and the horizon; the planet's limb ran behind the rings. */}
      <CosmicGround planet={false} />
      {row === null || me === null || reading === null ? (
        <View style={styles.centre}>
          {failed ? (
            <>
              <Text style={styles.subtitle}>{t.errors.generic}</Text>
              <OutlineButton
                label={t.match.arrived.notNow}
                onPress={() => goBack('/matches')}
              />
            </>
          ) : (
            <ActivityIndicator color={color.textMuted} />
          )}
        </View>
      ) : (
        <>
          <View style={styles.centre}>
            <View style={styles.pair} testID="match-pair">
              <Halo size={RING}>
                <Avatar
                  name={me.display_name}
                  source={mine[0] ?? null}
                  size={AVATAR}
                />
              </Halo>
              <View style={styles.overlap}>
                <Halo size={RING}>
                  <Avatar
                    name={row.display_name}
                    source={theirs[0] ?? null}
                    size={AVATAR}
                    testID="match-their-avatar"
                  />
                </Halo>
              </View>
            </View>
            <Text style={styles.title}>{t.match.arrived.title}</Text>
            <Text style={styles.subtitle}>
              {t.match.arrived.subtitle(row.display_name)}
            </Text>
            <View style={styles.band}>
              <BandRing
                band={reading.band}
                label={`${reading.bandName} ${t.discover.scoreLabel}`}
                size={64}
                stroke={5}
              />
              <View>
                <Text style={styles.bandName} testID="band">
                  {reading.bandName}
                </Text>
                <Text style={styles.bandLabel}>{t.discover.scoreLabel}</Text>
              </View>
            </View>
            <Text style={styles.bandText}>{reading.bandText}</Text>
          </View>
          <View style={[styles.actions, { paddingBottom: bottomGap }]}>
            <GradientButton
              testID="match-see"
              label={t.match.arrived.see}
              onPress={see}
            />
            <OutlineButton
              testID="match-not-now"
              label={t.match.arrived.notNow}
              onPress={() => goBack('/matches')}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    gap: space.md,
  },
  pair: { flexDirection: 'row', alignItems: 'center', marginBottom: space.lg },
  // The second ring over the first, the way the sheet lays the two.
  overlap: { marginLeft: -space.lg },
  title: { ...type.display, color: color.text, textAlign: 'center' },
  subtitle: { ...type.body, color: color.textMuted, textAlign: 'center' },
  band: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.md,
  },
  bandName: { ...type.title, color: color.text },
  bandLabel: { ...type.label, color: color.textFaint },
  bandText: {
    ...type.body,
    color: color.textMuted,
    textAlign: 'center',
    marginTop: space.sm,
  },
  actions: { paddingHorizontal: space.xl, gap: space.sm },
});
