/**
 * The twenty demo profiles the product launches with, written to whatever
 * project the environment points at — the local stack or the hosted one.
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npx tsx supabase/scripts/seed-demo.ts
 *
 * Unlike `gen-seed.ts`, whose six users exist only inside a local
 * `db reset`, these are meant to be live: the owner asked for twenty
 * accounts with real photographs so the deck is not empty on the first
 * day (2026-09-17). Each one gets an auth user, one portrait from
 * `assets/demo-photos/`, and a profile row with `is_demo` set — the flag
 * `private.likes_demo_reciprocate` reads to answer a member's like and so
 * produce a match.
 *
 * The charts are real. Birth city, date and time are made up, but they go
 * through `@juno/geo` and `@juno/astro` exactly as a member's would, so
 * every compatibility score, aspect and starter on screen is the engine's
 * own arithmetic rather than a plausible-looking constant.
 *
 * Idempotent: run it twice and the second run reuses each account and
 * refreshes the parts of the row that are allowed to change. Birth data
 * is immutable after insert (a trigger says so), so a demo's chart can
 * only be changed by deleting the account first.
 *
 * The photographs are synthetic — generated faces, not photographs of
 * people — which is why they can be committed and shown without anyone's
 * permission. Replacing one with a real person's picture would need
 * theirs.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bigThree, computeChart, toPublicChart } from '@juno/astro';
import { resolveBirth, searchCities } from '@juno/geo';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

const EnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
});

/**
 * Mirrors `LEGAL_VERSION` in apps/mobile/lib/legal.ts.
 *
 * A demo account has not consented to anything — there is nobody there to
 * consent — but the column is NOT NULL because a member's profile must
 * never exist without a record of which notice they accepted. What it
 * means on these rows is narrower: the version of the notice in force
 * when the account was made.
 */
const CONSENT_VERSION = '2026-09-17';

/** Where the portraits live, relative to this file. */
const PHOTOS = join(import.meta.dirname, '..', '..', 'assets', 'demo-photos');

type Gender = 'woman' | 'man';

interface Demo {
  /** Photo file name, e-mail local part, and the row's stable handle. */
  readonly slug: string;
  readonly name: string;
  readonly gender: Gender;
  /** City the chart is cast for. */
  readonly birthCity: string;
  readonly birth: readonly [
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
  ];
  /** Where they live now, in Istanbul: [longitude, latitude]. */
  readonly home: readonly [number, number];
  readonly bio: string;
}

/**
 * All twenty in Istanbul, which is the owner's call (2026-09-17): the
 * deck filters on the viewer's radius, so a demo in another city is a
 * demo nobody in Istanbul sees, and Istanbul is where the first members
 * will be. They are spread over about twenty kilometres so the distances
 * on the cards differ.
 *
 * `interested_in` is 'everyone' for all of them, and is not in this table
 * for that reason: the deck also applies the *other* side's preference,
 * so anything narrower would hide demos from some members for no reason
 * a demo can have.
 */
