import { z } from 'zod';
import { googleClientIdSchema } from './oauth';

/**
 * Build-time public config. Expo inlines EXPO_PUBLIC_* variables; they are
 * validated here so a misconfigured build fails at startup, not at the
 * first request. The anon key is public by design; RLS is the boundary.
 *
 * The Google client IDs are optional and the app is whole without them: a
 * build that carries none simply has no Google button (`lib/oauth.ts`
 * `availability`). What is not optional is their shape — a client ID with
 * a typo fails silently inside Google's own sheet, and a client SECRET
 * pasted into either of these would ship a credential to every phone, so
 * both are held to the exact form Google Cloud prints.
 */

/** An unset EXPO_PUBLIC_* is an empty string as often as it is undefined. */
const optionalClientId = z
  .preprocess(
    (value) => (value === '' || value === undefined ? undefined : value),
    googleClientIdSchema.optional(),
  )
  .describe('Google OAuth client ID');

const EnvSchema = z.object({
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string().min(20),
  /**
   * The WEB client of the Google Cloud project, on every platform. It is
   * what the ID token is minted for, and the one value Supabase's Google
   * provider must also carry, or the token is refused as the wrong
   * audience.
   */
  googleWebClientId: optionalClientId,
  /** The iOS client. `app.config.ts` turns it into the URL scheme too. */
  googleIosClientId: optionalClientId,
});

export const env = EnvSchema.parse({
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});
