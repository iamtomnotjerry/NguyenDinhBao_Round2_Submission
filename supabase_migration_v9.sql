-- =========================================================================
-- PLATPRINT MIGRATION v9 — Audit hardening (idempotency scoping + clamps)
-- Chạy SAU v8.
--
-- 1. create_order_with_stock_check: idempotency lookup PHẢI lọc theo
--    user_id — chặn cross-user idempotency-key probing (SECURITY DEFINER
--    bypass RLS nên lookup không lọc user trả về order của user khác,
--    khiến API caller có thể kích hoạt rollback đơn pending của nạn nhân).
-- 2. rollback_failed_order: clamp reward_points bằng GREATEST(0, ...) —
--    tránh CHECK (reward_points >= 0) làm abort toàn bộ rollback khi user
--    đã kịp tiêu số điểm earn tạm thời ở giao dịch khác.
-- 3. handle_new_user: cố định search_path (bản cloud cũ thiếu proconfig —
--    Supabase advisor 0011 function_search_path_mutable).
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. create_order_with_stock_check — user-scoped idempotency
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order_with_stock_check(
  p_user_id UUID,
  p_total_amount DECIMAL,
  p_discount_amount DECIMAL,
  p_points_used INTEGER,
  p_points_earned INTEGER,
  p_delivery_type TEXT,
  p_idempotency_key TEXT,
  p_items JSONB
) RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  item RECORD;
  v_current_stock INTEGER;
  v_unit_price DECIMAL(10, 2);
  v_subtotal DECIMAL(10, 2) := 0;
  v_available_points INTEGER;
  v_points_used INTEGER := 0;
  v_discount DECIMAL(10, 2) := 0;
  v_total DECIMAL(10, 2) := 0;
  v_points_earned INTEGER := 0;
  v_max_redeem INTEGER;
BEGIN
  -- Ownership: chặn gọi RPC thay mặt user khác
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot create order for another user';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order items required';
  END IF;

  IF p_delivery_type IS NULL OR p_delivery_type NOT IN ('pickup', 'delivery') THEN
    RAISE EXCEPTION 'Invalid delivery_type';
  END IF;

  -- Idempotency — v9: scoped theo user_id, không trả order của user khác
  SELECT id INTO v_order_id
  FROM public.orders
  WHERE idempotency_key = p_idempotency_key AND user_id = p_user_id;
  IF v_order_id IS NOT NULL THEN
    RETURN v_order_id;
  END IF;

  -- Lock profile
  SELECT reward_points INTO v_available_points
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Lock products ASC to avoid deadlock
  PERFORM 1
  FROM public.products
  WHERE id IN (SELECT product_id FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER))
  ORDER BY id ASC
  FOR UPDATE;

  -- Compute subtotal from DB prices + validate stock
  FOR item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER)
  LOOP
    IF item.quantity IS NULL OR item.quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for product %', item.product_id;
    END IF;

    SELECT stock, price INTO v_current_stock, v_unit_price
    FROM public.products
    WHERE id = item.product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found', item.product_id;
    END IF;

    IF v_current_stock < item.quantity THEN
      RAISE EXCEPTION 'Sản phẩm % đã hết hàng hoặc không đủ tồn kho.', item.product_id;
    END IF;

    v_subtotal := v_subtotal + (v_unit_price * item.quantity);
  END LOOP;

  -- Cap redeem: 1 pt = $0.1; cannot exceed balance or subtotal
  v_max_redeem := FLOOR(v_subtotal * 10)::INTEGER;
  v_points_used := LEAST(
    GREATEST(COALESCE(p_points_used, 0), 0),
    COALESCE(v_available_points, 0),
    v_max_redeem
  );
  v_discount := ROUND((v_points_used * 0.1)::NUMERIC, 2);
  v_total := GREATEST(0, ROUND((v_subtotal - v_discount)::NUMERIC, 2));
  -- Ignore client p_points_earned / p_total_amount / p_discount_amount
  v_points_earned := FLOOR(v_total)::INTEGER;

  -- Create order with SERVER totals
  BEGIN
    INSERT INTO public.orders (
      user_id, total_amount, discount_amount, points_used, points_earned,
      delivery_type, status, idempotency_key
    )
    VALUES (
      p_user_id, v_total, v_discount, v_points_used, v_points_earned,
      p_delivery_type, 'pending', p_idempotency_key
    )
    RETURNING id INTO v_order_id;
  EXCEPTION WHEN unique_violation THEN
    -- v9: replay chỉ khi key thuộc CHÍNH user này; key của user khác → lỗi rõ ràng
    SELECT id INTO v_order_id
    FROM public.orders
    WHERE idempotency_key = p_idempotency_key AND user_id = p_user_id;
    IF v_order_id IS NULL THEN
      RAISE EXCEPTION 'Idempotency key conflict';
    END IF;
    RETURN v_order_id;
  END;

  -- Deduct stock + line items at DB price
  FOR item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER)
  LOOP
    UPDATE public.products
    SET stock = stock - item.quantity
    WHERE id = item.product_id;

    INSERT INTO public.order_items (order_id, product_id, quantity, price)
    SELECT v_order_id, item.product_id, item.quantity, price
    FROM public.products WHERE id = item.product_id;
  END LOOP;

  -- Apply points (earn credited now; rolled back if payment fails)
  UPDATE public.profiles
  SET reward_points = reward_points - v_points_used + v_points_earned
  WHERE id = p_user_id;

  IF v_points_used > 0 THEN
    INSERT INTO public.reward_points_history (user_id, points, type, description)
    VALUES (p_user_id, v_points_used, 'spend', 'Sử dụng điểm giảm giá cho đơn hàng ' || v_order_id);
  END IF;
  IF v_points_earned > 0 THEN
    INSERT INTO public.reward_points_history (user_id, points, type, description)
    VALUES (p_user_id, v_points_earned, 'earn', 'Tích luỹ điểm thưởng từ đơn hàng ' || v_order_id);
  END IF;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- -------------------------------------------------------------------------
-- 2. rollback_failed_order — clamp points để rollback không bao giờ abort
-- -------------------------------------------------------------------------
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

  -- v9: clamp về 0 — nếu user đã tiêu bớt điểm earn tạm thời ở giao dịch
  -- khác, CHECK (reward_points >= 0) không được phép phá hỏng rollback kho.
  UPDATE public.profiles
  SET reward_points = GREATEST(0, reward_points + v_points_used - v_points_earned)
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
-- 3. handle_new_user — cố định search_path (advisor 0011)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, reward_points)
  VALUES (new.id, new.email, 0);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
