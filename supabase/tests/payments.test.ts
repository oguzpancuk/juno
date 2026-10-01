import { readFileSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { Json } from './database.types';
import { ISTANBUL_NEARBY, profileRow } from './fixtures';
import {
  adminClient,
  createUser,
  deleteUsers,
  localStack,
  type TestUser,
} from './local';

/**
 * Premium bought in the App Store, the server's side (payments plan, PR 1
 * of 4; ADR-0015): the `revenuecat-webhook` Edge Function, the
 * `entitlements` table it writes through `apply_revenuecat_event`, and
 * the sweep that ends what a lost webhook would leave running.
 *
 * The function runs on the local edge runtime. The Authorization value
 * RevenueCat would send is read from supabase/functions/.env, the file
 * `supabase start` loads into that runtime, so the two cannot drift.
 */

const admin = adminClient();
const users: TestUser[] = [];

const PERMISSION_DENIED = '42501';
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const AUTH = (() => {
  const env = readFileSync(
    new URL('../functions/.env', import.meta.url),
    'utf8',
  );
  const line = env
    .split('\n')
    .find((entry) => entry.startsWith('REVENUECAT_WEBHOOK_AUTH='));
  if (!line) {
    throw new Error('supabase/functions/.env has no REVENUECAT_WEBHOOK_AUTH');
  }
  return line.slice('REVENUECAT_WEBHOOK_AUTH='.length).trim();
})();

const endpoint = (): string =>
  `${localStack().API_URL}/functions/v1/revenuecat-webhook`;

const Answer = z.object({ outcome: z.string() });

async function post(
  body: unknown,
  authorization: string | null = AUTH,
): Promise<{ status: number; outcome: string | undefined }> {
  const response = await fetch(endpoint(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authorization === null ? {} : { authorization }),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  const raw: unknown = await response.json();
  const parsed = Answer.safeParse(raw);
  return {
    status: response.status,
    outcome: parsed.success ? parsed.data.outcome : undefined,
  };
}

/** A member with a profile, as onboarding leaves them. */
async function member(tag: string): Promise<TestUser> {
  const created = await createUser(admin, tag);
  users.push(created); // pushed at once so cleanup covers a partial setup
  const { error } = await admin.from('profiles').insert(
    profileRow({
      id: created.id,
      display_name: tag,
      gender: 'woman',
      interested_in: 'men',
      lonLat: ISTANBUL_NEARBY,
      photos: [],
    }),
  );
  if (error) throw new Error(`profile for ${tag}: ${error.message}`);
  return created;
}

let sequence = 0;

/**
 * A RevenueCat event, shaped as its webhook sends one: the fields the
 * rules read plus some of the ones the function must drop.
 */
type Event = { [key: string]: Json | undefined };

function event(
  type: string,
  appUserId: string,
  fields: Event = {},
): { api_version: string; event: Event } {
  sequence += 1;
  return {
    api_version: '1.0',
    event: {
      id: `evt-${Date.now()}-${sequence}`,
      type,
      event_timestamp_ms: Date.now(),
      app_id: 'app-test',
      app_user_id: appUserId,
      original_app_user_id: appUserId,
      aliases: [appUserId],
      entitlement_ids: ['premium'],
      product_id: 'juno_premium_monthly',
      period_type: 'NORMAL',
      purchased_at_ms: Date.now(),
      expiration_at_ms: Date.now() + 30 * DAY,
      store: 'APP_STORE',
      environment: 'SANDBOX',
      transaction_id: `tx-${sequence}`,
      original_transaction_id: `otx-${appUserId}`,
      country_code: 'TR',
      currency: 'TRY',
      price: 4.99,
      ...fields,
    },
  };
}

const Premium = z.object({
  is_premium: z.boolean(),
  premium_since: z.string().nullable(),
});

async function premiumOf(who: TestUser) {
  const { data, error } = await admin
    .from('profiles')
    .select('is_premium, premium_since')
    .eq('id', who.id)
    .single();
  if (error) throw new Error(`profile of ${who.email}: ${error.message}`);
  return Premium.parse(data);
}

const EntitlementRows = z.array(
  z.object({
    user_id: z.string().uuid(),
    product_id: z.string(),
    store: z.string(),
    environment: z.enum(['SANDBOX', 'PRODUCTION']),
    expires_at: z.string(),
    active: z.boolean(),
    last_event_type: z.string(),
  }),
);

async function entitlementsOf(who: TestUser) {
  const { data, error } = await admin
    .from('entitlements')
    .select(
      'user_id, product_id, store, environment, expires_at, active, last_event_type',
    )
    .eq('user_id', who.id);
  if (error) throw new Error(`entitlements of ${who.email}: ${error.message}`);
  return EntitlementRows.parse(data);
}

afterAll(async () => {
  await deleteUsers(admin, users);
}, 120_000);

describe('who may call the webhook', () => {
  it('refuses a call without RevenueCat’s header, or with another one, and writes nothing', async () => {
    const ece = await member('ece');
    const purchase = event('INITIAL_PURCHASE', ece.id);

    expect((await post(purchase, null)).status).toBe(401);
    expect((await post(purchase, `${AUTH}x`)).status).toBe(401);
    expect((await post(purchase, 'Bearer guess')).status).toBe(401);

    expect(await entitlementsOf(ece)).toEqual([]);
    expect((await premiumOf(ece)).is_premium).toBe(false);
  });

  it('answers a body that is not an event with 400', async () => {
    expect((await post('{not json')).status).toBe(400);
    expect((await post({ event: { type: 'RENEWAL' } })).status).toBe(400);
  });
});

describe('what an event does', () => {
  it('a purchase makes the member premium, and the row is theirs to read alone', async () => {
    const ada = await member('ada');
    const bob = await member('bob');

    const answer = await post(event('INITIAL_PURCHASE', ada.id));
    expect(answer).toEqual({ status: 200, outcome: 'applied' });

    const premium = await premiumOf(ada);
    expect(premium.is_premium).toBe(true);
    expect(premium.premium_since).not.toBeNull();
    const [row] = await entitlementsOf(ada);
    expect(row).toMatchObject({
      product_id: 'juno_premium_monthly',
      store: 'APP_STORE',
      environment: 'SANDBOX',
      active: true,
      last_event_type: 'INITIAL_PURCHASE',
    });

    const own = await ada.client.from('entitlements').select('user_id');
    expect(own.error).toBeNull();
    expect(own.data).toEqual([{ user_id: ada.id }]);
    const other = await bob.client.from('entitlements').select('user_id');
    expect(other.error).toBeNull();
    expect(other.data).toEqual([]);
  });

  it('a retried delivery and an older event change nothing', async () => {
    const cem = await member('cem');
    const renewal = event('RENEWAL', cem.id);
    expect((await post(renewal)).outcome).toBe('applied');
    expect((await post(renewal)).outcome).toBe('applied');

    const late = event('EXPIRATION', cem.id, {
      event_timestamp_ms: Date.now() - HOUR,
      expiration_at_ms: Date.now() - HOUR,
    });
    expect(await post(late)).toEqual({ status: 200, outcome: 'stale' });
    expect((await premiumOf(cem)).is_premium).toBe(true);
  });

  it('switching auto-renew off keeps what was paid for; an expiry ends it', async () => {
    const deniz = await member('deniz');
    await post(event('INITIAL_PURCHASE', deniz.id));

    await post(
      event('CANCELLATION', deniz.id, { cancel_reason: 'UNSUBSCRIBE' }),
    );
    expect((await premiumOf(deniz)).is_premium).toBe(true);

    await post(
      event('EXPIRATION', deniz.id, { expiration_at_ms: Date.now() - 1000 }),
    );
    const after = await premiumOf(deniz);
    expect(after.is_premium).toBe(false);
    expect(after.premium_since).toBeNull();
  });

  it('a refund ends premium at once, whatever expiry the event carries', async () => {
    const efe = await member('efe');
    await post(event('INITIAL_PURCHASE', efe.id));

    await post(
      event('CANCELLATION', efe.id, { cancel_reason: 'CUSTOMER_SUPPORT' }),
    );
    expect((await premiumOf(efe)).is_premium).toBe(false);
    expect((await entitlementsOf(efe))[0]?.active).toBe(false);
  });

  it('Apple’s billing grace period counts as paid', async () => {
    const gul = await member('gul');
    await post(
      event('BILLING_ISSUE', gul.id, {
        expiration_at_ms: Date.now() - HOUR,
        grace_period_expiration_at_ms: Date.now() + DAY,
      }),
    );
    expect((await premiumOf(gul)).is_premium).toBe(true);
  });

  it('a transfer moves the purchase to the account that restored it', async () => {
    const from = await member('han');
    const to = await member('ilk');
    await post(event('INITIAL_PURCHASE', from.id));

    const answer = await post({
      api_version: '1.0',
      event: {
        id: `evt-transfer-${Date.now()}`,
        type: 'TRANSFER',
        event_timestamp_ms: Date.now() + 1,
        transferred_from: [from.id],
        transferred_to: ['$RCAnonymousID:0a1b2c', to.id],
        store: 'APP_STORE',
        environment: 'SANDBOX',
      },
    });
    expect(answer).toEqual({ status: 200, outcome: 'applied' });
    expect((await premiumOf(from)).is_premium).toBe(false);
    expect((await premiumOf(to)).is_premium).toBe(true);
  });

  it('answers 200 to events it has no use for, and writes nothing', async () => {
    const jale = await member('jale');
    const cases: readonly [unknown, string][] = [
      [event('TEST', jale.id), 'ignored: test event'],
      [
        event('INITIAL_PURCHASE', jale.id, { entitlement_ids: ['gold'] }),
        'ignored: not premium',
      ],
      [
        event('INITIAL_PURCHASE', '$RCAnonymousID:0a1b2c'),
        'ignored: unknown member',
      ],
      [
        event('INITIAL_PURCHASE', '00000000-0000-4000-8000-000000000000'),
        'ignored: unknown member',
      ],
      [
        event('NON_RENEWING_PURCHASE', jale.id, { expiration_at_ms: null }),
        'ignored: no expiry',
      ],
    ];
    for (const [body, outcome] of cases) {
      expect(await post(body)).toEqual({ status: 200, outcome });
    }
    expect(await entitlementsOf(jale)).toEqual([]);
    expect((await premiumOf(jale)).is_premium).toBe(false);
  });
});

describe('when no webhook comes', () => {
  it('the sweep ends a purchase whose time is up', async () => {
    const kaan = await member('kaan');
    await post(
      event('INITIAL_PURCHASE', kaan.id, {
        expiration_at_ms: Date.now() + 1500,
      }),
    );
    expect((await premiumOf(kaan)).is_premium).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 2000));
    // No count asserted: pg_cron runs the same sweep every five minutes
    // and may have got there first. What matters is the flag.
    const swept = await admin.rpc('expire_entitlements');
    expect(swept.error).toBeNull();
    expect((await premiumOf(kaan)).is_premium).toBe(false);
  });
});

