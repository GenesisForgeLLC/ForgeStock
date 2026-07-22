import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/** Return the authenticated user or redirect to /login. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Return the current user's profile, creating a default row if missing. */
export async function requireProfile() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile) return { supabase, user, profile };

  // Fallback: create a default profile (the auth trigger normally does this).
  const { data: created } = await supabase
    .from("profiles")
    .insert({ user_id: user.id })
    .select("*")
    .single();

  return { supabase, user, profile: created as Profile };
}
