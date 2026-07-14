import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SafeDatabase } from '@/types/database.types';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client for use in Server Components, Server Actions, and Route Handlers.
 * Handles cookies reading and writing asynchronously.
 * Generic Database parameter enforces type safety.
 */
export async function createClient(): Promise<SupabaseClient<SafeDatabase, 'public'>> {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createServerClient<SafeDatabase, 'public'>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be safely ignored if you have a middleware refreshing user sessions.
        }
      },
    },
  });
}
