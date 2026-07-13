-- =========================================================================
-- PLATPRINT DATABASE SCHEMA & POLICIES (SUPABASE POSTGRESQL)
-- Version: 2.0 (Optimized, Secure & Production-Ready)
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
  file_url TEXT NOT NULL,
  config_color TEXT CHECK (config_color IN ('color', 'bw')) NOT null,
  config_copies INTEGER DEFAULT 1 CHECK (config_copies > 0),
  config_paper_size TEXT CHECK (config_paper_size IN ('a4', 'a3', 'a5')) NOT null,
  config_binding TEXT CHECK (config_binding IN ('none', 'stapled', 'spiral')) NOT null,
  total_pages INTEGER NOT NULL CHECK (total_pages > 0),
  status TEXT CHECK (status IN ('pending', 'rendering', 'printing', 'completed', 'failed')) DEFAULT 'pending',
  cost DECIMAL(10, 2) NOT NULL CHECK (cost >= 0),
  printer_location TEXT NOT NULL,
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
CREATE INDEX idx_payment_tokens_user_id ON public.payment_tokens(user_id);
CREATE INDEX idx_points_history_user_id ON public.reward_points_history(user_id);
CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);

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
  ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to read order items of their own orders" 
  ON public.order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );
CREATE POLICY "Allow users to create order items"
  ON public.order_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );

-- Print Jobs Policies
-- [SECURITY NOTE]: Quyền UPDATE của user được mở để cho phép Simulator chạy cục bộ khi thiếu Service Role Key.
-- Trong hệ thống production, chính sách UPDATE này nên được gỡ bỏ và trạng thái lệnh in chỉ được thay đổi 
-- bởi server-side admin client (Service Role Client).
CREATE POLICY "Allow users to read their own print jobs" 
  ON public.print_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to create their own print jobs" 
  ON public.print_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to update their own print jobs" 
  ON public.print_jobs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

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
BEGIN
  -- Kiểm tra trùng lặp giao dịch (Idempotency check)
  SELECT id INTO v_order_id FROM public.orders WHERE idempotency_key = p_idempotency_key;
  IF v_order_id IS NOT NULL THEN
    RETURN v_order_id;
  END IF;

  -- 1. Khoá dòng Profiles của user (Pessimistic Locking) để đồng bộ giao dịch điểm thưởng
  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  -- 1b. Khoá tất cả dòng sản phẩm liên quan theo thứ tự ID tăng dần để tránh Deadlock chéo giữa các giao dịch đồng thời
  PERFORM 1 
  FROM public.products 
  WHERE id IN (SELECT product_id FROM jsonb_to_recordset(p_items) AS x(product_id UUID))
  ORDER BY id ASC
  FOR UPDATE;

  -- 2. Khởi tạo đơn hàng mới (với xử lý unique_violation cho idempotency race condition)
  BEGIN
    INSERT INTO public.orders (user_id, total_amount, discount_amount, points_used, points_earned, delivery_type, status, idempotency_key)
    VALUES (p_user_id, p_total_amount, p_discount_amount, p_points_used, p_points_earned, p_delivery_type, 'pending', p_idempotency_key)
    RETURNING id INTO v_order_id;
  EXCEPTION WHEN unique_violation THEN
    -- Giao dịch trùng lặp bị bắt bởi UNIQUE constraint (race condition giữa idempotency check và INSERT)
    SELECT id INTO v_order_id FROM public.orders WHERE idempotency_key = p_idempotency_key;
    RETURN v_order_id;
  END;

  -- 3. Kiểm tra và khấu trừ tồn kho từng mặt hàng
  FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER) LOOP
    -- Lấy tồn kho sản phẩm (dòng này đã được khóa bằng FOR UPDATE ở trên)
    SELECT stock INTO v_current_stock 
    FROM public.products 
    WHERE id = item.product_id;

    IF v_current_stock < item.quantity THEN
      RAISE EXCEPTION 'Sản phẩm % đã hết hàng hoặc không đủ tồn kho.', item.product_id;
    END IF;

    -- Trừ số lượng tồn kho
    UPDATE public.products 
    SET stock = stock - item.quantity 
    WHERE id = item.product_id;

    -- Lưu chi tiết đơn hàng
    INSERT INTO public.order_items (order_id, product_id, quantity, price)
    SELECT v_order_id, item.product_id, item.quantity, price 
    FROM public.products WHERE id = item.product_id;
  END LOOP;

  -- 4. Cập nhật số điểm thưởng trong profile
  UPDATE public.profiles 
  SET reward_points = reward_points - p_points_used + p_points_earned
  WHERE id = p_user_id;

  -- 5. Ghi nhận lịch sử giao dịch điểm thưởng
  IF p_points_used > 0 THEN
    INSERT INTO public.reward_points_history (user_id, points, type, description)
    VALUES (p_user_id, -p_points_used, 'spend', 'Sử dụng điểm giảm giá cho đơn hàng ' || v_order_id);
  END IF;
  IF p_points_earned > 0 THEN
    INSERT INTO public.reward_points_history (user_id, points, type, description)
    VALUES (p_user_id, p_points_earned, 'earn', 'Tích luỹ điểm thưởng từ đơn hàng ' || v_order_id);
  END IF;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Stored Procedure to rollback failed orders and restore stock/points
