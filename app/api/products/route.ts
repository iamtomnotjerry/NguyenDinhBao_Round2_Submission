import { createClient as createAnonClient } from '@supabase/supabase-js';
import type { SafeDatabase } from '@/types/database.types';
import { ApiErrorCode, apiError } from '@/lib/api/errors';

/**
 * Public catalog — RLS allows anonymous SELECT on products, so this route
 * deliberately uses a cookie-less anon client: no per-request session work
 * and the response can be statically cached + revalidated (ISR) instead of
 * hitting Supabase on every request under load.
 */
export const dynamic = 'force-static';
export const revalidate = 30;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

const supabase = createAnonClient<SafeDatabase>(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('price', { ascending: true });

    if (error) {
      return apiError(ApiErrorCode.INTERNAL, 400, { details: error.message });
    }

    return Response.json(data);
  } catch (error) {
    return apiError(ApiErrorCode.INTERNAL, 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
