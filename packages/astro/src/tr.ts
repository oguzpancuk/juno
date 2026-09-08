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
  return `${BODY_TR_GENITIVE[aspect.planetA]} onun ${BODY_TR_WITH[aspect.planetB]} ${ASPECT_VERB_TR[aspect.aspect]}.`;
}
