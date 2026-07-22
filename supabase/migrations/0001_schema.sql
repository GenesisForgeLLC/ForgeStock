-- =============================================================================
-- ForgeStock schema
-- 3D Print Inventory & Vendor Event Manager
--
-- Money is stored as integer cents. Tax rates as integer basis points (bps).
-- Inventory is derived from the immutable `inventory_ledger`; there is no
-- authoritative editable stock column.
-- =============================================================================

create extension if not exists "pgcrypto";     -- gen_random_uuid()
create extension if not exists "citext";        -- case-insensitive text

-- ------------------------------------------------------------------ enums ---
do $$ begin
  create type tax_mode as enum ('add_on', 'inclusive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('cash', 'card', 'venmo', 'cashapp', 'paypal', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_status as enum ('draft', 'open', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sale_status as enum ('completed', 'voided');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ledger_txn_type as enum (
    'printed',
    'sold',
    'gifted',
    'damaged',
    'returned',
    'manual_increase',
    'manual_decrease',
    'sale_reversal',
    'adjustment_reversal'
  );
exception when duplicate_object then null; end $$;

-- --------------------------------------------------------------- updated_at --
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------------ profiles -
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null default 'Genesis Forge',
  timezone text not null default 'America/New_York',
  currency text not null default 'USD',
  default_tax_rate_bps integer not null default 800
    check (default_tax_rate_bps between 0 and 10000),
  default_tax_mode tax_mode not null default 'add_on',
  default_filament_cost_per_kg_cents integer not null default 2500
    check (default_filament_cost_per_kg_cents >= 0),
  default_machine_cost_per_hour_cents integer not null default 50
    check (default_machine_cost_per_hour_cents >= 0),
  default_payment_method payment_method not null default 'cash',
  default_low_stock_threshold integer not null default 5
    check (default_low_stock_threshold >= 0),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- categories -
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name citext not null,
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_not_blank check (length(trim(name)) > 0)
);

-- Category names unique per user among active categories.
create unique index if not exists categories_user_active_name_uniq
  on public.categories (user_id, name)
  where is_archived = false;

create index if not exists categories_user_idx on public.categories (user_id);

create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------ products -
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  sku text,
  name text not null,
  brand_line text,
  description text,
  image_path text,
  default_price_cents integer not null default 0 check (default_price_cents >= 0),
  estimated_print_time_minutes integer not null default 0
    check (estimated_print_time_minutes >= 0),
  estimated_filament_grams numeric(10,2) not null default 0
    check (estimated_filament_grams >= 0),
  other_unit_cost_cents integer not null default 0 check (other_unit_cost_cents >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  is_favorite boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_name_not_blank check (length(trim(name)) > 0)
);

-- SKU unique per user when present.
create unique index if not exists products_user_sku_uniq
  on public.products (user_id, sku)
  where sku is not null and length(trim(sku)) > 0;

create index if not exists products_user_idx on public.products (user_id);
create index if not exists products_category_idx on public.products (category_id);

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------- production_batches -
create table if not exists public.production_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  printed_at timestamptz not null default now(),
  quantity_started integer not null check (quantity_started > 0),
  quantity_successful integer not null check (quantity_successful >= 0),
  quantity_failed integer not null check (quantity_failed >= 0),
  total_print_time_minutes numeric(10,2) not null default 0
    check (total_print_time_minutes >= 0),
  total_filament_grams numeric(10,2) not null default 0
    check (total_filament_grams >= 0),
  filament_cost_per_kg_cents_snapshot integer not null check (filament_cost_per_kg_cents_snapshot >= 0),
  machine_cost_per_hour_cents_snapshot integer not null check (machine_cost_per_hour_cents_snapshot >= 0),
  other_batch_cost_cents integer not null default 0 check (other_batch_cost_cents >= 0),
  calculated_material_cost_cents integer not null default 0,
  calculated_machine_cost_cents integer not null default 0,
  calculated_total_cost_cents integer not null default 0,
  calculated_unit_cost_cents integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  constraint batch_qty_consistent
    check (quantity_successful + quantity_failed <= quantity_started)
);

