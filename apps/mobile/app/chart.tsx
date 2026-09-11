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
import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BackLink,
  Body,
  Card,
  Display,
  LinkText,
  Screen,
  SectionLabel,
} from '@/components/ui';
import { fetchOwnProfile, type ProfileState } from '@/lib/profile';
import { leaveToSignIn, useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { supabase } from '@/lib/supabase';
import { color, radius, space, type } from '@/theme/tokens';

/** The six placements the screen leads with, in the engine's order. */
const PRIMARY_GLYPH = [
  'sun',
  'moon',
  'ascendant',
  'mercury',
  'venus',
  'mars',
] as const;

export default function ChartScreen() {
  const session = useSession();
  const [state, setState] = useState<ProfileState>({ status: 'loading' });
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const [attempt, setAttempt] = useState(0);
  const [showFull, setShowFull] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void fetchOwnProfile(userId).then((s) => {
      if (!cancelled) setState(s);
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

  if (state.status === 'error') {
    return (
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
    );
  }
  if (state.status !== 'ready' || !reading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={color.pink} />
        <Body muted>{t.common.loading}</Body>
      </View>
    );
  }

  const { profile } = state;
  const { chart, big_three: three } = profile;

  return (
    <Screen testID="chart-screen">
      <View style={styles.head}>
        <View style={styles.headText}>
          <Display>{t.chart.title}</Display>
          <Body muted>{profile.display_name}</Body>
        </View>
        <BackLink
          label={t.chart.backToProfile}
          fallback="/profile"
          testID="go-profile"
        />
      </View>
      {profile.photos.length === 0 ? (
        <Link href="/profile" style={styles.nudge} testID="add-photo-nudge">
          {t.discover.completeProfile}
        </Link>
      ) : null}

      <View style={styles.trio}>
        <Trio label={t.chart.sun} sign={three.sun} testID="badge-sun" />
        <Trio label={t.chart.moon} sign={three.moon} testID="badge-moon" />
        <Trio
          label={t.chart.rising}
          sign={three.rising}
          testID="badge-rising"
        />
      </View>

      {/* The six the screen leads with, titled by what they mean for
          dating. The astrology stays under the label, never instead. */}
      {reading.primary.map(
        ({ placement, label, technical, text, houseText, house }) => (
          <Card key={placement} testID={`primary-${placement}`}>
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
            {/* The sign says how; the house says where in a life it shows
                up. Both belong on the card — the house meant nothing while
                it was a number in a subtitle. */}
            {houseText !== null ? (
              <View style={styles.houseBlock}>
                <Text style={styles.houseLabel}>
                  {t.chart.houseMeaning(house ?? 1)}
                </Text>
                <Body small>{houseText}</Body>
              </View>
            ) : (
              // The Ascendant is the only card here without a house, and
              // saying so is better than a card that is simply shorter
              // than the other five for no visible reason.
              <View style={styles.houseBlock}>
                <Text style={styles.houseLabel}>{t.chart.housesLabel}</Text>
                <Body small>{t.chart.risingHasNoHouse}</Body>
              </View>
            )}
          </Card>
        ),
      )}

      <Pressable
        testID="toggle-full-chart"
        style={styles.disclosure}
        onPress={() => setShowFull((v) => !v)}
      >
        <Text style={styles.disclosureText}>
          {showFull ? t.chart.hideFullChart : t.chart.fullChart}
        </Text>
      </Pressable>

      {!showFull ? null : (
        <View testID="full-chart" style={styles.full}>
          <SectionLabel>{t.chart.planets}</SectionLabel>
          {reading.planets.map(
            ({ planet, signText, houseText, retrogradeText }) => {
              const p = chart.planets[planet];
              // The six above already carry their sign reading; repeating it
              // here is the duplication the disclosure exists to avoid.
              const isPrimary = (PRIMARY_GLYPH as readonly string[]).includes(
                planet,
              );
              return (
                <Card key={planet} testID={`planet-${planet}`}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.planetName}>
                      {BODY_GLYPH[planet]} {PLANET_TR[planet]}
                    </Text>
                    <Text style={styles.planetPos}>
                      {SIGN_GLYPH[p.sign]} {SIGN_TR[p.sign]}{' '}
                      {formatDegree(p.degree)} · {p.house}. {t.chart.house}
                      {p.retrograde ? ` ${t.chart.retrograde}` : ''}
                    </Text>
                  </View>
                  {isPrimary ? null : <Body>{signText}</Body>}
                  {/* Labelled here too. Unlabelled it reads as the
                      planet's own meaning — and on the six above, whose
                      sign reading is hidden as a duplicate, it is the only
                      paragraph on the card. */}
                  <View style={styles.houseBlock}>
                    <Text style={styles.houseLabel}>
                      {t.chart.houseMeaning(p.house)}
                    </Text>
                    <Body small>{houseText}</Body>
                  </View>
                  {retrogradeText ? <Body small>{retrogradeText}</Body> : null}
                </Card>
              );
            },
          )}

          <SectionLabel>{t.chart.aspects}</SectionLabel>
          {reading.aspects.length === 0 ? (
            <Body muted>{t.chart.noAspects}</Body>
          ) : (
            reading.aspects.map(({ aspect, text }) => (
              <Card
                key={`${aspect.planetA}-${aspect.aspect}-${aspect.planetB}`}
                testID={`aspect-${aspect.planetA}-${aspect.aspect}-${aspect.planetB}`}
              >
                <Text style={styles.aspectGlyphs}>{aspectGlyphs(aspect)}</Text>
                <Text style={styles.planetName}>
                  {natalAspectTitleTr(aspect)}
                  <Text style={styles.orb}>
                    {' '}
                    · {t.chart.orb(formatDegree(aspect.orb))}
                  </Text>
                </Text>
                <Body>{text}</Body>
              </Card>
            ))
          )}
        </View>
      )}

      <Pressable
        testID="sign-out"
        style={styles.signOut}
        onPress={() => {
          // Best-effort: a failed sign-out must still leave the screen,
          // and the session hook clears on the next auth event either way.
          void supabase.auth
            .signOut()
            .catch(() => undefined)
            .then(() => {
              leaveToSignIn();
            });
        }}
      >
        <Body muted>{t.chart.signOut}</Body>
      </Pressable>
    </Screen>
  );
}

function Trio({
  label,
  sign,
  testID,
}: {
  label: string;
  sign: keyof typeof SIGN_TR;
  testID: string;
}) {
  return (
    <View style={styles.trioChip} testID={testID}>
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
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.md,
  },
  headText: { flexShrink: 1 },
  nudge: { ...type.body, color: color.cool, paddingVertical: space.xs },
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
  disclosure: { marginTop: space.xl, alignItems: 'center', padding: space.md },
  disclosureText: { ...type.body, color: color.textMuted },
  full: { gap: space.md },
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
  signOut: { marginTop: space.xl, alignItems: 'center', padding: space.md },
});
