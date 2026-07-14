# PlatPrint - Nền Tảng In Ấn Từ Xa & Cửa Hàng Ấn Phẩm

Hệ thống quản lý dịch vụ in ấn từ xa và mua bán ấn phẩm trực tuyến dành cho sinh viên và văn phòng, phát triển bằng **Next.js 15+ App Router**, **TypeScript**, **Tailwind CSS v4** và **Supabase Cloud**.

---

## 1. Tổng quan (Overview)

**PlatPrint** giải quyết nhu cầu in ấn tài liệu tức thời từ xa và cung cấp gian hàng mua bán tài liệu in sẵn trực tuyến. Hệ thống cho phép người dùng đăng tải tài liệu PDF/hình ảnh, tự động đếm trang và xem trước bản in (preview) lồng ghép hiệu ứng lò xo/staple trực quan, thanh toán an toàn thông qua token hóa thẻ tín dụng (PCI-DSS compliance), tích lũy và sử dụng điểm thưởng thành viên, đồng thời tương tác với trợ lý AI thông minh để giải đáp thắc mắc dịch vụ và hỗ trợ xử lý lỗi đơn hàng.

---

## 2. Kiến trúc & Quyết định Thiết kế Chính (Architecture & Key Design Decisions)

Dự án áp dụng mô hình thiết kế tối ưu hóa tính toàn vẹn dữ liệu, khả năng chịu tải cao và cấu trúc thư mục dạng **Feature-based directory** (thành phần thuộc tính năng nào nằm độc quyền trong thư mục tính năng đó).

