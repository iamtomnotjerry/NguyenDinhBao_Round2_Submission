-- PLATPRINT DATABASE SCHEMA & POLICIES (SUPABASE POSTGRESQL)
-- Copy and paste this script directly into the Supabase SQL Editor to initialize the database.

-- =========================================================================
-- 1. EXTENSIONS & PREREQUISITES
-- =========================================================================
create extension if not exists "uuid-ossp";

-- =========================================================================
-- 2. TABLES DEFINITIONS
-- =========================================================================

-- Profiles table (Linked 1-1 with Supabase Auth users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null unique,
  reward_points integer default 0 check (reward_points >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Products table (Printed store items catalog)
create table public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  price decimal(10, 2) not null check (price >= 0),
  stock integer not null check (stock >= 0),
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Orders table (Printed products orders)
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  total_amount decimal(10, 2) not null check (total_amount >= 0),
  discount_amount decimal(10, 2) default 0.00 check (discount_amount >= 0),
  points_used integer default 0 check (points_used >= 0),
  points_earned integer default 0 check (points_earned >= 0),
  delivery_type text check (delivery_type in ('pickup', 'delivery')) not null,
  status text check (status in ('pending', 'paid', 'failed', 'completed')) default 'pending',
  idempotency_key text unique, -- Chống trùng lặp thanh toán
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Order Items table (Order details)
create table public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  quantity integer not null check (quantity > 0),
  price decimal(10, 2) not null check (price >= 0)
);

-- Print Jobs table (Remote printing orders)
create table public.print_jobs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  file_name text not null,
  file_url text not null, -- Supabase Storage URL
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

-- Payment Tokens table (PCI-DSS Compliant saved cards)
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

-- Reward Points History table (Earning & spending audit log)
create table public.reward_points_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  points integer not null, -- +10, -50...
  type text check (type in ('earn', 'spend')) not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Chat Sessions table (Support rooms)
create table public.chat_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('active', 'waiting_support', 'closed')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Chat Messages table (Individual chat messages)
create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.chat_sessions(id) on delete cascade not null,
  sender text check (sender in ('user', 'ai', 'support')) not null,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
-- 3. INDEXES FOR PERFORMANCE OPTIMIZATION
-- =========================================================================
create index idx_orders_user_id on public.orders(user_id);
create index idx_order_items_order_id on public.order_items(order_id);
create index idx_print_jobs_user_id on public.print_jobs(user_id);
create index idx_payment_tokens_user_id on public.payment_tokens(user_id);
create index idx_points_history_user_id on public.reward_points_history(user_id);
create index idx_chat_sessions_user_id on public.chat_sessions(user_id);
create index idx_chat_messages_session_id on public.chat_messages(session_id);

-- =========================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES FOR IDOR PREVENTION
-- =========================================================================

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.print_jobs enable row level security;
alter table public.payment_tokens enable row level security;
alter table public.reward_points_history enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

-- Profiles Policies
create policy "Allow users to read their own profile" 
  on public.profiles for select using (auth.uid() = id);
create policy "Allow users to update their own profile" 
  on public.profiles for update using (auth.uid() = id);

-- Orders & Items Policies
create policy "Allow users to read their own orders" 
  on public.orders for select using (auth.uid() = user_id);
create policy "Allow users to create their own orders" 
  on public.orders for insert with check (auth.uid() = user_id);
create policy "Allow users to read order items of their own orders" 
  on public.order_items for select using (
    exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
  );
create policy "Allow users to create order items"
  on public.order_items for insert with check (
    exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
  );

-- Print Jobs Policies
create policy "Allow users to read their own print jobs" 
  on public.print_jobs for select using (auth.uid() = user_id);
create policy "Allow users to create their own print jobs" 
  on public.print_jobs for insert with check (auth.uid() = user_id);

-- Payment Tokens Policies
create policy "Allow users to read their own payment tokens" 
  on public.payment_tokens for select using (auth.uid() = user_id);
create policy "Allow users to manage their own payment tokens" 
  on public.payment_tokens for all using (auth.uid() = user_id);

-- Reward Points History Policies
create policy "Allow users to read their own points history" 
  on public.reward_points_history for select using (auth.uid() = user_id);

-- Chat Sessions Policies
create policy "Allow users to read their own chat sessions" 
  on public.chat_sessions for select using (auth.uid() = user_id);
create policy "Allow users to create their own chat sessions" 
  on public.chat_sessions for insert with check (auth.uid() = user_id);

-- Chat Messages Policies
create policy "Allow users to read messages in their own sessions" 
  on public.chat_messages for select using (
    exists (select 1 from public.chat_sessions where chat_sessions.id = chat_messages.session_id and chat_sessions.user_id = auth.uid())
  );
create policy "Allow users to insert messages in their own sessions" 
  on public.chat_messages for insert with check (
    exists (select 1 from public.chat_sessions where chat_sessions.id = chat_messages.session_id and chat_sessions.user_id = auth.uid())
  );

-- Public access to Products catalog (for store listing)
alter table public.products enable row level security;
create policy "Allow anyone to read products" 
  on public.products for select using (true);

-- =========================================================================
-- 5. TRIGGER FOR AUTOMATIC PROFILE CREATION ON SIGN-UP
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, reward_points)
  values (new.id, new.email, 0);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================================
-- 6. STORED PROCEDURE FOR CONCURRENT INVENTORY UPDATES (PESSIMISTIC LOCKING)
-- =========================================================================
create or replace function public.create_order_with_stock_check(
  p_user_id uuid,
  p_total_amount decimal,
  p_discount_amount decimal,
  p_points_used integer,
  p_points_earned integer,
  p_delivery_type text,
  p_idempotency_key text,
  p_items jsonb -- Array of {product_id: uuid, quantity: int}
) returns uuid as $$
declare
  v_order_id uuid;
  item record;
  v_current_stock integer;
begin
  -- Check for idempotency to prevent double-charging
  select id into v_order_id from public.orders where idempotency_key = p_idempotency_key;
  if v_order_id is not null then
    return v_order_id;
  end if;

  -- 1. Create order entry
  insert into public.orders (user_id, total_amount, discount_amount, points_used, points_earned, delivery_type, status, idempotency_key)
  values (p_user_id, p_total_amount, p_discount_amount, p_points_used, p_points_earned, p_delivery_type, 'pending', p_idempotency_key)
  returning id into v_order_id;

  -- 2. Lock rows and update stock
  for item in select * from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer) loop
    -- Acquire exclusive lock on the product row (Pessimistic Locking)
    select stock into v_current_stock 
    from public.products 
    where id = item.product_id 
    for update;

    if v_current_stock < item.quantity then
      raise exception 'Product % is out of stock', item.product_id;
    end if;

    -- Decrement stock
    update public.products 
    set stock = stock - item.quantity 
    where id = item.product_id;

    -- Insert into order items
    insert into public.order_items (order_id, product_id, quantity, price)
    select v_order_id, item.product_id, item.quantity, price 
    from public.products where id = item.product_id;
  end loop;

  -- Update user points
  update public.profiles 
  set reward_points = reward_points - p_points_used + p_points_earned
  where id = p_user_id;

  -- Log reward points history
  if p_points_used > 0 then
    insert into public.reward_points_history (user_id, points, type, description)
    values (p_user_id, -p_points_used, 'spend', 'Used points to discount order ' || v_order_id);
  end if;
  if p_points_earned > 0 then
    insert into public.reward_points_history (user_id, points, type, description)
    values (p_user_id, p_points_earned, 'earn', 'Earned points from order ' || v_order_id);
  end if;

  return v_order_id;
end;
$$ language plpgsql security definer;
