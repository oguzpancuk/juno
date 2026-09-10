import { readFileSync } from 'node:fs';
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
 */

// `from '…'`, the side-effect `import '…'`, and the dynamic `import('…')`.
// Missing any of the three is a way for a floating specifier to walk past.
const SPECIFIER = /(?:\bfrom|\bimport)\s*(?:\(\s*)?['"]([^'"]+)['"]/g;
const REMOTE = /^(?:jsr:|npm:|https?:)/;
// An exact version either ends the specifier or is followed by a subpath,
// so `npm:pkg@1.2.3/sub.js` and `https://deno.land/std@0.220.0/x.ts` pass.
const EXACT =
  /@(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)(?:\/|$)/;

const PackageSchema = z.object({ version: z.string().min(1) });

/** The supabase-js the rest of the repo actually runs, from the install. */
function installedSupabaseJs(): string {
  const path = new URL(
    '../../node_modules/@supabase/supabase-js/package.json',
    import.meta.url,
  );
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  return PackageSchema.parse(raw).version;
}

interface Remote {
  readonly file: string;
  readonly specifier: string;
  /** Everything before the exact version, e.g. `jsr:@supabase/supabase-js`. */
  readonly name: string;
  readonly version: string | undefined;
}

function remoteImports(): readonly Remote[] {
  const found: Remote[] = [];
  for (const file of edgeFunctionSources()) {
    const source = readFileSync(file, 'utf8');
    for (const [, specifier] of source.matchAll(SPECIFIER)) {
      if (specifier === undefined || !REMOTE.test(specifier)) continue;
      const match = EXACT.exec(specifier);
      const version = match?.[1];
      found.push({
        file,
        specifier,
        name:
          version === undefined
            ? specifier
            : specifier.slice(0, specifier.lastIndexOf(`@${version}`)),
        version,
      });
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
  expect(floating).toEqual([]);
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
 * The functions and the rest of the repo must run the same supabase-js. A
 * comment saying "keep in step" is not a gate: `npm update` moves the
 * workspace's copy and nothing would notice the functions staying behind.
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
