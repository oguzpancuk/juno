import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const MOBILE = join(fileURLToPath(new URL('.', import.meta.url)), '..');

function* sources(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sources(path);
    else if (/\.tsx?$/.test(entry.name)) yield path;
  }
}

/**
 * The guard for the bug `svg-id.ts` exists to prevent, written as a grep
 * because the thing to forbid is a shape in the source rather than a value
 * at runtime: an SVG paint server named by something that is not unique to
 * its instance.
 *
 * Four components carried a literal id — the ground, the mark, its spheres
 * and the band ring — and each was correct until a second copy of that
 * component was mounted, which on the web is any screen the router is
 * keeping behind the one on top. Nothing failed then: the second copy
 * simply drew nothing, and that is invisible to every other test here.
 */
describe('SVG paint servers are named per instance', () => {
  /**
   * The elements that define something `url(#…)` can point at. Anything
   * ending in `Gradient`, because `react-native-svg`'s exports are aliased
   * differently in each file — `SvgGradient` here, `SvgLinearGradient`
   * there — and a list of exact names would go stale at the next import.
   * The check
   * below is scoped to them because `id=` on its own is an ordinary React
   * prop — three screens pass a route param that way — and a guard that
   * shouted at those would be turned off within the week.
   *
   * It follows that a gradient written across several lines, with its `id`
   * on a line of its own, slips through. Everything in this codebase is
   * written on one line, and the reference half of the check below is not
   * scoped at all, so the pair still catches the bug from the other side.
   */
  const DEFS =
    /<\w*Gradient\b|<(?:ClipPath|Mask|Pattern|Filter|Symbol|Marker)\b/;

  /**
   * An id that is not unique to the instance, in either shape it comes in:
   * a quoted attribute, or a brace holding anything with no `.` in it.
   * The second covers `id={'orbit-ring'}` and also `id={RING}` for a
   * module-level constant — what someone reaches for when two components
   * must agree on a name, and the same shared id wearing a variable.
   * `useSvgId` hands back an object, so every honest use reads
   * `id={something.id}` and carries the dot.
   *
   * The first draft looked only for `id="` and let both of the others
   * through (reviews, 2026-09-18).
   */
  const namedId = /\bid=(?:["']|\{[^}.]*\})/;

  /**
   * A reference has to be built from a variable: `url(#${ring.id})` or
   * `paint.url`. A literal inside the interpolation — `url(#${'x'})` — is
   * the same bug wearing a template string.
   */
  const literalRef = /url\(#(?!\$\{\s*[A-Za-z_$])/;

  /**
   * Everything a component can live in. `lib/` and `theme/` are in it
   * because this file lives in one of them: the guard has to cover the day
   * an icon component lands beside its helper.
   */
  const ROOTS = ['app', 'components', 'lib', 'theme'];

  /**
   * A line that is prose, not code. This codebase explains itself at
   * length, and `svg-id.ts` has to be able to name the thing it forbids. A
   * block comment counts as prose only while it stays open: a line that
   * opens and closes one can carry code after it.
   */
  const isProse = (line: string): boolean =>
    /^\s*(\/\/|\*)/.test(line) ||
    // A block comment that opens the line is prose while it stays open,
    // and also when it closes at the end of the line — a one-line JSDoc.
    // Only a line that closes one and then carries on is code.
    (/^\s*\/\*/.test(line) && (!line.includes('*/') || /\*\/\s*$/.test(line)));

  const offenders = (bad: (line: string) => boolean): string[] => {
    const hits: string[] = [];
    for (const root of ROOTS) {
      for (const file of sources(join(MOBILE, root))) {
        // Tests are not components. This file's own examples are meant to
        // match, and `tokens.test.ts` builds a regex out of the very
        // attribute this looks for, to read the committed icon.
        if (/\.test\.tsx?$/.test(file)) continue;
        readFileSync(file, 'utf8')
          .split('\n')
          .forEach((line, i) => {
            if (!isProse(line) && bad(line))
              hits.push(`${file}:${i + 1}: ${line.trim()}`);
          });
      }
    }
    return hits;
  };

  const definesNamedId = (line: string): boolean =>
    DEFS.test(line) && namedId.test(line);
  const referencesLiteral = (line: string): boolean => literalRef.test(line);

  it('no paint server is named with anything shared', () => {
    expect(
      offenders(definesNamedId),
      "a paint server's id must come from useSvgId and be read off the " +
        'object it returns — `id={paint.id}`, not `id={id}` or a literal',
    ).toEqual([]);
  });

  it('every url(#…) reference is built from one, not typed out', () => {
    expect(offenders(referencesLiteral)).toEqual([]);
  });

  it('the guard catches what it is for, and nothing else', () => {
    for (const line of [
      '<RadialGradient id="ground-planet" cx="62%">',
      "<LinearGradient id={'band-ring'}>",
      '<LinearGradient id={`orbit-ring`}>',
      // A module-level constant: the same shared id, wearing a variable.
      '<LinearGradient id={RING}>',
      // A closed block comment does not make the rest of the line prose.
      '/* a note */ <SvgGradient id="ground-rim">',
      // A destructured id is flagged too. Not the bug, but the message
      // says what to write instead, and keeping the object is the shape
      // the rest of the codebase uses.
      '<LinearGradient id={id} x1="0">',
    ]) {
      expect(definesNamedId(line), line).toBe(true);
    }
    // A one-line doc comment naming the bug is prose, not an offender.
    expect(isProse('/** like <LinearGradient id="ring"> */')).toBe(true);
    expect(isProse('/* a note */ <SvgGradient id="x">')).toBe(false);

    for (const line of [
      '<RadialGradient id={paint.id} cx="35%">',
      '<SvgGradient id={horizonLine.id} x1="0">',
      '<SvgLinearGradient id={ring.id} x1="0" y1="1">',
      '  testID="legal-popup"',
      '  testID={`gender-${g}`}',
      // An ordinary React prop on an ordinary component.
      '  return <StarterView id={id} />;',
    ]) {
      expect(definesNamedId(line), line).toBe(false);
    }
    for (const line of [
      'stroke="url(#band-ring)"',
      "fill={`url(#${'orbit-ring'})`}",
    ]) {
      expect(referencesLiteral(line), line).toBe(true);
    }
    for (const line of ['fill={`url(#${paint.id})`}', 'fill={paint.url}']) {
      expect(referencesLiteral(line), line).toBe(false);
    }
  });
});
