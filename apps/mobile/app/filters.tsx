import { BANDS, bandName, type Band } from '@juno/astro';
import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchOwnProfile, ELEMENTS, type SunElement } from '@/lib/profile';
import { useSession } from '@/lib/session';
import { BackLink } from '@/components/ui';
import { t } from '@/lib/strings';
import { supabase } from '@/lib/supabase';
import { color, radius as r, space, type } from '@/theme/tokens';

const RADIUS_OPTIONS = [5, 25, 50, 100, 500] as const;
const AGE_FLOOR = 18;
const AGE_CEILING = 99;

/**
 * Who the deck is allowed to contain. Radius, gender and age are applied by
 * the `discover` view; the band and the element cannot be — the band comes
 * from a score the device computes from two charts — so those two are
 * stored here and applied after scoring.
 */
export default function FiltersScreen() {
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;

  const [km, setKm] = useState<number | null>(null);
  const [ageMin, setAgeMin] = useState(AGE_FLOOR);
  const [ageMax, setAgeMax] = useState(AGE_CEILING);
  const [band, setBand] = useState<Band>('quiet');
  const [elements, setElements] = useState<readonly SunElement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
   * Only the newest write may revert. Holding a stepper fires one write
   * per tap, each closing over the value it read; an older one failing
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
    const wasMin = ageMin;
    const wasMax = ageMax;
    setAgeMin(min);
    setAgeMax(max);
    void save({ age_min: min, age_max: max }, () => {
      setAgeMin(wasMin);
      setAgeMax(wasMax);
    });
  };

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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      testID="filters-screen"
    >
      <BackLink label={t.filters.back} fallback="/discover" />
      <Text style={styles.title}>{t.filters.title}</Text>

      <Text style={styles.label}>{t.settings.radius}</Text>
      <View style={styles.row}>
        {RADIUS_OPTIONS.map((option) => (
          <Pressable
            key={option}
            testID={`radius-${option}`}
            style={[styles.chip, km === option && styles.chipOn]}
            onPress={() => {
              const was = km;
              setKm(option);
              void save({ radius_km: option }, () => setKm(was));
            }}
          >
            <Text style={[styles.chipText, km === option && styles.chipTextOn]}>
              {option} km
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>{t.settings.radiusHint}</Text>

      <Text style={styles.label}>{t.filters.age}</Text>
      <View style={styles.ageRow}>
        <Stepper
          testID="age-min"
          value={ageMin}
          onChange={(v) => setAge(Math.min(v, ageMax), ageMax)}
          min={AGE_FLOOR}
          max={ageMax}
        />
        <Text style={styles.ageDash}>—</Text>
        <Stepper
          testID="age-max"
          value={ageMax}
          onChange={(v) => setAge(ageMin, Math.max(v, ageMin))}
          min={ageMin}
          max={AGE_CEILING}
        />
      </View>
      <Text style={styles.hint}>{t.filters.ageHint}</Text>

      <Text style={styles.label}>{t.filters.minBand}</Text>
      <View style={styles.row}>
        {BANDS.map((option, index) => {
          // The band's own word, taken from the cut it starts at, so this
          // screen never invents a label the match screen does not use.
          const label = bandName(BAND_SAMPLE[index] ?? 0);
          return (
            <Pressable
              key={option}
              testID={`band-${option}`}
              style={[styles.chip, band === option && styles.chipOn]}
              onPress={() => {
                const was = band;
                setBand(option);
                void save({ min_band: option }, () => setBand(was));
              }}
            >
              <Text
                style={[styles.chipText, band === option && styles.chipTextOn]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>{t.filters.minBandHint}</Text>

      <Text style={styles.label}>{t.filters.elements}</Text>
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
    </ScrollView>
  );
}

/**
 * A score inside each band, so the chip can carry the band's real word
 * rather than a second list of names that could drift from the engine's.
 */
const BAND_SAMPLE = [0, 58, 64, 80] as const;

function Stepper({
  value,
  onChange,
  min,
  max,
  testID,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  testID: string;
}) {
  return (
    <View style={styles.stepper} testID={testID}>
      <Pressable
        testID={`${testID}-down`}
        disabled={value <= min}
        onPress={() => onChange(value - 1)}
        style={styles.stepButton}
      >
        <Text style={[styles.stepGlyph, value <= min && styles.stepOff]}>
          −
        </Text>
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable
        testID={`${testID}-up`}
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
        style={styles.stepButton}
      >
        <Text style={[styles.stepGlyph, value >= max && styles.stepOff]}>
          +
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { padding: space.xl, paddingTop: 68, paddingBottom: 56 },
  title: { ...type.display, color: color.text, marginBottom: space.sm },
  label: {
    ...type.label,
    color: color.textFaint,
    marginTop: space.xl,
    marginBottom: space.sm,
  },
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
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  ageDash: { ...type.body, color: color.textFaint },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.surfaceSoft,
    borderRadius: r.pill,
    borderWidth: 1,
    borderColor: color.border,
  },
  stepButton: { paddingVertical: space.sm, paddingHorizontal: space.lg },
  stepGlyph: { ...type.heading, color: color.text },
  stepOff: { color: color.textFaint },
  stepValue: {
    ...type.heading,
    color: color.text,
    minWidth: 34,
    textAlign: 'center',
  },
  hint: { ...type.bodySmall, color: color.textFaint, marginTop: space.sm },
  error: { ...type.body, color: color.danger, marginTop: space.lg },
});
