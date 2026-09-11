import { BODY_GLYPH, SIGN_GLYPH, SIGN_TR } from '@juno/astro';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BackLink, Body, Card, Screen, SectionLabel } from '@/components/ui';
import { fetchPerson, type PersonState } from '@/lib/person';
import { usePhotoSources } from '@/lib/photos';
import { t } from '@/lib/strings';
import { color, radius, space, type } from '@/theme/tokens';

const EMPTY: readonly string[] = [];

/**
 * Someone else, at length. The deck card is a glance; this is the page you
 * open when the glance was interesting — photos, what they wrote, and the
 * way into their chart.
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

  if (state.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={color.textMuted} />
      </View>
    );
  }
  if (state.status !== 'ready') {
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
  const three = person.big_three;

  return (
    <Screen testID="person-screen">
      <BackLink label={t.person.back} fallback="/discover" />

      {sources.some((source) => source !== null) ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
        >
          {sources.map((source, index) =>
            source ? (
              <Image
                key={photos[index] ?? index}
                source={source}
                style={styles.photo}
                resizeMode="cover"
              />
            ) : null,
          )}
        </ScrollView>
      ) : null}

      <Text style={styles.name}>
        {person.display_name}, {person.age}
      </Text>
      {person.matchId === null ? (
        <Text style={styles.distance}>
          {person.distance_km === 0
            ? t.discover.under1km
            : `${person.distance_km} km`}
        </Text>
      ) : null}

      <View style={styles.trio}>
        <Trio label={t.chart.sun} sign={three.sun} />
        <Trio label={t.chart.moon} sign={three.moon} />
        <Trio label={t.chart.rising} sign={three.rising} />
      </View>

      {person.bio ? (
        <Card testID="person-bio">
          <Body>{person.bio}</Body>
        </Card>
      ) : null}

      <SectionLabel>{t.person.chartLabel}</SectionLabel>
      <Link href={`/person/${person.id}/chart`} asChild>
        <Pressable testID="open-their-chart">
          <Card>
            <View style={styles.chartRow}>
              <View style={styles.glyphs}>
                <Text style={styles.glyph}>{BODY_GLYPH.sun}</Text>
                <Text style={styles.glyph}>{BODY_GLYPH.moon}</Text>
                <Text style={styles.glyph}>{BODY_GLYPH.ascendant}</Text>
              </View>
              <Text style={styles.chartCta}>
                {t.person.openChart(person.display_name)}
              </Text>
            </View>
          </Card>
        </Pressable>
      </Link>

      {person.matchId === null ? null : (
        <Link
          href={{ pathname: '/match/[id]', params: { id: person.matchId } }}
          style={styles.link}
        >
          {t.person.openMatch}
        </Link>
      )}
    </Screen>
  );
}

function Trio({ label, sign }: { label: string; sign: keyof typeof SIGN_TR }) {
  return (
    <View style={styles.trioChip}>
      <Text style={styles.trioLabel}>{label}</Text>
      <Text style={styles.trioValue}>
        {SIGN_GLYPH[sign]} {SIGN_TR[sign]}
      </Text>
    </View>
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
  strip: { gap: space.sm, paddingVertical: space.sm },
  photo: { width: 230, height: 300, borderRadius: radius.lg },
  name: { ...type.display, color: color.text, marginTop: space.sm },
  distance: { ...type.bodySmall, color: color.textMuted },
  trio: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  trioChip: {
    flex: 1,
    backgroundColor: color.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    paddingVertical: space.md,
    alignItems: 'center',
    gap: 2,
  },
  trioLabel: { ...type.caption, color: color.textFaint },
  trioValue: { ...type.body, color: color.text, fontWeight: '600' },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  glyphs: { flexDirection: 'row', gap: space.sm },
  glyph: { fontSize: 19, color: color.pink },
  chartCta: { ...type.heading, color: color.text, flexShrink: 1 },
  link: { ...type.body, color: color.textMuted, paddingVertical: space.md },
});
