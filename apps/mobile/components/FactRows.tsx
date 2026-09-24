import { StyleSheet, Text, View } from 'react-native';
import { DetailIcon, type DetailIconName } from '@/components/DetailIcon';
import { shortSchool, type ProfileDetails } from '@/lib/profile-details';
import { t } from '@/lib/strings';
import { color, space, type } from '@/theme/tokens';

/**
 * The facts that sit under a name, each with the glyph that says which
 * fact it is (owner, 2026-09-23: "su sekilde ismin hemen altinda olsun.
 * taglerle degil sembollerle gosterelim"). Unanswered ones are simply
 * absent: with no column to hold open there is nothing for a dash to
 * stand in for, which is the trade he took when he picked this shape over
 * the labelled columns it replaced.
 *
 * Drawn on the profile sheet and on the deck's card alike (owner,
 * 2026-09-23: "kesfette de alanlar profil goruntusundeki gibi olsun"),
 * which is why this is its own file rather than a piece of `ProfileView`:
 * the two surfaces are supposed to be the same card, and a copy of this
 * block in each is two things to keep agreeing.
 *
 * The `label` never reaches the screen. It is what a screen reader hears
 * in the glyph's place, because a picture of a mortarboard says nothing
 * to it and "Boğaziçi Ü." alone does not say it is a school.
 */
interface FactRow {
  readonly key: DetailIconName;
  readonly label: string;
  readonly value: string;
  /**
   * What a screen reader says in place of `value`. They differ for the
   * school: `shortSchool` exists because a line has a width and
   * "Üniversitesi" spends most of it, and speech has no width — "Ü." is
   * read out as a letter and a period.
   */
  readonly spoken: string;
}

export function factRows(details: ProfileDetails): readonly FactRow[] {
  const height =
    details.height_cm === null
      ? null
      : t.profile.heightValue(details.height_cm);
  const rows: readonly {
    key: DetailIconName;
    label: string;
    value: string | null;
    spoken: string | null;
  }[] = [
    {
      key: 'height' as const,
      label: t.profile.height,
      value: height,
      spoken: height,
    },
    {
      key: 'occupation' as const,
      label: t.profile.occupation,
      value: details.occupation,
      spoken: details.occupation,
    },
    {
      key: 'university' as const,
      label: t.profile.universityColumn,
      // Short wherever it is drawn (owner, 2026-09-23: "profilde de
      // kisaltalim"): "Üniversitesi" is most of what a school name spends
      // a line on while saying nothing about which school it is. The
      // editor still holds the name as it was typed; this is the drawing,
      // and `spoken` is the one reader the width argument does not apply
      // to.
      value:
        details.university === null ? null : shortSchool(details.university),
      spoken: details.university,
    },
  ];
  return rows.filter((row): row is FactRow => row.value !== null);
}

export function FactRows({
  details,
  maxFontSizeMultiplier,
}: {
  details: ProfileDetails;
  /**
   * The deck's ceiling on Dynamic Type. That card may not grow — it has
   * to fit one screen with nothing to scroll into — and these rows are
   * inside its photo, so text that grew without limit would climb over
   * the name. The sheets, which scroll, pass nothing and serve every
   * size.
   */
  maxFontSizeMultiplier?: number | undefined;
}) {
  const rows = factRows(details);
  if (rows.length === 0) return null;
  return (
    <View style={styles.rows} testID="profile-facts">
      {rows.map((row) => (
        <View key={row.key} style={styles.row} testID={`fact-${row.key}`}>
          <DetailIcon name={row.key} />
          {/* Never onto a second line (owner, 2026-09-23: "meslek ve okul
              asla alt satira tasmasin"). A row has the whole width here,
              so only a very long occupation reaches the end of one. */}
          <Text
            style={styles.text}
            numberOfLines={1}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
            accessibilityLabel={`${row.label}: ${row.spoken}`}
          >
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // A small gap above the first row: they belong to the name above them,
  // not to the picture behind them.
  rows: { gap: 2, marginTop: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  // `flexShrink` so the text, not the row, is what runs out of width; the
  // glyph keeps its size and the name above keeps its place.
  text: { ...type.bodySmall, color: color.textMuted, flexShrink: 1 },
});
