/**
 * The welcome screen's sizes, apart from the screen so Vitest can drive
 * them (`welcome.tsx` imports React Native). Only `theme/tokens`.
 */
import { space } from '../theme/tokens';

/**
 * How the door is sized for the room it gets.
 *
 * The page a phone's browser hands over is much shorter than the phone:
 * 665 of 874 points on the owner's iPhone in Safari (docs/NOTES.md,
 * 2026-09-21), against about 780 between the status bar and the home
 * indicator in the app. At the one size the door had, its content was
 * about 840 tall, so in Safari the gaps closed to nothing and the consent
 * line and the legal link ran on under the toolbar (owner, 2026-09-29:
 * "sıkışık olmamalı, web de ios da aynı gözükmeli").
 *
 * So the door scales with the room left once the insets are taken off —
 * the same number on both targets, since a browser's insets are zero where
 * it has already cleared its own bars. From SHORT up to TALL the mark, the
 * wordmark, the headline's leading and the edges grow from the compact
 * size to the one the door was drawn at; the order and the buttons never
 * change. What is left over goes to the gaps between hero, headline and
 * buttons, and a screen too short even for the compact door — a small
 * phone at a large text size — scrolls rather than overlaps.
 */
const SHORT = 680;
const TALL = 860;
type DoorSize = {
  mark: number;
  wordmark: number;
  gap: number;
  leading: number;
  top: number;
  bottom: number;
  horizonRise: number;
};

const COMPACT: DoorSize = {
  mark: 80,
  wordmark: 38,
  gap: space.sm,
  leading: 30,
  top: space.md,
  // The horizon's rise and the clearance under the legal link move
  // together: the curve stays under the link, never through it.
  bottom: space.md,
  horizonRise: 0.02,
};
const DRAWN: DoorSize = {
  mark: 132,
  wordmark: 46,
  gap: space.md,
  leading: 34,
  top: space.xl,
  bottom: 48,
  horizonRise: 0.05,
};

export function doorSize(room: number): DoorSize {
  const k = Number.isFinite(room)
    ? Math.min(1, Math.max(0, (room - SHORT) / (TALL - SHORT)))
    : 0;
  const at = (key: keyof DoorSize) =>
    COMPACT[key] + (DRAWN[key] - COMPACT[key]) * k;
  const whole = (key: keyof DoorSize) => Math.round(at(key));
  return {
    mark: whole('mark'),
    wordmark: whole('wordmark'),
    gap: whole('gap'),
    leading: whole('leading'),
    top: whole('top'),
    bottom: whole('bottom'),
    horizonRise: at('horizonRise'),
  };
}
