import {
  SIGN_TR,
  aspectGlyphs,
  formatDegree,
  houseOverlays,
  matchSections,
  synastryReading,
} from '@juno/astro';
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
import { color, radius, space, type } from '@/theme/tokens';

/** Stable identity while the row is still loading. */
const EMPTY: readonly string[] = [];

/**
 * The root layout navigates to this route when a match arrives over
 * Realtime, and navigating to the route you are already on swaps the params
 * without remounting. Everything below is about one person — the row, the
 * photos, the open report sheet, the open block confirmation — so the id
 * keys the view and React discards all of it. Without this, an open block
 * confirmation survived the swap and its next tap blocked whoever arrived.
 */
export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MatchView key={typeof id === 'string' ? id : 'none'} id={id} />;
}

function MatchView({ id }: { id: string | string[] | undefined }) {
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  // A route param that is not a string can never resolve, so it starts as
  // the error state rather than spinning for ever.
  const [row, setRow] = useState<MatchProfileRow | null | 'loading'>(
    typeof id === 'string' ? 'loading' : null,
  );
  const [me, setMe] = useState<OwnProfile | null>(null);
  // The safety buttons are the last thing on the page; without the inset
  // they sit under the home indicator and do not take a tap.
  const insets = useSafeAreaInsets();
  const [reporting, setReporting] = useState(false);
  const [showOverlays, setShowOverlays] = useState(false);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const busy = useRef(false);
  // The view is keyed by id, so a swap unmounts it — but a request already
  // in flight still resolves. Its result belongs to the person who is gone.
  const live = useRef(true);
  useEffect(
    () => () => {
      live.current = false;
    },
    [],
  );

  const [meFailed, setMeFailed] = useState(false);

  useEffect(() => {
    if (!userId || typeof id !== 'string') return;
    let cancelled = false;
    void Promise.all([fetchMatch(id), fetchOwnProfile(userId)]).then(
      ([r, p]) => {
        if (cancelled) return;
        setRow(r);
        setMe(p.status === 'ready' ? p.profile : null);
        setMeFailed(p.status !== 'ready');
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
  const sections = useMemo(
    () =>
      reading
        ? matchSections(
            reading.match,
            reading.dimensions.map((d) => d.label),
          )
        : null,
    [reading],
  );
  const overlays = useMemo(
    () =>
      me && row && row !== 'loading' ? houseOverlays(me.chart, row.chart) : [],
    [me, row],
  );
  if (session.status === 'signed-out') return <Redirect href="/sign-in" />;

  if (row === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={color.textMuted} />
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
      if (!live.current) return;
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
      if (!live.current) return;
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

      {meFailed ? (
        <Text style={styles.notice} testID="synastry-failed">
          {t.match.synastryFailed}
        </Text>
      ) : null}
      {reading && sections ? (
        <View style={styles.summary} testID="synastry">
          <Text style={styles.label}>{t.match.summary}</Text>
          {/* The band, never the number (ADR-0009 §3). */}
          <Text style={styles.bandName} testID="band">
            {reading.bandName}
          </Text>
          <Text style={styles.body}>{reading.bandText}</Text>

          {reading.dimensions.length === 0 ? null : (
            <>
              <Text style={styles.label}>{t.match.dimensions}</Text>
              <View style={styles.dimensionRow}>
                {reading.dimensions.map((d) => (
                  <View
                    key={d.dimension}
                    style={styles.dimensionChip}
                    testID={`dimension-${d.dimension}`}
                  >
                    <Text style={styles.dimensionName}>{d.name}</Text>
                    <Text style={styles.dimensionLabel}>{d.label}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* A section with nothing to show is omitted with its heading,
              never padded and never filled with a verdict (ADR-0009 §5). */}
          {sections.drawn.length > 0 ? (
            <View testID="drawn">
              <Text style={styles.label}>{t.match.drawn}</Text>
              {sections.drawn.map((a) => (
                <AspectCard key={aspectKey(a)} card={a} />
              ))}
            </View>
          ) : null}

          {sections.interesting.length > 0 ? (
            <View testID="interesting">
              <Text style={styles.label}>{t.match.interesting}</Text>
              {sections.interesting.map((a) => (
                <AspectCard key={aspectKey(a)} card={a} />
              ))}
            </View>
          ) : null}

          {/* A deeper layer: one card by default, the rest disclosed. */}
          {overlays.length > 0 ? (
            <View testID="overlays">
              <Text style={styles.label}>{t.match.overlays}</Text>
              {(showOverlays ? overlays : overlays.slice(0, 1)).map((o) => (
                <View
                  key={`${o.direction}-${o.house}`}
                  style={styles.aspect}
                  testID={`overlay-${o.direction}-${o.house}`}
                >
                  <Text style={styles.aspectTitle}>{o.theme}</Text>
                  <Text style={styles.aspectHead}>
                    {o.direction === 'theirs'
                      ? t.match.overlayTheirs
                      : t.match.overlayYours}
                  </Text>
                  {o.placements.map((placement) => (
                    <Text key={placement.planet} style={styles.body}>
                      {placement.text}
                    </Text>
                  ))}
                </View>
              ))}
              {overlays.length > 1 ? (
                <Pressable
                  testID="toggle-overlays"
                  onPress={() => setShowOverlays((v) => !v)}
                >
                  <Text style={styles.link}>
                    {showOverlays
                      ? t.match.fewerOverlays
                      : t.match.moreOverlays(overlays.length - 1)}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.label}>{t.match.elements}</Text>
          <Text style={styles.bodyMuted}>{reading.sunElements}</Text>
          <Text style={styles.bodyMuted}>{reading.moonElements}</Text>
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

type AspectCardProps = {
  card: {
    readonly title: string;
    readonly headline: string;
    readonly meaning: string;
    readonly aspect: Parameters<typeof aspectGlyphs>[0] & {
      readonly orb: number;
    };
  };
};

/** Title first, then the astrology, then the reading: show the calculation. */
function AspectCard({ card }: AspectCardProps) {
  return (
    <View style={styles.aspect}>
      <Text style={styles.aspectTitle}>{card.title}</Text>
      <Text style={styles.aspectGlyphs}>
        {aspectGlyphs(card.aspect)}
        <Text style={styles.aspectOrb}>
          {'  '}
          {formatDegree(card.aspect.orb)}
        </Text>
      </Text>
      <Text style={styles.aspectHead}>{card.headline}</Text>
      <Text style={styles.body}>{card.meaning}</Text>
    </View>
  );
}

function aspectKey(a: {
  readonly aspect: { planetA: string; aspect: string; planetB: string };
}): string {
  return `${a.aspect.planetA}-${a.aspect.aspect}-${a.aspect.planetB}`;
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
  screen: { flex: 1, backgroundColor: color.bg },
  content: { padding: space.xl, paddingTop: 68, gap: space.sm },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    backgroundColor: color.bg,
  },
  kicker: { ...type.label, color: color.pink },
  title: { ...type.display, color: color.text, marginBottom: space.md },
  photoStrip: { gap: space.sm, paddingVertical: space.sm },
  photo: { width: 132, height: 176, borderRadius: radius.lg },
  bio: { ...type.body, color: color.textMuted, marginBottom: space.sm },
  row: { flexDirection: 'row', gap: space.sm, marginBottom: space.sm },
  chip: {
    flex: 1,
    backgroundColor: color.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.md,
    alignItems: 'center',
    gap: 2,
  },
  chipLabel: { ...type.caption, color: color.textFaint },
  chipValue: { ...type.body, color: color.text, fontWeight: '600' },
  label: {
    ...type.label,
    color: color.textFaint,
    marginTop: space.xl,
    marginBottom: space.xs,
  },
  starterBox: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderStrong,
    padding: space.lg,
    gap: space.sm,
  },
  starterHead: { ...type.caption, color: color.textMuted },
  starterMeaning: { ...type.body, color: color.textMuted },
  starterQuestion: { ...type.heading, color: color.text, lineHeight: 26 },
  summary: { gap: space.sm },
  bandName: { ...type.display, color: color.text },
  dimensionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  dimensionChip: {
    backgroundColor: color.surfaceSoft,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.border,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  dimensionName: { ...type.caption, color: color.textFaint },
  dimensionLabel: { ...type.bodySmall, color: color.text },
  aspect: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.lg,
    gap: space.xs,
    marginBottom: space.sm,
  },
  aspectTitle: { ...type.heading, color: color.text },
  aspectGlyphs: { fontSize: 17, color: color.pink, letterSpacing: 2 },
  aspectOrb: { ...type.caption, color: color.textFaint, letterSpacing: 0 },
  aspectHead: { ...type.caption, color: color.textMuted },
  body: { ...type.body, color: color.text },
  bodyMuted: { ...type.bodySmall, color: color.textMuted },
  chatLink: {
    ...type.heading,
    color: color.text,
    backgroundColor: color.surfaceHigh,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    textAlign: 'center',
    paddingVertical: 15,
    marginTop: space.xl,
    overflow: 'hidden',
  },
  link: { ...type.body, color: color.textMuted, paddingVertical: space.sm },
  muted: { ...type.body, color: color.textMuted },
  notice: { ...type.bodySmall, color: color.pink, paddingVertical: space.sm },
  safetyRow: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  safetyButton: {
    flex: 1,
    backgroundColor: color.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  safetyText: { ...type.body, color: color.textMuted },
  sheet: {
    backgroundColor: color.surfaceHigh,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderStrong,
    padding: space.lg,
    gap: space.sm,
    marginTop: space.sm,
  },
  sheetTitle: { ...type.body, color: color.text },
  sheetOption: { paddingVertical: space.md },
  sheetOptionText: { ...type.body, color: color.text },
  sheetDanger: { ...type.body, color: color.danger },
  sheetCancel: { ...type.body, color: color.textFaint, paddingTop: space.sm },
  reasons: { gap: space.xs },
  reason: { paddingVertical: space.md },
  reasonText: { ...type.body, color: color.text },
  danger: { paddingVertical: space.md },
  dangerText: { ...type.body, color: color.danger },
  cancel: { paddingVertical: space.md, alignItems: 'center' },
  cancelText: { ...type.body, color: color.textFaint },
  confirmTitle: { ...type.body, color: color.text },
});
