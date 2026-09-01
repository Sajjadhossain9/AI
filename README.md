# AIMY Storefront

A database-driven storefront for AI, academic, SEO, design, developer, research, productivity, education and entertainment tools.

## Current build

- React + Vite storefront
- Supabase-backed product catalog
- Guest checkout — no customer login required
- Buy Now + Add to Cart
- Product plan pricing and price ranges
- 1 Month, 1 Year and custom plans
- Available / Stock Out / Offer status
- Optional old/compare price for offers
- Custom product tags
- Admin-managed product visibility and featured state
- Admin can add new products
- Admin can edit product details and arbitrary BDT prices
- Password-only `/admin` portal — no admin email account required
- Expiring admin sessions
- Password change inside the portal
- Secured public order RPC
- Cloudflare/Netlify SPA redirect support

## Admin portal

Open:

`/admin`

The first visit performs a one-time setup and asks you to create a private admin password. After initialization, the setup endpoint becomes unavailable and the portal uses a password plus an expiring session token.

From the admin portal you can:

- Add a new product
- Edit product name, category, description and initials
- Set a custom tag such as Popular or Best Seller
- Set status to Available, Stock Out or Offer
- Show/hide products from the public store
- Mark products as Featured
- Change sort order
- Add and edit plans such as 1 Month or 1 Year
- Enter any BDT selling price manually
- Set a minimum and maximum price to display a range
- Set an old/compare price for offer display
- Activate or deactivate individual plans

Changes are stored in Supabase and automatically appear on the storefront after refresh.

## Customer flow

Customers do not create accounts.

1. Browse products.
2. Tap **Buy Now** or **Add to Cart**.
3. Select an active plan.
4. Enter name, phone/WhatsApp and payment information.
5. Submit the order.

Stock Out products cannot be added to cart until the admin marks them available again.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Deploy the generated `dist` directory to Cloudflare Pages, GitHub Pages, Netlify or another static host.

## Supabase

The current project is already connected to its Supabase backend with a public publishable client key. Never add a service-role key to frontend code.

Database migrations are kept under `supabase/` where practical. Product and pricing writes are performed through token-protected admin RPCs rather than public table write policies.

## Access policy

Only offer provider-permitted access methods such as authorized reseller/partner offers, affiliate offers, business licensing, APIs or activation on a customer-owned account. Shared, stolen or unauthorized credentials should not be sold or automated through this project.
