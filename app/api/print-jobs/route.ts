import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SafeDatabase, Json } from '@/types/database.types';
import { NextResponse, after } from 'next/server';
import { buildPrintQuote, estimateDeliveryLabel } from '@/lib/print/pricing';
import { resolvePrintPageCount } from '@/lib/print/resolve-page-count';
import type { PrintConfig, PaperSize, BindingType, ColorMode, DuplexMode } from '@/lib/print/types';
import { DEFAULT_PRINT_CONFIG } from '@/lib/print/types';

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
      return NextResponse.json({ error: 'Chưa đăng nhập (Unauthorized)' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        {
          error: 'Thiếu SUPABASE_SERVICE_ROLE_KEY — không thể thanh toán lệnh in (fail-closed).',
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
      return NextResponse.json(
        { error: 'Thiếu thông tin cấu hình in ấn hoặc thanh toán (card_token, idempotency_key)' },
        { status: 400 },
      );
    }

    // Idempotency
    const { data: existing } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('idempotency_key', idempotency_key)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'failed' || existing.status === 'awaiting_payment') {
        return NextResponse.json(
          {
            error:
              existing.status === 'failed'
                ? 'Giao dịch trước đã thất bại. Dùng idempotency_key mới.'
                : 'Giao dịch trước chưa hoàn tất thanh toán. Dùng idempotency_key mới.',
          },
          { status: 400 },
        );
      }
      // paid / queued / … / completed → safe replay
      return NextResponse.json({ success: true, job: existing, idempotent: true }, { status: 200 });
    }

    const config = mapBodyToConfig(body);
    if (config.deliveryType === 'delivery' && !config.deliveryAddress.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập địa chỉ giao hàng' }, { status: 400 });
    }

    const pageResolution = await resolvePrintPageCount({
      filePath: String(file_path),
      clientTotalPages: Number(total_pages),
    });
    const effectivePages = pageResolution.pages;

    const quote = buildPrintQuote(config, effectivePages, Number(current_page || 1));
    if (quote.error) {
      return NextResponse.json({ error: quote.error }, { status: 400 });
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
      // Fallback: legacy schema without v4 columns
      if (insertError?.message?.includes('column') || insertError?.code === 'PGRST204') {
        return handleLegacyPrintJob({
          request,
          supabase,
          userId: user.id,
          file_name,
          file_path,
          total_pages: effectivePages,
          config,
          quoteTotal: quote.total,
          card_token,
        });
      }

      return NextResponse.json(
        {
          error:
            insertError?.message ||
            'Không tạo được lệnh in. Hãy chạy supabase_migration_v4.sql (+ v4_1 + v6).',
        },
        { status: 400 },
      );
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
      return NextResponse.json(
        {
          success: false,
          error: chargeResult.error || 'Thanh toán không thành công',
          job_id: job.id,
        },
        { status: 400 },
      );
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
      return NextResponse.json(
        {
          error:
            'Thanh toán thành công nhưng không cập nhật được trạng thái lệnh in. Đã đánh dấu failed — liên hệ hỗ trợ kèm transaction_id.',
          job_id: job.id,
          charged: true,
          transaction_id: chargeResult.transaction_id,
        },
        { status: 500 },
      );
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
        pointsWarning = `Thanh toán OK nhưng cộng điểm thất bại: ${earnErr.message}`;
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
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

async function handleLegacyPrintJob(args: {
  request: Request;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  file_name: string;
  file_path: string;
  total_pages: number;
  config: PrintConfig;
  quoteTotal: number;
  card_token: string;
}) {
  const {
    request,
    supabase,
    userId,
    file_name,
    file_path,
    total_pages,
    config,
    quoteTotal,
    card_token,
  } = args;

  const paper = (['a4', 'a3', 'a5'].includes(config.paperSize) ? config.paperSize : 'a4') as
    'a4' | 'a3' | 'a5';
  const binding = (
    ['none', 'stapled', 'spiral'].includes(config.binding) ? config.binding : 'none'
  ) as 'none' | 'stapled' | 'spiral';
  const color = config.colorMode === 'mixed' ? 'color' : config.colorMode === 'bw' ? 'bw' : 'color';

  const { data: legacyJob, error: legacyErr } = await supabase
    .from('print_jobs')
    .insert({
      user_id: userId,
      file_name,
      file_path,
      config_color: color,
      config_copies: config.copies,
      config_paper_size: paper,
      config_binding: binding,
      total_pages,
      status: 'pending',
      cost: quoteTotal,
      printer_location: config.printerLocation,
    })
    .select()
    .single();

  if (legacyErr || !legacyJob) {
    return NextResponse.json(
      {
        error: legacyErr?.message || 'Không tạo được lệnh in. Hãy chạy supabase_migration_v4.sql.',
      },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;
  const chargeRes = await fetch(`${origin}/api/sandbox/payment/charge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ card_token, amount: quoteTotal }),
  });
  const chargeResult = await chargeRes.json();
  if (!chargeRes.ok) {
    await setJobStatus(legacyJob.id, 'failed');
    return NextResponse.json(
      { error: chargeResult.error || 'Thanh toán thất bại' },
      { status: 400 },
    );
  }

  // Fail-closed: same as main path — do not return success if status cannot update
  const markedPaid = await setJobStatus(legacyJob.id, 'paid');
  if (!markedPaid) {
    await setJobStatus(legacyJob.id, 'failed');
    return NextResponse.json(
      {
        error:
          'Thanh toán thành công nhưng thiếu SUPABASE_SERVICE_ROLE_KEY — không thể cập nhật trạng thái. Đã đánh dấu failed. Hãy chạy supabase_migration_v4.sql (+ v6/v7) và cấu hình service role key.',
        job_id: legacyJob.id,
        charged: true,
        transaction_id: chargeResult.transaction_id,
        legacy: true,
      },
      { status: 500 },
    );
  }

  startSimulator(legacyJob.id, 'pickup');
  const { data: refreshed } = await supabase
    .from('print_jobs')
    .select('*')
    .eq('id', legacyJob.id)
    .single();

  return NextResponse.json(
    {
      success: true,
      job: refreshed || { ...legacyJob, status: 'paid' },
      legacy: true,
      warning: 'Schema thiếu cột v4 — hãy chạy supabase_migration_v4.sql (+ v5 + v6).',
      transaction_id: chargeResult.transaction_id,
    },
    { status: 201 },
  );
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
