import type { Planet } from './bodies';
import type { Aspect, Body, InterAspect } from './compatibility';
import type { Sign } from './signs';

/** Turkish display names. UI strings live with the data they name. */
export const PLANET_TR: Readonly<Record<Planet, string>> = {
  sun: 'Güneş',
  moon: 'Ay',
  mercury: 'Merkür',
  venus: 'Venüs',
  mars: 'Mars',
  jupiter: 'Jüpiter',
  saturn: 'Satürn',
  uranus: 'Uranüs',
  neptune: 'Neptün',
  pluto: 'Plüton',
};

export const SIGN_TR: Readonly<Record<Sign, string>> = {
  aries: 'Koç',
  taurus: 'Boğa',
  gemini: 'İkizler',
  cancer: 'Yengeç',
  leo: 'Aslan',
  virgo: 'Başak',
  libra: 'Terazi',
  scorpio: 'Akrep',
  sagittarius: 'Yay',
  capricorn: 'Oğlak',
  aquarius: 'Kova',
  pisces: 'Balık',
};

/** Locative form ("Koç'ta", "Yengeç'te") for "X is in Y" sentences. */
export const SIGN_TR_LOCATIVE: Readonly<Record<Sign, string>> = {
  aries: "Koç'ta",
  taurus: "Boğa'da",
  gemini: "İkizler'de",
  cancer: "Yengeç'te",
  leo: "Aslan'da",
  virgo: "Başak'ta",
  libra: "Terazi'de",
  scorpio: "Akrep'te",
  sagittarius: "Yay'da",
  capricorn: "Oğlak'ta",
  aquarius: "Kova'da",
  pisces: "Balık'ta",
};

/** Degrees within a sign as astrologers write it, e.g. 21°08′. */
export function formatDegree(degree: number): string {
  const whole = Math.floor(degree);
  const minutes = Math.floor((degree - whole) * 60);
  return `${whole}°${String(minutes).padStart(2, '0')}′`;
}

export const BODY_TR: Readonly<Record<Body, string>> = {
  ...PLANET_TR,
  ascendant: 'Yükselen',
};

/** "Güneş'in" — possessive, for "your X". */
const BODY_TR_GENITIVE: Readonly<Record<Body, string>> = {
  sun: "Güneş'in",
  moon: "Ay'ın",
  mercury: "Merkür'ün",
  venus: "Venüs'ün",
  mars: "Mars'ın",
  jupiter: "Jüpiter'in",
  saturn: "Satürn'ün",
  uranus: "Uranüs'ün",
  neptune: "Neptün'ün",
  pluto: "Plüton'un",
  ascendant: "Yükselen'in",
};

/** "Venüs'üyle" — "with their X". */
const BODY_TR_WITH: Readonly<Record<Body, string>> = {
  sun: "Güneş'iyle",
  moon: "Ay'ıyla",
  mercury: "Merkür'üyle",
  venus: "Venüs'üyle",
  mars: "Mars'ıyla",
  jupiter: "Jüpiter'iyle",
  saturn: "Satürn'üyle",
  uranus: "Uranüs'üyle",
  neptune: "Neptün'üyle",
  pluto: "Plüton'uyla",
  ascendant: "Yükselen'iyle",
};

export const ASPECT_TR: Readonly<Record<Aspect, string>> = {
  conjunction: 'kavuşum',
  sextile: 'altmışlık',
  square: 'kare',
  trine: 'üçgen',
  opposition: 'karşıt',
};

const ASPECT_VERB_TR: Readonly<Record<Aspect, string>> = {
  conjunction: 'kavuşuyor',
  sextile: 'altmışlık açı yapıyor',
  square: 'kare açı yapıyor',
  trine: 'üçgen açı yapıyor',
  opposition: 'karşıt açı yapıyor',
};

/**
 * One-line "why" for the swipe card, from the caller's point of view:
 * "Güneş'in onun Venüs'üyle üçgen açı yapıyor."
 */
