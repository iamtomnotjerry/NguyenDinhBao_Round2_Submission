import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SafeDatabase } from '@/types/database.types';
import { SupabaseClient } from '@supabase/supabase-js';
import { ApiErrorCode, apiError, passThroughChargeError } from '@/lib/api/errors';

export async function POST(request: Request) {
  try {
    const supabase: SupabaseClient<SafeDatabase> = await createClient();
    const admin = createAdminClient();
    if (!admin) {
      return apiError(ApiErrorCode.MISSING_SERVICE_ROLE, 500);
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiError(ApiErrorCode.UNAUTHORIZED, 401);
    }

    const body = await request.json();
    const {
      items,
      delivery_type,
      delivery_address,
      recipient_name,
      idempotency_key,
      card_token,
      use_points,
      points_used,
    } = body;

    if (
      !items ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !delivery_type ||
      !idempotency_key ||
      !card_token
    ) {
      return apiError(ApiErrorCode.MISSING_ORDER_FIELDS, 400);
    }

    const trimmedAddress = typeof delivery_address === 'string' ? delivery_address.trim() : '';
    const trimmedName = typeof recipient_name === 'string' ? recipient_name.trim() : '';

    if (delivery_type === 'delivery' && !trimmedAddress) {
      return apiError(ApiErrorCode.MISSING_DELIVERY_ADDRESS, 400);
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
      return apiError(ApiErrorCode.INVALID_CART, 400);
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
        return apiError(ApiErrorCode.IDEMPOTENCY_FAILED, 400);
      }
      if (existingOrder.status === 'pending') {
        const createdAt = new Date(existingOrder.created_at);
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

        if (createdAt < fifteenMinutesAgo) {
          await admin.rpc('rollback_failed_order', { p_order_id: existingOrder.id });
        } else {
          return apiError(ApiErrorCode.IDEMPOTENCY_PENDING, 202, {
            status: 'pending',
            order_id: existingOrder.id,
          });
        }
      } else {
        return Response.json({
          success: true,
          message: 'IDEMPOTENT_REPLAY',
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
      return apiError(ApiErrorCode.ORDER_CREATE_FAILED, 400, {
        details: rpcError?.message,
      });
    }

    // Persist fulfillment fields (RPC does not accept these yet)
    const { error: fulfillErr } = await admin
      .from('orders')
      .update({
        delivery_address: delivery_type === 'delivery' ? trimmedAddress : null,
        recipient_name: trimmedName || null,
      })
      .eq('id', orderId);

    if (fulfillErr) {
      console.error('Failed to persist order fulfillment fields:', fulfillErr.message);
    }

    // Charge the SERVER-computed total from the order row
    const { data: pendingOrder, error: fetchPendingErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchPendingErr || !pendingOrder) {
      await admin.rpc('rollback_failed_order', { p_order_id: orderId });
      return apiError(ApiErrorCode.ORDER_FETCH_FAILED, 400, {
        details: fetchPendingErr?.message,
      });
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

      return apiError(passThroughChargeError(chargeResult.error || chargeResult.code), 400, {
        success: false,
        order_id: orderId,
      });
    }

    const { error: updateError } = await admin.rpc('mark_order_as_paid', {
      p_order_id: orderId,
    });

    if (updateError) {
      // Charge succeeded but mark failed — rollback inventory/points; surface charged flag
      await admin.rpc('rollback_failed_order', { p_order_id: orderId });
      return apiError(ApiErrorCode.PAYMENT_MARK_FAILED, 500, {
        charged: true,
        transaction_id: chargeResult.transaction_id,
        order_id: orderId,
        details: updateError.message,
      });
    }

    const { data: updatedOrder, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      return apiError(ApiErrorCode.ORDER_FETCH_FAILED, 400, { details: fetchError.message });
    }

    return Response.json({
      success: true,
      message: 'ORDER_PAID',
      order: updatedOrder,
      transaction_id: chargeResult.transaction_id,
    });
  } catch (error) {
    return apiError(ApiErrorCode.INTERNAL, 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
