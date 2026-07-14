-- =========================================================================
-- PLATPRINT MIGRATION v6 — Close Critical defense-in-depth gaps (CRIT-1/2/3)
-- Chạy SAU v5. Chỉ service_role được mark-paid / settle / rollback money RPC.
-- Siết INSERT status trên orders + print_jobs.
-- =========================================================================

-- -------------------------------------------------------------------------
-- CRIT-3: RLS INSERT — không cho client tạo bản ghi đã paid/completed
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow users to create their own orders" ON public.orders;
CREATE POLICY "Allow users to create their own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Allow users to create their own print jobs" ON public.print_jobs;
CREATE POLICY "Allow users to create their own print jobs"
  ON public.print_jobs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status IN ('awaiting_payment', 'pending')
  );

-- -------------------------------------------------------------------------
-- CRIT-1: settle_print_job_points — service_role only + job verify + caps
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

  SELECT reward_points INTO v_points
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_used > 0 THEN
    IF v_points < v_used THEN
      RAISE EXCEPTION 'Insufficient reward points';
    END IF;
    UPDATE public.profiles
    SET reward_points = reward_points - v_used
    WHERE id = p_user_id;

    INSERT INTO public.reward_points_history (user_id, points, type, description)
    VALUES (p_user_id, v_used, 'spend', 'Redeemed on print job ' || p_job_id::text);
  END IF;

  IF v_earn > 0 THEN
    -- Earn only after payment (or in-progress paid pipeline)
    IF v_job_status NOT IN (
      'paid', 'queued', 'rendering', 'printing', 'finishing',
      'quality_check', 'packing', 'shipping', 'ready_for_pickup', 'completed'
    ) THEN
      RAISE EXCEPTION 'Forbidden: cannot earn points before print job is paid';
    END IF;

    UPDATE public.profiles
    SET reward_points = reward_points + v_earn
    WHERE id = p_user_id;

    INSERT INTO public.reward_points_history (user_id, points, type, description)
    VALUES (p_user_id, v_earn, 'earn', 'Earned from print job ' || p_job_id::text);
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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_jwt_role TEXT;
  v_job_user UUID;
BEGIN
  v_jwt_role := COALESCE(auth.jwt() ->> 'role', '');
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Forbidden: rollback_print_job_points requires service_role';
  END IF;

  SELECT user_id INTO v_job_user
  FROM public.print_jobs
  WHERE id = p_job_id;

  IF NOT FOUND OR v_job_user IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden: invalid print job for rollback';
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

-- -------------------------------------------------------------------------
-- CRIT-2: mark / rollback order — service_role only (defense-in-depth)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_order_as_paid(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_jwt_role TEXT;
BEGIN
  v_jwt_role := COALESCE(auth.jwt() ->> 'role', '');
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Forbidden: mark_order_as_paid requires service_role';
  END IF;

  SELECT user_id INTO v_user_id
  FROM public.orders
  WHERE id = p_order_id AND status = 'pending'
  FOR UPDATE;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Order not found or not pending';
  END IF;

  UPDATE public.orders
  SET status = 'paid'
  WHERE id = p_order_id AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.rollback_failed_order(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
  item RECORD;
  v_user_id UUID;
  v_points_used INTEGER;
  v_points_earned INTEGER;
  v_jwt_role TEXT;
BEGIN
  v_jwt_role := COALESCE(auth.jwt() ->> 'role', '');
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Forbidden: rollback_failed_order requires service_role';
  END IF;

  SELECT user_id, points_used, points_earned
  INTO v_user_id, v_points_used, v_points_earned
  FROM public.orders
  WHERE id = p_order_id AND status = 'pending'
  FOR UPDATE;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  UPDATE public.orders
  SET status = 'failed', idempotency_key = NULL
  WHERE id = p_order_id;

  PERFORM 1
  FROM public.products
  WHERE id IN (
    SELECT product_id FROM public.order_items
    WHERE order_id = p_order_id AND product_id IS NOT NULL
  )
  ORDER BY id ASC
  FOR UPDATE;

  FOR item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = p_order_id LOOP
    IF item.product_id IS NOT NULL THEN
      UPDATE public.products
      SET stock = stock + item.quantity
      WHERE id = item.product_id;
    END IF;
  END LOOP;

  UPDATE public.profiles
  SET reward_points = reward_points + v_points_used - v_points_earned
  WHERE id = v_user_id;

  IF v_points_used > 0 THEN
    INSERT INTO public.reward_points_history (user_id, points, type, description)
    VALUES (v_user_id, v_points_used, 'earn', 'Hoàn điểm do thanh toán đơn hàng thất bại ' || p_order_id);
  END IF;
  IF v_points_earned > 0 THEN
    INSERT INTO public.reward_points_history (user_id, points, type, description)
    VALUES (v_user_id, v_points_earned, 'spend', 'Thu hồi điểm tích luỹ do thanh toán thất bại đơn ' || p_order_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- -------------------------------------------------------------------------
-- EXECUTE grants: money mutate RPC = service_role only
-- create_order_with_stock_check remains callable by authenticated
-- -------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.settle_print_job_points(UUID, INTEGER, INTEGER, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rollback_print_job_points(UUID, INTEGER, INTEGER, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_order_as_paid(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rollback_failed_order(UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.settle_print_job_points(UUID, INTEGER, INTEGER, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.rollback_print_job_points(UUID, INTEGER, INTEGER, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_order_as_paid(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.rollback_failed_order(UUID) TO service_role;

-- Harden create_order grants (keep authenticated; drop PUBLIC/anon)
REVOKE ALL ON FUNCTION public.create_order_with_stock_check(UUID, NUMERIC, NUMERIC, INTEGER, INTEGER, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_with_stock_check(UUID, NUMERIC, NUMERIC, INTEGER, INTEGER, TEXT, TEXT, JSONB) TO authenticated, service_role;
