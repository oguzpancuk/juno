import Svg, { Circle, Path } from 'react-native-svg';
import { color } from '@/theme/tokens';

/**
 * The three tab glyphs, drawn rather than imported: an icon font or a set
 * of PNGs would be three dependencies and two more asset sizes for three
 * shapes of a dozen points each.
 *
 * Stroked, never filled — the selected state is carried by colour, which
 * keeps the bar quiet enough to sit under a chart.
 */
export type TabName = 'profile' | 'discover' | 'matches';

const PATHS: Record<TabName, string> = {
  // A head and shoulders.
  profile: 'M4 20c0-3.3 3.6-5.5 8-5.5s8 2.2 8 5.5',
  // The orbit of the mark, reduced to one ring and its two bodies. Tilted
  // like the mark; a level ellipse at this size reads as a blob.
  discover: 'M4.6 14.6a8.6 4.6 0 1 0 14.8-5.2 8.6 4.6 0 1 0-14.8 5.2',
  // A speech bubble with a tail.
  matches:
    'M20 15.2a2.8 2.8 0 0 1-2.8 2.8H8.4L4 21.2V6.8A2.8 2.8 0 0 1 6.8 4h10.4A2.8 2.8 0 0 1 20 6.8z',
};

export function TabIcon({
  name,
  focused,
}: {
  name: TabName;
  focused: boolean;
}) {
  const tint = focused ? color.text : color.textFaint;
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      {name === 'profile' ? (
        <Circle
          cx={12}
          cy={8}
          r={3.8}
          stroke={tint}
          strokeWidth={1.6}
          fill="none"
        />
      ) : null}
      {name === 'discover' ? (
        <>
          <Circle cx={6.1} cy={14.9} r={1.9} fill={tint} />
          <Circle cx={17.9} cy={9.1} r={1.9} fill={tint} />
        </>
      ) : null}
      <Path
        d={PATHS[name]}
        stroke={tint}
        strokeWidth={name === 'discover' ? 1.3 : 1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
