import { Link, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BigThreeRow } from '@/components/BigThreeRow';
import { PairReading } from '@/components/PairReading';
import { Popup } from '@/components/Popup';
import { useBottomGap } from '@/lib/insets';
import type { MatchProfileRow } from '@/lib/matches';
import type { PhotoSource } from '@/lib/photos';
import { fetchOwnProfile, type OwnProfile } from '@/lib/profile';
import {
  REPORT_REASONS,
  blockUser,
  reportUser,
  type ReportReason,
} from '@/lib/safety';
import { starterFor } from '@/lib/starter';
import { t } from '@/lib/strings';
import { color, glass, radius, space, type } from '@/theme/tokens';

/**
 * The match page — "EŞLEŞTİNİZ", the photos, the starter, the compatibility
 * summary and the safety block — as the second page of the chat (owner,
 * 2026-09-11: chat and match detail are two tabs of one screen). Their
 * profile is not down here any more: it opens from the name in the chat
 * header (owner, 2026-09-12). It was `(matches)/match/[id].tsx`; the chat owns the
 * match row and the photo sources now and hands them down, so the first
 * photo is requested once for the header, the bubbles and this strip
 * (ADR-0006: every photo request is authorised, none is cached).
 *
 * Own profile is loaded here, not in the chat: only the synastry needs
 * it, and a failed read degrades this page alone.
 */
export function MatchDetail({
  row,
  userId,
  sources,
}: {
  row: MatchProfileRow;
  userId: string;
  sources: readonly (PhotoSource | null)[];
}) {
  const [me, setMe] = useState<OwnProfile | null>(null);
  const [meFailed, setMeFailed] = useState(false);
  // The safety buttons are the last thing on the page. No safe-area
  // inset: this renders inside the chat, inside the tab navigator, and
  // the bar below already covers the home indicator (lib/insets.ts).
  const bottomGap = useBottomGap(space.xxl);
  const [reporting, setReporting] = useState(false);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const busy = useRef(false);
  // The chat is keyed by match id, so a swap unmounts this — but a request
  // already in flight still resolves. Its result belongs to whoever is gone.
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchOwnProfile(userId).then((p) => {
      if (cancelled) return;
      setMe(p.status === 'ready' ? p.profile : null);
      setMeFailed(p.status !== 'ready');
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

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
      // POP_TO, not replace: the chat sits on the matches stack, and a
      // replace there would leave the list twice on it.
      router.dismissTo('/matches');
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
    <View style={styles.screen}>
      {/* No sky of its own: this is a page of the chat, whose sky is under
          both pages, so swiping between them changes nothing behind
          (owner, 2026-09-16). */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomGap }]}
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
        <BigThreeRow three={row.big_three} />

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
        <Link
          href={{ pathname: '/starter/[id]', params: { id: row.match_id } }}
          style={styles.link}
        >
          {t.starter.open}
        </Link>

        {meFailed ? (
          <Text style={styles.notice} testID="synastry-failed">
            {t.match.synastryFailed}
          </Text>
        ) : null}
        {me ? (
          <View style={styles.summary}>
            <Text style={styles.label}>{t.match.summary}</Text>
            {/* Shared with the deck's "Uyum detayı" sheet. */}
            <PairReading mine={me.chart} theirs={row.chart} />
          </View>
        ) : null}

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
              setConfirmingBlock(false);
              setReporting(true);
            }}
          >
            <Text style={styles.safetyText}>{t.safety.report}</Text>
          </Pressable>
        </View>
        {confirmingBlock ? (
          <View style={styles.reasons} testID="block-confirm">
            <Text style={styles.bodyMuted}>{t.safety.blockConfirm(name)}</Text>
            <Pressable
              testID="block-yes"
              style={styles.danger}
              onPress={doBlock}
            >
              <Text style={styles.dangerText}>
                {t.safety.blockConfirmTitle}
              </Text>
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
        <Popup
          visible={reporting}
          onClose={() => setReporting(false)}
          title={t.safety.reportTitle}
          testID="report-reasons"
        >
          {REPORT_REASONS.map((reason) => (
            <Pressable
              key={reason.value}
              testID={`reason-${reason.value}`}
              style={({ pressed }) => [styles.reason, pressed && styles.dim]}
              onPress={() => {
                file(reason.value);
              }}
            >
              <Text style={styles.body}>{reason.label}</Text>
            </Pressable>
          ))}
        </Popup>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: space.xl, paddingTop: space.lg, gap: space.sm },
  kicker: { ...type.label, color: color.pink },
  title: { ...type.display, color: color.text, marginBottom: space.md },
  photoStrip: { gap: space.sm, paddingVertical: space.sm },
  photo: { width: 132, height: 176, borderRadius: radius.lg },
  bio: { ...type.body, color: color.textMuted, marginBottom: space.sm },
  label: {
    ...type.label,
    color: color.textFaint,
    marginTop: space.xl,
    marginBottom: space.xs,
  },
  starterBox: {
    backgroundColor: glass.fill,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: glass.edge,
    padding: space.lg,
    gap: space.sm,
  },
  starterHead: { ...type.caption, color: color.textMuted },
  starterMeaning: { ...type.body, color: color.textMuted },
  starterQuestion: { ...type.heading, color: color.text, lineHeight: 26 },
  summary: { gap: space.sm },
  body: { ...type.body, color: color.text },
  bodyMuted: { ...type.bodySmall, color: color.textMuted },
  link: { ...type.body, color: color.textMuted, paddingVertical: space.sm },
  notice: { ...type.bodySmall, color: color.pink, paddingVertical: space.sm },
  safetyRow: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  safetyButton: {
    flex: 1,
    backgroundColor: glass.fillSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: glass.edge,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  safetyText: { ...type.body, color: color.textMuted },
  reasons: { gap: space.xs },
  // A row in the report popup; the sheet's own button is the only way out,
  // so a reason is a plain tap target rather than a second one.
  reason: { paddingVertical: space.md },
  dim: { opacity: 0.6 },
  danger: { paddingVertical: space.md },
  dangerText: { ...type.body, color: color.danger },
});
