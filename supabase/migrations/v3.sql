-- =========================================================================
-- PLATPRINT MIGRATION v3.0
-- Chạy file này trên database ĐÃ CÓ SCHEMA cũ (đã có bảng profiles, ...).
-- KHÔNG chạy lại supabase/schema.sql nếu bảng đã tồn tại.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. print_jobs: đổi file_url → file_path (lưu storage path, không lưu signed URL)
-- -------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'print_jobs'
      AND column_name = 'file_url'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'print_jobs'
      AND column_name = 'file_path'
  ) THEN
    ALTER TABLE public.print_jobs RENAME COLUMN file_url TO file_path;
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- 2. Gỡ quyền UPDATE phía client trên print_jobs (chỉ Service Role được cập nhật)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow users to update their own print jobs" ON public.print_jobs;

-- Đảm bảo SELECT / INSERT vẫn còn (idempotent)
DROP POLICY IF EXISTS "Allow users to read their own print jobs" ON public.print_jobs;
CREATE POLICY "Allow users to read their own print jobs"
  ON public.print_jobs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to create their own print jobs" ON public.print_jobs;
CREATE POLICY "Allow users to create their own print jobs"
  ON public.print_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- 3. Profiles: không cho client UPDATE (chống gian lận điểm thưởng)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- -------------------------------------------------------------------------
-- 4. Cập nhật rollback_failed_order (khóa products ORDER BY id ASC FOR UPDATE)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rollback_failed_order(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
  item RECORD;
  v_user_id UUID;
  v_points_used INTEGER;
  v_points_earned INTEGER;
BEGIN
  SELECT user_id, points_used, points_earned INTO v_user_id, v_points_used, v_points_earned
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
    VALUES (v_user_id, -v_points_earned, 'spend', 'Thu hồi điểm tích luỹ do thanh toán thất bại đơn ' || p_order_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- -------------------------------------------------------------------------
-- 5. Storage RLS cho bucket print-files (DROP rồi CREATE để tránh lỗi trùng tên)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated insert to print-files" ON storage.objects;
CREATE POLICY "Allow authenticated insert to print-files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'print-files' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Allow owner select from print-files" ON storage.objects;
CREATE POLICY "Allow owner select from print-files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'print-files' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Allow owner update in print-files" ON storage.objects;
CREATE POLICY "Allow owner update in print-files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'print-files' AND auth.uid() = owner)
WITH CHECK (bucket_id = 'print-files' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Allow owner delete in print-files" ON storage.objects;
CREATE POLICY "Allow owner delete in print-files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'print-files' AND auth.uid() = owner);

-- -------------------------------------------------------------------------
-- 6. (Tùy chọn) Bật Realtime cho print_jobs nếu chưa có
-- -------------------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.print_jobs;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
