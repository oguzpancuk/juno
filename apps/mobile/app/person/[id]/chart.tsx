import { BODY_GLYPH, natalReading } from '@juno/astro';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Body, Card, Screen } from '@/components/ui';
import { fetchPerson, type PersonState } from '@/lib/person';
import { t } from '@/lib/strings';
import { color, radius, space, type } from '@/theme/tokens';

/**
 * Their chart, read the way the viewer's own is: six placements in product
 * language, each with what the sign says and what the house says. The same
 * engine call, the same content — nothing here knows whose chart it is.
 */
export default function TheirChartScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TheirChart key={typeof id === 'string' ? id : 'none'} id={id} />;
}

function TheirChart({ id }: { id: string | string[] | undefined }) {
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
        <Link href="/discover" style={styles.link}>
          {t.person.back}
        </Link>
      </View>
    );
  }

  const { person } = state;

  return (
    <Screen testID="their-chart-screen">
      <Link href={`/person/${person.id}`} style={styles.back}>
        {t.person.backToProfile}
      </Link>
      <Text style={styles.title}>
        {t.person.chartTitle(person.display_name)}
      </Text>

      {reading.primary.map(
        ({ placement, label, technical, text, houseText, house }) => (
          <Card key={placement} testID={`their-primary-${placement}`}>
            <View style={styles.cardHead}>
              <View style={styles.glyphBadge}>
                <Text style={styles.glyph}>{BODY_GLYPH[placement]}</Text>
              </View>
              <View style={styles.cardHeadText}>
                <Text style={styles.cardTitle}>{label}</Text>
                <Text style={styles.cardTechnical}>{technical}</Text>
              </View>
            </View>
            <Body>{text}</Body>
            {houseText === null ? null : (
              <View style={styles.houseBlock}>
                <Text style={styles.houseLabel}>
                  {t.chart.houseMeaning(house ?? 1)}
                </Text>
                <Body small>{houseText}</Body>
              </View>
            )}
          </Card>
        ),
      )}

      <Link href={`/person/${person.id}/full`} style={styles.fullLink}>
        {t.person.fullChart}
      </Link>
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
  back: { ...type.body, color: color.textMuted },
  title: { ...type.display, color: color.text, marginBottom: space.sm },
  cardHead: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  cardHeadText: { flexShrink: 1 },
  glyphBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceHigh,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontSize: 19, color: color.pink },
  cardTitle: { ...type.heading, color: color.text },
  cardTechnical: { ...type.caption, color: color.textMuted, marginTop: 2 },
  houseBlock: {
    borderTopWidth: 1,
    borderTopColor: color.border,
    paddingTop: space.md,
    marginTop: space.xs,
    gap: 2,
  },
  houseLabel: { ...type.label, color: color.textFaint },
  fullLink: {
    ...type.body,
    color: color.textMuted,
    textAlign: 'center',
    paddingVertical: space.lg,
    marginTop: space.md,
  },
  link: { ...type.body, color: color.textMuted, paddingVertical: space.md },
});
