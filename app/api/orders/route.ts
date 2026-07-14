import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SafeDatabase } from '@/types/database.types';
import { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase: SupabaseClient<SafeDatabase> = await createClient();
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        {
          error:
            'Thiếu SUPABASE_SERVICE_ROLE_KEY — không thể hoàn tất thanh toán đơn hàng (fail-closed).',
        },
        { status: 500 },
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Chưa đăng nhập (Unauthorized)' }, { status: 401 });
    }

    const body = await request.json();
    const { items, delivery_type, idempotency_key, card_token, use_points, points_used } = body;

    if (
      !items ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !delivery_type ||
      !idempotency_key ||
      !card_token
    ) {
      return NextResponse.json({ error: 'Thiếu thông tin đặt hàng' }, { status: 400 });
    }

    // Normalize items — RPC recomputes prices; strip forged price fields
    const safeItems = items.map((item: { product_id?: string; quantity?: number }) => ({
      product_id: item.product_id,
      quantity: Math.max(1, Math.floor(Number(item.quantity) || 0)),
    }));

    if (
      safeItems.some(
        (i: { product_id?: string; quantity: number }) => !i.product_id || i.quantity < 1,
      )
    ) {
      return NextResponse.json({ error: 'Giỏ hàng không hợp lệ' }, { status: 400 });
    }

    // Requested redeem intent only (server caps against balance + subtotal)
    const requestedPoints =
      use_points || Number(points_used) > 0 ? Math.max(0, Math.floor(Number(points_used) || 0)) : 0;

    // Idempotency
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
        const createdAt = new Date(existingOrder.created_at);
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

        if (createdAt < fifteenMinutesAgo) {
          await admin.rpc('rollback_failed_order', { p_order_id: existingOrder.id });
        } else {
          return NextResponse.json(
            {
              error:
                'Giao dịch trước đó của đơn hàng này vẫn đang xử lý. Vui lòng không thực hiện lại thao tác.',
              status: 'pending',
              order_id: existingOrder.id,
            },
            { status: 202 },
          );
        }
      } else {
        return NextResponse.json({
          success: true,
          message: 'Đơn hàng đã tồn tại (Idempotency return)',
          order: existingOrder,
        });
      }
    }

    // Server-side pricing happens inside RPC (ignores client totals / points_earned)
    const { data: orderId, error: rpcError } = await supabase.rpc('create_order_with_stock_check', {
      p_user_id: user.id,
      p_total_amount: 0, // ignored by secure RPC
      p_discount_amount: 0, // ignored
      p_points_used: requestedPoints,
      p_points_earned: 0, // ignored — computed server-side
      p_delivery_type: delivery_type,
      p_idempotency_key: idempotency_key,
      p_items: safeItems,
    });

    if (rpcError || !orderId) {
      return NextResponse.json(
        { error: rpcError?.message || 'Không thể tạo đơn hàng' },
        { status: 400 },
      );
    }

    // Charge the SERVER-computed total from the order row
    const { data: pendingOrder, error: fetchPendingErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchPendingErr || !pendingOrder) {
      await admin.rpc('rollback_failed_order', { p_order_id: orderId });
      return NextResponse.json(
        { error: fetchPendingErr?.message || 'Không đọc được đơn hàng sau khi tạo' },
        { status: 400 },
      );
    }

    const chargeAmount = Number(pendingOrder.total_amount);

    const origin = new URL(request.url).origin;
    const chargeRes = await fetch(`${origin}/api/sandbox/payment/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_token,
        amount: chargeAmount,
      }),
    });

    const chargeResult = await chargeRes.json();

    if (!chargeRes.ok || chargeResult.error) {
      await admin.rpc('rollback_failed_order', {
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

    const { error: updateError } = await admin.rpc('mark_order_as_paid', {
      p_order_id: orderId,
    });

    if (updateError) {
      // Charge succeeded but mark failed — rollback inventory/points; surface charged flag
      await admin.rpc('rollback_failed_order', { p_order_id: orderId });
      return NextResponse.json(
        {
          error:
            'Thanh toán đã diễn ra nhưng không cập nhật được trạng thái đơn. Đã rollback kho/điểm. Liên hệ hỗ trợ kèm transaction_id.',
          charged: true,
          transaction_id: chargeResult.transaction_id,
          order_id: orderId,
          details: updateError.message,
        },
        { status: 500 },
      );
    }

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
