import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

/**
 * Edge Functions have no lockfile: the edge runtime resolves every remote
 * import from the specifier itself, over the network, on a cold cache. A
 * floating specifier like `jsr:@supabase/supabase-js@2` therefore lets a
 * release nobody here made change what a deploy or a CI run executes.
 *
 * The functions are outside the workspace's TypeScript project, so neither
 * tsc nor ESLint looks at them (supabase/eslint.config.js ignores
 * `functions/`). This is the only gate that does.
 */

const FUNCTIONS_DIR = new URL('../functions', import.meta.url).pathname;

// `from 'jsr:@scope/name@1.2.3'` and the npm:/https: equivalents.
const IMPORT = /\bfrom\s+'([^']+)'/g;
const REMOTE = /^(jsr:|npm:|https?:)/;
// An exact version ends the specifier: @1.2.3, optionally -rc.1 or +build.
const EXACT = /@\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function entrypoints(): readonly string[] {
  return readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(FUNCTIONS_DIR, entry.name, 'index.ts'));
}

it('pins every remote import in every Edge Function to an exact version', () => {
  const files = entrypoints();
  // A rename or a restructure must not turn this into a test of nothing.
  expect(files.length).toBeGreaterThan(0);

  const floating: string[] = [];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const [, specifier] of source.matchAll(IMPORT)) {
      if (specifier === undefined || !REMOTE.test(specifier)) continue;
      if (!EXACT.test(specifier)) floating.push(`${file}: ${specifier}`);
    }
  }
  expect(floating).toEqual([]);
});