const DEMOS: readonly Demo[] = [
  {
    slug: 'elif',
    name: 'Elif',
    gender: 'woman',
    birthCity: 'İzmir',
    birth: [1996, 6, 18, 7, 20],
    home: [29.02, 41.05],
    bio: 'Sahil yürüyüşleri, uzun kahvaltılar ve bitmeyen kitap listesi.',
  },
  {
    slug: 'zeynep',
    name: 'Zeynep',
    gender: 'woman',
    birthCity: 'İstanbul',
    birth: [1998, 2, 3, 15, 45],
    home: [28.97, 41.03],
    bio: 'Üçüncü dalga kahveci avcısı. Pazar sabahları en iyi hâlim.',
  },
  {
    slug: 'defne',
    name: 'Defne',
    gender: 'woman',
    birthCity: 'Ankara',
    birth: [1995, 9, 27, 21, 10],
    home: [29.06, 41.01],
    bio: 'Mimarım. Şehrin yüksek katlarından bakmayı seviyorum.',
  },
  {
    slug: 'selin',
    name: 'Selin',
    gender: 'woman',
    birthCity: 'Bursa',
    birth: [1994, 4, 11, 5, 5],
    home: [28.9, 41.08],
    bio: 'Hafta sonu dağdayım, hafta içi ekrandayım. Dengeyi arıyorum.',
  },
  {
    slug: 'ece',
    name: 'Ece',
    gender: 'woman',
    birthCity: 'Antalya',
    birth: [1999, 11, 8, 12, 30],
    home: [29.12, 40.99],
    bio: 'Evimde on dört saksı var ve hepsinin adı var.',
  },
  {
    slug: 'nazli',
    name: 'Nazlı',
    gender: 'woman',
    birthCity: 'İstanbul',
    birth: [1997, 1, 22, 18, 55],
    home: [28.94, 41.01],
    bio: 'Kadıköy sokaklarında kaybolmayı seviyorum. Plan yapmayı sevmiyorum.',
  },
  {
    slug: 'irem',
    name: 'İrem',
    gender: 'woman',
    birthCity: 'Eskişehir',
    birth: [1993, 8, 14, 9, 40],
    home: [29.18, 40.97],
    bio: 'Seramikle uğraşıyorum. Elimde çamur varken en sakin hâlimdeyim.',
  },
  {
    slug: 'melis',
    name: 'Melis',
    gender: 'woman',
    birthCity: 'İstanbul',
    birth: [2000, 3, 30, 23, 15],
    home: [29.0, 40.98],
    bio: 'Çevirmenim. İki dilde aynı şakayı anlatmaya çalışıyorum.',
  },
  {
    slug: 'ayse',
    name: 'Ayşe',
    gender: 'woman',
    birthCity: 'Adana',
    birth: [1992, 12, 5, 3, 25],
    home: [28.88, 41.04],
    bio: 'Plak biriktiriyorum. Sana bir şey çalmama izin verir misin?',
  },
  {
    slug: 'bengisu',
    name: 'Bengisu',
    gender: 'woman',
    birthCity: 'Trabzon',
    birth: [1995, 5, 19, 11, 0],
    home: [29.09, 41.07],
    bio: 'Sabah koşusu, akşam sessizlik. Arası sana açık.',
  },
  {
    slug: 'kerem',
    name: 'Kerem',
    gender: 'man',
    birthCity: 'İstanbul',
    birth: [1994, 7, 7, 6, 50],
    home: [29.04, 41.02],
    bio: 'Fotoğraf çekiyorum, çoğu zaman aynı köprüyü.',
  },
  {
    slug: 'emre',
    name: 'Emre',
    gender: 'man',
    birthCity: 'İzmir',
    birth: [1996, 10, 16, 14, 5],
    home: [28.96, 41.06],
    bio: 'Kahve, bisiklet, uzun sohbet. Sıralama değişebilir.',
  },
  {
    slug: 'berk',
    name: 'Berk',
    gender: 'man',
    birthCity: 'Ankara',
    birth: [1999, 1, 9, 20, 35],
    home: [29.14, 41.0],
    bio: 'Yazılımcıyım ama akşamları gitar daha çok işe yarıyor.',
  },
  {
    slug: 'onur',
    name: 'Onur',
    gender: 'man',
    birthCity: 'Gaziantep',
    birth: [1991, 3, 2, 8, 10],
    home: [28.92, 41.0],
    bio: 'Mutfakta iddialıyım. Sofrada iddiamı kanıtlarım.',
  },
  {
    slug: 'deniz',
    name: 'Deniz',
    gender: 'man',
    birthCity: 'Muğla',
    birth: [1997, 6, 25, 16, 20],
    home: [29.2, 41.04],
    bio: 'Yaz boyunca teknede, kış boyunca yazın hikâyelerini anlatırım.',
  },
  {
    slug: 'mert',
    name: 'Mert',
    gender: 'man',
    birthCity: 'İstanbul',
    birth: [1993, 11, 13, 1, 45],
    home: [28.99, 41.09],
    bio: 'Gün batımında şehre yukarıdan bakmak için bahane arıyorum.',
  },
  {
    slug: 'kaan',
    name: 'Kaan',
    gender: 'man',
    birthCity: 'Konya',
    birth: [1998, 9, 4, 10, 30],
    home: [29.07, 40.96],
    bio: 'Vinil, kitap ve eski filmler. Yeni önerilere de açığım.',
  },
  {
    slug: 'baran',
    name: 'Baran',
    gender: 'man',
    birthCity: 'Diyarbakır',
    birth: [1992, 2, 27, 19, 0],
    home: [28.86, 41.02],
    bio: 'Müzik yapıyorum. Çoğu zaman kimse duymadan.',
  },
  {
    slug: 'arda',
    name: 'Arda',
    gender: 'man',
    birthCity: 'Kayseri',
    birth: [2000, 8, 21, 4, 15],
    home: [29.16, 41.06],
    bio: 'Kamp, harita, termos. Şehirden çıkmak için sebep gerekmiyor.',
  },
  {
    slug: 'umut',
    name: 'Umut',
    gender: 'man',
    birthCity: 'Samsun',
    birth: [1995, 12, 30, 13, 55],
    home: [29.01, 40.99],
    bio: 'Sabah antrenman, akşam tarif deneme. Arada iş de yapıyorum.',
  },
];

