-- AQVERO — complete database setup (all migrations + seed in order).
-- Generated from supabase/migrations/*.sql and supabase/seed.sql. Run ONCE on a fresh project.

-- ===== supabase/migrations/20261118000001_schema.sql =====
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

-- ===== supabase/migrations/20261118000002_security.sql =====
-- =====================================================================
-- AQVERO — Row Level Security, privileges and server-only functions
-- Principle: the browser (anon/authenticated) can READ the public catalog
-- and its OWN data only. All writes to orders/payments/shipments happen
-- on the server with the service-role key, or by an admin.
-- =====================================================================

-- Enable RLS on every table
alter table public.profiles               enable row level security;
alter table public.categories             enable row level security;
alter table public.products               enable row level security;
alter table public.product_images         enable row level security;
alter table public.product_variants       enable row level security;
alter table public.product_option_groups  enable row level security;
alter table public.product_option_values  enable row level security;
alter table public.carts                  enable row level security;
alter table public.cart_items             enable row level security;
alter table public.coupons                enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_items            enable row level security;
alter table public.order_status_history   enable row level security;
alter table public.coupon_redemptions     enable row level security;
alter table public.payments               enable row level security;
alter table public.webhook_events         enable row level security;
alter table public.shipments              enable row level security;
alter table public.reviews                enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- ---------------------------------------------------------------------
-- Profiles: users see/edit their own name & phone; cannot change role.
-- ---------------------------------------------------------------------
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin all" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
revoke insert, delete on public.profiles from anon, authenticated;

-- ---------------------------------------------------------------------
-- Catalog: public can read ACTIVE products; admins manage everything.
-- ---------------------------------------------------------------------
create policy "categories: public read" on public.categories
  for select to anon, authenticated using (true);
create policy "categories: admin write" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "products: public read active" on public.products
  for select to anon, authenticated using (status = 'active' or public.is_admin());
create policy "products: admin write" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "product_images: public read" on public.product_images
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'active' or public.is_admin())));
create policy "product_images: admin write" on public.product_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "product_variants: public read" on public.product_variants
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'active' or public.is_admin())));
create policy "product_variants: admin write" on public.product_variants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "option_groups: public read" on public.product_option_groups
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'active' or public.is_admin())));
create policy "option_groups: admin write" on public.product_option_groups
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "option_values: public read" on public.product_option_values
  for select to anon, authenticated
  using (exists (
    select 1 from public.product_option_groups g join public.products p on p.id = g.product_id
    where g.id = group_id and (p.status = 'active' or public.is_admin())
  ));
create policy "option_values: admin write" on public.product_option_values
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Cart: signed-in users manage only their own cart.
-- ---------------------------------------------------------------------
create policy "carts: own" on public.carts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cart_items: own" on public.cart_items
  for all to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

-- ---------------------------------------------------------------------
-- Orders & related: customers READ their own; admins read/update.
-- Orders are CREATED only by the server (service role) via create_order().
-- ---------------------------------------------------------------------
create policy "orders: read own" on public.orders
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "orders: admin update" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "order_items: read own" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

create policy "order_status_history: read own" on public.order_status_history
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

create policy "payments: read own" on public.payments
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

create policy "shipments: read own" on public.shipments
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
create policy "shipments: admin write" on public.shipments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Customers can never insert/delete orders, items, payments directly.
revoke insert, delete on public.orders, public.order_items, public.payments,
  public.order_status_history, public.coupon_redemptions from anon, authenticated;
revoke update on public.order_items, public.payments, public.order_status_history from anon, authenticated;
revoke all on public.orders from anon;
-- Even admins (from the browser) may only change status and internal notes;
-- money and address fields are written by the server alone.
revoke update on public.orders from authenticated;
grant update (status, admin_notes) on public.orders to authenticated;

-- ---------------------------------------------------------------------
-- Coupons, webhook events, newsletter: server/admin only (no public access).
-- ---------------------------------------------------------------------
create policy "coupons: admin all" on public.coupons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "coupon_redemptions: admin read" on public.coupon_redemptions
  for select to authenticated using (public.is_admin());
create policy "newsletter: admin read" on public.newsletter_subscribers
  for select to authenticated using (public.is_admin());
create policy "webhook_events: admin read" on public.webhook_events
  for select to authenticated using (public.is_admin());
revoke all on public.webhook_events, public.newsletter_subscribers, public.coupons from anon;

-- ---------------------------------------------------------------------
-- Reviews: public reads approved; admins moderate. Customers submit via
-- the server, which checks the purchase and sets is_verified_purchase.
-- ---------------------------------------------------------------------
create policy "reviews: public read approved" on public.reviews
  for select to anon, authenticated using (is_approved or public.is_admin());
create policy "reviews: admin all" on public.reviews
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke insert, update, delete on public.reviews from anon;

-- =====================================================================
-- Server-only functions (service role). Not callable from the browser.
-- =====================================================================

-- Creates an order atomically: idempotent on idempotency_key, reserves
-- stock for in-stock variants, writes line-item snapshots.
-- All amounts must already be computed and validated by the server.
create or replace function public.create_order(p jsonb)
returns table (order_id uuid, order_number text, already_existed boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_order_id uuid;
  v_number text;
  v_item jsonb;
  v_stock int;
  v_variant uuid;
begin
  select o.id, o.order_number into v_order_id, v_number
  from public.orders o where o.idempotency_key = (p ->> 'idempotency_key')::uuid;
  if found then
    return query select v_order_id, v_number, true;
    return;
  end if;

  v_number := 'AQ-' || to_char(now() at time zone 'utc', 'YYMMDD') || '-' || nextval('public.order_number_seq');

  begin
    insert into public.orders (
      order_number, idempotency_key, user_id, email, phone,
      ship_full_name, ship_country, ship_state, ship_city, ship_address1, ship_address2, ship_postal_code,
      customer_notes, subtotal_cents, discount_cents, shipping_cents, total_cents, coupon_id,
      shipping_provider, shipping_service_code, shipping_service_name, shipping_simulated,
      transit_days_min, transit_days_max
    ) values (
      v_number, (p ->> 'idempotency_key')::uuid, nullif(p ->> 'user_id', '')::uuid, p ->> 'email', p ->> 'phone',
      p ->> 'ship_full_name', p ->> 'ship_country', coalesce(p ->> 'ship_state', ''), p ->> 'ship_city',
      p ->> 'ship_address1', coalesce(p ->> 'ship_address2', ''), coalesce(p ->> 'ship_postal_code', ''),
      coalesce(p ->> 'customer_notes', ''), (p ->> 'subtotal_cents')::int, coalesce((p ->> 'discount_cents')::int, 0),
      (p ->> 'shipping_cents')::int, (p ->> 'total_cents')::int, nullif(p ->> 'coupon_id', '')::uuid,
      p ->> 'shipping_provider', p ->> 'shipping_service_code', p ->> 'shipping_service_name',
      coalesce((p ->> 'shipping_simulated')::boolean, false),
      (p ->> 'transit_days_min')::int, (p ->> 'transit_days_max')::int
    ) returning id into v_order_id;
  exception when unique_violation then
    -- A concurrent request with the same idempotency key won the race.
    select o.id, o.order_number into v_order_id, v_number
    from public.orders o where o.idempotency_key = (p ->> 'idempotency_key')::uuid;
    return query select v_order_id, v_number, true;
    return;
  end;

  for v_item in select * from jsonb_array_elements(p -> 'items') loop
    select v.id, v.stock into v_variant, v_stock
    from public.product_variants v where v.sku = v_item ->> 'sku' and v.is_active
    for update;
    if not found then
      raise exception 'VARIANT_NOT_FOUND:%', v_item ->> 'sku';
    end if;
    if v_stock is not null then
      if v_stock < (v_item ->> 'quantity')::int then
        raise exception 'OUT_OF_STOCK:%', v_item ->> 'sku';
      end if;
      update public.product_variants set stock = stock - (v_item ->> 'quantity')::int where id = v_variant;
    end if;

    insert into public.order_items (
      order_id, product_id, variant_id, sku, product_name, color_name, size_label,
      options, option_labels, unit_price_cents, quantity, line_total_cents, weight_kg
    ) values (
      v_order_id,
      (select v.product_id from public.product_variants v where v.id = v_variant),
      v_variant,
      v_item ->> 'sku', v_item ->> 'product_name', v_item ->> 'color_name', v_item ->> 'size_label',
      coalesce(v_item -> 'options', '{}'::jsonb),
      coalesce(array(select jsonb_array_elements_text(v_item -> 'option_labels')), '{}'),
      (v_item ->> 'unit_price_cents')::int, (v_item ->> 'quantity')::int,
      (v_item ->> 'line_total_cents')::int, (v_item ->> 'weight_kg')::numeric
    );
  end loop;

  if nullif(p ->> 'coupon_id', '') is not null then
    update public.coupons c set redemptions_count = c.redemptions_count + 1
    where c.id = (p ->> 'coupon_id')::uuid and (c.max_redemptions is null or c.redemptions_count < c.max_redemptions);
    if not found then raise exception 'COUPON_EXHAUSTED'; end if;
    insert into public.coupon_redemptions (coupon_id, order_id) values ((p ->> 'coupon_id')::uuid, v_order_id);
  end if;

  return query select v_order_id, v_number, false;
end $$;

-- Returns reserved stock when an unpaid order is cancelled or expires.
create or replace function public.release_order_stock(p_order_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.product_variants v
  set stock = v.stock + i.quantity
  from public.order_items i
  where i.order_id = p_order_id and i.variant_id = v.id and v.stock is not null;
end $$;

revoke execute on function public.create_order(jsonb) from public, anon, authenticated;
revoke execute on function public.release_order_stock(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.log_order_status() from public, anon, authenticated;
grant execute on function public.create_order(jsonb) to service_role;
grant execute on function public.release_order_stock(uuid) to service_role;

-- ===== supabase/migrations/20261118000003_storage.sql =====
-- Product photo storage: anyone can view, only admins can upload/change.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy "product-images: public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');
create policy "product-images: admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
create policy "product-images: admin update" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_admin());
create policy "product-images: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());

-- ===== supabase/seed.sql =====
-- =====================================================================
-- AQVERO — initial catalog data (safe to re-run)
-- =====================================================================

insert into public.categories (slug, name, description, sort_order)
values ('boots', 'Boots', 'Hand-lasted leather boots built for years of wear.', 1)
on conflict (slug) do update set name = excluded.name, description = excluded.description;

insert into public.products (
  slug, category_id, name, subtitle, status, size_system, price_usd_cents, short_description, description,
  leather_type, leather_finish, origin, specs, care, colors, fulfillment,
  production_weeks_min, production_weeks_max, shipping_weight_kg,
  custom_women_available, is_best_seller, is_new_arrival, popularity
) values (
  'engineer-boot-black-pull-up',
  (select id from public.categories where slug = 'boots'),
  'The Engineer Boot',
  '8" Boot · Black Pull-Up Cowhide',
  'active', 'men', 31500,
  'An 8-inch engineer boot cut from black pull-up cowhide and made by hand to order in Indonesia.',
  array[
    'The Engineer Boot is our take on a classic work silhouette: an 8-inch shaft, a buckled strap across the instep and a second buckle at the top for a secure, adjustable fit.',
    'Each pair is cut from pull-up cowhide — leather infused with oils and waxes, so it lightens where it flexes and develops a rich, individual patina over time.',
    'The boot is Goodyear welted: the upper, insole and sole are stitched to a leather welt, which makes the boot sturdy, water-resistant at the seam and fully resoleable when the sole wears down.',
    'Every pair is made to order by hand in our Indonesian workshop. Production begins after your payment is confirmed.'
  ],
  'Cowhide', 'Pull-up (oil & wax infused)', 'Handmade in Indonesia',
  '[{"label":"Construction","value":"Goodyear welted (resoleable)"},
    {"label":"Shaft height","value":"8 inches"},
    {"label":"Leather","value":"Black pull-up cowhide"},
    {"label":"Sole","value":"Vibram or Dr. Sole rubber — your choice"},
    {"label":"Closure","value":"Pull-on with adjustable buckle straps"},
    {"label":"Production","value":"Made to order, 3–4 weeks"},
    {"label":"Shipping weight","value":"Approx. 3 kg per pair"}]'::jsonb,
  array[
    'Wipe off dust and mud with a soft, slightly damp cloth.',
    'Let wet boots dry naturally, away from direct heat.',
    'Condition the leather every few months to keep it supple.',
    'Pull-up leather scuffs can often be buffed out with a clean cloth and gentle warmth from your hands.'
  ],
  '[{"slug":"black","name":"Black","hex":"#141210"}]'::jsonb,
  'made_to_order', 3, 4, 3.00,
  true, false, true, 100
)
on conflict (slug) do nothing;

-- Placeholder photo (third-party; replace before launch — see LAUNCH_CHECKLIST.md)
insert into public.product_images (product_id, src, alt, width, height, color_slug, focus, sort_order)
select p.id, '/images/products/engineer-boot-black-lifestyle.webp',
  'AQVERO Engineer Boot in black pull-up leather worn outdoors on a forest trail', 762, 645, 'black', '60% 88%', 0
from public.products p
where p.slug = 'engineer-boot-black-pull-up'
  and not exists (select 1 from public.product_images i where i.product_id = p.id);

-- Sizes US 7–13 (made to order: stock = null)
insert into public.product_variants (product_id, sku, color_slug, size_us, stock)
select p.id, 'AQ-ENG8-BLACK-' || replace(s::text, '.5', 'H5'), 'black', s, null
from public.products p,
  unnest(array[7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 13]::numeric[]) as s
where p.slug = 'engineer-boot-black-pull-up'
on conflict (sku) do nothing;

-- Sole options
insert into public.product_option_groups (product_id, slug, name, sort_order)
select p.id, 'sole', 'Sole', 0 from public.products p where p.slug = 'engineer-boot-black-pull-up'
on conflict (product_id, slug) do nothing;

insert into public.product_option_values (group_id, slug, name, description, price_delta_cents, sort_order)
select g.id, v.slug, v.name, v.description, v.delta, v.sort
from public.product_option_groups g
join public.products p on p.id = g.product_id and p.slug = 'engineer-boot-black-pull-up'
cross join (values
  ('dr-sole', 'Dr. Sole', 'Durable rubber lug sole', 0, 0),
  ('vibram', 'Vibram', 'Genuine Vibram rubber sole', 2000, 1)
) as v(slug, name, description, delta, sort)
where g.slug = 'sole'
on conflict (group_id, slug) do nothing;
