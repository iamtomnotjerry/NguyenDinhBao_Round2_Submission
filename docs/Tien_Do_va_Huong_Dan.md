# TIẾN ĐỘ DỰ ÁN VÀ HƯỚNG DẪN LẬP TRÌNH CHI TIẾT (PLATPRINT)

Tài liệu này tổng hợp chi tiết toàn bộ các thiết lập đã hoàn thành (những việc đã làm) và cung cấp lộ trình hướng dẫn lập trình chi tiết nhất (những việc cần làm tiếp theo) cho dự án **PlatPrint** của ứng viên **Nguyễn Đình Bảo**.

---

## I. NHỮNG VIỆC ĐÃ LÀM (COMPLETED WORK)

Chúng ta đã thiết lập hạ tầng dự án (boilerplate) đạt chuẩn **Enterprise & Senior Coder** với tính tự động hóa và bảo mật cao:

1. **Khởi tạo và thiết kế dự án Next.js:**
   - Dựng dự án Next.js 15+ (App Router) sử dụng TypeScript tại thư mục dự án [NguyenDinhBao_Round2_Submission-](file:///d:/se/NguyenDinhBao_Round2_Submission-).
   - Tích hợp **Tailwind CSS v4** mới nhất (dùng CSS variables biên dịch cực nhanh).
   - Thiết kế giao diện trang chủ chuyên nghiệp (Landing Page) với chế độ tối (Dark Mode), hiệu ứng mượt mà và các Lucide Icons tại [page.tsx](file:///d:/se/NguyenDinhBao_Round2_Submission-/app/page.tsx).
   - Tinh chỉnh Metadata tiêu đề và mô tả chuẩn dự án PlatPrint tại [layout.tsx](file:///d:/se/NguyenDinhBao_Round2_Submission-/app/layout.tsx).
2. **Cấu hình Standard Quality Controls & Guidelines (Quy chuẩn code & Rules):**
   - Cấu hình **Prettier** định dạng code tự động thống nhất tại file [.prettierrc](file:///d:/se/NguyenDinhBao_Round2_Submission-/.prettierrc).
   - Cập nhật **ESLint Flat Config** tại [eslint.config.mjs](file:///d:/se/NguyenDinhBao_Round2_Submission-/eslint.config.mjs) tích hợp `eslint-config-prettier` để triệt tiêu hoàn toàn xung đột giữa quy tắc linter và format.
   - Cấu hình **Commitlint** tại [commitlint.config.js](file:///d:/se/NguyenDinhBao_Round2_Submission-/commitlint.config.js) bắt buộc thông điệp commit phải tuân thủ chuẩn **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`...).
   - Biên soạn cẩm nang phát triển [CLAUDE.md](file:///d:/se/NguyenDinhBao_Round2_Submission-/CLAUDE.md) thiết lập các lệnh chạy dự án, quy tắc bảo mật chống IDOR (RLS), quy chuẩn viết code kiểu dữ liệu an toàn (Type-Safety) và quy định Conventional Commits.
   - Dựng hệ thống thiết kế (Design System) tại [app/globals.css](file:///d:/se/NguyenDinhBao_Round2_Submission-/app/globals.css) với các biến màu sắc thương hiệu, các tiện ích glassmorphism (`glass-panel`, `glass-input`) và các animation/keyframes in ấn mượt mà.
3. **Thiết lập Git Hooks tự động (Husky & Lint-staged):**
   - Kích hoạt Husky v9.
   - Tạo hook **pre-commit** chạy `npx lint-staged` (tự động chạy `eslint --fix` và `prettier --write` đối với duy nhất các file được staged, tối ưu tốc độ commit).
   - Tạo hook **commit-msg** chạy `commitlint` kiểm duyệt tin nhắn commit.
4. **Dựng kiến trúc kết nối Supabase Cloud & Core Helpers:**
   - Cài đặt SDK kết nối `@supabase/supabase-js` và thư viện xử lý phiên cookie `@supabase/ssr`.
   - Viết file [lib/utils.ts](file:///d:/se/NguyenDinhBao_Round2_Submission-/lib/utils.ts) cung cấp hàm `cn(...)` (sử dụng `clsx` và `tailwind-merge`) giúp ghép các class Tailwind CSS động mượt mà.
   - Viết file [lib/supabase/client.ts](file:///d:/se/NguyenDinhBao_Round2_Submission-/lib/supabase/client.ts) khởi tạo client-side Supabase.
   - Viết file [lib/supabase/server.ts](file:///d:/se/NguyenDinhBao_Round2_Submission-/lib/supabase/server.ts) khởi tạo server-side Supabase phục vụ Server Components và APIs.
   - Viết file [middleware.ts](file:///d:/se/NguyenDinhBao_Round2_Submission-/middleware.ts) tự động refresh session Supabase JWT, bảo đảm chính sách RLS DB hoạt động trơn tru. Đã xử lý cơ chế skip-safe khi chưa có file cấu hình `.env.local` giúp dự án không bị sập (crash) khi lập trình local dev.
5. **Thiết kế Database Schema, Config mẫu & Kiểu dữ liệu TypeScript:**
   - Tạo file [supabase_schema.sql](file:///d:/se/NguyenDinhBao_Round2_Submission-/supabase_schema.sql) định nghĩa 9 bảng dữ liệu, khóa ngoại, chỉ mục (Indexes) hiệu năng cao, chính sách Row Level Security (RLS) bảo mật và Stored Procedure Pessimistic Locking chống lỗi tồn kho.
   - Thiết lập kiểu dữ liệu TypeScript tự động đồng bộ từ Database tại [database.types.ts](file:///d:/se/NguyenDinhBao_Round2_Submission-/types/database.types.ts) giúp kiểm soát lỗi gõ sai tên cột ngay từ IDE.
   - Cấu hình kiểu generic `<Database>` cho cả 2 Supabase clients (client-side và server-side) đảm bảo **100% Type-Safety**.
   - Tạo file [.env.local.example](file:///d:/se/NguyenDinhBao_Round2_Submission-/.env.local.example) hướng dẫn cấu hình API Keys.
6. **Kiểm tra biên dịch và cài đặt SDK:**
   - Cài đặt Vercel AI SDK (`ai` & `@ai-sdk/google`) cho Gemini Chatbot, `lucide-react` cho icons giao diện.
   - Chạy lệnh kiểm tra biên dịch `npx tsc --noEmit` hoàn tất thành công với **0 lỗi**.
7. **Đồng bộ hóa Git:**
   - Đẩy toàn bộ cấu hình dự án gốc và các bản cập nhật lên Github Repo cá nhân.
8. **Cấu hình Hạ tầng Database & Storage trên Supabase Cloud (BƯỚC 1 - Hoàn thành):**
   - Khởi tạo dự án Supabase Cloud, chạy schema `supabase_schema.sql` để tạo toàn bộ 9 bảng dữ liệu, các chỉ mục (Indexes), các chính sách bảo mật RLS ngăn chặn IDOR và trigger tạo profiles tự động.
   - Bật Realtime lắng nghe thay đổi trên bảng `print_jobs`.
   - Tạo Storage Bucket `print-files` ở chế độ **Private** (owner-only RLS) để lưu trữ file in ấn.
   - Cấu hình file `.env.local` liên kết với Supabase.
9. **Tạo dữ liệu ban đầu cho Cửa hàng (BƯỚC 2 - Hoàn thành):**
   - Nạp thành công danh sách sản phẩm mẫu vào bảng `products` qua SQL Editor.
   - Cài đặt thành công thư viện `@supabase/supabase-js`, `@supabase/ssr`, `pdfjs-dist` phục vụ in ấn.
10. **Xây dựng hệ thống API Backend & Mock Gateways (BƯỚC 3 & BƯỚC 4 - Hoàn thành):**
    - Lập trình Mock Payment Sandbox (`/api/sandbox/payment/tokenize` & `/api/sandbox/payment/charge`) hỗ trợ tokenize thẻ tuân thủ PCI-DSS và giả lập lỗi thẻ hết hạn (4001), từ chối (4002), timeout hoãn 10s (4003).
    - Lập trình API Print Jobs (`/api/print-jobs`) và Simulator in ấn bất đồng bộ chạy nền bypass cookies context, tự động cập nhật tiến độ `pending` -> `rendering` -> `printing` -> `completed`.
    - Lập trình API Orders (`/api/orders`) gọi Postgres RPC `create_order_with_stock_check` thực hiện Pessimistic Locking chống race conditions. Đã viết Stored Procedure `rollback_failed_order` để khôi phục kho và điểm thưởng nguyên tử khi thanh toán lỗi.
    - Lập trình API Chat AI (`/api/chat`) tích hợp Vercel AI SDK và Gemini streaming (tự động phát hiện ngôn ngữ, có fallback `[FORWARD_TO_HUMAN]` và Mock AI fallback khi thiếu API Key).
11. **Xây dựng Giao diện Frontend UI Next.js (BƯỚC 5 - Hoàn thành):**
    - Lập trình trang Auth (`/auth`) đăng nhập/đăng ký bằng Supabase Auth, thiết kế glassmorphism hiện đại.
    - Lập trình trang in ấn từ xa (`/print`) tự động đếm trang PDF client-side bằng `pdfjs-dist` dynamic import, render Canvas preview lồng ghép hiệu ứng Spiral Rings/Staples và đồng bộ thanh tiến độ in realtime qua Supabase Realtime channel.
    - Lập trình trang cửa hàng (`/store`) hỗ trợ quản lý giỏ hàng, tùy biến hình thức giao nhận, tích hợp dùng điểm thưởng khấu trừ hóa đơn và cổng nạp Sandbox giả lập lỗi thẻ.
    - Lập trình trang hỗ trợ AI (`/chat`) tích hợp Vercel AI SDK `@ai-sdk/react` và `DefaultChatTransport` streaming tin nhắn thời gian thực, có cờ cảnh báo kết nối con người khi AI forward.
    - Lập trình trang bảng điều khiển (`/dashboard`) phân chia tab quản lý thông tin thành viên, xem lịch sử điểm thưởng, lịch sử in ấn và lịch sử mua hàng gian hàng.
12. **Kiểm thử tải & Hoàn thiện README.md (BƯỚC 6 - Hoàn thành):**
    - Chạy bắn tải kiểm thử bằng `autocannon` với 100 kết nối đồng thời trong 5 giây vào API `/api/products` liên kết trực tiếp Supabase Cloud, đạt 113.2 req/s với 0% lỗi.
    - Soạn thảo và hoàn thiện toàn bộ tài liệu bàn giao `README.md` kỹ thuật theo đúng biểu mẫu, khai báo chi tiết phần đóng góp lập trình của AI.
13. **Tái cấu trúc mã nguồn Frontend thành các Component con theo tính năng (Feature-based Components - Hoàn thành):**
    - Chia nhỏ các trang màn hình lớn thành các file component cục bộ tương ứng đặt trong thư mục `components/` của từng folder chức năng (thay vì dồn tất cả code trong file `page.tsx`), giúp tối ưu khả năng bảo trì, đọc hiểu và mở rộng mã nguồn theo mô hình chuẩn Enterprise.
    - **Store (`app/store/`):** Tách ra [ProductCard.tsx](file:///d:/se/NguyenDinhBao_Round2_Submission-/app/store/components/ProductCard.tsx) hiển thị thẻ sản phẩm, tồn kho và [CartDrawer.tsx](file:///d:/se/NguyenDinhBao_Round2_Submission-/app/store/components/CartDrawer.tsx) quản lý giỏ hàng, thông tin giao nhận và mock sandbox payment.
    - **Print (`app/print/`):** Tách ra [PrintPreview.tsx](file:///d:/se/NguyenDinhBao_Round2_Submission-/app/print/components/PrintPreview.tsx) render canvas và hiệu ứng binding, [PrintConfigForm.tsx](file:///d:/se/NguyenDinhBao_Round2_Submission-/app/print/components/PrintConfigForm.tsx) quản lý cấu hình và ước tính chi phí, và [PrintProgressView.tsx](file:///d:/se/NguyenDinhBao_Round2_Submission-/app/print/components/PrintProgressView.tsx) theo dõi tiến độ in realtime.
    - **Dashboard (`app/dashboard/`):** Tách ra [DashboardOverview.tsx](file:///d:/se/NguyenDinhBao_Round2_Submission-/app/dashboard/components/DashboardOverview.tsx) phân tích điểm thưởng, [DashboardPrintJobs.tsx](file:///d:/se/NguyenDinhBao_Round2_Submission-/app/dashboard/components/DashboardPrintJobs.tsx) lịch sử in ấn từ xa, và [DashboardOrders.tsx](file:///d:/se/NguyenDinhBao_Round2_Submission-/app/dashboard/components/DashboardOrders.tsx) lịch sử đơn mua hàng.
    - **Auth (`app/auth/`):** Tách ra [AuthCard.tsx](file:///d:/se/NguyenDinhBao_Round2_Submission-/app/auth/components/AuthCard.tsx) quản lý thẻ form đăng ký/đăng nhập.
    - **Chat (`app/chat/`):** Tách ra [ChatBox.tsx](file:///d:/se/NguyenDinhBao_Round2_Submission-/app/chat/components/ChatBox.tsx) hiển thị bong bóng chat realtime, gợi ý câu hỏi và cờ thông báo hỗ trợ viên.
    - Tiến hành làm sạch các import thừa thãi, tối ưu hóa các hiệu ứng hover, cursor, active state tương tác mượt mà và chạy build biên dịch thành công 100% không phát sinh cảnh báo lint hay lỗi TypeScript.

---

## II. NHỮNG VIỆC CẦN LÀM TIẾP THEO (DETAILED ROADMAP)

Dưới đây là hướng dẫn chi tiết từng bước lập trình cụ thể cho các tính năng giao diện và kiểm thử còn lại của PlatPrint:

### BƯỚC 1: CẤU HÌNH DATABASE & STORAGE TRÊN SUPABASE CLOUD (Hạ tầng) [HOÀN THÀNH]

1. Đăng ký/đăng nhập vào **Supabase Cloud**, tạo dự án mới đặt tên là `platprint`.
2. Mở mục **SQL Editor** trong Dashboard Supabase, copy nội dung file [supabase_schema.sql](file:///d:/se/NguyenDinhBao_Round2_Submission-/supabase_schema.sql) paste vào và chạy lệnh **Run**.
3. Chạy lệnh kích hoạt tính năng **Realtime** cho bảng `print_jobs`:
   ```sql
   alter publication supabase_realtime add table public.print_jobs;
   ```
4. **Cấu hình Supabase Storage:**
   - Vào mục **Storage** -> Click **New Bucket** -> Tạo một bucket đặt tên là `print-files`.
   - Giữ bucket ở trạng thái **Private** — file in chứa dữ liệu cá nhân, chỉ chủ sở hữu (hoặc service role phía server) được truy cập; preview client dùng blob URL cục bộ, không cần public link.
   - Tạo chính sách RLS cho bucket `print-files` (đã có sẵn trong `supabase_schema.sql`):
     - _Chính sách INSERT:_ authenticated user chỉ được upload vào folder mang chính `auth.uid()` của mình.
     - _Chính sách SELECT:_ chỉ owner của file (folder trùng `auth.uid()`) mới đọc được.
5. Sao chép API Keys vào file `.env.local` ở máy cá nhân (lấy từ _Project Settings -> API_).

---

### BƯỚC 2: TẠO DỮ LIỆU BAN ĐẦU (SEED DATA FOR STORE) [HOÀN THÀNH]

Để gian hàng ấn phẩm có sản phẩm hiển thị ngay khi khởi chạy, chúng ta cần nạp dữ liệu mẫu vào bảng `products`.

1. Chạy đoạn SQL sau trong Supabase SQL Editor:
   ```sql
   insert into public.products (name, description, price, stock, image_url) values
   ('Tập sách hướng dẫn thủ tục hành chính', 'Tài liệu hướng dẫn chi tiết các bước làm thủ tục cư trú, đăng ký kinh doanh.', 15.00, 100, '/images/booklet.png'),
   ('Biểu mẫu tờ khai tổng hợp', 'Tờ khai sử dụng cho các thủ tục khai báo thuế và tờ khai thông tin cá nhân.', 2.50, 500, '/images/form.png'),
   ('Báo cáo nghiên cứu công nghệ Plat Labs 2026', 'Tài liệu in màu chất lượng cao về xu hướng công nghệ in từ xa và ứng dụng AI.', 45.00, 50, '/images/report.png'),
   ('Tạp chí khoa học xã hội số 10', 'Ấn phẩm in định kỳ hàng tháng của Hiệp hội khoa học xã hội.', 20.00, 80, '/images/magazine.png');
   ```

---

### BƯỚC 3: XÂY DỰNG CÁC API ROUTES CHO BACKEND (`app/api/`) [HOÀN THÀNH]

#### 1. API Mock Payment Sandbox (`app/api/sandbox/payment/route.ts`)

- **Endpoint Tokenize (`/api/sandbox/payment/tokenize/route.ts`)**:
  - Nhận thông tin thẻ (số thẻ, ngày hết hạn, CVV) từ Client Component.
  - Chỉ trả về một token ngẫu nhiên dạng `tok_[random_string]` và 4 số cuối của thẻ (`last4`). Không lưu số thẻ thô vào database của ta để bảo mật PCI-DSS.
- **Endpoint Charge (`/api/sandbox/payment/charge/route.ts`)**:
  - Nhận `card_token` và số tiền.
  - Đọc 4 số cuối của thẻ để trả về phản hồi mô phỏng:
    - Nếu thẻ đuôi `4001`: Trả về HTTP 400 kèm message: `"Thẻ của bạn đã hết hạn (Card Expired)"`.
    - Nếu thẻ đuôi `4002`: Trả về HTTP 400 kèm message: `"Giao dịch bị từ chối (Transaction Declined)"`.
    - Nếu thẻ đuôi `4003`: Sử dụng hàm `setTimeout` giả lập để hoãn phản hồi (sleep) **10 giây**, sau đó trả về HTTP 504: `"Giao dịch hết thời gian chờ (Timeout)"`.
    - Trường hợp khác: Trả về HTTP 200: `"Thanh toán thành công"`.

#### 2. API Print Jobs & Simulator Hàng đợi in (`app/api/print-jobs/route.ts`)

- **Endpoint POST `/api/print-jobs`**:
  - Nhận các tham số: `file_name`, `file_url`, `config_color`, `config_copies`, `config_paper_size`, `config_binding`, `total_pages`, `printer_location`.
  - Tính toán giá tiền: `cost = total_pages * config_copies * price_per_page` (ví dụ in đen trắng $0.1/trang, in màu $0.5/trang, gáy xoắn cộng thêm $2).
  - Gọi Supabase Server client ghi nhận dòng mới vào bảng `print_jobs` với trạng thái `pending`.
  - **Kích hoạt Simulator chạy nền (Background Simulator):**
    Sau khi trả về kết quả thành công cho Client (HTTP 201), Server sẽ kích hoạt một hàm chạy ngầm (asynchronous loop):
    - Sau 2s: Thực hiện cập nhật dòng `print_jobs` có `id` tương ứng trong Postgres thành `rendering`.
    - Sau 4s: Cập nhật thành `printing`.
    - Sau mỗi 0.5s/trang in: Mô phỏng máy in đang chạy, cập nhật tiến độ (ví dụ in xong trang 1/10, 2/10...).
    - Khi in xong trang cuối: Cập nhật trạng thái thành `completed`.
  - _Chú ý:_ Nhờ có Supabase Realtime đã bật ở Bước 1, mỗi lần Server cập nhật trạng thái trong database, Frontend sẽ nhận được tín hiệu và tự động cập nhật thanh tiến trình (progress bar) mà không cần gọi API liên tục.

#### 3. API Đặt hàng Gian hàng (`app/api/orders/route.ts`)

- **Endpoint POST `/api/orders`**:
  - Nhận `items` (mảng sản phẩm, số lượng), `delivery_type`, `idempotency_key`, `use_points` (boolean).
  - Kiểm tra `idempotency_key` xem đơn hàng này đã được gửi trước đó chưa để tránh double-charge.
  - Gọi hàm PostgreSQL **`create_order_with_stock_check`** (đã viết trong file schema SQL) thông qua Supabase RPC:
    ```typescript
    const { data: orderId, error } = await supabase.rpc('create_order_with_stock_check', {
      p_user_id: userId,
      p_total_amount: totalAmount,
      p_discount_amount: discountAmount,
      p_points_used: pointsUsed,
      p_points_earned: pointsEarned,
      p_delivery_type: deliveryType,
      p_idempotency_key: idempotencyKey,
      p_items: items,
    });
    ```
  - Cách gọi này đảm bảo DB sẽ tự khóa dòng (Pessimistic Locking) và rollback nếu bất kỳ mặt hàng nào bị hết hàng (stock < quantity).

---

### BƯỚC 4: TÍCH HỢP GEMINI AI CHATBOT CÓ FALLBACK (`app/api/chat/route.ts`) [HOÀN THÀNH]

- **Endpoint POST `/api/chat`**:
  - Sử dụng thư viện Vercel AI SDK và Gemini adapter.
  - Cấu hình **System Prompt** chi tiết:
    ```text
    Bạn là trợ lý ảo hỗ trợ khách hàng của dịch vụ in ấn từ xa PlatPrint.
    Hãy trả lời lịch sự, chuyên nghiệp.
    Tự động nhận diện ngôn ngữ của khách hàng để trả lời bằng ngôn ngữ tương ứng (Tiếng Việt, Tiếng Anh...).
    Phạm vi trả lời: Chỉ trả lời các thông tin liên quan đến dịch vụ in ấn, đặt đơn hàng, hỗ trợ thanh toán lỗi hoặc tích lũy điểm thưởng.
    QUY TẮC ĐẶC BIỆT: Nếu khách hàng yêu cầu gặp người thật hỗ trợ, hoặc hỏi về các vấn đề ngoài phạm vi chuyên môn in ấn mà bạn không thể tự giải quyết, bạn BẮT BUỘC phải phản hồi chính xác chuỗi ký tự sau ở đầu câu trả lời: [FORWARD_TO_HUMAN].
    ```
  - Khi nhận tin nhắn mới của người dùng, lưu tin nhắn đó vào bảng `chat_messages` (người gửi: `user`).
  - Gọi Gemini API ở dạng **Streaming** (`streamText`) để đẩy phản hồi trực tiếp về client.
  - Lưu câu trả lời của AI vào bảng `chat_messages` (người gửi: `ai`).
  - **Xử lý Fallback:** Nếu câu trả lời chứa từ khóa `[FORWARD_TO_HUMAN]`, Backend sẽ thực hiện câu lệnh cập nhật bảng `chat_sessions` chuyển trạng thái sang `waiting_support` (để hỗ trợ viên có thể vào tiếp quản phòng chat).

---

### BƯỚC 5: XÂY DỰNG GIAO DIỆN FRONTEND NEXT.JS (Sử dụng TailwindCSS v4) [HOÀN THÀNH]

#### 1. Trang Đăng nhập & Đăng ký (`app/auth/page.tsx`)

- Thiết kế form UI hiện đại hỗ trợ đăng ký, đăng nhập bằng email/mật khẩu sử dụng API `supabase.auth.signInWithPassword` và `supabase.auth.signUp`.

#### 2. Trang Luồng In ấn Từ xa (`app/print/page.tsx`)

- **Nút Tải lên tài liệu**: Hỗ trợ chọn file PDF/Hình ảnh.
  - Sau khi chọn file, dùng thư viện `pdfjs-dist` (chạy client-side) quét qua file để tự động đếm và hiển thị số trang.
- **Cấu hình in**: Các nút chọn Màu/Đen trắng, khổ giấy (A3/A4/A5), đóng gáy (Stapled, Spiral, None).
- **Khung Preview động**:
  - Dùng CSS và Canvas vẽ trang tài liệu preview.
  - Nếu chọn Đen trắng: Thêm class Tailwind `grayscale` vào canvas chứa ảnh preview.
  - Nếu chọn Đóng gáy: Dùng CSS absolute vẽ đè hình ảnh lò xo (Spiral) hoặc dập ghim (Stapled) lên lề trái của canvas.
- **Xác nhận & Theo dõi Tiến độ**:
  - Khi bấm "Bắt đầu in", gọi API thanh toán và tạo `PrintJob`.
  - Sau khi thành công, chuyển sang màn hình theo dõi. Sử dụng Supabase Realtime lắng nghe cập nhật trạng thái `print_jobs` để hiển thị thanh tiến độ sinh động: **Đang kết nối -> Đang render tài liệu -> Đang xuất trang in (Trang X/Y) -> Hoàn thành!**.

#### 3. Trang Gian hàng Ấn phẩm (`app/store/page.tsx`)

- Giao diện hiển thị danh mục sản phẩm in sẵn (Booklet, báo chí, biểu mẫu hành chính...).
- Quản lý giỏ hàng cục bộ (Local Cart State).
- Trang Checkout: Cho phép nhập thông tin thẻ thanh toán, chọn địa chỉ giao hàng hoặc cửa hàng nhận.
- Checkbox **"Sử dụng điểm thưởng"**: Hiển thị số điểm hiện có của người dùng, nếu tick chọn thì tự động giảm giá hóa đơn tương ứng (1 điểm = $0.1 hoặc 10 điểm = $1) và gọi API thanh toán.

#### 4. Trang Lịch sử Điểm thưởng & Chat hỗ trợ (`app/dashboard/page.tsx` & `app/chat/page.tsx`)

- **Lịch sử điểm**: Lấy dữ liệu từ bảng `reward_points_history` vẽ biểu đồ/bảng danh sách cộng trừ điểm.
- **Bong bóng chat**: Khung chat mượt mà thời gian thực, hiển thị trạng thái hỗ trợ (AI đang trả lời, hoặc Đang kết nối với nhân viên hỗ trợ khi có cờ fallback).

---

### BƯỚC 6: KIỂM THỬ TẢI & HOÀN THIỆN README.MD (Bàn giao) [HOÀN THÀNH]

1. **Kiểm thử hiệu năng:** Cài đặt thư viện `autocannon` cục bộ. Bật server Next.js chạy production (`npm run build && npm run start`), chạy lệnh bắn tải 100-500 requests/giây vào endpoint API danh mục sản phẩm xem thời gian phản hồi có dưới 50ms nhờ cơ chế tối ưu hóa hay không.
2. **Hoàn thiện tài liệu README.md**: Viết tài liệu bàn giao theo đúng cấu trúc của file **`PTHS-04` Phần B** đã đề cập. Khai báo trung thực phần code có sự hỗ trợ của AI.
