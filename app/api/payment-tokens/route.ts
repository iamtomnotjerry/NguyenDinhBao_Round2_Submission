import { createClient } from '@/lib/supabase/server';
import { SafeDatabase } from '@/types/database.types';
import { NextResponse } from 'next/server';

/** List saved payment tokens for the authenticated user */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('payment_tokens')
      .select('id, card_brand, last4, exp_month, exp_year, is_default, created_at, card_token')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/** Save a tokenized card for one-tap checkout */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { card_token, card_brand, last4, exp_month, exp_year, is_default } = body as {
      card_token?: string;
      card_brand?: string;
      last4?: string;
      exp_month?: number;
      exp_year?: number;
      is_default?: boolean;
    };

    if (!card_token || !last4 || !exp_month || !exp_year) {
      return NextResponse.json({ error: 'Missing card token fields' }, { status: 400 });
    }

    if (is_default) {
      await supabase.from('payment_tokens').update({ is_default: false }).eq('user_id', user.id);
    }

    // Avoid duplicate last4+brand rows — update token instead
    const { data: existing } = await supabase
      .from('payment_tokens')
      .select('id')
      .eq('user_id', user.id)
      .eq('last4', String(last4))
      .eq('card_brand', card_brand || 'Visa')
      .maybeSingle();

    type TokenRow = SafeDatabase['public']['Tables']['payment_tokens']['Row'];
    let row: TokenRow | null = null;

    if (existing) {
      const { data, error } = await supabase
        .from('payment_tokens')
        .update({
          card_token,
          exp_month: Number(exp_month),
          exp_year: Number(exp_year),
          is_default: Boolean(is_default),
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      row = data;
    } else {
      const { data, error } = await supabase
        .from('payment_tokens')
        .insert({
          user_id: user.id,
          card_token,
          card_brand: card_brand || 'Visa',
          last4: String(last4),
          exp_month: Number(exp_month),
          exp_year: Number(exp_year),
          is_default: Boolean(is_default ?? true),
        })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      row = data;
    }

    return NextResponse.json({ success: true, token: row });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
