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
 * at runtime: an SVG paint server named by a literal.
 *
 * Four components carried one — the ground, the mark, its spheres and the
 * band ring — and each was correct until a second copy of that component
 * was mounted, which on the web is any screen the router is keeping
 * behind the one on top. Nothing failed then: the second copy simply drew
 * nothing, and that is invisible to every other test in the battery.
 */
describe('SVG paint servers are named per instance', () => {
  /**
   * An id spelled out, in any of the ways JSX lets one be spelled: a
   * plain attribute, or a brace holding a literal. `testID` carries a
   * capital ID and so never matches.
   *
   * The first draft of this looked only for `id="`, which left
   * `id={'orbit-ring'}` free to reintroduce exactly the bug (review,
   * 2026-09-18).
   */
  const literalId = /\bid=(?:["']|\{\s*(?:'|"|`))/;

  /**
   * A reference has to be built from a variable: `url(#${ring.id})`. A
   * literal inside the interpolation — `url(#${'orbit-ring'})` — is the
   * same bug wearing a template string.
   */
  const literalRef = /url\(#(?!\$\{\s*[A-Za-z_$])/;

  /**
   * Everything a component can live in. `lib/` and `theme/` are in it
   * because this file lives in one of them: the guard has to cover the
   * day an icon component lands beside its helper.
   */
  const ROOTS = ['app', 'components', 'lib', 'theme'];

  /**
   * A line that is prose, not code: this codebase explains itself at
   * length, and `svg-id.ts` has to be able to name the very thing it
   * exists to forbid. Only a line whose first characters are a comment
   * marker is skipped, so a real attribute can never hide behind one.
   */
  const isProse = (line: string): boolean => /^\s*(\/\/|\/\*|\*)/.test(line);

  const offenders = (pattern: RegExp): string[] => {
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
            if (!isProse(line) && pattern.test(line))
              hits.push(`${file}:${i + 1}: ${line.trim()}`);
          });
      }
    }
    return hits;
  };

  it('no component names a gradient with a literal', () => {
    expect(offenders(literalId)).toEqual([]);
  });

  it('every url(#…) reference is built from one, not typed out', () => {
    expect(offenders(literalRef)).toEqual([]);
  });

  it('the guard catches what it is for', () => {
    // The four shapes that were, or could have been, in the tree.
    for (const line of [
      '<RadialGradient id="ground-planet" cx="62%">',
      "<LinearGradient id={'band-ring'}>",
      '<LinearGradient id={`orbit-ring`}>',
    ]) {
      expect(literalId.test(line), line).toBe(true);
    }
    for (const line of [
      '  testID="legal-popup"',
      '  testID={`gender-${g}`}',
      '<RadialGradient id={paint.id}>',
    ]) {
      expect(literalId.test(line), line).toBe(false);
    }
    for (const line of [
      'stroke="url(#band-ring)"',
      "fill={`url(#${'orbit-ring'})`}",
    ]) {
      expect(literalRef.test(line), line).toBe(true);
    }
    for (const line of ['fill={`url(#${gradientId})`}', 'fill={paint.url}']) {
      expect(literalRef.test(line), line).toBe(false);
    }
  });
});
