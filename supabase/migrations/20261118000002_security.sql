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