create index if not exists batches_user_idx on public.production_batches (user_id);
create index if not exists batches_product_idx on public.production_batches (product_id);

-- ---------------------------------------------------------------- events -----
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  venue text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  status event_status not null default 'draft',
  tax_rate_bps integer not null default 800 check (tax_rate_bps between 0 and 10000),
  tax_mode tax_mode not null default 'add_on',
  default_payment_method payment_method not null default 'cash',
  notes text,
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_name_not_blank check (length(trim(name)) > 0)
);

create index if not exists events_user_idx on public.events (user_id);
create index if not exists events_status_idx on public.events (user_id, status);

create trigger events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------- event_items --
create table if not exists public.event_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity_brought integer not null default 0 check (quantity_brought >= 0),
  event_price_cents integer check (event_price_cents is null or event_price_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_items_event_product_uniq unique (event_id, product_id)
);

create index if not exists event_items_user_idx on public.event_items (user_id);
create index if not exists event_items_event_idx on public.event_items (event_id);

create trigger event_items_updated_at
  before update on public.event_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- sales ------
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  status sale_status not null default 'completed',
  idempotency_key uuid not null,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  taxable_amount_cents integer not null default 0 check (taxable_amount_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  tax_rate_bps integer not null check (tax_rate_bps between 0 and 10000),
  tax_mode tax_mode not null,
  payment_method payment_method not null,
  notes text,
  sold_at timestamptz not null default now(),
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  constraint sales_user_idempotency_uniq unique (user_id, idempotency_key)
);

create index if not exists sales_user_idx on public.sales (user_id);
create index if not exists sales_event_idx on public.sales (event_id);
create index if not exists sales_sold_at_idx on public.sales (user_id, sold_at);

-- ------------------------------------------------------------- sale_items ----
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  list_unit_price_cents integer not null check (list_unit_price_cents >= 0),
  sold_unit_price_cents integer not null check (sold_unit_price_cents >= 0),
  line_subtotal_cents integer not null check (line_subtotal_cents >= 0),
  line_discount_cents integer not null default 0 check (line_discount_cents >= 0),
  unit_cost_cents_snapshot integer not null default 0 check (unit_cost_cents_snapshot >= 0),
  cogs_cents integer not null default 0 check (cogs_cents >= 0),
  created_at timestamptz not null default now()
);

create index if not exists sale_items_user_idx on public.sale_items (user_id);
create index if not exists sale_items_sale_idx on public.sale_items (sale_id);
create index if not exists sale_items_product_idx on public.sale_items (product_id);

-- --------------------------------------------------------- inventory_ledger --
create table if not exists public.inventory_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  event_id uuid references public.events(id) on delete set null,
  sale_id uuid references public.sales(id) on delete set null,
  production_batch_id uuid references public.production_batches(id) on delete set null,
  transaction_type ledger_txn_type not null,
  quantity_delta integer not null check (quantity_delta <> 0),
  unit_cost_cents_snapshot integer check (unit_cost_cents_snapshot is null or unit_cost_cents_snapshot >= 0),
  note text,
  reversal_of_id uuid references public.inventory_ledger(id) on delete set null,
  idempotency_key uuid,
  created_at timestamptz not null default now()
);

create index if not exists ledger_user_idx on public.inventory_ledger (user_id);
create index if not exists ledger_product_idx on public.inventory_ledger (product_id);
create index if not exists ledger_event_idx on public.inventory_ledger (event_id);
create index if not exists ledger_sale_idx on public.inventory_ledger (sale_id);
create index if not exists ledger_created_idx on public.inventory_ledger (user_id, created_at desc);

-- Idempotency for ledger writes (e.g. offline retries) unique per user when set.
create unique index if not exists ledger_user_idempotency_uniq
  on public.inventory_ledger (user_id, idempotency_key)
  where idempotency_key is not null;
