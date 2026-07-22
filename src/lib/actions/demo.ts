"use server";

import { revalidatePath } from "next/cache";
import { getActionContext, type ActionState, toMessage } from "./util";

const DEMO_BRAND = "ForgeStock Demo";

const DEMO_PRODUCTS = [
  { name: "Wobblekin — Axolotl", sku: "DEMO-WOB-AXO", price: 2500, minutes: 180, grams: 45, fav: true },
  { name: "Wobblekin — Fox", sku: "DEMO-WOB-FOX", price: 2500, minutes: 165, grams: 42, fav: true },
  { name: "Articulated Dragon", sku: "DEMO-ART-DRG", price: 3500, minutes: 300, grams: 80, fav: false },
  { name: "Fidget Slider", sku: "DEMO-FDG-SLD", price: 1200, minutes: 60, grams: 18, fav: false },
  { name: "Desk Planter", sku: "DEMO-DEC-PLN", price: 1800, minutes: 120, grams: 55, fav: false },
];

export async function seedDemoData(): Promise<ActionState> {
  try {
    const { supabase, user } = await getActionContext();

    // Ensure a demo category.
    const { data: cat } = await supabase
      .from("categories")
      .upsert({ user_id: user.id, name: "Demo", sort_order: 99 }, { onConflict: "user_id,name" })
      .select("id")
      .maybeSingle();

    for (const p of DEMO_PRODUCTS) {
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("user_id", user.id)
        .eq("sku", p.sku)
        .maybeSingle();
      if (existing) continue;

      const { data: product, error } = await supabase
        .from("products")
        .insert({
          user_id: user.id,
          category_id: cat?.id ?? null,
          name: p.name,
          sku: p.sku,
          brand_line: DEMO_BRAND,
          default_price_cents: p.price,
          estimated_print_time_minutes: p.minutes,
          estimated_filament_grams: p.grams,
          other_unit_cost_cents: 25,
          low_stock_threshold: 3,
          is_favorite: p.fav,
          is_archived: false,
        })
        .select("id")
        .single();
      if (error || !product) continue;

      // Record an initial print batch so demo items have real inventory + cost.
      await supabase.rpc("record_print_batch", {
        p_product_id: product.id,
        p_printed_at: new Date().toISOString(),
        p_quantity_started: 12,
        p_quantity_successful: 10,
        p_quantity_failed: 2,
        p_total_print_time_minutes: p.minutes * 4,
        p_total_filament_grams: p.grams * 12,
        p_filament_cost_per_kg_cents: 2500,
        p_machine_cost_per_hour_cents: 50,
        p_other_batch_cost_cents: 0,
        p_notes: "Demo batch",
      });
    }

    revalidatePath("/products");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true, message: "Demo data added" };
  } catch (err) {
    return { error: toMessage(err) };
  }
}

export async function deleteDemoData(): Promise<ActionState> {
  try {
    const { supabase } = await getActionContext();
    const { error } = await supabase.rpc("delete_demo_data");
    if (error) return { error: toMessage(error) };
    revalidatePath("/products");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true, message: "Demo data removed" };
  } catch (err) {
    return { error: toMessage(err) };
  }
}
