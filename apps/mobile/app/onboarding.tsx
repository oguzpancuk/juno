import { isValidCalendarDate, searchCities, type City } from '@juno/geo';
import { deviceLocation } from '@/lib/location';
import { Link, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  GENDERS,
  INTERESTS,
  createProfile,
  isAtLeast18,
  type Gender,
  type Interest,
} from '@/lib/profile';
import { Calculating, STEP_MS } from '@/components/Calculating';
import { Chip, GradientButton } from '@/components/ui';
import { dbErrorText } from '@/lib/errors';
import { leaveToSignIn, useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { CosmicGround } from '@/components/CosmicGround';
import { t } from '@/lib/strings';
import { color, font, glass, space } from '@/theme/tokens';

const num = (s: string): number | null =>
  /^\d{1,4}$/.test(s) ? Number(s) : null;

/**
 * How long the calculating screen stays up at a minimum: long enough for
 * its last line of copy to appear. The chart itself takes a few hundred
 * milliseconds, and letting it flash past reads as a glitch rather than as
 * the app having done something.
 */
const MIN_VISIBLE_MS = t.calculating.steps.length * STEP_MS;

const heldFor = (started: number): Promise<void> =>
  new Promise((done) =>
    setTimeout(done, Math.max(0, MIN_VISIBLE_MS - (Date.now() - started))),
  );

export default function Onboarding() {
  const session = useSession();
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState<Gender>('woman');
  const [interestedIn, setInterestedIn] = useState<Interest>('everyone');
  const [cityQuery, setCityQuery] = useState('');
  const [city, setCity] = useState<City | null>(null);
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [busy, setBusy] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Warm the city index off the first keystroke (1 MB JSON parse + Zod).
  useEffect(() => {
    searchCities('a', 1);
  }, []);

  const cityHits = useMemo(
    () => (city ? [] : searchCities(cityQuery, 6)),
    [city, cityQuery],
  );

  // KVKK: the profile is the point at which birth data and location start
  // being processed, so consent is taken here and stored with the version
  // of the notice that was on screen.
  const [consented, setConsented] = useState(false);

  const submit = async () => {
    setError(null);
    const name = displayName.trim();
    if (name.length === 0 || name.length > 40)
      return setError(t.onboarding.errors.name);
    if (!city) return setError(t.onboarding.errors.city);
    const [d, m, y, h, mi] = [
      num(day),
      num(month),
      num(year),
      num(hour),
      num(minute),
    ];
    if (
      d === null ||
      m === null ||
      y === null ||
      y < 1900 ||
      !isValidCalendarDate(y, m, d)
    ) {
      return setError(t.onboarding.errors.date);
    }
    if (h === null || mi === null || h > 23 || mi > 59)
      return setError(t.onboarding.errors.time);
    const local = { year: y, month: m, day: d, hour: h, minute: mi };
    if (!isAtLeast18(local)) return setError(t.onboarding.errors.underage);
    if (!consented) return setError(t.onboarding.errors.consent);
    if (session.status !== 'signed-in')
      return setError(t.onboarding.errors.generic);

    setBusy(true);
    // Before the calculating screen goes up: this can open the system
    // location prompt, and that prompt does not belong over a screen
    // claiming to be working on something.
    const device = await deviceLocation();
    setCalculating(true);
    const started = Date.now();
    try {
      const result = await createProfile({
        userId: session.session.user.id,
        displayName: name,
        gender,
        interestedIn,
        cityId: city.id,
        local,
        device,
      });
      await heldFor(started);
      if (result.ok || result.reason === 'exists') {
        // ONE router call into the tab tree, never two. A replace followed
        // by a push in the same handler both run in one queue flush, before
        // the new tab navigator has mounted its nested stack — so the push
        // diverges at the root and adds a second `(tabs)`, the two-navigator
        // bug of docs/NOTES.md 2026-09-11. The profile is the profile tab's
        // own anchor screen, so this one call lands on it with the bar
        // underneath and nothing to seat beneath it; the chart the new
        // account came for is on that page (owner default, 2026-09-11).
        router.replace('/profile');
        return;
      }
      setCalculating(false);
      if (result.reason === 'underage') setError(t.onboarding.errors.underage);
      else if (result.reason === 'invalid-date')
        setError(t.onboarding.errors.date);
      else if (result.reason === 'birth-instant')
        setError(t.onboarding.errors.birthInstant);
      else if (result.reason === 'unknown-city')
        setError(t.onboarding.errors.unknownCity);
      else if (result.reason === 'db') setError(dbErrorText(result.error));
    } catch {
      setCalculating(false);
      setError(t.onboarding.errors.generic);
    } finally {
      setBusy(false);
    }
  };

  if (calculating) return <Calculating />;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <CosmicGround planet={false} horizon={false} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{t.onboarding.title}</Text>
        <Text style={styles.subtitle}>{t.onboarding.subtitle}</Text>
        <Pressable
          testID="sign-out"
          onPress={() => {
            void supabase.auth
              .signOut()
              .then(() => {
                leaveToSignIn();
              })
              .catch(() => setError(t.onboarding.errors.generic));
          }}
        >
          <Text style={styles.switchAccount}>{t.onboarding.switchAccount}</Text>
        </Pressable>

        <Text style={styles.label}>{t.onboarding.name}</Text>
        <TextInput
          testID="display-name"
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={40}
        />

        <Text style={styles.label}>{t.onboarding.gender}</Text>
        <View style={styles.row}>
          {GENDERS.map((g) => (
            <Chip
              key={g}
              testID={`gender-${g}`}
              label={t.onboarding.genders[g]}
              selected={gender === g}
              onPress={() => setGender(g)}
            />
          ))}
        </View>

        <Text style={styles.label}>{t.onboarding.interest}</Text>
        <View style={styles.row}>
          {INTERESTS.map((i) => (
            <Chip
              key={i}
              testID={`interest-${i}`}
              label={t.onboarding.interests[i]}
              selected={interestedIn === i}
              onPress={() => setInterestedIn(i)}
            />
          ))}
        </View>

        <Text style={styles.label}>{t.onboarding.city}</Text>
        <TextInput
          testID="city"
          style={styles.input}
          value={city ? `${city.name}, ${city.country}` : cityQuery}
          onChangeText={(text) => {
            setCity(null);
            setCityQuery(text);
          }}
          placeholder={t.onboarding.cityPlaceholder}
          placeholderTextColor={color.textFaint}
          autoCorrect={false}
        />
        {cityHits.map((hit) => (
          <Pressable
            key={hit.id}
            testID={`city-${hit.id}`}
            style={styles.hit}
            onPress={() => {
              setCity(hit);
              setCityQuery('');
            }}
          >
            <Text style={styles.hitText}>
              {hit.name}, {hit.country}
            </Text>
          </Pressable>
        ))}

        <Text style={styles.label}>{t.onboarding.date}</Text>
        <View style={styles.row}>
          <TextInput
            testID="day"
            style={styles.small}
            value={day}
            onChangeText={setDay}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="GG"
            placeholderTextColor={color.textFaint}
          />
          <TextInput
            testID="month"
            style={styles.small}
            value={month}
            onChangeText={setMonth}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="AA"
            placeholderTextColor={color.textFaint}
          />
          <TextInput
            testID="year"
            style={styles.small}
            value={year}
            onChangeText={setYear}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="YYYY"
            placeholderTextColor={color.textFaint}
          />
        </View>

        <Text style={styles.label}>{t.onboarding.time}</Text>
        <View style={styles.row}>
          <TextInput
            testID="hour"
            style={styles.small}
            value={hour}
            onChangeText={setHour}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="SS"
            placeholderTextColor={color.textFaint}
          />
          <TextInput
            testID="minute"
            style={styles.small}
            value={minute}
            onChangeText={setMinute}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="DD"
            placeholderTextColor={color.textFaint}
          />
        </View>

        <Text style={styles.hint}>{t.onboarding.locationHint}</Text>

        <Pressable
          testID="consent"
          style={styles.consentRow}
          onPress={() => {
            setConsented((on) => !on);
          }}
        >
          <View style={[styles.box, consented && styles.boxOn]}>
            {consented ? <Text style={styles.tick}>✓</Text> : null}
          </View>
          <Text style={styles.consentText}>{t.onboarding.consent}</Text>
        </Pressable>
        <Link href="/legal" style={styles.consentLink}>
          {t.onboarding.consentLink}
        </Link>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.submit}>
          <GradientButton
            testID="submit"
            label={busy ? t.onboarding.computing : t.onboarding.submit}
            disabled={busy}
            onPress={() => void submit()}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { padding: 24, paddingTop: 64, gap: 8 },
  title: { color: color.text, fontSize: 26, fontFamily: font.semibold },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 16,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: color.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: color.cool, borderColor: color.cool },
  tick: { color: color.onBright, fontSize: 14, lineHeight: 18 },
  consentText: {
    fontFamily: font.regular,
    color: color.textMuted,
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
  consentLink: {
    fontFamily: font.regular,
    color: color.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  subtitle: {
    fontFamily: font.regular,
    color: color.textMuted,
    fontSize: 14,
    marginBottom: 4,
  },
  switchAccount: {
    fontFamily: font.regular,
    color: color.textFaint,
    fontSize: 12,
    marginBottom: 12,
  },
  label: {
    fontFamily: font.regular,
    color: color.textMuted,
    fontSize: 14,
    marginTop: 10,
  },
  input: {
    fontFamily: font.regular,
    backgroundColor: glass.fill,
    borderWidth: 1,
    borderColor: glass.edge,
    color: color.text,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  small: {
    fontFamily: font.regular,
    backgroundColor: glass.fill,
    borderWidth: 1,
    borderColor: glass.edge,
    color: color.text,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    // A pinned basis, not a minimum, and a zero floor with it: on the web
    // an `input` carries an intrinsic width of about twenty characters,
    // and a flex item's automatic minimum keeps it there, so three of
    // these wrapped onto three lines where iOS put them side by side
    // (measured in the browser, 2026-09-16). `minWidth: 0` is a no-op on
    // native, where there is no intrinsic width to floor.
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 84,
    minWidth: 0,
    textAlign: 'center',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  hit: { padding: 12, backgroundColor: color.surfaceHigh, borderRadius: 8 },
  hitText: { fontFamily: font.regular, color: color.text },
  hint: {
    fontFamily: font.regular,
    color: color.textFaint,
    fontSize: 12,
    marginTop: 12,
  },
  error: { fontFamily: font.regular, color: color.danger },
  submit: { marginTop: space.md },
});
