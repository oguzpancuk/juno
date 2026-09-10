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
import { dbErrorText } from '@/lib/errors';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { t } from '@/lib/strings';
import { color } from '@/theme/tokens';

const num = (s: string): number | null =>
  /^\d{1,4}$/.test(s) ? Number(s) : null;

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
    const device = await deviceLocation();
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
      if (result.ok || result.reason === 'exists') {
        router.replace('/chart');
        return;
      }
      if (result.reason === 'underage') setError(t.onboarding.errors.underage);
      else if (result.reason === 'invalid-date')
        setError(t.onboarding.errors.date);
      else if (result.reason === 'birth-instant')
        setError(t.onboarding.errors.birthInstant);
      else if (result.reason === 'unknown-city')
        setError(t.onboarding.errors.unknownCity);
      else if (result.reason === 'db') setError(dbErrorText(result.error));
    } catch {
      setError(t.onboarding.errors.generic);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
              .then(() => router.replace('/sign-in'))
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
            <Pressable
              key={g}
              testID={`gender-${g}`}
              style={[styles.chip, gender === g && styles.chipOn]}
              onPress={() => setGender(g)}
            >
              <Text style={styles.chipText}>{t.onboarding.genders[g]}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{t.onboarding.interest}</Text>
        <View style={styles.row}>
          {INTERESTS.map((i) => (
            <Pressable
              key={i}
              testID={`interest-${i}`}
              style={[styles.chip, interestedIn === i && styles.chipOn]}
              onPress={() => setInterestedIn(i)}
            >
              <Text style={styles.chipText}>{t.onboarding.interests[i]}</Text>
            </Pressable>
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
        <Pressable
          testID="submit"
          style={[styles.button, busy && styles.buttonBusy]}
          disabled={busy}
          onPress={() => void submit()}
        >
          <Text style={styles.buttonText}>
            {busy ? t.onboarding.computing : t.onboarding.submit}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { padding: 24, paddingTop: 64, gap: 8 },
  title: { color: color.text, fontSize: 26, fontWeight: '700' },
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
    color: color.textMuted,
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
  consentLink: { color: color.textMuted, fontSize: 12, marginTop: 6 },
  subtitle: { color: color.textMuted, fontSize: 14, marginBottom: 4 },
  switchAccount: { color: color.textFaint, fontSize: 12, marginBottom: 12 },
  label: { color: color.textMuted, fontSize: 14, marginTop: 10 },
  input: {
    backgroundColor: color.surface,
    color: color.text,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  small: {
    backgroundColor: color.surface,
    color: color.text,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    minWidth: 72,
    textAlign: 'center',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: color.surface,
  },
  chipOn: { backgroundColor: color.cool },
  chipText: { color: color.text },
  hit: { padding: 12, backgroundColor: color.surfaceHigh, borderRadius: 8 },
  hitText: { color: color.text },
  hint: { color: color.textFaint, fontSize: 12, marginTop: 12 },
  error: { color: color.danger },
  button: {
    backgroundColor: color.cool,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonBusy: { opacity: 0.6 },
  buttonText: { color: color.onBright, fontSize: 16, fontWeight: '600' },
});
