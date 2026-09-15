import { BANDS, bandName, type Band } from '@juno/astro';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Track, type TrackValues } from '@/components/Track';
import { fetchOwnProfile, ELEMENTS, type SunElement } from '@/lib/profile';
import { useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { supabase } from '@/lib/supabase';
import { nearestStop } from '@/lib/track';
import { color, radius as r, space, type } from '@/theme/tokens';

const RADIUS_OPTIONS = [5, 25, 50, 100, 500] as const;
const AGE_FLOOR = 18;
const AGE_CEILING = 99;
/** Every whole age is a stop. */
const AGE_STOPS = AGE_CEILING - AGE_FLOOR + 1;

/**
 * Who the deck is allowed to contain. Radius, gender and age are applied by
 * the `discover` view; the band and the element cannot be — the band comes
 * from a score the device computes from two charts — so those two are
 * stored here and applied after scoring.
 *
 * The body of a popup opened from the deck's top-right corner (owner,
 * 2026-09-15); it was the `/filters` screen behind Settings. Every change is
 * written as it is made, so the host only has to reload the deck when the
 * sheet closes.
 */
export function FiltersPanel() {
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;

  const [km, setKm] = useState<number | null>(null);
  const [ageMin, setAgeMin] = useState(AGE_FLOOR);
  const [ageMax, setAgeMax] = useState(AGE_CEILING);
  const [band, setBand] = useState<Band>('quiet');
  const [elements, setElements] = useState<readonly SunElement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // What a drag in progress shows, above its track and on it. Null when no
  // finger is down; the saved state above is what the database was told.
  const [radiusDrag, setRadiusDrag] = useState<number | null>(null);
  const [ageDrag, setAgeDrag] = useState<readonly [number, number] | null>(
    null,
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void fetchOwnProfile(userId).then((state) => {
      if (cancelled || state.status !== 'ready') return;
      setKm(state.profile.radius_km);
      setAgeMin(state.profile.age_min);
      setAgeMax(state.profile.age_max);
      setBand(state.profile.min_band);
      setElements(state.profile.sun_elements);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  /**
   * Optimistic: the control moves, and reverts only if the write fails.
   *
   * Only the newest write may revert. Two drags in quick succession fire
   * two writes, each closing over the value it read; an older one failing
   * would otherwise put the screen back to a number the database has since
   * moved past, leaving the two disagreeing with no error in sight.
   */
  const order = useRef(0);
  /** The sequence number of the newest write issued for each column. */
  const newest = useRef(new Map<string, number>());
  const save = async (
    // why: the columns are unrelated and each caller passes its own; the
    // shapes that matter are checked where they are built, and the server
    // has the CHECK constraints either way.
    patch: Record<string, unknown>,
    revert: () => void,
  ) => {
    if (!userId) return;
    order.current += 1;
    const mine = order.current;
    const columns = Object.keys(patch);
    for (const column of columns) newest.current.set(column, mine);
    const { error: failed } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId);
    if (!failed) {
      // Only this write's own columns are known to be good now, but the
      // banner names no column, so the honest move is to clear it and let
      // any still-failing column say so on its next attempt.
      if (columns.every((column) => newest.current.get(column) === mine))
        setError(null);
      return;
    }
    setError(t.filters.failed);
    // Per column, not per screen: a newer write to a *different* control
    // used to suppress this revert, leaving the failed control showing a
    // value the database never took.
    if (columns.every((column) => newest.current.get(column) === mine))
      revert();
  };

  const setAge = (min: number, max: number) => {
    setAgeDrag(null);
    if (min === ageMin && max === ageMax) return;
    const wasMin = ageMin;
    const wasMax = ageMax;
    setAgeMin(min);
    setAgeMax(max);
    void save({ age_min: min, age_max: max }, () => {
      setAgeMin(wasMin);
      setAgeMax(wasMax);
    });
  };

  const setRadius = (option: number) => {
    setRadiusDrag(null);
    if (option === km) return;
    const was = km;
    setKm(option);
    void save({ radius_km: option }, () => setKm(was));
  };

  const radiusStop =
    radiusDrag ?? nearestStop(km ?? RADIUS_OPTIONS[2], RADIUS_OPTIONS);
  const shownKm = RADIUS_OPTIONS[radiusStop] ?? RADIUS_OPTIONS[2];
  const ageStops: readonly [number, number] = ageDrag ?? [
    ageMin - AGE_FLOOR,
    ageMax - AGE_FLOOR,
  ];
  const kmOf = (values: TrackValues) =>
    RADIUS_OPTIONS[values[0]] ?? RADIUS_OPTIONS[2];
  const agesOf = (values: TrackValues): readonly [number, number] => [
    values[0] + AGE_FLOOR,
    (values[1] ?? values[0]) + AGE_FLOOR,
  ];

  const toggleElement = (element: SunElement) => {
    const current = elements ?? [...ELEMENTS];
    const next = current.includes(element)
      ? current.filter((e) => e !== element)
      : [...current, element];
    // Nobody means everybody: an empty selection is stored as null, which
    // is also what the column's own check demands.
    const stored =
      next.length === 0 || next.length === ELEMENTS.length ? null : next;
    const was = elements;
    setElements(stored);
    void save({ sun_elements: stored }, () => setElements(was));
  };

  const chosen = elements ?? ELEMENTS;

  return (
    <View testID="filters-screen">
      <View style={[styles.labelRow, styles.first]}>
        <Text style={styles.label}>{t.settings.radius}</Text>
        <Text style={styles.value} testID="radius-value">
          {km === null ? '' : `${shownKm} km`}
        </Text>
      </View>
      <Track
        testID="radius"
        count={RADIUS_OPTIONS.length}
        values={[radiusStop]}
        ticks
        // Until the stored radius arrives there is nothing true to show.
        disabled={km === null}
        labels={[t.settings.radius]}
        describe={(stop) => `${RADIUS_OPTIONS[stop] ?? ''} km`}
        onChange={(values) => setRadiusDrag(values[0])}
        onCommit={(values) => setRadius(kmOf(values))}
      />
      <Text style={styles.hint}>{t.settings.radiusHint}</Text>

      <View style={styles.labelRow}>
        <Text style={styles.label}>{t.filters.age}</Text>
        <Text style={styles.value} testID="age-value">
          {`${ageStops[0] + AGE_FLOOR} – ${ageStops[1] + AGE_FLOOR}`}
        </Text>
      </View>
      <Track
        testID="age"
        count={AGE_STOPS}
        values={ageStops}
        labels={[t.filters.ageMin, t.filters.ageMax]}
        describe={(stop) => String(stop + AGE_FLOOR)}
        onChange={(values) => setAgeDrag([values[0], values[1] ?? values[0]])}
        onCommit={(values) => {
          const [min, max] = agesOf(values);
          setAge(min, max);
        }}
      />
      <Text style={styles.hint}>{t.filters.ageHint}</Text>

      <Text style={[styles.label, styles.section]}>{t.filters.minBand}</Text>
      {/* One row of four (owner, 2026-09-15). The chips wrapped, because
          the lowest band's word is long; as a minimum it filters nobody
          out, so here it is called what it does. */}
      <View style={styles.segments} accessibilityRole="radiogroup">
        {BANDS.map((option, index) => {
          const label =
            index === 0 ? t.filters.anyBand : bandName(BAND_SAMPLE[index] ?? 0);
          const on = band === option;
          return (
            <Pressable
              key={option}
              testID={`band-${option}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={[styles.segment, on && styles.segmentOn]}
              onPress={() => {
                if (on) return;
                const was = band;
                setBand(option);
                void save({ min_band: option }, () => setBand(was));
              }}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={[styles.segmentText, on && styles.chipTextOn]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>{t.filters.minBandHint}</Text>

      <Text style={[styles.label, styles.section]}>{t.filters.elements}</Text>
      <View style={styles.row}>
        {ELEMENTS.map((element) => (
          <Pressable
            key={element}
            testID={`element-${element}`}
            style={[styles.chip, chosen.includes(element) && styles.chipOn]}
            onPress={() => toggleElement(element)}
          >
            <Text
              style={[
                styles.chipText,
                chosen.includes(element) && styles.chipTextOn,
              ]}
            >
              {t.filters.elementNames[element]}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>{t.filters.elementsHint}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/**
 * A score inside each band, so a segment can carry the band's real word
 * rather than a second list of names that could drift from the engine's.
 * The first is unused: that segment says "Hepsi".
 */
const BAND_SAMPLE = [0, 58, 64, 80] as const;

const styles = StyleSheet.create({
  // The sheet's title sits right above the first section.
  first: { marginTop: 0 },
  label: { ...type.label, color: color.textFaint },
  section: { marginTop: space.xl, marginBottom: space.sm },
  // The label and, across from it, the value the track below is set to.
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: space.xl,
  },
  value: { ...type.heading, color: color.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    backgroundColor: color.surfaceSoft,
    borderRadius: r.pill,
    borderWidth: 1,
    borderColor: color.border,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
  },
  chipOn: { backgroundColor: color.cool, borderColor: color.cool },
  chipText: { ...type.body, color: color.text },
  chipTextOn: { color: color.onBright, fontWeight: '600' },
  segments: {
    flexDirection: 'row',
    backgroundColor: color.surfaceSoft,
    borderRadius: r.pill,
    borderWidth: 1,
    borderColor: color.border,
    padding: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: r.pill,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
  },
  segmentOn: { backgroundColor: color.cool },
  segmentText: { ...type.body, color: color.text },
  hint: { ...type.bodySmall, color: color.textFaint, marginTop: space.sm },
  error: { ...type.body, color: color.danger, marginTop: space.lg },
});
