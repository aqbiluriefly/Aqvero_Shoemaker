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
