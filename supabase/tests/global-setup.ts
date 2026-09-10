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
 * cannot change state. It reaches the worker rather than being answered by
 * the gateway — each function returns its own `access-control-allow-methods`
 * (`GET, OPTIONS` for photo, `POST, OPTIONS` for delete-account), which is
 * a value only its own module can produce, so answering the preflight means
 * that module was evaluated and its imports resolved.
 *
 * Everything here is retried except a 404, because everything else is a
 * state the stack can still leave: a boot failure includes a registry that
 * was briefly unreachable, which is not a defect in this repo and must not
 * fail the suite on its first occurrence.
 */

const BUDGET_MS = 180_000;
const INTERVAL_MS = 500;
// Bounds one attempt so the budget above is the real bound rather than a
// claim: without it a hung connection runs to undici's own ~300 s timeout.
// Generous on purpose — this file exists because a cold import graph can
// take longer than a test's 20 s, so the attempt must outlast that by far
// rather than chop up the very case it is here to absorb.
const ATTEMPT_MS = 60_000;

type Answer =
  | { readonly kind: 'status'; readonly status: number }
  | { readonly kind: 'timeout' }
  | { readonly kind: 'transport'; readonly message: string };

function describe(answer: Answer): string {
  switch (answer.kind) {
    case 'status':
      return `HTTP ${answer.status}`;
    case 'timeout':
      return `no answer within ${ATTEMPT_MS / 1000}s`;
    case 'transport':
      return answer.message;
  }
}

async function preflight(url: string): Promise<Answer> {
  try {
    const response = await fetch(url, {
      method: 'OPTIONS',
      signal: AbortSignal.timeout(ATTEMPT_MS),
    });
    return { kind: 'status', status: response.status };
  } catch (error) {
    // AbortSignal.timeout rejects with TimeoutError; anything else here is
    // the connection failing, which is a different thing to tell someone.
    if (error instanceof Error && error.name === 'TimeoutError') {
      return { kind: 'timeout' };
    }
    return {
      kind: 'transport',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/** What to do about an answer that is not the 204 we want. */
function diagnose(answer: Answer): {
  readonly retry: boolean;
  readonly cause: string;
} {
  if (answer.kind === 'timeout') {
    return {
      retry: true,
      cause:
        'The request itself timed out. A cold Deno cache resolves the whole import graph on the first request, so the first attempts can be slow; this only gives up once the budget is gone.',
    };
  }
  if (answer.kind === 'transport') {
    return {
      retry: true,
      cause: 'Nothing answered at all: the stack is down (npx supabase start).',
    };
  }
  switch (answer.status) {
    case 503:
      return {
        retry: true,
        cause:
          'The edge runtime is not running: whatever starts the stack must not exclude edge-runtime (see .github/workflows/ci.yml).',
      };
    case 404:
      return {
        retry: false,
        cause:
          'Kong has no route for this function: the directory under supabase/functions was renamed or removed, or the stack predates it (npx supabase stop && npx supabase start).',
      };
    case 500:
      return {
        retry: true,
        // Retried on purpose: the imports are resolved from the network at
        // cold start, so a registry that is briefly unreachable lands here
        // and recovers by itself. Only a persistent one is a real defect.
        cause:
          'The worker failed to boot. Its imports are resolved from the network at cold start, so a bad specifier or an unreachable registry both land here (npx supabase functions serve shows the error).',
      };
    default:
      return { retry: true, cause: 'Unexpected status for a preflight.' };
  }
}

async function warm(name: string): Promise<void> {
  const url = `${localStack().API_URL}/functions/v1/${name}`;
  const started = Date.now();
  const deadline = started + BUDGET_MS;
  for (;;) {
    const answer = await preflight(url);
    if (answer.kind === 'status' && answer.status === 204) return;
    const { retry, cause } = diagnose(answer);
    const spent = Math.round((Date.now() - started) / 1000);
    if (!retry || Date.now() >= deadline) {
      throw new Error(
        [
          `Edge Function "${name}" did not answer a preflight at ${url}`,
          `(${describe(answer)}${retry ? `, after ${spent}s of retrying` : ', not retried'}).`,
          cause,
        ].join(' '),
      );
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
}

export async function setup(): Promise<void> {
  const names = edgeFunctionNames();
  // A move or a rename must not turn this gate into a silent pass — that
  // is the original incident, with the suites back to bare 503s.
  if (names.length === 0) {
    throw new Error(
      'no Edge Functions found under supabase/functions: nothing was preflighted, so the suites that call /functions/v1/* have no gate at all',
    );
  }
  for (const name of names) await warm(name);
}
