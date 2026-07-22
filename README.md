# ForgeStock

**3D Print Inventory & Vendor Event Manager** — a private, mobile-first web app
for a small 3D-printing business (Genesis Forge). Built to be used from a phone
while standing behind a table at a vendor event: record print batches, know how
many of each item you have, allocate stock to an event, and mark items sold in
seconds — with offline support so a flaky venue connection never loses a sale.

> This is an inventory and event-sales **tracking** tool, not a full
> point-of-sale system. It intentionally has no card processing, customer
> accounts, storefront, or accounting integrations.

The app name is controlled from one place — `NEXT_PUBLIC_APP_NAME` (falling back
to the default in `src/config/app.ts`) — so it can be renamed later.

---

## Core features

- **Products** — name, SKU, category, brand line, notes, image (Supabase
  Storage), default price, print time, filament weight, extra cost, low-stock
  threshold, favorite, archive. Phone-camera image capture.
- **Production batches** — record started/successful/failed units, time, filament,
  and cost snapshots. Server computes material, machine, total, and per-unit cost.
  Failed prints raise the cost of the successful units. Adds to inventory atomically.
- **Inventory ledger** — the single source of truth. On-hand quantity is the sum of
  signed, immutable ledger transactions (printed / sold / gifted / damaged /
  returned / manual ± / reversals). History is never edited — corrections create
  reversing entries.
- **Events** — venue, location, dates, per-event tax rate/mode and payment default.
  Allocate products (quantity brought + optional event price) without removing them
  from global inventory. An event can't open if an allocation exceeds available stock.
- **Event Mode** (`/events/[id]/mode`) — full-screen, dark, one-handed selling.
  Sticky search, category filters, favorites first, Quick Sell 1 with Undo,
  custom-price/discount sheet with below-cost warning, and a multi-item cart.
- **Offline-first sales** — sales are queued in IndexedDB, applied optimistically,
  and synced idempotently when back online. Online / offline / syncing indicator and
  a live count of unsynced operations.
- **Void** — sales are never deleted; voiding marks the sale and writes reversing
  inventory transactions.
- **Reporting** — dashboard metrics, activity history, event summary (units, money,
  best sellers, no-sales, payment breakdown, profit/margin), and CSV exports.
- **PWA** — installable, offline fallback, cached app shell.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 3 ·
shadcn/ui-style Radix primitives · Supabase (Postgres + Auth + Storage) ·
`@supabase/ssr` (cookie SSR) · Zod · Lucide · Sonner · `idb` (IndexedDB) ·
Vitest · Playwright · deploy on Vercel.

---

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in your Supabase values
npm run dev                  # http://localhost:3000
```

### Environment variables (`.env.local`)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key — safe for the browser, protected by RLS |
| `NEXT_PUBLIC_APP_NAME` | Display name (default `ForgeStock`) |
| `NEXT_PUBLIC_APP_URL` | Public site URL (auth redirects, manifest) |

No service-role key is used. The app runs entirely through authenticated users,
RLS, and hardened database functions.

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. **Apply migrations** — either with the CLI or by pasting each file in
   `supabase/migrations/` (in order) into the SQL Editor:

   ```bash
   supabase link --project-ref <your-ref>
   supabase db push
   ```

   Migrations create the schema, RLS policies, transactional functions, reporting
   views, the auth→profile trigger, the storage bucket + policies, and demo-data
   helpers.
3. **Storage** — migration `0006_storage.sql` creates the private
   `product-images` bucket and owner-scoped policies (files live under
   `<user-id>/…`). No manual bucket creation needed.
4. **Types** (optional) — regenerate with `npm run db:types` (needs the CLI).
5. **Auth redirect URLs** — in Auth → URL Configuration, add your site URL and
   `<site>/auth/callback`. Email confirmations can be off for single-owner use.
6. **Advisors** — run the Database + Security advisors and confirm no material
   warnings (RLS is on for every table; functions are hardened — see
   `docs/DATABASE.md`).

See `docs/SETUP.md` for a step-by-step walkthrough.

---

## Scripts

```bash
npm run dev         # dev server
npm run build       # production build
npm run start       # run the production build
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run test        # Vitest unit tests
npm run test:e2e    # Playwright smoke test (needs a live backend + test account)
npm run db:types    # regenerate Supabase types (needs the CLI)
```

---

## Vercel deployment

1. Import the repo at [vercel.com/new](https://vercel.com/new) (framework:
   Next.js — auto-detected).
2. Add the four `NEXT_PUBLIC_*` env vars for Production (and Preview).
3. Deploy. Set `NEXT_PUBLIC_APP_URL` to the final domain and add
   `<domain>/auth/callback` to Supabase Auth redirect URLs.

`npm run build` passes with no env vars present (clients are lazily initialized),
so the build never fails during Vercel's build-time evaluation.

---

## PWA installation

Open the deployed HTTPS site on a phone → browser menu → **Add to Home Screen**.
It launches standalone with the forge icon and theme color.

## Offline limitations (by design)

Only **event sale entry** works offline. Open the event (and Event Mode) once
while online so the app shell, active event, and catalog are cached. Sales made
offline are queued locally, shown as *pending*, and synced idempotently when the
connection returns — they are never reported as server-confirmed until they are.
Administration screens (creating products, batches, settings) require a
connection.