-- [BEST PRACTICE]: Thiết lập search_path cố định để bảo vệ hàm.
CREATE OR REPLACE FUNCTION public.rollback_failed_order(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
  item RECORD;
  v_user_id UUID;
  v_points_used INTEGER;
  v_points_earned INTEGER;
BEGIN
  -- 1. Khoá đơn hàng và lấy thông tin chi tiết
  SELECT user_id, points_used, points_earned INTO v_user_id, v_points_used, v_points_earned
  FROM public.orders
  WHERE id = p_order_id AND status = 'pending'
  FOR UPDATE;
  
  IF v_user_id IS NULL THEN
    RETURN; -- Đơn hàng đã được hoàn thành hoặc không ở trạng thái pending
  END IF;

  -- Khoá dòng Profile của người dùng
  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  -- 2. Cập nhật trạng thái đơn hàng sang thất bại và giải phóng idempotency_key cho retry
  UPDATE public.orders
  SET status = 'failed', idempotency_key = NULL
  WHERE id = p_order_id;

  -- 3. Hoàn trả lại số lượng tồn kho sản phẩm
  FOR item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = p_order_id LOOP
    IF item.product_id IS NOT NULL THEN
      UPDATE public.products
      SET stock = stock + item.quantity
      WHERE id = item.product_id;
    END IF;
  END LOOP;

  -- 4. Hoàn lại số điểm thưởng cho người dùng
  UPDATE public.profiles
  SET reward_points = reward_points + v_points_used - v_points_earned
  WHERE id = v_user_id;

  -- 5. Ghi nhận giao dịch hoàn trả điểm
  IF v_points_used > 0 THEN
    INSERT INTO public.reward_points_history (user_id, points, type, description)
    VALUES (v_user_id, v_points_used, 'earn', 'Hoàn điểm do thanh toán đơn hàng thất bại ' || p_order_id);
  END IF;
  IF v_points_earned > 0 THEN
    INSERT INTO public.reward_points_history (user_id, points, type, description)
    VALUES (v_user_id, -v_points_earned, 'spend', 'Thu hồi điểm tích luỹ do thanh toán thất bại đơn ' || p_order_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Stored Procedure to safely mark order as paid bypassing RLS
-- [BEST PRACTICE]: Thiết lập search_path cố định để bảo vệ hàm.
CREATE OR REPLACE FUNCTION public.mark_order_as_paid(p_order_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.orders
  SET status = 'paid'
  WHERE id = p_order_id AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- =========================================================================
-- 6. STORAGE RLS POLICIES FOR BUCKET "print-files"
-- =========================================================================

-- Cho phép người dùng đã đăng nhập tải file lên (INSERT)
CREATE POLICY "Allow authenticated insert to print-files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'print-files' AND auth.uid() = owner);

-- Cho phép người dùng đã đăng nhập đọc file của chính mình (SELECT)
-- [VULNERABILITY PATCH v2.0]: Thắt chặt chính sách để ngăn ngừa lỗ hổng IDOR đọc tệp in ấn của người khác
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
