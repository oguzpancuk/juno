import { TabStack } from '@/components/TabStack';

/**
 * Anchors a cold deep link (or a fresh web tab) into this stack on the
 * tab's own screen, so back from `/settings` is the profile and not the
 * app leaving. Must be a static export: expo-router reads it while
 * building the route table, not at render time.
 */
export const unstable_settings = { initialRouteName: 'profile' };

export default TabStack;
