/**
 * The gate in front of `npm run deploy`. See `lib/deploy-target.ts` for
 * what it refuses and why; this file only resolves the values Expo will
 * use and reports a refusal where the person is looking.
 *
 * It resolves them by calling `@expo/env`'s own `parseProjectEnv` — the
 * function `expo export` calls — rather than reading the files itself.
 * Four reviews walked past hand-made versions of this step; the file list,
 * the `export ` prefix, the ignored keys and `${VAR}` expansion are all
 * Expo's business, and the only way the gate and the build cannot disagree
 * is for them to run the same code.
 */
/// <reference types="node" />
import { parseProjectEnv } from '@expo/env';
import { join } from 'node:path';
import {
  checkDeployKey,
  checkDeployTarget,
  effectiveValue,
  projectRef,
} from '../lib/deploy-target';

const URL_KEY = 'EXPO_PUBLIC_SUPABASE_URL';
const ANON_KEY = 'EXPO_PUBLIC_SUPABASE_ANON_KEY';

// `expo export` forces production before it loads anything, which decides
// which `.env*` files exist for it. Saying so here rather than inheriting
// whatever NODE_ENV the shell happens to carry.
const { env } = parseProjectEnv(join(import.meta.dirname, '..'), {
  mode: 'production',
  silent: true,
});
// `EnvOutput` allows undefined values; the checks want a plain map and
// treat a missing key the same way either way.
const files: Record<string, string> = Object.fromEntries(
  Object.entries(env).filter(([, value]) => typeof value === 'string'),
) as Record<string, string>;

const url = effectiveValue(process.env[URL_KEY], files, URL_KEY);
const target = checkDeployTarget(url);
const key = checkDeployKey(
  effectiveValue(process.env[ANON_KEY], files, ANON_KEY),
  projectRef(url),
);

function refuse(reason: string): never {
  console.error(`\ndeploy durduruldu: ${reason}`);
  console.error(
    'Yayına giden paket bu adresi ve anahtarı içine gömüyor ve kaynağı\n' +
      'görüntüleyen herkes okuyabilir. Yerel, eksik ya da yanlış rollü bir\n' +
      'değerle dağıtım, en iyi ihtimalle sadece bu makinede çalışan bir\n' +
      'site demek.\n\n' +
      'Kontrol et: apps/mobile altındaki .env* dosyaları hosted projeyi ve\n' +
      'ANON anahtarı göstersin — service_role asla değil. Ve deploy\n' +
      'komutunu `contracts/init.sh` çalıştırılmış bir kabuktan verme:\n' +
      'kabuktaki değer dosyadakini ezer.\n',
  );
  process.exit(1);
}

if (!target.ok) refuse(target.reason);
if (!key.ok) refuse(key.reason);

console.log(`deploy hedefi: ${target.detail} (anahtar: ${key.detail})`);
