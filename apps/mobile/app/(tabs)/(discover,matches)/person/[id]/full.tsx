import {
  BODY_GLYPH,
  PLANET_TR,
  SIGN_GLYPH,
  SIGN_TR,
  aspectGlyphs,
  formatDegree,
  natalAspectTitleTr,
  natalReading,
} from '@juno/astro';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ChartWheel } from '@/components/ChartWheel';
import { BackLink, Body, Card, Screen, SectionLabel } from '@/components/ui';
import { fetchPerson, type PersonState } from '@/lib/person';
import { t } from '@/lib/strings';
import { color, radius, space, type } from '@/theme/tokens';

type Tab = 'planets' | 'houses';

/**
 * The whole chart: the wheel, then every planet with its sign, degree and
 * house, then the aspects. Two tabs because the same ten placements answer
 * two different questions — what sign a planet is in, and what house.
 */
export default function TheirFullChartScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <FullChart key={typeof id === 'string' ? id : 'none'} id={id} />;
}

function FullChart({ id }: { id: string | string[] | undefined }) {
  const [state, setState] = useState<PersonState>(
    typeof id === 'string' ? { status: 'loading' } : { status: 'error' },
  );
  const [tab, setTab] = useState<Tab>('planets');

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
        <BackLink label={t.person.back} fallback="/discover" />
      </View>
    );
  }

  const { person } = state;
  const chart = person.chart;

  return (
    <Screen testID="their-full-chart-screen">
      <BackLink
        label={t.person.backToChart}
        fallback={`/person/${person.id}/chart`}
      />
      <Text style={styles.title}>
        {t.person.fullTitle(person.display_name)}
      </Text>

      <View style={styles.wheelWrap} testID="chart-wheel">
        {/* The same aspects as the cards below, so a line on the wheel
            always has a card to explain it. */}
        <ChartWheel
          chart={chart}
          aspects={reading.aspects.map((a) => a.aspect)}
          size={320}
        />
      </View>

      <View style={styles.tabs}>
        {(['planets', 'houses'] as const).map((option) => (
          <Pressable
            key={option}
            testID={`tab-${option}`}
            style={[styles.tab, tab === option && styles.tabOn]}
            onPress={() => setTab(option)}
          >
            <Text style={[styles.tabText, tab === option && styles.tabTextOn]}>
              {t.person.tabs[option]}
            </Text>
          </Pressable>
        ))}
      </View>

      {reading.planets.map(({ planet, signText, houseText }) => {
        const placement = chart.planets[planet];
        return (
          <Card key={planet} testID={`full-${planet}`}>
            <View style={styles.rowBetween}>
              <Text style={styles.planetName}>
                {BODY_GLYPH[planet]} {PLANET_TR[planet]}
              </Text>
              <Text style={styles.planetPos}>
                {tab === 'planets'
                  ? `${SIGN_GLYPH[placement.sign]} ${SIGN_TR[placement.sign]} ${formatDegree(placement.degree)}`
                  : `${placement.house}. ${t.chart.house}`}
                {placement.retrograde ? ` ${t.chart.retrograde}` : ''}
              </Text>
            </View>
            <Body small>{tab === 'planets' ? signText : houseText}</Body>
          </Card>
        );
      })}

      <SectionLabel>{t.chart.aspects}</SectionLabel>
      {reading.aspects.length === 0 ? (
        <Body muted>{t.chart.noAspects}</Body>
      ) : (
        reading.aspects.map(({ aspect, text }) => (
          <Card key={`${aspect.planetA}-${aspect.aspect}-${aspect.planetB}`}>
            <Text style={styles.aspectGlyphs}>{aspectGlyphs(aspect)}</Text>
            <Text style={styles.planetName}>
              {natalAspectTitleTr(aspect)}
              <Text style={styles.orb}>
                {' '}
                · {t.chart.orb(formatDegree(aspect.orb))}
              </Text>
            </Text>
            <Body small>{text}</Body>
          </Card>
        ))
      )}
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
  title: { ...type.display, color: color.text, marginBottom: space.sm },
  wheelWrap: { alignItems: 'center', paddingVertical: space.lg },
  tabs: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: space.md,
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surfaceSoft,
  },
  tabOn: { backgroundColor: color.cool, borderColor: color.cool },
  tabText: { ...type.body, color: color.text },
  tabTextOn: { color: color.onBright, fontWeight: '600' },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  planetName: { ...type.body, color: color.text, fontWeight: '600' },
  planetPos: {
    ...type.bodySmall,
    color: color.textMuted,
    textAlign: 'right',
    flexShrink: 1,
  },
  aspectGlyphs: { fontSize: 17, color: color.pink, letterSpacing: 2 },
  orb: { ...type.caption, color: color.textFaint, fontWeight: '400' },
  link: { ...type.body, color: color.textMuted, paddingVertical: space.md },
});
