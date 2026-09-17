/**
 * The gate in front of `npm run deploy`. See `lib/deploy-target.ts` for
 * what it refuses and why; this file only resolves the values Expo will
 * use and reports a refusal where the person is looking.
 */
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  checkDeployKey,
  checkDeployTarget,
  effectiveValue,
  mergeEnvFiles,
  projectRef,
} from '../lib/deploy-target';

const URL_KEY = 'EXPO_PUBLIC_SUPABASE_URL';
const ANON_KEY = 'EXPO_PUBLIC_SUPABASE_ANON_KEY';

// The files `@expo/env` loads for a production export, in its order: the
// first to define a key wins. The gate runs before the export, so it reads
// the same set rather than an environment nothing has filled in yet.
const ENV_FILES = [
  '.env.production.local',
  '.env.local',
  '.env.production',
  '.env',
];

const root = join(import.meta.dirname, '..');
const files = mergeEnvFiles(
  ENV_FILES.map((name) => {
    try {
      return readFileSync(join(root, name), 'utf8');
    } catch {
      // Absent is the normal case for three of the four.
      return null;
    }
  }),
);

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
      `Kontrol et: apps/mobile/${ENV_FILES.join(', ')} dosyaları hosted\n` +
      'projeyi ve ANON anahtarı göstersin — service_role asla değil. Ve\n' +
      'deploy komutunu `contracts/init.sh` çalıştırılmış bir kabuktan\n' +
      'verme: kabuktaki değer dosyadakini ezer.\n',
  );
  process.exit(1);
}

if (!target.ok) refuse(target.reason);
if (!key.ok) refuse(key.reason);

console.log(`deploy hedefi: ${target.detail} (anahtar: ${key.detail})`);
