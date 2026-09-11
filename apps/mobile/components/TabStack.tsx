import { Stack } from 'expo-router';
import { color } from '@/theme/tokens';

/**
 * The stack inside each tab. Every signed-in screen is pushed onto one of
 * these rather than onto the root, so the tab bar stays under it — the
 * owner's rule of 2026-09-11 that the bar is on every page — and the root
 * stack holds exactly one signed-in route, `(tabs)`. That second property
 * is what lets `leaveToSignIn` leave nothing signed-in under sign-in
 * (docs/NOTES.md 2026-09-11, the two-navigator bug). It holds as long as
 * no handler makes two router calls into the tab tree at once; see
 * app/onboarding.tsx for why.
 *
 * One component rather than three copies, because a nested native stack
 * with no `contentStyle` flashes white between pushes and the omission
 * would be silent.
 */
export function TabStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.bg },
      }}
    />
  );
}
