-- =====================================================================
-- AQVERO — core schema
-- Money is stored as integer US cents. Times are timestamptz (UTC).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.user_role as enum ('customer', 'admin');
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.fulfillment_type as enum ('made_to_order', 'in_stock');
create type public.size_system as enum ('men', 'women');
create type public.order_status as enum (
  'pending_payment', 'paid', 'in_production', 'ready_to_ship',
  'shipped', 'delivered', 'completed', 'cancelled', 'expired', 'refunded'
);
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'expired', 'refunded', 'partially_refunded');
create type public.shipment_status as enum ('pending', 'label_created', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'returned');
create type public.discount_type as enum ('percent', 'fixed');

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Users (profiles extend auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text check (char_length(full_name) <= 100),
  phone text check (char_length(phone) <= 30),
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Admin check used by RLS policies. SECURITY DEFINER so it can read
-- profiles without recursing into profiles' own policies.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Create a profile automatically for every new auth user.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 100));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,60}$'),
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,80}$'),
  category_id uuid references public.categories (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  subtitle text not null default '' check (char_length(subtitle) <= 160),
  status public.product_status not null default 'draft',
  size_system public.size_system not null default 'men',
  price_usd_cents int not null check (price_usd_cents > 0 and price_usd_cents < 10000000),
  short_description text not null default '' check (char_length(short_description) <= 500),
  description text[] not null default '{}',
  leather_type text not null default '',
  leather_finish text not null default '',
  origin text not null default 'Handmade in Indonesia',
  specs jsonb not null default '[]'::jsonb,     -- [{label, value}]
  care text[] not null default '{}',
  colors jsonb not null default '[]'::jsonb,    -- [{slug, name, hex}]
  fulfillment public.fulfillment_type not null default 'made_to_order',
  production_weeks_min int check (production_weeks_min between 0 and 52),
  production_weeks_max int check (production_weeks_max between 0 and 52),
  dispatch_days int check (dispatch_days between 0 and 60),
  shipping_weight_kg numeric(6,2) not null check (shipping_weight_kg > 0),
  custom_women_available boolean not null default false,
  is_best_seller boolean not null default false,
  is_new_arrival boolean not null default false,
  popularity int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (production_weeks_min is null or production_weeks_max is null or production_weeks_min <= production_weeks_max)
);
create index products_category_idx on public.products (category_id);
create index products_status_idx on public.products (status);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  src text not null check (char_length(src) <= 500),  -- public URL or /images/... path
  alt text not null default '' check (char_length(alt) <= 200),
  width int not null check (width > 0),
  height int not null check (height > 0),
  color_slug text,
  focus text check (focus ~ '^\d{1,3}% \d{1,3}%$'),
  sort_order int not null default 0
);
create index product_images_product_idx on public.product_images (product_id, sort_order);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null unique check (sku ~ '^[A-Za-z0-9-]{1,80}$'),
  color_slug text not null,
  size_us numeric(4,1) not null check (size_us > 0 and size_us < 20),
  stock int check (stock is null or stock >= 0),  -- null = made to order
  is_active boolean not null default true,
  unique (product_id, color_slug, size_us)
);
create index product_variants_product_idx on public.product_variants (product_id);

create table public.product_option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]{1,40}$'),
  name text not null,
  sort_order int not null default 0,
  unique (product_id, slug)
);

create table public.product_option_values (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.product_option_groups (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]{1,40}$'),
  name text not null,
  description text not null default '',
  price_delta_cents int not null default 0 check (price_delta_cents >= 0 and price_delta_cents < 1000000),
  sort_order int not null default 0,
  unique (group_id, slug)
);

-- ---------------------------------------------------------------------
-- Cart (signed-in customers; guests keep their cart in the browser)
-- ---------------------------------------------------------------------
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  options jsonb not null default '{}'::jsonb,
  quantity int not null check (quantity between 1 and 10),
  created_at timestamptz not null default now(),
  unique (cart_id, variant_id, options)
);

-- ---------------------------------------------------------------------
-- Coupons
-- ---------------------------------------------------------------------
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{3,30}$'),
  discount_type public.discount_type not null,
  discount_value int not null check (discount_value > 0),  -- percent (1-100) or cents
  min_subtotal_cents int not null default 0 check (min_subtotal_cents >= 0),
  max_redemptions int check (max_redemptions is null or max_redemptions > 0),
  redemptions_count int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value <= 100)
);

