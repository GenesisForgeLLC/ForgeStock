import { createClient } from "@/lib/supabase/server";
import { toCsv, centsToCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data } = await supabase
    .from("products")
    .select("*, categories(name)")
    .order("name");

  const rows = (data ?? []).map((p) => [
    p.name,
    p.sku,
    (p.categories as unknown as { name: string } | null)?.name ?? "",
    p.brand_line,
    centsToCsv(p.default_price_cents),
    p.estimated_print_time_minutes,
    p.estimated_filament_grams,
    centsToCsv(p.other_unit_cost_cents),
    p.low_stock_threshold,
    p.is_favorite ? "yes" : "no",
    p.is_archived ? "yes" : "no",
  ]);

  const csv = toCsv(
    [
      "Name",
      "SKU",
      "Category",
      "Brand line",
      "Default price",
      "Est print minutes",
      "Est filament grams",
      "Additional unit cost",
      "Low stock threshold",
      "Favorite",
      "Archived",
    ],
    rows,
  );
  return csvResponse("forgestock-products.csv", csv);
}
