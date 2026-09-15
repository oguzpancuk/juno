/**
 * What VoiceOver says for a tab whose label the app sets itself.
 *
 * Setting `tabBarAccessibilityLabel` replaces the library's own iOS label,
 * `${label}, tab, ${index + 1} of ${count}` (BottomTabBar), which is the
 * only place a tab's role and position are spoken: the item's role on iOS
 * is a button. So the same words are rebuilt here, English included, so
 * the tab reads like its neighbours, and whatever the app adds comes after
 * (review, 2026-09-15). Elsewhere the platform announces the role and the
 * position itself, and the label is just the name and the addition.
 */
export function tabAccessibilityLabel(
  os: string,
  label: string,
  index: number,
  count: number,
  extra: string,
): string {
  const base =
    os === 'ios' && index >= 0 && count > 0
      ? `${label}, tab, ${index + 1} of ${count}`
      : label;
  return `${base}, ${extra}`;
}
