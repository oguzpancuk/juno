import { edgeFunctionNames } from './edge-functions';
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
 * OPTIONS is the probe on purpose: every function answers a preflight with
 * 204 before it reads a token or touches the database, so warming them
 * cannot change state. Kong forwards the preflight to the worker rather
 * than answering it itself, which is what makes this warm anything.
 */

const BUDGET_MS = 120_000;
const INTERVAL_MS = 500;
// Bounds one attempt, so the budget above is the real bound rather than a
// claim: without it a hung connection runs to undici's own ~300 s timeout.
const ATTEMPT_MS = 15_000;

/** The status, or the transport error when there was no answer at all. */
async function preflight(url: string): Promise<number | string> {
  try {
    const response = await fetch(url, {
      method: 'OPTIONS',
      signal: AbortSignal.timeout(ATTEMPT_MS),
    });
    return response.status;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/** What to do about an answer that is not the 204 we want. */
function diagnose(answer: number | string): {
  readonly retry: boolean;
  readonly cause: string;
} {
  if (answer === 503) {
    return {
      retry: true,
      cause:
        'The edge runtime is not running: whatever starts the stack must not exclude edge-runtime (see .github/workflows/ci.yml).',
    };
  }
  if (answer === 404) {
    return {
      retry: false,
      cause:
        'Kong has no route for this function: the directory under supabase/functions was renamed or removed, or the stack predates it (npx supabase stop && npx supabase start).',
    };
  }
  if (answer === 500) {
    return {
      retry: false,
      cause:
        'The worker failed to boot. Its imports are resolved from the network at cold start, so an unreachable or bad specifier lands here (npx supabase functions serve shows the error).',
    };
  }
  if (typeof answer === 'string') {
    return {
      retry: true,
      cause: 'Nothing answered at all: the stack is down (npx supabase start).',
    };
  }
  return { retry: true, cause: 'Unexpected status for a preflight.' };
}

async function warm(name: string): Promise<void> {
  const url = `${localStack().API_URL}/functions/v1/${name}`;
  const deadline = Date.now() + BUDGET_MS;
  for (;;) {
    const answer = await preflight(url);
    if (answer === 204) return;
    const { retry, cause } = diagnose(answer);
    const waited = Math.round((BUDGET_MS - (deadline - Date.now())) / 1000);
    if (!retry || Date.now() >= deadline) {
      throw new Error(
        [
          `Edge Function "${name}" did not answer a preflight at ${url}`,
          `(answer: ${answer}${retry ? `, after ${waited}s of retrying` : ', not retried'}).`,
          cause,
        ].join(' '),
      );
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
}

export async function setup(): Promise<void> {
  for (const name of edgeFunctionNames()) await warm(name);
}
