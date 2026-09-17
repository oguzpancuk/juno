/**
 * The gate in front of `npm run deploy`. See `lib/deploy-target.ts` for
 * what it refuses and why; this file only finds the value Expo will use
 * and reports a refusal where the person is looking.
 */
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  checkDeployTarget,
  effectiveValue,
  parseEnvFile,
} from '../lib/deploy-target';

const KEY = 'EXPO_PUBLIC_SUPABASE_URL';

// Expo loads this at export time; the gate runs before that, so it reads
// the same file rather than an environment that has not been filled in yet.
let fromFile: Record<string, string> = {};
try {
  fromFile = parseEnvFile(
    readFileSync(join(import.meta.dirname, '..', '.env'), 'utf8'),
  );
} catch {
  // No .env is not an error by itself: the shell may carry the value.
}

const result = checkDeployTarget(
  effectiveValue(process.env[KEY], fromFile, KEY),
);

if (!result.ok) {
  console.error(`\ndeploy durduruldu: ${result.reason}`);
  console.error(
    'Yayına giden paket bu adresi içine gömüyor; yerel ya da eksik bir\n' +
      'adresle dağıtım, sadece bu makinede çalışan bir site demek.\n' +
      'apps/mobile/.env dosyasının hosted projeyi gösterdiğinden emin ol,\n' +
      've deploy komutunu `contracts/init.sh` çalıştırılmış bir kabuktan\n' +
      'verme — o kabuk yerel yığının adresini export ediyor ve kabuktaki\n' +
      'değer dosyadakini ezer.\n',
  );
  process.exit(1);
}

console.log(`deploy hedefi: ${result.host}`);