> [!TIP]
> Xem chi tiết tài liệu hướng dẫn sơ đồ và luồng kiến trúc hệ thống tại **[ARCHITECTURE.md](file:///d:/se/NguyenDinhBao_Round2_Submission-/ARCHITECTURE.md)**.

Dưới đây là các quyết định thiết kế cốt lõi được cân nhắc và áp dụng:

| Quyết định thiết kế                                                       | Phương án thay thế đã cân nhắc                                                            | Lý do lựa chọn                                                                                                                                                                                                |
| :------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Kiểm soát đồng thời (Pessimistic Locking)** ở mức Database cho đơn hàng | Kiểm soát ở mức ứng dụng (Application-level caching) / Khoá lạc quan (Optimistic Locking) | Ngăn ngừa triệt để lỗi bán quá số lượng tồn kho (Over-selling) khi hàng trăm người dùng nhấn mua cùng một lúc. Sử dụng `FOR UPDATE` trong Transaction của PostgreSQL đảm bảo tính nhất quán (ACID) tuyệt đối. |
| **Xử lý in ấn bất đồng bộ nền (Background Simulator)**                    | Chạy blocking luồng chính (Thread Sleep) hoặc thiết lập Cron job định kỳ                  | Đảm bảo thời gian phản hồi API in ấn cực nhanh (dưới 201ms). Lệnh in được đưa vào Queue chạy nền qua Next.js `after()`, cập nhật trạng thái realtime qua Supabase mà không làm nghẽn Event Loop.              |
| **Đếm trang PDF hybrid** (preview client + verify server)                 | Chỉ tin `total_pages` từ client khi tạo lệnh in                                           | Preview dùng `pdfjs-dist` trên browser; `/api/print-jobs` **verify lại** bằng `resolvePrintPageCount` (download Storage + pdfjs server) — chặn forge số trang / giá.                                          |
| **Cấu trúc Component theo tính năng (Feature-based Components)**          | Dồn tất cả mã nguồn trong file `page.tsx` hoặc đặt chung vào thư mục global `/components` | Giúp mã nguồn tách biệt, dễ bảo trì và dễ scale. Các components con chỉ phục vụ cho một tính năng (ví dụ `CartDrawer` của Store) sẽ nằm trong thư mục `/components/` cục bộ của route đó.                     |
| **Bảo mật tệp tin in ấn (Private Storage)**                               | Lưu signed URL hết hạn vào DB hoặc Public Bucket + `getPublicUrl`                         | Ngăn chặn IDOR bằng Private Storage. DB chỉ lưu `file_path` (storage path); URL ký tên `createSignedUrl` (24h) được tạo on-demand khi cần đọc — tránh link hết hạn trong DB.                                  |
| **Xác thực tự động (Auth Callback handler)**                              | Yêu cầu người dùng tự quay lại trang đăng nhập và điền mật khẩu sau khi click email       | Đảm bảo luồng trải nghiệm liền mạch (Seamless UX). API route `/auth/callback` tự động thực hiện trao đổi mã code lấy phiên đăng nhập phía Server và chuyển tiếp mượt mà vào Dashboard.                        |
| **UX Micro-interactions (Đàn hồi tương tác)**                             | Sử dụng giao diện tĩnh mặc định, không có hiệu ứng phản hồi nhấn nút                      | Chuẩn hoá qua constant `btnInteractive` (`cursor-pointer` + `transition-all duration-300` + `active:scale-[0.98]`) áp dụng đồng bộ cho toàn bộ nút bấm và liên kết tương tác trong app.                       |
| **Theme sáng/tối + đa ngôn ngữ (EN/VI)**                                  | Chỉ dark mode cứng và chuỗi tiếng Việt trong JSX                                          | Preference lưu `localStorage`; toggle trên Header; i18n dictionary `vi`/`en` + CSS `data-theme` light remap.                                                                                                  |

---

## 3. Lược đồ Dữ liệu / Thiết kế API (Data Model / API Design)

Hệ thống giao tiếp qua các RESTful API endpoints chính:

- **POST `/api/orders`**: Đặt đơn hàng ấn phẩm. Thực hiện token hóa thẻ, gọi database RPC kiểm tra kho, trừ điểm thưởng, tạo đơn hàng và trả về kết quả.
- **POST `/api/print-jobs`**: Khởi tạo lệnh in từ xa. Tính toán chi phí dựa trên số trang/màu sắc/gia công và kích hoạt simulator chạy ngầm.
- **GET `/api/products`**: Truy vấn danh sách ấn phẩm kèm số lượng tồn kho và thông tin chi tiết từ bảng `products`.
- **POST `/api/chat`**: Endpoint truyền phát luồng (streaming) phản hồi chat từ Gemini AI, lưu trữ lịch sử hội thoại thời gian thực.
- **POST `/api/sandbox/payment/tokenize`**: Token hóa thẻ tín dụng giả lập (không lưu số thẻ thô để đạt chuẩn PCI-DSS).
- **POST `/api/sandbox/payment/charge`**: Thực hiện thanh toán giả lập với bộ lọc mã lỗi thẻ ảo (`4001` - hết hạn, `4002` - bị từ chối, `4003` - timeout trì hoãn 10 giây).

---

## 4. Kiến trúc Tính năng AI (AI Feature Architecture)

PlatPrint tích hợp trợ lý AI thông minh đóng vai trò hỗ trợ viên chăm sóc khách hàng trực tuyến:

- **Dịch vụ AI:** Sử dụng **Gemini 2.5 Flash** thông qua **Vercel AI SDK v4** và API `toUIMessageStreamResponse()` để truyền tải luồng phản hồi trực tiếp (realtime streaming) từ server đến giao diện người dùng. Model được nâng cấp từ 1.5 lên 2.5 Flash nhằm tương thích 100% với khóa API thế hệ mới và giảm thiểu tối đa độ trễ xử lý.
- **Hệ thống System Prompt:** Định hình AI là Trợ lý hỗ trợ kỹ thuật PlatPrint, tự động nhận diện ngôn ngữ người dùng, chỉ trả lời trong phạm vi in ấn, thanh toán, điểm thưởng.
- **Cơ chế Fallback & Chuyển tiếp (Human Handoff):** Khi người dùng yêu cầu gặp nhân viên hoặc AI gặp câu hỏi ngoài tầm xử lý, AI sẽ tự động chèn từ khoá ẩn `[FORWARD_TO_HUMAN]`. Backend phát hiện từ khoá này sẽ cập nhật trạng thái session chat sang `waiting_support` trong database và hiển thị giao diện cảnh báo chờ nhân viên trên frontend.
- **Tối ưu hiển thị (Rich UI Custom Markdown):** Xây dựng bộ giải mã markdown tự chế gọn nhẹ (Client-side regex parser) trong `ChatBox.tsx` để hiển thị chữ in đậm, phân chia danh sách có thụt lề cấp bậc (`ml-6`), và giàn đều hai cột (hanging indent) cho các đầu mục bullet. Tránh chữ thô mất định dạng và giảm sự chói mắt từ màu sắc xanh lá quá mức.
- **Tối ưu thời gian chờ đợi (Perceived Latency):** Phản hồi được truyền phát dưới dạng luồng dữ liệu (streaming) thời gian thực ngay khi các từ đầu tiên được tạo ra, giúp giảm thiểu tối đa cảm giác chờ đợi phản hồi của người dùng.

---

## 5. Đánh đổi Đã Cân nhắc (Trade-offs Considered)

- **Nhất quán vs. Tốc độ ghi (Pessimistic Locking vs. High Throughput):** Việc sử dụng khoá bi quan (`FOR UPDATE`) trên dòng sản phẩm làm tăng thời gian chờ của các giao dịch mua hàng cùng một sản phẩm khi tải cực lớn. Tuy nhiên, đối với nghiệp vụ thương mại điện tử, việc bán vượt quá tồn kho (Over-selling) gây hậu quả nghiêm trọng hơn rất nhiều so với độ trễ giao dịch nhỏ, vì vậy tính nhất quán được ưu tiên tuyệt đối.
- **Bảo mật RLS vs. Simulator:** Client JWT **không** UPDATE được `print_jobs`. Simulator và mark-paid/settle dùng **Service Role** có kiểm soát trong Route Handler + RPC body `role=service_role`. RLS vẫn bảo vệ mọi truy vấn từ browser.

---

## 6. Chiến lược Kiểm thử (Testing Approach)

Dự án áp dụng quy trình kiểm thử ba lớp chặt chẽ:

### 1. Kiểm thử tự động với Jest (Unit + Integration)

```bash
npm test               # toàn bộ
npm run test:unit      # 76 unit tests — pricing, page-selection, validate-card, sanitize, rate-limit, api errors, safeNextPath, page-count clamp
npm run test:integration  # 5 live security tests — RLS IDOR, money-RPC lockdown, idempotency per-user (v9)
```

- **Unit tests** chạy thuần Node (không cần mạng), cover toàn bộ logic tiền: báo giá in (`buildPrintQuote`), parse trang kiểu Windows, Luhn/expiry/brand thẻ, clamp số trang server-side, sliding-window rate limiter.
- **Integration tests** kết nối Supabase Cloud thật (tự skip nếu thiếu `SUPABASE_SERVICE_ROLE_KEY`): tạo 2 user tạm, xác minh user B không đọc được `print_jobs` của user A, RPC tiền bị chặn với JWT thường, replay idempotency trả cùng order + trừ kho đúng 1 lần, và user khác dùng trộm idempotency key sẽ nhận lỗi thay vì order của nạn nhân. Tự dọn dữ liệu sau khi chạy.

### 2. Kiểm thử tải (Load Testing)

Endpoint API `/api/products` được chạy kiểm thử tải nặng bằng công cụ `autocannon` giả lập **100 kết nối đồng thời trong 5 giây** liên tục truy vấn trực tiếp vào Supabase Cloud:

```bash
npx autocannon http://localhost:3000/api/products -c 100 -d 5
```

**Kết quả thực tế** (sau khi `/api/products` chuyển sang anon client không cookie + ISR cache `revalidate: 30`):

- **Tốc độ xử lý:** **804.6 req/s** trung bình (đỉnh 930 req/s) — gấp ~7 lần so với 113.2 req/s trước khi có cache.
- **Tổng số Request xử lý thành công:** ~4.000 requests trong 5 giây.
- **Tỉ lệ lỗi (Error Rate):** **0%** (Tất cả yêu cầu đều trả về HTTP 200).
- **Độ trễ:** trung bình 121ms, p50 82ms (trước đây: 842ms trung bình).

### 3. Kiểm thử kịch bản cổng thanh toán (Payment Exception Mocking)

Thực hiện nhập các thẻ ảo có đuôi đặc biệt để xác minh luồng rollback kho nguyên tử:

- Thẻ đuôi `4001`: Trả lỗi thẻ hết hạn ➔ Frontend hiện thông báo lỗi.
- Thẻ đuôi `4002`: Trả lỗi giao dịch bị từ chối ➔ Kho và điểm thưởng tự động hồi phục qua Procedure `rollback_failed_order`.
- Thẻ đuôi `4003`: Trì hoãn phản hồi 10 giây ➔ Frontend hiển thị trạng thái chờ thanh toán xử lý lâu.

---

## 7. Hướng dẫn Chạy Dự án (How to Run)

### Bước 1: Clone và cài đặt thư viện

```bash
npm install
```

### Bước 2: Thiết lập tệp môi trường (`.env.local`)

Tạo file `.env.local` ở thư mục gốc:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ctojzeltocscuifphiiq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=sb_secret_service_role_key_here
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> `SUPABASE_SERVICE_ROLE_KEY` **bắt buộc** cho production: (1) Store — `mark_order_as_paid` / `rollback_failed_order`; (2) Print — settle/rollback điểm, cập nhật `print_jobs` + Background Simulator. Thiếu key → API **fail-closed** (HTTP 500), không giả thành công.

### Bước 3: Khởi tạo / Cập nhật database trên Supabase Cloud

**Lần đầu (database trống):**

1. Truy cập Supabase Dashboard ➔ SQL Editor.
2. Dán nội dung file [supabase_schema.sql](./supabase_schema.sql) và nhấn **Run**.

**Đã có schema v3:** chạy lần lượt `v4` → `v4_1` → [`supabase_migration_v5.sql`](./supabase_migration_v5.sql) → [`supabase_migration_v6.sql`](./supabase_migration_v6.sql) → [`supabase_migration_v7.sql`](./supabase_migration_v7.sql) → [`supabase_migration_v8.sql`](./supabase_migration_v8.sql) → [`supabase_migration_v9.sql`](./supabase_migration_v9.sql)  
(v6: REVOKE money RPC + INSERT status; v7: DROP Storage SELECT orphan IDOR + settle idempotent + revoke `handle_new_user` RPC; v8: `delivery_address` / `recipient_name` cho orders; v9: idempotency scoped theo user + clamp điểm khi rollback + search_path `handle_new_user`).

**Đã có schema cũ (báo lỗi `relation "profiles" already exists`):**

1. **Không** chạy lại `supabase_schema.sql`.
2. Chạy [supabase_migration_v3.sql](./supabase_migration_v3.sql) → v4 → v4_1 → **v5** → **v6** → **v7** → **v8** → **v9**.
   - Đổi cột `file_url` → `file_path`
   - Gỡ quyền UPDATE client trên `print_jobs`
   - Cập nhật `rollback_failed_order` + Storage RLS (v7 đóng IDOR SELECT toàn bucket)

3. Bật Realtime (nếu migration chưa thêm được):
   ```sql
   alter publication supabase_realtime add table public.print_jobs;
   ```
4. Tại mục **Storage** trên Supabase, tạo một bucket tên là `print-files` ở chế độ **Riêng tư (Private)** nếu chưa có. Hệ thống lưu `file_path` trong DB và sinh `createSignedUrl` on-demand (24h) khi cần đọc tệp — chống IDOR.
5. Trong phần **Authentication ➔ URL Configuration**, thiết lập Site URL thành `https://platprint.vercel.app` (hoặc URL dev local) và thêm `/auth/callback` vào mục Redirect URLs.

### Bước 4: Chạy dự án

```bash
npm run dev
```

Truy cập [http://localhost:3000](http://localhost:3000) để trải nghiệm ứng dụng.

---

## 8. Cải tiến Kỹ thuật & Sửa lỗi Bảo mật (Technical & Security Improvements)

Dự án đã được rà soát và nâng cấp toàn diện:

- **Nâng cấp AI Model:** Chuyển đổi sang **Gemini 2.5 Flash** để tận dụng tốc độ xử lý vượt trội và khắc phục lỗi không tương thích API v1beta của model cũ.
- **Tích hợp Markdown Custom Parser:** Xây dựng bộ hiển thị markdown tự chế mượt mà, biến đổi văn bản thô từ Gemini thành giao diện layout có cấu trúc trực quan với tông màu emerald đặc trưng.
- **Cấu hình Auth Callback Handler:** Bổ sung Route API xác thực `/auth/callback` tự động chuyển tiếp và kích hoạt phiên đăng nhập khi người dùng xác nhận Email Sign-up.
- **Thắt chặt An toàn Storage:** Bucket `print-files` Private; DB lưu `file_path` thay vì signed URL; bỏ hoàn toàn `getPublicUrl`.
- **Khoá UPDATE print_jobs phía client:** Chỉ Background Simulator (Service Role) được cập nhật trạng thái lệnh in.
- **v6/v7 Security:** Money RPC chỉ `service_role`; INSERT `orders`/`print_jobs` siết status; Storage `print-files` owner-only SELECT (v7 DROP policy orphan IDOR); settle điểm print idempotent.
- **UX Micro-interactions:** Constant `btnInteractive` chuẩn hoá `cursor-pointer` + `transition-all duration-300` + `active:scale-*` trên mọi CTA.
- **Atomic Rollback Locking:** `rollback_failed_order` khoá sản phẩm `ORDER BY id ASC FOR UPDATE` trước khi hoàn tồn kho.

---

## 9. Công cụ AI Hỗ trợ (AI Tool Usage Disclosure)

Dự án được tối ưu hóa cấu trúc và giải quyết các lỗi phức tạp với sự hỗ trợ của trợ lý lập trình **Antigravity AI (Google DeepMind)**:

- **Thiết kế hạ tầng & RLS:** Tự động tạo hệ thống policies an toàn chống tấn công IDOR trên Supabase.
- **Tái cấu trúc (Refactoring):** Thực hiện phân rã hoàn toàn mã nguồn lớn của 5 trang chính thành cấu trúc **Feature-based components** cục bộ giúp clean code 100%.
- **Sửa lỗi TypeScript:** Định nghĩa wrapper `SafeDatabase` giải quyết lỗi không tương thích kiểu của quan hệ (relationships) trong Supabase SDK.

---

## 10. Giới hạn & Hướng Phát triển Tiếp theo (Known Limitations & Future Improvements)

### Giới hạn hiện tại

- **Simulator lệnh in (Background Print Simulator):** Luồng in ấn từ xa **không kết nối máy in vật lý**. Sau khi thanh toán thành công, trạng thái cập nhật **chỉ** qua Service Role (`SUPABASE_SERVICE_ROLE_KEY`) theo chuỗi:
  - `awaiting_payment` → `paid` → `queued` → `rendering` → `printing` → `finishing` → `quality_check` → `packing` → `shipping` / `ready_for_pickup` → `completed`
  - Frontend theo dõi tiến độ qua Supabase Realtime.
  - Client JWT **không** có policy UPDATE trên `print_jobs`. Store checkout cũng dùng cùng service role cho mark-paid / rollback.
- **Cổng thanh toán Sandbox:** Tokenize/charge chỉ giả lập theo số đuôi thẻ (`4001` hết hạn, `4002` từ chối, `4003` timeout), chưa kết nối Webhook ngân hàng hay cổng PayOS/Momo thật.

### Hướng phát triển tiếp theo

- Tích hợp mạng lưới máy in đối tác / API cửa hàng thật (thay simulator bằng queue + webhook trạng thái in thực tế).
- Tích hợp cổng thanh toán PayOS/Momo chính thức qua Webhook bảo mật.
- Tối ưu kích thước bundle để tải trang nhanh hơn nữa.

---

_Dự án hoàn thành phục vụ Tuyển dụng Kỹ sư Phần mềm - Vòng 2._
