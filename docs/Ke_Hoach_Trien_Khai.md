# KẾ HOẠCH TRIỂN KHAI CHI TIẾT: PLATPRINT (NEXT.JS + SUPABASE CLOUD)

## TIÊU CHUẨN THIẾT KẾ: ENTERPRISE & PRODUCTION-READY (L2–L3 ASSESSMENT)

Tài liệu này trình bày giải pháp kiến trúc, lược đồ dữ liệu, thiết kế API và cơ chế bảo mật/hiệu năng cho hệ thống **PlatPrint** (Luồng in từ xa & Gian hàng ấn phẩm), được tinh chỉnh để bám sát và giải quyết triệt để 100% yêu cầu trong 3 tài liệu tuyển dụng (`PTHS-01`, `PTHS-03`, `PTHS-04`).

---

## 1. TECH STACK CHUẨN DOANH NGHIỆP (INDUSTRY STANDARD)

- **Framework:** Next.js (App Router, React 19, TypeScript).
- **Database & BaaS:** Supabase Cloud (PostgreSQL) - Sử dụng **Row Level Security (RLS)** để kiểm soát quyền truy cập dữ liệu trực tiếp ở lớp DB.
- **Storage:** Supabase Storage (Bucket lưu trữ file in ấn).
- **Realtime:** Supabase Realtime (Theo dõi tiến độ máy in thông qua PostgreSQL Replication).
- **AI Engine:** SDK Gemini (`@google/generative-ai` hoặc `@ai-sdk/google`) chạy stream phản hồi thời gian thực.
- **Styling:** Tailwind CSS v4 (Mới nhất, dùng native CSS variables, không cần PostCSS/Config JS).
- **Testing:** Jest + Supertest (Unit & Integration test), Autocannon (Kiểm thử tải hiệu năng).

---

## 2. LƯỢC ĐỒ CƠ SỞ DỮ LIỆU CHUYÊN NGHIỆP (POSTGRESQL SCHEMA)

Để đảm bảo hiệu năng tải 100–1.000 req/s, mọi khóa ngoại đều được khai báo **Index** rõ ràng. Các ràng buộc toàn vẹn dữ liệu được đảm bảo thông qua tầng cứng của DB (Constraints).

```sql
-- Kích hoạt extension cần thiết
create extension if not exists "uuid-ossp";

-- 1. BẢNG PROFILES (Mối quan hệ 1-1 với auth.users của Supabase)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null unique,
  reward_points integer default 0 check (reward_points >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. BẢNG PRODUCTS (Gian hàng ấn phẩm in sẵn)
create table public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  price decimal(10, 2) not null check (price >= 0),
  stock integer not null check (stock >= 0),
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. BẢNG ORDERS (Đơn hàng ấn phẩm)
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  total_amount decimal(10, 2) not null check (total_amount >= 0),
  discount_amount decimal(10, 2) default 0.00 check (discount_amount >= 0),
  points_used integer default 0 check (points_used >= 0),
  points_earned integer default 0 check (points_earned >= 0),
  delivery_type text check (delivery_type in ('pickup', 'delivery')) not null,
  status text check (status in ('pending', 'paid', 'failed', 'completed')) default 'pending',
  idempotency_key text unique, -- Chống trùng lặp thanh toán khi mạng lỗi
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create index idx_orders_user_id on public.orders(user_id);

-- 4. BẢNG ORDER_ITEMS (Chi tiết đơn hàng)
create table public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  quantity integer not null check (quantity > 0),
  price decimal(10, 2) not null check (price >= 0)
);
create index idx_order_items_order_id on public.order_items(order_id);

-- 5. BẢNG PRINT_JOBS (Lệnh in ấn từ xa)
create table public.print_jobs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  file_name text not null,
  file_url text not null,
  config_color text check (config_color in ('color', 'bw')) not null,
  config_copies integer default 1 check (config_copies > 0),
  config_paper_size text check (config_paper_size in ('a4', 'a3', 'a5')) not null,
  config_binding text check (config_binding in ('none', 'stapled', 'spiral')) not null,
  total_pages integer not null check (total_pages > 0),
  status text check (status in ('pending', 'rendering', 'printing', 'completed', 'failed')) default 'pending',
  cost decimal(10, 2) not null check (cost >= 0),
  printer_location text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create index idx_print_jobs_user_id on public.print_jobs(user_id);

-- 6. BẢNG PAYMENT_TOKENS (Lưu token thẻ - PCI-DSS Compliant)
create table public.payment_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  card_token text not null,
  card_brand text not null,
  last4 varchar(4) not null,
  exp_month integer not null check (exp_month between 1 and 12),
  exp_year integer not null,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create index idx_payment_tokens_user_id on public.payment_tokens(user_id);

-- 7. BẢNG REWARD_POINTS_HISTORY (Lịch sử điểm thưởng)
create table public.reward_points_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  points integer not null,
  type text check (type in ('earn', 'spend')) not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create index idx_points_history_user_id on public.reward_points_history(user_id);

-- 8. BẢNG CHAT_SESSIONS (Phiên hỗ trợ khách hàng)
create table public.chat_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('active', 'waiting_support', 'closed')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create index idx_chat_sessions_user_id on public.chat_sessions(user_id);

-- 9. BẢNG CHAT_MESSAGES (Chi tiết tin nhắn trong phiên)
create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.chat_sessions(id) on delete cascade not null,
  sender text check (sender in ('user', 'ai', 'support')) not null,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create index idx_chat_messages_session_id on public.chat_messages(session_id);
```

