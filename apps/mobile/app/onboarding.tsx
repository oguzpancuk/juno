import { isValidCalendarDate, searchCities, type City } from '@juno/geo';
import { useTopClearance } from '@/lib/insets';
import { deviceLocation } from '@/lib/location';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
import { ConsentCheckbox } from '@/components/ConsentCheckbox';
import {
  Chip,
  Field,
  GradientButton,
  SCREEN_TOP_GUTTER,
} from '@/components/ui';
import { markConsentCurrent } from '@/lib/consent';
import { dbErrorText } from '@/lib/errors';
import { accountNote, openedByProvider } from '@/lib/oauth';
import { abandonEmptyAccount } from '@/lib/safety';
import { signOutAndLeave, useSession } from '@/lib/session';
import { CosmicGround } from '@/components/CosmicGround';
import { LegalLink } from '@/components/LegalText';
import { t } from '@/lib/strings';
import { color, font, glass, radius, space } from '@/theme/tokens';

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
  const topPadding = useTopClearance(SCREEN_TOP_GUTTER);
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

  // Said once, above the form, when Apple or Google opened this account
  // rather than being linked onto an e-mail one (lib/oauth.ts). Nothing
  // links an identity on this screen, so for one user and one address the
  // answer cannot change; keyed on those, a keystroke in any field or a
  // token refresh's new user object does not re-run the parse.
  const user = session.status === 'signed-in' ? session.session.user : null;
  const note = useMemo(
    () => accountNote({ email: user?.email, appMetadata: user?.app_metadata }),
    // why: not `user`, which is a new object on every token refresh, and
    // not its metadata, which nothing on this screen can change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, user?.email],
  );
  const noteText =
    note === null
      ? null
      : note.kind === 'relay'
        ? t.onboarding.accountNote.relay(t.onboarding.switchAccount)
        : t.onboarding.accountNote.provider(
            t.onboarding.providerNames[note.provider],
            note.email,
            t.onboarding.switchAccount,
          );

  // Leaving an account Apple or Google opened deletes it first: it holds
  // only the provider's identity, and nothing else in the app could ever
  // reach it again (ADR-0013). The database deletes it only while it is
  // empty — onboarding is reachable by URL and deep link — and a member
  // with a profile is only signed out. If the delete cannot be done (no
  // connection, a server without the function), the person is told the
  // account is still there, and the next tap only signs out: the link
  // never becomes a dead end. An e-mail account is only signed out. A
  // ref, not state, guards re-entry: two taps in one frame both read the
  // state from before either landed.
  const leavingNow = useRef(false);
  const [leaving, setLeaving] = useState(false);
  const [abandonFailed, setAbandonFailed] = useState(false);
  const leave = async () => {
    if (leavingNow.current) return;
    leavingNow.current = true;
    setLeaving(true);
    setError(null);
    if (!abandonFailed && openedByProvider(user?.app_metadata)) {
      if ((await abandonEmptyAccount()) === 'failed') {
        leavingNow.current = false;
        setLeaving(false);
        setAbandonFailed(true);
        return;
      }
    }
    signOutAndLeave();
  };

  // KVKK: the profile is the point at which birth data and location start
  // being processed, so consent is taken here and stored with the version
  // of the notice that was on screen.
  const [consented, setConsented] = useState(false);

  const submit = async () => {
    // The account may be on its way out: a profile written now would race
    // the delete and the sign-out's navigation.
    if (leavingNow.current) return;
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
      // The row was written with this build's notice version: the tabs'
      // consent gate need not read it back.
      if (result.ok) markConsentCurrent(session.session.user.id);
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
        contentContainerStyle={[styles.content, { paddingTop: topPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{t.onboarding.title}</Text>
        <Text style={styles.subtitle}>{t.onboarding.subtitle}</Text>
        {noteText ? (
          <Text testID="account-note" style={styles.accountNote}>
            {noteText}
          </Text>
        ) : null}
        <Pressable
          testID="sign-out"
          disabled={leaving}
          onPress={() => void leave()}
        >
          <Text style={styles.switchAccount}>{t.onboarding.switchAccount}</Text>
        </Pressable>
        {abandonFailed ? (
          <Text testID="abandon-failed" style={styles.error}>
            {t.onboarding.abandonFailed(t.onboarding.switchAccount)}
          </Text>
        ) : null}

        <Text style={styles.label}>{t.onboarding.name}</Text>
        <Field
          testID="display-name"
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
        <Field
          testID="city"
          value={city ? `${city.name}, ${city.country}` : cityQuery}
          onChangeText={(text) => {
            setCity(null);
            setCityQuery(text);
          }}
          placeholder={t.onboarding.cityPlaceholder}
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
          <Field
            testID="day"
            style={styles.small}
            value={day}
            onChangeText={setDay}
            keyboardType="number-pad"
            maxLength={2}
            placeholder={t.onboarding.datePlaceholders.day}
          />
          <Field
            testID="month"
            style={styles.small}
            value={month}
            onChangeText={setMonth}
            keyboardType="number-pad"
            maxLength={2}
            placeholder={t.onboarding.datePlaceholders.month}
          />
          <Field
            testID="year"
            style={styles.small}
            value={year}
            onChangeText={setYear}
            keyboardType="number-pad"
            maxLength={4}
            placeholder={t.onboarding.datePlaceholders.year}
          />
        </View>

        <Text style={styles.label}>{t.onboarding.time}</Text>
        <View style={styles.row}>
          <Field
            testID="hour"
            style={styles.small}
            value={hour}
            onChangeText={setHour}
            keyboardType="number-pad"
            maxLength={2}
            placeholder={t.onboarding.datePlaceholders.hour}
          />
          <Field
            testID="minute"
            style={styles.small}
            value={minute}
            onChangeText={setMinute}
            keyboardType="number-pad"
            maxLength={2}
            placeholder={t.onboarding.datePlaceholders.minute}
          />
        </View>

        <Text style={styles.hint}>{t.onboarding.locationHint}</Text>

        <View style={styles.consentRow}>
          <ConsentCheckbox
            testID="consent"
            checked={consented}
            onToggle={() => {
              setConsented((on) => !on);
            }}
            label={t.onboarding.consent}
          />
        </View>
        <LegalLink
          label={t.onboarding.consentLink}
          style={styles.consentLink}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.submit}>
          <GradientButton
            testID="submit"
            label={busy ? t.onboarding.computing : t.onboarding.submit}
            disabled={busy || leaving}
            onPress={() => void submit()}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { padding: 24, gap: 8 },
  title: { color: color.text, fontSize: 26, fontFamily: font.semibold },
  consentRow: { marginTop: 16 },
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
  accountNote: {
    fontFamily: font.regular,
    color: color.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
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
  // Only what the shared `Field` does not give: a date box is narrow and
  // its two or four digits sit in the middle.
  small: {
    paddingHorizontal: space.md,
    // On the web an `input` carries an intrinsic width of about twenty
    // characters, and a flex item's automatic minimum keeps it there, so
    // three of these wrapped onto three lines where iOS put them side by
    // side (measured in the browser, 2026-09-16). A pinned basis with the
    // automatic minimum zeroed fixes that — and stays on the web, because
    // on a phone the floor is what lets a field grow with the system text
    // size, which a fixed basis would take away.
    ...(Platform.OS === 'web'
      ? { flexGrow: 0, flexShrink: 1, flexBasis: 84, minWidth: 0 }
      : { minWidth: 72 }),
    textAlign: 'center',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  hit: {
    padding: space.md,
    backgroundColor: glass.fillHigh,
    borderRadius: radius.md,
  },
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
