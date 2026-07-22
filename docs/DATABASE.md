# Database

Postgres on Supabase. UUID primary keys, UTC `timestamptz`. Money is integer
cents; tax rates integer basis points (bps). Migrations live in
`supabase/migrations/` and run in numeric order.

## Migrations

| File | Contents |
| --- | --- |
| `0001_schema.sql` | Enums, `set_updated_at` trigger, all tables, constraints, indexes |
| `0002_rls.sql` | RLS enabled + owner-scoped policies (immutable tables are SELECT-only) |
| `0003_functions.sql` | Transactional functions + helpers, hardened & granted |
| `0004_views.sql` | Security-invoker reporting views |
| `0005_auth_profile.sql` | `handle_new_user` trigger → auto-create profile row |
| `0006_storage.sql` | Private `product-images` bucket + owner-scoped policies |
| `0007_demo_data.sql` | `delete_demo_data()` cleanup function |

## Tables

- **profiles** — `user_id` (PK → `auth.users`), business_name, timezone, currency,
  default_tax_rate_bps, default_tax_mode, default_filament_cost_per_kg_cents,
  default_machine_cost_per_hour_cents, default_payment_method,
  default_low_stock_threshold, onboarding_completed, timestamps.
- **categories** — id, user_id, name (citext), sort_order, is_archived, timestamps.
  Unique `(user_id, name)` among active rows.
- **products** — id, user_id, category_id, sku, name, brand_line, description,
  image_path, default_price_cents, estimated_print_time_minutes,
  estimated_filament_grams, other_unit_cost_cents, low_stock_threshold,
  is_favorite, is_archived, timestamps. Unique `(user_id, sku)` when present.
- **production_batches** — id, user_id, product_id, printed_at, quantity_started,
  quantity_successful, quantity_failed, total_print_time_minutes,
  total_filament_grams, filament/machine cost snapshots, other_batch_cost_cents,
  calculated_{material,machine,total,unit}_cost_cents, notes, created_at.
  Check: `successful + failed ≤ started`.
- **events** — id, user_id, name, venue, location, starts_at, ends_at, status
  (`draft|open|closed`), tax_rate_bps, tax_mode, default_payment_method, notes,
  opened_at, closed_at, timestamps.
- **event_items** — id, user_id, event_id, product_id, quantity_brought,
  event_price_cents, timestamps. Unique `(event_id, product_id)`.
- **sales** — id, user_id, event_id, status (`completed|voided`), idempotency_key,
  subtotal/discount/taxable/tax/total cents, tax_rate_bps, tax_mode,
  payment_method, notes, sold_at, voided_at, void_reason, created_at.
  Unique `(user_id, idempotency_key)`.
- **sale_items** — id, user_id, sale_id, product_id, quantity, list/sold unit price
  cents, line_subtotal_cents, line_discount_cents, unit_cost_cents_snapshot,
  cogs_cents, created_at.
- **inventory_ledger** — id, user_id, product_id, event_id, sale_id,
  production_batch_id, transaction_type, quantity_delta (≠ 0),
  unit_cost_cents_snapshot, note, reversal_of_id, idempotency_key, created_at.
  Unique `(user_id, idempotency_key)` when set.

Ledger transaction types: `printed, sold, gifted, damaged, returned,
manual_increase, manual_decrease, sale_reversal, adjustment_reversal`.

## Views (security_invoker)

- **v_product_inventory** — per product: on_hand, weighted-avg unit_cost_cents,
  inventory_value_cents, retail_value_cents, is_low_stock, plus catalog fields.
- **v_event_item_summary** — per event_item: brought, sold, gifted, damaged,
  remaining, effective price, unit cost.
- **v_event_financials** — per event: sales_count, subtotal, discount, tax,
  total_collected, cogs, gross_profit, and unit tallies.
- **v_event_payment_breakdown** — per event × payment method: count + total.

Dashboard summary is composed from `v_product_inventory` + a sales query in
`src/lib/data/dashboard.ts`.

## Functions (SECURITY DEFINER — hardened)

All set `search_path=''`, verify `auth.uid()`, check ownership on every row,
are revoked from `public` and granted to `authenticated`. See CLAUDE.md for why.

- **record_print_batch(...)** — validate → compute costs server-side → insert batch
  → add `printed` ledger entry for successful qty (atomic) → return totals + on-hand.
- **record_inventory_adjustment(product, type, qty, note[, event])** — validate,
  require note for manual corrections, block negative stock, insert one ledger entry.
- **create_sale(payload jsonb)** — auth → idempotency replay → event open → product
  belongs to event → event remaining ≥ qty → global stock ≥ qty → compute all money
  server-side → insert sale + items + negative ledger entries. Atomic.
- **void_sale(sale, reason)** — mark voided (once), write `sale_reversal` entries
  referencing the originals; never deletes.
- **open_event(event)** — block if any allocation exceeds available stock; set open.
- **close_event(event)** / **reopen_event(event)** — status transitions; preserve
  all records.
- Helpers: `product_on_hand`, `product_unit_cost`, `event_remaining`.
- **delete_demo_data()** — removes only `brand_line = 'ForgeStock Demo'` data.

## Security checklist

- RLS enabled on all nine tables; policies carry explicit ownership; update
  policies have `USING` + `WITH CHECK`.
- Immutable tables expose SELECT only; writes flow through the functions above.
- Storage bucket private; policies gate on the `<user-id>/` path prefix; MIME +
  5 MB size limits on the bucket.
- No service-role key; only the publishable/anon key reaches the browser.
- Run Supabase's **Database** and **Security** advisors after applying migrations
  and resolve any material warnings.
