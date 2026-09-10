import { describe, expect, it } from 'vitest';
import {
  compatibility,
  type ChartForScoring,
  type InterAspect,
} from './compatibility';
import { isCurated } from './dimensions';
import { matchSections } from './summary';
import { computeChart } from './chart';
import { toPublicChart } from './public';

/**
 * ADR-0009 §5. The population figures the rule is sized against live in that
 * ADR and come from the script; what the battery proves is each branch, on
 * pairs built to hit it.
 */

function chart(iso: string, latitude = 41.01, longitude = 28.98) {
  return toPublicChart(
    computeChart({ utc: new Date(iso), latitude, longitude }),
  );
}

/** A pair with exactly the aspects given, so a branch can be forced. */
function pairWith(aspects: readonly InterAspect[]) {
  return {
    ...compatibility(
      chart('1995-07-14T00:30:00Z'),
      chart('1990-01-01T09:00:00Z'),
    ),
    aspects,
  };
}

describe('match sections', () => {
  it('prefers curated pairings, then widens', () => {
    const a = chart('1995-07-14T00:30:00Z');
    const b = chart('1990-01-01T09:00:00Z');
    const match = compatibility(a, b);
    const { drawn } = matchSections(match);
    // Whatever it shows, a curated aspect never sits below a non-curated one.
    const flags = drawn.map((d) =>
      isCurated(d.aspect.planetA, d.aspect.planetB),
    );
    const firstNonCurated = flags.indexOf(false);
    if (firstNonCurated !== -1)
      expect(flags.slice(firstNonCurated).every((f) => !f)).toBe(true);
  });

  it('shows at most three drawn and at most one interesting', () => {
    const pairs: [ChartForScoring, ChartForScoring][] = [
      [chart('1995-07-14T00:30:00Z'), chart('1990-01-01T09:00:00Z')],
      [chart('2001-03-22T17:45:00Z'), chart('1996-11-03T04:15:00Z')],
      [chart('1993-05-05T12:00:00Z'), chart('2004-08-19T22:10:00Z')],
    ];
    for (const [a, b] of pairs) {
      const sections = matchSections(compatibility(a, b));
      expect(sections.drawn.length).toBeLessThanOrEqual(3);
      expect(sections.interesting.length).toBeLessThanOrEqual(1);
      for (const card of sections.drawn)
        expect(card.aspect.term).toBeGreaterThanOrEqual(0);
      for (const card of sections.interesting)
        expect(card.aspect.term).toBeLessThan(0);
    }
  });

  it('omits a section with nothing to show, rather than padding it', () => {
    const positivesOnly = pairWith(
      compatibility(
        chart('1995-07-14T00:30:00Z'),
        chart('1990-01-01T09:00:00Z'),
      ).aspects.filter((x) => x.term >= 0),
    );
    const sections = matchSections(positivesOnly);
    expect(sections.interesting).toHaveLength(0);
    expect(sections.drawn.length).toBeGreaterThan(0);

    const tensionsOnly = pairWith(
      compatibility(
        chart('1995-07-14T00:30:00Z'),
        chart('1990-01-01T09:00:00Z'),
      ).aspects.filter((x) => x.term < 0),
    );
    const flipped = matchSections(tensionsOnly);
    expect(flipped.drawn).toHaveLength(0);
    expect(flipped.interesting).toHaveLength(1);
  });

  it('shows one or two cards without calling that an omission', () => {
    const all = compatibility(
      chart('1995-07-14T00:30:00Z'),
      chart('1990-01-01T09:00:00Z'),
    ).aspects;
    const twoPositives = [
      ...all.filter((x) => x.term >= 0).slice(0, 2),
      ...all.filter((x) => x.term < 0).slice(0, 1),
    ];
    const sections = matchSections(pairWith(twoPositives));
    expect(sections.drawn).toHaveLength(2);
    expect(sections.interesting).toHaveLength(1);
  });

  it('renders nothing at all for a pair with no aspects', () => {
    const empty = matchSections(pairWith([]));
    expect(empty.drawn).toHaveLength(0);
    expect(empty.interesting).toHaveLength(0);
  });

  it('gives every card a meaning and a question', () => {
    const sections = matchSections(
      compatibility(
        chart('1995-07-14T00:30:00Z'),
        chart('1990-01-01T09:00:00Z'),
      ),
    );
    for (const card of [...sections.drawn, ...sections.interesting]) {
      expect(card.meaning.length).toBeGreaterThan(20);
      expect(card.question.endsWith('?')).toBe(true);
      expect(card.headline.length).toBeGreaterThan(5);
    }
  });
});

describe('card titles', () => {
  it('never shows the same title twice on one match screen', () => {
    const dates = [
      '1995-07-14T00:30:00Z',
      '1990-01-01T09:00:00Z',
      '2001-03-22T17:45:00Z',
      '1996-11-03T04:15:00Z',
      '1993-05-05T12:00:00Z',
      '2004-08-19T22:10:00Z',
      '1998-02-11T06:40:00Z',
      '1992-09-30T15:20:00Z',
    ].map((iso) => chart(iso));
    for (let i = 0; i < dates.length; i++) {
      for (let j = i + 1; j < dates.length; j++) {
        const a = dates[i];
        const b = dates[j];
        if (!a || !b) continue;
        const sections = matchSections(compatibility(a, b));
        const titles = [...sections.drawn, ...sections.interesting].map(
          (c) => c.title,
        );
        expect(new Set(titles).size, titles.join(' / ')).toBe(titles.length);
      }
    }
  });

  it('gives the same pair the same titles every time', () => {
    const a = chart('1995-07-14T00:30:00Z');
    const b = chart('1990-01-01T09:00:00Z');
    const first = matchSections(compatibility(a, b));
    const second = matchSections(compatibility(a, b));
    expect(second.drawn.map((c) => c.title)).toEqual(
      first.drawn.map((c) => c.title),
    );
  });

  it('titles a tense aspect without judging it', () => {
    // The hard titles describe a dynamic; none of them is a verdict word.
    const banned = ['kötü', 'uyumsuz', 'olmaz', 'zararlı', 'toksik'];
    const a = chart('1995-07-14T00:30:00Z');
    const b = chart('1990-01-01T09:00:00Z');
    for (const card of matchSections(compatibility(a, b)).interesting) {
      for (const word of banned)
        expect(card.title.toLowerCase()).not.toContain(word);
    }
  });
});
