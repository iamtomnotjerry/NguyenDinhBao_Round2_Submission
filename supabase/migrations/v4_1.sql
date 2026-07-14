-- =========================================================================
-- PLATPRINT MIGRATION v4.1 — Security & integrity fixes
-- Chạy SAU supabase/migrations/v4.sql
-- =========================================================================

-- RPC settle/rollback: chỉ cho phép user sửa điểm của CHÍNH mình
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
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot settle points for another user';
  END IF;

  IF p_points_used < 0 OR p_points_earned < 0 THEN
    RAISE EXCEPTION 'Invalid points';
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
