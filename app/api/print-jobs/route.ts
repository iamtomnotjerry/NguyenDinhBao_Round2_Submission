import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SafeDatabase, Json } from '@/types/database.types';
import { NextResponse, after } from 'next/server';
import { buildPrintQuote, estimateDeliveryLabel } from '@/lib/print/pricing';
import { resolvePrintPageCount } from '@/lib/print/resolve-page-count';
import type { PrintConfig, PaperSize, BindingType, ColorMode, DuplexMode } from '@/lib/print/types';
import { DEFAULT_PRINT_CONFIG } from '@/lib/print/types';
import { ApiErrorCode, apiError, passThroughChargeError } from '@/lib/api/errors';

type PrintJobStatus = SafeDatabase['public']['Tables']['print_jobs']['Row']['status'];
type PrintJobRow = SafeDatabase['public']['Tables']['print_jobs']['Row'];

function mapBodyToConfig(body: Record<string, unknown>): PrintConfig {
  const base = { ...DEFAULT_PRINT_CONFIG };
  return {
    ...base,
    colorMode: (body.config_color as ColorMode) || base.colorMode,
    colorPagesInput: String(body.color_pages || body.colorPagesInput || ''),
    copies: Math.max(1, Number(body.config_copies || 1)),
    paperSize: (body.config_paper_size as PaperSize) || base.paperSize,
    binding: (body.config_binding as BindingType) || base.binding,
    finishes: Array.isArray(body.finishes) ? (body.finishes as PrintConfig['finishes']) : [],
    duplex: (body.duplex as DuplexMode) || base.duplex,
    orientation: (body.orientation as PrintConfig['orientation']) || base.orientation,
    scaleMode: (body.scale_mode as PrintConfig['scaleMode']) || base.scaleMode,
    scalePercent: Number(body.scale_percent || 100),
    pagesPerSheet: ([1, 2, 4].includes(Number(body.pages_per_sheet))
      ? Number(body.pages_per_sheet)
      : 1) as 1 | 2 | 4,
    reverseOrder: Boolean(body.reverse_order),
    collate: body.collate !== false,
    pageMode: (body.page_mode as PrintConfig['pageMode']) || 'all',
    customPages: String(body.custom_pages || ''),
    deliveryType: body.delivery_type === 'delivery' ? 'delivery' : 'pickup',
    printerLocation: String(body.printer_location || base.printerLocation),
    deliveryAddress: String(body.delivery_address || ''),
  };
}

const STATUS_CHAIN: { status: PrintJobStatus; delayMs: number }[] = [
  { status: 'queued', delayMs: 800 },
  { status: 'rendering', delayMs: 1800 },
  { status: 'printing', delayMs: 2500 },
  { status: 'finishing', delayMs: 1500 },
  { status: 'quality_check', delayMs: 1200 },
  { status: 'packing', delayMs: 1000 },
  { status: 'shipping', delayMs: 0 },
  { status: 'completed', delayMs: 1200 },
];

