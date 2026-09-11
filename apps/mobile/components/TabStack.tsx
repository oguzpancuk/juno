import { Stack } from 'expo-router';
import { color } from '@/theme/tokens';

/**
 * The stack inside each tab. Every signed-in screen is pushed onto one of
 * these rather than onto the root, so the tab bar stays under it — the
 * owner's rule of 2026-09-11 that the bar is on every page — and the root
 * stack holds exactly one signed-in route, `(tabs)`. That second property
 * is what makes `leaveToSignIn` land on a one-route stack by construction
 * (docs/NOTES.md 2026-09-11, the two-navigator bug).
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
