import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { computeChart } from './chart';
import { ASPECTS, BODIES } from './compatibility';
import { contentFiles } from './content';
import { ordinalEn } from './en';
import {
  LANGUAGES,
  SOURCE_LANGUAGE,
  currentLanguage,
  setLanguage,
} from './language';
import { toPublicChart } from './public';
import { SIGNS } from './signs';
import { spanishGenderHits } from './testing/spanish-gender';
import { natalReading, starterFromKey } from './summary';
import { WORDS, describeAspect, natalAspectTitle, signName } from './words';
import istanbul from './__fixtures__/istanbul-1995.json';

const CONTENT_DIR = fileURLToPath(new URL('../content/', import.meta.url));

/** Every file of `language`, by file name, read as the directory holds it. */
function filesOf(language: string): Map<string, unknown> {
  const dir = join(CONTENT_DIR, language);
  return new Map(
    readdirSync(dir)
      .filter((name) => name.endsWith('.json'))
      .map((name) => [
        name,
        JSON.parse(readFileSync(join(dir, name), 'utf8')) as unknown,
      ]),
  );
}

/** The shape of a JSON value: keys and array lengths, strings as a mark. */
function shape(value: unknown): unknown {
  if (typeof value === 'string') return 'text';
  if (Array.isArray(value)) return value.map(shape);
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, shape(v)]),
    );
  return value;
}

afterEach(() => {
  setLanguage(SOURCE_LANGUAGE);
});

describe('translations of content/', () => {
  const source = filesOf(SOURCE_LANGUAGE);

  it.each(LANGUAGES.filter((l) => l !== SOURCE_LANGUAGE))(
    '%s has the same files, keys and list lengths as the Turkish',
    (language) => {
      const files = filesOf(language);
      expect([...files.keys()].sort()).toEqual([...source.keys()].sort());
      for (const [name, data] of source)
        expect(shape(files.get(name)), name).toEqual(shape(data));
    },
  );

  it.each(LANGUAGES.filter((l) => l !== SOURCE_LANGUAGE))(
    '%s translates every text rather than copying the Turkish',
    (language) => {
      const copied: string[] = [];
      const files = filesOf(language);
      const walk = (a: unknown, b: unknown, path: string): void => {
        if (typeof a === 'string') {
          if (a === b && a.length > 3) copied.push(path);
        } else if (a !== null && typeof a === 'object')
          for (const [k, v] of Object.entries(a))
            walk(v, (b as Record<string, unknown>)[k], `${path}.${k}`);
      };
      for (const [name, data] of source) walk(data, files.get(name), name);
      expect(copied).toEqual([]);
    },
  );

  // Case- and accent-insensitive, singular or plural: "Leo" and "Libra"
  // are also everyday Spanish words ("leo", "se libra") that would read
  // as the sign, and "Geminis" or "los Escorpios" name a sign as surely
  // as "Géminis". Overlay texts sit beside the aspects on the same page.
  it.each(LANGUAGES.filter((l) => l !== SOURCE_LANGUAGE))(
    '%s aspect, starter and overlay texts name no sign, as the Turkish ones do not',
    (language) => {
      const fold = (text: string): string =>
        text
          .normalize('NFD')
          .replace(/\p{M}/gu, '')
          .toLocaleLowerCase(language);
      const synastry = filesOf(language).get('synastry.json') as Record<
        string,
        { meaning: string; question: string }
      >;
      const files = contentFiles(language);
      const texts = [
        ...Object.entries(files.natalAspects),
        ...Object.entries(files.overlays),
        ...Object.entries(synastry).flatMap(([key, entry]) => [
          [key, entry.meaning] as const,
          [key, entry.question] as const,
        ]),
      ];
      const hits: string[] = [];
      for (const [key, text] of texts)
        for (const sign of SIGNS) {
          const name = fold(WORDS[language].sign[sign]);
          if (
            new RegExp(`(^|[^\\p{L}])${name}(e?s)?(?![\\p{L}])`, 'u').test(
              fold(text),
            )
          )
            hits.push(`${key}: ${WORDS[language].sign[sign]}`);
        }
      expect(hits).toEqual([]);
    },
  );
});

describe("Spanish marks nobody's gender", () => {
  // The one list for every Spanish text lives in testing/spanish-gender.ts;
  // the app's catalog and notice are read against it in apps/mobile.
  it('in any content text, including every starter', () => {
    const hits: string[] = [];
    const walk = (value: unknown, path: string): void => {
      if (typeof value === 'string')
        for (const hit of spanishGenderHits(value))
          hits.push(`${path}: ${hit}`);
      else if (value !== null && typeof value === 'object')
        for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
    };
    for (const [name, data] of filesOf('es')) walk(data, name);
    expect(hits).toEqual([]);
  });

  it('in any line the engine writes', () => {
    setLanguage('es');
    const hits: string[] = [];
    for (const planetA of BODIES)
      for (const planetB of BODIES)
        for (const aspect of ASPECTS) {
          const pair = { planetA, aspect, planetB };
          for (const line of [describeAspect(pair), natalAspectTitle(pair)])
            for (const hit of spanishGenderHits(line))
              hits.push(`${planetA}-${aspect}-${planetB}: ${hit}`);
        }
    expect(hits).toEqual([]);
  });
});

