-- =========================================================================
-- PLATPRINT DATABASE SCHEMA & POLICIES (SUPABASE POSTGRESQL)
-- Version: 3.0 (Optimized, Secure & Production-Ready)
--
-- CHỈ dùng cho database MỚI / trống.
-- Nếu đã có bảng (lỗi "relation profiles already exists") → chạy
-- supabase_migration_v3.sql thay vì file này.
-- =========================================================================

-- Kích hoạt extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. TABLES DEFINITIONS
-- =========================================================================

-- Profiles table (Linked 1-1 with Supabase Auth users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  reward_points INTEGER DEFAULT 0 CHECK (reward_points >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Products table (Printed store items catalog)
CREATE TABLE public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL CHECK (stock >= 0),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Orders table (Printed products orders)
CREATE TABLE public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT null,
  total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
  discount_amount DECIMAL(10, 2) DEFAULT 0.00 CHECK (discount_amount >= 0),
  points_used INTEGER DEFAULT 0 CHECK (points_used >= 0),
  points_earned INTEGER DEFAULT 0 CHECK (points_earned >= 0),
  delivery_type TEXT CHECK (delivery_type IN ('pickup', 'delivery')) NOT null,
  status TEXT CHECK (status IN ('pending', 'paid', 'failed', 'completed')) DEFAULT 'pending',
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Order Items table (Order details)
CREATE TABLE public.order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT null,
  product_id UUID REFERENCES public.products(id) ON DELETE SET null,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0)
);

-- Print Jobs table (Remote printing orders)
CREATE TABLE public.print_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT null,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  config_color TEXT CHECK (config_color IN ('color', 'bw', 'mixed')) NOT null,
  config_copies INTEGER DEFAULT 1 CHECK (config_copies > 0),
  config_paper_size TEXT CHECK (config_paper_size IN ('a4', 'a3', 'a5', 'letter', 'legal', 'tabloid', 'b5', 'custom')) NOT null,
  config_binding TEXT CHECK (config_binding IN ('none', 'stapled', 'spiral', 'glue', 'hardcover')) NOT null,
  total_pages INTEGER NOT NULL CHECK (total_pages > 0),
  status TEXT CHECK (status IN (
    'pending','awaiting_payment','paid','queued','rendering','printing',
    'finishing','quality_check','packing','shipping','ready_for_pickup',
    'completed','failed'
  )) DEFAULT 'pending',
  cost DECIMAL(10, 2) NOT NULL CHECK (cost >= 0),
  printer_location TEXT NOT NULL,
  config_json JSONB DEFAULT '{}'::jsonb,
  page_selection TEXT DEFAULT 'all',
  selected_page_count INTEGER,
  duplex TEXT DEFAULT 'simplex' CHECK (duplex IN ('simplex','long_edge','short_edge')),
  delivery_type TEXT DEFAULT 'pickup' CHECK (delivery_type IN ('pickup','delivery')),
  delivery_address TEXT,
  shipping_fee DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  points_used INTEGER DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  idempotency_key TEXT,
  card_last4 VARCHAR(4),
  estimated_ready TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Payment Tokens table (PCI-DSS Compliant saved cards)
CREATE TABLE public.payment_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT null,
  card_token TEXT NOT NULL,
  card_brand TEXT NOT NULL,
  last4 VARCHAR(4) NOT NULL,
  exp_month INTEGER NOT NULL CHECK (exp_month BETWEEN 1 AND 12),
  exp_year INTEGER NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Reward Points History table (Earning & spending audit log)
CREATE TABLE public.reward_points_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT null,
  points INTEGER NOT NULL,
  type TEXT CHECK (type IN ('earn', 'spend')) NOT null,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Chat Sessions table (Support rooms)
CREATE TABLE public.chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT null,
  status TEXT CHECK (status IN ('active', 'waiting_support', 'closed')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Chat Messages table (Individual chat messages)
CREATE TABLE public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT null,
  sender TEXT CHECK (sender IN ('user', 'ai', 'support')) NOT null,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =========================================================================
-- 2. INDEXES FOR PERFORMANCE OPTIMIZATION (Foreign Keys Coverage)
-- =========================================================================
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_print_jobs_user_id ON public.print_jobs(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_print_jobs_idempotency
  ON public.print_jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_payment_tokens_user_id ON public.payment_tokens(user_id);
CREATE INDEX idx_points_history_user_id ON public.reward_points_history(user_id);
CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);

-- v7: race-safe idempotent print settle legs
CREATE UNIQUE INDEX uq_rph_print_job_redeem
  ON public.reward_points_history (description)
  WHERE type = 'spend' AND description LIKE 'Redeemed on print job %';
CREATE UNIQUE INDEX uq_rph_print_job_earn
  ON public.reward_points_history (description)
  WHERE type = 'earn' AND description LIKE 'Earned from print job %';

-- =========================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES FOR IDOR & DATA INJECTION PREVENTION
-- =========================================================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Products Policies (Catalog public read-only)
CREATE POLICY "Allow anyone to read products" 
  ON public.products FOR SELECT USING (true);

-- Profiles Policies 
-- [VULNERABILITY PATCH v2.0]: Xoá bỏ hoàn toàn UPDATE policy cho Profiles để ngăn chặn user 
-- chỉnh sửa điểm thưởng (reward_points) tuỳ ý từ Client SDK. 
-- Điểm thưởng chỉ được cập nhật qua Stored Procedure chạy dưới quyền SECURITY DEFINER trên server.
CREATE POLICY "Allow users to read their own profile" 
  ON public.profiles FOR SELECT USING (auth.uid() = id);

-- Orders & Items Policies (Restrictive IDOR defense)
CREATE POLICY "Allow users to read their own orders" 
  ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to create their own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Allow users to read order items of their own orders" 
  ON public.order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );
