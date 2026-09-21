import { BANDS, bandName, type Band } from '@juno/astro';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Track, type TrackValues } from '@/components/Track';
import { Chip, LinkText } from '@/components/ui';
import { SORT_ORDERS, type SortBy } from '@/lib/premium-rules';
import { fetchOwnProfile, ELEMENTS, type SunElement } from '@/lib/profile';
import { useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { READ_TIMEOUT_MS, supabase } from '@/lib/supabase';
import { PendingWrites } from '@/lib/pending-writes';
import { nearestStop, optionToWrite } from '@/lib/track';
import { color, font, radius as r, space, type } from '@/theme/tokens';

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
export function FiltersPanel({ onPremium }: { onPremium?: () => void }) {
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;

  const [km, setKm] = useState<number | null>(null);
  const [ageMin, setAgeMin] = useState(AGE_FLOOR);
  const [ageMax, setAgeMax] = useState(AGE_CEILING);
  const [band, setBand] = useState<Band>('quiet');
  const [elements, setElements] = useState<readonly SunElement[] | null>(null);
  // The deck's order, and whether this member may choose it. Distance is
  // what a free deck comes in; compatibility is the membership's.
  const [sortBy, setSort] = useState<SortBy>('distance');
  const [premium, setPremium] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // What a drag in progress shows, above its track and on it. Null when no
  // finger is down; the saved state above is what the database was told.
  const [radiusDrag, setRadiusDrag] = useState<number | null>(null);
  const [ageDrag, setAgeDrag] = useState<readonly [number, number] | null>(
    null,
  );
  // Nothing is live, and nothing looks saved, until the stored row is in.
  // A failed read used to leave age, band and elements answering on their
  // defaults, ready to write those over what was stored (review,
  // 2026-09-15); it now says so and offers a retry.
  const [load, setLoad] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [attempt, setAttempt] = useState(0);
  const ready = load === 'ready';

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    // After any write a previous opening left unanswered, so a sheet
    // reopened at once shows what was just set.
    void filterWritesAnswered()
      .then(() => fetchOwnProfile(userId))
      .then((state) => {
        if (cancelled) return;
        if (state.status !== 'ready') {
          setLoad('failed');
          return;
        }
        setKm(state.profile.radius_km);
        // The column allows up to 120; the track ends at 99. A larger
        // stored bound shows at the end and is only rewritten when a thumb
        // really moves.
        setAgeMin(Math.min(state.profile.age_min, AGE_CEILING));
        setAgeMax(Math.min(state.profile.age_max, AGE_CEILING));
        setBand(state.profile.min_band);
        setElements(state.profile.sun_elements);
        setSort(state.profile.sort_by);
        setPremium(state.profile.is_premium);
        setLoad('ready');
      });
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

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
    if (!userId || !ready) return;
    order.current += 1;
    const mine = order.current;
    const columns = Object.keys(patch);
    for (const column of columns) newest.current.set(column, mine);
    // `.then` once, here: every `then` on a query builder sends it again.
    // The signal gives the request itself a deadline; the tracker's own
    // deadline covers the time before it is sent, which a token refresh
    // can stretch.
    const { error: failed, status } = await filterWrites.track(
      supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId)
        .abortSignal(AbortSignal.timeout(READ_TIMEOUT_MS))
        .then((result) => result),
      READ_TIMEOUT_MS,
    );
    // Per column, not per screen: a newer write to a *different* control
    // used to suppress a revert, leaving the failed control showing a
    // value the database never took.
    const newestForAll = columns.every(
      (column) => newest.current.get(column) === mine,
    );
    if (!failed) {
      // Only this write's own columns are known to be good now, but the
      // banner names no column, so the honest move is to clear it and let
      // any still-failing column say so on its next attempt.
      if (newestForAll) setError(null);
      return;
    }
    if (status === 0) {
      // No answer at all — timed out or cut off. The write may have landed
      // anyway, even after a newer one did, so neither the control's value
      // nor a revert can be trusted: read the row back and show what is
      // stored, newest write or not. The read waits for any write still in
      // flight, and the banner says only what is about to be true (third
      // review, 2026-09-16: it used to claim a reload that an older write
      // never triggered).
      setError(t.filters.unanswered);
      setLoad('loading');
      setAttempt((n) => n + 1);
      return;
    }
    setError(t.filters.failed);
    if (newestForAll) revert();
  };

  const setAge = (min: number, max: number) => {
    setAgeDrag(null);
    // Let go while the row is being read back: the reload is about to show
    // what is stored, so the thumb goes back rather than showing a value
    // nothing will save.
    if (!ready) return;
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

  const setRadius = (stop: number) => {
    setRadiusDrag(null);
    if (!ready || km === null) return;
    // Let go where the stored value shows: nothing to save, which also
    // leaves a stored radius between the options as it is.
    const option = optionToWrite(stop, km, RADIUS_OPTIONS);
    if (option === null) return;
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

  const chosen = ready ? (elements ?? ELEMENTS) : [];

  return (
    <View testID="filters-screen">
      <View style={[styles.labelRow, styles.first]}>
        <Text style={styles.label}>{t.settings.radius}</Text>
        <Text style={styles.value} testID="radius-value">
          {ready && km !== null ? `${shownKm} km` : ''}
        </Text>
      </View>
      <Track
        testID="radius"
        count={RADIUS_OPTIONS.length}
        values={[radiusStop]}
        ticks
        // Until the stored radius arrives there is nothing true to show.
        disabled={!ready}
        labels={[t.settings.radius]}
        describe={(stop) => `${RADIUS_OPTIONS[stop] ?? ''} km`}
        onChange={(values) => setRadiusDrag(values[0])}
        onCommit={(values) => setRadius(values[0])}
        onCancel={() => setRadiusDrag(null)}
      />
      <Text style={styles.hint}>{t.settings.radiusHint}</Text>

      <View style={styles.labelRow}>
        <Text style={styles.label}>{t.filters.age}</Text>
        <Text style={styles.value} testID="age-value">
          {ready
            ? `${ageStops[0] + AGE_FLOOR} – ${ageStops[1] + AGE_FLOOR}`
            : ''}
        </Text>
      </View>
      <Track
        testID="age"
        count={AGE_STOPS}
        values={ageStops}
        disabled={!ready}
        labels={[t.filters.ageMin, t.filters.ageMax]}
        describe={(stop) => String(stop + AGE_FLOOR)}
        onChange={(values) => setAgeDrag([values[0], values[1] ?? values[0]])}
        onCommit={(values) => {
          const [min, max] = agesOf(values);
          setAge(min, max);
        }}
        onCancel={() => setAgeDrag(null)}
      />
      <Text style={styles.hint}>{t.filters.ageHint}</Text>

      <Text style={[styles.label, styles.section]}>{t.filters.sort}</Text>
      {/* Two segments, the same control as the bands below. A free member
          may press "Uyum": what it opens is the membership, not an error
          — and it is the one place in the app where the order is
          explained at all. */}
      <View
        style={[styles.segments, !ready && styles.off]}
        accessibilityRole="radiogroup"
      >
        {SORT_ORDERS.map((option) => {
          const on = ready && sortBy === option;
          const locked = option === 'compatibility' && !premium;
          return (
            <Pressable
              key={option}
              testID={`sort-${option}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              disabled={!ready}
              style={[styles.segment, on && styles.segmentOn]}
              onPress={() => {
                if (locked) {
                  onPremium?.();
                  return;
                }
                if (on) return;
                const was = sortBy;
                setSort(option);
                void save({ sort_by: option }, () => setSort(was));
              }}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={[styles.segmentText, on && styles.chipTextOn]}
              >
                {option === 'compatibility'
                  ? `${t.filters.sortCompatibility}${locked ? ' ✦' : ''}`
                  : t.filters.sortDistance}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>
        {premium ? t.filters.sortHintPremium : t.filters.sortHint}
      </Text>

      <Text style={[styles.label, styles.section]}>{t.filters.minBand}</Text>
      {/* One row of four (owner, 2026-09-15). The chips wrapped, because
          the lowest band's word is long; as a minimum it filters nobody
          out, so here it is called what it does. */}
      <View
        style={[styles.segments, !ready && styles.off]}
        accessibilityRole="radiogroup"
      >
        {BANDS.map((option, index) => {
          const label =
            index === 0 ? t.filters.anyBand : bandName(BAND_SAMPLE[index] ?? 0);
          const on = ready && band === option;
          return (
            <Pressable
              key={option}
              testID={`band-${option}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              disabled={!ready}
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
      {/* One row, four equal parts (owner, 2026-09-16), like the band row
          above it. */}
      <View style={[styles.elements, !ready && styles.off]}>
        {ELEMENTS.map((element) => (
          <Chip
            key={element}
            testID={`element-${element}`}
            label={t.filters.elementNames[element]}
            selected={chosen.includes(element)}
            disabled={!ready}
            fit
            style={styles.elementChip}
            onPress={() => toggleElement(element)}
          />
        ))}
      </View>
      <Text style={styles.hint}>{t.filters.elementsHint}</Text>

      {load === 'failed' ? (
        <View>
          <Text style={styles.error}>{t.errors.generic}</Text>
          <LinkText
            testID="filters-retry"
            onPress={() => {
              setLoad('loading');
              setAttempt((n) => n + 1);
            }}
          >
            {t.common.retry}
          </LinkText>
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}
    </View>
  );
}

/**
 * Filter writes not yet answered, across openings of the sheet. The deck
 * reloads as the sheet closes and a reopened panel reads the row as it
 * mounts; both wait for these first (review, 2026-09-15). PostgREST
 * answers after the transaction commits, so once a write is answered it
 * has landed or failed. Each is bounded by the read timeout — see
 * `PendingWrites`.
 */
const filterWrites = new PendingWrites();

export function filterWritesAnswered(): Promise<void> {
  return filterWrites.answered();
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
  elements: { flexDirection: 'row', gap: space.sm },
  // Equal parts of the row, so the four fill it end to end.
  elementChip: { flex: 1, paddingHorizontal: space.xs },
  chipTextOn: { color: color.onBright, fontFamily: font.semibold },
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
  // The same dim a disabled track uses.
  off: { opacity: 0.4 },
});
