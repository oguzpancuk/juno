import type { Href } from 'expo-router';
import { z } from 'zod';

/**
 * Whether a member has to accept the privacy notice again before the app
 * goes on (KVKK, re-consent).
 *
 * The version is the date of the notice's text (`LEGAL_VERSION` in
 * `legal.ts`, `profiles.consent_version` in the database): a new text
 * goes live with a new date, never under the old one, so a member whose
 * stored date is older than the current one agreed to a text that is no
 * longer the one in force. Every change to the text asks again, not only
 * the ones someone judged material: what a member agreed to is the
 * whole text their record names, and the one-version-per-day rule
 * already keeps the asking rare.
 *
 * Only older asks. A phone on an older bundle, after its member accepted
 * a newer text on the web, carries an older `LEGAL_VERSION` than the
 * record; the database refuses to move a record backwards
 * (`profiles_set_consent`), and nothing about the member's consent is
 * missing.
 *
 * Pure, and apart from `consent.ts` for the reason `premium-rules.ts` is
 * apart from `premium.ts`: no React Native and no Supabase client, so
 * Vitest drives it.
 */
export function needsConsent(accepted: string, current: string): boolean {
  // Both are `YYYY-MM-DD` (the schema below), whose string order is the
  // calendar's.
  return accepted < current;
}

/** A `date` column as PostgREST sends it. */
export const ConsentVersionSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'consent_version is not YYYY-MM-DD');

/**
 * The tab screens a member can be stopped on the way into, with the one
 * query a tab URL carries: the chat's `?page=match`, the Uyum page
 * (`matchDetailHref`). `lib/routes.test.ts` checks it against the route
 * tree, so a screen added under (tabs) cannot be left out.
 */
const TAB_PATH =
  /^\/(?:discover|matches|profile|(?:match|starter)\/[A-Za-z0-9-]+|chat\/[A-Za-z0-9-]+(?:\?page=match)?)$/;

/**
 * The URL the gate stopped a member at, as `returnPath` takes it back:
 * the path, and the chat's page when it is the Uyum one.
 */
export function stoppedAt(pathname: string, page: unknown): string {
  return page === 'match' ? `${pathname}?page=match` : pathname;
}

/**
 * Where accepting the notice returns to: the tab screen the gate stopped
 * the member on the way into (`/consent?next=…`), so a chat opened from a
 * link opens once they accept. The param is part of a URL anyone can
 * type, so only the app's own tab paths are taken — never another host,
 * never `/consent` itself — and anything else is the deck.
 */
export function returnPath(raw: string | string[] | undefined): Href {
  // why: typed routes know the tab paths as a union of templates, which a
  // string cannot be narrowed to; TAB_PATH admits only those paths.
  return (
    typeof raw === 'string' && TAB_PATH.test(raw) ? raw : '/discover'
  ) as Href;
}
