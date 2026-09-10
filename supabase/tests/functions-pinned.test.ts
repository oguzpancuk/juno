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
//
// The lookbehind keeps `.from(…)` out of it. Supabase's own query builder
// reads `supabase.from(`profiles_${shard}`)`, and a template literal there
// would otherwise be reported as an unpinned dependency — a diagnosis
// about cold-start resolution for a string that is not an import.
// Group 1 is the opening paren of `import(`, and it lives inside the
// `import` alternative on purpose: no valid static import reads `from (`,
// so a parenthesised `from` in prose must not be able to set it. It marks
// a call rather than prose — see isRemote.
const SPECIFIER = /(?<![.$\w])(?:from\s*|import\s*(\(\s*)?)(['"`])([^'"`]*)\2/g;
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
  // A computed specifier is unpinnable whatever its tail looks like: both
  // the package and the version are decided at runtime, so an interpolated
  // one ending in `@1.0.0` is not pinned to anything. Reading the version
  // out of it here would be believing a coincidence.
  if (specifier.includes('${')) {
    return {
      file,
      specifier,
      name: specifier.replace(REMOTE, ''),
      version: undefined,
    };
  }
  const path = specifier.split(/[?#]/, 1)[0] ?? specifier;
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

/**
 * Whether a specifier is this gate's business. A computed one counts even
 * though no scheme is visible: `` `${CDN}/pkg@2` `` is resolved from the
 * network just the same, and the scheme test alone would let it past.
 * Relative paths stay out of it — those are local files, and interpolating
 * one is not a dependency question.
 *
 * A computed one written after `from` must also carry a path separator.
 * The word `from` occurs inside ordinary strings (`` `row missing from
 * "${table}"` ``), and this is a regex, not a parser, so such a string
 * reaches here as `${table}`; without the separator it would be reported
 * as an unpinned dependency. `import(` is a call, never prose, so nothing
 * captured from one needs that test — which matters, because the
 * separator can be inside the interpolated part: `` `${CDN}pkg@2` `` with
 * a base URL ending in a slash is the same floating cold-start resolve as
 * `` `${CDN}/pkg@2` ``, and only this distinction sees it.
 */
function isRemote(specifier: string, dynamic = false): boolean {
  if (REMOTE.test(specifier)) return true;
  if (!specifier.includes('${') || /^[./]/.test(specifier)) return false;
  return dynamic || specifier.includes('/');
}

interface Found {
  readonly specifier: string;
  /** Captured from `import(…)` — a call, which prose cannot be. */
  readonly dynamic: boolean;
}

/** The import specifiers in one file's text, before any judgement. */
function specifiersIn(source: string): readonly Found[] {
  return [...source.matchAll(SPECIFIER)]
    .map(([, paren, , specifier]) => ({
      specifier,
      dynamic: paren !== undefined,
    }))
    .filter((found): found is Found => found.specifier !== undefined);
}

function remoteImports(): readonly Remote[] {
  const found: Remote[] = [];
  for (const file of edgeFunctionSources()) {
    const source = readFileSync(file, 'utf8');
    for (const { specifier, dynamic } of specifiersIn(source)) {
      if (!isRemote(specifier, dynamic)) continue;
      found.push(parse(file, specifier));
    }
  }
  return found;
}

/**
 * The parser has its own table, because every hole this gate has had was
 * in the parser rather than in the walk, and each was found by a
 * throwaway fixture that vanished with the session. These cases fail on a
 * revert without putting a poisoned module under `functions/`.
 */
const CASES: readonly {
  readonly specifier: string;
  readonly version: string | undefined;
  readonly why: string;
}[] = [
  {
    specifier: 'jsr:@supabase/supabase-js@2.116.0',
    version: '2.116.0',
    why: 'the ordinary pinned case',
  },
  {
    specifier: 'npm:pkg@1.2.3/sub/path.js',
    version: '1.2.3',
    why: 'a subpath follows the version',
  },
  {
    specifier: 'https://deno.land/std@0.220.0/http/server.ts',
    version: '0.220.0',
    why: 'the standard Deno URL shape',
  },
  {
    specifier: 'https://esm.sh/@supabase/supabase-js@2.116.0?target=deno',
    version: '2.116.0',
    why: 'a query must not make a pinned specifier look floating',
  },
  {
    specifier: 'jsr:@supabase/supabase-js@2',
    version: undefined,
    why: 'a floating major is the bug this gate exists for',
  },
  {
    specifier: 'https://esm.sh/postgres@3?deps=zod@3.22.4',
    version: undefined,
    why: 'a version in a query belongs to something else',
  },
  {
    specifier: 'https://esm.sh/${pkg}@1.0.0',
    version: undefined,
    why: 'an exact-looking tail on a computed specifier is a coincidence',
  },
  {
    specifier: '${CDN}/@supabase/supabase-js@2.116.0',
    version: undefined,
    why: 'the interpolation can be the scheme itself',
  },
];

it.each(CASES)('parses $specifier — $why', ({ specifier, version }) => {
  expect(isRemote(specifier)).toBe(true);
  expect(parse('probe.ts', specifier).version).toBe(version);
});

/** What the gate actually reports for a file with this text in it. */
const reported = (source: string): readonly string[] =>
  specifiersIn(source)
    .filter(({ specifier, dynamic }) => isRemote(specifier, dynamic))
    .map(({ specifier }) => specifier);

it('reports the imports in a source and nothing else', () => {
  // `from` is a word that occurs in code which is not an import: the query
  // builder reads `supabase.from(…)`, and prose says "missing from". Each
  // is stopped at a different point — the first two never match, the third
  // matches and is then judged not a dependency — so they are asserted
  // through the whole path rather than at one layer.
  expect(
    reported('await supabase.storage.from(`photos-${env}`).remove([]);'),
  ).toEqual([]);
  expect(reported('await supabase.from(`profiles_${shard}`);')).toEqual([]);
  expect(reported('throw new Error(`missing from "${table}"`);')).toEqual([]);
  // A parenthesised `from` is not an import in any syntax, so it must not
  // reach the exemption that `import(` gets.
  expect(reported('log(`deleted from ("${bucket}")`);')).toEqual([]);
  // Carries a separator, so only the lookbehind keeps it out — the rule
  // that a computed specifier must look like a path cannot help here.
  expect(reported('await supabase.storage.from(`photos/${uid}`);')).toEqual([]);

  expect(reported("import { a } from 'jsr:pkg@1.0.0';")).toEqual([
    'jsr:pkg@1.0.0',
  ]);
  expect(reported("import 'npm:polyfill@1.0.0';")).toEqual([
    'npm:polyfill@1.0.0',
  ]);
  expect(reported("await import('npm:lazy@1.0.0');")).toEqual([
    'npm:lazy@1.0.0',
  ]);
  expect(reported('await import(`${CDN}/pkg@2`);')).toEqual(['${CDN}/pkg@2']);
  // No separator outside the interpolation, because the base URL ends in
  // one. Only `import(` being a call rather than prose catches this.
  expect(reported('await import(`${CDN}pkg@2`);')).toEqual(['${CDN}pkg@2']);
});

it('leaves relative and non-specifier strings alone', () => {
  expect(isRemote('./shared.ts')).toBe(false);
  expect(isRemote('../lib/${name}.ts')).toBe(false);
  // What a stray `from` inside an ordinary string looks like by the time
  // it reaches here.
  expect(isRemote('${table}')).toBe(false);
  expect(isRemote('photos-${env}')).toBe(false);
});

it('gives one name to a package however it is reached', () => {
  const name = 'jsr:@supabase/supabase-js@2.116.0';
  expect(parse('probe.ts', name).name).toBe('@supabase/supabase-js');
  expect(parse('probe.ts', 'npm:@supabase/supabase-js@2.116.0').name).toBe(
    '@supabase/supabase-js',
  );
});

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
    'each of these resolves from the network at cold start, so a release nobody here made changes what runs; pin an exact version. This is a regex, not a parser, so a quoted specifier inside a comment counts (pin the example), and so does a string that happens to read `from "a/path"` (reword it or move the path out of the literal)',
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
