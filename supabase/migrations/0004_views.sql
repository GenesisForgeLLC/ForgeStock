-- =============================================================================
-- Owner-scoped reporting views.
-- All views use security_invoker so the querying user's RLS policies apply
-- (Postgres 15+ / Supabase). Never expose another user's rows.
-- =============================================================================

-- --------------------------------------------------- product inventory -------
create or replace view public.v_product_inventory
with (security_invoker = on) as
select
  p.id,
  p.user_id,
  p.name,
  p.sku,
  p.category_id,
  c.name                              as category_name,
  p.brand_line,
  p.image_path,
  p.default_price_cents,
  p.low_stock_threshold,
  p.is_favorite,
  p.is_archived,
  coalesce(oh.on_hand, 0)             as on_hand,
  coalesce(uc.unit_cost_cents, p.other_unit_cost_cents, 0) as unit_cost_cents,
  coalesce(oh.on_hand, 0) * coalesce(uc.unit_cost_cents, p.other_unit_cost_cents, 0) as inventory_value_cents,
  coalesce(oh.on_hand, 0) * p.default_price_cents          as retail_value_cents,
  (coalesce(oh.on_hand, 0) <= p.low_stock_threshold)       as is_low_stock
from public.products p
left join public.categories c on c.id = p.category_id
left join (
  select product_id, sum(quantity_delta)::int as on_hand
  from public.inventory_ledger
  group by product_id
) oh on oh.product_id = p.id
left join (
  select product_id,
         round(sum(quantity_delta * unit_cost_cents_snapshot)::numeric
               / nullif(sum(quantity_delta), 0))::int as unit_cost_cents
  from public.inventory_ledger
  where transaction_type = 'printed'
    and unit_cost_cents_snapshot is not null
    and quantity_delta > 0
  group by product_id
) uc on uc.product_id = p.id;

-- ----------------------------------------------- event item breakdown --------
create or replace view public.v_event_item_summary
with (security_invoker = on) as
select
  ei.id                               as event_item_id,
  ei.user_id,
  ei.event_id,
  ei.product_id,
  p.name                              as product_name,
  p.sku,
  p.image_path,
  ei.quantity_brought,
  coalesce(ei.event_price_cents, p.default_price_cents) as effective_price_cents,
  p.default_price_cents,
  coalesce(pi.unit_cost_cents, 0)     as unit_cost_cents,
  coalesce(mv.sold_qty, 0)            as quantity_sold,
  coalesce(mv.gifted_qty, 0)          as quantity_gifted,
  coalesce(mv.damaged_qty, 0)         as quantity_damaged,
  greatest(0, ei.quantity_brought + coalesce(mv.net_delta, 0))::int as quantity_remaining
from public.event_items ei
join public.products p on p.id = ei.product_id
left join public.v_product_inventory pi on pi.id = ei.product_id
left join (
  select
    event_id, product_id,
    sum(case when transaction_type = 'sold' then -quantity_delta else 0 end)    as sold_qty,
    sum(case when transaction_type = 'gifted' then -quantity_delta else 0 end)  as gifted_qty,
    sum(case when transaction_type = 'damaged' then -quantity_delta else 0 end) as damaged_qty,
    sum(quantity_delta)                                                          as net_delta
  from public.inventory_ledger
  where event_id is not null
  group by event_id, product_id
) mv on mv.event_id = ei.event_id and mv.product_id = ei.product_id;

-- ----------------------------------------------- event financial summary -----
create or replace view public.v_event_financials
with (security_invoker = on) as
select
  e.id                                as event_id,
  e.user_id,
  e.name,
  e.status,
  coalesce(s.sales_count, 0)          as sales_count,
  coalesce(s.subtotal_cents, 0)       as subtotal_cents,
  coalesce(s.discount_cents, 0)       as discount_cents,
  coalesce(s.tax_cents, 0)            as tax_cents,
  coalesce(s.total_cents, 0)          as total_collected_cents,
  coalesce(s.cogs_cents, 0)           as cogs_cents,
  coalesce(s.total_cents, 0) - coalesce(s.tax_cents, 0) - coalesce(s.cogs_cents, 0)
                                      as gross_profit_cents,
  coalesce(items.units_brought, 0)    as units_brought,
  coalesce(items.units_sold, 0)       as units_sold,
  coalesce(items.units_gifted, 0)     as units_gifted,
  coalesce(items.units_damaged, 0)    as units_damaged,
  coalesce(items.units_remaining, 0)  as units_remaining
from public.events e
left join (
  select sa.event_id,
         count(*)                         as sales_count,
         sum(sa.subtotal_cents)           as subtotal_cents,
         sum(sa.discount_cents)           as discount_cents,
         sum(sa.tax_cents)                as tax_cents,
         sum(sa.total_cents)              as total_cents,
         coalesce(sum(si.cogs_cents), 0)  as cogs_cents
  from public.sales sa
  left join public.sale_items si on si.sale_id = sa.id
  where sa.status = 'completed'
  group by sa.event_id
) s on s.event_id = e.id
left join (
  select event_id,
         sum(quantity_brought)   as units_brought,
         sum(quantity_sold)      as units_sold,
         sum(quantity_gifted)    as units_gifted,
         sum(quantity_damaged)   as units_damaged,
         sum(quantity_remaining) as units_remaining
  from public.v_event_item_summary
  group by event_id
) items on items.event_id = e.id;

-- ----------------------------------------------- sales by payment method -----
create or replace view public.v_event_payment_breakdown
with (security_invoker = on) as
select
  event_id,
  user_id,
  payment_method,
  count(*)          as sales_count,
  sum(total_cents)  as total_cents
from public.sales
where status = 'completed' and event_id is not null
group by event_id, user_id, payment_method;
