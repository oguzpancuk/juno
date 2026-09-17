/**
 * The gate in front of `npm run deploy`. See `lib/deploy-target.ts` for
 * what it refuses and why; this file only reports the refusal in the
 * place the person is looking — the terminal, before the export starts.
 */
import { checkDeployTarget } from '../lib/deploy-target';

const result = checkDeployTarget(process.env.EXPO_PUBLIC_SUPABASE_URL);

if (!result.ok) {
  console.error(`\ndeploy durduruldu: ${result.reason}`);
  console.error(
    'Yayına giden paket bu adresi içine gömüyor; yerel ya da eksik bir\n' +
      'adresle dağıtım, sadece bu makinede çalışan bir site demek.\n' +
      'apps/mobile/.env dosyasının hosted projeyi gösterdiğinden emin ol,\n' +
      've deploy komutunu `contracts/init.sh` çalıştırılmış bir kabuktan\n' +
      'verme — o kabuk yerel yığının adresini export ediyor.\n',
  );
  process.exit(1);
}

console.log(`deploy hedefi: ${result.host}`);
