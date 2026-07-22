import { createClient } from "@/lib/supabase/server";
import { toCsv, centsToCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data } = await supabase
    .from("v_product_inventory")
    .select("*")
    .eq("is_archived", false)
    .order("name");

  const rows = (data ?? []).map((r) => [
    r.name,
    r.sku,
    r.category_name,
    r.on_hand,
    centsToCsv(r.unit_cost_cents),
    centsToCsv(r.default_price_cents),
    centsToCsv(r.inventory_value_cents),
    centsToCsv(r.retail_value_cents),
    r.is_low_stock ? "yes" : "no",
  ]);

  const csv = toCsv(
    ["Name", "SKU", "Category", "On hand", "Unit cost", "Price", "Inventory value", "Retail value", "Low stock"],
    rows,
  );
  return csvResponse("forgestock-inventory.csv", csv);
}
