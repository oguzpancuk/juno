import type { Planet } from './bodies';
import type { Aspect, Body } from './compatibility';
import type { Sign } from './signs';
import type { Words } from './words';

/** Spanish display names. */
export const PLANET_ES: Readonly<Record<Planet, string>> = {
  sun: 'Sol',
  moon: 'Luna',
  mercury: 'Mercurio',
  venus: 'Venus',
  mars: 'Marte',
  jupiter: 'Júpiter',
  saturn: 'Saturno',
  uranus: 'Urano',
  neptune: 'Neptuno',
  pluto: 'Plutón',
};

export const SIGN_ES: Readonly<Record<Sign, string>> = {
  aries: 'Aries',
  taurus: 'Tauro',
  gemini: 'Géminis',
  cancer: 'Cáncer',
  leo: 'Leo',
  virgo: 'Virgo',
  libra: 'Libra',
  scorpio: 'Escorpio',
  sagittarius: 'Sagitario',
  capricorn: 'Capricornio',
  aquarius: 'Acuario',
  pisces: 'Piscis',
};

export const BODY_ES: Readonly<Record<Body, string>> = {
  ...PLANET_ES,
  ascendant: 'Ascendente',
};

export const ASPECT_ES: Readonly<Record<Aspect, string>> = {
  conjunction: 'conjunción',
  sextile: 'sextil',
  square: 'cuadratura',
  trine: 'trígono',
  opposition: 'oposición',
};

/** "Tu Sol forma un trígono con su Venus": the verb phrase between the two. */
const ASPECT_VERB_ES: Readonly<Record<Aspect, string>> = {
  conjunction: 'está en conjunción con',
  sextile: 'forma un sextil con',
  square: 'forma una cuadratura con',
  trine: 'forma un trígono con',
  opposition: 'está en oposición con',
};

export const ES_WORDS: Words = {
  planet: PLANET_ES,
  sign: SIGN_ES,
  body: BODY_ES,
  aspect: ASPECT_ES,
  placement: (body, sign, house) =>
    house === null
      ? `${BODY_ES[body]} en ${SIGN_ES[sign]}`
      : `${BODY_ES[body]} en ${SIGN_ES[sign]} · casa ${house}`,
  describeAspect: ({ planetA, aspect, planetB }) => {
    // The same Descendant reading as the Turkish (ADR-0003 amendment 1).
    if (aspect === 'opposition') {
      if (planetA === 'ascendant' && planetB === 'ascendant')
        return 'Cada Ascendente está en el Descendente ajeno.';
      if (planetB === 'ascendant')
        return `Tu ${BODY_ES[planetA]} está en su Descendente.`;
      if (planetA === 'ascendant')
        return `Su ${BODY_ES[planetB]} está en tu Descendente.`;
    }
    return `Tu ${BODY_ES[planetA]} ${ASPECT_VERB_ES[aspect]} su ${BODY_ES[planetB]}.`;
  },
  natalAspectTitle: ({ planetA, aspect, planetB }) => {
    if (aspect === 'opposition') {
      if (planetB === 'ascendant')
        return `${BODY_ES[planetA]} en el Descendente`;
      if (planetA === 'ascendant')
        return `${BODY_ES[planetB]} en el Descendente`;
    }
    return `${BODY_ES[planetA]} ${ASPECT_ES[aspect]} ${BODY_ES[planetB]}`;
  },
};
