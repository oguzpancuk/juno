import type { Planet } from './bodies';
import type { Aspect, Body } from './compatibility';
import type { Sign } from './signs';
import type { Words } from './words';

/** English display names. */
export const PLANET_EN: Readonly<Record<Planet, string>> = {
  sun: 'Sun',
  moon: 'Moon',
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
  pluto: 'Pluto',
};

export const SIGN_EN: Readonly<Record<Sign, string>> = {
  aries: 'Aries',
  taurus: 'Taurus',
  gemini: 'Gemini',
  cancer: 'Cancer',
  leo: 'Leo',
  virgo: 'Virgo',
  libra: 'Libra',
  scorpio: 'Scorpio',
  sagittarius: 'Sagittarius',
  capricorn: 'Capricorn',
  aquarius: 'Aquarius',
  pisces: 'Pisces',
};

export const BODY_EN: Readonly<Record<Body, string>> = {
  ...PLANET_EN,
  ascendant: 'Ascendant',
};

export const ASPECT_EN: Readonly<Record<Aspect, string>> = {
  conjunction: 'conjunction',
  sextile: 'sextile',
  square: 'square',
  trine: 'trine',
  opposition: 'opposition',
};

/** "Your Sun is trine their Venus": the verb phrase between the two. */
const ASPECT_VERB_EN: Readonly<Record<Aspect, string>> = {
  conjunction: 'is conjunct',
  sextile: 'is sextile',
  square: 'squares',
  trine: 'is trine',
  opposition: 'opposes',
};

/** 1st, 2nd, 3rd, 4th … 11th, 12th. */
export function ordinalEn(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export const EN_WORDS: Words = {
  planet: PLANET_EN,
  sign: SIGN_EN,
  body: BODY_EN,
  aspect: ASPECT_EN,
  placement: (body, sign, house) =>
    house === null
      ? `${BODY_EN[body]} in ${SIGN_EN[sign]}`
      : `${BODY_EN[body]} in ${SIGN_EN[sign]} · ${ordinalEn(house)} house`,
  describeAspect: ({ planetA, aspect, planetB }) => {
    // The same Descendant reading as the Turkish (ADR-0003 amendment 1).
    if (aspect === 'opposition') {
      if (planetA === 'ascendant' && planetB === 'ascendant')
        return "Your Ascendants sit on each other's Descendant.";
      if (planetB === 'ascendant')
        return `Your ${BODY_EN[planetA]} is on their Descendant.`;
      if (planetA === 'ascendant')
        return `Their ${BODY_EN[planetB]} is on your Descendant.`;
    }
    return `Your ${BODY_EN[planetA]} ${ASPECT_VERB_EN[aspect]} their ${BODY_EN[planetB]}.`;
  },
  natalAspectTitle: ({ planetA, aspect, planetB }) => {
    if (aspect === 'opposition') {
      if (planetB === 'ascendant')
        return `${BODY_EN[planetA]} on the Descendant`;
      if (planetA === 'ascendant')
        return `${BODY_EN[planetB]} on the Descendant`;
    }
    return `${BODY_EN[planetA]} ${ASPECT_EN[aspect]} ${BODY_EN[planetB]}`;
  },
};
