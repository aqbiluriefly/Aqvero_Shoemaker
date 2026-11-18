# Supabase database

Run these files **in order** in the Supabase dashboard → **SQL Editor** → New query → paste → **Run**:

1. `migrations/20261118000001_schema.sql` — tables, enums, triggers
2. `migrations/20261118000002_security.sql` — Row Level Security, privileges, `create_order()`
3. `migrations/20261118000003_storage.sql` — `product-images` storage bucket
4. `seed.sql` — initial catalog (safe to re-run)

## Make yourself admin

After creating your account in Authentication → Users, run:

```sql
update public.profiles set role = 'admin' where email = 'YOUR-EMAIL@example.com';
```

## Security model (summary)

- Public (anon) can read only **active** products, categories, variants, options, images and approved reviews.
- Customers read only **their own** orders, items, payments and shipments; they cannot create or change orders.
- Orders are created only by the server (service role) through `create_order()`, which is idempotent and prevents overselling.
- Admins (from the browser) can change order **status and notes only** — never amounts.
- No card data is stored anywhere; `payments` keeps only gateway references.
