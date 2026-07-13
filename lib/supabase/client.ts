import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for use in Client Components (client-side).
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
