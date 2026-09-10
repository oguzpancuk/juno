/**
 * Every colour, size and radius in the app (ROADMAP: tokens live in one
 * file). Derived from the owner's design of 2026-09-11: a night sky, warm
 * peach falling into cool lavender, generous cards on near-black.
 *
 * Nothing outside this file may hold a hex value.
 */

export const color = {
  /** The ground. Blue-black, never neutral grey. */
  bg: '#07060F',
  /** A card on that ground: barely lighter, lifted by its border. */
  surface: '#12101F',
  surfaceSoft: '#171528',
  /** For a card that sits on top of another card. */
  surfaceHigh: '#1D1B31',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.14)',

  text: '#F6F3FF',
  textMuted: '#9E97BD',
  textFaint: '#6E6890',

  /** The mark's two spheres, and the ends of every gradient. */
  warm: '#F7A98C',
  pink: '#E98FA0',
  cool: '#A78BFA',
  coolLight: '#C9B6FF',
  /** A message from you: the cool end of the gradient, dimmed. */
  mine: '#3B2F7A',

  danger: '#FF8A8A',
  disabled: '#2A2647',
  ok: '#8CE0B0',
  dangerSurface: '#3A1620',
  /** Text on a gradient or a light fill — the one near-black we print on. */
  onBright: '#1A1226',
  /** A tense aspect is a dynamic, not a fault — it never gets danger. */
  tense: '#C9A0FF',
} as const;

/** Warm → pink → cool. The product's one gradient; do not invent another. */
export const gradient = [color.warm, color.pink, color.cool] as const;
export const gradientSoft = ['#2A1E33', '#1B1830', '#15182E'] as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

/**
 * Light weights and open leading; the design leans on space, not on bold.
 * Kickers are pre-uppercased in `strings.ts` — RN's textTransform maps
 * Turkish i to I, not İ — so nothing here sets textTransform.
 */
export const type = {
  display: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  title: { fontSize: 25, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 19, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodySmall: { fontSize: 13.5, fontWeight: '400', lineHeight: 20 },
  label: { fontSize: 11.5, fontWeight: '600', letterSpacing: 1.4 },
  caption: { fontSize: 12.5, fontWeight: '400' },
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
} as const;
