/**
 * Runtime environment-variable access with helpful, non-leaking errors.
 *
 * We intentionally do NOT throw at module scope so that Vercel builds (which
 * evaluate modules without runtime env vars) do not fail. Validation happens
 * lazily the first time a client is actually constructed.
 */

function readPublicEnv(name: string): string | undefined {
  // NEXT_PUBLIC_* are inlined at build time; reference them statically.
  switch (name) {
    case "NEXT_PUBLIC_SUPABASE_URL":
      return process.env.NEXT_PUBLIC_SUPABASE_URL;
    case "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY":
      return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    case "NEXT_PUBLIC_APP_URL":
      return process.env.NEXT_PUBLIC_APP_URL;
    default:
      return undefined;
  }
}

export function getSupabaseUrl(): string {
  const value = readPublicEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (!value) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Copy .env.example to .env.local and set it from your Supabase project (Settings → API).",
    );
  }
  return value;
}

export function getSupabaseAnonKey(): string {
  const value = readPublicEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (!value) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Set it from your Supabase project's publishable (anon) key.",
    );
  }
  return value;
}

export function getAppUrl(): string {
  return readPublicEnv("NEXT_PUBLIC_APP_URL") || "http://localhost:3000";
}

/** True when the Supabase environment is configured; used to render setup hints. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    readPublicEnv("NEXT_PUBLIC_SUPABASE_URL") &&
      readPublicEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  );
}
