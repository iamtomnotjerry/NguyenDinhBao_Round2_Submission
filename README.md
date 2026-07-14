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
| **Đếm trang PDF ở Client-side** bằng `pdfjs-dist`                         | Upload file lên server rồi phân tích và đếm trang phía backend                            | Tiết kiệm băng thông và tài nguyên CPU của Server. Tệp chỉ được upload khi người dùng xác nhận in, giúp tối ưu chi phí hạ tầng Cloud.                                                                         |
| **Cấu trúc Component theo tính năng (Feature-based Components)**          | Dồn tất cả mã nguồn trong file `page.tsx` hoặc đặt chung vào thư mục global `/components` | Giúp mã nguồn tách biệt, dễ bảo trì và dễ scale. Các components con chỉ phục vụ cho một tính năng (ví dụ `CartDrawer` của Store) sẽ nằm trong thư mục `/components/` cục bộ của route đó.                     |

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

- **Dịch vụ AI:** Sử dụng **Gemini 2.5 Flash** thông qua **Vercel AI SDK v4** để tạo trải nghiệm truyền phát phản hồi (streamText) tức thì.
- **Hệ thống System Prompt:** Định hình AI là Trợ lý hỗ trợ kỹ thuật PlatPrint, tự động nhận diện ngôn ngữ người dùng, chỉ trả lời trong phạm vi in ấn, thanh toán, điểm thưởng.
- **Cơ chế Fallback & Chuyển tiếp (Human Handoff):** Khi người dùng yêu cầu gặp nhân viên hoặc AI gặp câu hỏi ngoài tầm xử lý, AI sẽ tự động chèn từ khoá ẩn `[FORWARD_TO_HUMAN]`. Backend phát hiện từ khoá này sẽ cập nhật trạng thái session chat sang `waiting_support` trong database và hiển thị giao diện cảnh báo chờ nhân viên trên frontend.
- **Tối ưu thời gian chờ đợi (Perceived Latency):** Phản hồi được truyền phát dưới dạng luồng dữ liệu (streaming) thời gian thực ngay khi các từ đầu tiên được tạo ra, giúp giảm thiểu tối đa cảm giác chờ đợi phản hồi của người dùng.

---

## 5. Đánh đổi Đã Cân nhắc (Trade-offs Considered)

- **Nhất quán vs. Tốc độ ghi (Pessimistic Locking vs. High Throughput):** Việc sử dụng khoá bi quan (`FOR UPDATE`) trên dòng sản phẩm làm tăng thời gian chờ của các giao dịch mua hàng cùng một sản phẩm khi tải cực lớn. Tuy nhiên, đối với nghiệp vụ thương mại điện tử, việc bán vượt quá tồn kho (Over-selling) gây hậu quả nghiêm trọng hơn rất nhiều so với độ trễ giao dịch nhỏ, vì vậy tính nhất quán được ưu tiên tuyệt đối.
- **Bảo mật RLS vs. Tốc độ Simulator:** Simulator chạy nền cập nhật trạng thái in bằng cách truyền Access Token JWT của chính người dùng đã đăng nhập thay vì dùng Service Role Key bypass. Điều này đảm bảo chính sách Row Level Security (RLS) của cơ sở dữ liệu được tôn trọng tuyệt đối ở mọi tầng, mặc dù tốn thêm tài nguyên giải mã JWT ở phía Supabase.

---

## 6. Chiến lược Kiểm thử (Testing Approach)

Dự án áp dụng quy trình kiểm thử hai lớp chặt chẽ:

### 1. Kiểm thử tải (Load Testing)

Endpoint API `/api/products` được chạy kiểm thử tải nặng bằng công cụ `autocannon` giả lập **100 kết nối đồng thời trong 5 giây** liên tục truy vấn trực tiếp vào Supabase Cloud:

```bash
npx autocannon http://localhost:3000/api/products -c 100 -d 5
```

**Kết quả thực tế:**

- **Tốc độ xử lý:** 113.2 req/s.
- **Tổng số Request xử lý thành công:** 666 requests.
- **Tỉ lệ lỗi (Error Rate):** **0%** (Tất cả yêu cầu đều trả về HTTP 200).
- **Độ trễ trung bình:** 842ms.

### 2. Kiểm thử kịch bản cổng thanh toán (Payment Exception Mocking)

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
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Bước 3: Khởi tạo database trên Supabase Cloud

1. Truy cập Supabase Dashboard ➔ SQL Editor.
2. Dán nội dung file [supabase_schema.sql](./supabase_schema.sql) và nhấn **Run**.
3. Bật Realtime cho bảng in bằng cách chạy:
   ```sql
   alter publication supabase_realtime add table public.print_jobs;
   ```
4. Tại mục **Storage**, tạo một bucket tên là `print-files` ở chế độ **Public**.

### Bước 4: Chạy dự án

```bash
npm run dev
```

Truy cập [http://localhost:3000](http://localhost:3000) để trải nghiệm ứng dụng.

---

## 8. Công cụ AI Hỗ trợ (AI Tool Usage Disclosure)

Dự án được tối ưu hóa cấu trúc và giải quyết các lỗi phức tạp với sự hỗ trợ của trợ lý lập trình **Antigravity AI (Google DeepMind)**:

- **Thiết kế hạ tầng & RLS:** Tự động tạo hệ thống policies an toàn chống tấn công IDOR trên Supabase.
- **Tái cấu trúc (Refactoring):** Thực hiện phân rã hoàn toàn mã nguồn lớn của 5 trang chính thành cấu trúc **Feature-based components** cục bộ giúp clean code 100%.
- **Sửa lỗi TypeScript:** Định nghĩa wrapper `SafeDatabase` giải quyết lỗi không tương thích kiểu của quan hệ (relationships) trong Supabase SDK.

---

## 9. Giới hạn & Hướng Phát triển Tiếp theo (Known Limitations & Future Improvements)

- **Giới hạn hiện tại:** Cổng thanh toán Sandbox mới chỉ ở mức giả lập mô phỏng theo số đuôi thẻ, chưa kết nối Webhook ngân hàng thực tế. Bản xem trước in ấn (Preview) mới chỉ vẽ được trang đầu tiên của file PDF.
- **Hướng phát triển:** Tích hợp cổng thanh toán PayOS/Momo chính thức qua Webhook bảo mật, nâng cấp Canvas cho phép lật trang xem trước toàn bộ file PDF và tối ưu kích thước bundle để tải trang nhanh hơn nữa.

---

_Dự án hoàn thành phục vụ Tuyển dụng Kỹ sư Phần mềm - Vòng 2._