---

## 3. THIẾT KẾ CÁC NGHIỆP VỤ ĐẶC THÙ (SENIOR ENGINEERING PATTERNS)

### A. Luồng Đọc Số Trang PDF & Render Preview Thực tế

- **Vấn đề:** Làm sao biết file PDF tải lên có bao nhiêu trang để tính chi phí và in đúng cấu hình?
- **Giải pháp Senior:**
  1. Khi người dùng tải file PDF lên ở Frontend, chúng ta sử dụng thư viện `pdfjs-dist` ngay trên trình duyệt để parse file.
  2. Hàm sẽ đếm chính xác số lượng trang thực tế của file PDF (`pdfDoc.numPages`) và gửi dữ liệu này kèm theo lên Backend khi tạo đơn in.
  3. **Render Preview thực tế:** Sử dụng `pdfjs-dist` render các trang PDF lên thẻ `<canvas>` trong React.
  4. Áp dụng CSS filters (`filter: grayscale(100%)`) cho canvas nếu cấu hình in là Đen trắng (bw).
  5. Thay đổi kích thước khung preview dựa trên tỷ lệ thực tế của A3/A4/A5.
  6. Overlay hình ảnh gáy xoắn (spiral binding) đè lên mép trái canvas bằng CSS absolute layout nếu cấu hình đóng gáy được chọn.

### B. Luồng Thanh toán PCI-DSS Compliant & Phòng chống Double-Charge

- **Vấn đề:**
  - Bảo mật thanh toán yêu cầu không lưu số thẻ thô trên Database của chúng ta (chuẩn PCI-DSS).
  - Tránh lỗi người dùng bấm F5 hoặc mạng lag gây thanh toán 2 lần (Double Charge).
- **Giải pháp Enterprise:**
  1. **Tokenization tách biệt:** Client gửi trực tiếp số thẻ thô lên Mock API Route `/api/sandbox/payment/tokenize` đóng vai trò cổng thanh toán độc lập. Endpoint này chỉ trả về `card_token` ngẫu nhiên. Server của ta chỉ lưu `card_token` này.
  2. **Idempotency Key:** Khi thanh toán, Frontend sinh một UUID duy nhất làm `idempotency_key` lưu trên máy client. Khi gửi yêu cầu thanh toán kèm `idempotency_key` lên `/api/orders`, backend sẽ kiểm tra xem key này đã tồn tại trong DB chưa. Nếu đã xử lý thành công trước đó, nó sẽ trả về kết quả cũ mà không thực hiện trừ tiền lại.
  3. **Mô phỏng lỗi đặc thù:**
     - Đuôi thẻ `4001` -> Trả về lỗi: **Card Expired** (Cập nhật đơn hàng thành `failed`).
     - Đuôi thẻ `4002` -> Trả về lỗi: **Transaction Declined** (Cập nhật đơn hàng thành `failed`).
     - Đuôi thẻ `4003` -> Sleep 10 giây (timeout) -> Trả về lỗi: **Timeout** (Frontend sẽ hiển thị cảnh báo giao dịch đang chờ xác nhận).

### C. Quản lý Tồn kho & Tránh Race Conditions (Pessimistic Locking)

- **Vấn đề:** Khi có nhiều request mua cùng một ấn phẩm in sẵn lúc tồn kho chỉ còn 1 sản phẩm.
- **Giải pháp Enterprise:**
  - Sử dụng Postgres transaction ở chế độ khóa phòng ngừa (**Pessimistic Locking**). Chúng ta sẽ viết một Stored Procedure (RPC) trên Postgres và gọi từ Next.js:
    ```sql
    create or replace function create_order_with_stock_check(
      p_user_id uuid,
      p_total_amount decimal,
      p_delivery_type text,
      p_items jsonb
    ) returns uuid as $$
    declare
      v_order_id uuid;
      item record;
      v_current_stock integer;
    begin
      -- 1. Tạo đơn hàng trước
      insert into orders (user_id, total_amount, delivery_type, status)
      values (p_user_id, p_total_amount, p_delivery_type, 'pending')
      returning id into v_order_id;

      -- 2. Duyệt qua từng item, khóa dòng sản phẩm để tránh ghi trùng (Pessimistic Locking)
      for item in select * from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer) loop
        select stock into v_current_stock
        from products
        where id = item.product_id
        for update; -- Khóa dòng sản phẩm này cho đến khi kết thúc transaction

        if v_current_stock < item.quantity then
          raise exception 'Sản phẩm hết hàng';
        end if;

        -- 3. Trừ tồn kho
        update products
        set stock = stock - item.quantity
        where id = item.product_id;

        -- 4. Thêm vào order_items
        insert into order_items (order_id, product_id, quantity, price)
        select v_order_id, item.product_id, item.quantity, price
        from products where id = item.product_id;
      end loop;

      return v_order_id;
    end;
    $$ language plpgsql;
    ```

