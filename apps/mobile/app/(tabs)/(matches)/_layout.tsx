import { TabStack } from '@/components/TabStack';

/**
 * See (profile)/_layout.tsx for why this is a static export. The anchor
 * matters most here: a match arriving over Realtime while the app is cold
 * deep-links straight into a thread, and back from it must be the list.
 */
export const unstable_settings = { initialRouteName: 'matches' };

export default TabStack;
