"use server";

import { revalidatePath } from "next/cache";
import { getActionContext, toMessage } from "./util";

export interface ImportRow {
  name: string;
  sku: string | null;
  category: string | null;
  brand_line: string | null;
  default_price_cents: number;
  estimated_print_time_minutes: number;
  estimated_filament_grams: number;
  other_unit_cost_cents: number;
  low_stock_threshold: number;
  is_favorite: boolean;
  is_archived: boolean;
}

export interface ImportResult {
  ok: boolean;
  error?: string;
  created?: number;
  updated?: number;
  skipped?: number;
}

/**
 * Commit validated import rows. In "create" mode, rows whose SKU already exists
 * are skipped (never silently overwritten). In "update" mode, matching SKUs are
 * updated in place. Categories are matched/created by name.
 */
export async function importProducts(
  rows: ImportRow[],
  mode: "create" | "update",
): Promise<ImportResult> {
  try {
    const { supabase, user } = await getActionContext();

    // Resolve category names -> ids (create missing).
    const catNames = Array.from(
      new Set(rows.map((r) => r.category?.trim()).filter((c): c is string => Boolean(c))),
    );
    const catMap = new Map<string, string>();
    if (catNames.length > 0) {
      const { data: existing } = await supabase
        .from("categories")
        .select("id, name")
        .eq("user_id", user.id);
      for (const c of existing ?? []) catMap.set(c.name.toLowerCase(), c.id);
      for (const name of catNames) {
        if (!catMap.has(name.toLowerCase())) {
          const { data: created } = await supabase
            .from("categories")
            .insert({ user_id: user.id, name })
            .select("id")
            .maybeSingle();
          if (created) catMap.set(name.toLowerCase(), created.id);
        }
      }
    }

    // Existing SKUs for this user.
    const skus = rows.map((r) => r.sku).filter((s): s is string => Boolean(s));
    const existingBySku = new Map<string, string>();
    if (skus.length > 0) {
      const { data: existing } = await supabase
        .from("products")
        .select("id, sku")
        .eq("user_id", user.id)
        .in("sku", skus);
      for (const p of existing ?? []) if (p.sku) existingBySku.set(p.sku, p.id);
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const r of rows) {
      const categoryId = r.category ? catMap.get(r.category.toLowerCase()) ?? null : null;
      const payload = {
        category_id: categoryId,
        name: r.name,
        sku: r.sku,
        brand_line: r.brand_line,
        default_price_cents: r.default_price_cents,
        estimated_print_time_minutes: r.estimated_print_time_minutes,
        estimated_filament_grams: r.estimated_filament_grams,
        other_unit_cost_cents: r.other_unit_cost_cents,
        low_stock_threshold: r.low_stock_threshold,
        is_favorite: r.is_favorite,
        is_archived: r.is_archived,
      };

      const existingId = r.sku ? existingBySku.get(r.sku) : undefined;
      if (existingId) {
        if (mode === "update") {
          await supabase.from("products").update(payload).eq("id", existingId).eq("user_id", user.id);
          updated++;
        } else {
          skipped++;
        }
      } else {
        await supabase.from("products").insert({ user_id: user.id, ...payload });
        created++;
      }
    }

    revalidatePath("/products");
    revalidatePath("/inventory");
    return { ok: true, created, updated, skipped };
  } catch (err) {
    return { ok: false, error: toMessage(err) };
  }
}
