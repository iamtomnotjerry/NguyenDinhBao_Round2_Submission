import { createClient } from '@/lib/supabase/server';
import { SafeDatabase } from '@/types/database.types';
import { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase: SupabaseClient<SafeDatabase> = await createClient();

    // 1. Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Chưa đăng nhập (Unauthorized)' }, { status: 401 });
    }

    const body = await request.json();
    const {
      items,
      total_amount,
      discount_amount,
      points_used,
      points_earned,
      delivery_type,
      idempotency_key,
      card_token,
    } = body;

    // Validation
    if (
      !items ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !total_amount ||
      !delivery_type ||
      !idempotency_key ||
      !card_token
    ) {
      return NextResponse.json({ error: 'Thiếu thông tin đặt hàng' }, { status: 400 });
    }

    // Check if order already exists (Idempotency check)
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('idempotency_key', idempotency_key)
      .maybeSingle();

    if (existingOrder) {
      if (existingOrder.status === 'failed') {
        return NextResponse.json(
          {
            error:
              'Yêu cầu thanh toán trước đó đã thất bại. Vui lòng sử dụng khoá giao dịch (idempotency key) mới.',
          },
          { status: 400 },
        );
      }
      if (existingOrder.status === 'pending') {
        // [FIX v2.1]: Auto-expire stale pending orders older than 15 minutes.
        // Prevents permanent blocking when server crashes or payment gateway times out.
        const createdAt = new Date(existingOrder.created_at);
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

        if (createdAt < fifteenMinutesAgo) {
          // Auto-rollback stale pending order (also NULLs idempotency_key in DB)
          await supabase.rpc('rollback_failed_order', { p_order_id: existingOrder.id });
          // Fall through to create a new order below
        } else {
          return NextResponse.json(
            {
              error:
                'Giao dịch trước đó của đơn hàng này vẫn đang xử lý. Vui lòng không thực hiện lại thao tác.',
              status: 'pending',
              order_id: existingOrder.id,
            },
            { status: 202 }, // HTTP 202 Accepted
          );
        }
      } else {
        // status = 'paid' or 'completed' → genuine idempotent return
        return NextResponse.json({
          success: true,
          message: 'Đơn hàng đã tồn tại (Idempotency return)',
          order: existingOrder,
        });
      }
    }

    // 2. Perform Stock Check & Order Insertion in Database via Stored Procedure
    // This locks rows (Pessimistic Locking) and updates stock & points
    const { data: orderId, error: rpcError } = await supabase.rpc('create_order_with_stock_check', {
      p_user_id: user.id,
      p_total_amount: Number(total_amount),
      p_discount_amount: Number(discount_amount || 0),
      p_points_used: Number(points_used || 0),
      p_points_earned: Number(points_earned || 0),
      p_delivery_type: delivery_type,
      p_idempotency_key: idempotency_key,
      p_items: items, // JSON array matching [{product_id: string, quantity: number}]
    });

    if (rpcError || !orderId) {
      return NextResponse.json(
        { error: rpcError?.message || 'Không thể tạo đơn hàng' },
        { status: 400 },
      );
    }

    // 3. Request Mock Payment Charge Gateway
    const origin = new URL(request.url).origin;
    const chargeRes = await fetch(`${origin}/api/sandbox/payment/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_token,
        amount: Number(total_amount),
      }),
    });

    const chargeResult = await chargeRes.json();

    if (!chargeRes.ok || chargeResult.error) {
      // -------------------------------------------------------------
      // PAYMENT FAILED: Roll back DB state atomically (Stock & Points)
      // Call Postgres stored procedure to prevent race conditions on stock restoral
      // -------------------------------------------------------------
      await supabase.rpc('rollback_failed_order', {
        p_order_id: orderId,
      });

      return NextResponse.json(
        {
          success: false,
          error: chargeResult.error || 'Thanh toán không thành công',
          order_id: orderId,
        },
        { status: 400 },
      );
    }

    // 4. PAYMENT SUCCEEDED: Update order status to paid via Postgres RPC (bypasses RLS safely)
    const { error: updateError } = await supabase.rpc('mark_order_as_paid', {
      p_order_id: orderId,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Fetch updated order to return in response
    const { data: updatedOrder, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Thanh toán và tạo đơn hàng thành công',
      order: updatedOrder,
      transaction_id: chargeResult.transaction_id,
    });
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
