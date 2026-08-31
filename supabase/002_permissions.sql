-- Run after schema.sql.
-- These grants expose only the operations that RLS policies are designed to allow.

grant usage on schema public to anon, authenticated;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.create_public_order(jsonb) to anon, authenticated;
grant execute on function public.get_public_order_status(text,text) to anon, authenticated;

grant select on public.product_plans to anon, authenticated;
grant insert, update, delete on public.product_plans to authenticated;

grant select on public.profiles to authenticated;
grant select, update on public.orders to authenticated;
grant select on public.order_items to authenticated;