const pad = (n: number): string => String(n).padStart(2, '0');

/** A city id from the list the app itself searches; never a literal. */
function cityId(name: string): number {
  const hit = searchCities(name, 5).find(
    (city) => city.country === 'TR' && city.name === name,
  );
  if (!hit) throw new Error(`no Turkish city named ${name} in @juno/geo`);
  return hit.id;
}

const ProfileIds = z.array(z.object({ id: z.string().uuid() }));

/** Every existing account's id, by e-mail. GoTrue has no lookup by name. */
async function usersByEmail(
  admin: SupabaseClient,
): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw new Error(`listUsers: ${error.message}`);
    for (const user of data.users) {
      if (user.email) found.set(user.email.toLowerCase(), user.id);
    }
    if (data.users.length < 1000) return found;
  }
}

/**
 * A password nobody holds. These accounts exist to own a profile row and
 * a photo; nothing signs in as one. Recovering one is a password reset
 * from the Supabase dashboard, which is the owner's to do.
 *
 * One UUID, not two: GoTrue hashes with bcrypt and refuses anything over
 * 72 characters, which two of them exceed. Thirty-six characters of
 * `crypto.randomUUID` carry 122 bits, and nothing is guessing that.
 */
function unusablePassword(): string {
  return `demo-${crypto.randomUUID()}`;
}

async function main(): Promise<void> {
  const env = EnvSchema.parse(process.env);
  const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const existing = await usersByEmail(admin);
  let created = 0;
  let refreshed = 0;

  for (const demo of DEMOS) {
    const email = `demo+${demo.slug}@juno-dating.com`;
    const file = join(PHOTOS, `${demo.slug}.jpg`);
    if (!existsSync(file)) throw new Error(`no portrait at ${file}`);

    let id = existing.get(email);
    if (id === undefined) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: unusablePassword(),
        email_confirm: true,
      });
      if (error) throw new Error(`createUser ${email}: ${error.message}`);
      id = data.user.id;
      created += 1;
    } else {
      refreshed += 1;
    }

    // The photo first: `profiles_check_photos` refuses a row whose path
    // names no object, so the upload has to land before the insert.
    const path = `${id}/1.jpg`;
    const uploaded = await admin.storage
      .from('photos')
      .upload(path, readFileSync(file), {
        contentType: 'image/jpeg',
        upsert: true,
      });
    if (uploaded.error)
      throw new Error(`upload ${path}: ${uploaded.error.message}`);

    const [year, month, day, hour, minute] = demo.birth;
    const date = `${year}-${pad(month)}-${pad(day)}`;
    const birthLocal = `${date}T${pad(hour)}:${pad(minute)}:00`;
    const birth = resolveBirth({
      cityId: cityId(demo.birthCity),
      local: { year, month, day, hour, minute },
    });
    const chart = toPublicChart(
      computeChart({
        utc: birth.utc,
        latitude: birth.latitude,
        longitude: birth.longitude,
      }),
    );

    const { data: already, error: read } = await admin
      .from('profiles')
      .select('id')
      .eq('id', id);
    if (read) throw new Error(`read profile ${demo.slug}: ${read.message}`);
    const location = `SRID=4326;POINT(${demo.home[0]} ${demo.home[1]})`;

    if (ProfileIds.parse(already).length > 0) {
      // Only what a rerun is allowed to move. Birth data and the chart are
      // frozen by `profiles_forbid_birth_change`, and sending them again
      // unchanged would still be sending them.
      const { error } = await admin
        .from('profiles')
        .update({
          display_name: demo.name,
          bio: demo.bio,
          photos: [path],
          gender: demo.gender,
          interested_in: 'everyone',
          location,
          is_demo: true,
        })
        .eq('id', id);
      if (error)
        throw new Error(`update profile ${demo.slug}: ${error.message}`);
    } else {
      const { error } = await admin.from('profiles').insert({
        id,
        display_name: demo.name,
        birth_date: date,
        birth_local: birthLocal,
        birth_city_id: cityId(demo.birthCity),
        birth_utc: birth.utc.toISOString(),
        chart,
        big_three: bigThree(chart),
        gender: demo.gender,
        interested_in: 'everyone',
        location,
        bio: demo.bio,
        photos: [path],
        consent_version: CONSENT_VERSION,
        is_demo: true,
      });
      if (error)
        throw new Error(`insert profile ${demo.slug}: ${error.message}`);
    }
  }

  console.log(
    `${DEMOS.length} demo profiles on ${env.SUPABASE_URL}: ` +
      `${created} created, ${refreshed} refreshed`,
  );
}

await main();
