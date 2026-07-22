import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv, centsToCsv, csvResponse } from "@/lib/csv";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: items } = await supabase
    .from("v_event_item_summary")
    .select("*")
    .eq("event_id", id)
    .order("product_name");

  const rows = (items ?? []).map((i) => [
    i.product_name,
    i.sku,
    i.quantity_brought,
    i.quantity_sold,
    i.quantity_gifted,
    i.quantity_damaged,
    i.quantity_remaining,
    centsToCsv(i.effective_price_cents),
    centsToCsv(i.unit_cost_cents),
  ]);

  const csv = toCsv(
    ["Product", "SKU", "Brought", "Sold", "Gifted", "Damaged", "Remaining", "Event price", "Unit cost"],
    rows,
  );
  return csvResponse(`forgestock-event-${id}-summary.csv`, csv);
}
