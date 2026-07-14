import type { SupabaseClient } from '@supabase/supabase-js';
import type { SafeDatabase } from '@/types/database.types';
import { HUMAN_HANDOFF_TOKEN } from '@/lib/chat/constants';

export { HUMAN_HANDOFF_TOKEN };

/**
 * Persist durable handoff state. Returns true only when DB row is waiting_support.
 */
export async function markChatWaitingSupport(
  supabase: SupabaseClient<SafeDatabase>,
  sessionId: string,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .update({ status: 'waiting_support' })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select('id, status')
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data || data.status !== 'waiting_support') {
    return { ok: false, error: 'Chat session handoff update affected 0 rows' };
  }
  return { ok: true };
}
