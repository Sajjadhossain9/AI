-- AIMY commerce schema
-- Run this file once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.product_plans (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null,
  product_name text not null,
  label text not null,
  duration_days integer not null check (duration_days > 0),
  price numeric(12,2),
  currency text not null default 'BDT',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_slug, label)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  customer_name text not null,
  email text not null,
  phone text not null,
  status text not null default 'pending_payment' check (status in ('quote_requested','pending_payment','payment_review','processing','completed','cancelled','refunded')),
  subtotal numeric(12,2) not null default 0,
  currency text not null default 'BDT',
  payment_method text,
  payment_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  plan_id uuid references public.product_plans(id) on delete set null,
  product_slug text not null,
  product_name text not null,
  plan_label text not null,
  unit_price numeric(12,2),
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

create index if not exists orders_email_idx on public.orders(lower(email));
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists product_plans_slug_idx on public.product_plans(product_slug);

alter table public.profiles enable row level security;
alter table public.product_plans enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create policy "Users can view own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "Admins can view profiles"
on public.profiles for select
to authenticated
using (public.is_admin());

create policy "Public can view active plans"
on public.product_plans for select
to anon, authenticated
using (active = true or public.is_admin());

create policy "Admins can manage plans"
on public.product_plans for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can view orders"
on public.orders for select
to authenticated
using (public.is_admin());

create policy "Admins can update orders"
on public.orders for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can view order items"
on public.order_items for select
to authenticated
using (public.is_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role) values (new.id, 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.create_public_order(order_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_order_code text;
  v_item jsonb;
  v_plan public.product_plans%rowtype;
  v_quantity integer;
  v_subtotal numeric(12,2) := 0;
  v_quote_required boolean := false;
  v_status text;
  v_currency text := 'BDT';
begin
  if coalesce(trim(order_payload->>'customer_name'),'') = ''
    or coalesce(trim(order_payload->>'email'),'') = ''
    or coalesce(trim(order_payload->>'phone'),'') = '' then
    raise exception 'Name, email and phone are required';
  end if;

  if jsonb_typeof(order_payload->'items') <> 'array' or jsonb_array_length(order_payload->'items') = 0 then
    raise exception 'At least one order item is required';
  end if;

  v_order_code := 'AIMY-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.orders (
    id, order_code, customer_name, email, phone, status, subtotal, currency,
    payment_method, payment_reference, notes
  ) values (
    v_order_id,
    v_order_code,
    left(trim(order_payload->>'customer_name'),120),
    lower(left(trim(order_payload->>'email'),200)),
    left(trim(order_payload->>'phone'),50),
    'pending_payment',
    0,
    'BDT',
    left(coalesce(order_payload->>'payment_method',''),80),
    nullif(left(trim(coalesce(order_payload->>'payment_reference','')),120),''),
    nullif(left(trim(coalesce(order_payload->>'notes','')),1000),'')
  );

  for v_item in select * from jsonb_array_elements(order_payload->'items')
  loop
    select * into v_plan
    from public.product_plans
    where id = (v_item->>'plan_id')::uuid and active = true;

    if not found then
      raise exception 'Invalid or inactive product plan';
    end if;

    v_quantity := greatest(1, least(coalesce((v_item->>'quantity')::integer, 1), 10));
    v_currency := v_plan.currency;

    if v_plan.price is null then
      v_quote_required := true;
    else
      v_subtotal := v_subtotal + (v_plan.price * v_quantity);
    end if;

    insert into public.order_items (
      order_id, plan_id, product_slug, product_name, plan_label, unit_price, quantity
    ) values (
      v_order_id, v_plan.id, v_plan.product_slug, v_plan.product_name,
      v_plan.label, v_plan.price, v_quantity
    );
  end loop;

  if v_quote_required then
    v_status := 'quote_requested';
  elsif nullif(trim(coalesce(order_payload->>'payment_reference','')),'') is not null then
    v_status := 'payment_review';
  else
    v_status := 'pending_payment';
  end if;

  update public.orders
  set subtotal = v_subtotal, currency = v_currency, status = v_status, updated_at = now()
  where id = v_order_id;

  return jsonb_build_object(
    'order_code', v_order_code,
    'status', v_status,
    'subtotal', v_subtotal,
    'currency', v_currency
  );
end;
$$;

revoke all on function public.create_public_order(jsonb) from public;
grant execute on function public.create_public_order(jsonb) to anon, authenticated;

create or replace function public.get_public_order_status(p_order_code text, p_email text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'order_code', o.order_code,
    'status', o.status,
    'subtotal', o.subtotal,
    'currency', o.currency,
    'created_at', o.created_at,
    'updated_at', o.updated_at
  )
  from public.orders o
  where upper(o.order_code) = upper(trim(p_order_code))
    and lower(o.email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.get_public_order_status(text,text) from public;
grant execute on function public.get_public_order_status(text,text) to anon, authenticated;

-- Seed two editable plans per catalog product. Prices remain NULL until you set them in /admin.
with catalog(product_slug, product_name) as (
  values
    ('chatgpt','ChatGPT'),('claude','Claude'),('gemini','Gemini'),('perplexity','Perplexity'),('grok','Grok'),
    ('quillbot','QuillBot'),('grammarly','Grammarly'),('turnitin','Turnitin'),('ithenticate','iThenticate'),('scribbr','Scribbr'),
    ('semrush','Semrush'),('ahrefs','Ahrefs'),('ubersuggest','Ubersuggest'),('surfer-seo','Surfer SEO'),
    ('canva-pro','Canva Pro'),('freepik-premium','Freepik Premium'),('envato-elements','Envato Elements'),
    ('github-copilot','GitHub Copilot'),('cursor','Cursor'),('replit','Replit'),
    ('elevenlabs','ElevenLabs'),('runway','Runway'),('heygen','HeyGen'),
    ('notion','Notion'),('microsoft-365','Microsoft 365'),('google-workspace','Google Workspace'),
    ('coursera','Coursera'),('udemy','Udemy'),('quizlet','Quizlet'),
    ('scispace','SciSpace'),('elicit','Elicit'),('consensus','Consensus'),('paperpal','Paperpal'),
    ('youtube-premium','YouTube Premium')
), plan_templates(label, duration_days) as (
  values ('1 Month',30),('1 Year',365)
)
insert into public.product_plans (product_slug, product_name, label, duration_days, price, currency, active)
select c.product_slug, c.product_name, p.label, p.duration_days, null, 'BDT', true
from catalog c cross join plan_templates p
on conflict (product_slug, label) do nothing;

-- IMPORTANT: after creating your Supabase Auth admin user, run this once with that user's UUID:
-- update public.profiles set role = 'admin' where id = 'YOUR-AUTH-USER-UUID';
