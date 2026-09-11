import { natalReading } from '@juno/astro';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ProfileView } from '@/components/ProfileView';
import { BackLink, Body, Screen } from '@/components/ui';
import { fetchPerson, type PersonState } from '@/lib/person';
import { usePhotoSources } from '@/lib/photos';
import { matchDetailHref } from '@/lib/routes';
import { t } from '@/lib/strings';
import { color, space, type } from '@/theme/tokens';

const EMPTY: readonly string[] = [];

/**
 * Someone else, at length — laid out exactly as your own page is
 * (`ProfileView`, owner 2026-09-11: "tamamen aynı gözükmeli"), without the
 * edit control. The deck card is a glance; this is the page you open when
 * the glance was interesting: photos, the big three, what they wrote,
 * their three primary placements, and their whole chart as a popup.
 *
 * Keyed by id like the match screen, for the same reason: everything here
 * is about one person.
 */
export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PersonView key={typeof id === 'string' ? id : 'none'} id={id} />;
}

function PersonView({ id }: { id: string | string[] | undefined }) {
  const [state, setState] = useState<PersonState>(
    typeof id === 'string' ? { status: 'loading' } : { status: 'error' },
  );

  useEffect(() => {
    if (typeof id !== 'string') return;
    let cancelled = false;
    void fetchPerson(id).then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const photos = state.status === 'ready' ? state.person.photos : EMPTY;
  const sources = usePhotoSources(photos);

  // The same engine call as the owner's page; nothing here knows whose
  // chart it is.
  const reading = useMemo(
    () => (state.status === 'ready' ? natalReading(state.person.chart) : null),
    [state],
  );

  if (state.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={color.textMuted} />
      </View>
    );
  }
  if (state.status !== 'ready' || !reading) {
    return (
      <View style={styles.center}>
        <Body muted>
          {state.status === 'gone' ? t.person.gone : t.errors.generic}
        </Body>
        <BackLink label={t.person.back} fallback="/discover" />
      </View>
    );
  }

  const { person } = state;

  return (
    <Screen testID="person-screen">
      <ProfileView
        header={<BackLink label={t.person.back} fallback="/discover" />}
        name={person.display_name}
        age={person.age}
        // `match_profiles` has no distance: a match keeps its thread
        // wherever either of them moves to. The deck member's stays.
        caption={
          person.matchId === null
            ? person.distance_km === 0
              ? t.discover.under1km
              : `${person.distance_km} km`
            : undefined
        }
        photos={person.photos}
        sources={sources}
        three={person.big_three}
        bio={person.bio}
        reading={reading}
        chart={person.chart}
        fullChartLabel={t.person.fullChart}
        fullChartTitle={t.person.chartTitle(person.display_name)}
        footer={
          person.matchId === null ? null : (
            <Link
              href={matchDetailHref(person.matchId)}
              // This page has a copy in each tab; from the deck's copy the
              // matches stack may not exist yet (see INTO_MATCHES).
              withAnchor
              style={styles.link}
              testID="open-match"
            >
              {t.person.openMatch}
            </Link>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    backgroundColor: color.bg,
  },
  link: {
    ...type.body,
    color: color.textMuted,
    textAlign: 'center',
    paddingVertical: space.md,
  },
});
