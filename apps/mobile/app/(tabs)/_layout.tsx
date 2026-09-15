import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabIcon } from '@/components/TabIcon';
import { useSession } from '@/lib/session';
import { t } from '@/lib/strings';
import { useUnreadTotal } from '@/lib/unread';
import { badgeText } from '@/lib/unread-count';
import { color, type } from '@/theme/tokens';

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
  const barHeight = TAB_ROW + insets.bottom;
  const itemOffset = centred
    ? Math.max(0, Math.round(barHeight / 2 - ITEM_CENTRE))
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
        tabBarStyle: {
          backgroundColor: color.bg,
          borderTopColor: color.border,
          borderTopWidth: 1,
          height: barHeight,
          paddingBottom: centred ? 0 : insets.bottom,
        },
        tabBarLabelStyle: { ...type.caption, fontSize: 11 },
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
        options={{
          title: t.tabs.matches,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="matches" focused={focused} />
          ),
          // Unread messages across every thread, on the icon's top-right
          // corner (owner, 2026-09-15). The list's per-thread badge colours,
          // so the two read as the same count.
          tabBarBadgeStyle: {
            backgroundColor: color.cool,
            color: color.onBright,
            fontWeight: '700',
          },
          // Spread rather than set to undefined: the option types are exact.
          // The badge itself is not announced, so with a count the tab's
          // label says it; without one, the library's own label stands.
          ...(badge === undefined
            ? {}
            : {
                tabBarBadge: badge,
                tabBarAccessibilityLabel: t.tabs.matchesUnread(unread),
              }),
        }}
      />
    </Tabs>
  );
}
