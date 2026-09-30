import type { Planet } from './bodies';
import type { Aspect, Body, InterAspect } from './compatibility';
import { EN_WORDS } from './en';
import { ES_WORDS } from './es';
import { currentLanguage, type Language } from './language';
import type { Sign } from './signs';
import { TR_WORDS } from './tr';

/**
 * The words the engine puts around its own names, per language: what a
 * planet, a sign and an aspect are called, and the few sentences built
 * from them rather than read from `content/`. Turkish builds these out of
 * case endings ("Koç'ta", "Venüs'üyle"), English out of word order, so
 * each language writes its own functions instead of filling one template.
 */
export interface Words {
  readonly planet: Readonly<Record<Planet, string>>;
  readonly sign: Readonly<Record<Sign, string>>;
  readonly body: Readonly<Record<Body, string>>;
  readonly aspect: Readonly<Record<Aspect, string>>;
  /** "Güneş Koç'ta · 5. ev" / "Sun in Aries · 5th house"; no house for the Ascendant. */
  placement(body: Body, sign: Sign, house: number | null): string;
  /** The swipe card's one-line "why", from the viewer's side. */
  describeAspect(
    aspect: Pick<InterAspect, 'planetA' | 'aspect' | 'planetB'>,
  ): string;
  /** A natal aspect card's title: "Venüs kare Mars" / "Venus square Mars". */
  natalAspectTitle(
    aspect: Pick<InterAspect, 'planetA' | 'aspect' | 'planetB'>,
  ): string;
}

export const WORDS: Readonly<Record<Language, Words>> = {
  tr: TR_WORDS,
  en: EN_WORDS,
  es: ES_WORDS,
};

const words = (): Words => WORDS[currentLanguage()];

export const planetName = (planet: Planet): string => words().planet[planet];
export const signName = (sign: Sign): string => words().sign[sign];
export const bodyName = (body: Body): string => words().body[body];
export const aspectName = (aspect: Aspect): string => words().aspect[aspect];
export const placementName = (
  body: Body,
  sign: Sign,
  house: number | null,
): string => words().placement(body, sign, house);
export const describeAspect: Words['describeAspect'] = (aspect) =>
  words().describeAspect(aspect);
export const natalAspectTitle: Words['natalAspectTitle'] = (aspect) =>
  words().natalAspectTitle(aspect);
