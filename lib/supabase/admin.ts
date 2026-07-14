import { createClient as createDirectClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SafeDatabase } from '@/types/database.types';

/** Service-role client for operations blocked by RLS (print job status updates). */
export function createAdminClient(): SupabaseClient<SafeDatabase> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createDirectClient<SafeDatabase>(url, key);
}
