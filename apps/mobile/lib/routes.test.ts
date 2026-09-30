// TypeScript 6 no longer includes every visible @types package on its
// own, and the app's tsconfig deliberately lists none: this is the one
// file in the app that reads the filesystem, and it runs under Vitest.
/// <reference types="node" />
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { returnPath } from './consent-rules';

/**
 * The shape of the route tree is a property, not a preference: every
 * signed-in screen sits on a stack inside its tab, so the tab bar is under
 * all of them and the root stack never holds more than one signed-in
 * route (docs/NOTES.md 2026-09-11, the two-navigator bug). Nothing in the
 * battery would otherwise notice a screen added at the root, and the
 * failure it causes — a screen with no bar and nowhere to go — is only
 * visible in the simulator.
 */

const APP = resolve(import.meta.dirname, '..', 'app');

/** Screens that exist before there is a session, or serve both sides. */
const SIGNED_OUT = new Set([
  '_layout.tsx',
  'index.tsx',
  'welcome.tsx',
  'sign-in.tsx',
  // The code screen: an account exists, but there is no session until the
  // mailed code is spent here.
  'verify.tsx',
  'onboarding.tsx',
  // Re-consent: like onboarding, a signed-in screen that stands before the
  // tabs rather than inside one, and the only route on the root stack
  // while it is up.
  'consent.tsx',
  'legal.tsx',
]);

describe('route tree', () => {
  it('keeps only the signed-out screens at the root of app/', () => {
    const rootFiles = readdirSync(APP).filter((name) =>
      statSync(join(APP, name)).isFile(),
    );
    const unexpected = rootFiles.filter((name) => !SIGNED_OUT.has(name));
    expect(unexpected).toEqual([]);
    // Every root entry that is not a file is the one tab group.
    const rootDirs = readdirSync(APP).filter((name) =>
      statSync(join(APP, name)).isDirectory(),
    );
    expect(rootDirs).toEqual(['(tabs)']);
  });

  it('gives every tab group a stack layout with an anchor', () => {
    const tabs = join(APP, '(tabs)');
    const groups = readdirSync(tabs).filter(
      (name) =>
        statSync(join(tabs, name)).isDirectory() &&
        // A single group, `(x)`. The tree holds only these three today;
        // the test keeps excluding a shared `(a,b)` directory because such
        // a directory is not a navigator of its own — its screens are
        // copied into each group it names, so it has no layout to check.
        /^\([^,]+\)$/.test(name),
    );
    expect(groups.sort()).toEqual(['(discover)', '(matches)', '(profile)']);
    for (const group of groups) {
      const layout = readFileSync(join(tabs, group, '_layout.tsx'), 'utf8');
      // A static export: expo-router reads it while building the route
      // table, so a value computed at render time would be ignored.
      const anchor = layout.match(
        /export const unstable_settings = \{ initialRouteName: '([a-z]+)' \}/,
      );
      expect(anchor).not.toBeNull();
      // The anchor must be a screen of that group: a misspelt one throws
      // at startup on a cold deep link, which no other check would see.
      expect(existsSync(join(tabs, group, `${anchor?.[1]}.tsx`))).toBe(true);
      expect(layout).toContain("from '@/components/TabStack'");
    }
  });

  it('lets the notice gate return to every screen inside the tabs', () => {
    // `returnPath` keeps a hand-written list of the tab paths; a screen
    // added under (tabs) that it does not know would quietly send a
    // member who accepted the notice there to the deck instead (review
    // of #19). One sample URL per screen: groups drop out of the URL, a
    // `[param]` segment becomes a value.
    const samples: string[] = [];
    const walk = (dir: string, url: string): void => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
          walk(full, /^\(.*\)$/.test(name) ? url : `${url}/${name}`);
        } else if (name.endsWith('.tsx') && name !== '_layout.tsx') {
          const segment = name.slice(0, -'.tsx'.length);
          samples.push(`${url}/${segment.replace(/^\[.+\]$/, 'abc-123')}`);
        }
      }
    };
    walk(join(APP, '(tabs)'), '');
    expect(samples.length).toBeGreaterThan(0);
    for (const sample of samples) expect(returnPath(sample)).toBe(sample);
  });
});
