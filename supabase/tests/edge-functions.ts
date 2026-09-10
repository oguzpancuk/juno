import { existsSync, readdirSync } from 'node:fs';
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

/** Both gates are worthless against a directory that moved; say so. */
function functionsDir(): string {
  if (!existsSync(DIR)) {
    throw new Error(
      `no Edge Functions directory at ${DIR}: it moved or was removed, and the gates that read it (tests/global-setup.ts, tests/functions-pinned.test.ts) now cover nothing`,
    );
  }
  return DIR;
}

/**
 * Deployable function names — one HTTP endpoint each. A directory is one
 * only if it holds an `index.ts`: `_shared` is Supabase's convention for
 * code that is not a function, and a directory of fixtures is not one
 * either. Preflighting a name with no route would fail the whole suite on
 * something that was never an endpoint.
 */
export function edgeFunctionNames(): readonly string[] {
  return readdirSync(functionsDir(), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(DIR, name, 'index.ts')))
    .sort();
}

/**
 * Every module under `functions/`, `_shared` included. What the runtime
 * resolves is the whole graph, not just the entrypoints, and Deno runs
 * more than `.ts`.
 *
 * Symlinked directories are not followed: `withFileTypes` reports the link
 * itself, so a broken link cannot throw here and a cycle cannot recurse.
 * Nothing in this repo symlinks into `functions/`; if something ever does,
 * this is the line that has to learn about it.
 */
const MODULE = /\.(?:[cm]?[jt]sx?)$/;

export function edgeFunctionSources(): readonly string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && MODULE.test(entry.name)) found.push(path);
    }
  };
  walk(functionsDir());
  return found.sort();
}
