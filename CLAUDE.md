# CLAUDE.md — working rules for ForgeStock

Guidance for Claude Code / Codex sessions working in this repo. Read this before
changing anything. `AGENTS.md` is a copy of these rules for other agents.

## Commands

```bash
npm run dev | build | start
npm run lint          # must stay clean
npm run typecheck     # tsc --noEmit, strict — never suppress errors
npm run test          # Vitest unit tests — must pass
npm run test:e2e      # Playwright smoke (needs live backend + E2E_EMAIL/E2E_PASSWORD)
npm run db:types      # regenerate Supabase types (needs CLI)
```

Always run `lint`, `typecheck`, `test`, and `build` before considering a change done.

## Architecture boundaries

- **Next.js App Router.** Server Components fetch data; push Client Components as
  far down the tree as practical (`"use client"` only where interactivity needs it).
- **Mutations:** ordinary authenticated writes use **Server Actions**
  (`src/lib/actions/*`). Offline sync and the sale/void HTTP API use **Route
  Handlers** (`src/app/api/*`).
- **Supabase clients** are lazily constructed (`src/lib/supabase/{client,server,middleware}.ts`)
  and read env through `src/lib/env.ts`. **Never** initialize an SDK at module
  scope in a way that throws when env is missing at build time.
- **No service-role key.** Everything goes through authenticated users + RLS +
  hardened DB functions. Never add a service-role key or put secrets in
  `NEXT_PUBLIC_*`.

## Money rules (critical)

- All money is **integer cents**. Never store or compute money as floats.
- Tax rates are **integer basis points** (bps): `800` = 8.00%.
- Every money formula lives in **`src/lib/calc.ts`** and rounding in
  **`src/lib/money.ts`** (`roundCents`, half-away-from-zero). Do **not** duplicate
  money math in components or actions — import from `calc.ts`. The server DB
  functions mirror these exact formulas; keep them in sync.

## Inventory-ledger rules (critical)

- `inventory_ledger` is the **single source of truth**. On-hand = sum of signed
  `quantity_delta`. There is **no authoritative editable `stock_quantity` column** —
  do not add one.
- Ledger rows, sales, sale_items, and production_batches are **append-only /
  immutable**. They expose **SELECT-only** RLS; all writes go through the
  transactional DB functions. Corrections are **reversing transactions**
  (`sale_reversal`, `adjustment_reversal`), never edits or deletes.
- `quantity_delta` is never 0. Idempotency keys prevent duplicate writes.

## Authentication & RLS rules

- Supabase email/password via the current `@supabase/ssr` cookie pattern. Never use
  the deprecated `@supabase/auth-helpers-nextjs`.
- Middleware (`middleware.ts`) refreshes the session and protects every route except
  `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/*`, `/offline`.
- **RLS is enabled on every table.** Every policy carries an explicit ownership
  condition (`user_id = auth.uid()`); update policies have both `USING` and
  `WITH CHECK`. Do not rely on `TO authenticated` alone. Do not use user-editable
  metadata for authorization.
- Storage bucket `product-images` is private; files live under `<user-id>/…` and
  policies restrict every op to that prefix.

## SECURITY DEFINER

Only the transactional functions in `supabase/migrations/0003_functions.sql`
(and `0005`, `0007`) are `SECURITY DEFINER`, and only because they write across
immutable tables enforcing invariants that must not be exposed. Each one sets
`search_path = ''`, verifies `auth.uid()`, checks ownership on every referenced
row, and is revoked from `public`/granted only to `authenticated`. Do **not** add
`SECURITY DEFINER` to solve a permission problem casually — prefer RLS +
security-invoker.

## Event Mode priorities

`/events/[id]/mode` is the most important screen. Optimize for a phone
360–430px wide, one-handed, high-contrast dark, ≥48px touch targets. **Quick Sell
1 must stay instant** — never let the cart, animations, or extra text entry slow
it down. Sales are local-first (IndexedDB) and synced idempotently; never claim a
sale is server-confirmed until it is.

## Testing expectations

Pure business logic lives in `src/lib/calc.ts` / `money.ts` and is thoroughly unit
tested (`tests/unit/`). When you change a formula, update the tests. The DB
function semantics are mirrored by an in-memory model test
(`tests/unit/ledger-model.test.ts`). Keep the Playwright critical path
(`tests/e2e/critical-path.spec.ts`) meaningful.

## Sources of truth

- Schema: `supabase/migrations/*` (numbered, ordered).
- DB types: `src/lib/supabase/database.types.ts` (regenerate with `npm run db:types`).
- App name: `src/config/app.ts` + `NEXT_PUBLIC_APP_NAME`.
- Money/calc: `src/lib/calc.ts`, `src/lib/money.ts`.
- Validation: `src/lib/validation.ts` (Zod, shared client/server).

## Do not

- Do **not** replace the immutable ledger with an editable stock count.
- Do **not** duplicate money formulas across components.
- Do **not** turn this into a full POS (Stripe, checkout, customer accounts,
  receipts, storefront, accounting) without an explicit future decision.
- Do **not** commit real credentials or leak secret values in error messages.
