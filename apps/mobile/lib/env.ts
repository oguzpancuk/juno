import { z } from 'zod';

/**
 * Build-time public config. Expo inlines EXPO_PUBLIC_* variables; they are
 * validated here so a misconfigured build fails at startup, not at the
 * first request. The anon key is public by design; RLS is the boundary.
 */
const EnvSchema = z.object({
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string().min(20),
});

export const env = EnvSchema.parse({
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});
