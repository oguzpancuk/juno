/**
 * The second half of the deploy gate: it reads what was just built.
 *
 * `check-deploy-env.ts` runs before the export and approves the values
 * Expo will resolve. This runs after it and checks that those values are
 * the ones in the file about to be published — see `lib/deploy-bundle.ts`
 * for why the two can disagree, and for the day they did.
 */
/// <reference types="node" />
import { parseProjectEnv } from '@expo/env';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { checkDeployBundle } from '../lib/deploy-bundle';
import { effectiveValue } from '../lib/deploy-target';

const URL_KEY = 'EXPO_PUBLIC_SUPABASE_URL';
const ANON_KEY = 'EXPO_PUBLIC_SUPABASE_ANON_KEY';

const root = join(import.meta.dirname, '..');
// The same resolution as the gate before the export: same function, same
// mode, so the two cannot disagree about what was approved.
const { env } = parseProjectEnv(root, { mode: 'production', silent: true });
const files: Record<string, string> = Object.fromEntries(
  Object.entries(env).filter(([, value]) => typeof value === 'string'),
) as Record<string, string>;

const url = effectiveValue(process.env[URL_KEY], files, URL_KEY);
const anonKey = effectiveValue(process.env[ANON_KEY], files, ANON_KEY);

function refuse(reason: string): never {
  console.error(`\ndeploy durduruldu: ${reason}`);
  console.error(
    'Bu, dağıtılacak paketin içine bakan kontrol. Değerler doğru\n' +
      'çözülmüş olsa bile paket başka bir şeyle derlenmiş olabilir —\n' +
      '2026-09-18: Metro önbelleği yerel yığına göre derlenmiş bir\n' +
      '`lib/env.ts` sakladı ve site 127.0.0.1 adresine bakarak yayına\n' +
      'çıktı. Çözüm: `npx expo export -p web --clear`.\n',
  );
  process.exit(1);
}

if (!url) refuse(`${URL_KEY} çözülemedi`);
if (!anonKey) refuse(`${ANON_KEY} çözülemedi`);

const webJs = join(root, 'dist', '_expo', 'static', 'js', 'web');
let names: readonly string[];
try {
  names = readdirSync(webJs).filter((name) => name.endsWith('.js'));
} catch {
  refuse(`derlenmiş paket bulunamadı: ${webJs}`);
}
if (names.length === 0) refuse(`derlenmiş paket bulunamadı: ${webJs}`);

const bundle = [
  readFileSync(join(root, 'dist', 'index.html'), 'utf8'),
  ...names.map((name) => readFileSync(join(webJs, name), 'utf8')),
].join('\n');

const verdict = checkDeployBundle({ bundle, url, anonKey });
if (!verdict.ok) refuse(verdict.reason);

console.log(`paket doğrulandı: ${verdict.detail}`);