async function setJobStatus(jobId: string, status: PrintJobStatus) {
  const admin = createAdminClient();
  if (!admin) {
    console.error('SUPABASE_SERVICE_ROLE_KEY missing — cannot update print_jobs status');
    return false;
  }
  const { error } = await admin.from('print_jobs').update({ status }).eq('id', jobId);
  if (error) {
    console.error('Failed to update print job status:', error.message);
    return false;
  }
  return true;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiError(ApiErrorCode.UNAUTHORIZED, 401);
    }

    const { data, error } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return apiError(ApiErrorCode.INTERNAL, 400, { details: error.message });
    }

    return NextResponse.json(data);
  } catch (error) {
    return apiError(ApiErrorCode.INTERNAL, 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
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
      file_name,
      file_path,
      total_pages,
      card_token,
      save_card,
      card_brand,
      exp_month,
      exp_year,
      use_points,
      idempotency_key,
      current_page,
    } = body;

    if (!file_name || !file_path || !total_pages || !card_token || !idempotency_key) {
      return apiError(ApiErrorCode.PRINT_MISSING_FIELDS, 400);
    }

    // Idempotency
    const { data: existing } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('idempotency_key', idempotency_key)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'failed' || existing.status === 'awaiting_payment') {
        return apiError(ApiErrorCode.PRINT_IDEMPOTENCY_FAILED, 400);
      }
      // paid / queued / … / completed → safe replay
      return NextResponse.json({ success: true, job: existing, idempotent: true }, { status: 200 });
    }

    const config = mapBodyToConfig(body);
    if (config.deliveryType === 'delivery' && !config.deliveryAddress.trim()) {
      return apiError(ApiErrorCode.MISSING_DELIVERY_ADDRESS, 400);
    }

    const pageResolution = await resolvePrintPageCount({
      filePath: String(file_path),
      clientTotalPages: Number(total_pages),
    });
    const effectivePages = pageResolution.pages;

    const quote = buildPrintQuote(config, effectivePages, Number(current_page || 1));
    if (quote.error) {
      return apiError(ApiErrorCode.PRINT_MISSING_FIELDS, 400, {
        details: quote.error,
        error_params: quote.errorParams,
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('reward_points')
      .eq('id', user.id)
      .single();

    const availablePoints = profile?.reward_points ?? 0;
    const pointsUsed = use_points ? Math.min(availablePoints, Math.round(quote.total * 10)) : 0;
    const discountAmount = Math.round(pointsUsed * 0.1 * 100) / 100;
    const chargeAmount = Math.max(0, Math.round((quote.total - discountAmount) * 100) / 100);
    const pointsEarned = Math.floor(chargeAmount);

    const last4 = String(card_token).split('_')[1] || null;
    const configJson = {
      ...config,
      quote_lines: quote.lines,
      selected_pages: quote.selectedPages,
      page_count_source: pageResolution.source,
      page_count_warning: pageResolution.warning ?? null,
    } as unknown as Json;

    const insertPayload = {
      user_id: user.id,
      file_name,
      file_path,
      config_color: config.colorMode,
      config_copies: config.copies,
      config_paper_size: config.paperSize,
      config_binding: config.binding,
      total_pages: effectivePages,
      status: 'awaiting_payment' as const,
      cost: chargeAmount,
      printer_location: config.printerLocation,
      config_json: configJson,
      page_selection: quote.selectedPages.join(','),
      selected_page_count: quote.selectedPageCount,
      duplex: config.duplex,
      delivery_type: config.deliveryType,
      delivery_address: config.deliveryType === 'delivery' ? config.deliveryAddress : null,
      shipping_fee: quote.shippingFee,
      tax_amount: quote.tax,
      discount_amount: discountAmount,
      points_used: pointsUsed,
      points_earned: pointsEarned,
      idempotency_key,
      card_last4: last4,
      estimated_ready: estimateDeliveryLabel(config.deliveryType),
    };

    const { data: job, error: insertError } = await supabase
      .from('print_jobs')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError || !job) {
      // Unique violation on idempotency_key — a concurrent request with the
      // same key won the insert. Replay its job instead of surfacing an error.
      if (insertError?.code === '23505') {
        const { data: dupe } = await supabase
          .from('print_jobs')
          .select('*')
          .eq('idempotency_key', idempotency_key)
          .maybeSingle();

        if (dupe) {
          if (dupe.status === 'failed') {
            return apiError(ApiErrorCode.PRINT_IDEMPOTENCY_FAILED, 400);
          }
          if (dupe.status === 'awaiting_payment') {
            // Winner is still mid-payment — tell the client to wait, not retry
            return apiError(ApiErrorCode.IDEMPOTENCY_PENDING, 202, {
              status: 'pending',
              job_id: dupe.id,
            });
          }
          return NextResponse.json({ success: true, job: dupe, idempotent: true }, { status: 200 });
        }
      }

      return apiError(ApiErrorCode.PRINT_CREATE_FAILED, 400, { details: insertError?.message });
    }

    if (pointsUsed > 0) {
      const { error: pointsErr } = await admin.rpc('settle_print_job_points', {
        p_user_id: user.id,
        p_points_used: pointsUsed,
        p_points_earned: 0,
        p_job_id: job.id,
      });
      if (pointsErr) {
        await setJobStatus(job.id, 'failed');
        return NextResponse.json({ error: pointsErr.message }, { status: 400 });
      }
    }

    const origin = new URL(request.url).origin;
    const chargeRes = await fetch(`${origin}/api/sandbox/payment/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_token, amount: chargeAmount }),
    });
    const chargeResult = await chargeRes.json();

    if (!chargeRes.ok || chargeResult.error) {
      if (pointsUsed > 0) {
        await admin.rpc('rollback_print_job_points', {
          p_user_id: user.id,
          p_points_used: pointsUsed,
          p_points_earned: 0,
          p_job_id: job.id,
        });
      }
      await setJobStatus(job.id, 'failed');
      return apiError(passThroughChargeError(chargeResult.error || chargeResult.code), 400, {
        success: false,
        job_id: job.id,
      });
    }

    // Mark paid before earn settle (RPC requires paid+ pipeline status)
    const markedPaid = await setJobStatus(job.id, 'paid');
    if (!markedPaid) {
      if (pointsUsed > 0) {
        await admin.rpc('rollback_print_job_points', {
          p_user_id: user.id,
          p_points_used: pointsUsed,
          p_points_earned: 0,
          p_job_id: job.id,
        });
      }
      // Fail-closed durable state: never leave charged job in awaiting_payment
      await setJobStatus(job.id, 'failed');
      return apiError(ApiErrorCode.PAYMENT_MARK_FAILED, 500, {
        job_id: job.id,
        charged: true,
        transaction_id: chargeResult.transaction_id,
      });
    }

    let pointsWarning: string | undefined;
    if (pointsEarned > 0) {
      const { error: earnErr } = await admin.rpc('settle_print_job_points', {
        p_user_id: user.id,
        p_points_used: 0,
        p_points_earned: pointsEarned,
        p_job_id: job.id,
      });
      if (earnErr) {
        console.error('Earn points failed after charge:', earnErr.message);
        pointsWarning = `POINTS_EARN_FAILED: ${earnErr.message}`;
      }
    }

    if (save_card && exp_month && exp_year && last4) {
      await supabase.from('payment_tokens').update({ is_default: false }).eq('user_id', user.id);
      const { data: existingToken } = await supabase
        .from('payment_tokens')
        .select('id')
        .eq('user_id', user.id)
        .eq('last4', last4)
        .maybeSingle();
      if (existingToken) {
        await supabase
          .from('payment_tokens')
          .update({
            card_token,
            card_brand: card_brand || 'Visa',
            exp_month: Number(exp_month),
            exp_year: Number(exp_year),
            is_default: true,
          })
          .eq('id', existingToken.id);
      } else {
        await supabase.from('payment_tokens').insert({
          user_id: user.id,
          card_token,
          card_brand: card_brand || 'Visa',
          last4,
          exp_month: Number(exp_month),
          exp_year: Number(exp_year),
          is_default: true,
        });
      }
    }

    startSimulator(job.id, config.deliveryType);

    const { data: paidJob } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('id', job.id)
      .single();

    return NextResponse.json(
      {
        success: true,
        job: (paidJob || { ...job, status: 'paid' }) as PrintJobRow,
        transaction_id: chargeResult.transaction_id,
        quote,
        ...(pointsWarning || pageResolution.warning
          ? {
              warning: [pageResolution.warning, pointsWarning].filter(Boolean).join(' | '),
            }
          : {}),
      },
      { status: 201 },
    );
  } catch (error) {
    return apiError(ApiErrorCode.INTERNAL, 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

function startSimulator(jobId: string, deliveryType: 'pickup' | 'delivery') {
  const runSimulator = async () => {
    try {
      const admin = createAdminClient();
      if (!admin) {
        console.error('SUPABASE_SERVICE_ROLE_KEY missing — simulator skipped');
        return;
      }

      for (const step of STATUS_CHAIN) {
        if (step.status === 'shipping') {
          const next: PrintJobStatus =
            deliveryType === 'delivery' ? 'shipping' : 'ready_for_pickup';
          await new Promise((r) => setTimeout(r, 1000));
          await admin.from('print_jobs').update({ status: next }).eq('id', jobId);
          if (deliveryType === 'delivery') {
            await new Promise((r) => setTimeout(r, 1500));
          }
          continue;
        }
        if (step.status === 'completed') {
          await new Promise((r) => setTimeout(r, step.delayMs));
          await admin.from('print_jobs').update({ status: 'completed' }).eq('id', jobId);
          continue;
        }
        await new Promise((r) => setTimeout(r, step.delayMs));
        await admin.from('print_jobs').update({ status: step.status }).eq('id', jobId);
      }
    } catch (err) {
      console.error('Error running print simulator:', err);
    }
  };

  after(async () => {
    await runSimulator();
  });
}
