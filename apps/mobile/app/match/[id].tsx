import { SIGN_TR, synastryReading } from '@juno/astro';
import { Link, Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchMatch, starterFor, type MatchProfileRow } from '@/lib/matches';
import { usePhotoSources } from '@/lib/photos';
import {
  REPORT_REASONS,
  blockUser,
  reportUser,
  type ReportReason,
} from '@/lib/safety';
import { fetchOwnProfile, type OwnProfile } from '@/lib/profile';
import { useSession } from '@/lib/session';
import { t } from '@/lib/strings';

/** Stable identity while the row is still loading. */
const EMPTY: readonly string[] = [];

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  const [row, setRow] = useState<MatchProfileRow | null | 'loading'>('loading');
  const [me, setMe] = useState<OwnProfile | null>(null);
  // The safety buttons are the last thing on the page; without the inset
  // they sit under the home indicator and do not take a tap.
  const insets = useSafeAreaInsets();
  const [reporting, setReporting] = useState(false);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (!userId || typeof id !== 'string') return;
    let cancelled = false;
    void Promise.all([fetchMatch(id), fetchOwnProfile(userId)]).then(
      ([r, p]) => {
        if (cancelled) return;
        setRow(r);
        setMe(p.status === 'ready' ? p.profile : null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId, id]);

  // Photos come from an endpoint that authorises every request
  // (ADR-0006), so they are fetched per visit and never cached.
  const photos = row !== 'loading' && row ? row.photos : EMPTY;
  const sources = usePhotoSources(photos);

  // After every hook: hooks must run in the same order on each render.
  const reading = useMemo(
    () =>
      me && row && row !== 'loading'
        ? synastryReading(me.chart, row.chart, 5)
        : null,
    [me, row],
  );
  if (session.status === 'signed-out') return <Redirect href="/sign-in" />;

  if (row === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#9a94b8" />
      </View>
    );
  }
  if (!row || !userId) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t.errors.generic}</Text>
        <Link href="/discover" style={styles.link}>
          {t.match.backToDiscover}
        </Link>
      </View>
    );
  }
  const starter = starterFor(row, userId);
  const other = row.id;
  const name = row.display_name;

  // An in-page confirmation rather than Alert.alert: react-native-web
  // renders Alert as a no-op, so on the web client the block simply never
  // happened. This works on both.
  const doBlock = () => {
    if (busy.current) return;
    busy.current = true;
    void blockUser(userId, other).then((ok) => {
      busy.current = false;
      setConfirmingBlock(false);
      if (!ok) {
        setNotice(t.safety.failed);
        return;
      }
      router.replace('/matches');
    });
  };

  const file = (reason: ReportReason) => {
    if (busy.current) return;
    busy.current = true;
    void reportUser(userId, other, reason).then((ok) => {
      busy.current = false;
      setReporting(false);
      setNotice(ok ? t.safety.reported : t.safety.failed);
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 32 },
      ]}
      testID="match-screen"
    >
      <Text style={styles.kicker}>{t.match.kicker}</Text>
      <Text style={styles.title}>{t.match.title(row.display_name)}</Text>
      {sources.some((source) => source !== null) ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoStrip}
        >
          {sources.map((source, index) =>
            source === null ? null : (
              <Image
                key={source.uri}
                testID={`match-photo-${index}`}
                source={source}
                style={styles.photo}
                resizeMode="cover"
              />
            ),
          )}
        </ScrollView>
      ) : null}
      {row.bio ? <Text style={styles.bio}>{row.bio}</Text> : null}
      <View style={styles.row}>
        <Chip label={t.chart.sun} value={SIGN_TR[row.big_three.sun]} />
        <Chip label={t.chart.moon} value={SIGN_TR[row.big_three.moon]} />
        <Chip label={t.chart.rising} value={SIGN_TR[row.big_three.rising]} />
      </View>

      <Text style={styles.label}>{t.match.starterLabel}</Text>
      {starter ? (
        <View style={styles.starterBox} testID="starter">
          <Text style={styles.starterHead}>{starter.headline}</Text>
          <Text style={styles.starterMeaning}>{starter.meaning}</Text>
          <Text style={styles.starterQuestion}>{starter.question}</Text>
        </View>
      ) : (
        <Text style={styles.starterMeaning}>{t.match.noStarter}</Text>
      )}

      {reading ? (
        <View style={styles.summary} testID="synastry">
          <Text style={styles.label}>{t.match.summary}</Text>
          <Text style={styles.score}>
            {reading.score}{' '}
            <Text style={styles.scoreLabel}>{t.discover.scoreLabel}</Text>
          </Text>
          <Text style={styles.body}>{reading.bandText}</Text>
          <Text style={styles.label}>{t.match.elements}</Text>
          <Text style={styles.bodyMuted}>{reading.sunElements}</Text>
          <Text style={styles.bodyMuted}>{reading.moonElements}</Text>
          <Text style={styles.label}>{t.match.aspects}</Text>
          {reading.aspects.map((a) => (
            <View
              key={`${a.aspect.planetA}-${a.aspect.aspect}-${a.aspect.planetB}`}
              style={styles.aspect}
            >
              <Text style={styles.aspectHead}>{a.headline}</Text>
              <Text style={styles.body}>{a.meaning}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Link
        href={{ pathname: '/chat/[id]', params: { id: row.match_id } }}
        style={styles.chatLink}
        testID="open-chat"
      >
        {t.chat.open}
      </Link>
      <Link href="/matches" style={styles.link}>
        {t.match.allMatches}
      </Link>
      <Link href="/discover" style={styles.link}>
        {t.match.backToDiscover}
      </Link>

      <Text style={styles.label}>{t.safety.title}</Text>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <View style={styles.safetyRow}>
        <Pressable
          testID="block"
          style={styles.safetyButton}
          onPress={() => {
            setNotice(null);
            setReporting(false);
            setConfirmingBlock((open) => !open);
          }}
        >
          <Text style={styles.safetyText}>{t.safety.block}</Text>
        </Pressable>
        <Pressable
          testID="report"
          style={styles.safetyButton}
          onPress={() => {
            setNotice(null);
            setReporting((open) => !open);
          }}
        >
          <Text style={styles.safetyText}>{t.safety.report}</Text>
        </Pressable>
      </View>
      {confirmingBlock ? (
        <View style={styles.reasons} testID="block-confirm">
          <Text style={styles.bodyMuted}>{t.safety.blockConfirm(name)}</Text>
          <Pressable testID="block-yes" style={styles.danger} onPress={doBlock}>
            <Text style={styles.dangerText}>{t.safety.blockConfirmTitle}</Text>
          </Pressable>
          <Pressable
            style={styles.reason}
            onPress={() => {
              setConfirmingBlock(false);
            }}
          >
            <Text style={styles.body}>{t.safety.cancel}</Text>
          </Pressable>
        </View>
      ) : null}
      {reporting ? (
        <View style={styles.reasons} testID="report-reasons">
          <Text style={styles.bodyMuted}>{t.safety.reportTitle}</Text>
          {REPORT_REASONS.map((reason) => (
            <Pressable
              key={reason.value}
              testID={`reason-${reason.value}`}
              style={styles.reason}
              onPress={() => {
                file(reason.value);
              }}
            >
              <Text style={styles.body}>{reason.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photoStrip: { gap: 8, paddingVertical: 4 },
  photo: { width: 132, height: 176, borderRadius: 14 },
  bio: { color: '#c8c3e0', fontSize: 14, lineHeight: 21 },
  screen: { flex: 1, backgroundColor: '#0b0b1a' },
  content: { padding: 24, paddingTop: 80, gap: 12, paddingBottom: 48 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#0b0b1a',
  },
  kicker: { color: '#7c6cff', fontSize: 14, letterSpacing: 2 },
  title: { color: '#f5f2ff', fontSize: 30, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 8, marginTop: 4 },
  chip: {
    flex: 1,
    backgroundColor: '#15142a',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  chipLabel: { color: '#9a94b8', fontSize: 11 },
  chipValue: {
    color: '#f5f2ff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  label: { color: '#9a94b8', fontSize: 12, letterSpacing: 1, marginTop: 12 },
  starterBox: {
    backgroundColor: '#15142a',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  starterHead: { color: '#c9c4e3', fontSize: 14 },
  starterMeaning: { color: '#d9d5ef', fontSize: 15, lineHeight: 22 },
  starterQuestion: {
    color: '#f5f2ff',
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '600',
  },
  summary: { gap: 6 },
  score: { color: '#f5f2ff', fontSize: 34, fontWeight: '800' },
  scoreLabel: { color: '#9a94b8', fontSize: 14, fontWeight: '400' },
  body: { color: '#d9d5ef', fontSize: 14, lineHeight: 20 },
  bodyMuted: { color: '#9a94b8', fontSize: 13, lineHeight: 19 },
  aspect: { backgroundColor: '#15142a', borderRadius: 12, padding: 12, gap: 4 },
  aspectHead: { color: '#f5f2ff', fontSize: 14, fontWeight: '600' },
  chatLink: {
    color: '#f5f2ff',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: '#3b2f7a',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    textAlign: 'center',
    marginTop: 12,
    overflow: 'hidden',
  },
  safetyRow: { flexDirection: 'row', gap: 8 },
  safetyButton: {
    flex: 1,
    backgroundColor: '#15142a',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  safetyText: { color: '#c9c4e3', fontSize: 14, fontWeight: '600' },
  reasons: { gap: 6, marginTop: 8 },
  reason: {
    backgroundColor: '#15142a',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  danger: {
    backgroundColor: '#3a1620',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dangerText: { color: '#ff9a9a', fontSize: 15, fontWeight: '600' },
  notice: { color: '#8ce0b0', fontSize: 13 },
  muted: { color: '#9a94b8' },
  link: { color: '#c9c4e3', fontSize: 15, paddingVertical: 8 },
});
