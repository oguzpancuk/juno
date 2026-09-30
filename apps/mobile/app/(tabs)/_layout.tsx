import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CosmicGround } from '@/components/CosmicGround';
import { TabIcon } from '@/components/TabIcon';
import { useConsentGate } from '@/lib/consent';
import { useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { tabAccessibilityLabel } from '@/lib/tab-a11y';
import { useUnreadTotal } from '@/lib/unread';
import { badgeText } from '@/lib/unread-count';
import { color, font, glass, space, type } from '@/theme/tokens';

/**
 * The three places the app lives: you, the deck, the people you matched
 * with. Everything else is pushed on top of one of them — inside its
 * tab, on the stack each group directory declares, so the bar stays
 * under every screen (owner, 2026-09-11).
 *
 * Settings is deliberately not a tab — it is opened from the profile, a
 * handful of times in an account's life, and a fourth tab would spend a
 * permanent quarter of the bar on it.
 */
/** React Navigation's UIKit tab row, above the home-indicator inset. */
const TAB_ROW = 49;
/**
 * Where the drawn icon-and-label sits in that row with no padding of ours:
 * its vertical centre, measured on an iPhone (icon top 10.7pt below the
 * bar's border, label bottom 47pt). The library lays the item out from the
 * top (`justifyContent: 'flex-start'`), so centring is an offset from here.
 */
const ITEM_CENTRE = 28.85;
/**
 * How much of the bottom inset reads as the home indicator's own strip
 * rather than part of the bar: enough to lift the items off dead centre.
 */
const INDICATOR_STRIP = 14;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const session = useSession();
  const userId =
    session.status === 'signed-in' ? session.session.user.id : null;
  // Every tab stands behind the current privacy notice (lib/consent.ts):
  // nothing inside mounts, and so nothing reads or writes, until the
  // member's record is known to be current.
  const consent = useConsentGate(userId);
  // The badge's count is a read inside the gate too.
  const unread = useUnreadTotal(consent === 'current' ? userId : null);
  const badge = badgeText(unread);
  // The bar keeps its standard height, but its row is given all of it
  // rather than stopping above the home indicator, and the items are
  // pushed down to its middle (owner, 2026-09-15: "tam ortalamalı"). With
  // no inset — a phone without a home indicator — the offset clamps to 0
  // and the bar is the standard one.
  //
  // iOS only. Android draws its navigation bar over the bottom inset and
  // takes the touches there, so a label pushed into it would sit under the
  // back and home buttons (review, 2026-09-15); there the items keep the
  // library's own place, above the inset.
  const centred = Platform.OS === 'ios';
  /**
   * A browser usually reports no inset, and then the row ends flush with
   * the window and the labels sit on its edge; a small pad lifts them off
   * it. It is not a stand-in for a phone's strip — that is 34, and
   * INDICATOR_STRIP is 14 — just enough air under a label. Where
   * the web DOES report an inset (a page added to an iOS home screen) it
   * is the larger and wins, so the contract `lib/insets.ts` relies on
   * (the bar is `TAB_ROW + inset` tall and pads by that inset) holds on
   * every target.
   */
  const bottomInset =
    Platform.OS === 'web' ? Math.max(insets.bottom, space.xs) : insets.bottom;
  const barHeight = TAB_ROW + bottomInset;
  // Centred in the bar, less the strip the home indicator draws in: dead
  // centre of the whole bar reads as too low, because the bottom of it is
  // the indicator's, and the top of the 49pt row alone reads as too high
  // (owner, 2026-09-15 and 2026-09-16 — both measured on the device).
  const itemOffset = centred
    ? Math.max(0, Math.round((barHeight - INDICATOR_STRIP) / 2 - ITEM_CENTRE))
    : 0;
  /**
   * The sky behind the navigator: the part of it under the bar is what the
   * bar's glass shows, and its overhang is what a phone's browser shows
   * below the page. Every scene is opaque and draws its own sky over the
   * rest, so this one is only ever seen from the bar's top edge down —
   * which is why it has no falling star.
   *
   * Web only. The strip below the page is a browser's, and whether this
   * reads through the native bar has not been looked at on a device; a
   * second animated sky is not something to mount on a phone on a guess.
   */
  const underBar =
    Platform.OS === 'web' ? (
      <CosmicGround planet={false} horizon={false} star={false} />
    ) : null;
  return (
    <View style={styles.host}>
      {underBar}
      <Tabs
        // Keşfet is the middle tab and the one the app opens on; the order
        // is you, then them, then the ones who answered.
        initialRouteName="(discover)"
        // Behind the notice gate (lib/consent.ts), no screen mounts: the
        // navigator does, so a URL into a tab keeps its place, but each
        // screen is replaced by a spinner until the member's record is
        // known to be current. Holding back the whole navigator instead
        // lost the URL — it mounted later, on its initial route.
        screenLayout={({ children }) =>
          consent === 'current' ? (
            <>{children}</>
          ) : (
            <View style={[styles.host, styles.waiting]} testID="consent-gate">
              <ActivityIndicator color={color.textMuted} />
            </View>
          )
        }
        // Not the default `firstRoute`, which is `profile` by declaration
        // order: Android back from the tab the app opens on would switch to
        // a tab nobody had visited instead of leaving the app.
        backBehavior="initialRoute"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: color.text,
          tabBarInactiveTintColor: color.textFaint,
          // The popup's tint and hairline (owner, 2026-09-18: "alt tabin de
          // biraz saydam olmasını istiyorum, bütünlüğü bozmasın").
          //
          // What shows through it is the sky under the whole navigator
          // (`underBar`, above), not the screen's own. The library clips its
          // scenes above the bar (`styles.screens`, `overflow: 'hidden'`,
          // not an option), so a screen's sky stops at the bar's top edge
          // whatever it does; the one behind the navigator does not, and
          // runs on under the bar and past the page's bottom edge, into the
          // strip a phone's browser keeps for its toolbar. See OVERHANG in
          // `CosmicGround`.
          //
          // In flow, deliberately. Taking the bar out of flow — `position:
          // 'absolute'`, the usual way to let content run under a
          // translucent bar — removes its height from the layout, and three
          // things here are built on the bar being in it: `lib/insets.ts`
          // (a tab screen must not add `insets.bottom`, because the bar
          // already sits below it), the deck's 13pt footer, and the chat
          // composer's keyboard lift, which subtracts the bar's height.
          // Absolute, the deck's ✕ and ♥ land under the bar and it takes
          // their touches — the app's primary action — and the composer goes
          // back under the keyboard, the bug of 2026-09-16. A sky behind the
          // navigator gets the look without any of that: it is paint, it
          // takes no touches and no space.
          tabBarStyle: {
            backgroundColor: glass.sheet,
            borderTopColor: glass.edge,
            borderTopWidth: 1,
            height: barHeight,
            paddingBottom: centred ? 0 : bottomInset,
          },
          tabBarBackground: () => (
            <BlurView
              intensity={40}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ),
          tabBarLabelStyle: {
            ...type.caption,
            fontSize: 11,
            // why: on the web react-navigation's label box collapses to the
            // font's content area — 10pt under an 11pt face — and its own
            // `overflow: hidden` then cut the cedilla off "Keşfet" and
            // "Eşleşmeler" (measured in the browser, 2026-09-16). Showing
            // the box is what fixes it, at the price of the ellipsis RNW
            // would have drawn: the three labels are single Turkish words
            // that fit a third of the narrowest bar, and this app ships one
            // locale (PRD). Web only, so the metrics ITEM_CENTRE was
            // measured against are untouched.
            ...(Platform.OS === 'web' ? { overflow: 'visible' as const } : {}),
          },
          tabBarItemStyle: { paddingTop: itemOffset },
          sceneStyle: { backgroundColor: color.bg },
        }}
      >
        <Tabs.Screen
          name="(profile)"
          options={{
            title: t.tabs.profile,
            tabBarIcon: ({ focused }) => (
              <TabIcon name="profile" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="(discover)"
          options={{
            title: t.tabs.discover,
            tabBarIcon: ({ focused }) => (
              <TabIcon name="discover" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="(matches)"
          options={({ route, navigation }) => {
            // why: expo-router types the navigation handed to a screen's
            // options as `any`; its state here is the tab navigator's, the
            // same route list the bar numbers its tabs from.
            const { routes } = (
              navigation as {
                getState(): { routes: readonly { key: string }[] };
              }
            ).getState();
            return {
              title: t.tabs.matches,
              tabBarIcon: ({ focused }) => (
                <TabIcon name="matches" focused={focused} />
              ),
              // Unread messages across every thread, on the icon's top-right
              // corner (owner, 2026-09-15). The list's per-thread badge
              // colours, so the two read as the same count.
              tabBarBadgeStyle: {
                backgroundColor: color.cool,
                color: color.onBright,
                fontFamily: font.semibold,
              },
              // Spread rather than set to undefined: the option types are
              // exact. The badge itself is not announced, so with a count the
              // tab's label says it, after the role and position the library
              // would have said (see `tabAccessibilityLabel`).
              ...(badge === undefined
                ? {}
                : {
                    tabBarBadge: badge,
                    tabBarAccessibilityLabel: tabAccessibilityLabel(
                      Platform.OS,
                      t.tabs.matches,
                      routes.findIndex((r) => r.key === route.key),
                      routes.length,
                      t.tabs.unread(unread),
                    ),
                  }),
            };
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1, backgroundColor: color.bg },
  waiting: { alignItems: 'center', justifyContent: 'center' },
});
