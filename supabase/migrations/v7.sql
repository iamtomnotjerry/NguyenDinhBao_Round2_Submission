-- =========================================================================
-- PLATPRINT MIGRATION v7 — Storage IDOR close + settle idempotency + grants
-- Chạy SAU v6.
-- =========================================================================

-- -------------------------------------------------------------------------
-- CRITICAL: Drop orphan Storage SELECT that allowed any authenticated user
-- to read every object in print-files (IDOR). Keep owner-only SELECT.
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated select from print-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to select from print-files" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for print-files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view print-files" ON storage.objects;

-- Re-assert owner-only SELECT (safe if already present)
DROP POLICY IF EXISTS "Allow owner select from print-files" ON storage.objects;
CREATE POLICY "Allow owner select from print-files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'print-files' AND auth.uid() = owner);

-- -------------------------------------------------------------------------
-- Trigger-only DEFINER: không expose qua PostgREST RPC
-- -------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- -------------------------------------------------------------------------
-- Unique indexes — race-safe idempotent print settle (description markers)
-- -------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_rph_print_job_redeem
  ON public.reward_points_history (description)
  WHERE type = 'spend' AND description LIKE 'Redeemed on print job %';

CREATE UNIQUE INDEX IF NOT EXISTS uq_rph_print_job_earn
  ON public.reward_points_history (description)
  WHERE type = 'earn' AND description LIKE 'Earned from print job %';

-- -------------------------------------------------------------------------
-- settle_print_job_points — skip legs already applied (idempotent)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.settle_print_job_points(
  p_user_id UUID,
  p_points_used INTEGER,
  p_points_earned INTEGER,
  p_job_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_jwt_role TEXT;
  v_points INTEGER;
  v_job_user UUID;
  v_job_cost DECIMAL(10, 2);
  v_job_points_used INTEGER;
  v_job_points_earned INTEGER;
  v_job_status TEXT;
  v_used INTEGER;
  v_earn INTEGER;
  v_max_earn INTEGER;
  v_redeem_desc TEXT;
  v_earn_desc TEXT;
BEGIN
  v_jwt_role := COALESCE(auth.jwt() ->> 'role', '');
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Forbidden: settle_print_job_points requires service_role';
  END IF;

  IF p_points_used < 0 OR p_points_earned < 0 THEN
    RAISE EXCEPTION 'Invalid points';
  END IF;

  SELECT user_id, cost, COALESCE(points_used, 0), COALESCE(points_earned, 0), status
  INTO v_job_user, v_job_cost, v_job_points_used, v_job_points_earned, v_job_status
  FROM public.print_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND OR v_job_user IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden: invalid print job for settle';
  END IF;

  v_max_earn := FLOOR(COALESCE(v_job_cost, 0))::INTEGER;
  v_used := LEAST(GREATEST(COALESCE(p_points_used, 0), 0), v_job_points_used);
  v_earn := LEAST(
    GREATEST(COALESCE(p_points_earned, 0), 0),
    v_max_earn,
    GREATEST(v_job_points_earned, 0)
  );

  v_redeem_desc := 'Redeemed on print job ' || p_job_id::text;
  v_earn_desc := 'Earned from print job ' || p_job_id::text;

  SELECT reward_points INTO v_points
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_used > 0 AND NOT EXISTS (
    SELECT 1 FROM public.reward_points_history
    WHERE user_id = p_user_id AND type = 'spend' AND description = v_redeem_desc
  ) THEN
    IF v_points < v_used THEN
      RAISE EXCEPTION 'Insufficient reward points';
    END IF;
    UPDATE public.profiles
    SET reward_points = reward_points - v_used
    WHERE id = p_user_id;

    INSERT INTO public.reward_points_history (user_id, points, type, description)
    VALUES (p_user_id, v_used, 'spend', v_redeem_desc);
  END IF;

  IF v_earn > 0 THEN
    IF v_job_status NOT IN (
      'paid', 'queued', 'rendering', 'printing', 'finishing',
      'quality_check', 'packing', 'shipping', 'ready_for_pickup', 'completed'
    ) THEN
      RAISE EXCEPTION 'Forbidden: cannot earn points before print job is paid';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.reward_points_history
      WHERE user_id = p_user_id AND type = 'earn' AND description = v_earn_desc
    ) THEN
      UPDATE public.profiles
      SET reward_points = reward_points + v_earn
      WHERE id = p_user_id;

      INSERT INTO public.reward_points_history (user_id, points, type, description)
      VALUES (p_user_id, v_earn, 'earn', v_earn_desc);
    END IF;
  END IF;
END;
$$;

-- -------------------------------------------------------------------------
-- rollback_print_job_points — only reverse legs that were applied
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rollback_print_job_points(
  p_user_id UUID,
  p_points_used INTEGER,
  p_points_earned INTEGER,
  p_job_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_jwt_role TEXT;
  v_job_user UUID;
  v_redeem_desc TEXT;
  v_earn_desc TEXT;
  v_rollback_redeem_desc TEXT;
  v_rollback_earn_desc TEXT;
BEGIN
  v_jwt_role := COALESCE(auth.jwt() ->> 'role', '');
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Forbidden: rollback_print_job_points requires service_role';
  END IF;

  SELECT user_id INTO v_job_user
  FROM public.print_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND OR v_job_user IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden: invalid print job for rollback';
  END IF;

  v_redeem_desc := 'Redeemed on print job ' || p_job_id::text;
  v_earn_desc := 'Earned from print job ' || p_job_id::text;
  v_rollback_redeem_desc := 'Rollback redeem print job ' || p_job_id::text;
  v_rollback_earn_desc := 'Rollback earn print job ' || p_job_id::text;

  IF p_points_used > 0
     AND EXISTS (
       SELECT 1 FROM public.reward_points_history
       WHERE user_id = p_user_id AND type = 'spend' AND description = v_redeem_desc
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.reward_points_history
       WHERE user_id = p_user_id AND description = v_rollback_redeem_desc
     )
  THEN
    UPDATE public.profiles
    SET reward_points = reward_points + p_points_used
    WHERE id = p_user_id;

    INSERT INTO public.reward_points_history (user_id, points, type, description)
    VALUES (p_user_id, p_points_used, 'earn', v_rollback_redeem_desc);
  END IF;

  IF p_points_earned > 0
     AND EXISTS (
       SELECT 1 FROM public.reward_points_history
       WHERE user_id = p_user_id AND type = 'earn' AND description = v_earn_desc
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.reward_points_history
       WHERE user_id = p_user_id AND description = v_rollback_earn_desc
     )
  THEN
    UPDATE public.profiles
    SET reward_points = GREATEST(0, reward_points - p_points_earned)
    WHERE id = p_user_id;

    INSERT INTO public.reward_points_history (user_id, points, type, description)
    VALUES (p_user_id, p_points_earned, 'spend', v_rollback_earn_desc);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_print_job_points(UUID, INTEGER, INTEGER, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rollback_print_job_points(UUID, INTEGER, INTEGER, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_print_job_points(UUID, INTEGER, INTEGER, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.rollback_print_job_points(UUID, INTEGER, INTEGER, UUID) TO service_role;
