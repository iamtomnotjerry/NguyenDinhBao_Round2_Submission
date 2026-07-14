-- =========================================================================
-- PLATPRINT MIGRATION v4 — Commercial print config, payment on print, points
-- Chạy trên Supabase SQL Editor sau khi đã có schema v3.
-- =========================================================================

-- 1. Nới CHECK cũ trên print_jobs (paper / binding / color / status)
ALTER TABLE public.print_jobs DROP CONSTRAINT IF EXISTS print_jobs_config_paper_size_check;
ALTER TABLE public.print_jobs DROP CONSTRAINT IF EXISTS print_jobs_config_binding_check;
ALTER TABLE public.print_jobs DROP CONSTRAINT IF EXISTS print_jobs_config_color_check;
ALTER TABLE public.print_jobs DROP CONSTRAINT IF EXISTS print_jobs_status_check;

ALTER TABLE public.print_jobs
  ADD CONSTRAINT print_jobs_config_paper_size_check
  CHECK (config_paper_size IN ('a4','a3','a5','letter','legal','tabloid','b5','custom'));

ALTER TABLE public.print_jobs
  ADD CONSTRAINT print_jobs_config_binding_check
  CHECK (config_binding IN ('none','stapled','spiral','glue','hardcover'));

ALTER TABLE public.print_jobs
  ADD CONSTRAINT print_jobs_config_color_check
  CHECK (config_color IN ('color','bw','mixed'));

ALTER TABLE public.print_jobs
  ADD CONSTRAINT print_jobs_status_check
  CHECK (status IN (
    'pending','awaiting_payment','paid','queued','rendering','printing',
    'finishing','quality_check','packing','shipping','ready_for_pickup',
    'completed','failed'
  ));

-- 2. Cột mở rộng
ALTER TABLE public.print_jobs ADD COLUMN IF NOT EXISTS config_json JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.print_jobs ADD COLUMN IF NOT EXISTS page_selection TEXT DEFAULT 'all';
ALTER TABLE public.print_jobs ADD COLUMN IF NOT EXISTS selected_page_count INTEGER;
ALTER TABLE public.print_jobs ADD COLUMN IF NOT EXISTS duplex TEXT DEFAULT 'simplex';
ALTER TABLE public.print_jobs ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'pickup';
ALTER TABLE public.print_jobs ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE public.print_jobs ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.print_jobs ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.print_jobs ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.print_jobs ADD COLUMN IF NOT EXISTS points_used INTEGER DEFAULT 0;
ALTER TABLE public.print_jobs ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;
ALTER TABLE public.print_jobs ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE public.print_jobs ADD COLUMN IF NOT EXISTS card_last4 VARCHAR(4);
ALTER TABLE public.print_jobs ADD COLUMN IF NOT EXISTS estimated_ready TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_print_jobs_idempotency
  ON public.print_jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.print_jobs DROP CONSTRAINT IF EXISTS print_jobs_duplex_check;
ALTER TABLE public.print_jobs
  ADD CONSTRAINT print_jobs_duplex_check
  CHECK (duplex IN ('simplex','long_edge','short_edge'));

ALTER TABLE public.print_jobs DROP CONSTRAINT IF EXISTS print_jobs_delivery_type_check;
ALTER TABLE public.print_jobs
  ADD CONSTRAINT print_jobs_delivery_type_check
  CHECK (delivery_type IN ('pickup','delivery'));

-- 3. RPC: trừ / cộng điểm khi thanh toán lệnh in (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.settle_print_job_points(
  p_user_id UUID,
  p_points_used INTEGER,
  p_points_earned INTEGER,
  p_job_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points INTEGER;
BEGIN
  IF p_points_used < 0 OR p_points_earned < 0 THEN
    RAISE EXCEPTION 'Invalid points';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot settle points for another user';
  END IF;

  SELECT reward_points INTO v_points
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF p_points_used > 0 THEN
    IF v_points < p_points_used THEN
      RAISE EXCEPTION 'Insufficient reward points';
    END IF;
    UPDATE public.profiles
    SET reward_points = reward_points - p_points_used
    WHERE id = p_user_id;

    INSERT INTO public.reward_points_history (user_id, points, type, description)
    VALUES (p_user_id, p_points_used, 'spend', 'Redeemed on print job ' || p_job_id::text);
  END IF;

  IF p_points_earned > 0 THEN
    UPDATE public.profiles
    SET reward_points = reward_points + p_points_earned
    WHERE id = p_user_id;

    INSERT INTO public.reward_points_history (user_id, points, type, description)
    VALUES (p_user_id, p_points_earned, 'earn', 'Earned from print job ' || p_job_id::text);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rollback_print_job_points(
  p_user_id UUID,
  p_points_used INTEGER,
  p_points_earned INTEGER,
  p_job_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot rollback points for another user';
  END IF;

  IF p_points_used > 0 THEN
    UPDATE public.profiles
    SET reward_points = reward_points + p_points_used
    WHERE id = p_user_id;

    INSERT INTO public.reward_points_history (user_id, points, type, description)
    VALUES (p_user_id, p_points_used, 'earn', 'Rollback redeem print job ' || p_job_id::text);
  END IF;

  IF p_points_earned > 0 THEN
    UPDATE public.profiles
    SET reward_points = GREATEST(0, reward_points - p_points_earned)
    WHERE id = p_user_id;

    INSERT INTO public.reward_points_history (user_id, points, type, description)
    VALUES (p_user_id, p_points_earned, 'spend', 'Rollback earn print job ' || p_job_id::text);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.settle_print_job_points TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_print_job_points TO authenticated;