describe('the engine speaks the language it is set to', () => {
  const chart = toPublicChart(
    computeChart({
      utc: new Date(istanbul.input.utc),
      latitude: istanbul.input.latitude,
      longitude: istanbul.input.longitude,
    }),
  );

  it('defaults to Turkish', () => {
    expect(currentLanguage()).toBe('tr');
    expect(natalReading(chart).placements[0]?.technical).toMatch(/^Güneş /);
  });

  it('reads English texts and English names once set to English', () => {
    const tr = natalReading(chart);
    setLanguage('en');
    const en = natalReading(chart);
    expect(en.placements[0]?.technical).toMatch(/^Sun in /);
    expect(en.placements[0]?.label).toBe(contentLabel('sun'));
    expect(en.risingText).not.toBe(tr.risingText);
    // The computation is the same: only the words moved.
    expect(en.placements.map((p) => [p.placement, p.sign, p.house])).toEqual(
      tr.placements.map((p) => [p.placement, p.sign, p.house]),
    );
    expect(en.aspects.map((a) => a.aspect)).toEqual(
      tr.aspects.map((a) => a.aspect),
    );
  });

  it('writes the house of a placement as an English ordinal', () => {
    setLanguage('en');
    const withHouse = natalReading(chart).placements.find(
      (p) => p.house !== null,
    );
    expect(withHouse?.technical).toMatch(/ · \d+(st|nd|rd|th) house$/);
  });

  it('gives the starter in the reader’s language', () => {
    const key = { planetA: 'sun', aspect: 'trine', planetB: 'venus' } as const;
    const tr = starterFromKey(key, true);
    setLanguage('en');
    const en = starterFromKey(key, true);
    expect(en.headline).toBe('Your Sun is trine their Venus.');
    expect(en.question).not.toBe(tr.question);
    expect(en.question.endsWith('?')).toBe(true);
  });
});

describe('Spanish words', () => {
  it('reads Spanish texts and Spanish names once set to Spanish', () => {
    const chart = toPublicChart(
      computeChart({
        utc: new Date(istanbul.input.utc),
        latitude: istanbul.input.latitude,
        longitude: istanbul.input.longitude,
      }),
    );
    const tr = natalReading(chart);
    setLanguage('es');
    const es = natalReading(chart);
    expect(es.placements[0]?.technical).toMatch(/^Sol en /);
    expect(es.risingText).not.toBe(tr.risingText);
    expect(es.placements.find((p) => p.house !== null)?.technical).toMatch(
      / · casa \d+$/,
    );
  });

  it('describes an aspect from the viewer’s side', () => {
    setLanguage('es');
    expect(
      describeAspect({ planetA: 'moon', aspect: 'square', planetB: 'mars' }),
    ).toBe('Tu Luna forma una cuadratura con su Marte.');
    expect(
      describeAspect({
        planetA: 'venus',
        aspect: 'opposition',
        planetB: 'ascendant',
      }),
    ).toBe('Tu Venus está en su Descendente.');
    expect(
      describeAspect({
        planetA: 'ascendant',
        aspect: 'opposition',
        planetB: 'moon',
      }),
    ).toBe('Su Luna está en tu Descendente.');
    expect(
      describeAspect({
        planetA: 'ascendant',
        aspect: 'opposition',
        planetB: 'ascendant',
      }),
    ).toBe('Cada Ascendente está en el Descendente de la otra persona.');
  });

  it('titles a natal aspect, the Descendant included', () => {
    setLanguage('es');
    expect(
      natalAspectTitle({ planetA: 'venus', aspect: 'square', planetB: 'mars' }),
    ).toBe('Venus cuadratura Marte');
    expect(
      natalAspectTitle({
        planetA: 'sun',
        aspect: 'opposition',
        planetB: 'ascendant',
      }),
    ).toBe('Sol en el Descendente');
    expect(signName('scorpio')).toBe('Escorpio');
  });

  it('gives the starter in Spanish, as a question', () => {
    setLanguage('es');
    const starter = starterFromKey(
      { planetA: 'sun', aspect: 'trine', planetB: 'venus' },
      true,
    );
    expect(starter.headline).toBe('Tu Sol forma un trígono con su Venus.');
    expect(starter.question).toMatch(/^¿.*\?$/u);
  });
});

function contentLabel(body: 'sun'): string {
  const raw = filesOf('en').get('placements.json') as Record<string, string>;
  return raw[body] ?? '';
}

describe('English words', () => {
  it('orders the ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 21, 22, 23].map(ordinalEn)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '21st',
      '22nd',
      '23rd',
    ]);
  });

  it('describes an aspect from the viewer’s side', () => {
    setLanguage('en');
    expect(
      describeAspect({ planetA: 'moon', aspect: 'square', planetB: 'mars' }),
    ).toBe('Your Moon squares their Mars.');
    expect(
      describeAspect({
        planetA: 'venus',
        aspect: 'opposition',
        planetB: 'ascendant',
      }),
    ).toBe('Your Venus is on their Descendant.');
    expect(
      describeAspect({
        planetA: 'ascendant',
        aspect: 'opposition',
        planetB: 'moon',
      }),
    ).toBe('Their Moon is on your Descendant.');
    expect(
      describeAspect({
        planetA: 'ascendant',
        aspect: 'opposition',
        planetB: 'ascendant',
      }),
    ).toBe("Your Ascendants sit on each other's Descendant.");
  });

  it('titles a natal aspect, the Descendant included', () => {
    setLanguage('en');
    expect(
      natalAspectTitle({ planetA: 'venus', aspect: 'square', planetB: 'mars' }),
    ).toBe('Venus square Mars');
    expect(
      natalAspectTitle({
        planetA: 'sun',
        aspect: 'opposition',
        planetB: 'ascendant',
      }),
    ).toBe('Sun on the Descendant');
    expect(signName('scorpio')).toBe('Scorpio');
  });

  it('names every sign, planet and aspect in every language', () => {
    for (const language of LANGUAGES) {
      const words = WORDS[language];
      for (const table of [words.planet, words.sign, words.body, words.aspect])
        for (const name of Object.values(table))
          expect(name.trim().length, language).toBeGreaterThan(0);
    }
  });
});
