-- =============================================================================
-- Row Level Security
--
-- Every table in the public (exposed) schema has RLS enabled and owner-scoped
-- policies. Immutable tables (production_batches, sales, sale_items,
-- inventory_ledger) expose SELECT only; all writes happen through the hardened
-- transactional functions in 0003_functions.sql. This guarantees history can
-- never be edited or deleted through the normal PostgREST interface.
-- =============================================================================

alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.products          enable row level security;
alter table public.production_batches enable row level security;
alter table public.events            enable row level security;
alter table public.event_items       enable row level security;
alter table public.sales             enable row level security;
alter table public.sale_items        enable row level security;
alter table public.inventory_ledger  enable row level security;

-- ------------------------------------------------------------------ profiles -
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- categories -
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists categories_insert on public.categories;
create policy categories_insert on public.categories
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists categories_update on public.categories;
create policy categories_update on public.categories
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists categories_delete on public.categories;
create policy categories_delete on public.categories
  for delete to authenticated using (user_id = (select auth.uid()));

-- ------------------------------------------------------------------ products -
drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists products_insert on public.products;
create policy products_insert on public.products
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists products_update on public.products;
create policy products_update on public.products
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists products_delete on public.products;
create policy products_delete on public.products
  for delete to authenticated using (user_id = (select auth.uid()));

-- -------------------------------------------------------------------- events -
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists events_insert on public.events;
create policy events_insert on public.events
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists events_update on public.events;
create policy events_update on public.events
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists events_delete on public.events;
create policy events_delete on public.events
  for delete to authenticated using (user_id = (select auth.uid()));

-- --------------------------------------------------------------- event_items -
drop policy if exists event_items_select on public.event_items;
create policy event_items_select on public.event_items
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists event_items_insert on public.event_items;
create policy event_items_insert on public.event_items
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists event_items_update on public.event_items;
create policy event_items_update on public.event_items
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists event_items_delete on public.event_items;
create policy event_items_delete on public.event_items
  for delete to authenticated using (user_id = (select auth.uid()));

-- ----------------------------------------------- immutable tables (SELECT) ---
-- No insert/update/delete policies: writes flow through SECURITY DEFINER
-- functions that enforce invariants. Absence of a policy = denied under RLS.

drop policy if exists production_batches_select on public.production_batches;
create policy production_batches_select on public.production_batches
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists sales_select on public.sales;
create policy sales_select on public.sales
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists sale_items_select on public.sale_items;
create policy sale_items_select on public.sale_items
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists inventory_ledger_select on public.inventory_ledger;
create policy inventory_ledger_select on public.inventory_ledger
  for select to authenticated using (user_id = (select auth.uid()));
