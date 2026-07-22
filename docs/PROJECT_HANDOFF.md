# ForgeStock — Project Handoff

*Copy-paste friendly for an Obsidian vault.*

## Summary

ForgeStock is a private, mobile-first **3D Print Inventory & Vendor Event
Manager** for Genesis Forge. The complete application is implemented, tested
(unit), type-checked, linted, and builds for production. It has **not** been
deployed to Supabase or Vercel from this environment because no Supabase/Vercel
credentials were available here. Everything needed to deploy is in the repo and
documented below.

- Repo: `https://github.com/Impossibilityy/ForgeStock`
- Branch: `claude/forgestock-build-deploy-04wz7m`
- Stack: Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind 3 ·
  Radix/shadcn-style UI · Supabase (Postgres/Auth/Storage) · `@supabase/ssr` ·
  Zod · Lucide · Sonner · `idb` · Vitest · Playwright.

## Final feature status

| Area | Status |
| --- | --- |
| Email/password auth (login, signup, forgot, reset, callback) | ✅ Implemented |
| Route protection via middleware + owner-scoped RLS | ✅ Implemented |
| Settings (business, costs, tax, currency, timezone, payment defaults) | ✅ |
| Categories (unique per user, archive) | ✅ |
| Products (all fields, favorite, archive) + phone-camera image upload | ✅ |
| Production batches (server-side cost, atomic ledger add, failed→cost) | ✅ |
| Inventory from immutable ledger + summaries/values/low-stock | ✅ |
| Inventory quick actions (gift, damage, return, manual ±) | ✅ |
| Events (CRUD, per-event tax/payment), allocations, open (stock-guarded) | ✅ |
| Event Mode: Quick Sell 1 + Undo, custom sale (discounts, below-cost warn), cart | ✅ |
| Two tax modes (add-on / inclusive), centralized + unit-tested | ✅ |
| Sales with full snapshots; void via reversing transactions (no deletes) | ✅ |
| Event summary (units, money, best sellers, no-sales, payment breakdown, profit) | ✅ |
| Event close/reopen (history preserved; sync-guarded close) | ✅ |
| Offline: IndexedDB queue, optimistic remaining, idempotent sync, indicators | ✅ |
| PWA: manifest, generated icons, theme color, standalone, service worker, offline | ✅ |
| Dashboard (metrics, active event, recent activity/sales, quick actions) | ✅ |
| Activity history + pending-sync panel (queued/errored, retry, discard) | ✅ |
| CSV exports (inventory, catalog, sales, event summary, event lines) | ✅ |
| CSV product import (template, preview, validation, create/update-by-SKU) | ✅ |
| Onboarding checklist + labeled demo-data add/delete | ✅ |
| Nav: desktop side-nav, mobile bottom-nav (active event one tap) | ✅ |
| Loading / empty / error / not-found states | ✅ |
| Unit tests (29 passing), Playwright critical-path smoke (skips w/o creds) | ✅ |
| Supabase project provisioned + migrations applied | ⛔ Needs credentials |
| Vercel deployment / production URL | ⛔ Needs credentials |

## Architecture summary

Server Components read via `@supabase/ssr` (cookies) under RLS. Ordinary writes
use Server Actions (`src/lib/actions/*`); sales + offline sync use Route Handlers
(`src/app/api/*`) calling atomic Postgres functions. All money is integer cents,
tax is integer bps, and every money formula lives once in `src/lib/calc.ts` /
`money.ts` (mirrored by the SQL functions). Inventory is the sum of an immutable
ledger; corrections are reversing transactions. See `docs/ARCHITECTURE.md`.

## Database tables

`profiles, categories, products, production_batches, events, event_items, sales,
sale_items, inventory_ledger` — full field lists in `docs/DATABASE.md`.

## Database functions

`record_print_batch`, `record_inventory_adjustment`, `create_sale`, `void_sale`,
`open_event`, `close_event`, `reopen_event`, helpers `product_on_hand`,
`product_unit_cost`, `event_remaining`, and `delete_demo_data`. All hardened
SECURITY DEFINER (empty search_path, `auth.uid()` + ownership checks, granted only
to `authenticated`). Reporting views are `security_invoker`.

## Environment variable names

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_NAME            # default "ForgeStock"
NEXT_PUBLIC_APP_URL
```

No secret/server-only variables are required. No service-role key is used.

## Supabase project status

**Not created from this environment (no credentials).** Migrations are ready in
`supabase/migrations/` (`0001`–`0007`) and include schema, RLS, functions, views,
auth→profile trigger, storage bucket + policies, and demo helpers.

## Vercel project status

**Not created from this environment (no credentials).** `npm run build` passes
with no env present (lazy client init), so the repo imports cleanly.

## Production URL

**None yet** — to be recorded here after the Vercel deploy below.

## Verification performed here

- `npm run lint` → clean. `npm run typecheck` → no errors.
- `npm run test` → **29 passing** (calc + ledger-model).
- `npm run build` → success, 27 routes.
- Booted `npm run start` with placeholder env: `/` and `/dashboard` redirect to
  `/login`; `/login` renders (correct title); `/manifest.webmanifest`, `/sw.js`,
  `/offline`, and PNG icons all serve; login screen verified at 390×844 with no
  horizontal overflow.

## Known limitations

- Backend/hosting not deployed here (credentials required) — see manual steps.
- Only **event sale entry** is offline-capable, by design. Admin screens need a
  connection; open Event Mode once online to cache the active event + catalog.
- The Playwright smoke test needs a live backend + seeded account (`E2E_EMAIL`,
  `E2E_PASSWORD`); it auto-skips otherwise. Pure calculations are fully unit-tested.
- Unit cost is a weighted average of `printed` ledger entries (not FIFO/lot).
- Single active event at a time (MVP); no team-management UI.
- Two dev-only, transitive moderate npm advisories remain (esbuild/postcss in the
  build toolchain); they don't affect the production runtime.

## Suggested next features

- Optional FIFO/lot costing; per-product profit reports across events.
- Barcode/QR scan-to-sell in Event Mode.
- Background Sync API for queue flush without the app open.
- Multi-active-event support; simple label printing for price cards.
- Product-image thumbnails cached for full offline browsing.

## Exact outstanding manual steps

1. **Create a Supabase project** and apply `supabase/migrations/*` in order
   (SQL Editor or `supabase db push`). See `docs/SETUP.md` §4.
2. Copy the **Project URL** and **publishable/anon key** into env vars.
3. Set Auth **Site URL** + **redirect URLs** (`/**` and `/auth/callback`).
4. Run the **Database + Security advisors**; confirm no material warnings.
5. **Import the repo to Vercel**, add the four `NEXT_PUBLIC_*` vars (Production +
   Preview), set `NEXT_PUBLIC_APP_URL` to the domain, deploy.
6. Add the Vercel domain to Supabase redirect URLs.
7. Smoke-test on the phone: sign up → settings → product → print batch → event →
   allocate → open → Event Mode sale → summary → void. Install the PWA.
8. Record the production URL in this file (Production URL section).