CREATE POLICY "Allow users to create order items"
  ON public.order_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );

-- Print Jobs Policies
-- [SECURITY v3.0]: Không cho phép client UPDATE print_jobs. Trạng thái lệnh in chỉ được
-- thay đổi bởi Background Simulator qua Service Role Client (SUPABASE_SERVICE_ROLE_KEY).
CREATE POLICY "Allow users to read their own print jobs" 
  ON public.print_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to create their own print jobs"
  ON public.print_jobs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status IN ('awaiting_payment', 'pending')
  );

-- Payment Tokens Policies
CREATE POLICY "Allow users to manage their own payment tokens" 
  ON public.payment_tokens FOR ALL USING (auth.uid() = user_id);

-- Reward Points History Policies (Read-only auditing)
CREATE POLICY "Allow users to read their own points history" 
  ON public.reward_points_history FOR SELECT USING (auth.uid() = user_id);

-- Chat Sessions Policies
CREATE POLICY "Allow users to read their own chat sessions" 
  ON public.chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to create their own chat sessions" 
  ON public.chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to update their own chat sessions"
  ON public.chat_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Chat Messages Policies
CREATE POLICY "Allow users to read messages in their own sessions" 
  ON public.chat_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.chat_sessions WHERE chat_sessions.id = chat_messages.session_id AND chat_sessions.user_id = auth.uid())
  );
CREATE POLICY "Allow users to insert messages in their own sessions" 
  ON public.chat_messages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.chat_sessions WHERE chat_sessions.id = chat_messages.session_id AND chat_sessions.user_id = auth.uid())
  );

-- =========================================================================
-- 4. TRIGGERS FOR USER AUTOMATION
-- =========================================================================

-- Trigger function for automatic profile creation on sign-up
-- [BEST PRACTICE]: Thiết lập search_path cố định để tránh lỗi Search Path Hijacking.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, reward_points)
  VALUES (new.id, new.email, 0);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger-only: không cho anon/authenticated gọi qua PostgREST RPC
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 5. STORED PROCEDURES (BUSINESS LOOPS)
-- =========================================================================

-- Stored Procedure for inventory checks, deducting points and ordering
-- [CONCURRENCY OPTIMIZATION]: Thực hiện Pessimistic Locking khoá dòng Profiles của user để tránh race conditions.
-- [BEST PRACTICE]: Thiết lập search_path cố định để bảo vệ hàm.
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

  -- Idempotency
  SELECT id INTO v_order_id FROM public.orders WHERE idempotency_key = p_idempotency_key;
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
    SELECT id INTO v_order_id FROM public.orders WHERE idempotency_key = p_idempotency_key;
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
-- C2 / v6: rollback_failed_order — service_role only
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
-- C2 / v6: mark_order_as_paid — service_role only
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

-- Settle / rollback reward points (v6 role + caps; v7 idempotent legs)
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

-- v6 grants: money mutate RPCs are service_role-only
REVOKE ALL ON FUNCTION public.settle_print_job_points(UUID, INTEGER, INTEGER, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rollback_print_job_points(UUID, INTEGER, INTEGER, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_order_as_paid(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rollback_failed_order(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_print_job_points(UUID, INTEGER, INTEGER, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.rollback_print_job_points(UUID, INTEGER, INTEGER, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_order_as_paid(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.rollback_failed_order(UUID) TO service_role;
REVOKE ALL ON FUNCTION public.create_order_with_stock_check(UUID, NUMERIC, NUMERIC, INTEGER, INTEGER, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_with_stock_check(UUID, NUMERIC, NUMERIC, INTEGER, INTEGER, TEXT, TEXT, JSONB) TO authenticated, service_role;

-- =========================================================================
-- 6. STORAGE RLS POLICIES FOR BUCKET "print-files"
-- =========================================================================

-- v7: drop legacy over-permissive SELECT if present (upgrade / redo-safe)
DROP POLICY IF EXISTS "Allow authenticated select from print-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to select from print-files" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for print-files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view print-files" ON storage.objects;

-- Cho phép người dùng đã đăng nhập tải file lên (INSERT)
CREATE POLICY "Allow authenticated insert to print-files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'print-files' AND auth.uid() = owner);

-- Owner-only SELECT (không cho authenticated đọc toàn bucket)
CREATE POLICY "Allow owner select from print-files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'print-files' AND auth.uid() = owner);

-- Cho phép người dùng cập nhật file của mình (UPDATE)
CREATE POLICY "Allow owner update in print-files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'print-files' AND auth.uid() = owner)
WITH CHECK (bucket_id = 'print-files' AND auth.uid() = owner);

-- Cho phép người dùng xóa file của mình (DELETE)
CREATE POLICY "Allow owner delete in print-files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'print-files' AND auth.uid() = owner);
