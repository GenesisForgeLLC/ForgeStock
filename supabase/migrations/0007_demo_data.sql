-- =============================================================================
-- Demo data helpers. Demo products are tagged with brand_line = 'ForgeStock Demo'
-- so they can be created and removed safely without touching real records.
-- delete_demo_data is SECURITY DEFINER because it must remove append-only rows
-- (ledger, sales) that are otherwise immutable; it only ever deletes the
-- caller's own demo-tagged data.
-- =============================================================================

create or replace function public.delete_demo_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_product_ids uuid[];
  v_removed int;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select array_agg(id) into v_product_ids
  from public.products
  where user_id = v_uid and brand_line = 'ForgeStock Demo';

  if v_product_ids is null then
    return jsonb_build_object('removed_products', 0);
  end if;

  delete from public.sale_items
    where user_id = v_uid
      and sale_id in (
        select id from public.sales where user_id = v_uid and event_id in (
          select id from public.events where user_id = v_uid and name = 'ForgeStock Demo Market'
        )
      );
  delete from public.sales
    where user_id = v_uid and event_id in (
      select id from public.events where user_id = v_uid and name = 'ForgeStock Demo Market'
    );
  delete from public.inventory_ledger
    where user_id = v_uid and product_id = any(v_product_ids);
  delete from public.event_items
    where user_id = v_uid and product_id = any(v_product_ids);
  delete from public.events
    where user_id = v_uid and name = 'ForgeStock Demo Market';
  delete from public.production_batches
    where user_id = v_uid and product_id = any(v_product_ids);

  delete from public.products
    where user_id = v_uid and id = any(v_product_ids);
  get diagnostics v_removed = row_count;

  return jsonb_build_object('removed_products', v_removed);
end;
$$;

revoke all on function public.delete_demo_data() from public;
grant execute on function public.delete_demo_data() to authenticated;
