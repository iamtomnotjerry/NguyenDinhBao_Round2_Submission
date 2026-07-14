-- v8: Persist store checkout delivery address + recipient on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS recipient_name TEXT;

COMMENT ON COLUMN public.orders.delivery_address IS 'Required when delivery_type = delivery';
COMMENT ON COLUMN public.orders.recipient_name IS 'Checkout recipient display name';
