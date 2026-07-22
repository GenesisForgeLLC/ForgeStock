"use server";

import { revalidatePath } from "next/cache";
import { getActionContext, num, str, type ActionState, toMessage } from "./util";
import { profileSchema } from "@/lib/validation";

export async function updateSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { supabase, user } = await getActionContext();
    const parsed = profileSchema.safeParse({
      business_name: str(fd, "business_name") ?? "",
      timezone: str(fd, "timezone") ?? "America/New_York",
      currency: (str(fd, "currency") ?? "USD").toUpperCase(),
      default_tax_rate_bps: num(fd, "default_tax_rate_bps"),
      default_tax_mode: str(fd, "default_tax_mode") ?? "add_on",
      default_filament_cost_per_kg_cents: num(fd, "default_filament_cost_per_kg_cents"),
      default_machine_cost_per_hour_cents: num(fd, "default_machine_cost_per_hour_cents"),
      default_payment_method: str(fd, "default_payment_method") ?? "cash",
      default_low_stock_threshold: num(fd, "default_low_stock_threshold", 5),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid settings" };
    }

    const { error } = await supabase
      .from("profiles")
      .update(parsed.data)
      .eq("user_id", user.id);
    if (error) return { error: toMessage(error) };

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { ok: true, message: "Settings saved" };
  } catch (err) {
    return { error: toMessage(err) };
  }
}

export async function markOnboardingComplete(): Promise<void> {
  const { supabase, user } = await getActionContext();
  await supabase.from("profiles").update({ onboarding_completed: true }).eq("user_id", user.id);
  revalidatePath("/dashboard");
}