-- ---------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------
create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  idempotency_key uuid not null unique,         -- prevents duplicate orders on double submit
  user_id uuid references auth.users (id) on delete set null,
  status public.order_status not null default 'pending_payment',
  email text not null check (char_length(email) <= 254),
  phone text not null check (char_length(phone) <= 30),
  -- Shipping address snapshot
  ship_full_name text not null,
  ship_country char(2) not null,
  ship_state text not null default '',
  ship_city text not null,
  ship_address1 text not null,
  ship_address2 text not null default '',
  ship_postal_code text not null default '',
  customer_notes text not null default '' check (char_length(customer_notes) <= 500),
  -- Money (USD cents), all computed on the server
  currency char(3) not null default 'USD',
  subtotal_cents int not null check (subtotal_cents >= 0),
  discount_cents int not null default 0 check (discount_cents >= 0),
  shipping_cents int not null check (shipping_cents >= 0),
  total_cents int not null check (total_cents >= 0),
  coupon_id uuid references public.coupons (id) on delete set null,
  -- Shipping method chosen at checkout
  shipping_provider text not null,
  shipping_service_code text not null,
  shipping_service_name text not null,
  shipping_simulated boolean not null default false,
  transit_days_min int,
  transit_days_max int,
  admin_notes text not null default '',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_cents = subtotal_cents - discount_cents + shipping_cents)
);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_user_idx on public.orders (user_id);
create index orders_email_idx on public.orders (lower(email));
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  -- Snapshot at purchase time (products can change later)
  sku text not null,
  product_name text not null,
  color_name text not null,
  size_label text not null,
  options jsonb not null default '{}'::jsonb,
  option_labels text[] not null default '{}',
  unit_price_cents int not null check (unit_price_cents >= 0),
  quantity int not null check (quantity between 1 and 10),
  line_total_cents int not null check (line_total_cents = unit_price_cents * quantity),
  weight_kg numeric(6,2) not null
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  note text not null default '',
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

-- Log every status change automatically.
create or replace function public.log_order_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end $$;

create trigger orders_status_log after insert or update of status on public.orders
  for each row execute function public.log_order_status();

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  order_id uuid not null unique references public.orders (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Payments (NO card data is ever stored — only gateway references)
-- ---------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null,                       -- e.g. 'xendit', 'paypal'
  provider_payment_id text,                     -- gateway invoice/charge id
  provider_checkout_url text,
  status public.payment_status not null default 'pending',
  amount_cents int not null check (amount_cents >= 0),
  currency char(3) not null default 'USD',
  card_brand text,                              -- e.g. 'VISA' (from gateway, optional)
  card_last4 char(4),                           -- last 4 digits only (from gateway, optional)
  raw_last_event jsonb,                         -- last verified webhook payload (sanitised)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);
create index payments_order_idx on public.payments (order_id);
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- Each webhook event is processed exactly once.
create table public.webhook_events (
  id bigint generated always as identity primary key,
  provider text not null,
  event_id text not null,
  event_type text not null default '',
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  payload jsonb,
  unique (provider, event_id)
);

-- ---------------------------------------------------------------------
-- Shipping / tracking
-- ---------------------------------------------------------------------
create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  carrier text not null,                        -- 'dhl' | 'fedex' | 'ups' | other
  service_name text not null default '',
  tracking_number text check (tracking_number ~ '^[A-Za-z0-9-]{4,40}$'),
  tracking_url text,
  status public.shipment_status not null default 'pending',
  shipped_at timestamptz,
  delivered_at timestamptz,
  last_tracking_event jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shipments_order_idx on public.shipments (order_id);
create index shipments_tracking_idx on public.shipments (tracking_number);
create trigger shipments_updated_at before update on public.shipments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Reviews (verified purchases only, approved by admin)
-- ---------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  author_name text not null check (char_length(author_name) between 1 and 60),
  author_country char(2),
  rating int not null check (rating between 1 and 5),
  title text not null default '' check (char_length(title) <= 120),
  body text not null check (char_length(body) between 10 and 3000),
  is_verified_purchase boolean not null default false,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);
create index reviews_product_idx on public.reviews (product_id) where is_approved;

-- ---------------------------------------------------------------------
-- Newsletter
-- ---------------------------------------------------------------------
create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) <= 254),
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  created_at timestamptz not null default now()
);
