# Hướng Dẫn Kiến Trúc Hệ Thống PlatPrint (ARCHITECTURE.md)

Tài liệu này cung cấp hướng dẫn chi tiết về cấu trúc hệ thống, quy chuẩn thiết kế, mô hình cơ sở dữ liệu và các luồng nghiệp vụ lõi của dự án **PlatPrint** (Hệ thống in ấn từ xa & gian hàng trực tuyến).

---

## 1. Sơ Đồ Tổng Quan Kiến Trúc (Architecture Overview)

PlatPrint được xây dựng theo mô hình **Serverless Hybrid Architecture** kết hợp giữa Next.js 15+ (App Router), Supabase Cloud và Gemini AI.

```mermaid
graph TD
    Client["Client Browser (React 19 / Client Components)"] -- HTTP APIs --> NextServer["Next.js Server (Route Handlers / Server Actions)"]
    Client -- Realtime Channel / Storage / Auth --> Supabase["Supabase Cloud (BaaS)"]
    NextServer -- RPCs / RLS Queries --> Supabase
    NextServer -- Stream (Vercel AI SDK) --> Gemini["Gemini AI (Google API)"]
    NextServer -- Background Task --> PrintSim["Print Queue Simulator (after API)"]
    PrintSim -- Connection-less Client --> Supabase
```

Hệ thống phân chia trách nhiệm rõ ràng:

- **Client (Trực quan & Tương tác)**: Đảm nhiệm render UI, đếm trang PDF client-side, quản lý Local Cart State và lắng nghe kênh Realtime DB.
- **Next.js Server (Tầng Trung gian & AI)**: Xử lý JWT Auth server-side, bảo mật PCI-DSS mock tokens, truyền luồng (streaming) hỗ trợ AI, và kích hoạt Simulator in chạy ngầm.
- **Supabase Cloud (Cơ sở dữ liệu & Lưu trữ)**: Lưu trữ dữ liệu quan hệ, đảm bảo an toàn truy cập thông qua RLS Policies, thực hiện các thao tác nguyên tử (atomic transactions) qua PostgreSQL Stored Procedures, và quản lý các tệp in ấn nhạy cảm.

---

## 2. Kiến Trúc Thư Mục Tính Năng (Feature-Based Architecture)

Dự án áp dụng triết lý thiết kế **Feature-based directory structure**. Các components con chỉ dùng riêng cho một tính năng cụ thể sẽ được cô lập hoàn toàn bên trong thư mục tính năng đó thay vì đặt ở thư mục dùng chung.

```text
NguyenDinhBao_Round2_Submission-/
├── app/                           # App Router
│   ├── auth/                      # Tính năng Xác thực (Auth)
│   │   ├── components/            # Cục bộ: AuthCard.tsx
│   │   └── page.tsx               # Trang Auth chính (< 350 dòng)
│   ├── chat/                      # Tính năng Trợ lý AI (Support Chat)
│   │   ├── components/            # Cục bộ: ChatBox.tsx
│   │   └── page.tsx               # Trang Chat chính (< 350 dòng)
│   ├── dashboard/                 # Bảng điều khiển (Dashboard)
│   │   ├── components/            # Cục bộ: DashboardOverview, DashboardPrintJobs, DashboardOrders
│   │   └── page.tsx               # Trang Dashboard chính (< 350 dòng)
│   ├── print/                     # Tính năng In ấn từ xa (Remote Print)
│   │   ├── components/            # Cục bộ: PrintPreview, PrintConfigForm, PrintProgressView
│   │   └── page.tsx               # Trang Print chính (< 350 dòng)
│   ├── store/                     # Gian hàng ấn phẩm (Store)
│   │   ├── components/            # Cục bộ: ProductCard, CartDrawer
│   │   └── page.tsx               # Trang Store chính (< 350 dòng)
│   ├── api/                       # RESTful Endpoints
│   │   ├── chat/route.ts          # API Gemini Streaming & DB log
│   │   ├── orders/route.ts        # API Đặt hàng & rollback
│   │   ├── print-jobs/route.ts    # API Tạo lệnh in & after() background task
│   │   ├── products/route.ts      # API Danh mục sản phẩm công khai
│   │   └── sandbox/payment/       # API Cổng Sandbox Tokenize & Charge
│   ├── globals.css                # Core Design System, OLED Black & Tailwind @theme
│   └── layout.tsx                 # Root layout & Metadata
├── components/                    # Global components dùng chung (Header.tsx)
├── lib/                           # Helpers & Supabase Clients
│   ├── supabase/
│   │   ├── client.ts              # Browser Client (createBrowserClient)
│   │   └── server.ts              # Server Client (createServerClient)
│   └── utils.ts                   # class merges cn() & calculatePrintCost()
├── types/                         # TypeScript definitions
│   ├── database.types.ts          # Định nghĩa kiểu DB tự sinh & SafeDatabase
│   └── pdfjs-dist.d.ts            # Type declarations cho PDFjs
└── supabase_schema.sql            # Schema SQL, Indices, Policies & Procedures
```

---

## 3. Thiết Kế Cơ Sở Dữ Liệu & RLS (Data Model & Security)

### A. Lược đồ dữ liệu (Database Schema)

Hệ thống sử dụng cơ sở dữ liệu quan hệ PostgreSQL với cấu trúc liên kết chặt chẽ:

```mermaid
erDiagram
    profiles ||--o{ orders : "places"
    profiles ||--o{ print_jobs : "submits"
    profiles ||--o{ payment_tokens : "saves"
    profiles ||--o{ reward_points_history : "audits"
    profiles ||--o{ chat_sessions : "starts"
    products ||--o{ order_items : "contains"
    orders ||--|{ order_items : "details"
    chat_sessions ||--|{ chat_messages : "records"
```

