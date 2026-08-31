# AIMY Storefront

A modern storefront for AI, academic, SEO, design, developer, research, productivity, education and entertainment tools.

## Current build — Step 2

- React + Vite storefront
- 30+ product catalog with category browsing and search
- Supabase-ready pricing and plan variants
- Cart and checkout form
- Customer order creation through a secured RPC
- Unique order codes
- Customer order-status lookup
- Payment method and transaction/reference fields
- Quote-request flow for products without a fixed price
- `/admin` dashboard for orders, statuses and prices
- Supabase Auth admin login
- Row Level Security for orders and admin data
- Cloudflare/Netlify SPA redirect support

## Run locally

```bash
npm install
npm run dev
```

## Connect Supabase

1. Create a new Supabase project.
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. Then run `supabase/002_permissions.sql`.
4. Create an admin user in **Authentication → Users** after the schema has been installed.
5. Copy that user's UUID and run:

```sql
insert into public.profiles (id, role)
values ('YOUR-AUTH-USER-UUID', 'admin')
on conflict (id) do update set role = 'admin';
```

6. Copy `.env.example` to `.env.local` and add the project's URL and anon key:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Do **not** put the Supabase service-role key in the frontend or Cloudflare Pages public environment variables.

## Set product prices

The schema creates **1 Month** and **1 Year** plans for every catalog product. Prices start as `NULL`, which means the storefront displays **Request quote**.

After Supabase is connected:

1. Visit `/admin`.
2. Sign in with the admin Auth account.
3. Open **Pricing**.
4. Enter BDT prices and save each plan.

Once a price is saved, the public storefront automatically displays the live starting price.

## Order workflow

Typical statuses:

`quote_requested` → `pending_payment` → `payment_review` → `processing` → `completed`

The admin can also mark an order `cancelled` or `refunded`.

Customers can track an order using the generated order code plus the email used during checkout. The public tracking RPC returns only status, total and timestamps; private contact/payment data stays protected by RLS.

## Production build

```bash
npm run build
```

Deploy the generated `dist` directory to Cloudflare Pages, Netlify or another static host.

For Cloudflare Pages use:

- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

## Access policy

The storefront should only offer provider-permitted access methods, such as authorized reseller/partner offers, affiliate offers, business licensing, APIs or activation on a customer-owned account. Shared, stolen or unauthorized credentials should not be sold or automated through this project.
