import Svg, { Circle, Path } from 'react-native-svg';
import { color } from '@/theme/tokens';

const TEETH = 8;
const OUTER = 10.2;
const ROOT = 7.6;
/** Half a tooth, in degrees, where it meets the root circle and at its tip. */
const BASE_HALF = 12.5;
const TIP_HALF = 8.5;

/**
 * Settings, as a gear (owner, 2026-09-15: "ayarlar ikonunu dişli yap"). It
 * was three sliders until the discovery filters, which draw the sliders,
 * moved into the same corner of the next tab, and the two had to be told
 * apart. Drawn as an outline with flat-topped teeth and a hole rather than
 * a disc with spokes, which at 26pt would read as one of this app's suns.
 *
 * The outline is computed rather than copied from an icon set, so there is
 * no licence to credit.
 */
export function GearIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      <Path
        d={GEAR}
        stroke={color.textMuted}
        strokeWidth={1.6}
        strokeLinejoin="round"
        fill="none"
      />
      <Circle
        cx={12}
        cy={12}
        r={2.8}
        stroke={color.textMuted}
        strokeWidth={1.6}
        fill="none"
      />
    </Svg>
  );
}

const GEAR = gearPath();

function gearPath(): string {
  const at = (radius: number, degrees: number) => {
    const r = (degrees * Math.PI) / 180;
    return `${fmt(12 + radius * Math.cos(r))} ${fmt(12 + radius * Math.sin(r))}`;
  };
  const step = 360 / TEETH;
  const parts: string[] = [];
  for (let i = 0; i < TEETH; i += 1) {
    const mid = i * step - 90;
    parts.push(
      `${i === 0 ? 'M' : 'L'} ${at(ROOT, mid - BASE_HALF)}`,
      `L ${at(OUTER, mid - TIP_HALF)}`,
      `A ${OUTER} ${OUTER} 0 0 1 ${at(OUTER, mid + TIP_HALF)}`,
      `L ${at(ROOT, mid + BASE_HALF)}`,
      `A ${ROOT} ${ROOT} 0 0 1 ${at(ROOT, mid + step - BASE_HALF)}`,
    );
  }
  return `${parts.join(' ')} Z`;
}

function fmt(value: number): string {
  return value.toFixed(2);
}
