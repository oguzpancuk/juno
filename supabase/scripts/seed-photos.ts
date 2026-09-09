/**
 * Local-only: give every seeded profile one placeholder photo, so the
 * discover deck is not empty once a photo became a requirement.
 *
 *   npx tsx supabase/scripts/seed-photos.ts
 *
 * The image is generated here rather than committed: a solid colour
 * derived from the name, encoded as a PNG with zlib. Uses the local
 * service-role key from `supabase status`; refuses any non-local API URL.
 */
import { execFileSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const Status = z.object({
  API_URL: z.string().url(),
  SERVICE_ROLE_KEY: z.string(),
});
const status = Status.parse(
  JSON.parse(
    execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
      encoding: 'utf8',
    }),
  ),
);
const host = new URL(status.API_URL).hostname;
if (host !== '127.0.0.1' && host !== 'localhost') {
  console.error(`refusing to run against ${status.API_URL}`);
  process.exit(1);
}
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const crc32 = (buf: Buffer): number => {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
};

const chunk = (type: string, data: Buffer): Buffer => {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([head, body, crc]);
};

/** A solid-colour PNG, written by hand so the seed needs no image files. */
function png(width: number, height: number, rgb: [number, number, number]) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // truecolour
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const row = y * (1 + width * 3);
    raw[row] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const at = row + 1 + x * 3;
      raw[at] = rgb[0];
      raw[at + 1] = rgb[1];
      raw[at + 2] = rgb[2];
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const Profiles = z.array(
  z.object({ id: z.string().uuid(), display_name: z.string() }),
);

async function main(): Promise<void> {
  const { data, error } = await admin
    .from('profiles')
    .select('id, display_name');
  if (error) throw error;
  const profiles = Profiles.parse(data);
  for (const profile of profiles) {
    let hue = 0;
    for (let i = 0; i < profile.display_name.length; i++) {
      hue += profile.display_name.charCodeAt(i);
    }
    const colour: [number, number, number] = [
      90 + (hue % 120),
      70 + ((hue * 7) % 120),
      140 + ((hue * 13) % 90),
    ];
    const path = `${profile.id}/1.png`;
    const uploaded = await admin.storage
      .from('photos')
      .upload(path, png(600, 800, colour), {
        contentType: 'image/png',
        upsert: true,
      });
    if (uploaded.error) throw uploaded.error;
    const { error: saved } = await admin
      .from('profiles')
      .update({ photos: [path] })
      .eq('id', profile.id);
    if (saved) throw saved;
  }
  console.log(`gave ${profiles.length} profiles a placeholder photo`);
}

await main();
