-- AIMY monthly-only catalog configuration
-- Keep only the 1 Month plans visible to customers.

update public.product_plans
set active = false,
    updated_at = now()
where label = '1 Year';

update public.product_plans
set active = true,
    updated_at = now()
where label = '1 Month';
