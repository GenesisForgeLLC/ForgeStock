-- =============================================================================
-- Transactional business functions
--
-- WHY SECURITY DEFINER:
--   These operations write across several immutable tables while enforcing
--   invariants that must never be bypassed (idempotency, non-negative stock,
--   append-only history). The immutable tables deliberately expose no
--   INSERT/UPDATE/DELETE RLS policies, so the only sanctioned way to write to
--   them is through these functions. Each function:
--     * runs with `set search_path = ''` and fully-qualified names,
--     * verifies auth.uid() is present and owns every referenced row,
--     * is revoked from PUBLIC/anon and granted only to `authenticated`.
--   PostgREST can only call functions in an exposed schema, so they live in
--   `public`; the hardening above makes that safe.
-- =============================================================================

-- ------------------------------------------------------- helper: on hand ----
create or replace function public.product_on_hand(p_product_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(l.quantity_delta), 0)::int
  from public.inventory_ledger l
  where l.product_id = p_product_id
    and l.user_id = (select auth.uid());
$$;

-- ------------------------------------------------ helper: current unit cost --
create or replace function public.product_unit_cost(p_product_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  -- Weighted-average cost across all "printed" ledger entries that carry a
  -- cost snapshot. Falls back to the product's other_unit_cost when unknown.
  select coalesce(
    nullif(
      round(
        sum(l.quantity_delta * l.unit_cost_cents_snapshot)::numeric
        / nullif(sum(l.quantity_delta), 0)
      ), 0
    )::int,
    (select p.other_unit_cost_cents from public.products p where p.id = p_product_id),
    0
  )
  from public.inventory_ledger l
  where l.product_id = p_product_id
    and l.user_id = (select auth.uid())
    and l.transaction_type = 'printed'
    and l.unit_cost_cents_snapshot is not null
    and l.quantity_delta > 0;
$$;

-- ------------------------------------------------ helper: event remaining ----
create or replace function public.event_remaining(p_event_id uuid, p_product_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    0,
    coalesce((
      select ei.quantity_brought from public.event_items ei
      where ei.event_id = p_event_id and ei.product_id = p_product_id
    ), 0)
    + coalesce((
      select sum(l.quantity_delta) from public.inventory_ledger l
      where l.event_id = p_event_id
        and l.product_id = p_product_id
        and l.user_id = (select auth.uid())
    ), 0)
  )::int;
$$;

-- ============================================================================
-- 1. record_print_batch
-- ============================================================================
create or replace function public.record_print_batch(
  p_product_id uuid,
  p_printed_at timestamptz,
  p_quantity_started int,
  p_quantity_successful int,
  p_quantity_failed int,
  p_total_print_time_minutes numeric,
  p_total_filament_grams numeric,
  p_filament_cost_per_kg_cents int,
  p_machine_cost_per_hour_cents int,
  p_other_batch_cost_cents int,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_material int;
  v_machine int;
  v_total int;
  v_unit int;
  v_batch_id uuid;
  v_on_hand int;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  if not exists (select 1 from public.products where id = p_product_id and user_id = v_uid) then
    raise exception 'Product not found or not owned';
  end if;

  if p_quantity_started is null or p_quantity_started <= 0 then
    raise exception 'quantity_started must be > 0';
  end if;
  if p_quantity_successful < 0 or p_quantity_failed < 0 then
    raise exception 'quantities cannot be negative';
  end if;
  if p_quantity_successful + p_quantity_failed > p_quantity_started then
    raise exception 'successful + failed cannot exceed started';
  end if;
  if p_filament_cost_per_kg_cents < 0 or p_machine_cost_per_hour_cents < 0
     or coalesce(p_other_batch_cost_cents,0) < 0 then
    raise exception 'costs cannot be negative';
  end if;

  v_material := round((coalesce(p_total_filament_grams,0) / 1000.0) * p_filament_cost_per_kg_cents)::int;
  v_machine  := round((coalesce(p_total_print_time_minutes,0) / 60.0) * p_machine_cost_per_hour_cents)::int;
  v_total    := v_material + v_machine + coalesce(p_other_batch_cost_cents, 0);
  v_unit     := case when p_quantity_successful > 0
                     then round(v_total::numeric / p_quantity_successful)::int
                     else 0 end;

  insert into public.production_batches (
    user_id, product_id, printed_at, quantity_started, quantity_successful,
    quantity_failed, total_print_time_minutes, total_filament_grams,
    filament_cost_per_kg_cents_snapshot, machine_cost_per_hour_cents_snapshot,
    other_batch_cost_cents, calculated_material_cost_cents,
    calculated_machine_cost_cents, calculated_total_cost_cents,
    calculated_unit_cost_cents, notes
  ) values (
    v_uid, p_product_id, coalesce(p_printed_at, now()), p_quantity_started,
    p_quantity_successful, p_quantity_failed, coalesce(p_total_print_time_minutes,0),
    coalesce(p_total_filament_grams,0), p_filament_cost_per_kg_cents,
    p_machine_cost_per_hour_cents, coalesce(p_other_batch_cost_cents,0),
    v_material, v_machine, v_total, v_unit, p_notes
  ) returning id into v_batch_id;

  if p_quantity_successful > 0 then
    insert into public.inventory_ledger (
      user_id, product_id, production_batch_id, transaction_type,
      quantity_delta, unit_cost_cents_snapshot, note
    ) values (
      v_uid, p_product_id, v_batch_id, 'printed',
      p_quantity_successful, v_unit, 'Print batch'
    );
  end if;

  v_on_hand := public.product_on_hand(p_product_id);

  return jsonb_build_object(
    'batch_id', v_batch_id,
    'material_cost_cents', v_material,
    'machine_cost_cents', v_machine,
    'total_cost_cents', v_total,
    'unit_cost_cents', v_unit,
    'on_hand', v_on_hand
  );
end;
$$;

-- ============================================================================
-- 2. record_inventory_adjustment
-- ============================================================================
create or replace function public.record_inventory_adjustment(
  p_product_id uuid,
  p_transaction_type text,
  p_quantity int,
  p_note text,
  p_event_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_delta int;
  v_on_hand int;
  v_unit_cost int;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  if not exists (select 1 from public.products where id = p_product_id and user_id = v_uid) then
    raise exception 'Product not found or not owned';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be > 0';
  end if;
  if p_transaction_type not in
     ('gifted','damaged','returned','manual_increase','manual_decrease') then
    raise exception 'invalid adjustment type: %', p_transaction_type;
  end if;
  if p_transaction_type in ('manual_increase','manual_decrease')
     and (p_note is null or length(trim(p_note)) = 0) then
    raise exception 'a note is required for manual corrections';
  end if;

  v_delta := case p_transaction_type
    when 'gifted' then -p_quantity
    when 'damaged' then -p_quantity
    when 'manual_decrease' then -p_quantity
    when 'returned' then p_quantity
    when 'manual_increase' then p_quantity
  end;

  v_on_hand := public.product_on_hand(p_product_id);
  if v_on_hand + v_delta < 0 then
    raise exception 'adjustment would make stock negative (on hand %, delta %)', v_on_hand, v_delta;
  end if;

  v_unit_cost := public.product_unit_cost(p_product_id);

  insert into public.inventory_ledger (
    user_id, product_id, event_id, transaction_type, quantity_delta,
    unit_cost_cents_snapshot, note
  ) values (
    v_uid, p_product_id, p_event_id, p_transaction_type::public.ledger_txn_type,
    v_delta, v_unit_cost, p_note
  );

  return jsonb_build_object(
    'on_hand', public.product_on_hand(p_product_id),
    'delta', v_delta
  );
end;
$$;

-- ============================================================================
-- 3. create_sale  (atomic; idempotent)
-- ============================================================================
create or replace function public.create_sale(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_idem uuid := (payload->>'idempotency_key')::uuid;
  v_event_id uuid := nullif(payload->>'event_id','')::uuid;
  v_tax_rate int := coalesce((payload->>'tax_rate_bps')::int, 0);
  v_tax_mode public.tax_mode := coalesce((payload->>'tax_mode'), 'add_on')::public.tax_mode;
  v_payment public.payment_method := coalesce((payload->>'payment_method'),'cash')::public.payment_method;
  v_discount_bps int := coalesce((payload->>'discount_bps')::int, 0);
  v_discount_fixed int := coalesce((payload->>'discount_fixed_cents')::int, 0);
  v_notes text := payload->>'notes';
  v_sold_at timestamptz := coalesce(nullif(payload->>'sold_at','')::timestamptz, now());
  v_existing public.sales%rowtype;
  v_line jsonb;
  v_subtotal int := 0;
  v_cogs int := 0;
  v_pct_disc int;
  v_after_pct int;
  v_fixed_disc int;
  v_discount int;
  v_after_disc int;
  v_taxable int;
  v_tax int;
  v_total int;
  v_sale_id uuid;
  v_event_status public.event_status;
  r record;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if v_idem is null then raise exception 'idempotency_key required'; end if;

  -- Idempotency: return the already-processed sale unchanged.
  select * into v_existing from public.sales
    where user_id = v_uid and idempotency_key = v_idem;
  if found then
    return jsonb_build_object('sale_id', v_existing.id, 'idempotent', true,
      'status', v_existing.status, 'total_cents', v_existing.total_cents);
  end if;

  if jsonb_array_length(payload->'lines') = 0 then
    raise exception 'sale requires at least one line';
  end if;

  -- Event validation.
  if v_event_id is not null then
    select status into v_event_status from public.events
      where id = v_event_id and user_id = v_uid;
    if not found then raise exception 'event not found or not owned'; end if;
    if v_event_status <> 'open' then raise exception 'event is not open'; end if;
  end if;

  -- Build a working set of resolved lines with server-side prices & costs.
  create temp table _lines (
    product_id uuid, quantity int, list_price int, sold_price int,
    unit_cost int, line_subtotal int, line_cogs int
  ) on commit drop;

  for v_line in select * from jsonb_array_elements(payload->'lines')
  loop
    declare
      l_pid uuid := (v_line->>'product_id')::uuid;
      l_qty int := (v_line->>'quantity')::int;
      l_list int := coalesce((v_line->>'list_unit_price_cents')::int, 0);
      l_sold int := coalesce((v_line->>'sold_unit_price_cents')::int, 0);
      l_cost int;
      l_remaining int;
      l_on_hand int;
    begin
      if l_qty is null or l_qty <= 0 then raise exception 'line quantity must be > 0'; end if;
      if l_sold < 0 or l_list < 0 then raise exception 'prices cannot be negative'; end if;

      if not exists (select 1 from public.products where id = l_pid and user_id = v_uid) then
        raise exception 'product % not found or not owned', l_pid;
      end if;

      if v_event_id is not null then
        if not exists (select 1 from public.event_items
                       where event_id = v_event_id and product_id = l_pid) then
          raise exception 'product % is not allocated to this event', l_pid;
        end if;
        l_remaining := public.event_remaining(v_event_id, l_pid);
        if l_qty > l_remaining then
          raise exception 'only % remaining at event for product %', l_remaining, l_pid;
        end if;
      end if;

      l_on_hand := public.product_on_hand(l_pid);
      if l_qty > l_on_hand then
        raise exception 'only % in stock for product %', l_on_hand, l_pid;
      end if;

      l_cost := public.product_unit_cost(l_pid);

      insert into _lines values (
        l_pid, l_qty, l_list, l_sold, l_cost, l_qty * l_sold, l_qty * l_cost
      );
      v_subtotal := v_subtotal + l_qty * l_sold;
      v_cogs := v_cogs + l_qty * l_cost;
    end;
  end loop;

  -- Money: percentage discount first, then fixed dollars, then tax.
  v_pct_disc := least(round(v_subtotal::numeric * v_discount_bps / 10000)::int, v_subtotal);
  v_after_pct := v_subtotal - v_pct_disc;
  v_fixed_disc := least(greatest(v_discount_fixed, 0), v_after_pct);
  v_discount := v_pct_disc + v_fixed_disc;
  v_after_disc := v_subtotal - v_discount;

  if v_tax_mode = 'inclusive' then
    v_total := v_after_disc;
    v_taxable := round(v_total::numeric / (1 + v_tax_rate::numeric / 10000))::int;
    v_tax := v_total - v_taxable;
  else
    v_taxable := v_after_disc;
    v_tax := round(v_after_disc::numeric * v_tax_rate / 10000)::int;
    v_total := v_after_disc + v_tax;
  end if;

  insert into public.sales (
    user_id, event_id, status, idempotency_key, subtotal_cents, discount_cents,
    taxable_amount_cents, tax_cents, total_cents, tax_rate_bps, tax_mode,
    payment_method, notes, sold_at
  ) values (
    v_uid, v_event_id, 'completed', v_idem, v_subtotal, v_discount, v_taxable,
    v_tax, v_total, v_tax_rate, v_tax_mode, v_payment, v_notes, v_sold_at
  ) returning id into v_sale_id;

  -- Allocate the transaction discount across lines proportional to subtotal.
  for r in select * from _lines loop
    declare
      l_line_disc int := case when v_subtotal > 0
        then round(v_discount::numeric * r.line_subtotal / v_subtotal)::int else 0 end;
    begin
      insert into public.sale_items (
        user_id, sale_id, product_id, quantity, list_unit_price_cents,
        sold_unit_price_cents, line_subtotal_cents, line_discount_cents,
        unit_cost_cents_snapshot, cogs_cents
      ) values (
        v_uid, v_sale_id, r.product_id, r.quantity, r.list_price, r.sold_price,
        r.line_subtotal, l_line_disc, r.unit_cost, r.line_cogs
      );

      insert into public.inventory_ledger (
        user_id, product_id, event_id, sale_id, transaction_type,
        quantity_delta, unit_cost_cents_snapshot, note
      ) values (
        v_uid, r.product_id, v_event_id, v_sale_id, 'sold',
        -r.quantity, r.unit_cost, 'Sale'
      );
    end;
  end loop;

  return jsonb_build_object(
    'sale_id', v_sale_id, 'idempotent', false, 'status', 'completed',
    'subtotal_cents', v_subtotal, 'discount_cents', v_discount,
    'tax_cents', v_tax, 'total_cents', v_total, 'cogs_cents', v_cogs
  );
end;
$$;

-- ============================================================================
-- 4. void_sale
-- ============================================================================
create or replace function public.void_sale(p_sale_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_sale public.sales%rowtype;
  r record;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_sale from public.sales
    where id = p_sale_id and user_id = v_uid for update;
  if not found then raise exception 'sale not found or not owned'; end if;
  if v_sale.status = 'voided' then raise exception 'sale already voided'; end if;

  update public.sales
    set status = 'voided', voided_at = now(), void_reason = p_reason
    where id = p_sale_id;

  -- Reverse each original inventory movement (append-only correction).
  for r in
    select * from public.inventory_ledger
    where sale_id = p_sale_id and user_id = v_uid and transaction_type = 'sold'
  loop
    insert into public.inventory_ledger (
      user_id, product_id, event_id, sale_id, transaction_type,
      quantity_delta, unit_cost_cents_snapshot, note, reversal_of_id
    ) values (
      v_uid, r.product_id, r.event_id, p_sale_id, 'sale_reversal',
      -r.quantity_delta, r.unit_cost_cents_snapshot, 'Void of sale', r.id
    );
  end loop;

  return jsonb_build_object('sale_id', p_sale_id, 'status', 'voided');
end;
$$;

-- ============================================================================
-- 5. open_event  (validates allocations do not exceed available stock)
-- ============================================================================
create or replace function public.open_event(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_status public.event_status;
  r record;
  v_on_hand int;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select status into v_status from public.events
    where id = p_event_id and user_id = v_uid for update;
  if not found then raise exception 'event not found or not owned'; end if;
  if v_status = 'open' then return jsonb_build_object('event_id', p_event_id, 'status','open'); end if;
  if v_status = 'closed' then raise exception 'closed events cannot be reopened here'; end if;

  for r in
    select product_id, quantity_brought from public.event_items
    where event_id = p_event_id and user_id = v_uid and quantity_brought > 0
  loop
    v_on_hand := public.product_on_hand(r.product_id);
    if r.quantity_brought > v_on_hand then
      raise exception 'allocation (%) exceeds available stock (%) for a product', r.quantity_brought, v_on_hand;
    end if;
  end loop;

  update public.events
    set status = 'open', opened_at = coalesce(opened_at, now())
    where id = p_event_id;

  return jsonb_build_object('event_id', p_event_id, 'status', 'open');
end;
$$;

-- ============================================================================
-- 6. close_event
-- ============================================================================
create or replace function public.close_event(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_status public.event_status;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select status into v_status from public.events
    where id = p_event_id and user_id = v_uid for update;
  if not found then raise exception 'event not found or not owned'; end if;
  if v_status = 'closed' then return jsonb_build_object('event_id', p_event_id, 'status','closed'); end if;

  update public.events
    set status = 'closed', closed_at = now()
    where id = p_event_id;

  return jsonb_build_object('event_id', p_event_id, 'status', 'closed');
end;
$$;

-- ============================================================================
-- 7. reopen_event  (explicit)
-- ============================================================================
create or replace function public.reopen_event(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_status public.event_status;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select status into v_status from public.events
    where id = p_event_id and user_id = v_uid for update;
  if not found then raise exception 'event not found or not owned'; end if;

  update public.events
    set status = 'open', closed_at = null
    where id = p_event_id;
  return jsonb_build_object('event_id', p_event_id, 'status', 'open');
end;
$$;

-- --------------------------------------------------------- grants (harden) ---
revoke all on function public.product_on_hand(uuid) from public;
revoke all on function public.product_unit_cost(uuid) from public;
revoke all on function public.event_remaining(uuid, uuid) from public;
revoke all on function public.record_print_batch(uuid,timestamptz,int,int,int,numeric,numeric,int,int,int,text) from public;
revoke all on function public.record_inventory_adjustment(uuid,text,int,text,uuid) from public;
revoke all on function public.create_sale(jsonb) from public;
revoke all on function public.void_sale(uuid,text) from public;
revoke all on function public.open_event(uuid) from public;
revoke all on function public.close_event(uuid) from public;
revoke all on function public.reopen_event(uuid) from public;

grant execute on function public.product_on_hand(uuid) to authenticated;
grant execute on function public.product_unit_cost(uuid) to authenticated;
grant execute on function public.event_remaining(uuid, uuid) to authenticated;
grant execute on function public.record_print_batch(uuid,timestamptz,int,int,int,numeric,numeric,int,int,int,text) to authenticated;
grant execute on function public.record_inventory_adjustment(uuid,text,int,text,uuid) to authenticated;
grant execute on function public.create_sale(jsonb) to authenticated;
grant execute on function public.void_sale(uuid,text) to authenticated;
grant execute on function public.open_event(uuid) to authenticated;
grant execute on function public.close_event(uuid) to authenticated;
grant execute on function public.reopen_event(uuid) to authenticated;
