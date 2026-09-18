import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const MOBILE = join(fileURLToPath(new URL('.', import.meta.url)), '..');

function* sources(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sources(path);
    else if (/\.tsx$/.test(entry.name)) yield path;
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
  // `id="…"` on anything, minus the one attribute that is not an SVG id:
  // `testID`. A gradient's id must come from `useSvgId`, which can only
  // produce `id={…}`.
  const literalId = /(?<!test)\bid="/;

  it('no component names a gradient with a literal', () => {
    const hits: string[] = [];
    for (const root of ['app', 'components']) {
      for (const file of sources(join(MOBILE, root))) {
        readFileSync(file, 'utf8')
          .split('\n')
          .forEach((line, i) => {
            if (literalId.test(line))
              hits.push(`${file}:${i + 1}: ${line.trim()}`);
          });
      }
    }
    expect(hits).toEqual([]);
  });

  it('every url(#…) reference is built from one, not typed out', () => {
    const hits: string[] = [];
    for (const root of ['app', 'components']) {
      for (const file of sources(join(MOBILE, root))) {
        readFileSync(file, 'utf8')
          .split('\n')
          .forEach((line, i) => {
            // A reference is allowed to interpolate — `url(#${id})` — but
            // never to spell the name out: `url(#orbit-ring)`.
            if (/url\(#(?!\$\{)/.test(line))
              hits.push(`${file}:${i + 1}: ${line.trim()}`);
          });
      }
    }
    expect(hits).toEqual([]);
  });
});
