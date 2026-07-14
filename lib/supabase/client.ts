import { createBrowserClient } from '@supabase/ssr';
import { SafeDatabase } from '@/types/database.types';

/**
 * Supabase client for use in Client Components (client-side).
 * Generic Database parameter enforces type safety.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

/**
 * Supabase client for use in Client Components (client-side).
 * Generic Database parameter enforces type safety.
 * Uses placeholder fallbacks during static build-time compilation.
 */
export const supabase = createBrowserClient<SafeDatabase, 'public'>(supabaseUrl, supabaseAnonKey);
