import { createClient } from '@/lib/supabase/server';
import { ApiErrorCode, apiError } from '@/lib/api/errors';

export async function GET() {
  try {
    const supabase = await createClient();

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
