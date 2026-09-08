import { isValidCalendarDate, searchCities, type City } from '@stardate/geo';
import * as Location from 'expo-location';
import { router } from 'expo-router';
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
import { t } from '@/lib/strings';

const num = (s: string): number | null =>
  /^\d{1,4}$/.test(s) ? Number(s) : null;

const LOCATION_TIMEOUT_MS = 5000;

/**
 * One-shot device position, or undefined when refused, unavailable or slow:
 * the city centre is the documented fallback and submit must never hang.
 */
async function deviceLocation(): Promise<
  { latitude: number; longitude: number } | undefined
> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return undefined;
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), LOCATION_TIMEOUT_MS),
      ),
    ]);
    if (!position) return undefined;
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return undefined;
  }
}

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
          placeholderTextColor="#5f5a7a"
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
            placeholderTextColor="#5f5a7a"
          />
          <TextInput
            testID="month"
            style={styles.small}
            value={month}
            onChangeText={setMonth}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="AA"
            placeholderTextColor="#5f5a7a"
          />
          <TextInput
            testID="year"
            style={styles.small}
            value={year}
            onChangeText={setYear}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="YYYY"
            placeholderTextColor="#5f5a7a"
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
            placeholderTextColor="#5f5a7a"
          />
          <TextInput
            testID="minute"
            style={styles.small}
            value={minute}
            onChangeText={setMinute}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="DD"
            placeholderTextColor="#5f5a7a"
          />
        </View>

        <Text style={styles.hint}>{t.onboarding.locationHint}</Text>
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
  screen: { flex: 1, backgroundColor: '#0b0b1a' },
  content: { padding: 24, paddingTop: 64, gap: 8 },
  title: { color: '#f5f2ff', fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#9a94b8', fontSize: 14, marginBottom: 12 },
  label: { color: '#c9c4e3', fontSize: 14, marginTop: 10 },
  input: {
    backgroundColor: '#15142a',
    color: '#f5f2ff',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  small: {
    backgroundColor: '#15142a',
    color: '#f5f2ff',
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
    backgroundColor: '#15142a',
  },
  chipOn: { backgroundColor: '#7c6cff' },
  chipText: { color: '#f5f2ff' },
  hit: { padding: 12, backgroundColor: '#1c1b33', borderRadius: 8 },
  hitText: { color: '#f5f2ff' },
  hint: { color: '#5f5a7a', fontSize: 12, marginTop: 12 },
  error: { color: '#ff7b7b' },
  button: {
    backgroundColor: '#7c6cff',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonBusy: { opacity: 0.6 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
