import { Tabs } from 'expo-router';
import { TabIcon } from '@/components/TabIcon';
import { t } from '@/lib/strings';
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
export default function TabLayout() {
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
        },
        tabBarLabelStyle: { ...type.caption, fontSize: 11 },
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
        }}
      />
    </Tabs>
  );
}
