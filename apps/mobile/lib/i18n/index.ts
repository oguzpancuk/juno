import { type Language } from '@juno/astro';
import { en } from './en';
import { es } from './es';
import { tr } from './tr';

/**
 * The shape every catalog has: the Turkish source's, with its literal
 * strings widened to `string`. A function keeps its parameters, a list its
 * element type; `catalogs.test.ts` checks lengths and translations.
 */
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : T extends readonly (infer U)[]
      ? readonly Widen<U>[]
      : T extends object
        ? { readonly [K in keyof T]: Widen<T[K]> }
        : T;

export type Strings = Widen<typeof tr>;

/**
 * One catalog per language the engine speaks (`LANGUAGES` in
 * `@juno/astro`): the record's type makes a language without a catalog a
 * compile error, so the app and the engine cannot disagree on the list.
 */
export const CATALOGS: Readonly<Record<Language, Strings>> = { tr, en, es };

/** Each language in its own name, as a language picker lists it. */
export const LANGUAGE_NAMES: Readonly<Record<Language, string>> = {
  tr: 'Türkçe',
  en: 'English',
  es: 'Español',
};

/**
 * The BCP 47 tag dates and numbers are formatted with, and the one the web
 * page's `<html lang>` carries.
 */
export const LOCALE_TAGS: Readonly<Record<Language, string>> = {
  tr: 'tr-TR',
  en: 'en-US',
  es: 'es-ES',
};

/**
 * How a short date is written: in digits where the order of day and
 * month is the one every reader of the language expects, with the month's
 * name where it is not ("9/10/2026" is September to one English reader
 * and October to another).
 */
export const SHORT_DATE: Readonly<
  Record<Language, Intl.DateTimeFormatOptions>
> = {
  tr: { day: '2-digit', month: '2-digit', year: 'numeric' },
  en: { day: 'numeric', month: 'short', year: 'numeric' },
  es: { day: '2-digit', month: '2-digit', year: 'numeric' },
};
