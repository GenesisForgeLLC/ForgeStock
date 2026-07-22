# Setup — step by step

For someone who is not a Supabase/Vercel expert. Follow in order.

## 1. Prerequisites

- Node.js 20+ and npm.
- A free [Supabase](https://supabase.com) account.
- A [Vercel](https://vercel.com) account (for deployment).

## 2. Get the code running locally (no backend yet)

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app will start but can't sign you in until Supabase is configured. That's next.

## 3. Create a Supabase project

1. Supabase dashboard → **New project**. Pick a name, a strong database password,
   and a region near you.
2. Wait for it to finish provisioning (~2 min).

## 4. Apply the database migrations

**Option A — SQL Editor (no tools to install):**
Open **SQL Editor** and paste the contents of each file in
`supabase/migrations/`, in order (`0001` → `0007`), running each one. Each file is
self-contained.

**Option B — Supabase CLI:**

```bash
npm i -g supabase
supabase link --project-ref <your-project-ref>   # ref is in Project Settings → General
supabase db push
```

This creates all tables, RLS policies, functions, views, the auth→profile
trigger, the private `product-images` storage bucket + policies, and demo-data
helpers.

## 5. Get your API keys

Project Settings → **API**:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / publishable key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Put them in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx   # or the eyJ... anon key
NEXT_PUBLIC_APP_NAME=ForgeStock
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Never paste the **service_role** key anywhere — this app doesn't use it.

## 6. Configure auth

Authentication → **URL Configuration**:
- **Site URL**: `http://localhost:3000` (and later your Vercel URL).
- **Redirect URLs**: add `http://localhost:3000/**` (and later
  `https://<your-domain>/**`).

For a single-owner app you can disable email confirmations (Authentication →
Providers → Email) so signup logs you straight in.

## 7. Try it

```bash
npm run dev
```

Go to `http://localhost:3000` → **Create one** → sign up. A profile row is created
automatically. Follow the onboarding checklist on the dashboard:
settings → filament cost → machine cost → category → product → print batch → event.

Optional: Settings → **Add demo data** for sample products/inventory to explore,
and **Delete demo data** to remove it cleanly.

## 8. Run the checks

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

## 9. Run the advisors

Supabase dashboard → **Advisors** → run Database + Security. Confirm no material
warnings (RLS is on everywhere; functions are hardened).

## 10. Deploy to Vercel

1. Push the repo to GitHub (already the origin here).
2. [vercel.com/new](https://vercel.com/new) → import the repo. Framework is
   auto-detected as Next.js.
3. Add the four `NEXT_PUBLIC_*` env vars (Production + Preview). Set
   `NEXT_PUBLIC_APP_URL` to the Vercel domain.
4. Deploy. Then add `https://<domain>/**` to Supabase Auth redirect URLs.
5. On your phone, open the site and **Add to Home Screen** to install the PWA.

Done. See `docs/TESTING.md` for verification and `docs/PROJECT_HANDOFF.md` for
status and outstanding steps.
