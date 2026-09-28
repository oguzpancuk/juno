/**
 * Every colour, size and radius in the app (ROADMAP: tokens live in one
 * file). Derived from the owner's design of 2026-09-11: a night sky, warm
 * peach falling into cool lavender, generous cards on near-black.
 *
 * Nothing outside this file may hold a hex value.
 */

export const color = {
  /**
   * The ground. Blue-black, never neutral grey.
   *
   * `apps/mobile/app.json` repeats this value for the splash and the
   * Android adaptive icon, because Expo reads those before any JavaScript
   * runs. It is the one place outside this file that holds a colour, and
   * the two have to be changed together or the app flashes one shade on
   * launch and paints another.
   */
  bg: '#07060F',
  /** A card on that ground: barely lighter, lifted by its border. */
  surface: '#12101F',
  surfaceSoft: '#171528',
  /** For a card that sits on top of another card. */
  surfaceHigh: '#1D1B31',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.14)',
  /** The unfilled part of a meter. */
  track: 'rgba(255,255,255,0.13)',
  /** `bg` with alpha, for a scrim over a photo. */
  scrim: 'rgba(7,6,15,0.55)',

  text: '#F6F3FF',
  textMuted: '#9E97BD',
  /**
   * The quietest text that is still text: hints, kickers, the consent
   * line. 4.77:1 on `surfaceHigh`, the lightest ground it is printed on,
   * and 5.74:1 on `bg` — `tokens.test.ts` holds every text token to 4.5.
   * The previous #6E6890 read at 3.2–3.9 and was carried as a palette
   * debt from C7 until the visual pass (ROADMAP D1).
   */
  textFaint: '#8A84AD',

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

/**
 * A sign's element as a colour, for the big-three badges (owner,
 * 2026-09-16: the sheet's chart page sets each sign's symbol in its own
 * colour, large, in a tinted circle). Ink for the glyph, tint for the
 * circle behind it — the tint is the ink at low alpha, kept here as a
 * literal because nothing outside this file may hold a colour.
 */
/**
 * Glass: a surface the sky shows through — a translucent fill and a
 * hairline, the shape of the match page's starter box, which the owner
 * pointed at after three rounds of blurred glass (2026-09-16). Only the
 * sheet blurs, because it sits over a photo.
 */
export const glass = {
  fill: 'rgba(18,16,31,0.3)',
  /**
   * A sheet over a screen: denser than a card and blurred, because what
   * is under it is a page of text and a photo, not the sky. The blur is
   * what keeps the deck from reading through; the tint alone did not, at
   * any alpha that still looked like glass (seen 2026-09-16).
   */
  sheet: 'rgba(12,10,22,0.66)',
  fillSoft: 'rgba(23,21,40,0.4)',
  fillHigh: 'rgba(29,27,49,0.55)',
  edge: 'rgba(255,255,255,0.1)',
} as const;

/**
 * A colour per body, for glyphs (owner, 2026-09-16: aspects coloured
 * "hem açılara hem gezegenlere göre"). Traditional where a tradition
 * exists — a gold Sun, a silver Moon, a red Mars — and kept inside the
 * palette's warmth otherwise. Glyphs only, at 17pt and up; none of these
 * is body text.
 */
export const planet = {
  sun: '#F7C98C',
  moon: '#DCE0F7',
  mercury: '#8CD7E0',
  venus: '#E98FA0',
  mars: '#F08A6C',
  jupiter: '#C9A0FF',
  saturn: '#C4B594',
  uranus: '#8CC8E0',
  neptune: '#A78BFA',
  pluto: '#B989A8',
  ascendant: '#F6F3FF',
} as const;

/**
 * An aspect's kind as a colour: the flowing ones, the ones with friction
 * (a dynamic, never a fault — ADR-0009), and the conjunction, which is
 * neither. Ink for the aspect's symbol and tint for the card's pill.
 */
export const aspectTone = {
  harmony: { ink: color.ok, tint: 'rgba(140,224,176,0.16)' },
  tension: { ink: color.tense, tint: 'rgba(201,160,255,0.16)' },
  conjunction: { ink: color.coolLight, tint: 'rgba(201,182,255,0.14)' },
} as const;

export const element = {
  fire: { ink: color.warm, tint: 'rgba(247,169,140,0.24)' },
  earth: { ink: color.ok, tint: 'rgba(140,224,176,0.2)' },
  air: { ink: color.coolLight, tint: 'rgba(201,182,255,0.2)' },
  water: { ink: color.cool, tint: 'rgba(167,139,250,0.24)' },
} as const;

/**
 * Colours that belong to someone else's brand, not this palette: Google's
 * sign-in button (light theme) and its four-colour "G", as its branding
 * guidelines give them. They are never tinted to match the app.
 */
export const googleBrand = {
  fill: '#FFFFFF',
  stroke: '#747775',
  text: '#1F1F1F',
  red: '#EA4335',
  blue: '#4285F4',
  yellow: '#FBBC05',
  green: '#34A853',
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
 * The typeface: Outfit, the geometric sans the sheet is set in (owner,
 * 2026-09-16), loaded by the root layout from `@expo-google-fonts/outfit`.
 * A weight is a face of its own — `fontWeight` does not pick one once a
 * family is named, on iOS or in react-native-web — so every text style
 * names its face here and nothing outside this file sets `fontWeight`.
 * There is no bold: the sheet stops at medium for titles and semibold
 * for a strong word inside running text.
 */
export const font = {
  light: 'Outfit_300Light',
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
} as const;

/**
 * Light weights and open leading; the design leans on space, not on bold.
 * Kickers are pre-uppercased in `strings.ts` — RN's textTransform maps
 * Turkish i to I, not İ — so nothing here sets textTransform.
 */
export const type = {
  display: {
    fontFamily: font.medium,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.4,
  },
  title: {
    fontFamily: font.medium,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  heading: { fontFamily: font.medium, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 23 },
  bodySmall: { fontFamily: font.regular, fontSize: 13.5, lineHeight: 20 },
  // About 0.2 em: the sheet's kickers are set wide enough to read as a
  // rule above the section, not as a word.
  label: { fontFamily: font.medium, fontSize: 11.5, letterSpacing: 2.4 },
  caption: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17 },
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
