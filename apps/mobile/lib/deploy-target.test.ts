import { describe, expect, it } from 'vitest';
import { checkDeployTarget } from './deploy-target';

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
