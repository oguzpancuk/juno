import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const AppJson = z.object({
  expo: z.object({
    ios: z.object({
      infoPlist: z
        .object({
          CFBundleDevelopmentRegion: z.string().optional(),
          CFBundleLocalizations: z.array(z.string()).optional(),
        })
        .optional(),
    }),
  }),
});

describe('the iOS bundle', () => {
  it('declares Turkish, so system-drawn buttons speak it', () => {
    // Apple's Sign in with Apple button titles itself in a language the
    // app bundle declares, not simply the phone's. With none declared a
    // prebuild makes the bundle English-only, and a Turkish phone shows
    // "Sign in with Apple" between two Turkish buttons.
    const app = AppJson.parse(
      JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')),
    );
    const plist = app.expo.ios.infoPlist;
    expect(plist?.CFBundleDevelopmentRegion).toBe('tr');
    expect(plist?.CFBundleLocalizations).toEqual(['tr']);
  });
});
