import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { edgeFunctionSources } from './edge-functions';

/**
 * Edge Functions have no lockfile: the edge runtime resolves every remote
 * import from the specifier itself, over the network, on a cold cache. A
 * floating specifier like `jsr:@supabase/supabase-js@2` therefore lets a
 * release nobody here made change what a deploy or a CI run executes.
 *
 * The functions are outside the workspace's TypeScript project, so neither
 * tsc nor ESLint looks at them (supabase/eslint.config.js ignores
 * `functions/`). These are the only gates that do.
 *
 * What this cannot promise: pinning the top of the graph is not a
 * lockfile. supabase-js pins its own @supabase/* dependencies exactly but
 * declares npm:@opentelemetry/api@^1.0.0, and that range is still resolved
 * at cold start. The risk is narrowed to transitive ranges, not closed.
 * Nor does it see specifiers moved into an import map (`functions/deno.json`
 * or config.toml's `import_map`) — the repo deliberately has neither, and
 * adding one means teaching this file about it.
 */

// `from '…'`, the side-effect `import '…'`, and the dynamic `import('…')`,
// in any of the three quote characters. Missing a form is a way for a
// floating specifier to walk past, which is how the first version of this
// file covered nothing.
const SPECIFIER = /(?:\bfrom|\bimport)\s*(?:\(\s*)?(['"`])([^'"`]*)\1/g;
const REMOTE = /^(?:jsr:|npm:|https?:)/;
// An exact version either ends the path or is followed by a subpath. The
// query and fragment are cut off first: `?deps=zod@3.22.4` must not make a
// floating `esm.sh/postgres@3` look pinned, and `?target=deno` must not
// make a pinned one look floating.
const EXACT =
  /@(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)(?:\/|$)/;

const PackageSchema = z.object({ version: z.string().min(1) });

/**
 * The supabase-js this workspace actually loads. Resolved the way the
 * suite itself resolves it rather than by a hardcoded path into the
 * hoisted root, so a future layout that nests a different copy under
 * `supabase/node_modules` is compared against the copy that would run.
 */
function installedSupabaseJs(): string {
  const require = createRequire(import.meta.url);
  const path = require.resolve('@supabase/supabase-js/package.json');
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  return PackageSchema.parse(raw).version;
}

interface Remote {
  readonly file: string;
  readonly specifier: string;
  /** Registry-independent identity, e.g. `@supabase/supabase-js`. */
  readonly name: string;
  readonly version: string | undefined;
}

function parse(file: string, specifier: string): Remote {
  // A computed specifier cannot be checked at all, so it counts as floating.
  const path = specifier.includes('${')
    ? specifier
    : (specifier.split(/[?#]/, 1)[0] ?? specifier);
  const version = EXACT.exec(path)?.[1];
  const withoutVersion =
    version === undefined
      ? path
      : path.slice(0, path.lastIndexOf(`@${version}`));
  return {
    file,
    specifier,
    // Drop the scheme so the same package via jsr: and npm: is one name;
    // otherwise two registries could disagree on a version in silence.
    name: withoutVersion.replace(REMOTE, ''),
    version,
  };
}

function remoteImports(): readonly Remote[] {
  const found: Remote[] = [];
  for (const file of edgeFunctionSources()) {
    const source = readFileSync(file, 'utf8');
    for (const [, , specifier] of source.matchAll(SPECIFIER)) {
      if (specifier === undefined || !REMOTE.test(specifier)) continue;
      found.push(parse(file, specifier));
    }
  }
  return found;
}

it('pins every remote import in every Edge Function to an exact version', () => {
  const sources = edgeFunctionSources();
  // A rename or a restructure must not turn this into a test of nothing.
  expect(sources.length).toBeGreaterThan(0);
  const remotes = remoteImports();
  expect(remotes.length).toBeGreaterThan(0);

  const floating = remotes
    .filter((remote) => remote.version === undefined)
    .map((remote) => `${remote.file}: ${remote.specifier}`);
  expect(
    floating,
    'each of these resolves from the network at cold start, so a release nobody here made changes what runs; pin an exact version (a specifier quoted inside a comment counts too, and the fix there is to pin the example)',
  ).toEqual([]);
});

it('resolves one version of each package across the functions', () => {
  const versions = new Map<string, Set<string>>();
  for (const { name, version } of remoteImports()) {
    if (version === undefined) continue;
    let seen = versions.get(name);
    if (seen === undefined) {
      seen = new Set();
      versions.set(name, seen);
    }
    seen.add(version);
  }
  const disagreeing = [...versions]
    .filter(([, seen]) => seen.size > 1)
    .map(([name, seen]) => `${name}: ${[...seen].sort().join(', ')}`);
  expect(disagreeing).toEqual([]);
});

/**
 * The functions and the rest of the workspace must run the same
 * supabase-js. A comment saying "keep in step" is not a gate: `npm update`
 * moves the installed copy and nothing would notice the functions staying
 * behind.
 */
it('keeps the supabase-js pin in step with the installed one', () => {
  const pins = remoteImports().filter((remote) =>
    remote.name.endsWith('@supabase/supabase-js'),
  );
  expect(pins.length).toBeGreaterThan(0);
  const installed = installedSupabaseJs();
  const behind = pins
    .filter((pin) => pin.version !== installed)
    .map((pin) => `${pin.file}: ${pin.specifier} (installed ${installed})`);
  expect(behind).toEqual([]);
});
