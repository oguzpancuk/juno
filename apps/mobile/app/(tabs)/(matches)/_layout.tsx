import { TabStack } from '@/components/TabStack';

/**
 * See (profile)/_layout.tsx for why this is a static export. The anchor
 * seats the list beneath a cold deep link into a thread or a match. It
 * does NOT apply to an in-app navigate from another tab — those pass
 * `INTO_MATCHES` (lib/routes.ts) so the list is loaded beneath as well.
 */
export const unstable_settings = { initialRouteName: 'matches' };

export default TabStack;
