import { describe, expect, it } from 'vitest';
import {
  checkDeployTarget,
  effectiveValue,
  parseEnvFile,
} from './deploy-target';

const HOSTED = 'https://jkxuhbuuhsumyjmlskls.supabase.co';

describe('checkDeployTarget', () => {
  it('accepts the hosted project', () => {
    expect(checkDeployTarget(HOSTED)).toEqual({
      ok: true,
      host: 'jkxuhbuuhsumyjmlskls.supabase.co',
    });
  });

  it('refuses the local stack, in every spelling it appears in', () => {
    // The first is exactly what `contracts/init.sh` exports, which is the
    // shell a deploy is most likely to be run from by accident.
    for (const local of [
      'http://127.0.0.1:54321',
      'https://127.0.0.1:54321',
      'https://localhost:54321',
      'https://[::1]:54321',
      'https://0.0.0.0:54321',
      'https://Oguz-MacBook-Air.local:54321',
      'https://192.168.1.20:54321',
      'https://10.0.0.5:54321',
      'https://172.16.0.9:54321',
      'https://169.254.1.1:54321',
    ]) {
      expect(checkDeployTarget(local).ok).toBe(false);
    }
  });

  it('refuses an unset or unreadable value', () => {
    expect(checkDeployTarget(undefined).ok).toBe(false);
    expect(checkDeployTarget('').ok).toBe(false);
    expect(checkDeployTarget('jkxuhbuuhsumyjmlskls.supabase.co').ok).toBe(
      false,
    );
  });

  it('refuses plain http even to a public host', () => {
    // The anon key travels on every request; a deploy that ships an http
    // URL puts it on the wire in clear for every visitor.
    expect(
      checkDeployTarget('http://jkxuhbuuhsumyjmlskls.supabase.co').ok,
    ).toBe(false);
  });

  it('does not mistake a public host for a private one', () => {
    for (const public_ of [
      'https://127001.supabase.co',
      'https://local.supabase.co',
      'https://10-0-0-5.supabase.co',
      'https://172.32.0.1',
      'https://192.169.0.1',
    ]) {
      expect(checkDeployTarget(public_).ok).toBe(true);
    }
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
