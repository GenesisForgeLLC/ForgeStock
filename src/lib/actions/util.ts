import { createClient } from "@/lib/supabase/server";

export type ActionState = { ok?: boolean; error?: string; message?: string } | null;

/** Get the authenticated user + client inside a server action, or throw. */
export async function getActionContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

/** Read a numeric integer field (cents / bps / qty) from FormData. */
export function num(fd: FormData, key: string, fallback = 0): number {
  const raw = fd.get(key);
  if (raw === null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Read a trimmed string field, returning null when blank. */
export function str(fd: FormData, key: string): string | null {
  const raw = fd.get(key);
  if (raw === null) return null;
  const s = String(raw).trim();
  return s === "" ? null : s;
}

export function bool(fd: FormData, key: string): boolean {
  const raw = fd.get(key);
  return raw === "true" || raw === "on" || raw === "1";
}

/** Turn any thrown value into a user-facing message (never leak internals). */
export function toMessage(err: unknown, fallback = "Something went wrong"): string {
  if (err instanceof Error && err.message) {
    // Strip Postgres error prefixes for readability.
    return err.message.replace(/^.*?:\s*/, "").slice(0, 300);
  }
  return fallback;
}
