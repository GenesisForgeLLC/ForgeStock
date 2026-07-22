# Testing

## Commands

```bash
npm run lint        # ESLint (next/core-web-vitals + typescript) — clean
npm run typecheck   # tsc --noEmit, strict — no errors
npm run test        # Vitest unit tests
npm run build       # production build
npm run test:e2e    # Playwright critical-path smoke (needs live backend)
```

## Unit tests (`tests/unit/`)

Pure business logic is isolated in `src/lib/calc.ts` / `src/lib/money.ts` so it can
be tested without a database.

`calc.test.ts` covers:
- Money rounding (half away from zero); dollar and percent parsing.
- Material-cost and machine-cost calculation.
- Batch cost with failed prints (unit cost rises as successful qty falls).
- Add-on tax and tax-inclusive pricing.
- Percentage discount, fixed discount, and their clamping/combination.
- Whole-sale totals, COGS, gross profit; selling below cost.
- Margin; inventory total from ledger; weighted-average unit cost;
  event-remaining (with reversal restore and zero-floor).

`ledger-model.test.ts` mirrors the atomic DB-function semantics in memory:
- Preventing negative stock on adjustment.
- Sale decrements inventory; rejects over-stock sales.
- **Idempotent duplicate submission** (same key → one sale, decremented once).
- **Void** marks the sale, writes a reversal, restores inventory, preserves
  history, and refuses a second void.

Latest run: **29 tests passing** across 2 files.

## Critical-path smoke test (`tests/e2e/critical-path.spec.ts`)

Playwright, iPhone-13 viewport. Covers: sign in → create product → record print
batch → create event → allocate → open → sell one → remaining decreases → summary
updates (and is structured to extend to void/reversal).

It **auto-skips** unless a live backend and a seeded account are provided:

```bash
E2E_BASE_URL=http://localhost:3000 E2E_EMAIL=you@example.com E2E_PASSWORD=... \
  npm run test:e2e
```

Without `E2E_EMAIL`/`E2E_PASSWORD` the test is skipped (it needs real auth +
Supabase). The pure calculations above provide the thorough, always-runnable
coverage the spec asks for when remote testing isn't practical.

## Manual mobile verification

Checked at 390×844 (and Event Mode is designed for 360–430px):
- Login/signup render with no horizontal overflow; ≥48px primary buttons.
- Auth redirects work (`/` and protected routes → `/login` when signed out;
  `/login` → `/dashboard` when signed in).
- Manifest served at `/manifest.webmanifest`; service worker at `/sw.js`; icons
  200; `/offline` fallback renders.

Re-run this pass against a live backend after deploying to exercise the
authenticated screens (inventory, Event Mode, summary) with real data.
