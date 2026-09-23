import Svg, { Path, Rect } from 'react-native-svg';
import { color } from '@/theme/tokens';

/**
 * The glyph that stands in for a profile fact's name: a ruler for the
 * height, a briefcase for the occupation, a mortarboard for the school
 * (owner, 2026-09-23: "taglerle degil sembollerle gosterelim").
 *
 * Drawn rather than imported, the way `TabIcon` and `SlidersIcon` are:
 * an icon font or a set of PNGs would be a dependency and two more asset
 * sizes for three shapes of a dozen points each.
 *
 * Stroked and muted to match the line of text beside it — these label a
 * value, they are not the thing being read.
 */
export type DetailIconName = 'height' | 'occupation' | 'university';

export function DetailIcon({
  name,
  size = 17,
}: {
  name: DetailIconName;
  size?: number;
}) {
  const stroke = color.textMuted;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'height' ? (
        <>
          {/* A ruler stood on its end, which is the way a height is read. */}
          <Rect
            x={7.2}
            y={2.4}
            width={9.6}
            height={19.2}
            rx={2.2}
            stroke={stroke}
            strokeWidth={1.6}
            fill="none"
          />
          {/* Graduations: long, short, long, short, off the left edge. */}
          <Path
            d="M7.2 6.9h4.4M7.2 10.5h2.6M7.2 14.1h4.4M7.2 17.7h2.6"
            stroke={stroke}
            strokeWidth={1.5}
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : null}
      {name === 'occupation' ? (
        <>
          <Rect
            x={2.8}
            y={7.4}
            width={18.4}
            height={12.2}
            rx={2.4}
            stroke={stroke}
            strokeWidth={1.6}
            fill="none"
          />
          {/* The handle, and the seam the lid makes across the front. */}
          <Path
            d="M9 7.4V5.9A1.4 1.4 0 0 1 10.4 4.5h3.2A1.4 1.4 0 0 1 15 5.9v1.5M2.8 12.6h18.4"
            stroke={stroke}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </>
      ) : null}
      {name === 'university' ? (
        <Path
          // The board seen from a corner, and the head under it.
          d="M12 4.2 2.6 8.7 12 13.2l9.4-4.5zM6.4 10.9v4.6c0 1.6 2.5 2.9 5.6 2.9s5.6-1.3 5.6-2.9v-4.6"
          stroke={stroke}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ) : null}
    </Svg>
  );
}
