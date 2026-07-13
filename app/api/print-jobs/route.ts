import { createClient } from '@/lib/supabase/server';
import { createClient as createDirectClient } from '@supabase/supabase-js';
import { SafeDatabase } from '@/types/database.types';
import { NextResponse, after } from 'next/server';
import { calculatePrintCost } from '@/lib/utils';

// Get print jobs for the authenticated user
export async function GET() {
  try {
    const supabase = await createClient();

    // Auth check
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

// Create print job & trigger async print queue simulator
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Chưa đăng nhập (Unauthorized)' }, { status: 401 });
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    const body = await request.json();
    const {
      file_name,
      file_url,
      config_color,
      config_copies,
      config_paper_size,
      config_binding,
      total_pages,
      printer_location,
    } = body;

    // Validation
    if (
      !file_name ||
      !file_url ||
      !config_color ||
      !config_paper_size ||
      !config_binding ||
      !total_pages ||
      !printer_location
    ) {
      return NextResponse.json({ error: 'Thiếu thông tin cấu hình in ấn' }, { status: 400 });
    }

    // Cost calculation (unified helper)
    const cost = calculatePrintCost(total_pages, config_copies || 1, config_color, config_binding);

    // Create record in Supabase print_jobs table (which triggers RLS)
    const { data, error } = await supabase
      .from('print_jobs')
      .insert({
        user_id: user.id,
        file_name,
        file_url,
        config_color,
        config_copies: config_copies || 1,
        config_paper_size,
        config_binding,
        total_pages,
        status: 'pending',
        cost,
        printer_location,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const jobId = data.id;

    // -------------------------------------------------------------
    // RUN SIMULATOR ASYNCHRONOUSLY IN BACKGROUND
    // We respond 201 immediately, letting the promise run in background.
    // We use a direct client to bypass next/headers cookies() after response completes.
    // -------------------------------------------------------------
    const runSimulator = async () => {
      try {
        const useServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
        const clientOptions = useServiceRole
          ? undefined
          : token
            ? {
                global: {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                },
              }
            : undefined;

        const adminSupabase = createDirectClient<SafeDatabase>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          useServiceRole
            ? process.env.SUPABASE_SERVICE_ROLE_KEY!
            : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          clientOptions,
        );

        // 1. After 2s: pending -> rendering
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await adminSupabase.from('print_jobs').update({ status: 'rendering' }).eq('id', jobId);

        // 2. After 3s: rendering -> printing
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await adminSupabase.from('print_jobs').update({ status: 'printing' }).eq('id', jobId);

        // 3. After 4s: printing -> completed
        await new Promise((resolve) => setTimeout(resolve, 4000));
        await adminSupabase.from('print_jobs').update({ status: 'completed' }).eq('id', jobId);
      } catch (err) {
        console.error('Error running print simulator:', err);
      }
    };

    // Trigger after response completes to guarantee serverless container stays alive
    // [OPTIMIZATION v2.0]: await the async runSimulator promise so Vercel does not terminate container early
    after(async () => {
      await runSimulator();
    });

    return NextResponse.json(data, { status: 201 });
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
