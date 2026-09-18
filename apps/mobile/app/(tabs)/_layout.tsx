import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabIcon } from '@/components/TabIcon';
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
  const unread = useUnreadTotal(
    session.status === 'signed-in' ? session.session.user.id : null,
  );
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
  return (
    <Tabs
      // Keşfet is the middle tab and the one the app opens on; the order
      // is you, then them, then the ones who answered.
      initialRouteName="(discover)"
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
        // Honestly: with the bar in flow this is a hairline change and
        // very little else. Nothing renders behind an in-flow bar — the
        // scene is opaque and ends above it, the root stack paints
        // `color.bg` behind it — so the blur blurs a flat colour and
        // `glass.sheet` over `color.bg` composites to about three levels
        // of difference. What the owner asked for is the bar letting the
        // sky and the photo through, and that needs content to run *under*
        // it, which is the `position: 'absolute'` version below.
        //
        // In flow, deliberately. Taking it out of flow — `position:
        // 'absolute'`, which is what lets a screen's content run *under* a
        // translucent bar — removes its height from the layout, and three
        // things here are built on the bar being in it: `lib/insets.ts`
        // (a tab screen must not add `insets.bottom`, because the bar
        // already sits below it), the deck's 13pt footer, and the chat
        // composer's keyboard lift, which subtracts the bar's height.
        // Absolute, the deck's ✕ and ♥ land under the bar and it takes
        // their touches — the app's primary action — and the composer goes
        // back under the keyboard, the bug of 2026-09-16. Doing it that
        // way properly means every tab screen padding itself by
        // `useBottomTabBarHeight()`; until that is done the bar stays
        // where the rest of the app expects it, and only the material
        // changes.
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
            navigation as { getState(): { routes: readonly { key: string }[] } }
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
  );
}