### B. Row Level Security (RLS) & IDOR Defense

Tất cả các bảng chứa dữ liệu cá nhân của người dùng đều được bảo mật nghiêm ngặt bằng RLS:

- **Nguyên tắc**: User chỉ được phép đọc/ghi dữ liệu của chính mình thông qua điều kiện check `auth.uid() = user_id` (hoặc `id` / `owner`).
- **Profiles Protection**: Bảng `profiles` tuyệt đối **không cấp quyền UPDATE cho Client SDK**. Điểm thưởng (`reward_points`) chỉ được thay đổi trên server thông qua Stored Procedure chạy dưới quyền `SECURITY DEFINER` khi có hoá đơn thanh toán hợp lệ.
- **Storage Protection**: Bucket `print-files` được cấu hình RLS bảo vệ. Các tệp tin in ấn PDF nhạy cảm không thể truy cập công khai mà phải dùng phương thức sinh mã có thời hạn `createSignedUrl` (hạn dùng 24h) để hiển thị/in.

---

## 4. Các Luồng Nghiệp Vụ Cốt Lõi (Core Workflows)

### A. Luồng Đặt hàng & Xử lý đồng thời (Store Checkout Loop)

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Component
    participant Server as Next.js API (/api/orders)
    participant DB as Supabase PostgreSQL
    participant Card as Sandbox Gateway (/api/sandbox/payment)

    User->>Server: Gửi giỏ hàng, thông tin thẻ & Idempotency Key
    Server->>Card: Gửi thông tin thẻ yêu cầu Tokenize
    Card-->>Server: Trả về Secure Card Token (tok_last4_xxxx)
    Server->>DB: Gọi RPC create_order_with_stock_check (Pessimistic Lock)
    Note over DB: 1. Khoá dòng Profiles FOR UPDATE<br/>2. Khoá dòng Products theo ID tăng dần FOR UPDATE<br/>3. Kiểm tra tồn kho & Khấu trừ tồn kho / Trừ điểm thưởng
    DB-->>Server: Tạo đơn hàng thành công (Trạng thái: pending)
    Server->>Card: Gửi token yêu cầu Charge tiền (charge)
    alt Thanh toán thành công
        Card-->>Server: Thanh toán thành công (200 OK)
        Server->>DB: Gọi RPC mark_order_as_paid (Trạng thái -> paid)
        Server-->>User: Đặt hàng thành công! Redirect về /dashboard?tab=orders
    else Thanh toán thất bại (Hết hạn, Từ chối, Timeout)
        Card-->>Server: Trả về mã lỗi thanh toán (400/504)
        Server->>DB: Gọi RPC rollback_failed_order
        Note over DB: Hoàn trả lại số tồn kho sản phẩm nguyên tử<br/>Hoàn lại điểm thưởng của profiles<br/>Cập nhật trạng thái đơn -> failed & hủy idempotency
        Server-->>User: Trả lỗi thanh toán. Hiển thị banner rollback an toàn
    end
```

### B. Luồng Lệnh in từ xa & Chạy ngầm (Print Queue & Simulator Flow)

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Component
    participant Server as Next.js API (/api/print-jobs)
    participant Storage as Supabase Storage
    participant DB as Supabase Database (Realtime)

    User->>Storage: Tải tệp PDF lên bucket 'print-files'
    Storage-->>User: Tải lên thành công
    User->>Storage: Sinh secure URL thông qua createSignedUrl
    Storage-->>User: Trả về Signed URL có thời hạn
    User->>Server: Gửi yêu cầu in (Signed URL, cấu hình, chi phí)
    Server->>DB: Ghi nhận dòng print_jobs mới (status: pending)
    DB-->>Server: Trả về bản ghi và jobId
    Server-->>User: Phản hồi 201 Created ngay lập tức (Chỉ 150ms!)
    Note over Server: Kích hoạt async after() background task
    Note over User: Subscribed vào Realtime Channel của jobId

    par Background Simulator
        Server->>DB: (Sau 2s) Update status -> rendering (Bypass cookie client)
        DB-->>User: Truyền tín hiệu Realtime -> Cập nhật thanh tiến độ 40%
        Server->>DB: (Sau 3s) Update status -> printing
        DB-->>User: Truyền tín hiệu Realtime -> Cập nhật thanh tiến độ 70%
        Server->>DB: (Sau 4s) Update status -> completed
        DB-->>User: Truyền tín hiệu Realtime -> Cập nhật hoàn thành 100%
    end
```

---

## 5. Quy Chuẩn Thiết Kế Giao Diện & UX (Design & Aesthetics)

Trải nghiệm giao diện được thống nhất tại [app/globals.css](file:///d:/se/NguyenDinhBao_Round2_Submission-/app/globals.css) theo định hướng **OLED Dark Mode & Glassmorphic Premium**:

- **Triết lý OLED Black**: Sử dụng màu nền `#050505` cực sâu giúp tiết kiệm pin trên màn hình di động OLED và mang lại độ tương phản tuyệt hảo.
- **Accents (Màu nhấn)**: Áp dụng màu **Vanguard Emerald** (`#10b981`) làm tông màu chủ đạo tạo cảm giác công nghệ cao và cao cấp.
- **Glassmorphism (Kính mờ)**:
  Các class kính mờ `.glass-bezel-outer` và `.glass-bezel-inner` sử dụng `backdrop-filter: blur(12px)` kết hợp viền mờ `rgba(255, 255, 255, 0.08)` tạo chiều sâu thị giác.
- **Micro-animations**: Hiệu ứng chuyển động lún nhấn đàn hồi `active:scale-[0.98]`, xoay mượt mà của biểu tượng đang tải in ấn, và thanh tiến trình in realtime mang lại cảm giác sống động cho hệ thống.
