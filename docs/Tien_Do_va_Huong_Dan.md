# TIẾN ĐỘ DỰ ÁN VÀ HƯỚNG DẪN LẬP TRÌNH CHI TIẾT (PLATPRINT)

Tài liệu này tổng hợp chi tiết toàn bộ các thiết lập đã hoàn thành (những việc đã làm) và cung cấp lộ trình hướng dẫn lập trình chi tiết nhất (những việc cần làm tiếp theo) cho dự án **PlatPrint** của ứng viên **Nguyễn Đình Bảo**.

---

## I. NHỮNG VIỆC ĐÃ LÀM (COMPLETED WORK)

Chúng ta đã thiết lập hạ tầng dự án (boilerplate) đạt chuẩn **Enterprise & Senior Coder** với tính tự động hóa và bảo mật cao:

1. **Khởi tạo mã nguồn dự án Next.js:**
   - Dựng dự án Next.js 15+ (App Router) sử dụng TypeScript tại thư mục dự án [NguyenDinhBao_Round2_Submission-](file:///d:/se/NguyenDinhBao_Round2_Submission-).
   - Tích hợp **Tailwind CSS v4** mới nhất (dùng CSS variables biên dịch cực nhanh).
2. **Cấu hình Standard Quality Controls (Đảm bảo chất lượng code):**
   - Cấu hình **Prettier** định dạng code tự động thống nhất tại file [.prettierrc](file:///d:/se/NguyenDinhBao_Round2_Submission-/.prettierrc).
   - Cập nhật **ESLint Flat Config** tại [eslint.config.mjs](file:///d:/se/NguyenDinhBao_Round2_Submission-/eslint.config.mjs) tích hợp `eslint-config-prettier` để triệt tiêu hoàn toàn xung đột giữa quy tắc linter và format.
   - Cấu hình **Commitlint** tại [commitlint.config.js](file:///d:/se/NguyenDinhBao_Round2_Submission-/commitlint.config.js) bắt buộc thông điệp commit phải tuân thủ chuẩn **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`...).
3. **Thiết lập Git Hooks tự động (Husky & Lint-staged):**
   - Kích hoạt Husky v9.
   - Tạo hook **pre-commit** chạy `npx lint-staged` (tự động chạy `eslint --fix` và `prettier --write` đối với duy nhất các file được staged, tối ưu tốc độ commit).
   - Tạo hook **commit-msg** chạy `commitlint` kiểm duyệt tin nhắn commit.
4. **Dựng kiến trúc kết nối Supabase Cloud & Core Helpers:**
   - Cài đặt SDK kết nối `@supabase/supabase-js` và thư viện xử lý phiên cookie `@supabase/ssr`.
   - Viết file [lib/utils.ts](file:///d:/se/NguyenDinhBao_Round2_Submission-/lib/utils.ts) cung cấp hàm `cn(...)` giúp ghép các class Tailwind CSS động mượt mà.
   - Viết file [lib/supabase/client.ts](file:///d:/se/NguyenDinhBao_Round2_Submission-/lib/supabase/client.ts) khởi tạo client-side Supabase.
   - Viết file [lib/supabase/server.ts](file:///d:/se/NguyenDinhBao_Round2_Submission-/lib/supabase/server.ts) khởi tạo server-side Supabase phục vụ Server Components và APIs.
   - Viết file [middleware.ts](file:///d:/se/NguyenDinhBao_Round2_Submission-/middleware.ts) tự động refresh session Supabase JWT, bảo đảm chính sách RLS DB hoạt động trơn tru.
5. **Thiết kế Database Schema & Config mẫu:**
   - Tạo file [supabase_schema.sql](file:///d:/se/NguyenDinhBao_Round2_Submission-/supabase_schema.sql) định nghĩa 9 bảng dữ liệu, khóa ngoại, chỉ mục (Indexes) hiệu năng cao, chính sách Row Level Security (RLS) bảo mật và Stored Procedure Pessimistic Locking chống lỗi tồn kho.
   - Tạo file [.env.local.example](file:///d:/se/NguyenDinhBao_Round2_Submission-/.env.local.example) hướng dẫn cấu hình API Keys.
6. **Đồng bộ hóa Git:**
   - Đẩy toàn bộ cấu hình dự án gốc lên Github Repo cá nhân.

---

## II. NHỮNG VIỆC CẦN LÀM TIẾP THEO (DETAILED ROADMAP)

Dưới đây là hướng dẫn chi tiết từng bước lập trình cụ thể cho các tính năng nghiệp vụ cốt lõi của PlatPrint:

### BƯỚC 1: CẤU HÌNH DATABASE & STORAGE TRÊN SUPABASE CLOUD (Hạ tầng)

1. Đăng ký/đăng nhập vào **Supabase Cloud**, tạo dự án mới đặt tên là `platprint`.
2. Mở mục **SQL Editor** trong Dashboard Supabase, copy nội dung file [supabase_schema.sql](file:///d:/se/NguyenDinhBao_Round2_Submission-/supabase_schema.sql) paste vào và chạy lệnh **Run**.
3. Chạy lệnh kích hoạt tính năng **Realtime** cho bảng `print_jobs`:
   ```sql
   alter publication supabase_realtime add table public.print_jobs;
   ```
4. **Cấu hình Supabase Storage:**
   - Vào mục **Storage** -> Click **New Bucket** -> Tạo một bucket đặt tên là `print-files`.
   - Chuyển trạng thái bucket thành **Public** (để có thể lấy link URL xem trước hoặc tải file in dễ dàng).
   - Tạo chính sách RLS cho bucket `print-files` để người dùng có thể tự upload file của mình:
     - _Chính sách SELECT:_ Allow access nếu là authenticated user.
     - _Chính sách INSERT:_ Allow access nếu `auth.uid() = owner_id` hoặc cho phép mọi user đã đăng nhập.
5. Sao chép API Keys vào file `.env.local` ở máy cá nhân (lấy từ _Project Settings -> API_).

---

### BƯỚC 2: TẠO DỮ LIỆU BAN ĐẦU (SEED DATA FOR STORE)

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

### BƯỚC 3: XÂY DỰNG CÁC API ROUTES CHO BACKEND (`app/api/`)

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

### BƯỚC 4: TÍCH HỢP GEMINI AI CHATBOT CÓ FALLBACK (`app/api/chat/route.ts`)

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

### BƯỚC 5: XÂY DỰNG GIAO DIỆN FRONTEND NEXT.JS (Sử dụng TailwindCSS v4)

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

### BƯỚC 6: KIỂM THỬ TẢI & HOÀN THIỆN README.MD (Bàn giao)

1. **Kiểm thử hiệu năng:** Cài đặt thư viện `autocannon` cục bộ. Bật server Next.js chạy production (`npm run build && npm run start`), chạy lệnh bắn tải 100-500 requests/giây vào endpoint API danh mục sản phẩm xem thời gian phản hồi có dưới 50ms nhờ cơ chế tối ưu hóa hay không.
2. **Hoàn thiện tài liệu README.md**: Viết tài liệu bàn giao theo đúng cấu trúc của file **`PTHS-04` Phần B** đã đề cập. Khai báo trung thực phần code có sự hỗ trợ của AI.
