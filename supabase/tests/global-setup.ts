import { localStack } from './local';

/**
 * Proves the Edge Function gateway answers before any suite asserts on it,
 * and pays the edge runtime's cold start here rather than inside a test's
 * 20 s budget.
 *
 * Why this exists: `photo.test.ts` and `delete-account.test.ts` call
 * `/functions/v1/*`. With no edge runtime Kong answers 503 and every one
 * of their assertions fails as a bare status mismatch — the failure names
 * the wrong thing, which is how CI stayed red for days while the local
 * battery was green (docs/NOTES.md, 2026-09-10). `local.ts` already turns
 * a missing database into a FAIL that names the fix; this is the same
 * contract for the functions gateway. A service the tests need but cannot
 * reach is a FAIL with the reason, never a skip.
 *
 * The second job is the cold cache. CI creates the runtime's Deno cache
 * volume empty, so the first request to each function resolves its import
 * graph over the network. Inside a test that is a 20 s timeout away from a
 * red build on an unrelated commit; here it has its own budget.
 *
 * OPTIONS is the probe on purpose: both functions answer a preflight with
 * 204 before they read a token or touch the database, so warming them
 * cannot change state.
 */

const FUNCTIONS = ['photo', 'delete-account'] as const;
const BUDGET_MS = 120_000;
const INTERVAL_MS = 500;

/** The status, or the transport error when there was no answer at all. */
async function preflight(url: string): Promise<number | string> {
  try {
    const response = await fetch(url, { method: 'OPTIONS' });
    return response.status;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

async function warm(name: string): Promise<void> {
  const url = `${localStack().API_URL}/functions/v1/${name}`;
  const deadline = Date.now() + BUDGET_MS;
  let last: number | string = 'no request completed';
  for (;;) {
    last = await preflight(url);
    if (last === 204) return;
    if (Date.now() >= deadline) break;
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
  throw new Error(
    [
      `Edge Function "${name}" never answered a preflight at ${url}`,
      `(${BUDGET_MS / 1000}s budget, last answer: ${last}).`,
      '503 means the edge runtime is not running: whatever starts the',
      'stack must not exclude edge-runtime (see .github/workflows/ci.yml).',
      'A connection error means the stack itself is down (npx supabase start).',
    ].join(' '),
  );
}

export async function setup(): Promise<void> {
  for (const name of FUNCTIONS) await warm(name);
}
