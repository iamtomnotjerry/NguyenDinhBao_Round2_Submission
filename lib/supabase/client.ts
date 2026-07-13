import { createBrowserClient } from '@supabase/ssr';
import { SafeDatabase } from '@/types/database.types';

/**
 * Supabase client for use in Client Components (client-side).
 * Generic Database parameter enforces type safety.
 */
export const supabase = createBrowserClient<SafeDatabase>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
