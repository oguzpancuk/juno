import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { supabaseCli } from './local';

// The committed database.types.ts must match the migrations. The battery
// already needs the local stack, so regenerate and compare.
it('tests/database.types.ts matches `supabase gen types` for the current migrations', () => {
  const generated = supabaseCli(['gen', 'types', 'typescript', '--local']);
  const committed = readFileSync(
    resolve(import.meta.dirname, 'database.types.ts'),
    'utf8',
  );
  expect(generated).toBe(committed);
});