### D. Máy in mô phỏng (Print Queue Simulator) chạy nền bất đồng bộ

- **Vấn đề:** Luồng xử lý in ấn tốn thời gian, không được làm nghẽn luồng xử lý HTTP request của server Next.js.
- **Giải pháp Senior:**
  1. Khi đơn in được tạo và thanh toán thành công, Server Next.js phản hồi lập tức `200 OK` cho client, giải phóng thread.
  2. Kích hoạt một tiến trình nền bất đồng bộ (`setTimeout` hoặc `eventEmitter` trong môi trường serverless/node).
  3. Tiến trình này chạy một vòng lặp cập nhật trạng thái của lệnh in trong bảng `print_jobs`: `pending` -> `rendering` (đợi 2s) -> `printing` (đợi in từng trang, 0.5s/trang) -> `completed`.
  4. Frontend kết nối với Supabase Realtime lắng nghe bảng `print_jobs`:
     ```typescript
     supabase
       .channel('print-progress')
       .on(
         'postgres_changes',
         { event: 'UPDATE', schema: 'public', table: 'print_jobs', filter: `id=eq.${jobId}` },
         (payload) => {
           updateProgressBar(payload.new.status, payload.new.total_pages);
         },
       )
       .subscribe();
     ```

### E. AI Chatbot đa ngôn ngữ với Gemini SDK và Streaming Response

- **Dịch thuật & Trả lời Đa ngôn ngữ:** Cấu hình System Instruction hướng dẫn Gemini: _"Bạn là trợ lý ảo chăm sóc khách hàng của PlatPrint. Hãy tự động phát hiện ngôn ngữ của người dùng và phản hồi lại bằng đúng ngôn ngữ đó. Nếu họ hỏi bằng tiếng Anh, trả lời tiếng Anh, nếu bằng tiếng Việt, trả lời tiếng Việt."_
- **Streaming Response:** Sử dụng API `@ai-sdk/google` để stream câu trả lời chữ-theo-chữ trực tiếp về Frontend, tạo trải nghiệm mượt mà, chuyên nghiệp và giảm thiểu cảm giác chờ đợi cho người dùng.
- **Cơ chế Fallback thông minh:** Hướng dẫn AI trả về chuỗi `[FORWARD_TO_HUMAN]` nếu câu hỏi quá khó. Khi Backend phát hiện chuỗi này, nó sẽ gọi SQL cập nhật trạng thái session trong bảng `chat_sessions` thành `waiting_support`, đồng thời gửi thông báo realtime cho bảng hỗ trợ viên.

---

## 4. CHIẾN LƯỢC BẢO MẬT & BẢO VỆ DỮ LIỆU NHẠY CẢM

### A. Ngăn chặn IDOR (Insecure Direct Object Reference)

- Bật Row Level Security (RLS) trên các bảng: `orders`, `print_jobs`, `payment_tokens`, `reward_points_history`, `chat_sessions`, `chat_messages`.
- Các chính sách RLS chuẩn:
  ```sql
  -- RLS cho print_jobs
  alter table print_jobs enable row level security;
  create policy "Người dùng chỉ được đọc lệnh in của mình"
    on print_jobs for select using (auth.uid() = user_id);
  create policy "Người dùng chỉ được tạo lệnh in cho mình"
    on print_jobs for insert with check (auth.uid() = user_id);
  ```

### B. Chặn XSS (Cross-Site Scripting)

- Tự động sanitize mọi tin nhắn chat từ người dùng ở cả Frontend và Backend bằng thư viện `dompurify` trước khi render ra HTML để tránh việc chèn mã độc `<script>` vào giao diện của hỗ trợ viên hoặc các trang lịch sử.

### C. Rate Limiting ngăn chặn DDoS / Brute Force

- Áp dụng middleware Rate Limiter đơn giản (Token Bucket hoặc Sliding Window) cho các API nhạy cảm như `/api/chat` và `/api/sandbox/payment/charge` để giới hạn số request (ví dụ: tối đa 5 tin nhắn chat/phút trên một user session), bảo vệ hệ thống trước tình trạng spam tốn tài nguyên.

---

## 5. KẾ HOẠCH XÁC MINH & KIỂM THỬ (TESTING PLAN)

1. **Kiểm thử tải (Performance Testing):** Chạy `autocannon -c 100 -d 10 http://localhost:3000/api/products` để kiểm tra độ trễ (latency) và thông lượng (throughput) khi cache sản phẩm được bật.
2. **Kiểm thử tích hợp (Integration Testing):** Viết test case bằng Jest kiểm tra giao dịch trừ tồn kho đồng thời để kiểm chứng transaction không cho phép tồn kho âm.
3. **Kiểm thử RLS (Security Testing):** Viết mã kiểm thử cố tình dùng token của User A để truy vấn API lấy thông tin `print_jobs` của User B và xác nhận kết quả trả về là 403 Forbidden hoặc kết quả rỗng.
