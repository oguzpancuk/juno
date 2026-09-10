import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Where the Edge Functions are on disk, for the two gates that read them:
 * the preflight in `global-setup.ts` and the pin check in
 * `functions-pinned.test.ts`. Both used to answer this question their own
 * way — one with a hardcoded list, the other by assuming `<dir>/index.ts`
 * — so adding a function or moving code into a module left one of them
 * quietly covering nothing.
 */

// fileURLToPath, not `new URL(...).pathname`: the latter is percent-encoded,
// so a checkout under a path with a space resolves to a directory that
// does not exist.
const DIR = fileURLToPath(new URL('../functions', import.meta.url));

/**
 * Deployable function names — one HTTP endpoint each. A directory whose
 * name starts with `_` is Supabase's convention for shared code that is
 * not itself a function (`_shared`), so it has no endpoint to preflight.
 */
export function edgeFunctionNames(): readonly string[] {
  return readdirSync(DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => entry.name)
    .sort();
}

/**
 * Every TypeScript file under `functions/`, `_shared` included. What the
 * runtime resolves is the whole graph, not just the entrypoints.
 */
export function edgeFunctionSources(): readonly string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      // A symlinked directory reports as a link, so ask the filesystem.
      if (statSync(path).isDirectory()) walk(path);
      else if (entry.name.endsWith('.ts')) found.push(path);
    }
  };
  walk(DIR);
  return found.sort();
}
