import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Card, GradientButton, LinkText } from '@/components/ui';
import {
  FREE_DAILY_LIKES,
  SUPER_LIKES_PER_WEEK,
  becomePremium,
} from '@/lib/premium';
import { fetchOwnProfile } from '@/lib/profile';
import { useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { color, font, space, type } from '@/theme/tokens';

/**
 * The membership, as the body of a page inside the settings sheet.
 *
 * There is no payment step (owner, 2026-09-21: "premium uyelik al
 * dediginde direkt almis olsin, odemeyi sonra ekleriz"), so the screen
 * says so rather than showing a price it cannot charge. The button writes
 * the flag on the member's own row; what it buys — likes without a cap,
 * five super likes a week, the list of people who liked you, the deck
 * ordered by compatibility — is enforced by the database.
 */
export function PremiumPanel({ onBought }: { onBought?: () => void }) {
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;

  const [load, setLoad] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [premium, setPremium] = useState(false);
  const [since, setSince] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A ref, not the rendered flag: two taps in one frame both read `false`
  // and would send two writes.
  const buyingNow = useRef(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void fetchOwnProfile(userId).then((state) => {
      if (cancelled) return;
      if (state.status !== 'ready') {
        setLoad('failed');
        return;
      }
      setPremium(state.profile.is_premium);
      setSince(state.profile.premium_since);
      setLoad('ready');
    });
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  const buy = () => {
    if (!userId || buyingNow.current) return;
    buyingNow.current = true;
    setBuying(true);
    setError(null);
    void becomePremium(userId).then((ok) => {
      buyingNow.current = false;
      setBuying(false);
      if (!ok) {
        setError(t.premium.failed);
        return;
      }
      setPremium(true);
      // The stamp is the server's, so it is read back rather than guessed.
      setAttempt((n) => n + 1);
      onBought?.();
    });
  };

  if (load === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={color.textMuted} />
      </View>
    );
  }

  if (load === 'failed') {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{t.errors.generic}</Text>
        <LinkText
          testID="premium-retry"
          onPress={() => {
            setLoad('loading');
            setAttempt((n) => n + 1);
          }}
        >
          {t.common.retry}
        </LinkText>
      </View>
    );
  }

  return (
    <View style={styles.panel} testID="premium-screen">
      <Text style={styles.kicker}>{t.premium.kicker}</Text>
      <Text style={styles.pitch}>{t.premium.pitch}</Text>
      <Card style={styles.benefits}>
        {t.premium
          .benefits(FREE_DAILY_LIKES, SUPER_LIKES_PER_WEEK)
          .map((line, index, all) => (
            <View key={line} style={styles.benefit}>
              {/* The last line is what a free membership is, not a
                  benefit, so it carries no mark and reads quieter. */}
              <Text
                style={index === all.length - 1 ? styles.note : styles.mark}
              >
                {index === all.length - 1 ? '' : '✦'}
              </Text>
              <Text
                style={
                  index === all.length - 1 ? styles.note : styles.benefitText
                }
              >
                {line}
              </Text>
            </View>
          ))}
      </Card>
      {premium ? (
        <View style={styles.active} testID="premium-active">
          <Text style={styles.ok}>{t.premium.active}</Text>
          {since ? (
            <Text style={styles.hint}>
              {t.premium.since(new Date(since).toLocaleDateString('tr-TR'))}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.buy}>
          <GradientButton
            testID="buy-premium"
            label={buying ? t.premium.buying : t.premium.buy}
            disabled={buying}
            onPress={buy}
          />
          <Text style={styles.hint}>{t.premium.noPayment}</Text>
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: space.md },
  center: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl },
  kicker: { ...type.label, color: color.textFaint },
  pitch: { ...type.heading, color: color.text },
  benefits: { gap: space.sm },
  benefit: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  mark: { ...type.body, color: color.cool },
  benefitText: { ...type.body, color: color.text, flex: 1 },
  note: { ...type.bodySmall, color: color.textFaint, flex: 1 },
  buy: { gap: space.sm, marginTop: space.sm },
  active: { gap: space.xs, marginTop: space.sm },
  ok: { ...type.body, color: color.ok, fontFamily: font.semibold },
  hint: { ...type.bodySmall, color: color.textFaint },
  error: { ...type.body, color: color.danger },
});
