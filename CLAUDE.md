# Quy chuẩn phát triển PlatPrint (CLAUDE.md)

Tài liệu này định nghĩa toàn bộ quy chuẩn lập trình, lệnh thực thi, cấu trúc và quy tắc bảo mật của dự án **PlatPrint** nhằm bảo đảm tính dễ bảo trì (maintainability), dễ mở rộng (scalability) và chuẩn Senior Coder.

> [!NOTE]
> Chi tiết sơ đồ kiến trúc, mô hình dữ liệu và các luồng nghiệp vụ cụ thể xem tại **[ARCHITECTURE.md](file:///d:/se/NguyenDinhBao_Round2_Submission-/ARCHITECTURE.md)**.

---

## 1. HƯỚNG DẪN LỆNH THỰC THI (COMMAND REFERENCE)

### Lệnh Phát triển & Biên dịch:

- **Khởi chạy môi trường Dev:** `npm run dev` (Khởi chạy Next.js trên cổng 3000).
- **Biên dịch Production:** `npm run build` (Biên dịch Next.js sang build tĩnh/SSR tối ưu).
- **Chạy server Production:** `npm run start`
- **Kiểm tra cú pháp (Linting):** `npm run lint` (Chạy ESLint).
- **Kiểm tra kiểu dữ liệu (Type-check):** `npx tsc --noEmit` (Chạy kiểm tra TypeScript).

### Kiểm thử & Tối ưu hiệu năng:

- **Chạy Unit Test:** `npm test` (Chạy Jest khi đã cấu hình).
- **Chạy Performance Benchmark:** `npx autocannon -c 100 -d 10 http://localhost:3000/api/products` (Đo đạc hiệu năng chịu tải 100 requests đồng thời trong 10 giây).

---

## 2. QUY CHUẨN MÃ NGUỒN & CODE STYLE

### Lựa chọn Công nghệ chính:

- **Framework:** Next.js (App Router, React 19, TypeScript).
- **Styling:** Tailwind CSS v4 (Dùng native CSS variables, không cấu hình postcss/tailwind.config.js thủ công).
- **Database & BaaS:** Supabase Cloud (PostgreSQL).

### Quy tắc TypeScript & Khai báo Kiểu dữ liệu:

- **Bắt buộc sử dụng Type-Safety cho Database:** Mọi truy vấn Supabase phải truyền generic parameter `<Database>` định nghĩa tại [database.types.ts](file:///d:/se/NguyenDinhBao_Round2_Submission-/types/database.types.ts):
  - _Hợp lệ:_ `const supabase = createBrowserClient<Database>(...)`
  - _Không hợp lệ:_ `const supabase = createBrowserClient(...)`
- **Ghép class Tailwind CSS:** Không dùng phép cộng chuỗi hoặc template literal thủ công khi có class động. **Bắt buộc** import và sử dụng hàm `cn(...)` định nghĩa tại [lib/utils.ts](file:///d:/se/NguyenDinhBao_Round2_Submission-/lib/utils.ts):
  ```typescript
  import { cn } from '@/lib/utils';
  // Sử dụng:
  <div className={cn("glass-panel p-4", isActive && "border-brand-500")} />
  ```

### Quy tắc chọn Supabase Client:

- **Trong Client Components (`"use client"`):** Chỉ sử dụng client browser:
  ```typescript
  import { supabase } from '@/lib/supabase/client';
  ```
- **Trong Server Components, Server Actions & Route Handlers:** Bắt buộc dùng server client bất đồng bộ để quản lý cookies bảo mật:
  ```typescript
  import { createClient } from '@/lib/supabase/server';
  const supabase = await createClient();
  ```

---

## 3. NGUYÊN TẮC BẢO MẬT & ĐẢM BẢO HIỆU NĂNG

### Phòng chống IDOR (Insecure Direct Object Reference):

- Mọi bảng chứa thông tin cá nhân của người dùng (`orders`, `print_jobs`, `payment_tokens`, `reward_points_history`) **bắt buộc phải bật Row Level Security (RLS)**.
- Chỉ cho phép truy vấn dữ liệu nếu kiểm tra trùng khớp UID: `auth.uid() = user_id`.
- Tầng API Next.js không được tin cậy hoàn toàn Client. Mọi Route Handler cần xác thực JWT ở server thông qua `supabase.auth.getUser()` trước khi thực hiện thao tác.

### Phòng chống Race Conditions (Overselling):

- Đối với giao dịch trừ tồn kho sản phẩm, **không thực hiện** logic kiểm tra và cập nhật tuần tự ở Next.js API.
- **Bắt buộc** gọi Stored Procedure `create_order_with_stock_check` đã viết ở DB để khóa dòng sản phẩm phòng ngừa (Pessimistic Locking `FOR UPDATE`) và rollback giao dịch nguyên tử (atomic transaction) nếu hết hàng.

### Chống trùng lặp giao dịch (Double Charge):

- Mọi đơn in và đơn hàng phải được gửi kèm `idempotency_key` (sinh UUID từ client). Backend sẽ kiểm tra tính duy nhất của key này trước khi gọi cổng thanh toán.

---

## 4. QUY QUYẾT COMMIT GIT (CONVENTIONAL COMMITS)

Mọi commit phải tuân thủ chuẩn commit chung để dễ dàng theo dõi lịch sử phát triển:

- `feat:` Tính năng mới (ví dụ: `feat: add remote printing screen`).
- `fix:` Sửa lỗi (ví dụ: `fix: resolve token mismatch in middleware`).
- `docs:` Thay đổi tài liệu hướng dẫn (ví dụ: `docs: update setup steps`).
- `style:` Thay đổi định dạng code (khoảng trắng, dấu chấm phẩy - không ảnh hưởng logic).
- `refactor:` Tái cấu trúc code (không sửa lỗi cũng không thêm tính năng).
- `chore:` Cập nhật cấu hình build, thư viện phụ trợ (ví dụ: `chore: update dependencies`).
