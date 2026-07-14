# Supabase SQL — PlatPrint

Toàn bộ schema và migrations nằm tại đây (không còn file `.sql` rải ở root repo).

## Cấu trúc

```
supabase/
├── schema.sql          # Database mới / trống — chạy 1 lần
└── migrations/
    ├── v3.sql          # DB cũ đã có bảng (không chạy lại schema.sql)
    ├── v4.sql
    ├── v4_1.sql
    ├── v5.sql
    ├── v6.sql        # REVOKE money RPC + siết INSERT status
    ├── v7.sql        # Storage owner-only SELECT, settle idempotent
    ├── v8.sql        # delivery_address / recipient_name
    └── v9.sql        # idempotency scoped user_id + clamp rollback points
```

## Thứ tự chạy trên Supabase SQL Editor

**Database trống:**

1. `schema.sql`

**Đã có schema cũ (báo lỗi `relation "profiles" already exists`):**

1. `migrations/v3.sql` → `v4.sql` → `v4_1.sql` → `v5.sql` → `v6.sql` → `v7.sql` → `v8.sql` → `v9.sql`

**Sau migrations (nếu chưa có):**

```sql
alter publication supabase_realtime add table public.print_jobs;
```

Types TypeScript: `types/database.types.ts` (đồng bộ với schema sau v9).
