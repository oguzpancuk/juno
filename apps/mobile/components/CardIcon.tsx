import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { color } from '@/theme/tokens';

/**
 * The two glyphs the deck card carries in the corner of its photo, drawn
 * in the same language as `TabIcon`: stroked, never filled, 24 square.
 *
 * `reading` is the band meter the card already shows a few points below,
 * shrunk to an icon — the same three ascending bars, so the button and
 * the thing it opens are recognisably one idea. `person` is the profile
 * tab's own head and shoulders, for the same reason.
 */
export type CardIconName = 'reading' | 'person';

export function CardIcon({ name }: { name: CardIconName }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      {name === 'reading' ? (
        <>
          {/* Ascending, like BandMeter: the shortest is the lit one. */}
          <Rect x={4} y={14} width={4} height={6} rx={1.6} fill={color.pink} />
          <Rect
            x={10}
            y={10}
            width={4}
            height={10}
            rx={1.6}
            fill={color.text}
          />
          <Rect x={16} y={5} width={4} height={15} rx={1.6} fill={color.text} />
        </>
      ) : (
        <>
          <Circle
            cx={12}
            cy={8}
            r={3.8}
            stroke={color.text}
            strokeWidth={1.8}
            fill="none"
          />
          <Path
            d="M4 20c0-3.3 3.6-5.5 8-5.5s8 2.2 8 5.5"
            stroke={color.text}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </>
      )}
    </Svg>
  );
}
