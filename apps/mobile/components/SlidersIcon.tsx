import Svg, { Circle, Path } from 'react-native-svg';
import { color } from '@/theme/tokens';

/**
 * Settings: three sliders, not a gear. A gear at this size is a circle
 * with eight spokes, which is also a sun — and this app draws real suns.
 */
export function SlidersIcon({ fill = color.surfaceSoft }: { fill?: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      <Path
        d="M3.5 7h17M3.5 12h17M3.5 17h17"
        stroke={color.textMuted}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Circle cx={9} cy={7} r={2.4} fill={fill} />
      <Circle
        cx={9}
        cy={7}
        r={2.4}
        stroke={color.textMuted}
        strokeWidth={1.6}
        fill="none"
      />
      <Circle cx={15.5} cy={12} r={2.4} fill={fill} />
      <Circle
        cx={15.5}
        cy={12}
        r={2.4}
        stroke={color.textMuted}
        strokeWidth={1.6}
        fill="none"
      />
      <Circle cx={7.5} cy={17} r={2.4} fill={fill} />
      <Circle
        cx={7.5}
        cy={17}
        r={2.4}
        stroke={color.textMuted}
        strokeWidth={1.6}
        fill="none"
      />
    </Svg>
  );
}
