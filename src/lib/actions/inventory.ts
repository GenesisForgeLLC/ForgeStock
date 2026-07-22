"use server";

import { revalidatePath } from "next/cache";
import { getActionContext, num, str, type ActionState, toMessage } from "./util";
import { inventoryAdjustmentSchema, productionBatchSchema } from "@/lib/validation";

export async function recordPrintBatch(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { supabase } = await getActionContext();
    const parsed = productionBatchSchema.safeParse({
      product_id: str(fd, "product_id") ?? "",
      printed_at: str(fd, "printed_at") ?? new Date().toISOString(),
      quantity_started: num(fd, "quantity_started"),
      quantity_successful: num(fd, "quantity_successful"),
      quantity_failed: num(fd, "quantity_failed"),
      total_print_time_minutes: num(fd, "total_print_time_minutes"),
      total_filament_grams: num(fd, "total_filament_grams"),
      filament_cost_per_kg_cents_snapshot: num(fd, "filament_cost_per_kg_cents_snapshot"),
      machine_cost_per_hour_cents_snapshot: num(fd, "machine_cost_per_hour_cents_snapshot"),
      other_batch_cost_cents: num(fd, "other_batch_cost_cents"),
      notes: str(fd, "notes"),
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid batch" };

    const p = parsed.data;
    const { error } = await supabase.rpc("record_print_batch", {
      p_product_id: p.product_id,
      p_printed_at: p.printed_at,
      p_quantity_started: p.quantity_started,
      p_quantity_successful: p.quantity_successful,
      p_quantity_failed: p.quantity_failed,
      p_total_print_time_minutes: p.total_print_time_minutes,
      p_total_filament_grams: p.total_filament_grams,
      p_filament_cost_per_kg_cents: p.filament_cost_per_kg_cents_snapshot,
      p_machine_cost_per_hour_cents: p.machine_cost_per_hour_cents_snapshot,
      p_other_batch_cost_cents: p.other_batch_cost_cents,
      p_notes: p.notes ?? null,
    });
    if (error) return { error: toMessage(error) };

    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    revalidatePath("/activity");
    return { ok: true, message: "Print batch recorded and added to inventory" };
  } catch (err) {
    return { error: toMessage(err) };
  }
}

export async function recordAdjustment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { supabase } = await getActionContext();
    const parsed = inventoryAdjustmentSchema.safeParse({
      product_id: str(fd, "product_id") ?? "",
      transaction_type: str(fd, "transaction_type") ?? "",
      quantity: num(fd, "quantity"),
      note: str(fd, "note"),
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid adjustment" };

    const p = parsed.data;
    const { error } = await supabase.rpc("record_inventory_adjustment", {
      p_product_id: p.product_id,
      p_transaction_type: p.transaction_type,
      p_quantity: p.quantity,
      p_note: p.note ?? null,
    });
    if (error) return { error: toMessage(error) };

    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    revalidatePath("/activity");
    return { ok: true, message: "Inventory adjusted" };
  } catch (err) {
    return { error: toMessage(err) };
  }
}
