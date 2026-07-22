# Architecture

## Overview

ForgeStock is a Next.js 15 App Router application backed by Supabase (Postgres +
Auth + Storage). It is mobile-first and offline-capable for the one workflow that
must never fail at a market: **recording sales in Event Mode**.

```
Browser (React 19 / Client Components)
  │  ├─ Server Actions  ──► Supabase (RLS, security-invoker) — ordinary writes
  │  ├─ Route Handlers  ──► Supabase RPC (create_sale / void_sale) — sales API
  │  └─ IndexedDB queue ──► /api/sales (idempotent) — offline sync
  ▼
Server Components (SSR via @supabase/ssr cookies) ──► Supabase (RLS) — reads
```

## Layers

### Configuration & identity
- `src/config/app.ts` — app name (`NEXT_PUBLIC_APP_NAME`), defaults, payment
  methods, tax modes. Single rename point.
- `src/lib/env.ts` — lazy, validated env access; never throws at module scope.

### Money & calculations (pure, tested)
- `src/lib/money.ts` — integer-cents helpers, rounding (half-away-from-zero),
  dollar/percent parsing, formatting.
- `src/lib/calc.ts` — batch cost, discounts, tax (both modes), whole-sale totals,
  margin, inventory-from-ledger, event-remaining. **The only place money math
  lives.** The SQL functions mirror these formulas exactly.
- `src/lib/validation.ts` — Zod schemas shared by client forms and server writes.

### Data access
- `src/lib/supabase/{client,server,middleware}.ts` — browser, server (cookie SSR),
  and middleware Supabase clients, all lazily built.
- `src/lib/data/queries.ts`, `src/lib/data/dashboard.ts` — server-side read helpers
  used by Server Components.
- `src/lib/storage.ts` — signed URLs for the private product-images bucket.

### Mutations
- **Server Actions** (`src/lib/actions/*`): settings, categories, products,
  inventory (batch/adjust via RPC), events (CRUD, allocate, open/close/reopen via
  RPC), demo data, CSV import.
- **Route Handlers** (`src/app/api/*`): `POST /api/sales` (create, used online and
  by offline sync), `POST /api/sales/void`, and CSV export endpoints.

### Offline
- `src/lib/offline/db.ts` — `idb`-backed operation queue + event cache.
- `src/lib/offline/event-sales.ts` — local-first record → optimistic UI → immediate
  sync (capturing the server sale id for Undo-void) → queue on failure.
- `src/lib/offline/sync.ts` — sequential, idempotent flush of the queue.
- `src/components/pwa/sync-provider.tsx` — online/syncing/pending context; auto-sync
  on reconnect + periodic; drives the sync indicator and queued-count badge.
- `public/sw.js` + `src/app/manifest.ts` — service worker (network-first
  navigations, SWR static assets, `/offline` fallback) and web manifest.

### UI
- `src/components/ui/*` — shadcn/ui-style Radix primitives (button, input, dialog,
  sheet, select, dropdown, tabs, switch, checkbox, badge, skeleton, money-input…).
- Route groups: `(auth)` (public auth pages), `(app)` (side-nav + bottom-nav
  chrome), `(fullscreen)` (chrome-free Event Mode). Both authenticated groups
  provide `AppSettingsProvider` (currency/timezone) + `SyncProvider`.

## Route map

```
(auth)        /login /signup /forgot-password /reset-password
(app)         /dashboard /inventory /activity /settings /more
              /products /products/new /products/[id] /products/import
              /prints/new
              /events /events/new /events/[id] /events/[id]/summary
(fullscreen)  /events/[id]/mode
api           /api/sales  /api/sales/void
              /api/export/{inventory,products,sales}
              /api/export/event/[id]  /api/export/event/[id]/lines
              /auth/callback
```

Each `(app)` route inherits `loading`, `error`, and the global `not-found` states.

## Key invariants

- **Inventory = Σ ledger deltas.** No editable stock column.
- **Money = integer cents; tax = integer bps.** One formula source.
- **Immutable history.** Sales/ledger/batches are append-only; corrections reverse.
- **Idempotency.** Every sale carries a client UUID; the DB unique constraint +
  function replay guarantee no duplicates across retries or refreshes.
- **Ownership everywhere.** RLS + explicit `auth.uid()` checks in functions.
