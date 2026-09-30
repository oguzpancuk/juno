import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { computeChart } from './chart';
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
import { natalReading, starterFromKey } from './summary';
import { SIGN_EN } from './en';
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

  it('English aspect texts name no sign, as the Turkish ones do not', () => {
    const files = contentFiles('en');
    const hits: string[] = [];
    for (const map of [files.natalAspects, files.synastry])
      for (const [key, text] of Object.entries(map))
        for (const sign of SIGNS)
          if (new RegExp(`\\b${SIGN_EN[sign]}\\b`, 'u').test(text))
            hits.push(`${key}: ${SIGN_EN[sign]}`);
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
