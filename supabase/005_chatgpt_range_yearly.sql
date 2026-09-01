-- ChatGPT Plus pricing and yearly availability

alter table public.product_plans
add column if not exists price_max numeric(12,2);

update public.product_plans
set price = 1800,
    price_max = 3000,
    currency = 'BDT',
    active = true,
    updated_at = now()
where product_slug = 'chatgpt' and label = '1 Month';

update public.product_plans
set active = true,
    updated_at = now()
where product_slug = 'chatgpt' and label = '1 Year';

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
    or coalesce(trim(order_payload->>'phone'),'') = '' then
    raise exception 'Name and phone are required';
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
    nullif(lower(left(trim(coalesce(order_payload->>'email','')),200)),''),
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
      if v_plan.price_max is not null and v_plan.price_max > v_plan.price then
        v_quote_required := true;
      end if;
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