describe('what a member cannot do', () => {
  it('cannot write an entitlement, apply an event or run the sweep', async () => {
    const lale = await member('lale');

    const insert = await lale.client.from('entitlements').insert({
      user_id: lale.id,
      product_id: 'juno_premium_monthly',
      store: 'APP_STORE',
      environment: 'PRODUCTION',
      expires_at: new Date(Date.now() + 365 * DAY).toISOString(),
      active: true,
      last_event_id: 'forged',
      last_event_type: 'INITIAL_PURCHASE',
      last_event_at: new Date().toISOString(),
    });
    expect(insert.error?.code).toBe(PERMISSION_DENIED);

    const apply = await lale.client.rpc('apply_revenuecat_event', {
      event: event('INITIAL_PURCHASE', lale.id).event,
    });
    expect(apply.error?.code).toBe(PERMISSION_DENIED);

    const sweep = await lale.client.rpc('expire_entitlements');
    expect(sweep.error?.code).toBe(PERMISSION_DENIED);

    expect(await entitlementsOf(lale)).toEqual([]);
    expect((await premiumOf(lale)).is_premium).toBe(false);
  });

  it('a member who bought cannot stretch their own expiry', async () => {
    const mira = await member('mira');
    await post(event('INITIAL_PURCHASE', mira.id));

    const update = await mira.client
      .from('entitlements')
      .update({ expires_at: new Date(Date.now() + 3650 * DAY).toISOString() })
      .eq('user_id', mira.id);
    expect(update.error?.code).toBe(PERMISSION_DENIED);
  });
});