export function describeAspectTr(
  aspect: Pick<InterAspect, 'planetA' | 'aspect' | 'planetB'>,
): string {
  const { planetA, planetB } = aspect;
  if (aspect.aspect === 'opposition') {
    // ADR-0003 amendment 1: an opposition to the Ascendant is a Descendant
    // conjunction; the headline must not call a harmonious contact "karşıt".
    if (planetA === 'ascendant' && planetB === 'ascendant')
      return "Yükselenleriniz birbirinin Alçalan'ında.";
    if (planetB === 'ascendant')
      return `${BODY_TR_GENITIVE[planetA]} onun Alçalan'ında.`;
    if (planetA === 'ascendant')
      return `Onun ${BODY_TR_POSSESSIVE[planetB]} senin Alçalan'ında.`;
  }
  return `${BODY_TR_GENITIVE[planetA]} onun ${BODY_TR_WITH[planetB]} ${ASPECT_VERB_TR[aspect.aspect]}.`;
}

/**
 * Natal aspect card title: "Venüs kare Mars". An opposition to the
 * Ascendant is a Descendant placement (ADR-0003 amendment 1) and is
 * titled that way so the title agrees with the text below it.
 */
export function natalAspectTitleTr(
  aspect: Pick<InterAspect, 'planetA' | 'aspect' | 'planetB'>,
): string {
  if (aspect.aspect === 'opposition') {
    if (aspect.planetB === 'ascendant')
      return `${BODY_TR[aspect.planetA]} Alçalan'da`;
    if (aspect.planetA === 'ascendant')
      return `${BODY_TR[aspect.planetB]} Alçalan'da`;
  }
  return `${BODY_TR[aspect.planetA]} ${ASPECT_TR[aspect.aspect]} ${BODY_TR[aspect.planetB]}`;
}

/** Third-person possessive: "onun Ay'ı", "onun Venüs'ü". */
const BODY_TR_POSSESSIVE: Readonly<Record<Body, string>> = {
  sun: "Güneş'i",
  moon: "Ay'ı",
  mercury: "Merkür'ü",
  venus: "Venüs'ü",
  mars: "Mars'ı",
  jupiter: "Jüpiter'i",
  saturn: "Satürn'ü",
  uranus: "Uranüs'ü",
  neptune: "Neptün'ü",
  pluto: "Plüton'u",
  ascendant: "Yükselen'i",
};

/**
 * Astrological glyphs, for the aspect line on a card: `♀ △ ♂`. The mockups
 * of 2026-09-11 put these next to every aspect, and they carry the
 * "show the calculation" rule better than the word does — a reader who
 * knows astrology reads the row without reading the sentence.
 */
export const BODY_GLYPH: Readonly<Record<Body, string>> = {
  sun: '☉',
  moon: '☾',
  mercury: '☿',
  venus: '♀',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
  pluto: '♇',
  ascendant: '↑',
};

export const ASPECT_GLYPH: Readonly<Record<Aspect, string>> = {
  conjunction: '☌',
  sextile: '⚹',
  square: '□',
  trine: '△',
  opposition: '☍',
};

/** `♀ △ ♂` for an inter-chart aspect, viewer's body first. */
export function aspectGlyphs(aspect: {
  readonly planetA: Body;
  readonly aspect: Aspect;
  readonly planetB: Body;
}): string {
  return `${BODY_GLYPH[aspect.planetA]} ${ASPECT_GLYPH[aspect.aspect]} ${BODY_GLYPH[aspect.planetB]}`;
}

/**
 * Each carries U+FE0E, the text variation selector: without it iOS renders
 * the zodiac characters with the emoji font, as coloured tiles.
 */
export const SIGN_GLYPH: Readonly<Record<Sign, string>> = {
  aries: '♈\uFE0E',
  taurus: '♉\uFE0E',
  gemini: '♊\uFE0E',
  cancer: '♋\uFE0E',
  leo: '♌\uFE0E',
  virgo: '♍\uFE0E',
  libra: '♎\uFE0E',
  scorpio: '♏\uFE0E',
  sagittarius: '♐\uFE0E',
  capricorn: '♑\uFE0E',
  aquarius: '♒\uFE0E',
  pisces: '♓\uFE0E',
};
