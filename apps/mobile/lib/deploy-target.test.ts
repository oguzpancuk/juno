import { describe, expect, it } from 'vitest';
import {
  checkDeployKey,
  checkDeployTarget,
  effectiveValue,
  parseEnvFile,
} from './deploy-target';

const HOSTED = 'https://jkxuhbuuhsumyjmlskls.supabase.co';

/** The reason, or '' when the check passed — so a test can assert on it. */
const reasonOf = (result: ReturnType<typeof checkDeployTarget>): string =>
  result.ok ? '' : result.reason;

describe('checkDeployTarget', () => {
  it('accepts the hosted project', () => {
    expect(checkDeployTarget(HOSTED)).toEqual({
      ok: true,
      host: 'jkxuhbuuhsumyjmlskls.supabase.co',
    });
  });

  it('refuses the local stack, in every spelling it appears in', () => {
    // The first is exactly what `contracts/init.sh` exports, which is the
    // shell a deploy is most likely to be run from by accident. The rest
    // are the ones a deny-list version of this function let through.
    for (const local of [
      'http://127.0.0.1:54321',
      'https://127.0.0.1:54321',
      'https://localhost:54321',
      'https://[::1]:54321',
      'https://[fe80::1]:54321',
      'https://[fc00::1]:54321',
      'https://[::ffff:127.0.0.1]:54321',
      'https://0.0.0.0:54321',
      'https://Oguz-MacBook-Air.local:54321',
      'https://oguz-macbook:54321',
      'https://192.168.1.20:54321',
      'https://10.0.0.5:54321',
      'https://100.64.1.1:54321',
      'https://supabase.internal',
      'https://127.0.0.1.nip.io',
      'https://2130706433',
    ]) {
      expect(checkDeployTarget(local).ok).toBe(false);
    }
  });

  it('says WHY it refused, not just that it did', () => {
    // A refusal test that only asserts `ok === false` passes when the
    // refusal happens for an unrelated reason, which is how a rule gets
    // deleted with its test still green.
    expect(checkDeployTarget(undefined)).toEqual({
      ok: false,
      reason: 'EXPO_PUBLIC_SUPABASE_URL boş',
    });
    expect(
      reasonOf(checkDeployTarget('jkxuhbuuhsumyjmlskls.supabase.co')),
    ).toMatch(/okunamadı/u);
    expect(reasonOf(checkDeployTarget('http://ref.supabase.co'))).toMatch(
      /https değil/u,
    );
    expect(reasonOf(checkDeployTarget('https://127.0.0.1:54321'))).toMatch(
      /hosted Supabase adresi değil/u,
    );
  });

  it('refuses a host that merely ends in the right letters', () => {
    // `evilsupabase.co` is not `*.supabase.co`, and the bare suffix is
    // nobody's project.
    expect(checkDeployTarget('https://evilsupabase.co').ok).toBe(false);
    expect(checkDeployTarget('https://supabase.co').ok).toBe(false);
  });
});

describe('checkDeployKey', () => {
  const demo = `x.${Buffer.from(
    JSON.stringify({ iss: 'supabase-demo', role: 'anon' }),
  ).toString('base64url')}.y`;
  const hosted = `x.${Buffer.from(
    JSON.stringify({ iss: 'supabase', role: 'anon' }),
  ).toString('base64url')}.y`;

  it("refuses the local stack's demo key, which every install shares", () => {
    expect(checkDeployKey(demo)).toEqual({
      ok: false,
      reason: 'yerel yığının demo anon anahtarı',
    });
  });

  it('accepts a hosted project key', () => {
    expect(checkDeployKey(hosted).ok).toBe(true);
  });

  it('accepts a publishable key, which is not a JWT at all', () => {
    expect(checkDeployKey('sb_publishable_ACJWlzQHlZjBrEguHvfOxg').ok).toBe(
      true,
    );
  });

  it('refuses an empty key by name', () => {
    expect(checkDeployKey(undefined)).toEqual({
      ok: false,
      reason: 'EXPO_PUBLIC_SUPABASE_ANON_KEY boş',
    });
  });
});

describe('parseEnvFile', () => {
  it('reads the file this repo writes', () => {
    expect(
      parseEnvFile(
        [
          '# Hosted proje. Gitignored.',
          '',
          'EXPO_PUBLIC_SUPABASE_URL=https://ref.supabase.co',
          'EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi.abc',
        ].join('\n'),
      ),
    ).toEqual({
      EXPO_PUBLIC_SUPABASE_URL: 'https://ref.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOi.abc',
    });
  });

  it('keeps a value that contains an equals sign', () => {
    // Base64 and JWT padding both end in one; splitting on every `=`
    // would truncate the anon key.
    expect(parseEnvFile('K=a=b==').K).toBe('a=b==');
  });

  it('strips one layer of quotes and nothing else', () => {
    expect(parseEnvFile('K="v"').K).toBe('v');
    expect(parseEnvFile("K='v'").K).toBe('v');
    expect(parseEnvFile('K=v"w').K).toBe('v"w');
  });

  it('ignores blanks, comments and lines with no key', () => {
    expect(parseEnvFile('\n# yorum\n=degersiz\nK=v\n')).toEqual({ K: 'v' });
  });
});

describe('effectiveValue', () => {
  const file = { K: 'https://from-file.supabase.co' };

  it('lets the shell win, because that is what Expo does', () => {
    // And it is the whole reason the gate exists: `contracts/init.sh`
    // exports the local URL into the shell, over a file that is correct.
    expect(effectiveValue('http://127.0.0.1:54321', file, 'K')).toBe(
      'http://127.0.0.1:54321',
    );
  });

  it('falls back to the file when the shell has nothing', () => {
    expect(effectiveValue(undefined, file, 'K')).toBe(file.K);
    expect(effectiveValue('', file, 'K')).toBe(file.K);
  });

  it('is undefined when neither has it', () => {
    expect(effectiveValue(undefined, {}, 'K')).toBeUndefined();
  });
});
